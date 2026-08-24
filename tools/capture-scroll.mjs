// Cattura lo scroll di un sito servito in locale e ne fa un mp4 pronto per il
// portfolio (`public/portfolio/`): le due schede dei siti immersivi devono FAR
// VEDERE il movimento, non soltanto linkarlo.
//
//   node tools/capture-scroll.mjs <url> <out.mp4> [opzioni]
//
//   --mode live|frames   live  = registrazione in tempo reale (siti leggeri)
//                        frames= un fotogramma alla volta, il tempo che serve
//                                (siti 3D: qui il software rendering fa 2 fps,
//                                 in tempo reale uscirebbe una diapositiva)
//   --seconds N          durata del movimento (default 12)
//   --fps N              fotogrammi al secondo del file finale (default 30)
//   --share N            quanta parte della pagina attraversare, 0-1 (default 1)
//   --width/--height     viewport di ripresa (default 1280x720)
//
// La modalità `frames` funziona perché il viaggio 3D è funzione pura del
// progresso di scroll: fermato lo scroll a una quota, il fotogramma è sempre
// lo stesso. Si scorre a passi regolari, si aspetta che il frame sia davvero
// disegnato e si scatta — il risultato è fluido anche se la macchina non lo è.

import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import ffmpeg from 'ffmpeg-static';

const argv = process.argv.slice(2);
const [url, outFile] = argv.filter((a) => !a.startsWith('--'));
const flag = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? def : argv[i + 1];
};
if (!url || !outFile) {
  console.error('uso: node tools/capture-scroll.mjs <url> <out.mp4> [--mode live|frames] [--seconds N] [--fps N] [--share N]');
  process.exit(1);
}

const MODE = flag('mode', 'live');
const SECONDS = Number(flag('seconds', 12));
const FPS = Number(flag('fps', 30));
const SHARE = Number(flag('share', 1));
const W = Number(flag('width', 1280));
const H = Number(flag('height', 720));
const CRF = Number(flag('crf', 26));
const OUT_W = Number(flag('outWidth', W));

const SETTLE = 7000;       // font, texture e primo frame 3D
const HOLD_START = 0.8;    // secondi di quiete prima di partire
const HOLD_END = 1.4;      // e dopo l'arrivo
const WHEEL_MULTIPLIER = 0.78;  // taratura Lenis: un delta percorre meno strada

const tmp = join(dirname(outFile), '.cap-tmp');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Partenza e arrivo morbidi: un viaggio che parte di scatto sembra un bug. */
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const pad = (n) => String(n).padStart(5, '0');

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--hide-scrollbars', '--force-device-scale-factor=1'],
});
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: MODE === 'live' ? { dir: tmp, size: { width: W, height: H } } : undefined,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(SETTLE);
const distance = await page.evaluate(
  (s) => (document.documentElement.scrollHeight - window.innerHeight) * s, SHARE);

let source;   // che cosa passeremo a ffmpeg

if (MODE === 'live') {
  await page.mouse.move(W / 2, H / 2);
  await sleep(HOLD_START * 1000);
  // Un solo orologio: il programma è funzione del tempo reale trascorso, così
  // il video dura quello che deve anche se un impulso costa più del previsto.
  const t0 = Date.now();
  let sent = 0;
  for (;;) {
    const t = (Date.now() - t0) / (SECONDS * 1000);
    if (t >= 1) break;
    const want = ease(t) * distance;
    if (want > sent) { await page.mouse.wheel(0, (want - sent) / WHEEL_MULTIPLIER); sent = want; }
    await sleep(25);
  }
  await page.mouse.wheel(0, (distance - sent) / WHEEL_MULTIPLIER + 200);
  await sleep(HOLD_END * 1000);
} else {
  const frames = Math.round(SECONDS * FPS);
  const before = Math.round(HOLD_START * FPS), after = Math.round(HOLD_END * FPS);
  let n = 0;
  for (let i = 0; i <= frames; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(ease(i / frames) * distance));
    // Tre giri di rendering: il tempo perché lo smorzamento della camera
    // raggiunga la nuova quota e il frame sia davvero disegnato.
    await page.evaluate(() => new Promise((r) => {
      let k = 3;
      const tick = () => (--k ? requestAnimationFrame(tick) : r());
      requestAnimationFrame(tick);
    }));
    const shot = await page.screenshot({ type: 'jpeg', quality: 92 });
    const copies = (i === 0 ? before : 0) + 1 + (i === frames ? after : 0);
    for (let c = 0; c < copies; c++) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(join(tmp, `f${pad(n++)}.jpg`), shot);
    }
    if (i % 30 === 0) process.stdout.write(`  ${i}/${frames}\r`);
  }
  console.log(`  ${frames}/${frames} fotogrammi`);
}

const y = await page.evaluate(() => Math.round(window.scrollY));
console.log(`scroll ${y}/${Math.round(distance)} — errori pagina: ${errors.length || 'nessuno'}`);
if (errors.length) console.log(errors.slice(0, 3).join('\n'));

await context.close();
await browser.close();

// H.264 yuv420p + faststart: l'unico formato che parte davvero ovunque,
// iPhone in-app browser compreso (mai HEVC).
const common = ['-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-crf', String(CRF), '-preset', 'slow', '-movflags', '+faststart',
  '-vf', `scale=${OUT_W}:-2:flags=lanczos`, '-r', String(FPS), '-y', outFile];

if (MODE === 'live') {
  const rec = readdirSync(tmp).find((f) => f.endsWith('.webm'));
  if (!rec) { console.error('nessun video registrato'); process.exit(1); }
  // Si taglia l'attesa iniziale: il caricamento non è parte del racconto.
  source = ['-ss', String(SETTLE / 1000), '-t', String(SECONDS + HOLD_START + HOLD_END),
            '-i', join(tmp, rec)];
} else {
  source = ['-framerate', String(FPS), '-i', join(tmp, 'f%05d.jpg')];
}

const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...source, ...common],
                    { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('scritto ' + outFile);
