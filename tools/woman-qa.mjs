// Passata di controllo su Woman — The Fragrance Experience: apertura, la
// domanda unica, la rivelazione, la ruota e il modulo su un telefono
// simulato, con uno screenshot per schermata. Esce con codice 1 se qualcosa
// non torna.
//
//   node tools/static-server.mjs woman/dist 8934 &
//   node tools/woman-qa.mjs <cartella-screenshot>
//
// Le regole che questo script difende vengono dal documento strategico, non
// dai miei gusti: una domanda sola, nessun secondo tentativo, un premio solo
// uguale per tutti, e un risultato che non è mai una sconfitta.
import { chromium } from 'playwright-core';

const out = process.argv[2];
const url = process.argv[3] || 'http://localhost:8934/';
// Si risponde apposta con una famiglia diversa da quella giusta: il percorso
// di chi non indovina è quello che porta la consulenza, ed è il più delicato.
const RISPOSTA = 'Legnoso';
const PREMIO_ATTESO = '15';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errori = [];
p.on('pageerror', (e) => errori.push(`PAGE ERROR: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errori.push(`CONSOLE: ${m.text()}`); });

// Da qui non si sente niente, ma si può contare: se durante il giro non
// nasce nessun nodo audio, i suoni non ci sono, per quanto il codice compili.
await p.addInitScript(() => {
  const w = window;
  w.__audio = { osc: 0, buf: 0 };
  const AC = w.AudioContext || w.webkitAudioContext;
  if (!AC) return;
  const o = AC.prototype.createOscillator, b = AC.prototype.createBufferSource;
  AC.prototype.createOscillator = function () { w.__audio.osc++; return o.call(this); };
  AC.prototype.createBufferSource = function () { w.__audio.buf++; return b.call(this); };
});

// Nessuna chiamata fuori dal server locale: la pagina deve bastare a sé.
const fuori = [];
await p.route('**', (route) => {
  const u = route.request().url();
  if (!u.startsWith(url) && !u.startsWith('data:') && !u.startsWith('blob:')) fuori.push(u);
  route.continue();
});

const scatto = (nome) => p.screenshot({ path: `${out}/${nome}.png` });
const colonna = async (dove) => {
  const l = await p.evaluate(() => Math.round(document.querySelector('#root').getBoundingClientRect().width));
  if (l !== 390) errori.push(`COLONNA ${dove}: ${l}px invece di 390`);
};

await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await scatto('0-hey');
await p.waitForTimeout(1800);
await scatto('0b-profumo');
await p.waitForSelector('.intro', { state: 'detached', timeout: 9000 });
await p.waitForTimeout(500);
await scatto('1-domanda');
await colonna('sulla domanda');

// Una domanda sola, quattro famiglie: se qualcuno ne aggiunge una quinta o
// spezza il quiz in due schermate, qui si vede subito.
const opzioni = await p.getByRole('radio').count();
if (opzioni !== 4) errori.push(`DOMANDA: ${opzioni} famiglie invece di 4`);
for (const f of ['Agrumato', 'Floreale', 'Legnoso', 'Ambrato']) {
  if (!(await p.getByRole('radio', { name: f }).count())) errori.push(`DOMANDA: manca «${f}»`);
}

await p.getByRole('radio', { name: RISPOSTA }).click();
await p.waitForTimeout(300);
await scatto('1b-scelto');
await p.getByRole('button', { name: 'Scopri' }).click();
await p.waitForTimeout(1600);
await scatto('2-risposta');
await colonna('sulla risposta');

// Nessun secondo tentativo: dalla rivelazione non si torna alla domanda.
if (await p.getByRole('button', { name: /passaggio precedente/i }).count()) {
  errori.push('RISPOSTA: c’è una freccia indietro, ma il secondo tentativo non esiste');
}

// Chi non indovina riceve la consulenza, non un rimprovero.
const testoRisposta = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
if (!/proponiamo queste/i.test(testoRisposta)) {
  errori.push('RISPOSTA: a chi ha sentito altro non arrivano le tre fialette consigliate');
}
if (/sbagliat|errat|hai perso|purtroppo/i.test(testoRisposta)) {
  errori.push('TONO: la rivelazione tratta la risposta come un errore');
}
// Il numero inventato è l'unica bugia possibile in tutta l'esperienza.
if (/\d+% ha risposto/.test(testoRisposta)) {
  errori.push('DATI: compare una percentuale, ma il conteggio vero non c’è ancora');
}

await p.getByRole('button', { name: 'Ritira il credito' }).click();
await p.waitForTimeout(700);
await scatto('3-ruota');

// Ogni spicchio vale 15 €: nessun premio che non può uscire.
const valori = await p.locator('main svg text').allTextContents();
const diversi = [...new Set(valori.map((v) => v.trim()))];
if (diversi.length !== 1 || diversi[0] !== `${PREMIO_ATTESO}€`) {
  errori.push(`RUOTA: spicchi ${diversi.join(', ')} — devono valere tutti ${PREMIO_ATTESO}€`);
}

const audioPrima = await p.evaluate(() => ({ ...window.__audio }));
await p.getByRole('button', { name: 'Gira' }).click();
await p.waitForTimeout(2200);
await scatto('3b-in-giro');
await p.waitForTimeout(3000);           // la ruota si è appena posata
await scatto('3c-ruota-ferma');
await p.waitForTimeout(3400);           // conteggio, notifica e testi
await scatto('4-rivelazione');
await colonna('sulla rivelazione');

const credito = (await p.locator('main .tabular').first().textContent())?.trim();
if (credito !== PREMIO_ATTESO) errori.push(`CREDITO: ${credito}€ invece di ${PREMIO_ATTESO}€`);

await p.getByRole('button', { name: 'Intestalo a me' }).click();
await p.waitForTimeout(700);
await scatto('5-dati');

// Il modulo si accontenta di uno dei due contatti: col solo nome resta
// spento, col nome e l'email si accende.
await p.fill('#nome', 'Giulia Bassi');
await p.locator('#email').focus();
await p.locator('#nome').focus();
await p.waitForTimeout(250);
if (!(await p.getByRole('button', { name: 'Ricevi il credito' }).isDisabled())) {
  errori.push('MODULO: si invia senza nessun contatto');
}
await p.fill('#email', 'giulia@esempio.it');
await p.waitForTimeout(300);
if (await p.getByRole('button', { name: 'Ricevi il credito' }).isDisabled()) {
  errori.push('MODULO: con la sola email resta bloccato, ma uno dei due deve bastare');
}
await p.fill('#telefono', '333 481 2290');
await p.waitForTimeout(400);
await scatto('5b-compilato');

// Il nome senza cognome non passa: è l'unica cosa che chiediamo davvero.
await p.fill('#nome', 'Giulia');
await p.locator('#email').focus();
await p.waitForTimeout(300);
if (!(await p.getByRole('button', { name: 'Ricevi il credito' }).isDisabled())) {
  errori.push('MODULO: accetta un nome senza cognome');
}
await p.fill('#nome', 'Giulia Bassi');
await p.waitForTimeout(300);

const scorreIlModulo = await p.evaluate(() => {
  const m = document.querySelector('main');
  return m ? m.scrollHeight - m.clientHeight : 0;
});
if (scorreIlModulo > 0) errori.push(`MODULO: sborda di ${scorreIlModulo}px in altezza`);

await p.getByRole('button', { name: 'Ricevi il credito' }).click();
await p.waitForTimeout(1600);
await scatto('6-fine');
await colonna('sulla fine');

if (!(await p.locator('text=/WOMAN-[A-Z0-9]{4}/').count())) {
  errori.push('TESSERA: il codice credito non compare o è malformato');
}
if (!(await p.getByText(/Naso (curioso|allenato|esperto)/).count())) {
  errori.push('TESSERA: manca il livello, che è la cosa che resta');
}

const audioDopo = await p.evaluate(() => ({ ...window.__audio }));
const tickProdotti = audioDopo.osc - audioPrima.osc;
const fruscioProdotto = audioDopo.buf - audioPrima.buf;
if (tickProdotti < 8) errori.push(`SUONO: solo ${tickProdotti} nodi durante il giro, gli scatti non suonano`);
if (fruscioProdotto < 1) errori.push('SUONO: nessun fruscio della ruota');
console.log('nodi audio durante il giro:', tickProdotti, 'oscillatori,', fruscioProdotto, 'sorgenti');

const silenziatore = await p.getByRole('button', { name: /suoni/i }).count();
if (silenziatore !== 1) errori.push(`SILENZIATORE: trovati ${silenziatore} comandi invece di 1`);

const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 0) errori.push(`OVERFLOW orizzontale: ${overflow}px`);
if (fuori.length) errori.push(`RETE: la pagina chiama ${fuori.length} indirizzi esterni (${fuori[0]})`);

console.log('credito:', credito + '€', '· spicchi:', diversi.join('/'), '· overflow:', overflow + 'px');
console.log(errori.length ? `PROBLEMI:\n- ${errori.join('\n- ')}` : 'nessun errore in console');
await b.close();
process.exit(errori.length ? 1 : 0);
