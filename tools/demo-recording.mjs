// LA REGISTRAZIONE DEMO.
//
// Registra il sito in funzione come farebbe uno screen-recorder: lo scroll
// avanza a velocità realistica (il ritmo di progetto: SECONDI_PER_VH) e ogni
// fotogramma viene catturato e montato in un mp4. Serve al committente per
// giudicare tempi e ritmo senza dover aprire il sito.
//
// Il progresso è pilotato via __setP fotogramma per fotogramma: la resa è
// deterministica — niente dipendenza dalla velocità della macchina — e il
// ritmo del file corrisponde esattamente a quello di progetto.
//
// Uso:  node tools/demo-recording.mjs            (sito servito su :3000)
//       FPS=24 SECONDI_PER_VH=2.5 node tools/demo-recording.mjs
//
// Esce in previz/demo.mp4.

import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const ORIGIN = process.env.ORIGIN ?? 'http://127.0.0.1:3000';
const W = parseInt(process.env.WIDTH ?? '1280', 10);
const H = parseInt(process.env.HEIGHT ?? '720', 10);
const FPS = parseInt(process.env.FPS ?? '24', 10);
const SECONDI_PER_VH = parseFloat(process.env.SECONDI_PER_VH ?? '2.5');

// La durata viene dalla tabella delle scene, mai ricopiata a mano.
const scene = [...readFileSync(new URL('../lib/scenes.ts', import.meta.url), 'utf8')
  .matchAll(/\{\s*id:\s*'(s\d+)',\s*vh:\s*([\d.]+)/g)];
const TOTALE_VH = scene.reduce((s, [, , vh]) => s + parseFloat(vh), 0);
const durata = TOTALE_VH * SECONDI_PER_VH;
const nFrame = Math.round(durata * FPS);

const TMP = new URL('../previz/.demo-frames/', import.meta.url).pathname;
const OUT = new URL('../previz/demo.mp4', import.meta.url).pathname;
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

console.log(`demo: ${TOTALE_VH}vh × ${SECONDI_PER_VH}s = ${durata}s, ${nFrame} fotogrammi a ${FPS}fps`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
// still=1 per l'aggancio __setP; l'interfaccia resta visibile: la demo deve
// mostrare il sito vero, coi testi e la timeline, non la scena nuda.
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errori = [];
page.on('pageerror', (e) => errori.push(String(e)));

await page.goto(`${ORIGIN}/?p=0&still=1`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof window.__setP === 'function', null, { timeout: 30000 });
await page.waitForTimeout(3500);

// Piccola rampa dolce ai due estremi: un utente non parte mai a velocità
// piena né si ferma di colpo. In mezzo, velocità costante di progetto.
const RAMPA = 0.04; // quota del viaggio usata per accelerare/frenare
function pDi(t) { // t 0..1 tempo → p 0..1 progresso
  const a = RAMPA;
  const areaMax = 1 - a; // integrale della velocità normalizzata
  let s;
  if (t < a) s = (t * t) / (2 * a);
  else if (t < 1 - a) s = t - a / 2;
  else { const u = 1 - t; s = areaMax - (u * u) / (2 * a); }
  return Math.min(1, Math.max(0, s / areaMax));
}

for (let f = 0; f < nFrame; f++) {
  const p = pDi(nFrame === 1 ? 0 : f / (nFrame - 1));
  await page.evaluate((v) => window.__setP(v), p);
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  await page.screenshot({ path: `${TMP}${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 85 });
  if (f % FPS === 0) process.stdout.write(`  ${Math.round((f / nFrame) * 100)}%\r`);
}

await browser.close();
console.log('  100%        ');

execFileSync(ffmpeg, [
  '-y', '-framerate', String(FPS),
  '-i', `${TMP}%05d.jpg`,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  '-crf', '21', '-preset', 'medium', '-movflags', '+faststart',
  OUT,
], { stdio: ['ignore', 'ignore', 'pipe'] });

rmSync(TMP, { recursive: true, force: true });
console.log(`previz/demo.mp4  ${W}x${H} ${durata}s @${FPS}fps`);
console.log('ERRORI DI PAGINA:', errori.length ? errori.join('\n') : 'nessuno');
