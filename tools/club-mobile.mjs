// Controllo su telefono simulato della landing Club Rama (public/club/).
// Percorre tutte e sette le schermate, aspetta le animazioni e salva uno
// screenshot per ciascuna. Il CRM non serve: la chiamata a /api/lead viene
// intercettata qui dentro, prima in errore (per vedere che la pagina lo dica
// invece di inventarsi un codice) e poi con una risposta finta. Uso:
//   node tools/static-server.mjs public 8932 &
//   node tools/club-mobile.mjs <cartella-screenshot>
import { chromium } from 'playwright-core';
const out = process.argv[2] || '.';
const url = process.argv[3] || 'http://localhost:8932/club/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errors = [];
p.on('pageerror', (e) => errors.push(`PAGE ERROR: ${e.message}`));
p.on('console', (m) => {
  // La pagina non dichiara nessuna icona, quindi il browser prova comunque
  // /favicon.ico e logga un 404: non riguarda il contenuto. L'altro rumore
  // atteso è la chiamata al CRM che blocchiamo apposta qui sotto.
  const dove = `${m.text()} ${m.location() && m.location().url ? m.location().url : ''}`;
  const atteso = /Failed to load resource.*404/.test(m.text()) || /api\/lead/.test(dove);
  if (m.type() === 'error' && !atteso) errors.push(`CONSOLE ERROR: ${m.text()}`);
});
p.on('request', (r) => { if (!r.url().startsWith('http://localhost')) errors.push(`RICHIESTA ESTERNA: ${r.url()}`); });
p.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/api/lead')) errors.push(`${r.status()} su ${r.url()}`); });

// Il CRM finto. `crmVivo` decide se risponde o se cade la linea.
const CODICE_FINTO = 'RAMA70-7K3M';
let crmVivo = false;
let chiamateAlCrm = 0;
await p.route('**/api/lead', async (rotta) => {
  chiamateAlCrm += 1;
  if (!crmVivo) return rotta.abort('connectionrefused');
  const inviato = JSON.parse(rotta.request().postData() || '{}');
  if (inviato.hp !== '') errors.push('TRAPPOLA: il campo esca è arrivato pieno');
  for (const campo of ['nome', 'email', 'progetto', 'stile', 'consegna']) {
    if (!inviato[campo]) errors.push(`PAYLOAD: manca "${campo}"`);
  }
  await rotta.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ codice: CODICE_FINTO, scadenza: '2026-12-15', emailInviata: true }),
  });
});

await p.goto(url, { waitUntil: 'load' });

// 1 — animazione di apertura: dura ~5,3 s, poi lascia il posto al benvenuto.
await p.waitForTimeout(1400);
await p.screenshot({ path: `${out}/01-intro-hey.png` });
await p.waitForTimeout(1600);
await p.screenshot({ path: `${out}/02-intro-welcome.png` });
await p.waitForSelector('#intro', { state: 'hidden', timeout: 8000 });

const attiva = () => p.evaluate(() => document.querySelector('.screen.active').dataset.screen);
const scatta = async (n, atteso) => {
  const vera = await attiva();
  if (vera !== atteso) errors.push(`SCHERMATA: attesa "${atteso}", trovata "${vera}"`);
  await p.screenshot({ path: `${out}/${n}-${atteso}.png` });
};

await scatta('03', 'welcome');
await p.click('[data-screen="welcome"] .btn-primary');
await p.waitForTimeout(500);
await scatta('04', 'project');

await p.click('[data-screen="project"] .option');
await p.waitForTimeout(600);
await scatta('05', 'style');

await p.click('[data-screen="style"] .option');
await p.waitForTimeout(600);
// il contatore del credito sale da 0 a 70 in ~0,7 s
await p.waitForTimeout(1600);
await scatta('06', 'reveal');
const cifra = await p.textContent('#amountNum');
if (cifra.trim() !== '70') errors.push(`CREDITO: atteso "70", trovato "${cifra}"`);

await p.click('[data-screen="reveal"] .btn-primary');
await p.waitForTimeout(500);
await scatta('07', 'delivery');

await p.click('[data-screen="delivery"] .option');
await p.waitForTimeout(600);
await scatta('08', 'form');

await p.fill('#inpName', 'Mario Rossi');
await p.fill('#inpEmail', 'mario.rossi@example.it');

// Primo tentativo con il CRM irraggiungibile: niente codice inventato, la
// pagina resta sul modulo e lo dice.
await p.click('[data-screen="form"] .btn-primary');
await p.waitForTimeout(800);
if (await attiva() !== 'form') errors.push('OFFLINE: la pagina è passata a "fatto" senza risposta dal CRM');
if (!(await p.isVisible('#erroreForm'))) errors.push('OFFLINE: nessun avviso mostrato al cliente');
if (await p.isDisabled('#btnAttiva')) errors.push('OFFLINE: il bottone è rimasto bloccato, non si può riprovare');
await p.screenshot({ path: `${out}/09-form-offline.png` });

// Secondo tentativo, CRM in piedi: il codice mostrato è quello del server.
crmVivo = true;
await p.click('[data-screen="form"] .btn-primary');
await p.waitForTimeout(800);
await scatta('10', 'done');
const codice = (await p.textContent('#codeOut')).trim();
if (codice !== CODICE_FINTO) errors.push(`CODICE: atteso quello del server ("${CODICE_FINTO}"), trovato "${codice}"`);
if (chiamateAlCrm !== 2) errors.push(`CHIAMATE al CRM: attese 2, fatte ${chiamateAlCrm}`);

// la foto dello showroom è in base64 nel CSS: verifico che sia decodificata
const foto = await p.evaluate(() => {
  const el = document.querySelector('.welcome-img');
  if (!el) return 'nessun elemento foto trovato';
  return getComputedStyle(el).backgroundImage.slice(0, 40);
});

const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

console.log('codice generato:', codice);
console.log('foto showroom:', foto);
console.log('overflow orizzontale (px):', overflow);
console.log(errors.length ? `PROBLEMI:\n- ${errors.join('\n- ')}` : 'nessun errore, nessuna richiesta esterna');
await b.close();
process.exit(errors.length ? 1 : 0);
