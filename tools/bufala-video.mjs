// Prepara un video per lo scroll-scrubbing.
//
// Un video normale è codificato per essere *riprodotto*: pochi fotogrammi
// chiave, e tutti gli altri ricostruiti a partire da quelli. Va benissimo
// per la riproduzione lineare, ed è il caso peggiore per lo scrub — saltare
// a un istante qualsiasi obbliga il decoder a ripartire dal fotogramma
// chiave precedente, e lo scorrimento singhiozza.
//
// Qui si ricodifica con un fotogramma chiave ogni fotogramma: il file pesa
// di più, ma qualunque istante costa uguale e lo scrub diventa fluido.
// Si produce anche un poster, perché senza il primo fotogramma resta nero
// finché il video non è pronto.
//
// Uso:  node tools/bufala-video.mjs <sorgente.mp4> <nome>
// Esempio: node tools/bufala-video.mjs ~/Downloads/taglio.mp4 taglio

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;

const [sorgente, nome] = process.argv.slice(2);
if (!sorgente || !nome) {
  console.error('Uso: node tools/bufala-video.mjs <sorgente.mp4> <nome>');
  process.exit(1);
}
if (!existsSync(sorgente)) {
  console.error(`Sorgente non trovata: ${sorgente}`);
  process.exit(1);
}

const OUT = 'public/assets/bufala';
mkdirSync(OUT, { recursive: true });

const kb = (f) => Math.round(statSync(f).size / 1024);

// — Il video, ricodificato per lo scrub —
// `-g 1` = un fotogramma chiave ogni fotogramma. `-crf 26` tiene il peso
// sotto controllo: la perdita non si vede su un fondo scuro come questo,
// e il file deve restare scaricabile su rete mobile.
// `-movflags +faststart` mette l'indice in testa, così il browser può
// cominciare a cercare senza aver scaricato tutto.
const mp4 = `${OUT}/${nome}.mp4`;
execFileSync(ffmpeg, [
  '-y', '-i', sorgente,
  '-an',                       // nessun audio: il video non si sente mai
  '-vf', 'scale=1280:-2',
  '-c:v', 'libx264',
  '-profile:v', 'high',
  '-pix_fmt', 'yuv420p',
  '-crf', '26',
  '-g', '1',
  '-keyint_min', '1',
  '-sc_threshold', '0',
  '-movflags', '+faststart',
  mp4,
], { stdio: ['ignore', 'ignore', 'inherit'] });

// — Il poster: primo fotogramma, per non mostrare nero durante il caricamento —
const poster = `${OUT}/${nome}-poster.webp`;
execFileSync(ffmpeg, [
  '-y', '-i', sorgente,
  '-frames:v', '1',
  '-vf', 'scale=1280:-2',
  '-quality', '84',
  poster,
], { stdio: ['ignore', 'ignore', 'inherit'] });

console.log(`${nome}.mp4         ${kb(mp4)} KB  (ogni fotogramma è chiave: scrub fluido)`);
console.log(`${nome}-poster.webp ${kb(poster)} KB`);
console.log('\nOra dichiaralo in content/bufala/assets.ts e puntaci la scena in direction.ts.');
