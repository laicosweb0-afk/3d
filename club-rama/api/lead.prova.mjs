/**
 * Prova della funzione senza toccare la rete: intercetto fetch e guardo cosa
 * avrebbe spedito davvero. Serve a vedere il messaggio che arriverebbe su
 * WhatsApp prima di configurare qualunque account, e a verificare il caso che
 * conta di più — il fornitore giù, e il cliente che non se ne accorge.
 *
 *   cd club-rama
 *   npx esbuild api/lead.ts --format=esm --platform=node --outfile=api/lead.js
 *   node api/lead.prova.mjs
 *   rm api/lead.js
 */
const chiamate = [];
globalThis.fetch = async (url, opz) => {
  chiamate.push({ url: String(url), corpo: opz?.body?.toString?.() ?? opz?.body });
  return { ok: true, status: 200, text: async () => 'ok' };
};
process.env.DESTINATARIO = '39 333 481 2290';
process.env.PROVIDER = 'twilio';
process.env.TWILIO_SID = 'ACfinto';
process.env.TWILIO_TOKEN = 'token-finto';
process.env.TWILIO_MITTENTE = '14155238886';

const { default: handler } = await import('./lead.js');

const lead = {
  nome: 'Giulia Bassi', email: 'giulia@esempio.it', telefono: '+39 3334812290',
  ambiente: 'Bagno', stile: 'Minimal e moderno', credito: 70,
  codiceCredito: 'RAMA-PHHN', scadenza: '2026-12-16T00:00:00.000Z',
  ritiro: 'email', consensoMarketing: true,
  timestamp: new Date().toISOString(), sorgente: 'card-nfc',
};
const r = await handler(new Request('https://x/api/lead', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead),
}));
console.log('risposta alla pagina:', r.status, await r.text());
console.log('\nchiamate in uscita:', chiamate.length);
for (const c of chiamate) {
  console.log('verso:', c.url.slice(0, 60));
  const p = new URLSearchParams(c.corpo);
  console.log('da:', p.get('From'), '  a:', p.get('To'));
  console.log('--- messaggio che ti arriva ---');
  console.log(p.get('Body'));
}

// E il caso che conta: WhatsApp rotto, il cliente non deve accorgersene.
globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom' });
const r2 = await handler(new Request('https://x/api/lead', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead),
}));
console.log('\ncon WhatsApp guasto, la pagina riceve:', r2.status, await r2.text());
