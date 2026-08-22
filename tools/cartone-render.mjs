// Rende il cartone MediaPro in un file video, fotogramma per fotogramma.
//
// Non è una registrazione dello schermo: la pagina non viene *riprodotta*.
// Per ogni fotogramma si posiziona il tempo con `window.__cartone.seek(t)`,
// si aspetta che il disegno sia finito e si fotografa. Il risultato è
// esattamente a 30 fotogrammi al secondo anche se la macchina che rende ne
// fa tre al secondo — e resta identico da una macchina all'altra, che è la
// ragione per cui in tutta la scena non c'è una sola animazione che si
// accumuli nel tempo.
//
// I fotogrammi non toccano mai il disco: vanno direttamente nello standard
// input di ffmpeg. Novecento PNG a 1080×1920 sarebbero un paio di gigabyte
// di file temporanei per un video da pochi mega.
//
// Uso:
//   node tools/cartone-render.mjs                 video completo (mp4 + webm + poster)
//   node tools/cartone-render.mjs --provini       nove fotogrammi chiave in public/…/provini
//   node tools/cartone-render.mjs --da 16 --a 20  solo un tratto, per rivedere una battuta
//   node tools/cartone-render.mjs --scala 0.5     mezza risoluzione, per una prova rapida

import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;

// — Argomenti —
const arg = (nome, pre) => {
  const i = process.argv.indexOf(nome);
  return i > 0 ? process.argv[i + 1] : pre;
};
const PROVINI = process.argv.includes('--provini');
const SCALA = Number(arg('--scala', '1'));
const DA = Number(arg('--da', '0'));
const FPS = Number(arg('--fps', '30'));
const LARG = Math.round(1080 * SCALA);
const ALT = Math.round(1920 * SCALA);
const OUT = 'public/assets/cartone';
const RADICE = 'out';

if (!existsSync(RADICE)) {
  console.error(`Manca la cartella "${RADICE}". Prima: npm run build`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// — Un server statico minimo per la cartella esportata —
const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
};
const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join(RADICE, url);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end('no');
    return;
  }
  res.writeHead(200, { 'content-type': TIPI[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(0, ok));
const porta = server.address().port;

// — Il browser —
// SwiftShader: qui non c'è una scheda grafica, e la resa via software è
// identica — solo più lenta. È anche il motivo per cui è ripetibile.
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--disable-lcd-text',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
  ],
});
const pagina = await browser.newPage({ viewport: { width: LARG, height: ALT }, deviceScaleFactor: 1 });
await pagina.goto(`http://127.0.0.1:${porta}/cartone/?render=1`, { waitUntil: 'networkidle' });
await pagina.waitForFunction(() => window.__cartone?.pronto === true, null, { timeout: 30000 });
// I font devono essere caricati prima del primo fotogramma, altrimenti il
// testo cambia forma a metà video.
await pagina.evaluate(() => document.fonts.ready);

const durata = await pagina.evaluate(() => window.__cartone.durata);
const A = Number(arg('--a', String(durata)));

/** Posiziona il tempo e aspetta che il fotogramma sia davvero disegnato. */
async function vaiA(t) {
  await pagina.evaluate(
    (s) =>
      new Promise((ok) => {
        window.__cartone.seek(s);
        // Due giri bastano: `seek` chiede esplicitamente il disegno della
        // scena, e il secondo giro serve solo perché lo strato dei testi —
        // che vive nel DOM e si aggiorna da solo a ogni fotogramma — abbia
        // letto il nuovo tempo prima dello scatto.
        requestAnimationFrame(() => requestAnimationFrame(ok));
      }),
    t,
  );
}

const kb = (f) => Math.round(statSync(f).size / 1024);

if (PROVINI) {
  // Nove fotogrammi, uno per battuta: servono a discutere il corto senza
  // aspettare un rendering intero.
  const { BATTUTE } = await pagina.evaluate(() => ({ BATTUTE: null })).then(() => import('../content/cartone/scaletta.ts')).catch(() => ({ BATTUTE: null }));
  const istanti = BATTUTE
    ? BATTUTE.map((b) => [b.id, b.da + (b.a - b.da) * 0.62])
    : [
        ['buio', 1.8], ['indifferenza', 4.6], ['arrivo', 8.6], ['strategia', 11.2],
        ['marchio', 15.0], ['contenuti', 18.4], ['campagne', 22.4], ['attenzione', 25.6], ['firma', 29.0],
      ];
  const dir = join(OUT, 'provini');
  mkdirSync(dir, { recursive: true });
  for (const [id, t] of istanti) {
    await vaiA(t);
    const f = join(dir, `${String(t).padStart(5, '0')}-${id}.png`);
    writeFileSync(f, await pagina.screenshot({ type: 'png' }));
    console.log(`${f}  (t=${t}s)`);
  }
  await browser.close();
  server.close();
  process.exit(0);
}

// — Il video —
const totale = Math.round((A - DA) * FPS);
const mp4 = join(OUT, 'mediapro-30.mp4');

const enc = spawn(
  ffmpeg,
  [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(FPS),
    '-i', '-',
    '-an',
    '-c:v', 'libx264',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    // crf 18: è il master. Instagram e TikTok ricomprimono comunque, e
    // partire già compressi significa consegnare loro i propri artefatti.
    '-crf', '18',
    '-preset', 'slow',
    '-movflags', '+faststart',
    mp4,
  ],
  { stdio: ['pipe', 'ignore', 'inherit'] },
);

const scrivi = (buf) =>
  new Promise((ok, ko) => {
    if (enc.stdin.write(buf)) ok();
    else enc.stdin.once('drain', ok);
    enc.stdin.once('error', ko);
  });

const inizio = Date.now();
for (let i = 0; i < totale; i += 1) {
  const t = DA + i / FPS;
  await vaiA(t);
  await scrivi(await pagina.screenshot({ type: 'png' }));
  if (i % 30 === 0 || i === totale - 1) {
    const passati = (Date.now() - inizio) / 1000;
    const stima = i > 0 ? (passati / i) * (totale - i) : 0;
    process.stdout.write(
      `\r  ${String(i + 1).padStart(4)} / ${totale} fotogrammi  ·  ${(passati / Math.max(i, 1)).toFixed(2)} s/fotogramma  ·  mancano ~${Math.round(stima / 60)} min   `,
    );
  }
}
process.stdout.write('\n');

enc.stdin.end();
await new Promise((ok, ko) => enc.on('close', (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg ${c}`)))));
await browser.close();
server.close();

// — Il ripiego WebM e il poster —
const webm = join(OUT, 'mediapro-30.webm');
execFileSync(ffmpeg, [
  '-y', '-i', mp4, '-an',
  '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0',
  '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1',
  webm,
], { stdio: ['ignore', 'ignore', 'inherit'] });

const poster = join(OUT, 'mediapro-30-poster.webp');
execFileSync(ffmpeg, ['-y', '-i', mp4, '-frames:v', '1', '-quality', '86', poster], {
  stdio: ['ignore', 'ignore', 'inherit'],
});

console.log(`\nmediapro-30.mp4          ${kb(mp4)} KB  (master, ${LARG}×${ALT} @${FPS})`);
console.log(`mediapro-30.webm         ${kb(webm)} KB`);
console.log(`mediapro-30-poster.webp  ${kb(poster)} KB`);
