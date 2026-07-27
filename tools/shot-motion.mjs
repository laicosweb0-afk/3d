// IL VIDEO DELLA TRAIETTORIA.
//
// Renderizza dal 3D il movimento di camera di un ciak e lo impacchetta in un
// mp4. Quel file si passa a Seedance come `video_references`: il modello non
// riceve solo dove la clip comincia e dove finisce, ma **come la camera ci
// arriva** — la carrellata, la discesa, il ritmo.
//
// È la ragione per cui il 3D ripaga: le movenze non si descrivono a parole,
// si trasferiscono.
//
// Uso:  node tools/shot-motion.mjs s03            (richiede il sito su :3000)
//       FPS=12 node tools/shot-motion.mjs s03
//
// Esce in previz/traiettorie/<scena>.mp4, fuori da public/: è materiale di
// lavorazione, non un asset che il sito spedisce.

import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const scena = process.argv[2];
if (!scena || !/^s\d{2}$/.test(scena)) {
  console.error('uso: node tools/shot-motion.mjs <scena>   es. s03');
  process.exit(1);
}

const ORIGIN = process.env.ORIGIN ?? 'http://127.0.0.1:3000';
const W = parseInt(process.env.WIDTH ?? '1280', 10);
const H = parseInt(process.env.HEIGHT ?? '720', 10);
// 12 fps bastano: al modello serve la traiettoria, non la fluidità. Raddoppiare
// i fotogrammi raddoppia il tempo di resa senza dire nulla di più sul movimento.
const FPS = parseInt(process.env.FPS ?? '12', 10);
const SECONDI_PER_VH = parseFloat(process.env.SECONDI_PER_VH ?? '2.5');

// La tabella delle scene si legge da lib/scenes.ts, mai ricopiata: una seconda
// copia diverge in silenzio e la traiettoria esce dal tratto sbagliato.
const scene = [...readFileSync(new URL('../lib/scenes.ts', import.meta.url), 'utf8')
  .matchAll(/\{\s*id:\s*'(s\d+)',\s*vh:\s*([\d.]+)/g)]
  .map(([, id, vh]) => ({ id, vh: parseFloat(vh) }));

if (scene.length !== 12) {
  throw new Error(`lette ${scene.length} scene da lib/scenes.ts, ne servono 12`);
}

const TOTALE_VH = scene.reduce((s, x) => s + x.vh, 0);
const i = scene.findIndex((s) => s.id === scena);
if (i < 0) throw new Error(`scena sconosciuta: ${scena}`);

const prima = scene.slice(0, i).reduce((s, x) => s + x.vh, 0);
const p0 = prima / TOTALE_VH;
const p1 = (prima + scene[i].vh) / TOTALE_VH;
const durata = Math.min(15, Math.round(scene[i].vh * SECONDI_PER_VH * 10) / 10);
const nFrame = Math.round(durata * FPS);

const TMP = new URL('../previz/.frames/', import.meta.url).pathname;
const OUT = new URL('../previz/traiettorie/', import.meta.url).pathname;
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

console.log(`${scena}: p ${p0.toFixed(4)} → ${p1.toFixed(4)}, ${durata}s, ${nFrame} fotogrammi a ${FPS}fps`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errori = [];
page.on('pageerror', (e) => errori.push(String(e)));

// Si carica UNA volta sola e poi si sposta il progresso via __setP. Ricaricare
// a ogni fotogramma costerebbe minuti per pochi secondi di riferimento.
await page.goto(`${ORIGIN}/?p=${p0.toFixed(6)}&still=1&ui=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof window.__setP === 'function', null, { timeout: 30000 });
await page.waitForTimeout(3500); // ombre ed environment si assestano una volta

for (let f = 0; f < nFrame; f++) {
  const t = nFrame === 1 ? 0 : f / (nFrame - 1);
  const p = p0 + (p1 - p0) * t;
  await page.evaluate((v) => window.__setP(v), p);
  // due giri di rAF: il primo applica il progresso, il secondo disegna
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  await page.screenshot({
    path: `${TMP}${String(f).padStart(4, '0')}.jpg`,
    type: 'jpeg',
    quality: 88,
  });
  if (f % 12 === 0) process.stdout.write(`  ${f}/${nFrame}\r`);
}

await browser.close();
console.log(`  ${nFrame}/${nFrame} renderizzati        `);

execFileSync(ffmpeg, [
  '-y', '-framerate', String(FPS),
  '-i', `${TMP}%04d.jpg`,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  '-crf', '20', '-preset', 'medium',
  `${OUT}${scena}.mp4`,
], { stdio: ['ignore', 'ignore', 'pipe'] });

rmSync(TMP, { recursive: true, force: true });
console.log(`previz/traiettorie/${scena}.mp4  ${W}x${H} ${durata}s`);
console.log('ERRORI DI PAGINA:', errori.length ? errori.join('\n') : 'nessuno');
