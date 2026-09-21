import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { depositoPubblico, modoDati } from '@/lib/dati';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validaLead } from '@/lib/validazione';
import { CREDITO_EUR, generaCodice, scadenzaDaOggi } from '@/lib/codice';
import { inviaCodice } from '@/lib/email';
import { scadenzaFra } from '@/lib/dominio/automazioni';
import type { Interesse } from '@/lib/dominio/tipi';

// L'unica porta aperta del CRM: ci bussa la card NFC di Rama
// (public/club/index.html) quando il cliente lascia nome ed email. Da qui il
// lead entra nel CRM come qualsiasi altro — con fonte, fase, opportunità e
// prossima azione — più il credito del Club, che è roba solo della card.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RICHIESTE_PER_ORA = 20;

const INTERESSE_DA_PROGETTO: Record<string, Interesse> = {
  Bagno: 'bagno',
  Cucina: 'cucina',
  Salotto: 'pavimenti',
  'Casa intera': 'ristrutturazione',
};

function originiConsentite(): string[] {
  const dichiarate = (process.env.ORIGINI_CONSENTITE || 'https://club.ramastore.it')
    .split(',').map((o) => o.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    dichiarate.push('http://localhost:8932', 'http://127.0.0.1:8932');
  }
  return dichiarate;
}

