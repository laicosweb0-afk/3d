// Prepara un video generato per lo SCRUBBING dallo scroll.
//
// Il punto: un mp4 normale ha pochi keyframe, quindi saltare a un istante
// preciso costa e lo scroll "scatta". Ricodificando con TUTTI i frame come
// keyframe, ogni istante è raggiungibile subito e lo scrub diventa fluido.
// Produce .webm (Chromium/Firefox) e .mp4 (Safari), come si aspetta il sito.
//
// Uso:  node tools/prep-video.mjs <input> <nome-uscita>
// Es.:  node tools/prep-video.mjs ~/sog.mp4 soggiorno-costruzione

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const [input, name] = process.argv.slice(2);
if (!input || !name) {
  console.error('Uso: node tools/prep-video.mjs <input> <nome-uscita>');
  process.exit(1);
}
if (!existsSync(input)) {
  console.error('File non trovato:', input);
  process.exit(1);
}

const outDir = path.resolve('public/assets/video');
mkdirSync(outDir, { recursive: true });
const webm = path.join(outDir, `${name}.webm`);
const mp4 = path.join(outDir, `${name}.mp4`);

const run = (args) =>
  execFileSync(ffmpeg.path, args, { stdio: ['ignore', 'ignore', 'inherit'] });

// 15 fps: con lo scrubbing il ritmo lo detta lo scroll, non il video —
// dimezzare i fotogrammi dimezza il peso senza che si veda la differenza.
const FPS = '15';

// VP9: -g 1 => ogni frame è keyframe. Niente audio.
run(['-y', '-i', input, '-an', '-r', FPS, '-c:v', 'libvpx-vp9',
     '-b:v', '0', '-crf', '46', '-g', '1',
     '-deadline', 'good', '-cpu-used', '3', '-row-mt', '1', webm]);

// H.264: idem, keyframe ovunque, per Safari.
run(['-y', '-i', input, '-an', '-r', FPS, '-c:v', 'libx264', '-crf', '27',
     '-g', '1', '-keyint_min', '1', '-sc_threshold', '0',
     '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);

const kb = (f) => Math.round(statSync(f).size / 1024);
console.log(`ok  ${name}.webm ${kb(webm)}kb   ${name}.mp4 ${kb(mp4)}kb`);
