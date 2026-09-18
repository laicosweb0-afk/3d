// Passata di controllo su Woman — The Fragrance Experience.
//
//   node tools/static-server.mjs woman/dist 8934 &
//   node tools/woman-qa.mjs <cartella-screenshot>
//
// Non controlla solo che la pagina funzioni: controlla che le regole del
// documento strategico siano ancora rispettate, e che la ruota sia onesta.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const out = process.argv[2];
const url = process.argv[3] || 'http://localhost:8934/';
// Si risponde con una famiglia diversa da quella giusta: il percorso di chi
// non indovina è quello che porta la consulenza, ed è il più delicato.
const RISPOSTA = 'Legnoso';

/* ---- quello che il codice promette, letto dal codice ---- */
const gioco = readFileSync(new URL('../woman/src/config/gioco.ts', import.meta.url), 'utf8');
const SPICCHI = JSON.parse(gioco.match(/export const SPICCHI: number\[\] = (\[[^\]]+\])/)[1]);
const ATTESE = { 15: 55, 10: 27, 5: 18 };  // le percentuali chieste dal cliente

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errori = [];
p.on('pageerror', (e) => errori.push(`PAGE ERROR: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errori.push(`CONSOLE: ${m.text()}`); });

// Nessuna chiamata fuori dal server locale: font compresi. La pagina si apre
// in negozio con una riga di rete, e deve bastare a sé stessa.
const fuori = [];
await p.route('**', (route) => {
  const u = route.request().url();
  if (!u.startsWith(url) && !u.startsWith('data:') && !u.startsWith('blob:')) fuori.push(u);
  route.continue();
});

await p.addInitScript(() => {
  const w = window;
  w.__audio = { osc: 0, buf: 0 };
  const AC = w.AudioContext || w.webkitAudioContext;
  if (!AC) return;
  const o = AC.prototype.createOscillator, b = AC.prototype.createBufferSource;
  AC.prototype.createOscillator = function () { w.__audio.osc++; return o.call(this); };
  AC.prototype.createBufferSource = function () { w.__audio.buf++; return b.call(this); };
});

const scatto = (n) => p.screenshot({ path: `${out}/${n}.png` });

/* ---- 1. la ruota è onesta? ------------------------------------------ */
// Le percentuali devono venire dalla geometria: tanti spicchi quante volte
// esce un premio. Se qualcuno mettesse i pesi nel codice, o uno spicchio da
// 100 € che non può uscire, qui si vede subito.
{
  const conta = {};
  SPICCHI.forEach((v) => { conta[v] = (conta[v] ?? 0) + 1; });
  for (const [valore, attesa] of Object.entries(ATTESE)) {
    const pct = ((conta[valore] ?? 0) / SPICCHI.length) * 100;
    if (Math.abs(pct - attesa) > 1.5) {
      errori.push(`RUOTA: il ${valore}€ esce nel ${pct.toFixed(1)}% degli spicchi invece del ${attesa}%`);
    }
  }
  for (const valore of Object.keys(conta)) {
    if (!(valore in ATTESE)) errori.push(`RUOTA: c'è uno spicchio da ${valore}€ che non è previsto`);
  }
  if (/Math\.random\(\)\s*[<>]/.test(gioco)) {
    errori.push('RUOTA: sembra esserci un sorteggio pesato nel codice; le probabilità devono stare negli spicchi');
  }
  console.log('spicchi:', SPICCHI.join(' · '), '→ credito medio',
    (SPICCHI.reduce((s, v) => s + v, 0) / SPICCHI.length).toFixed(2) + ' €');
}

/* ---- 2. il percorso ------------------------------------------------- */
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);
await scatto('0-hey');
await p.waitForTimeout(1600);
await scatto('0b-profumo');
await p.waitForSelector('.intro', { state: 'detached', timeout: 12000 });
await p.waitForTimeout(700);
await scatto('1-ingresso');

// Il font deve essere davvero Inter, e deve arrivare da casa nostra.
{
  const font = await p.evaluate(() => {
    const h1 = document.querySelector('.h1');
    return h1 ? getComputedStyle(h1).fontFamily : '';
  });
  if (!/Inter/.test(font)) errori.push(`FONT: il titolo usa ${font}`);
  const caricato = await p.evaluate(() => document.fonts.check('600 32px Inter'));
  if (!caricato) errori.push('FONT: Inter non risulta caricato — controlla public/fonts/');
}

await p.getByRole('button', { name: /Inizia il quiz/i }).click();
await p.waitForTimeout(800);
await scatto('2-domanda');

// Una domanda sola, quattro famiglie.
const opzioni = await p.getByRole('radio').count();
if (opzioni !== 4) errori.push(`DOMANDA: ${opzioni} famiglie invece di 4`);
for (const f of ['Agrumato', 'Floreale', 'Legnoso', 'Ambrato']) {
  if (!(await p.getByRole('radio', { name: new RegExp(f) }).count())) errori.push(`DOMANDA: manca «${f}»`);
}

await p.getByRole('radio', { name: new RegExp(RISPOSTA) }).click();
await p.waitForTimeout(1600);
await scatto('3-rivelazione');

