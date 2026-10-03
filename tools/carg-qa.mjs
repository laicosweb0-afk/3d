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

/*
 * Le parole di ogni schermata, raccolte man mano.
 *
 * Serve a un controllo che a mano non si riesce a fare: che due schermate
 * vicine non dicano la stessa cosa. È già successo due volte — l'ingresso
 * rimandava «la tua auto» dell'apertura e ripeteva pari pari l'occhiello
 * della schermata dopo — e da dentro una sola schermata non si vede.
 */
const detto = [];
async function raccogli(dove) {
  for (const sel of ['.h1', '.lede', '.eyebrow']) {
    for (const t of await p.locator(sel).allTextContents()) {
      const pulito = t.replace(/\s+/g, ' ').trim();
      if (pulito) detto.push({ dove, sel, testo: pulito });
    }
  }
}

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

// L'apertura ha due tempi, come su Woman e Rama: prima «Hey.», poi la frase.
{
  await p.waitForSelector('.intro-parola.show', { timeout: 6000 }).catch(() => {
    errori.push('APERTURA: il saluto non compare');
  });
  const primo = (await p.locator('.intro-parola.show').first().innerText().catch(() => '')).trim();
  if (!/^Hey/i.test(primo)) {
    errori.push(`APERTURA: la prima cosa a schermo è «${primo}», non il saluto`);
  }
  // Il saluto deve stare da solo: due testi al centro si leggono male.
  if (await p.locator('.apertura-riga.dentro').count()) {
    errori.push('APERTURA: la frase è già a schermo insieme al saluto');
  }
  await scatto('0-hey');

  // Nessun filmato: erano mezzo megabyte e cinque secondi di attesa.
  if (await p.locator('video').count()) {
    errori.push("APERTURA: c'è ancora un video, doveva restare solo il testo");
  }

  await p.waitForSelector('.apertura-riga.dentro', { timeout: 6000 }).catch(() => {
    errori.push('APERTURA: la frase non entra dopo il saluto');
  });
  await p.waitForTimeout(600);
  await scatto('0b-frase');
  const righe = await p.locator('.apertura-riga.dentro').allTextContents();
  if (righe.length !== 2) errori.push(`APERTURA: ${righe.length} righe invece di 2`);
  if (/da quanto non/i.test(righe.join(' '))) {
    errori.push(`APERTURA: è tornata la frase vecchia — «${righe.join(' ')}»`);
  }
  // Il saluto se ne deve essere andato, non restare sotto.
  if (await p.locator('.intro-parola.show').count()) {
    errori.push('APERTURA: il saluto è ancora a schermo con la frase');
  }
  const blu = await p.locator('.apertura-riga-blu').evaluate((el) => getComputedStyle(el).color).catch(() => '');
  if (!/rgb/.test(blu)) errori.push('APERTURA: la seconda riga non ha il colore del marchio');
  if (!(await p.locator('.apertura-firma').count())) {
    errori.push('APERTURA: manca la firma in basso');
  }
}
await p.waitForSelector('.intro', { state: 'detached', timeout: 12000 });
await p.waitForTimeout(700);
await scatto('1-ingresso');
await raccogli('ingresso');

// Il font deve essere davvero Inter, e deve arrivare da casa nostra.
{
  const font = await p.evaluate(() => {
    const h1 = document.querySelector('.h1');
    return h1 ? getComputedStyle(h1).fontFamily : '';
  });
  // Il font di sistema deve venire PRIMO: su iPhone e Mac è il San Francisco
  // vero, ed è la regola di casa (stessa pila di Club Rama). Inter resta
  // nella pila, ma come ripiego per Android e Windows.
  if (!/^\s*-apple-system/.test(font)) {
    errori.push(`FONT: la pila non parte dal font di sistema — «${font}»`);
  }
  if (!/Inter/.test(font)) {
    errori.push(`FONT: manca Inter come ripiego per Android e Windows — «${font}»`);
  }
  // Su questa macchina -apple-system non esiste, quindi tocca a Inter: se
  // non fosse caricato, il ripiego non esisterebbe davvero.
  const caricato = await p.evaluate(() => document.fonts.check('600 32px Inter'));
  if (!caricato) errori.push('FONT: Inter non risulta caricato — controlla public/fonts/');
}

await p.getByRole('button', { name: /^Inizia/i }).click();
await p.waitForTimeout(800);
await scatto('2-domanda');
await raccogli('domanda');

// Una domanda sola, quattro fasce.
const opzioni = await p.getByRole('radio').count();
if (opzioni !== 4) errori.push(`DOMANDA: ${opzioni} risposte invece di 4`);

