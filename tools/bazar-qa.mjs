// Passata di controllo su Bazar Marrakech — Il tuo stile.
//
//   node tools/static-server.mjs bazar/dist 8935 &
//   node tools/bazar-qa.mjs <cartella-screenshot>
//
// Ripercorre la card su un viewport da iPhone, fotografa ogni schermata e
// fallisce se una delle regole è stata rotta: la ruota fa vincere solo 15 € o
// 30 € e si ferma sullo spicchio giusto, la domanda una
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
// I due importi che si vincono davvero, con le loro percentuali.
const PESI = [...gioco.matchAll(/\{ valore: (\d+), peso: (\d+) \}/g)]
  .map(([, v, w]) => ({ valore: Number(v), peso: Number(w) }));
const VINCIBILI = PESI.map((p) => p.valore);

const errori = [];

/* ---- 1. la ruota, sulla carta ---- */
{
  // Si vincono 15 € o 30 €: è la scelta del negozio.
  if (VINCIBILI.join(',') !== '15,30') errori.push(`RUOTA: si vince ${VINCIBILI.join('/')} invece di 15/30`);
  const somma = PESI.reduce((s, p) => s + p.peso, 0);
  if (somma !== 100) errori.push(`PESI: fanno ${somma} invece di 100`);
  // Ogni importo compare una volta sola, e i vincibili ci sono tutti.
  const doppi = SPICCHI.filter((v, i) => SPICCHI.indexOf(v) !== i);
  if (doppi.length) errori.push(`RUOTA: ${doppi.join(', ')} compaiono più di una volta`);
  for (const v of VINCIBILI) {
    if (!SPICCHI.includes(v)) errori.push(`RUOTA: manca lo spicchio da ${v}€, ma è fra i vincibili`);
  }
  const medio = PESI.reduce((s, p) => s + p.valore * p.peso, 0) / somma;
  console.log('spicchi:', SPICCHI.join(' · '), '→ si vince', VINCIBILI.join('/'),
    '· credito medio', medio.toFixed(2) + ' €');
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

// L'apertura: prima il saluto, «Marhaba.» con «Benvenuto» sotto; poi il
// marchio da solo, al centro dello schermo, con tutte e tre le righe.
await p.waitForSelector('.intro-saluto.show', { timeout: 3000 });
await p.waitForTimeout(900);
{
  const saluto = (await p.locator('.intro-saluto').innerText()).replace(/\s+/g, ' ').trim();
  if (!/^Marhaba\. Benvenuto$/i.test(saluto)) errori.push(`APERTURA: il saluto è «${saluto}», non «Marhaba.» con «Benvenuto» sotto`);
  if (await p.locator('.intro-marchio').count()) errori.push('APERTURA: il marchio compare insieme al saluto');
}
await scatto('0-marhaba');
await p.waitForSelector('.intro-marchio', { timeout: 3000 });
await p.waitForTimeout(2000);
{
  if (await p.locator('.intro-saluto').count()) errori.push('APERTURA: il saluto resta a schermo col marchio');
  const fronte = (await p.locator('.intro-marchio').innerText()).replace(/\s+/g, ' ');
  for (const riga of ['BAZAR', 'MARRAKECH', 'SHOWROOM ARREDAMENTO · LUGO']) {
    if (!fronte.includes(riga)) errori.push(`APERTURA: il marchio non ha «${riga}»`);
  }
  // Al centro: il centro del marchio a pochi pixel dal centro dello schermo.
  const r = await p.locator('.intro-marchio .marchio').boundingBox();
  const dy = Math.abs(r.y + r.height / 2 - 844 / 2), dx = Math.abs(r.x + r.width / 2 - 390 / 2);
  if (dy > 12 || dx > 12) errori.push(`APERTURA: il marchio non è al centro (scarto ${dx.toFixed(0)}, ${dy.toFixed(0)} px)`);
}
await scatto('0-marchio');
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

// 0 — la vetrina: due riquadri, carosello in 3D, scheda con le foto
await p.waitForSelector('.riquadro');
await p.waitForTimeout(600);
{
  const titoli = await p.locator('.riquadro-titolo').allInnerTexts();
  if (titoli[0] !== 'Divani') errori.push(`VETRINA: il primo riquadro è «${titoli[0]}», non «Divani»`);
  const giri = await p.locator('.riquadro').first().locator('.carta3d').evaluateAll((cs) => cs.map((c) => c.style.transform));
  if (!giri[1] || !/rotateY\(-?[1-9]/.test(giri[1])) errori.push(`VETRINA: la seconda copertina non è girata in 3D («${giri[1]}»)`);
  if (/rotateY\(-?[1-9]/.test(giri[0] || '')) errori.push('VETRINA: la copertina in centro è girata');
}
await scatto('0v-vetrina');
await overflow('vetrina');
{
  // La testata non si ripete: il nome sta nella barra, il titolo dice altro.
  const titolo = await p.locator('.vetrina-testa .h1').innerText();
  if (/bazar/i.test(titolo)) errori.push(`VETRINA: il titolo ripete il nome («${titolo}»)`);
  if (await p.getByText('SHOWROOM ARREDAMENTO', { exact: false }).count()) errori.push('VETRINA: torna la riga SHOWROOM ARREDAMENTO');
  // Il marchio della barra su una riga sola, allineato al silenziatore.
  const m = await p.locator('.step-top .marchio').boundingBox();
  const s = await p.getByRole('button', { name: /suoni/ }).boundingBox();
  if (m.height > 24) errori.push(`BARRA: il marchio va a capo (${m.height.toFixed(0)}px)`);
  if (Math.abs((m.y + m.height / 2) - (s.y + s.height / 2)) > 3) errori.push('BARRA: marchio e silenziatore non sono sulla stessa linea');
}
{
  // Il contatore a due cifre, e la barra che galleggia in fondo allo schermo.
  const conta = (await p.locator('.prodotto-conta').first().innerText()).replace(/\s+/g, ' ');
  if (!/^01 \/ 0\d$/.test(conta)) errori.push(`VETRINA: il contatore dice «${conta}», non «01 / 0N»`);
  const d = await p.locator('.dock').boundingBox();
  if (!d || d.y + d.height > 844 || d.y < 844 - 120) errori.push(`VETRINA: la barra non galleggia in fondo allo schermo (${d && d.y})`);
  await p.mouse.wheel(0, 600);
  await p.waitForTimeout(300);
  const d2 = await p.locator('.dock').boundingBox();
  if (!d2 || Math.abs(d2.y - d.y) > 2) errori.push('VETRINA: scorrendo la pagina la barra si muove');
  await p.mouse.wheel(0, -600);
  await p.waitForTimeout(300);
}
{
  // Scorrere il binario cambia l'articolo in centro.
  const prima = await p.locator('.riquadro').first().locator('.prodotto-nome').innerText();
  await p.locator('.binario').first().evaluate((b) => b.scrollTo({ left: b.children[1].offsetLeft - (b.clientWidth - b.children[1].offsetWidth) / 2 }));
  await p.waitForTimeout(500);
  const dopo = await p.locator('.riquadro').first().locator('.prodotto-nome').innerText();
  if (prima === dopo) errori.push('VETRINA: scorrendo, il nome in centro non cambia');
  await scatto('0v-scorsa');
  await p.locator('.binario').first().evaluate((b) => b.scrollTo({ left: 0 }));
  await p.waitForTimeout(400);
}
// La scheda: si apre dal «Scopri», ha le foto, si scorre, il cuore
// funziona, si chiude.
await p.locator('.riquadro').first().getByRole('button', { name: /Scopri/ }).click();
await p.waitForSelector('.scheda', { timeout: 3000 });
await p.waitForTimeout(600);
{
  const foto = await p.locator('.galleria-foto').count();
  if (foto < 2) errori.push(`SCHEDA: ${foto} foto, ne servono almeno due per scorrere`);
  await scatto('0v-scheda');
  await p.locator('.galleria').evaluate((g) => g.scrollTo({ left: g.clientWidth }));
  await p.waitForTimeout(600);
  const conta = await p.locator('.galleria-conta').innerText();
  if (!conta.startsWith('02 /')) errori.push(`SCHEDA: dopo lo scorrimento il contatore dice «${conta}»`);
  const rotte = await p.locator('.galleria-foto img').evaluateAll((im) => im.filter((i) => i.complete && !i.naturalWidth).length);
  if (rotte) errori.push(`SCHEDA: ${rotte} foto non si caricano`);
  await scatto('0v-scheda-2');
  await p.locator('.cuore').click();
  if ((await p.locator('.cuore').getAttribute('aria-pressed')) !== 'true') errori.push('SCHEDA: il cuore non resta acceso');
  await p.locator('.scheda-chiudi').click();
  await p.waitForSelector('.scheda', { state: 'detached', timeout: 2000 }).catch(() => errori.push('SCHEDA: non si chiude'));
  if (!(await p.locator('.carta3d-cuore').count())) errori.push('VETRINA: il preferito non compare sulla copertina');
}
{
  const rotte = await p.locator('.carta3d img').evaluateAll((im) => im.filter((i) => i.complete && !i.naturalWidth).length);
  if (rotte) errori.push(`VETRINA: ${rotte} copertine non si caricano`);
}
await p.locator('.dock').getByRole('button', { name: /Il tuo stile/ }).click();

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
let sotto = null;
await scatto('4-ruota-gira');
await p.waitForSelector('svg[aria-label^="Ruota ferma"]', { timeout: 9000 });
  // Sotto la lancetta c'è proprio quella cifra: si legge l'angolo a cui la
  // ruota si è fermata e si guarda quale spicchio ci sta sotto.
  sotto = await p.evaluate((spicchi) => {
    const g = document.querySelector('svg[aria-label*="Ruota"] g[style*="rotate"]');
    if (!g) return null;
    const deg = parseFloat(g.style.transform.match(/rotate\((-?[\d.]+)deg\)/)[1]);
    const passo = 360 / spicchi.length;
    return spicchi[Math.round(((((-deg) % 360) + 360) % 360) / passo) % spicchi.length];
  }, SPICCHI).catch(() => null);
await scatto('4-ruota-ferma');
await p.waitForSelector('.premio-cifra', { timeout: 9000 });
await p.waitForTimeout(1800);

// 5 — il credito
let credito;
{
  credito = Number((await p.locator('.premio-cifra').innerText()).replace(/\D/g, ''));
  if (!VINCIBILI.includes(credito)) errori.push(`CREDITO: ${credito}€ non è fra quelli che si vincono`);
  if (sotto !== credito) errori.push(`RUOTA: si ferma sul ${sotto}€ ma il credito è ${credito}€`);
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
  const pref = await p.locator('.tessera-lista').innerText().catch(() => '');
  if (!pref.includes('Capitonné Tortora')) errori.push(`FINE: i preferiti non arrivano sulla tessera («${pref}»)`);
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
