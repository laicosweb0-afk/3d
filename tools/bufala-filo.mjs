// Toglie il filo di sospensione dal filmato della mozzarella.
//
// Il modello ha reso alla lettera l'"invisible thread" del prompt: dalla
// corona sale una linea sottile fino al bordo alto, e sospesa a un filo la
// mozzarella non levita più, pende. È l'unico difetto di una ripresa per il
// resto giusta, e rigenerarla per questo costerebbe crediti e tempo.
//
// Perché non `delogo`: interpola dai bordi del riquadro, e il riquadro che
// copre il filo tocca per forza la corona bianca del soggetto — il risultato
// è una banda chiara spalmata verso il basso, peggiore del filo. Provato e
// scartato.
//
// Qui invece la fascia del filo viene riempita interpolando fra le due
// colonne di fondo che la delimitano: lo sfondo è un gradiente verde liscio,
// e su venti pixel l'interpolazione è indistinguibile dall'originale. È lo
// stesso principio di delogo, ma applicato solo dove è lecito applicarlo.
//
// Il punto delicato è capire dove fermarsi. Un primo tentativo cercava la
// prima riga "chiara" per riconoscere il soggetto: non funziona, perché il
// filo stesso è più chiaro del fondo, quindi il rilevamento si fermava
// subito e non correggeva niente. Il soggetto non si riconosce dalla
// luminosità ma dalla LARGHEZZA: il filo occupa pochi pixel della fascia,
// la mozzarella (o la lama, o la mano) la riempie. Appena la parte chiara
// supera metà della fascia, da lì in giù non si tocca più niente.
//
// Uso: node tools/bufala-filo.mjs <sorgente> <destinazione.mp4>

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;
const sharp = require('sharp');

const [sorgente, destinazione] = process.argv.slice(2);
if (!sorgente || !destinazione) {
  console.error('Uso: node tools/bufala-filo.mjs <sorgente> <destinazione.mp4>');
  process.exit(1);
}

/** La colonna occupata dal filo, misurata sui fotogrammi: sta al centro
 *  esatto, x fra 0,484 e 0,505 della larghezza. Si riscrive una fascia un po'
 *  più larga per prendere anche la sfocatura ai bordi. */
const FILO = { da: 0.482, a: 0.508 };
/** Di quanto un pixel deve staccarsi dal fondo interpolato per non essere
 *  fondo. Si guarda lo scostamento in valore assoluto, non la luminosità:
 *  un secondo tentativo cercava solo i pixel *chiari* e ha cancellato la
 *  lama, che è scura su fondo scuro. Un oggetto è tutto ciò che non
 *  assomiglia al gradiente, in qualunque direzione. */
const SCOSTAMENTO = 26;
/** Quota di fascia occupata oltre la quale si è arrivati a un oggetto e non
 *  si prosegue. Il filo ne occupa meno di un quinto, la lama circa metà. */
const QUOTA_OGGETTO = 0.3;
/** Quanti pixel di margine lasciare prima dell'oggetto. */
const MARGINE = 8;
/** Ultimo istante corretto. Il filo si vede fra 1,6 s e 5 s; dopo, lungo lo
 *  stesso asse verticale, scendono lama e mano. Fermarsi prima che entrino
 *  è più sicuro di qualunque euristica: non c'è nessun fotogramma in cui
 *  serva togliere il filo e ci sia anche il coltello. */
const FINE_S = 4.5;
const FOTOGRAMMI_AL_SECONDO = 24;

const dir = mkdtempSync(join(tmpdir(), 'filo-'));
console.log('estraggo i fotogrammi…');
execFileSync(ffmpeg, ['-v', 'error', '-i', sorgente, join(dir, 'f%05d.png')]);
const file = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
console.log(`${file.length} fotogrammi`);

let toccati = 0;
let righeTotali = 0;

const ultimoFotogramma = Math.round(FINE_S * FOTOGRAMMI_AL_SECONDO);

for (const [indice, nome] of file.entries()) {
  if (indice > ultimoFotogramma) continue;
  const percorso = join(dir, nome);
  const img = sharp(percorso);
  const { width, height } = await img.metadata();
  const dati = await img.raw().toBuffer();
  const canali = dati.length / (width * height);

  const x0 = Math.round(width * FILO.da);
  const x1 = Math.round(width * FILO.a);
  const larghezza = x1 - x0 + 1;
  // Le due colonne di fondo appena fuori dalla fascia: sono i capisaldi
  // dell'interpolazione.
  const sinistra = x0 - 2;
  const destra = x1 + 2;

  // Fin dove scendere: la prima riga in cui una parte consistente della
  // fascia si stacca dal gradiente di fondo, cioè in cui è arrivato un
  // oggetto. Da lì in giù non si tocca niente.
  let limite = height;
  for (let y = 0; y < height; y++) {
    const a = (y * width + sinistra) * canali;
    const b = (y * width + destra) * canali;
    let diversi = 0;
    for (let x = x0; x <= x1; x++) {
      const k = (x - sinistra) / (destra - sinistra);
      const i = (y * width + x) * canali;
      let scarto = 0;
      for (let c = 0; c < 3; c++) {
        scarto = Math.max(scarto, Math.abs(dati[i + c] - (dati[a + c] * (1 - k) + dati[b + c] * k)));
      }
      if (scarto > SCOSTAMENTO) diversi++;
    }
    if (diversi > larghezza * QUOTA_OGGETTO) { limite = Math.max(0, y - MARGINE); break; }
  }

  if (limite > 0) {
    toccati++;
    righeTotali += limite;
    for (let y = 0; y < limite; y++) {
      const a = (y * width + sinistra) * canali;
      const b = (y * width + destra) * canali;
      for (let x = x0; x <= x1; x++) {
        const k = (x - sinistra) / (destra - sinistra);
        const dst = (y * width + x) * canali;
        for (let c = 0; c < canali; c++) {
          dati[dst + c] = Math.round(dati[a + c] * (1 - k) + dati[b + c] * k);
        }
      }
    }
    await sharp(dati, { raw: { width, height, channels: canali } })
      .png()
      .toFile(percorso + '.tmp.png');
    execFileSync('mv', [percorso + '.tmp.png', percorso]);
  }
}

console.log(`fotogrammi corretti: ${toccati}/${file.length}, righe medie riscritte: ${(righeTotali / Math.max(toccati, 1)).toFixed(0)}`);

console.log('ricompongo…');
execFileSync(ffmpeg, [
  '-y', '-v', 'error',
  '-framerate', '24',
  '-i', join(dir, 'f%05d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
  '-pix_fmt', 'yuv420p',
  destinazione,
]);
rmSync(dir, { recursive: true, force: true });
console.log('fatto:', destinazione);
