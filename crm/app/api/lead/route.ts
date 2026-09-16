import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validaLead } from '@/lib/validazione';
import { CREDITO_EUR, generaCodice, scadenzaDaOggi } from '@/lib/codice';
import { inviaCodice } from '@/lib/email';

// L'unica porta aperta del CRM: ci bussa la card NFC di Rama
// (public/club/index.html) quando il cliente lascia nome ed email.
// Chi entra da qui non ha un account, quindi si scrive con la chiave di
// servizio — e per questo ogni campo viene controllato prima.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RICHIESTE_PER_ORA = 20;
const GIORNI_RICHIAMO = 2;

function originiConsentite(): string[] {
  const dichiarate = (process.env.ORIGINI_CONSENTITE || 'https://club.ramastore.it')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  // In sviluppo la card gira su un server statico locale.
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

function risposta(corpo: unknown, stato: number, origine: string | null) {
  return NextResponse.json(corpo, { status: stato, headers: intestazioniCors(origine) });
}

export async function OPTIONS(richiesta: Request) {
  return new NextResponse(null, { status: 204, headers: intestazioniCors(richiesta.headers.get('origin')) });
}

// Dell'IP resta solo l'impronta: serve a contare le richieste, non a sapere chi
// è. Senza il pepe non si torna indietro all'indirizzo.
function impronta(richiesta: Request): string {
  const inoltrato = richiesta.headers.get('x-forwarded-for') || '';
  const ip = inoltrato.split(',')[0].trim() || richiesta.headers.get('x-real-ip') || 'sconosciuto';
  return createHash('sha256').update(`${ip}${process.env.LEAD_IP_PEPE || ''}`).digest('hex');
}

export async function POST(richiesta: Request) {
  const origine = richiesta.headers.get('origin');

  // Una chiamata dal browser deve arrivare da un indirizzo nostro. Le chiamate
  // senza Origin (curl, collaudi) passano: il freno sotto vale comunque.
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
    // Il robot che riempie il campo trappola non deve capire di essere stato
    // scoperto: riceve lo stesso "grazie" di tutti, ma non entra niente.
    if (esito.motivo === 'honeypot') {
      return risposta({ codice: null, emailInviata: false }, 200, origine);
    }
    return risposta({ errore: 'dati non validi' }, 400, origine);
  }
  const lead = esito.lead;

  let db;
  try {
    db = supabaseAdmin();
  } catch (errore) {
    console.error('[lead] configurazione mancante', errore);
    return risposta({ errore: 'servizio non disponibile' }, 503, origine);
  }

  const ipHash = impronta(richiesta);
  const unOraFa = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db
    .from('lead_richieste')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('creato_il', unOraFa);
  if ((count ?? 0) >= RICHIESTE_PER_ORA) {
    return risposta({ errore: 'troppe richieste' }, 429, origine);
  }
  await db.from('lead_richieste').insert({ ip_hash: ipHash });

  // Secondo tentativo della stessa schermata (rete ballerina, doppio tocco):
  // si restituisce il codice già battuto invece di farne un altro.
  if (lead.clientToken) {
    const { data: gia } = await db
      .from('lead_card')
      .select('codice, scadenza, email_inviata_il')
      .eq('client_token', lead.clientToken)
      .maybeSingle();
    if (gia) {
      return risposta(
        { codice: gia.codice, scadenza: gia.scadenza, emailInviata: Boolean(gia.email_inviata_il) },
        200,
        origine,
      );
    }
  }

  // Stessa email = stessa persona: il contatto si aggiorna, non si duplica.
  const { data: esistente } = await db
    .from('contatti')
    .select('id, consenso_marketing, consenso_il')
    .ilike('email', lead.email)
    .maybeSingle();

  let contattoId: string;
  if (esistente) {
    contattoId = esistente.id;
    await db
      .from('contatti')
      .update({
        nome: lead.nome,
        // Il consenso non si toglie mai per silenzio: se l'aveva dato, resta.
        consenso_marketing: esistente.consenso_marketing || lead.consenso,
        consenso_il: lead.consenso && !esistente.consenso_il ? new Date().toISOString() : esistente.consenso_il,
      })
      .eq('id', contattoId);
  } else {
    const { data: nuovo, error } = await db
      .from('contatti')
      .insert({
        nome: lead.nome,
        email: lead.email,
        provenienza: 'card_nfc',
        stato: 'nuovo',
        consenso_marketing: lead.consenso,
        consenso_il: lead.consenso ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error || !nuovo) {
      console.error('[lead] contatto non salvato', error);
      return risposta({ errore: 'salvataggio non riuscito' }, 500, origine);
    }
    contattoId = nuovo.id;
  }

  // Il codice è unico per vincolo del database: alla collisione si ritenta.
  const scadenza = scadenzaDaOggi();
  let codice = '';
  for (let tentativo = 0; tentativo < 6 && !codice; tentativo += 1) {
    const candidato = generaCodice();
    const { error } = await db.from('lead_card').insert({
      contatto_id: contattoId,
      progetto: lead.progetto,
      stile: lead.stile,
      consegna: lead.consegna,
      codice: candidato,
      credito_eur: CREDITO_EUR,
      scadenza,
      client_token: lead.clientToken,
    });
    if (!error) codice = candidato;
    else if (error.code !== '23505') {
      console.error('[lead] credito non salvato', error);
      return risposta({ errore: 'salvataggio non riuscito' }, 500, origine);
    }
    // 23505 su client_token (non sul codice) vuol dire che una chiamata
    // gemella è arrivata prima: si rilegge la sua riga e si esce in pari.
    else if (lead.clientToken) {
      const { data: gemella } = await db
        .from('lead_card')
        .select('codice, scadenza, email_inviata_il')
        .eq('client_token', lead.clientToken)
        .maybeSingle();
      if (gemella) {
        return risposta(
          { codice: gemella.codice, scadenza: gemella.scadenza, emailInviata: Boolean(gemella.email_inviata_il) },
          200,
          origine,
        );
      }
    }
  }
  if (!codice) {
    console.error('[lead] nessun codice libero dopo sei tentativi');
    return risposta({ errore: 'salvataggio non riuscito' }, 500, origine);
  }

  // Il promemoria di richiamo: è questo che fa del lead un cliente.
  const richiamo = new Date();
  richiamo.setDate(richiamo.getDate() + GIORNI_RICHIAMO);
  await db.from('attivita').insert({
    contatto_id: contattoId,
    titolo: `Richiamare ${lead.nome} — ${lead.progetto.toLowerCase()}, stile ${lead.stile.toLowerCase()}`,
    tipo: 'chiamata',
    scadenza: richiamo.toISOString(),
  });

  // L'email parte solo se il cliente l'ha chiesta. Se non parte, la card lo
  // dice: meglio "mostra il codice in negozio" di una promessa non mantenuta.
  let emailInviata = false;
  if (lead.consegna === 'Email') {
    const invio = await inviaCodice({
      nome: lead.nome,
      email: lead.email,
      codice,
      scadenza,
      credito: CREDITO_EUR,
    });
    emailInviata = invio.inviata;
    if (invio.inviata) {
      await db.from('lead_card').update({ email_inviata_il: new Date().toISOString() }).eq('codice', codice);
    } else {
      console.warn('[lead] email non inviata:', invio.motivo);
    }
  }

  return risposta({ codice, scadenza, emailInviata }, 200, origine);
}
