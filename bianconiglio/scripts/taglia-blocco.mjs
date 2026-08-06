// (Vive in scripts/ per i prossimi blocchi: serve `npm i ffmpeg-static` nella cartella da cui lo lanci.)
// Taglia un blocco recitato nelle sue battute, usando le pause fra le frasi.
// Uso: node taglia.mjs <blocco.mp3> <id1,id2,id3,...>
//
// Il criterio: con N battute servono N-1 confini, e i confini sono le N-1
// pause PIÙ LUNGHE del file (le pause di recitazione dentro una battuta sono
// sempre più corte di quelle fra una battuta e l'altra, perché nel testo le
// battute sono separate da riga vuota). Il taglio cade dentro la pausa, con
// un piccolo respiro prima e dopo.

import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const FF = './node_modules/ffmpeg-static/ffmpeg';
const [sorgente, elenco] = process.argv.slice(2);
const ids = elenco.split(',');
const DEST = '/home/user/3d/bianconiglio/public/voce';
mkdirSync(DEST, { recursive: true });

const log = execSync(
  `${FF} -hide_banner -i ${sorgente} -af silencedetect=noise=-35dB:d=0.35 -f null - 2>&1`,
  { encoding: 'utf8' },
);

const durata = (() => {
  const m = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
})();

const silenzi = [];
const re = /silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g;
let m;
while ((m = re.exec(log))) silenzi.push({ inizio: +m[1], fine: +m[2], durata: +m[2] - +m[1] });

// Le pause ai bordi del file non separano niente: fuori.
const interne = silenzi.filter((s) => s.inizio > 0.5 && s.fine < durata - 0.5);
const confini = interne
  .sort((a, b) => b.durata - a.durata)
  .slice(0, ids.length - 1)
  .sort((a, b) => a.inizio - b.inizio);

if (confini.length !== ids.length - 1) {
  console.error(`Servono ${ids.length - 1} confini, trovati ${confini.length}. Mi fermo.`);
  process.exit(1);
}

console.log('confini:', confini.map((c) => `${c.inizio.toFixed(1)}→${c.fine.toFixed(1)}`).join('  '));

let inizio = 0;
ids.forEach((id, i) => {
  const fine = i < confini.length ? confini[i].inizio + 0.3 : durata;
  const partenza = i === 0 ? 0 : confini[i - 1].fine - 0.25;
  execSync(
    `${FF} -hide_banner -loglevel error -y -ss ${partenza.toFixed(3)} -to ${fine.toFixed(3)} -i ${sorgente} -c:a libmp3lame -b:a 128k -ac 1 ${DEST}/${id}.mp3`,
  );
  console.log(`${id}.mp3  ${(fine - partenza).toFixed(1)}s`);
  inizio = fine;
});
