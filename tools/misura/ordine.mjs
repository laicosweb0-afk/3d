// L'ordine alla prova: la ricerca che capisce, lo stepper che rispetta il
// minimo, il prodotto scritto a mano, e il messaggio WhatsApp che ne esce.
// Si lancia con la build servita su :8100 (vedi README).
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errori = [];
p.on('console', (m) => { if (m.type() === 'error') errori.push(m.text().slice(0, 120)); });
p.on('pageerror', (e) => errori.push('PAGEERROR ' + String(e).slice(0, 120)));

await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
await p.waitForTimeout(1200);

let difetti = 0;
const esito = (nome, ok, dettaglio = '') => {
  console.log(`${ok ? '✓' : '✗'} ${nome}${dettaglio ? '  — ' + dettaglio : ''}`);
  if (!ok) difetti++;
};

const righe = () => p.$$eval('.ordine-riga .ordine-nome', (n) => n.map((e) => e.textContent));

// 1 — la ricerca capisce categorie, accenti e plurali
await p.fill('.ordina-cerca', 'salumi');
esito('«salumi» trova il prosciutto', (await righe()).some((r) => r.includes('Prosciutto')));
await p.fill('.ordina-cerca', 'formaggio');
const perFormaggio = await righe();
esito('«formaggio» (singolare) trova i formaggi',
  perFormaggio.some((r) => r.includes('capra')) && perFormaggio.some((r) => r.includes('Prataiola')));
await p.fill('.ordina-cerca', 'OLIO');
esito('«OLIO» maiuscolo trova i friarielli', (await righe()).some((r) => r.includes('Friarielli')));
await p.fill('.ordina-cerca', 'mozz');
esito('«mozz» basta per la mozzarella', (await righe()).some((r) => r.includes('Mozzarella')));

// 2 — lo stepper: parte da 1 kg, sale di mezzo, sotto il minimo si toglie
await p.fill('.ordina-cerca', '');
const rigaMozz = p.locator('.ordine-riga', { hasText: 'Mozzarella di bufala' });
await rigaMozz.locator('.ordine-aggiungi').click();
esito('«Aggiungi» parte dal minimo di 1 kg',
  (await rigaMozz.locator('.passo-kg').textContent()) === '1 kg');
await rigaMozz.locator('.passo-tasto').nth(1).click();
esito('il più sale di mezzo chilo',
  (await rigaMozz.locator('.passo-kg').textContent()) === '1,5 kg');
await rigaMozz.locator('.passo-tasto').nth(0).click();
await rigaMozz.locator('.passo-tasto').nth(0).click();
esito('il meno sotto il minimo toglie il prodotto',
  (await rigaMozz.locator('.ordine-aggiungi').count()) === 1);

// 3 — il catalogo parziale non perde ordini: prodotto scritto a mano
await p.fill('.ordina-cerca', 'ricotta di bufala');
await p.locator('.ordine-riga', { hasText: 'Non è ancora in lista' })
  .locator('.ordine-aggiungi').click();
esito('un prodotto fuori lista si aggiunge a mano',
  (await righe()).some((r) => r.includes('ricotta di bufala')));

// 4 — il messaggio: rimetto la mozzarella e leggo il collegamento
await rigaMozz.locator('.ordine-aggiungi').click();
const href = await p.getAttribute('.ordina-carta .bottone--pieno', 'href');
const corpo = decodeURIComponent((href ?? '').split('body=')[1] ?? '');
esito('il collegamento apre la posta sull’indirizzo ufficiale con l’oggetto',
  (href ?? '').startsWith('mailto:quellidellabufala1@gmail.com?subject='));
esito('il corpo elenca i prodotti coi chili',
  corpo.includes('Mozzarella di bufala — 1 kg') && corpo.includes('ricotta di bufala — 1 kg'));
esito('il corpo dice il ritiro (giorno o riapertura)',
  /Ritiro: (lunedì|martedì|mercoledì|venerdì|da concordare)/.test(corpo));

// 5 — le finestre: quattro righe informative, sintesi presente
esito('le quattro finestre del titolare sono in campo',
  (await p.$$eval('.ritiro-righe .orario-riga', (r) => r.length)) === 4);
esito('la sintesi dice cosa succede ordinando adesso',
  ((await p.textContent('.ordina-sintesi')) ?? '').length > 10);

// 6 — il totale
esito('il totale conta voci e chili',
  /2 prodotti · 2 kg/.test((await p.textContent('.ordina-totale')) ?? ''));

esito('zero errori console', errori.length === 0, errori.join(' | '));

console.log(difetti === 0 ? '\n✓ L’ORDINE NON HA DIFETTI' : `\n✗ ${difetti} DIFETTI`);
await b.close();
process.exit(difetti === 0 ? 0 : 1);
