// Passata di controllo su Car.G Multiservice — la card NFC.
//
//   node tools/static-server.mjs carg/dist 8937 &
//   node tools/carg-qa.mjs <cartella-screenshot>
//
// Come quella di Woman, non controlla solo che la pagina funzioni: controlla
// che le regole dell'impianto siano ancora rispettate e che la ruota sia
// onesta. In più, qui controlla due cose che su una profumeria non c'erano:
// che nessun esito rimproveri chi legge, e che la card non diagnostichi.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const out = process.argv[2];
const url = process.argv[3] || 'http://localhost:8937/';
// Si risponde «non me lo ricordo»: è la risposta più scomoda, quella in cui
// è più facile che il tono scivoli nel rimprovero.
const RISPOSTA = 'Non me lo ricordo';

/* ---- quello che il codice promette, letto dal codice ---- */
const gioco = readFileSync(new URL('../carg/src/config/gioco.ts', import.meta.url), 'utf8');
const SPICCHI = JSON.parse(gioco.match(/export const SPICCHI: number\[\] = (\[[^\]]+\])/)[1]);
const PESI = [...gioco.matchAll(/\{ valore: (\d+), peso: (\d+) \}/g)]
  .map(([, v, w]) => ({ valore: Number(v), peso: Number(w) }));
