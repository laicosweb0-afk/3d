import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { depositoPubblico } from '@/lib/dati';
import { registraIngresso, type Ingresso } from '@/lib/dati/ingresso';
import type { TipoIdentita } from '@/lib/dominio/campagne';

// I moduli di Meta (Lead Ads): quelli che si compilano dentro Facebook o
// Instagram senza uscire dall'app.
//
// **Come funziona davvero, e perché questa rotta è fatta così.**
//
// Meta non manda i dati del lead nel webhook. Manda solo un avviso con un
// `leadgen_id`: «è arrivato un modulo, vienilo a prendere». I campi — nome,
// telefono, email — si leggono con una seconda chiamata alla Graph API, e
// quella chiamata vuole un token della Pagina con il permesso
// `leads_retrieval`, che passa da una App Review di Meta.
//
// Da qui nasce l'unica scelta onesta possibile:
//
//   • con `META_PAGE_TOKEN` configurato → si va a prendere il lead e si
//     registra davvero, con nome e recapiti;
//   • senza token → l'avviso si conserva e si segna «in attesa», e **non si
//     crea nessun contatto**. Un contatto senza nome né recapito non è un
//     contatto: è una riga vuota che qualcuno dovrà cancellare.
//
// I lead restano disponibili su Meta per 90 giorni: quando il token arriverà,
// la coda si potrà rilavorare e niente sarà andato perso. È esattamente il
// motivo per cui il payload grezzo si salva **prima** di qualunque cosa.
//
// STATO: NON COLLEGATO. Serve l'app Meta con i permessi approvati. Cosa
// manca e chi deve farlo sta in INTEGRATIONS.md e SETUP_GUIDE.md.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GRAFO = 'https://graph.facebook.com/v21.0';

function firmaMetaValida(corpoGrezzo: string, firma: string | null): boolean {
  const segreto = process.env.META_APP_SECRET;
  if (!segreto || !firma) return false;
  const atteso = `sha256=${createHmac('sha256', segreto).update(corpoGrezzo).digest('hex')}`;
  const a = Buffer.from(atteso, 'utf8');
  const b = Buffer.from(firma, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

// La stretta di mano che Meta fa quando si iscrive il webhook.
export async function GET(richiesta: Request) {
  const verifica = process.env.META_VERIFY_TOKEN;
  if (!verifica) return new NextResponse('webhook non configurato', { status: 503 });

  const url = new URL(richiesta.url);
  const modo = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const sfida = url.searchParams.get('hub.challenge');

  if (modo === 'subscribe' && token === verifica && sfida) {
    return new NextResponse(sfida, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse('verifica fallita', { status: 403 });
}

type CampoLead = { name?: string; values?: unknown[] };

// I nomi dei campi li decide chi crea il modulo dentro Meta: si accettano i
// più comuni, in italiano e in inglese.
function valore(campi: CampoLead[], nomi: string[]): string | null {
  for (const nome of nomi) {
    const trovato = campi.find((c) => String(c.name ?? '').toLowerCase() === nome);
    const v = trovato?.values?.[0];
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 300);
  }
  return null;
}

export async function POST(richiesta: Request) {
  const corpoGrezzo = await richiesta.text();

  if (!process.env.META_APP_SECRET) {
    return new NextResponse('webhook non configurato', { status: 503 });
  }
  if (!firmaMetaValida(corpoGrezzo, richiesta.headers.get('x-hub-signature-256'))) {
    return new NextResponse('firma non valida', { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(corpoGrezzo) as Record<string, unknown>;
  } catch {
    return new NextResponse('corpo non valido', { status: 400 });
  }

  const dep = depositoPubblico();
  const grezzoId = await dep.salvaIngressoGrezzo('leads', corpo);
  const token = process.env.META_PAGE_TOKEN;

  try {
    // Forma documentata: entry[].changes[].value con leadgen_id, form_id,
    // page_id, ad_id, created_time.
    const avvisi: Record<string, unknown>[] = [];
    for (const voce of Array.isArray(corpo.entry) ? corpo.entry : []) {
      const cambi = (voce as Record<string, unknown>)?.changes;
      for (const cambio of Array.isArray(cambi) ? cambi : []) {
        const valori = (cambio as Record<string, unknown>)?.value;
        if (valori && typeof valori === 'object') avvisi.push(valori as Record<string, unknown>);
      }
    }

    if (avvisi.length === 0) {
      await dep.segnaIngressoLavorato(grezzoId, 'ignorato');
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    if (!token) {
      // Niente token, niente dati. Si dice com'è e si tiene da parte: quando
      // il token arriverà, questa coda si rilavora e i lead sono ancora lì
      // (Meta li conserva 90 giorni).
      await dep.segnaIngressoLavorato(
        grezzoId, 'in_attesa', null,
        'manca META_PAGE_TOKEN: il lead è su Meta ma non si può leggere. Vedi SETUP_GUIDE.md',
      );
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    let ultimo: string | null = null;
    for (const avviso of avvisi) {
      const leadId = String(avviso.leadgen_id ?? '');
      if (!leadId) continue;

      const risposta = await fetch(`${GRAFO}/${leadId}?access_token=${encodeURIComponent(token)}`);
      if (!risposta.ok) {
        throw new Error(`Graph API ${risposta.status} sul lead ${leadId}`);
      }
      const lead = await risposta.json() as { field_data?: CampoLead[] };
      const campi = lead.field_data ?? [];

      const email = valore(campi, ['email', 'e-mail']);
      const telefono = valore(campi, ['phone_number', 'telefono', 'phone']);
      if (!email && !telefono) continue;

      const principale: { tipo: TipoIdentita; valore: string } = email
        ? { tipo: 'email', valore: email }
        : { tipo: 'telefono', valore: telefono! };

      const ingresso: Ingresso = {
        canale: 'sito',
        identita: principale,
        identitaExtra: email && telefono ? [{ tipo: 'telefono', valore: telefono }] : [],
        nome: valore(campi, ['first_name', 'nome']),
        cognome: valore(campi, ['last_name', 'cognome']),
        testo: valore(campi, ['messaggio', 'message', 'richiesta']),
        quando: typeof avviso.created_time === 'number'
          ? new Date(avviso.created_time * 1000).toISOString()
          : undefined,
        idConversazioneEsterna: `leadgen:${leadId}`,
        campagna: { adId: avviso.ad_id ? String(avviso.ad_id) : null },
        riferimento: { leadgen_id: leadId, form_id: avviso.form_id ?? null, ad_id: avviso.ad_id ?? null },
      };

      const esito = await registraIngresso(dep, ingresso);
      ultimo = esito.contattoId;
    }

    await dep.segnaIngressoLavorato(grezzoId, ultimo ? 'ok' : 'ignorato', ultimo);
  } catch (errore) {
    const messaggio = errore instanceof Error ? errore.message : 'errore sconosciuto';
    await dep.segnaIngressoLavorato(grezzoId, 'errore', null, messaggio);
    console.error('[webhook leads]', messaggio);
    // A Meta si risponde comunque 200: un errore nostro non deve far
    // ritentare all'infinito, e il payload è già al sicuro nella coda.
  }

  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}
