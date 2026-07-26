/**
 * Estrae il canale alfa dai loghi dei clienti.
 *
 * I file forniti hanno lo sfondo pieno (bianco o panna). Una semplice chiave
 * cromatica globale li rovinerebbe: il corpo della mucca MOU è panna come il
 * suo fondo, il mappamondo Mondial ha riflessi bianchi, la perla AureaClub ha
 * un colmo bianco. Quei bianchi sono *dentro* al marchio e devono restare.
 *
 * Si procede quindi per riempimento a partire dai bordi: diventa trasparente
 * solo lo sfondo effettivamente collegato al bordo dell'immagine, mai le aree
 * chiare racchiuse dentro al disegno. Ai margini del riempimento l'alfa è
 * graduata sulla somiglianza col fondo, per non lasciare la scaletta di pixel
 * tipica del ritaglio fatto male.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

const FF = ffmpeg.path;

function size(file) {
  try {
    execFileSync(FF, ['-i', file], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const m = /, (\d+)x(\d+)/.exec(e.stderr.toString());
    return { w: +m[1], h: +m[2] };
  }
  throw new Error('dimensioni non leggibili: ' + file);
}

const dist = (b, i, r, g, bl) =>
  Math.abs(b[i] - r) + Math.abs(b[i + 1] - g) + Math.abs(b[i + 2] - bl);

/**
 * @param {string} src file di partenza
 * @param {string} out PNG con alfa
 * @param {number} tol tolleranza sul colore di fondo (somma dei canali)
 * @param {boolean} global true = chiave globale invece che dai bordi (per i
 *        marchi il cui fondo non è collegato al bordo, come il badge Woman)
 */
function cutout(src, out, tol = 96, global = false) {
  const { w, h } = size(src);
  const raw = '/tmp/_a.raw';
  const cut = '/tmp/_b.raw';
  execFileSync(FF, ['-y', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgba', raw]);
  const b = readFileSync(raw);

  // colore di fondo: media dei quattro angoli
  let r = 0, g = 0, bl = 0;
  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
  for (const c of corners) { r += b[c]; g += b[c + 1]; bl += b[c + 2]; }
  r /= 4; g /= 4; bl /= 4;

  const removed = new Uint8Array(w * h);

  if (global) {
    for (let p = 0; p < w * h; p++) {
      if (dist(b, p * 4, r, g, bl) < tol) removed[p] = 1;
    }
  } else {
    // riempimento dai bordi: solo lo sfondo collegato al bordo sparisce
    const stack = [];
    for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
    while (stack.length) {
      const p = stack.pop();
      if (removed[p]) continue;
      if (dist(b, p * 4, r, g, bl) >= tol) continue;
      removed[p] = 1;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }
  }

  // Seconda passata: i vuoti chiusi dentro alle lettere (le pance di O, D, A)
  // non sono raggiungibili dal bordo e resterebbero bianchi. Si rimuovono le
  // isole di colore-fondo piccole, lasciando intatte le aree chiare estese che
  // appartengono davvero al marchio (il corpo della mucca, la fettuccia).
  if (!global) {
    const MAXW = w * 0.09, MAXH = h * 0.09;
    const seen = new Uint8Array(w * h);
    for (let p0 = 0; p0 < w * h; p0++) {
      if (seen[p0] || removed[p0]) continue;
      if (dist(b, p0 * 4, r, g, bl) >= tol) continue;
      // raccoglie l'isola
      const island = [];
      const st = [p0];
      seen[p0] = 1;
      let minX = w, maxX = 0, minY = h, maxY = 0;
      while (st.length) {
        const q = st.pop();
        island.push(q);
        const x = q % w, y = (q / w) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        const nb = [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1,
                    y > 0 ? q - w : -1, y < h - 1 ? q + w : -1];
        for (const nq of nb) {
          if (nq < 0 || seen[nq] || removed[nq]) continue;
          if (dist(b, nq * 4, r, g, bl) >= tol) continue;
          seen[nq] = 1;
          st.push(nq);
        }
      }
      if (maxX - minX <= MAXW && maxY - minY <= MAXH) {
        for (const q of island) removed[q] = 1;
      }
    }
  }

  // alfa: 0 sullo sfondo, graduata sul bordo del riempimento
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (removed[p]) { b[i + 3] = 0; continue; }
    const x = p % w, y = (p / w) | 0;
    let touching = false;
    if (x > 0 && removed[p - 1]) touching = true;
    else if (x < w - 1 && removed[p + 1]) touching = true;
    else if (y > 0 && removed[p - w]) touching = true;
    else if (y < h - 1 && removed[p + w]) touching = true;
    if (touching) {
      // quanto questo pixel somiglia ancora al fondo: più somiglia, più è
      // trasparente. Evita il bordo seghettato.
      const d = dist(b, i, r, g, bl);
      b[i + 3] = Math.max(0, Math.min(255, Math.round((d / (tol * 1.9)) * 255)));
    }
  }

  writeFileSync(cut, b);
  execFileSync(FF, ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`,
    '-i', cut, '-frames:v', '1', out]);
  unlinkSync(raw); unlinkSync(cut);

  const kept = removed.reduce((a, v) => a + (v ? 0 : 1), 0);
  console.log(`${out}  ${w}x${h}  opaco ${((kept / (w * h)) * 100).toFixed(1)}%`);
}

const [, , src, out, tol, mode] = process.argv;
cutout(src, out, tol ? +tol : 96, mode === 'global');