const VINCIBILI = PESI.map((p) => p.valore);
const TELEFONO = gioco.match(/telefonoLink: '(\+\d+)'/)[1];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errori = [];
p.on('pageerror', (e) => errori.push(`PAGE ERROR: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errori.push(`CONSOLE: ${m.text()}`); });

// Nessuna chiamata fuori dal server locale: font compresi. La card si apre
// in officina con una riga di rete, e deve bastare a sé stessa.
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

/* ---- 1. la ruota ---------------------------------------------------- */
{
  const doppi = SPICCHI.filter((v, i) => SPICCHI.indexOf(v) !== i);
  if (doppi.length) errori.push(`RUOTA: ${doppi.join(', ')} compaiono più di una volta`);
  for (const v of VINCIBILI) {
    if (!SPICCHI.includes(v)) errori.push(`RUOTA: manca lo spicchio da ${v}€, ma è fra i vincibili`);
  }
  const somma = PESI.reduce((s, p) => s + p.peso, 0);
  if (somma !== 100) errori.push(`PESI: fanno ${somma} invece di 100`);
  const medio = PESI.reduce((s, p) => s + p.valore * p.peso, 0) / somma;
  console.log('spicchi:', SPICCHI.join(' · '), '→ si vince', VINCIBILI.join('/'),
    '· credito medio', medio.toFixed(2) + ' €');
}

/* ---- 2. il percorso ------------------------------------------------- */
await p.goto(url, { waitUntil: 'networkidle' });

// L'apertura è il filmato del marchio, e la frase entra sopra, non dopo.
{
  const clip = p.locator('.apertura-clip');
  if (!(await clip.count())) errori.push('APERTURA: manca il filmato del marchio');
  // Muto e inline, o su iOS non parte da solo e Safari se lo apre a pieno
  // schermo nel suo player.
  const v = await clip.evaluate((el) => ({
    muted: el.muted, inline: el.hasAttribute('playsinline'), auto: el.autoplay,
  })).catch(() => null);
  if (v && !(v.muted && v.inline && v.auto)) {
    errori.push(`APERTURA: il video è muted=${v.muted} playsinline=${v.inline} autoplay=${v.auto}`);
  }
  // E deve davvero scorrere: un video fermo al primo fotogramma è un nero.
  await p.waitForTimeout(2500);
  const t = await clip.evaluate((el) => el.currentTime).catch(() => 0);
  if (t < 0.5) errori.push(`APERTURA: il filmato è fermo a ${t}s, non sta partendo`);
  await scatto('0-marchio');
  const prima = (await p.locator('.intro-parola.show').allTextContents()).join(' ').trim();
  if (prima) errori.push(`APERTURA: «${prima}» è a schermo prima che il marchio si componga`);
}
await p.waitForSelector('.intro-parola.show', { timeout: 8000 });
{
  const frase = await p.locator('.intro-parola.show').first().innerText().catch(() => '');
  if (!frase.trim()) errori.push('APERTURA: la frase non compare');
  if (/da quanto non/i.test(frase)) {
    errori.push(`APERTURA: è tornata la frase vecchia — «${frase.trim()}»`);
  }
  // Il filmato deve essere ancora a schermo quando la frase entra: messa in
  // coda allungherebbe l'attesa prima della prima schermata.
  if (!(await p.locator('.apertura-clip').count())) {
    errori.push('APERTURA: la frase arriva a filmato finito, non sopra');
  }
}
await scatto('0b-frase');
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

await p.getByRole('button', { name: /^Inizia/i }).click();
await p.waitForTimeout(800);
await scatto('2-domanda');

// Una domanda sola, quattro fasce.
const opzioni = await p.getByRole('radio').count();
if (opzioni !== 4) errori.push(`DOMANDA: ${opzioni} risposte invece di 4`);

await p.getByRole('radio', { name: new RegExp(RISPOSTA) }).click();
await p.waitForTimeout(1600);
await scatto('3-risposta');

{
  const testo = (await p.locator('.step').innerText()).replace(/\s+/g, ' ');
  // Il credito NON deve comparire qui: risposta e premio sono due momenti.
  if (/€|credito di|\d+\s*€/.test(testo.replace(/vinci il tuo credito/i, ''))) {
    errori.push('RISPOSTA: compare già il credito, ma la ruota deve venire dopo');
  }
  // Nessuno esce rimproverato: è la regola che qui conta più che altrove.
  if (/sbagliat|errat|hai perso|purtroppo|in ritardo|dovresti|trascurat|grave/i.test(testo)) {
    errori.push(`TONO: la schermata rimprovera chi legge — «${testo.slice(0, 90)}…»`);
  }
  // E la card non diagnostica: non ha visto l'auto di nessuno.
  if (/la tua auto ha|il tuo problema è|sicuramente è|hai sicuramente/i.test(testo)) {
    errori.push('DIAGNOSI: la schermata dice cos’ha l’auto, ma non l’ha vista nessuno');
  }
  if (/\d+% ha risposto/.test(testo)) {
    errori.push('DATI: compare una percentuale, ma il conteggio vero non c’è ancora');
  }
}
if (await p.getByRole('button', { name: /passaggio precedente/i }).count()) {
  errori.push('RISPOSTA: c’è una freccia indietro, ma il secondo tentativo non esiste');
}

await p.getByRole('button', { name: /Vinci il tuo credito/i }).click();
await p.waitForTimeout(900);
await scatto('4-ruota');

// Sulla ruota si vedono solo gli importi dichiarati.
{
  const valori = (await p.locator('.step svg text').allTextContents()).map((v) => v.trim());
  const unici = [...new Set(valori)].sort();
  const attesi = SPICCHI.map((v) => `${v}€`).sort();
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
if (!VINCIBILI.includes(Number(credito))) {
  errori.push(`CREDITO: ${credito} € non è fra i premi che si possono vincere (${VINCIBILI.join('/')})`);
}

await p.getByRole('button', { name: /Dove lo usi/i }).click();
await p.waitForTimeout(900);
await scatto('6-consigli');

// Tre lavori, e il credito dichiarato sopra deve essere lo stesso di qui.
{
  const righe = await p.locator('.rec').count();
  if (righe !== 3) errori.push(`CONSIGLI: ${righe} lavori invece di 3`);
  const testo = (await p.locator('.step').innerText()).replace(/\s+/g, ' ');
  if (!new RegExp(`${credito}\\s*€`).test(testo)) {
    errori.push(`CONSIGLI: non ripete il credito da ${credito} €`);
  }
}

await p.getByRole('button', { name: /Salva il tuo credito/i }).click();
await p.waitForTimeout(800);
await scatto('7-dati');

// Il modulo: col solo nome resta spento, con nome, contatto e consenso si accende.
const salva = p.getByRole('button', { name: /Salva il mio credito/i });
await p.fill('#nome', 'Marco Berti');
await p.waitForTimeout(200);
if (!(await salva.isDisabled())) errori.push('MODULO: si invia senza nessun contatto');
await p.fill('#telefono', '3391234567');
await p.waitForTimeout(200);
if (!(await salva.isDisabled())) errori.push('MODULO: si invia senza consenso');
await p.locator('.consenso input').check();
await p.waitForTimeout(200);
if (await salva.isDisabled()) errori.push('MODULO: resta bloccato con nome, telefono e consenso');
await p.fill('#nome', 'Marco');
await p.waitForTimeout(200);
if (!(await salva.isDisabled())) errori.push('MODULO: accetta un nome senza cognome');
await p.fill('#nome', 'Marco Berti');
// L'auto è facoltativa: se lasciarla vuota bloccasse l'invio, qualcuno molla qui.
await p.waitForTimeout(200);
if (await salva.isDisabled()) errori.push("MODULO: l'auto non è facoltativa, blocca l'invio");
await p.fill('#auto', 'Golf 1.6 TDI');
await p.waitForTimeout(200);
await scatto('7b-compilato');

await salva.click();
await p.waitForTimeout(1600);
await scatto('8-fine');
if (!(await p.locator('text=/CARG-[A-Z0-9]{4}/').count())) {
  errori.push('FINE: il codice credito non compare o è malformato');
}
// La chiusura serve a prenotare: il bottone deve chiamare davvero.
{
  const tel = await p.locator('a[href^="tel:"]').getAttribute('href').catch(() => null);
  if (tel !== `tel:${TELEFONO}`) {
    errori.push(`FINE: il bottone chiama ${tel ?? 'nessuno'}, non ${TELEFONO}`);
  }
  if (!(await p.locator('a[href*="google.com/maps"]').count())) {
    errori.push('FINE: manca il link per arrivare in officina');
  }
  if (!(await p.locator('.notturno').count())) {
    errori.push('FINE: manca la riga del servizio notturno, che è il loro pezzo forte');
  }
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
