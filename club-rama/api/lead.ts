/**
 * La funzione che riceve un contatto dalla pagina e lo gira su WhatsApp.
 *
 * Perché esiste: la chiave del servizio WhatsApp non può stare nella pagina.
 * Una pagina è pubblica — chiunque apre il sorgente la legge, e da quel
 * momento può spedire messaggi a nome di Rama. La chiave sta qui, in una
 * variabile d'ambiente che il browser non vede mai.
 *
 * Variabili d'ambiente (Vercel, Settings, Environment Variables):
 *
 *   DESTINATARIO      numero che riceve, internazionale senza segni: 393331234567
 *   PROVIDER          'twilio' oppure 'meta'
 *   ORIGINE_AMMESSA   il dominio della pagina, per non lasciare la porta aperta
 *
 *   con Twilio, per provare subito anche col sandbox:
 *   TWILIO_SID        identificativo dell'account
 *   TWILIO_TOKEN      token dell'account
 *   TWILIO_MITTENTE   numero WhatsApp mittente, es. 14155238886
 *
 *   con Meta WhatsApp Cloud API, per la produzione:
 *   META_TOKEN        token permanente
 *   META_NUMERO_ID    identificativo del numero mittente
 *   META_MODELLO      nome del modello approvato, con una sola variabile nel corpo
 *   META_LINGUA       codice lingua del modello, es. it
 */

type Lead = {
  nome?: string;
  email?: string;
  telefono?: string;
  ambiente?: string;
  stile?: string;
  credito?: number;
  codiceCredito?: string;
  ritiro?: string;
  consensoMarketing?: boolean;
  timestamp?: string;
  sorgente?: string;
};

/** Un contatto sta in poche centinaia di byte: oltre, non è un contatto. */
const LIMITE_CORPO = 4 * 1024;

/** I caratteri di controllo, che in un messaggio non hanno niente da fare. */
const CONTROLLO = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

/** Taglia e ripulisce: quello che arriva da fuori non è mai da fidarsi. */
function pulisci(v: unknown, max = 120): string {
  return String(v ?? '').replace(CONTROLLO, ' ').trim().slice(0, max);
}

/** Il riepilogo su una riga sola: i modelli WhatsApp non accettano gli a capo. */
function rigaSola(l: Lead): string {
  return [
    pulisci(l.nome, 60),
    pulisci(l.telefono, 25),
    pulisci(l.email, 80),
    pulisci(l.ambiente, 30),
    pulisci(l.stile, 40),
    `${Number(l.credito) || 0} euro ${pulisci(l.codiceCredito, 20)}`,
    `ritiro ${pulisci(l.ritiro, 20)}`,
    `marketing ${l.consensoMarketing ? 'si' : 'no'}`,
  ].filter(Boolean).join(' - ').slice(0, 900);
}

/** La versione leggibile, per i canali che accettano il testo libero. */
function messaggio(l: Lead): string {
  return [
    '*Nuovo contatto Club Rama*',
    '',
    pulisci(l.nome, 60),
    pulisci(l.telefono, 25),
    pulisci(l.email, 80),
    '',
    `Progetto: ${pulisci(l.ambiente, 30) || '-'}`,
    `Stile: ${pulisci(l.stile, 40) || '-'}`,
    `Credito: ${Number(l.credito) || 0} euro, ${pulisci(l.codiceCredito, 20) || '-'}`,
    `Ritiro: ${pulisci(l.ritiro, 20) || '-'}`,
    `Marketing: ${l.consensoMarketing ? 'si' : 'no'}`,
  ].join('\n');
}

async function viaTwilio(a: string, testo: string): Promise<void> {
  const { TWILIO_SID, TWILIO_TOKEN, TWILIO_MITTENTE } = process.env;
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_MITTENTE) throw new Error('Twilio non configurato');
  const credenziali = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credenziali}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: `whatsapp:+${TWILIO_MITTENTE}`,
      To: `whatsapp:+${a}`,
      Body: testo,
    }),
  });
  if (!r.ok) throw new Error(`Twilio ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

async function viaMeta(a: string, riepilogo: string): Promise<void> {
  const { META_TOKEN, META_NUMERO_ID, META_MODELLO, META_LINGUA } = process.env;
  if (!META_TOKEN || !META_NUMERO_ID || !META_MODELLO) throw new Error('Meta non configurato');
  // Fuori dalle 24 ore da un messaggio del destinatario, WhatsApp accetta solo
  // modelli approvati: il riepilogo viaggia come unica variabile del corpo.
  const r = await fetch(`https://graph.facebook.com/v21.0/${META_NUMERO_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: a,
      type: 'template',
      template: {
        name: META_MODELLO,
        language: { code: META_LINGUA || 'it' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: riepilogo }] }],
      },
    }),
  });
  if (!r.ok) throw new Error(`Meta ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

export default async function handler(req: Request): Promise<Response> {
  const intestazioni: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ORIGINE_AMMESSA || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: intestazioni });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ errore: 'metodo non ammesso' }), { status: 405, headers: intestazioni });
  }

  let lead: Lead;
  try {
    const grezzo = await req.text();
    if (grezzo.length > LIMITE_CORPO) throw new Error('corpo troppo grande');
    lead = JSON.parse(grezzo) as Lead;
  } catch {
    return new Response(JSON.stringify({ errore: 'contatto non leggibile' }), { status: 400, headers: intestazioni });
  }

  if (!pulisci(lead.nome) || !pulisci(lead.telefono)) {
    return new Response(JSON.stringify({ errore: 'contatto incompleto' }), { status: 400, headers: intestazioni });
  }

  // Il contatto finisce comunque nei log della funzione: se WhatsApp fa i
  // capricci non si perde, e si recupera dalla dashboard.
  console.log('[club-rama] contatto', JSON.stringify({ ...lead, ricevuto: new Date().toISOString() }));

  const a = (process.env.DESTINATARIO || '').replace(/\D/g, '');
  if (!a) {
    return new Response(
      JSON.stringify({ ok: true, whatsapp: 'destinatario non configurato' }),
      { status: 200, headers: intestazioni },
    );
  }

  try {
    if ((process.env.PROVIDER || 'twilio') === 'meta') await viaMeta(a, rigaSola(lead));
    else await viaTwilio(a, messaggio(lead));
    return new Response(JSON.stringify({ ok: true, whatsapp: 'inviato' }), { status: 200, headers: intestazioni });
  } catch (e) {
    // Il contatto è già nei log: chi ha compilato non deve vedere un errore
    // per un problema che non è suo.
    console.error('[club-rama] WhatsApp non inviato:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ ok: true, whatsapp: 'non inviato' }), { status: 200, headers: intestazioni });
  }
}

export const config = { runtime: 'edge' };
