// Stampa la proposta di convenzione: HTML → PDF, con Chromium headless.
//
//   node tools/aurea/pdf.mjs
//
// Non serve npm install: si usa il Chromium già presente nell'ambiente
// (PLAYWRIGHT_BROWSERS_PATH, di norma /opt/pw-browsers). Se il binario non
// c'è, lo script lo dice e si ferma invece di produrre un PDF a metà.
//
// Perché Chromium e non una libreria di impaginazione: il documento è scritto
// in HTML e CSS come il resto del progetto — stesso carattere del brand, stessi
// colori, stesse regole — e il motore che lo impagina è lo stesso che
// impagina il sito. Un secondo strumento vorrebbe dire un secondo linguaggio
// e due verità sulla tipografia del marchio.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SORGENTE = join(RADICE, 'aurea/convenzioni/proposta.html');
const USCITA = join(RADICE, 'aurea/convenzioni/AureaClub-Convenzione.pdf');

/** Trova il Chromium dell'ambiente. Le cartelle hanno un numero di versione
 *  nel nome (chromium-1194), quindi si cerca per prefisso invece di fissare
 *  una versione che domani non esisterà più. */
function trovaChromium() {
  const daEnv = process.env.CHROME_BIN;
  if (daEnv && existsSync(daEnv)) return daEnv;

  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(base)) return null;

  const candidati = readdirSync(base)
    .filter((n) => n.startsWith('chromium-'))
    .map((n) => join(base, n, 'chrome-linux/chrome'))
    .filter((p) => existsSync(p) && statSync(p).isFile());

  return candidati[0] ?? null;
}

const chromium = trovaChromium();
if (!chromium) {
  console.error(
    'Chromium non trovato.\n' +
      'Indica il binario con CHROME_BIN=/percorso/chrome, oppure installa i\n' +
      'browser di Playwright. Il PDF non è stato generato.',
  );
  process.exit(1);
}

const esito = spawnSync(
  chromium,
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    // Aspetta che il documento sia davvero disegnato: senza queste due, un
    // carattere ancora in decodifica esce dal PDF come testo di ripiego.
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=10000',
    // Niente intestazioni del browser: la data e i numeri di pagina li mette
    // il documento, dove sono composti come si deve.
    '--no-pdf-header-footer',
    `--print-to-pdf=${USCITA}`,
    `file://${SORGENTE}`,
  ],
  { encoding: 'utf8' },
);

// Chromium scrive su stderr anche quando è andato tutto bene (D-Bus assente nel
// container, e altre lamentele che non riguardano la stampa): quello che conta
// è il codice di uscita e il file sul disco.
if (esito.status !== 0 || !existsSync(USCITA)) {
  console.error(esito.stderr || 'Chromium è uscito senza scrivere il PDF.');
  process.exit(1);
}

const kb = Math.round(statSync(USCITA).size / 1024);
console.log(`PDF scritto: ${USCITA} (${kb} kB)`);