// Il credito NON deve comparire qui: quiz e premio sono due momenti diversi.
{
  const testo = (await p.locator('.step').innerText()).replace(/\s+/g, ' ');
  if (/€|credito di|\d+\s*€/.test(testo.replace(/vinci il tuo credito/i, ''))) {
    errori.push('RIVELAZIONE: compare già il credito, ma la ruota deve venire dopo');
  }
  if (/sbagliat|errat|hai perso|purtroppo/i.test(testo)) {
    errori.push('TONO: la rivelazione tratta la risposta come un errore');
  }
  if (/\d+% ha risposto/.test(testo)) {
    errori.push('DATI: compare una percentuale, ma il conteggio vero non c’è ancora');
  }
}
if (await p.getByRole('button', { name: /passaggio precedente/i }).count()) {
  errori.push('RIVELAZIONE: c’è una freccia indietro, ma il secondo tentativo non esiste');
}

await p.getByRole('button', { name: /Vinci il tuo credito/i }).click();
await p.waitForTimeout(900);
await scatto('4-ruota');

// Sulla ruota si vedono solo premi veri.
{
  const valori = (await p.locator('.step svg text').allTextContents()).map((v) => v.trim());
  const unici = [...new Set(valori)].sort();
  const attesi = [...new Set(SPICCHI.map((v) => `${v}€`))].sort();
  if (unici.join(',') !== attesi.join(',')) {
    errori.push(`RUOTA: a schermo ${unici.join('/')}, negli spicchi ${attesi.join('/')}`);
  }
}

const audioPrima = await p.evaluate(() => ({ ...window.__audio }));
await p.getByRole('button', { name: /Gira la ruota/i }).click();
await p.waitForTimeout(2400);
await scatto('4b-giro');
await p.waitForTimeout(3200);
await scatto('4c-ferma');
await p.waitForTimeout(2600);
await scatto('5-credito');

const credito = (await p.locator('.premio-cifra').innerText()).replace(/[^\d]/g, '');
if (!SPICCHI.includes(Number(credito))) {
  errori.push(`CREDITO: ${credito} € non è uno dei premi della ruota`);
}
// Le fialette devono tornare con il credito: 5 € una, 10 € due, 15 € tre.
{
  const testo = (await p.locator('.step').innerText()).replace(/\s+/g, ' ');
  const attese = Number(credito) / 5;
  const parole = { 1: /Una fialetta/i, 2: /2 fialette/i, 3: /3 fialette/i };
  if (!parole[attese]?.test(testo)) {
    errori.push(`CREDITO: con ${credito} € non dice ${attese} fialett${attese === 1 ? 'a' : 'e'}`);
  }
}

await p.getByRole('button', { name: /Scopri le tue fragranze/i }).click();
await p.waitForTimeout(900);
await scatto('6-consigli');

// I consigli sono sempre tre: sono una consulenza, non il premio.
{
  const righe = await p.locator('.rec').count();
  if (righe !== 3) errori.push(`CONSIGLI: ${righe} fragranze invece di 3`);
  const testo = (await p.locator('.step').innerText()).replace(/\s+/g, ' ');
  if (!/copre/i.test(testo)) errori.push('CONSIGLI: non dice quante ne copre il credito');
}

await p.getByRole('button', { name: /Salva il tuo credito/i }).click();
await p.waitForTimeout(800);
await scatto('7-dati');

// Il modulo: col solo nome resta spento, con nome, contatto e consenso si accende.
const salva = p.getByRole('button', { name: /Salva le mie fialette/i });
await p.fill('#nome', 'Giulia Bassi');
await p.waitForTimeout(200);
if (!(await salva.isDisabled())) errori.push('MODULO: si invia senza nessun contatto');
await p.fill('#email', 'giulia@esempio.it');
await p.waitForTimeout(200);
if (!(await salva.isDisabled())) errori.push('MODULO: si invia senza consenso');
await p.locator('.consenso input').check();
await p.waitForTimeout(200);
if (await salva.isDisabled()) errori.push('MODULO: resta bloccato anche con nome, email e consenso');
await p.fill('#nome', 'Giulia');
await p.waitForTimeout(200);
if (!(await salva.isDisabled())) errori.push('MODULO: accetta un nome senza cognome');
await p.fill('#nome', 'Giulia Bassi');
await p.waitForTimeout(200);
await scatto('7b-compilato');

await salva.click();
await p.waitForTimeout(1600);
await scatto('8-fine');
if (!(await p.locator('text=/WOMAN-[A-Z0-9]{4}/').count())) {
  errori.push('FINE: il codice credito non compare o è malformato');
}
if (!(await p.getByText(/Naso (curioso|allenato|esperto)/i).count())) {
  errori.push('FINE: manca il livello, che è la cosa che resta');
}

/* ---- 3. il contorno ------------------------------------------------- */
const audioDopo = await p.evaluate(() => ({ ...window.__audio }));
const tick = audioDopo.osc - audioPrima.osc;
if (tick < 8) errori.push(`SUONO: solo ${tick} nodi durante il giro, gli scatti non suonano`);
if (audioDopo.buf - audioPrima.buf < 1) errori.push('SUONO: nessun fruscio della ruota');

const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 0) errori.push(`OVERFLOW orizzontale: ${overflow}px`);
if (fuori.length) errori.push(`RETE: la pagina chiama ${fuori.length} indirizzi esterni (${fuori[0]})`);

console.log('credito vinto:', credito + ' €', '· nodi audio:', tick, '· overflow:', overflow + 'px');
console.log(errori.length ? `PROBLEMI:\n- ${errori.join('\n- ')}` : 'nessun problema');
await b.close();
process.exit(errori.length ? 1 : 0);
