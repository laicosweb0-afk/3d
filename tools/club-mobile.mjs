// Controllo su telefono simulato della landing Club Rama (public/club/).
// Percorre tutte e sette le schermate, aspetta le animazioni e salva uno
// screenshot per ciascuna. Uso:
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
  // /favicon.ico e logga un 404: è la sola richiesta di rete che fa, e non
  // riguarda il contenuto. Tutto il resto è un errore vero.
  const faviconMancante = /Failed to load resource.*404/.test(m.text());
  if (m.type() === 'error' && !faviconMancante) errors.push(`CONSOLE ERROR: ${m.text()}`);
});
p.on('request', (r) => { if (!r.url().startsWith('http://localhost')) errors.push(`RICHIESTA ESTERNA: ${r.url()}`); });
p.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} su ${r.url()}`); });

await p.goto(url, { waitUntil: 'load' });

// 1 — animazione di apertura: dura ~5,3 s, poi lascia il posto al benvenuto.
await p.waitForTimeout(1400);
await p.screenshot({ path: `${out}/01-intro-hey.png` });
await p.waitForTimeout(1600);
await p.screenshot({ path: `${out}/02-intro-welcome.png` });
await p.waitForSelector('#intro', { state: 'hidden', timeout: 8000 });
// le schede dei lavori entrano subito dopo l'apertura: aspetto che si posino
await p.waitForTimeout(900);

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
await p.waitForTimeout(600);
await scatta('07', 'form');

// L'email è facoltativa: il percorso da provare è quello col solo nome,
// perché è quello che deve passare senza bloccare nessuno.
await p.fill('#inpName', 'Mario Rossi');
await p.click('[data-screen="form"] .btn-primary');
await p.waitForTimeout(600);
await scatta('08', 'done');
const codice = (await p.textContent('#codeOut')).trim();
if (!/^RAMA70-[A-Z0-9]{4}$/.test(codice)) errors.push(`CODICE malformato: "${codice}"`);

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
