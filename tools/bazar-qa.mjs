// Passata di controllo su Bazar Marrakech — Il tuo stile.
//
//   node tools/static-server.mjs bazar/dist 8935 &
//   node tools/bazar-qa.mjs <cartella-screenshot>
//
// Ripercorre la card su un viewport da iPhone, fotografa ogni schermata e
// fallisce se una delle regole è stata rotta: la ruota deve essere onesta
// (nessun peso nascosto, nessuno spicchio che non può uscire), la domanda una
// sola, il credito fuori dalla rivelazione, i pezzi tre e dai reparti del
// biglietto, i contatti del biglietto tutti sulla tessera, il font servito da
// noi, e nessuna chiamata fuori dal server locale.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const out = process.argv[2];
const url = process.argv[3] || 'http://localhost:8935/';
const RISPOSTA = process.env.RISPOSTA || 'Scuro e deciso';
const NOME_STILE = { 'Curve morbide': 'Velluto', 'Classico elegante': 'Classico', 'Scuro e deciso': 'Notte', 'Bazar e colore': 'Bazar' }[RISPOSTA];

/* ---- quello che il codice promette, letto dal codice ---- */
const gioco = readFileSync(new URL('../bazar/src/config/gioco.ts', import.meta.url), 'utf8');
const SPICCHI = JSON.parse(gioco.match(/export const SPICCHI: number\[\] = (\[[^\]]+\])/)[1]);
const ATTESE = { 30: 50, 50: 30, 70: 20 };

const errori = [];

