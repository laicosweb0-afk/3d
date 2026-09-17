// Passata di controllo su Club Rama: percorre i quattro passi su un telefono
// simulato e fotografa ogni schermata, ruota compresa a giro finito.
import { chromium } from 'playwright-core';
const out = process.argv[2];
const url = process.argv[3] || 'http://localhost:8933/';
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

await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/0-hey.png` });
await p.waitForTimeout(1800);
await p.screenshot({ path: `${out}/0b-benvenuto.png` });
await p.waitForSelector('.intro', { state: 'detached', timeout: 9000 });
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/1-ambiente.png` });

await p.getByRole('radio', { name: 'Bagno' }).click();
await p.waitForTimeout(350);
await p.screenshot({ path: `${out}/1b-scelto.png` });
await p.getByRole('button', { name: 'Continua' }).click();
await p.waitForTimeout(650);
await p.screenshot({ path: `${out}/2-stile.png` });
{
  const l = await p.evaluate(() => Math.round(document.querySelector('#root').getBoundingClientRect().width));
  if (l !== 390) errori.push(`COLONNA sullo stile: ${l}px invece di 390`);
}

await p.getByRole('radio', { name: 'Minimal e moderno' }).click();
await p.waitForTimeout(300);
await p.getByRole('button', { name: 'Continua' }).click();
await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/3-ruota.png` });

const audioPrima = await p.evaluate(() => ({ ...window.__audio }));
await p.getByRole('button', { name: 'Gira' }).click();
await p.waitForTimeout(2200);
await p.screenshot({ path: `${out}/3b-in-giro.png` });
await p.waitForTimeout(4400);           // fine giro e pausa sulla ruota ferma
await p.screenshot({ path: `${out}/3c-ruota-ferma.png` });
await p.waitForTimeout(2000);           // conteggio del credito e testi
await p.screenshot({ path: `${out}/4-rivelazione.png` });
{
  const l = await p.evaluate(() => Math.round(document.querySelector('#root').getBoundingClientRect().width));
  if (l !== 390) errori.push(`COLONNA sulla rivelazione: ${l}px invece di 390`);
}
const credito = (await p.locator('main .tabular').first().textContent())?.trim();

await p.getByRole('button', { name: 'Ritira il credito' }).click();
await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/5-dati.png` });

await p.fill('#nome', 'Giulia Bassi');
await p.fill('#email', 'giulia@esempio.it');
await p.fill('#telefono', '333 481 2290');
await p.getByRole('radio', { name: 'In negozio' }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/5b-compilato.png` });
await p.getByRole('button', { name: 'Ricevi il credito' }).click();
await p.waitForTimeout(1600);
await p.screenshot({ path: `${out}/6-fine.png` });

const audioDopo = await p.evaluate(() => ({ ...window.__audio }));
const tickProdotti = audioDopo.osc - audioPrima.osc;
const fruscioProdotto = audioDopo.buf - audioPrima.buf;
if (tickProdotti < 8) errori.push(`SUONO: solo ${tickProdotti} nodi durante il giro, gli scatti non suonano`);
if (fruscioProdotto < 1) errori.push('SUONO: nessun fruscio della ruota');
console.log('nodi audio durante il giro:', tickProdotti, 'oscillatori,', fruscioProdotto, 'sorgenti');

const silenziatore = await p.getByRole('button', { name: /suoni/i }).count();
if (silenziatore !== 1) errori.push(`SILENZIATORE: trovati ${silenziatore} comandi invece di 1`);

const largheColonna = await p.evaluate(() => Math.round(document.querySelector('#root').getBoundingClientRect().width));
if (largheColonna !== 390) errori.push(`COLONNA: larga ${largheColonna}px invece di 390`);

// Il modulo ha tre campi e tre segmenti: se cresce oltre la schermata, il
// bottone finisce sotto la piega e nessuno lo trova.
const scorreIlModulo = await p.evaluate(() => {
  const m = document.querySelector('main');
  return m ? m.scrollHeight - m.clientHeight : 0;
});
if (scorreIlModulo > 0) errori.push(`MODULO: sborda di ${scorreIlModulo}px in altezza`);

const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('credito rivelato:', credito);
console.log('overflow orizzontale (px):', overflow);
console.log(errori.length ? `PROBLEMI:\n- ${errori.join('\n- ')}` : 'nessun errore in console');
await b.close();
process.exit(errori.length ? 1 : 0);