function intestazioniCors(origine: string | null) {
  const consentite = originiConsentite();
  const via = origine && consentite.includes(origine) ? origine : consentite[0];
  return {
    'Access-Control-Allow-Origin': via,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const risposta = (corpo: unknown, stato: number, origine: string | null) =>
  NextResponse.json(corpo, { status: stato, headers: intestazioniCors(origine) });

export async function OPTIONS(richiesta: Request) {
  return new NextResponse(null, { status: 204, headers: intestazioniCors(richiesta.headers.get('origin')) });
}

// Dell'IP resta solo l'impronta: serve a contare le richieste, non a sapere chi è.
function impronta(richiesta: Request): string {
  const inoltrato = richiesta.headers.get('x-forwarded-for') || '';
  const ip = inoltrato.split(',')[0].trim() || richiesta.headers.get('x-real-ip') || 'sconosciuto';
  return createHash('sha256').update(`${ip}${process.env.LEAD_IP_PEPE || ''}`).digest('hex');
}

export async function POST(richiesta: Request) {
  const origine = richiesta.headers.get('origin');

  if (origine && !originiConsentite().includes(origine)) {
    return risposta({ errore: 'origine non consentita' }, 403, origine);
  }

  let corpo: unknown;
  try {
    corpo = await richiesta.json();
  } catch {
    return risposta({ errore: 'richiesta non valida' }, 400, origine);
  }

  const esito = validaLead(corpo);
  if (!esito.ok) {
    // Il robot che riempie il campo trappola riceve lo stesso "grazie" di
    // tutti, ma non entra niente.
    if (esito.motivo === 'honeypot') return risposta({ codice: null, emailInviata: false }, 200, origine);
    return risposta({ errore: 'dati non validi' }, 400, origine);
  }
  const lead = esito.lead;
  const suSupabase = modoDati() === 'supabase';

  let dep;
  try {
    dep = depositoPubblico();
  } catch (errore) {
    console.error('[lead] configurazione mancante', errore);
    return risposta({ errore: 'servizio non disponibile' }, 503, origine);
  }

  // Freno anti-abuso e idempotenza vivono sul database: in modalità
  // dimostrativa non c'è niente da proteggere.
  if (suSupabase) {
    const db = supabaseAdmin();
    const ipHash = impronta(richiesta);
    const unOraFa = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await db.from('lead_richieste')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('creato_il', unOraFa);
    if ((count ?? 0) >= RICHIESTE_PER_ORA) {
      return risposta({ errore: 'troppe richieste' }, 429, origine);
    }
    await db.from('lead_richieste').insert({ ip_hash: ipHash });

    if (lead.clientToken) {
      const { data: gia } = await db.from('lead_card')
        .select('codice, scadenza, email_inviata_il')
        .eq('client_token', lead.clientToken).maybeSingle();
      if (gia) {
        return risposta(
          { codice: gia.codice, scadenza: gia.scadenza, emailInviata: Boolean(gia.email_inviata_il) },
          200, origine,
        );
      }
    }
  }

  // Stessa email, stessa persona: il contatto si aggiorna, non si duplica.
  const dati = await dep.istantanea();
  const esistente = dati.contatti.find((c) => (c.email ?? '').toLowerCase() === lead.email);
  const interesse = INTERESSE_DA_PROGETTO[lead.progetto] ?? 'altro';
  const dettaglio = `Card NFC — ${lead.progetto.toLowerCase()}, stile ${lead.stile.toLowerCase()}, ritiro ${lead.consegna.toLowerCase()}`;

  let contattoId: string;
  if (esistente) {
    contattoId = esistente.id;
    await dep.registraEvento({
      contattoId,
      tipo: 'lead_ricevuto',
      descrizione: `Di nuovo dalla card: ${dettaglio}`,
      automatico: true,
    });
  } else {
    const [nome, ...resto] = lead.nome.split(' ');
    try {
      contattoId = await dep.creaContatto({
        nome,
        cognome: resto.join(' '),
        email: lead.email,
        fonte: 'card_nfc',
        fonteDettaglio: dettaglio,
        fase: 'nuovo',
        consensoMarketing: lead.consenso,
        interesse,
        azione: {
          tipo: 'rispondere',
          descrizione: `Richiamare ${lead.nome} — ${lead.progetto.toLowerCase()}, stile ${lead.stile.toLowerCase()}`,
          scadenza: scadenzaFra(2),
          priorita: 'da_fare',
        },
      });
    } catch (errore) {
      console.error('[lead] contatto non salvato', errore);
      return risposta({ errore: 'salvataggio non riuscito' }, 500, origine);
    }
  }

  // Il codice del credito. Su Supabase è unico per vincolo del database e
  // riscattabile al banco; in modalità dimostrativa resta nella storia del
  // contatto, senza tabella dedicata.
  const scadenza = scadenzaDaOggi();
  let codice = generaCodice();

  if (suSupabase) {
    const db = supabaseAdmin();
    let salvato = '';
    for (let tentativo = 0; tentativo < 6 && !salvato; tentativo += 1) {
      const candidato = tentativo === 0 ? codice : generaCodice();
      const { error } = await db.from('lead_card').insert({
        contatto_id: contattoId,
        progetto: lead.progetto, stile: lead.stile, consegna: lead.consegna,
        codice: candidato, credito_eur: CREDITO_EUR, scadenza,
        client_token: lead.clientToken,
      });
      if (!error) { salvato = candidato; break; }
      if (error.code !== '23505') {
        console.error('[lead] credito non salvato', error);
        return risposta({ errore: 'salvataggio non riuscito' }, 500, origine);
      }
      // Collisione sul client_token: una chiamata gemella è arrivata prima.
      if (lead.clientToken) {
        const { data: gemella } = await db.from('lead_card')
          .select('codice, scadenza, email_inviata_il')
          .eq('client_token', lead.clientToken).maybeSingle();
        if (gemella) {
          return risposta(
            { codice: gemella.codice, scadenza: gemella.scadenza, emailInviata: Boolean(gemella.email_inviata_il) },
            200, origine,
          );
        }
      }
    }
    if (!salvato) {
      console.error('[lead] nessun codice libero dopo sei tentativi');
      return risposta({ errore: 'salvataggio non riuscito' }, 500, origine);
    }
    codice = salvato;
  }

  await dep.registraEvento({
    contattoId,
    tipo: 'nota',
    descrizione: `Credito Club Rama ${codice} — ${CREDITO_EUR} €, valido fino al ${scadenza}`,
    automatico: true,
  });

  // L'email parte solo se il cliente l'ha chiesta. Se non parte, la card lo
  // dice: meglio "mostra il codice in negozio" di una promessa non mantenuta.
  let emailInviata = false;
  if (lead.consegna === 'Email') {
    const invio = await inviaCodice({
      nome: lead.nome, email: lead.email, codice, scadenza, credito: CREDITO_EUR,
    });
    emailInviata = invio.inviata;
    if (invio.inviata && suSupabase) {
      await supabaseAdmin().from('lead_card')
        .update({ email_inviata_il: new Date().toISOString() }).eq('codice', codice);
    } else if (!invio.inviata) {
      console.warn('[lead] email non inviata:', invio.motivo);
    }
  }

  return risposta({ codice, scadenza, emailInviata }, 200, origine);
}
