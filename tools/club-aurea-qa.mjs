// Passata di controllo su Club Aurea: percorre l'apertura, le tre note del
// quiz, la ruota e il modulo su un telefono simulato, fotografando ogni
// schermata. Esce con codice 1 se qualcosa non torna.
//
//   node tools/static-server.mjs club-aurea/dist 8934 &
//   node tools/club-aurea-qa.mjs <cartella-screenshot>
//
// Le risposte giuste sono quelle di `IN_DIFFUSIONE` in src/config/gioco.ts:
// se cambi la fragranza in diffusione, aggiorna anche RISPOSTE qui sotto,
// altrimenti il controllo del punteggio fallisce senza che sia rotto niente.
import { chromium } from 'playwright-core';

const out = process.argv[2];
const url = process.argv[3] || 'http://localhost:8934/';
// Notte Aurea: bergamotto (testa), gelsomino (cuore), vaniglia (fondo).
// La seconda si sbaglia apposta, per vedere anche lo stato rosso.
const RISPOSTE = ['Bergamotto', 'Rosa damascena', 'Vaniglia e ambra'];
const GIUSTE_ATTESE = 2;
const CREDITO_ATTESO = '15';

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
await scatto('1-avvio');
await colonna("sull'avvio");

if (!(await p.getByText(/indovinare le fragranze/i).count())) {
  errori.push("AVVIO: manca l'invito a indovinare le fragranze");
}

await p.getByRole('button', { name: 'Comincia' }).click();
await p.waitForTimeout(700);

for (let i = 0; i < RISPOSTE.length; i++) {
  await scatto(`2-nota-${i + 1}`);
  await p.getByRole('radio', { name: RISPOSTE[i] }).click();
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Conferma' }).click();
  await p.waitForTimeout(500);
  await scatto(`2-nota-${i + 1}-esito`);
  await colonna(`sulla nota ${i + 1}`);
  const avanti = i + 1 === RISPOSTE.length ? /Vedi com/ : /Prossima nota/;
  await p.getByRole('button', { name: avanti }).click();
  await p.waitForTimeout(650);
}

// L'esito entra scaglionato — punteggio, verdetto, poi la fragranza: la foto
// va presa a sipario alzato, non a metà dissolvenza.
await p.waitForTimeout(1200);
await scatto('3-esito');
const punteggio = (await p.locator('main .tabular').first().textContent())?.trim();
if (punteggio !== String(GIUSTE_ATTESE)) {
  errori.push(`PUNTEGGIO: ${punteggio} invece di ${GIUSTE_ATTESE}`);
}
if (!(await p.getByText('Notte Aurea').count())) {
  errori.push('ESITO: la fragranza non viene svelata');
}

await p.getByRole('button', { name: 'Vai alla ruota' }).click();
await p.waitForTimeout(700);
await scatto('4-ruota');

const audioPrima = await p.evaluate(() => ({ ...window.__audio }));
await p.getByRole('button', { name: 'Gira' }).click();
await p.waitForTimeout(2200);
await scatto('4b-in-giro');
await p.waitForTimeout(3300);           // la ruota si è appena posata
await scatto('4c-ruota-ferma');
await p.waitForTimeout(3100);           // conteggio, notifica e testi
await scatto('5-rivelazione');
await colonna('sulla rivelazione');

const credito = (await p.locator('main .tabular').first().textContent())?.trim();
if (credito !== CREDITO_ATTESO) errori.push(`CREDITO: ${credito}€ invece di ${CREDITO_ATTESO}€`);

await p.getByRole('button', { name: 'Ritira il credito' }).click();
await p.waitForTimeout(700);
await scatto('6-dati');

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
  errori.push("MODULO: con la sola email resta bloccato, ma uno dei due deve bastare");
}
await p.fill('#telefono', '333 481 2290');
await p.waitForTimeout(400);
await scatto('6b-compilato');

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
await scatto('7-fine');
await colonna('sulla fine');

const codice = await p.locator('text=/AUREA-[A-Z0-9]{4}/').count();
if (!codice) errori.push('TESSERA: il codice credito non compare o è malformato');

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

console.log('punteggio quiz:', punteggio, '· credito:', credito + '€', '· overflow:', overflow + 'px');
console.log(errori.length ? `PROBLEMI:\n- ${errori.join('\n- ')}` : 'nessun errore in console');
await b.close();
process.exit(errori.length ? 1 : 0);