await p.getByRole('radio', { name: new RegExp(RISPOSTA) }).click();
await p.waitForTimeout(1600);
await scatto('3-risposta');
await raccogli('risposta');

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
await raccogli('ruota');

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
await raccogli('lavori');

// Tre card, ognuna col suo tondo, il claim e il «quando serve».
{
  const righe = await p.locator('.servizio').count();
  if (righe !== 3) errori.push(`LAVORI: ${righe} card invece di 3`);
  for (const campo of ['.servizio-tondo', '.servizio-nome', '.servizio-claim', '.servizio-quando']) {
    const n = await p.locator(campo).count();
    if (n !== 3) errori.push(`LAVORI: ${campo} compare ${n} volte invece di 3`);
  }
  // Ogni tondo deve avere qualcosa dentro: o la foto, o il disegno.
  const vuoti = await p.locator('.servizio-tondo').evaluateAll(
    (nodi) => nodi.filter((n) => !n.querySelector('img, svg')).length);
  if (vuoti) errori.push(`LAVORI: ${vuoti} tondi vuoti, senza foto né disegno`);
  // Tre claim diversi: se si ripetono, le card sono un listino.
  const claim = await p.locator('.servizio-claim').allTextContents();
  if (new Set(claim.map((c) => c.trim())).size !== claim.length) {
    errori.push('LAVORI: due card dicono la stessa cosa');
  }
  const testo = (await p.locator('.step').innerText()).replace(/\s+/g, ' ');
  if (!new RegExp(`${credito}\\s*€`).test(testo)) {
    errori.push(`LAVORI: non ripete il credito da ${credito} €`);
  }
}

// La riga che instrada deve essere diversa per ognuna delle quattro
// risposte: se fosse la stessa, la domanda non servirebbe a niente.
{
  const gioco2 = readFileSync(new URL('../carg/src/config/gioco.ts', import.meta.url), 'utf8');
  const rotte = [...gioco2.matchAll(/rotta:\s*((?:'[^']*'|\s*\+\s*)+)/g)].map(([, r]) => r.replace(/\s+/g, ' '));
  if (rotte.length !== 4) errori.push(`ROTTE: ne trovo ${rotte.length} invece di 4`);
  if (new Set(rotte).size !== rotte.length) errori.push('ROTTE: due risposte leggono la stessa frase');
}

await p.getByRole('button', { name: /Salva il tuo credito/i }).click();
await p.waitForTimeout(800);
await scatto('7-dati');
await raccogli('dati');

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
await raccogli('fine');
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

/* ---- nessuna schermata ripete un'altra ---- */
{
  // L'apertura entra nel conto: è lì che è nata la ripetizione segnalata.
  const gioco3 = readFileSync(new URL('../carg/src/config/gioco.ts', import.meta.url), 'utf8');
  const ap = gioco3.match(/riga1: '([^']+)',\s*\/\*\*[\s\S]*?\*\/\s*riga2: '([^']+)'/)
    ?? gioco3.match(/riga1: '([^']+)'[\s\S]{0,400}?riga2: '([^']+)'/);
  if (ap) detto.unshift({ dove: 'apertura', sel: '.h1', testo: `${ap[1]} ${ap[2]}` });

  const parole = (t) => t.toLowerCase().replace(/[.,;:!?«»]/g, '').split(/\s+/).filter(Boolean);
  const terzine = (t) => {
    const w = parole(t);
    return w.length < 3 ? [] : w.slice(0, -2).map((_, i) => w.slice(i, i + 3).join(' '));
  };
  const visto = new Map();
  for (const voce of detto) {
    for (const t of terzine(voce.testo)) {
      const prima = visto.get(t);
      if (prima && prima.dove !== voce.dove) {
        errori.push(`RIPETIZIONE: «${t}» sta sia in ${prima.dove} che in ${voce.dove}`);
      } else if (!prima) {
        visto.set(t, voce);
      }
    }
  }
  // E nessuna frase intera identica fra due schermate.
  const interi = new Map();
  for (const voce of detto) {
    const k = voce.testo.toLowerCase();
    const prima = interi.get(k);
    if (prima && prima.dove !== voce.dove) {
      errori.push(`RIPETIZIONE: «${voce.testo}» identico in ${prima.dove} e ${voce.dove}`);
    } else if (!prima) interi.set(k, voce);
  }
}

const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow > 0) errori.push(`OVERFLOW orizzontale: ${overflow}px`);
if (fuori.length) errori.push(`RETE: la pagina chiama ${fuori.length} indirizzi esterni (${fuori[0]})`);

console.log('credito vinto:', credito + ' €', '· nodi audio:', tick, '· overflow:', overflow + 'px');
console.log(errori.length ? `PROBLEMI:\n- ${errori.join('\n- ')}` : 'nessun problema');
await b.close();
process.exit(errori.length ? 1 : 0);