/* ---- 1. la ruota, sulla carta ---- */
{
  const conti = {};
  for (const v of SPICCHI) conti[v] = (conti[v] ?? 0) + 1;
  for (const [v, pct] of Object.entries(ATTESE)) {
    const reale = ((conti[v] ?? 0) / SPICCHI.length) * 100;
    if (Math.abs(reale - pct) > 0.01) errori.push(`RUOTA: il ${v}€ esce il ${reale}% invece del ${pct}%`);
  }
  for (const v of Object.keys(conti)) {
    if (!(v in ATTESE)) errori.push(`RUOTA: spicchio da ${v}€ non previsto`);
  }
  if (/peso|PESI/.test(gioco.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) {
    errori.push('RUOTA: compare un sorteggio pesato nel codice; le probabilità stanno negli spicchi');
  }
  for (let i = 0; i < SPICCHI.length; i++) {
    if (SPICCHI[i] === SPICCHI[(i + 1) % SPICCHI.length]) {
      errori.push(`RUOTA: due spicchi da ${SPICCHI[i]}€ vicini (posizioni ${i} e ${(i + 1) % SPICCHI.length})`);
    }
  }
  const medio = SPICCHI.reduce((s, v) => s + v, 0) / SPICCHI.length;
  console.log('spicchi:', SPICCHI.join(' · '), '· credito medio', medio.toFixed(2) + ' €');
}

/* ---- 2. il percorso ---- */
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => errori.push(`PAGE ERROR: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errori.push(`CONSOLE: ${m.text()}`); });

const fuori = [];
await p.route('**', (route) => {
  const u = route.request().url();
  if (!u.startsWith(url) && !u.startsWith('data:') && !u.startsWith('blob:')) fuori.push(u);
  route.continue();
});

const scatto = (n) => p.screenshot({ path: `${out}/${n}.png` });
const testo = () => p.locator('#root').innerText();
const overflow = async (dove) => {
  const w = await p.evaluate(() => document.documentElement.scrollWidth);
  if (w > 390) errori.push(`OVERFLOW su ${dove}: ${w}px`);
};

await p.goto(url, { waitUntil: 'networkidle' });

// L'apertura: prima il filo d'oro, da solo; poi «Marhaba.»; poi il fronte
// del biglietto, con tutte e tre le righe.
await p.waitForTimeout(900);
{
  if (!(await p.locator('.intro-filo').count())) errori.push('APERTURA: il filo d\'oro non si apre');
  const parole = (await p.locator('.intro-parola.show').allTextContents()).join(' ').trim();
  if (parole) errori.push(`APERTURA: mentre si apre il filo c'è già da leggere: «${parole}»`);
}
await scatto('0-filo');
await p.waitForSelector('.intro-parola.show', { timeout: 3000 });
if (!(await p.locator('.intro-parola.show').first().innerText()).includes('Marhaba')) {
  errori.push('APERTURA: la prima parola non è «Marhaba.»');
}
await scatto('0-marhaba');
await p.waitForTimeout(1600);
{
  const fronte = (await p.locator('.intro-marchio').innerText()).replace(/\s+/g, ' ');
  for (const riga of ['BAZAR', 'MARRAKECH', 'SHOWROOM ARREDAMENTO · LUGO']) {
    if (!fronte.includes(riga)) errori.push(`APERTURA: il fronte del biglietto non ha «${riga}»`);
  }
}
await scatto('0-benvenuto');
await p.waitForSelector('.intro', { state: 'detached', timeout: 6000 });

// Il font: Poppins, quello del biglietto, caricato da noi.
{
  const f = await p.evaluate(async () => {
    await document.fonts.ready;
    const h1 = getComputedStyle(document.querySelector('.h1')).fontFamily;
    return { h1, poppins: document.fonts.check('500 40px Poppins') };
  });
  if (!f.h1.includes('Poppins')) errori.push(`FONT: il titolo è in ${f.h1}`);
  if (!f.poppins) errori.push('FONT: Poppins non si carica');
}

// 1 — ingresso, con il velluto da vicino dietro
await p.waitForTimeout(500);
if (!(await p.locator('.step-sfondo').evaluate((i) => i.complete && i.naturalWidth).catch(() => 0))) {
  errori.push('INGRESSO: la foto del velluto non si carica');
}
await scatto('1-ingresso');
await overflow('ingresso');
await p.getByRole('button', { name: /Inizia/ }).click();

// 2 — la domanda: quattro stili, uno solo
await p.waitForSelector('.opt');
if ((await p.locator('.opt').count()) !== 4) errori.push('DOMANDA: gli stili non sono quattro');
await scatto('2-domanda');
await overflow('domanda');
await p.locator('.opt', { hasText: RISPOSTA }).click();

// 3 — la rivelazione, senza credito e senza ritorno
await p.waitForSelector('.h1-oro');
await p.waitForTimeout(800);
{
  const t = await testo();
  if (/€/.test(t)) errori.push('RIVELAZIONE: il credito compare già qui');
  if (/indietro|cambia risposta|riprova/i.test(t)) errori.push('RIVELAZIONE: c\'è un modo per rispondere di nuovo');
  if (/sbagliat|errat/i.test(t)) errori.push('RIVELAZIONE: la risposta è trattata come un errore');
  if (!t.includes(NOME_STILE)) errori.push('RIVELAZIONE: lo stile non è quello scelto');
}
if (RISPOSTA !== 'Bazar e colore') {
  // La foto del pezzo: c'è, e si è caricata davvero.
  const w = await p.locator('.foto-stile').evaluate((i) => i.complete && i.naturalWidth).catch(() => 0);
  if (!w) errori.push('RIVELAZIONE: la foto dello stile non si carica');
}
await scatto('3-rivelazione');
await p.getByRole('button', { name: /Gira la ruota/ }).click();

// 4 — la ruota
await p.waitForSelector('svg[aria-label*="Ruota"]');
await scatto('4-ruota');
await p.getByRole('button', { name: /Gira la ruota/ }).click();
await p.waitForTimeout(2400);
await scatto('4-ruota-gira');
await p.waitForSelector('.premio-cifra', { timeout: 9000 });
await p.waitForTimeout(1800);

// 5 — il credito
let credito;
{
  credito = Number((await p.locator('.premio-cifra').innerText()).replace(/\D/g, ''));
  if (!(credito in ATTESE)) errori.push(`CREDITO: ${credito}€ non è fra gli spicchi`);
  console.log('credito vinto:', credito + ' €');
}
await scatto('5-credito');
await overflow('credito');
await p.getByRole('button', { name: /pezzi/ }).click();

// 6 — i pezzi: sempre tre
await p.waitForSelector('.rec');
if ((await p.locator('.rec').count()) !== 3) errori.push('PEZZI: non sono tre');
{
  await p.waitForTimeout(400);
  const rotte = await p.locator('img.rec-foto').evaluateAll((im) => im.filter((i) => !i.naturalWidth).length);
  if (rotte) errori.push(`PEZZI: ${rotte} miniature non si caricano`);
}
{
  const REPARTI = ['Salotti e poltrone', 'Tappeti', 'Lampadari', 'Profumi e casalinghi'];
  for (const r of (await p.locator('.rec-reparto').allInnerTexts()).map((x) => x.replace(/\s*Novità$/i, ''))) {
    if (!REPARTI.some((x) => x.toUpperCase() === r.toUpperCase())) errori.push(`PEZZI: reparto «${r}» non è sul biglietto`);
  }
}
await scatto('6-pezzi');
await overflow('pezzi');
await p.getByRole('button', { name: /Salva il tuo credito/ }).click();

// 7 — i dati
await p.waitForSelector('#nome');
const invia = p.getByRole('button', { name: /Salva il mio credito/ });
if (await invia.isEnabled()) errori.push('DATI: si invia a modulo vuoto');
await p.fill('#nome', 'Giulia Rossi');
await p.fill('#telefono', '333 1234567');
await p.locator('.consenso input').check();
await scatto('7-dati');
if (!(await invia.isEnabled())) errori.push('DATI: con nome, telefono e consenso non si invia');
await invia.click();

// 8 — la tessera
await p.waitForSelector('.tessera', { timeout: 4000 });
{
  const codice = await p.locator('.codice').innerText();
  if (!/^BAZAR-[A-HJ-NP-Z2-9]{4}$/.test(codice)) errori.push(`FINE: codice malformato «${codice}»`);
  const cifra = Number((await p.locator('.tessera-cifra').innerText()).replace(/\D/g, ''));
  if (cifra !== credito) errori.push(`FINE: la tessera dice ${cifra}€ ma la ruota ${credito}€`);
}
{
  // I contatti del retro del biglietto, tutti.
  const t = await testo();
  for (const c of ['Fatima Zahra', '328 785 3098', 'Salah', '389 012 7054',
    'Via Fratelli Zucchini 5', '48022 Lugo (RA)', '@bazar.marrakech9',
    'bazar-marrakech.com', 'Consegne in tutta Italia']) {
    if (!t.includes(c)) errori.push(`FINE: manca «${c}»`);
  }
}
await scatto('8-fine');
await overflow('fine');

await b.close();

if (fuori.length) errori.push(`RETE: chiamate fuori dal server locale:\n  ${[...new Set(fuori)].join('\n  ')}`);

if (errori.length) {
  console.error('\n✗ ' + errori.join('\n✗ '));
  process.exit(1);
}
console.log('✓ tutto in regola');
