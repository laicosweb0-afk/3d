// Generazione della città: dalla mappa runtime alle mesh fuse.
// Tutto finisce in DUE geometrie non indicizzate (edifici + suolo) con
// vertex colors: due draw call per l'intera Lugo. Le superfici piatte
// (strade, verde, acqua, piazze, ferrovia) stanno su quote leggermente
// diverse per evitare z-fighting senza costi.

import * as THREE from 'three';
import { PALETTE } from './palette';
import { rettangoloMinimo } from './gates';
import { caratteriCitta, type Carattere } from './carattere';
import type { MondoLugo, EdificioRT } from './loadMap';

export class Accumulo {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  uv: number[] = [];

  /** Triangolo con UV esplicite (per le superfici con texture, es. intonaco). */
  triUV(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    nx: number, ny: number, nz: number,
    r: number, g: number, b: number,
    ua: number, va: number, ub: number, vb: number, uc: number, vc: number,
  ) {
    // il winding deve concordare con la normale dichiarata (materiali
    // FrontSide): se il triangolo è avvolto al contrario, si scambiano B e C
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    const gx = e1y * e2z - e1z * e2y;
    const gy = e1z * e2x - e1x * e2z;
    const gz = e1x * e2y - e1y * e2x;
    if (gx * nx + gy * ny + gz * nz < 0) {
      this.pos.push(ax, ay, az, cx, cy, cz, bx, by, bz);
      this.uv.push(ua, va, uc, vc, ub, vb);
    } else {
      this.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      this.uv.push(ua, va, ub, vb, uc, vc);
    }
    this.nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.col.push(r, g, b, r, g, b, r, g, b);
  }

  tri(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    nx: number, ny: number, nz: number,
    r: number, g: number, b: number,
  ) {
    this.triUV(ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, r, g, b, 0, 0, 0, 0, 0, 0);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

const QUOTA = {
  verde: 0.05,
  acqua: 0.1,
  parcheggio: 0.13,
  piazza: 0.15,
  pedonale: 0.18,
  servizio: 0.2,
  residenziale: 0.22,
  secondaria: 0.24,
  primaria: 0.26,
  ferrovia: 0.3,
} as const;

/** Poligono piatto triangolato (earcut di three) nel piano XZ alla quota y. */
function poligonoPiatto(
  acc: Accumulo,
  poly: Float32Array,
  y: number,
  colore: THREE.Color,
  conUV = false,
) {
  const n = poly.length / 2;
  if (n < 3) return;
  const contour: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(poly[i * 2], poly[i * 2 + 1]));
  let tris: number[][];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    return; // anello degenere: lo si salta senza drammi
  }
  for (const [a, b, c] of tris) {
    if (conUV) {
      // UV planari in metri: il ciottolato si ripete ogni ~2.4 m
      acc.triUV(
        contour[a].x, y, contour[a].y,
        contour[b].x, y, contour[b].y,
        contour[c].x, y, contour[c].y,
        0, 1, 0,
        colore.r, colore.g, colore.b,
        contour[a].x / 2.4, contour[a].y / 2.4,
        contour[b].x / 2.4, contour[b].y / 2.4,
        contour[c].x / 2.4, contour[c].y / 2.4,
      );
    } else {
      acc.tri(
        contour[a].x, y, contour[a].y,
        contour[b].x, y, contour[b].y,
        contour[c].x, y, contour[c].y,
        0, 1, 0,
        colore.r, colore.g, colore.b,
      );
    }
  }
}

/** Nastro piatto lungo una polilinea (strade, binari). */
function nastro(acc: Accumulo, pts: Float32Array, larghezza: number, y: number, colore: THREE.Color) {
  const n = pts.length / 2;
  if (n < 2) return;
  const hw = larghezza / 2;
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i < n; i++) {
    const ax = pts[Math.max(0, i - 1) * 2];
    const az = pts[Math.max(0, i - 1) * 2 + 1];
    const bx = pts[Math.min(n - 1, i + 1) * 2];
    const bz = pts[Math.min(n - 1, i + 1) * 2 + 1];
    let dx = bx - ax;
    let dz = bz - az;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const px = pts[i * 2];
    const pz = pts[i * 2 + 1];
    left.push(px - dz * hw, pz + dx * hw);
    right.push(px + dz * hw, pz - dx * hw);
  }
  for (let i = 0; i < n - 1; i++) {
    const l1x = left[i * 2], l1z = left[i * 2 + 1];
    const l2x = left[(i + 1) * 2], l2z = left[(i + 1) * 2 + 1];
    const r1x = right[i * 2], r1z = right[i * 2 + 1];
    const r2x = right[(i + 1) * 2], r2z = right[(i + 1) * 2 + 1];
    acc.tri(l1x, y, l1z, r1x, y, r1z, l2x, y, l2z, 0, 1, 0, colore.r, colore.g, colore.b);
    acc.tri(l2x, y, l2z, r1x, y, r1z, r2x, y, r2z, 0, 1, 0, colore.r, colore.g, colore.b);
  }
}

/** Pareti verticali di un anello; con `interno` la normale guarda DENTRO l'anello (cortili). */
function pareti(acc: Accumulo, anello: Float32Array, h: number, tinta: THREE.Color, interno: boolean) {
  const n = anello.length / 2;
  if (n < 3) return;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += anello[i * 2];
    cz += anello[i * 2 + 1];
  }
  cx /= n;
  cz /= n;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = anello[i * 2], z1 = anello[i * 2 + 1];
    const x2 = anello[j * 2], z2 = anello[j * 2 + 1];
    let nx = z2 - z1;
    let nz = -(x2 - x1);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    const mx = (x1 + x2) / 2 - cx;
    const mz = (z1 + z2) / 2 - cz;
    const fuori = nx * mx + nz * mz >= 0;
    if (fuori === interno) {
      nx = -nx;
      nz = -nz;
    }
    acc.tri(x1, 0, z1, x2, 0, z2, x2, h, z2, nx, 0, nz, tinta.r, tinta.g, tinta.b);
    acc.tri(x1, 0, z1, x2, h, z2, x1, h, z1, nx, 0, nz, tinta.r, tinta.g, tinta.b);
  }
}

/** Triangolo con normale calcolata dai vertici, orientata "in su" o verso `fuori`. */
function triAuto(
  acc: Accumulo,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  colore: THREE.Color,
  fuoriX = 0, fuoriZ = 0,
) {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  const versoGiusto = Math.abs(ny) > 0.3 ? ny > 0 : nx * fuoriX + nz * fuoriZ > 0;
  if (!versoGiusto) { nx = -nx; ny = -ny; nz = -nz; }
  acc.tri(ax, ay, az, bx, by, bz, cx, cy, cz, nx, ny, nz, colore.r, colore.g, colore.b);
}

// finestre deterministiche: la stessa città accende sempre le stesse luci
function lucePseudo(x: number, y: number, z: number): number {
  const v = Math.sin(x * 12.9898 + z * 78.233 + y * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

const cFinSpenta = new THREE.Color(PALETTE.finestraSpenta);
const cFinAccesa = new THREE.Color(PALETTE.finestraAccesa);
const cCornice = new THREE.Color('#EDE5D2');
const cVetrina = new THREE.Color('#46525C');
const cFerro = new THREE.Color('#3A3A38');
const cTecnico = new THREE.Color('#B7BBBA');
const cPorta = new THREE.Color('#3A281C');
const cComignolo = new THREE.Color('#9A6250');
const cFuliggine = new THREE.Color('#5C4438');
const cPannello = new THREE.Color('#26364E');

/** Quad verticale su un lato, fra due quote, scostato di `off` lungo la normale. */
function quadV(
  acc: Accumulo,
  x1: number, z1: number, x2: number, z2: number,
  y0: number, y1: number,
  nx: number, nz: number,
  c: THREE.Color,
  off = 0,
) {
  const ox = nx * off, oz = nz * off;
  acc.tri(x1 + ox, y0, z1 + oz, x2 + ox, y0, z2 + oz, x2 + ox, y1, z2 + oz, nx, 0, nz, c.r, c.g, c.b);
  acc.tri(x1 + ox, y0, z1 + oz, x2 + ox, y1, z2 + oz, x1 + ox, y1, z1 + oz, nx, 0, nz, c.r, c.g, c.b);
}

/** Come sopra, ma su una porzione [t0,t1] del lato. */
function bandaV(
  acc: Accumulo,
  x1: number, z1: number, dx: number, dz: number,
  t0: number, t1: number,
  y0: number, y1: number,
  nx: number, nz: number,
  c: THREE.Color,
  off = 0,
) {
  quadV(acc, x1 + dx * t0, z1 + dz * t0, x1 + dx * t1, z1 + dz * t1, y0, y1, nx, nz, c, off);
}

/** Quad orizzontale (aggetti, solette, coperture piane). */
function quadO(
  acc: Accumulo,
  ax: number, az: number, bx: number, bz: number,
  cx: number, cz: number, dx: number, dz: number,
  y: number, c: THREE.Color, su = true,
) {
  const ny = su ? 1 : -1;
  acc.tri(ax, y, az, bx, y, bz, cx, y, cz, 0, ny, 0, c.r, c.g, c.b);
  acc.tri(ax, y, az, cx, y, cz, dx, y, dz, 0, ny, 0, c.r, c.g, c.b);
}

/** Scatoletta appoggiata: comignoli, volumi tecnici, condizionatori. */
function scatola(
  acc: Accumulo,
  cx: number, cz: number, y0: number, y1: number,
  hx: number, hz: number, c: THREE.Color, cima: THREE.Color,
) {
  const A = [cx - hx, cz - hz], B = [cx + hx, cz - hz], C = [cx + hx, cz + hz], D = [cx - hx, cz + hz];
  quadV(acc, A[0], A[1], B[0], B[1], y0, y1, 0, -1, c);
  quadV(acc, B[0], B[1], C[0], C[1], y0, y1, 1, 0, c);
  quadV(acc, C[0], C[1], D[0], D[1], y0, y1, 0, 1, c);
  quadV(acc, D[0], D[1], A[0], A[1], y0, y1, -1, 0, c);
  quadO(acc, A[0], A[1], B[0], B[1], C[0], C[1], D[0], D[1], y1, cima);
}

/** Quota alla base del piano `p` (0 = terra). */
function quotaPiano(k: Carattere, p: number): number {
  return p === 0 ? 0 : k.hTerra + (p - 1) * k.hPiano;
}

/**
 * Le finestre di un lato, allineate ai piani VERI dell'edificio: cornice,
 * vetro, davanzale e persiane. Al piano terra, se c'è bottega, al posto
 * delle finestre va la vetrina.
 */
function finestreLato(
  acc: Accumulo,
  x1: number, z1: number, x2: number, z2: number,
  nx: number, nz: number,
  k: Carattere,
  budget: { n: number },
) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  if (L < 3.2 || budget.n <= 0) return;
  const dx = x2 - x1, dz = z2 - z1;
  const ex = dx / L, ez = dz / L;
  // le finestre seguono la lunghezza del muro: su un fronte di sessanta
  // metri sei buchi facevano parete cieca, ed era proprio quello a dare
  // l'aria di città finta
  const nFin = Math.max(1, Math.min(16, Math.round(L / k.passo) - 1));

  for (let p = 0; p < k.piani; p++) {
    const base = quotaPiano(k, p);
    const alt = p === 0 ? k.hTerra : k.hPiano;
    if (base + alt > k.h + 0.01) break;
    // il piano terra commerciale ha la vetrina, non le finestre
    if (p === 0 && k.bottega) continue;
    const hFin = Math.min(1.45, alt - 1.05);
    if (hFin < 0.7) continue;
    const y0 = base + (p === 0 ? 0.95 : 0.92);
    for (let w = 0; w < nFin; w++) {
      if (budget.n-- <= 0) return;
      const t = (w + 1) / (nFin + 1);
      const wx = x1 + dx * t;
      const wz = z1 + dz * t;
      const hw = 0.46;
      const fx = ex * hw, fz = ez * hw;
      // cornice chiara, appena più larga del vano
      const cx2 = ex * hw * 1.3, cz2 = ez * hw * 1.3;
      quadV(acc, wx - cx2, wz - cz2, wx + cx2, wz + cz2, y0 - 0.1, y0 + hFin + 0.12, nx, nz, cCornice, 0.05);
      // vetro
      const acceso = lucePseudo(wx, y0, wz) < 0.05;
      quadV(acc, wx - fx, wz - fz, wx + fx, wz + fz, y0, y0 + hFin, nx, nz, acceso ? cFinAccesa : cFinSpenta, 0.075);
      if (k.dettaglio < 2) continue;
      // davanzale
      quadV(acc, wx - cx2 * 1.1, wz - cz2 * 1.1, wx + cx2 * 1.1, wz + cz2 * 1.1, y0 - 0.22, y0 - 0.1, nx, nz, cCornice, 0.11);
      if (!k.persiane) continue;
      // persiane accostate al vano, una per lato
      const sw = 0.3;
      const s0x = ex * (hw + 0.02), s0z = ez * (hw + 0.02);
      const s1x = ex * (hw + 0.02 + sw), s1z = ez * (hw + 0.02 + sw);
      quadV(acc, wx + s0x, wz + s0z, wx + s1x, wz + s1z, y0, y0 + hFin, nx, nz, k.tintaPersiane, 0.1);
      quadV(acc, wx - s1x, wz - s1z, wx - s0x, wz - s0z, y0, y0 + hFin, nx, nz, k.tintaPersiane, 0.1);
    }
  }
}

/**
 * Il piano terra commerciale, campata per campata: pilastrini d'intonaco,
 * vetrine con la cornice chiara, una porta di legno e la cimasa dove
 * Insegne.tsx appende il cartello. Una fascia scura continua per tutto il
 * fronte era proprio quello che faceva "centro commerciale finto".
 */
function vetrina(
  acc: Accumulo,
  x1: number, z1: number, x2: number, z2: number,
  nx: number, nz: number,
  k: Carattere,
) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  if (L < 4) return;
  const dx = x2 - x1, dz = z2 - z1;
  const yTop = Math.max(2.2, k.hTerra - 0.85);
  const campate = Math.max(1, Math.min(9, Math.round(L / 5.2)));
  const porta = Math.floor(lucePseudo(x1, yTop, z1) * campate);
  const cTelaio = cCornice.clone().lerp(k.tinta, 0.25);
  for (let b = 0; b < campate; b++) {
    // ogni campata lascia il pilastrino d'intonaco ai due lati
    const t0 = (b + 0.16) / campate;
    const t1 = (b + 0.84) / campate;
    if (b === porta) {
      bandaV(acc, x1, z1, dx, dz, t0 + 0.02, t1 - 0.02, 0, yTop - 0.05, nx, nz, cTelaio, 0.05);
      bandaV(acc, x1, z1, dx, dz, t0 + 0.05, t1 - 0.05, 0, yTop - 0.18, nx, nz, cPorta, 0.08);
      continue;
    }
    bandaV(acc, x1, z1, dx, dz, t0, t1, 0.32, yTop, nx, nz, cTelaio, 0.05);
    bandaV(acc, x1, z1, dx, dz, t0 + 0.012, t1 - 0.012, 0.45, yTop - 0.14, nx, nz, cVetrina, 0.08);
    // lo zoccolo di pietra sotto la vetrina
    bandaV(acc, x1, z1, dx, dz, t0, t1, 0, 0.32, nx, nz, k.zoccolo, 0.06);
  }
  // cimasa dell'insegna, con la sua cornicetta
  bandaV(acc, x1, z1, dx, dz, 0.04, 0.96, yTop, yTop + 0.52, nx, nz, k.tinta.clone().multiplyScalar(0.9), 0.07);
  bandaV(acc, x1, z1, dx, dz, 0.02, 0.98, yTop + 0.52, yTop + 0.66, nx, nz, cCornice, 0.09);
}

/** Il balcone: soletta aggettante e ringhiera di ferro. */
function balcone(
  acc: Accumulo,
  x1: number, z1: number, x2: number, z2: number,
  nx: number, nz: number,
  y: number,
) {
  const dx = x2 - x1, dz = z2 - z1;
  const t0 = 0.3, t1 = 0.7;
  const ax = x1 + dx * t0, az = z1 + dz * t0;
  const bx = x1 + dx * t1, bz = z1 + dz * t1;
  const sp = 1.05;
  const ox = nx * sp, oz = nz * sp;
  // soletta: sopra, sotto e fronte
  quadO(acc, ax, az, bx, bz, bx + ox, bz + oz, ax + ox, az + oz, y, cCornice);
  quadO(acc, ax, az, bx, bz, bx + ox, bz + oz, ax + ox, az + oz, y - 0.16, cCornice, false);
  quadV(acc, ax, az, bx, bz, y - 0.16, y, nx, nz, cCornice, sp);
  // ringhiera: pannello scuro e corrimano
  quadV(acc, ax, az, bx, bz, y + 0.12, y + 0.92, nx, nz, cFerro, sp - 0.02);
  quadV(acc, ax, az, bx, bz, y + 0.92, y + 1.0, nx, nz, cFerro, sp + 0.03);
}

/**
 * La facciata completa di un anello: muri, zoccolo, marcapiani, cornicione
 * con gronda aggettante, finestre, vetrine, balconi e pluviali.
 */
function facciata(acc: Accumulo, anello: Float32Array, k: Carattere, budget: { n: number } | null) {
  const n = anello.length / 2;
  if (n < 3) return;
  let cx = 0, cz = 0;
  let latoLungo = 0;
  let latoMax = 0;
  let latoCorto = 0;
  let cortoMin = Infinity;
  for (let i = 0; i < n; i++) {
    cx += anello[i * 2];
    cz += anello[i * 2 + 1];
    const j = (i + 1) % n;
    const L = Math.hypot(anello[j * 2] - anello[i * 2], anello[j * 2 + 1] - anello[i * 2 + 1]);
    if (L > latoMax) {
      latoMax = L;
      latoLungo = i;
    }
    if (L < cortoMin && L > 2) {
      cortoMin = L;
      latoCorto = i;
    }
  }
  cx /= n;
  cz /= n;

  const h = k.h;
  const hZoccolo = k.materiale === 'metallo' ? 0.35 : 0.62 + (k.gronda % 0.3);
  const cMarca = cCornice.clone().lerp(k.tinta, 0.35);

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = anello[i * 2], z1 = anello[i * 2 + 1];
    const x2 = anello[j * 2], z2 = anello[j * 2 + 1];
    const L = Math.hypot(x2 - x1, z2 - z1);
    if (L < 0.05) continue;
    let nx = z2 - z1;
    let nz = -(x2 - x1);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    if (nx * ((x1 + x2) / 2 - cx) + nz * ((z1 + z2) / 2 - cz) < 0) {
      nx = -nx;
      nz = -nz;
    }

    // il muro, con la grana dell'intonaco (UV in metri)
    const uMax = L / 3.2;
    const vMax = h / 3.2;
    acc.triUV(x1, 0, z1, x2, 0, z2, x2, h, z2, nx, 0, nz, k.tinta.r, k.tinta.g, k.tinta.b, 0, 0, uMax, 0, uMax, vMax);
    acc.triUV(x1, 0, z1, x2, h, z2, x1, h, z1, nx, 0, nz, k.tinta.r, k.tinta.g, k.tinta.b, 0, 0, uMax, vMax, 0, vMax);

    if (!budget) continue;

    // zoccolo alla base
    if (h > 3) quadV(acc, x1, z1, x2, z2, 0, hZoccolo, nx, nz, k.zoccolo, 0.03);

    // piano terra: vetrina sul lato lungo, altrimenti il portone
    if (k.bottega && i === latoLungo) {
      vetrina(acc, x1, z1, x2, z2, nx, nz, k);
    } else if (i === latoLungo && L >= 3.5 && h >= 3.5) {
      const dx = x2 - x1, dz = z2 - z1;
      bandaV(acc, x1, z1, dx, dz, 0.26, 0.38, 0, 2.62, nx, nz, cCornice, 0.05);
      bandaV(acc, x1, z1, dx, dz, 0.275, 0.365, 0, 2.45, nx, nz, cPorta, 0.08);
    }

    // marcapiani fra i piani
    if (k.marcapiano) {
      for (let p = 1; p < k.piani; p++) {
        const y = quotaPiano(k, p);
        if (y > h - 0.6) break;
        quadV(acc, x1, z1, x2, z2, y - 0.09, y + 0.07, nx, nz, cMarca, 0.05);
      }
    }

    // cornicione e gronda aggettante: è quello che si legge dall'alto
    quadV(acc, x1, z1, x2, z2, h - 0.36, h, nx, nz, cCornice, 0.04);
    if (k.dettaglio >= 1 && k.gronda > 0.15) {
      const g = k.gronda;
      const ox = nx * g, oz = nz * g;
      quadO(acc, x1, z1, x2, z2, x2 + ox, z2 + oz, x1 + ox, z1 + oz, h + 0.06, k.tintaTetto);
      quadO(acc, x1, z1, x2, z2, x2 + ox, z2 + oz, x1 + ox, z1 + oz, h - 0.06, k.zoccolo, false);
      quadV(acc, x1, z1, x2, z2, h - 0.06, h + 0.06, nx, nz, k.tintaTetto, g);
    }

    // balconi sui piani alti del lato principale
    if (k.balconi > 0 && i === latoLungo && L > 5) {
      for (let p = 1; p <= k.balconi && p < k.piani; p++) {
        const y = quotaPiano(k, p) + 0.08;
        if (y + 1.1 < h) balcone(acc, x1, z1, x2, z2, nx, nz, y);
      }
    }

    // condizionatori sul retro
    if (k.condizionatori > 0 && i === latoCorto && L > 3) {
      for (let u = 0; u < k.condizionatori; u++) {
        const t = (u + 1) / (k.condizionatori + 1);
        const y = quotaPiano(k, 1 + (u % Math.max(1, k.piani - 1))) + 0.5;
        if (y + 0.6 > h) continue;
        const px = x1 + (x2 - x1) * t + nx * 0.28;
        const pz = z1 + (z2 - z1) * t + nz * 0.28;
        scatola(acc, px, pz, y, y + 0.55, 0.34, 0.34, cTecnico, cTecnico);
      }
    }

    // pluviale nell'angolo
    if (k.dettaglio === 2 && h > 5 && i % 2 === 0) {
      const tx = x1 + (x2 - x1) * 0.02, tz = z1 + (z2 - z1) * 0.02;
      const ux = x1 + (x2 - x1) * 0.06, uz = z1 + (z2 - z1) * 0.06;
      quadV(acc, tx, tz, ux, uz, 0, h, nx, nz, k.zoccolo, 0.09);
    }

    finestreLato(acc, x1, z1, x2, z2, nx, nz, k, budget);
  }
}

/** Il cappello orizzontale del volume, coi buchi dei cortili. */
function cappello(acc: Accumulo, fp: Float32Array, fori: Float32Array[], y: number, c: THREE.Color) {
  const n = fp.length / 2;
  const contour: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(fp[i * 2], fp[i * 2 + 1]));
  const holes = fori.map((f) => {
    const p: THREE.Vector2[] = [];
    for (let i = 0; i < f.length; i += 2) p.push(new THREE.Vector2(f[i], f[i + 1]));
    return p;
  });
  let tris: number[][];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, holes);
  } catch {
    return;
  }
  const tutti = contour.concat(...holes);
  for (const [ia, ib, ic] of tris) {
    acc.tri(
      tutti[ia].x, y, tutti[ia].y,
      tutti[ib].x, y, tutti[ib].y,
      tutti[ic].x, y, tutti[ic].y,
      0, 1, 0, c.r, c.g, c.b,
    );
  }
}

/** Normale uscente di un lato rispetto al baricentro dell'anello. */
function normaleLato(
  anello: Float32Array, i: number, cx: number, cz: number, verso: number,
): { nx: number; nz: number; x1: number; z1: number; x2: number; z2: number } {
  const n = anello.length / 2;
  const j = (i + 1) % n;
  const x1 = anello[i * 2], z1 = anello[i * 2 + 1];
  const x2 = anello[j * 2], z2 = anello[j * 2 + 1];
  let nx = z2 - z1;
  let nz = -(x2 - x1);
  const l = Math.hypot(nx, nz) || 1;
  nx /= l;
  nz /= l;
  if ((nx * ((x1 + x2) / 2 - cx) + nz * ((z1 + z2) / 2 - cz)) * verso < 0) {
    nx = -nx;
    nz = -nz;
  }
  return { nx, nz, x1, z1, x2, z2 };
}

function baricentro(anello: Float32Array): { cx: number; cz: number } {
  const n = anello.length / 2;
  let cx = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    cx += anello[i * 2];
    cz += anello[i * 2 + 1];
  }
  return { cx: cx / n, cz: cz / n };
}

/**
 * Il tetto dei blocchi col cortile: una vasca di coppi rialzata con le
 * falde che scendono verso la strada e verso la corte. Niente piastra
 * grigia — dall'alto un isolato di Lugo è un anello di tetti rossi.
 */
function tettoAnello(acc: Accumulo, k: Carattere, fp: Float32Array, fori: Float32Array[]) {
  const h = k.h;
  const salita = Math.max(0.9, Math.min(2.2, k.salita * 0.72));
  const sporto = 0.55 + k.gronda;
  // il colmo prende più sole degli spioventi: basta un soffio di differenza
  // perché dall'alto si legga la falda invece di una piastra
  const t = k.tintaTetto.clone().multiplyScalar(1.07);
  const spio = k.tintaTetto;
  const sotto = k.zoccolo;
  cappello(acc, fp, fori, h + salita, t);

  const emettiFalda = (anello: Float32Array, verso: number) => {
    const { cx, cz } = baricentro(anello);
    const n = anello.length / 2;
    for (let i = 0; i < n; i++) {
      const { nx, nz, x1, z1, x2, z2 } = normaleLato(anello, i, cx, cz, verso);
      const ax = x1 + nx * sporto, az = z1 + nz * sporto;
      const bx = x2 + nx * sporto, bz = z2 + nz * sporto;
      // spiovente dal colmo (rialzato) alla gronda (aggettante)
      triAuto(acc, x1, h + salita, z1, x2, h + salita, z2, bx, h, bz, spio, nx, nz);
      triAuto(acc, x1, h + salita, z1, bx, h, bz, ax, h, az, spio, nx, nz);
      if (k.dettaglio >= 1) {
        quadV(acc, ax, az, bx, bz, h - 0.16, h, nx, nz, spio);
        quadO(acc, x1, z1, x2, z2, bx, bz, ax, az, h - 0.16, sotto, false);
      }
    }
  };
  emettiFalda(fp, 1);
  for (const foro of fori) emettiFalda(foro, -1);
}

/** Il tetto: falde, padiglione, lamiera o piano col parapetto. */
function copertura(acc: Accumulo, k: Carattere, fp: Float32Array, fori: Float32Array[]) {
  const h = k.h;

  if (k.tetto === 'piano') {
    cappello(acc, fp, fori, h, k.tintaTetto);
    if (k.dettaglio >= 1) {
      const { cx, cz } = baricentro(fp);
      const n = fp.length / 2;
      const hp = 0.55 + k.gronda;
      for (let i = 0; i < n; i++) {
        const { nx, nz, x1, z1, x2, z2 } = normaleLato(fp, i, cx, cz, 1);
        quadV(acc, x1, z1, x2, z2, h, h + hp, nx, nz, k.tinta, 0.02);
        quadO(acc, x1, z1, x2, z2, x2 - nx * 0.24, z2 - nz * 0.24, x1 - nx * 0.24, z1 - nz * 0.24, h + hp, cCornice);
      }
      const r = rettangoloMinimo(fp);
      const ux = Math.cos(r.angle), uz = Math.sin(r.angle);
      const vx = -uz, vz = ux;
      if (k.piani >= 3 && r.hw > 3 && r.hd > 3 && fori.length === 0) {
        scatola(acc, r.cx + ux * r.hw * 0.35, r.cz + uz * r.hw * 0.35, h, h + 2.3, 1.5, 1.5, k.tinta, k.tintaTetto);
      }
      if (r.hw > 4 && r.hd > 3 && fori.length === 0) {
        scatola(acc, r.cx - ux * r.hw * 0.4 + vx * r.hd * 0.3, r.cz - uz * r.hw * 0.4 + vz * r.hd * 0.3, h, h + 0.8, 0.7, 0.7, cTecnico, cTecnico);
      }
    }
    return;
  }

  // gli isolati col cortile hanno l'anello di falde, non la piastra
  if (fori.length > 0) {
    tettoAnello(acc, k, fp, fori);
    return;
  }

  cappello(acc, fp, fori, h, k.tintaTetto.clone().multiplyScalar(0.94));

  const r = rettangoloMinimo(fp);
  const ux = Math.cos(r.angle), uz = Math.sin(r.angle);
  const vx = -uz, vz = ux;
  const hw = r.hw + k.gronda;
  const hd = r.hd + k.gronda;
  const salita = Math.min(k.salita, hd * 0.85);
  const hc = h + salita;
  // padiglione: il colmo si accorcia di `hd` per lato e nascono i due spioventi
  const mezzo = k.tetto === 'padiglione' ? Math.max(0, hw - hd) : hw;
  const A = [r.cx - ux * hw - vx * hd, r.cz - uz * hw - vz * hd];
  const B = [r.cx + ux * hw - vx * hd, r.cz + uz * hw - vz * hd];
  const C = [r.cx + ux * hw + vx * hd, r.cz + uz * hw + vz * hd];
  const D = [r.cx - ux * hw + vx * hd, r.cz - uz * hw + vz * hd];
  const R1 = [r.cx - ux * mezzo, r.cz - uz * mezzo];
  const R2 = [r.cx + ux * mezzo, r.cz + uz * mezzo];
  const t = k.tintaTetto;

  triAuto(acc, A[0], h, A[1], B[0], h, B[1], R2[0], hc, R2[1], t);
  triAuto(acc, A[0], h, A[1], R2[0], hc, R2[1], R1[0], hc, R1[1], t);
  triAuto(acc, C[0], h, C[1], D[0], h, D[1], R1[0], hc, R1[1], t);
  triAuto(acc, C[0], h, C[1], R1[0], hc, R1[1], R2[0], hc, R2[1], t);
  if (k.tetto === 'padiglione') {
    // testate inclinate: quattro falde, nessun timpano
    triAuto(acc, B[0], h, B[1], C[0], h, C[1], R2[0], hc, R2[1], t);
    triAuto(acc, D[0], h, D[1], A[0], h, A[1], R1[0], hc, R1[1], t);
  } else {
    // timpani a testata, color facciata
    triAuto(acc, A[0], h, A[1], D[0], h, D[1], R1[0], hc, R1[1], k.tinta, -ux, -uz);
    triAuto(acc, B[0], h, B[1], C[0], h, C[1], R2[0], hc, R2[1], k.tinta, ux, uz);
  }

  // comignoli di mattone sulla falda
  if (k.dettaglio >= 1) {
    for (let q = 0; q < k.comignoli; q++) {
      const tq = (q + 1) / (k.comignoli + 1) - 0.5;
      const px = r.cx + ux * tq * r.hw * 1.5 + vx * r.hd * 0.35;
      const pz = r.cz + uz * tq * r.hw * 1.5 + vz * r.hd * 0.35;
      const base = h + salita * 0.5;
      scatola(acc, px, pz, base, base + 0.9 + (q % 2) * 0.4, 0.28, 0.28, cComignolo, cFuliggine);
    }
    if (k.antenna) {
      const base = h + salita;
      quadV(acc, r.cx - 0.04, r.cz, r.cx + 0.04, r.cz, base, base + 1.7, 0, 1, cFerro);
      quadV(acc, r.cx, r.cz - 0.04, r.cx, r.cz + 0.04, base, base + 1.7, 1, 0, cFerro);
      quadV(acc, r.cx - 0.4, r.cz, r.cx + 0.4, r.cz, base + 1.5, base + 1.56, 0, 1, cFerro);
    }
  }

  // qualche falda ha i pannelli solari, come si vede dall'alto
  if (lucePseudo(r.cx, h, r.cz) < 0.09 && r.hw > 3.5 && r.hd > 2.2) {
    const nPan = Math.min(4, Math.floor(r.hw / 1.6));
    for (let q = 0; q < nPan; q++) {
      const tq = (q + 0.5) / nPan - 0.5;
      const bx = r.cx + ux * tq * r.hw * 1.6 - vx * r.hd * 0.5;
      const bz = r.cz + uz * tq * r.hw * 1.6 - vz * r.hd * 0.5;
      const by = h + salita * 0.5 + 0.06;
      const ax2 = ux * 0.65, az2 = uz * 0.65;
      const bx2 = vx * 0.5, bz2 = vz * 0.5;
      triAuto(acc, bx - ax2 - bx2, by - 0.25, bz - az2 - bz2, bx + ax2 - bx2, by - 0.25, bz + az2 - bz2, bx + ax2 + bx2, by + 0.25, bz + az2 + bz2, cPannello);
      triAuto(acc, bx - ax2 - bx2, by - 0.25, bz - az2 - bz2, bx + ax2 + bx2, by + 0.25, bz + az2 + bz2, bx - ax2 + bx2, by + 0.25, bz - az2 + bz2, cPannello);
    }
  }
}

function estrudiEdificio(acc: Accumulo, b: EdificioRT, k: Carattere) {
  const fp = b.fp;
  const fori = b.fori;
  const n = fp.length / 2;
  if (n < 3) return;

  const budget = { n: k.budgetFinestre };
  facciata(acc, fp, k, budget);
  for (const foro of fori) pareti(acc, foro, k.h, k.tinta, true);

  copertura(acc, k, fp, fori);

  // campanile per gli edifici di culto
  if (b.chiesa) {
    const r = rettangoloMinimo(fp);
    const ux = Math.cos(r.angle), uz = Math.sin(r.angle);
    const vx = -uz, vz = ux;
    const bx = r.cx + ux * Math.max(0, r.hw - 2.4) + vx * Math.max(0, r.hd - 2.4);
    const bz = r.cz + uz * Math.max(0, r.hw - 2.4) + vz * Math.max(0, r.hd - 2.4);
    const lato = 1.7;
    const hTorre = k.h + 9;
    const anello = new Float32Array([
      bx - lato, bz - lato, bx + lato, bz - lato, bx + lato, bz + lato, bx - lato, bz + lato,
    ]);
    pareti(acc, anello, hTorre, k.tinta, false);
    const punta = hTorre + 2.6;
    const t = k.tintaTetto;
    triAuto(acc, bx - lato, hTorre, bz - lato, bx + lato, hTorre, bz - lato, bx, punta, bz, t);
    triAuto(acc, bx + lato, hTorre, bz - lato, bx + lato, hTorre, bz + lato, bx, punta, bz, t);
    triAuto(acc, bx + lato, hTorre, bz + lato, bx - lato, hTorre, bz + lato, bx, punta, bz, t);
    triAuto(acc, bx - lato, hTorre, bz + lato, bx - lato, hTorre, bz - lato, bx, punta, bz, t);
  }
}

export interface CittaGeometrie {
  edifici: THREE.BufferGeometry;
  suolo: THREE.BufferGeometry;
}

/**
 * Genera le geometrie della città. `senzaLandmark` elenca gli id landmark i
 * cui footprint NON vanno estrusi (hanno modelli bespoke in Landmarks.tsx).
 */
export function generaCitta(mondo: MondoLugo, senzaLandmark: string[] = []): CittaGeometrie {
  const edifici = new Accumulo();
  const suolo = new Accumulo();

  const esclusi = new Set(senzaLandmark);

  // Ogni edificio riceve il suo carattere (piani veri, materiale, tinta,
  // tetto, dettagli): è quello che toglie a Lugo l'aria di città generata
  // a blocchi. Vedi lib/lugo/carattere.ts.
  const caratteri = caratteriCitta(mondo);
  for (const b of mondo.buildings) {
    if (b.landmark && esclusi.has(b.landmark)) continue;
    const k = caratteri.get(b);
    if (k) estrudiEdificio(edifici, b, k);
  }

  porticiPiazza(edifici, mondo, esclusi);

  // superfici piatte, dal basso verso l'alto
  const cVerde = new THREE.Color(PALETTE.verde);
  const cAcqua = new THREE.Color(PALETTE.acqua);
  const cPiazza = new THREE.Color(PALETTE.piazza);
  // più scuro delle strisce, così gli stalli bianchi si leggono
  const cParcheggio = new THREE.Color('#A9A6AC');
  const cFerro = new THREE.Color(PALETTE.ferrovia);
  for (const a of mondo.aree) {
    const y = QUOTA[a.kind];
    const c =
      a.kind === 'verde' ? cVerde : a.kind === 'acqua' ? cAcqua : a.kind === 'parcheggio' ? cParcheggio : cPiazza;
    // le piazze hanno il ciottolato (texture con UV planari, come dal vivo)
    poligonoPiatto(suolo, a.poly, y, c, a.kind === 'piazza');
  }

  // la campagna della centuriazione: il mosaico dei campi attorno all'abitato
  campagna(suolo, mondo);
  const cStrade = Object.fromEntries(
    Object.entries(PALETTE.strade).map(([k, v]) => [k, new THREE.Color(v)]),
  ) as Record<keyof typeof PALETTE.strade, THREE.Color>;
  const cMarciapiede = new THREE.Color(PALETTE.marciapiede);
  const cSegnaletica = new THREE.Color(PALETTE.segnaletica);
  for (const r of mondo.roads) {
    // marciapiedi: banda chiara che sporge sotto la carreggiata
    if (r.classe !== 'pedonale') {
      nastro(suolo, r.pts, r.larghezza + 2.6, QUOTA[r.classe] - 0.03, cMarciapiede);
    }
    nastro(suolo, r.pts, r.larghezza, QUOTA[r.classe], cStrade[r.classe]);
    // mezzeria tratteggiata sulle strade principali
    if (r.classe === 'primaria' || r.classe === 'secondaria') {
      tratteggio(suolo, r.pts, QUOTA[r.classe] + 0.008, cSegnaletica);
    }
  }
  for (const linea of mondo.rail) {
    nastro(suolo, linea, 1.6, QUOTA.ferrovia, cFerro);
  }

  isoleRotonde(suolo, mondo);
  fasceRosaPiazze(suolo, mondo);
  stalliParcheggi(suolo, mondo);

  return { edifici: edifici.build(), suolo: suolo.build() };
}

function dentroPoly(x: number, z: number, poly: Float32Array): boolean {
  let dentro = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const zi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const zj = poly[j * 2 + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

/**
 * Le fasce di mattone rosato che attraversano il lastricato chiaro delle
 * piazze del centro (Martiri e Baracca), come si vedono dall'alto: larghe
 * ~2.6 m, rade, e ritagliate sia sul poligono della piazza sia sugli
 * edifici che vi sorgono (la corte del Pavaglione resta pulita).
 */
function fasceRosaPiazze(acc: Accumulo, mondo: MondoLugo) {
  const pav = mondo.poi.get('pavaglione');
  if (!pav) return;
  const bar = mondo.poi.get('baracca');
  const cRosa = new THREE.Color('#C79A8F');
  // in Piazza dei Martiri i camminamenti sono lastre d'ardesia grigio-azzurra
  const cPietra = new THREE.Color('#72767D');
  const y = QUOTA.piazza + 0.006;
  const MEZZA = 1.3; // semilarghezza della fascia
  for (const a of mondo.aree) {
    if (a.kind !== 'piazza') continue;
    const n = a.poly.length / 2;
    let cx = 0, cz = 0;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < n; i++) {
      const px = a.poly[i * 2];
      const pz = a.poly[i * 2 + 1];
      cx += px;
      cz += pz;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minZ = Math.min(minZ, pz);
      maxZ = Math.max(maxZ, pz);
    }
    cx /= n;
    cz /= n;
    if (Math.hypot(cx - pav.xm, cz - pav.zm) > 160) continue;
    // rosa solo dal lato della stele di Baracca, grigio pietra ai Martiri;
    // senza il POI si torna al vecchio comportamento (tutte rosa)
    const versoBaracca =
      !bar || Math.hypot(cx - bar.xm, cz - bar.zm) < Math.hypot(cx - pav.xm, cz - pav.zm);
    const cFascia = versoBaracca ? cRosa : cPietra;

    // gli edifici che stanno sulla piazza: le fasce non ci passano sotto
    const ostacoli: Float32Array[] = [];
    for (const b of mondo.buildings) {
      let bx = 0, bz = 0;
      const nb = b.fp.length / 2;
      for (let i = 0; i < nb; i++) {
        bx += b.fp[i * 2];
        bz += b.fp[i * 2 + 1];
      }
      bx /= nb;
      bz /= nb;
      if (bx > minX - 10 && bx < maxX + 10 && bz > minZ - 10 && bz < maxZ + 10) ostacoli.push(b.fp);
    }
    const libero = (px: number, pz: number): boolean => {
      if (!dentroPoly(px, pz, a.poly)) return false;
      for (const fp of ostacoli) if (dentroPoly(px, pz, fp)) return false;
      return true;
    };

    const r = rettangoloMinimo(a.poly);
    const ux = Math.cos(r.angle);
    const uz = Math.sin(r.angle);
    const vx = -uz;
    const vz = ux;
    // bande trasversali ogni 18 m, verificate anche sui due lembi
    for (let s = -r.hw + 6; s < r.hw; s += 18) {
      let inizio: number | null = null;
      for (let t = -r.hd; t <= r.hd + 1.2; t += 1.2) {
        const px = r.cx + ux * s + vx * t;
        const pz = r.cz + uz * s + vz * t;
        const dentro =
          t <= r.hd &&
          libero(px, pz) &&
          libero(px + ux * MEZZA, pz + uz * MEZZA) &&
          libero(px - ux * MEZZA, pz - uz * MEZZA);
        if (dentro && inizio === null) inizio = t;
        else if (!dentro && inizio !== null) {
          const t0 = inizio;
          const t1 = t - 1.2;
          inizio = null;
          if (t1 - t0 < 3.6) continue;
          const ax = r.cx + ux * s + vx * t0;
          const az = r.cz + uz * s + vz * t0;
          const bx = r.cx + ux * s + vx * t1;
          const bz = r.cz + uz * s + vz * t1;
          const ox = ux * MEZZA;
          const oz = uz * MEZZA;
          acc.tri(ax - ox, y, az - oz, ax + ox, y, az + oz, bx + ox, y, bz + oz, 0, 1, 0, cFascia.r, cFascia.g, cFascia.b);
          acc.tri(ax - ox, y, az - oz, bx + ox, y, bz + oz, bx - ox, y, bz - oz, 0, 1, 0, cFascia.r, cFascia.g, cFascia.b);
        }
      }
    }
  }
}

/**
 * Le strisce bianche degli stalli nei piazzali di sosta: file di divisori
 * regolari, come nelle foto aeree del piazzale dietro la Rocca.
 */
function stalliParcheggi(acc: Accumulo, mondo: MondoLugo) {
  const cBianco = new THREE.Color(PALETTE.segnaletica);
  const y = QUOTA.parcheggio + 0.006;
  let divisori = 0;
  for (const a of mondo.aree) {
    if (a.kind !== 'parcheggio') continue;
    const r = rettangoloMinimo(a.poly);
    if (r.hw < 6 || r.hd < 6) continue; // piazzali minuscoli: niente righe
    const ux = Math.cos(r.angle);
    const uz = Math.sin(r.angle);
    const vx = -uz;
    const vz = ux;
    // una fila di stalli ogni 10 m sull'asse corto, divisori ogni 2.6 m.
    // Il tetto copre TUTTI i piazzali della mappa vera (~2300 divisori):
    // è solo un paracadute contro dati anomali.
    for (let d = -r.hd + 5; d < r.hd - 4; d += 10) {
      for (let s = -r.hw + 3; s < r.hw - 2; s += 2.6) {
        if (divisori > 2600) return;
        const px = r.cx + ux * s + vx * d;
        const pz = r.cz + uz * s + vz * d;
        if (!dentroPoly(px, pz, a.poly)) continue;
        const ax = px - vx * 2.3;
        const az = pz - vz * 2.3;
        const bx = px + vx * 2.3;
        const bz = pz + vz * 2.3;
        if (!dentroPoly(ax, az, a.poly) || !dentroPoly(bx, bz, a.poly)) continue;
        const ox = ux * 0.07;
        const oz = uz * 0.07;
        acc.tri(ax - ox, y, az - oz, ax + ox, y, az + oz, bx + ox, y, bz + oz, 0, 1, 0, cBianco.r, cBianco.g, cBianco.b);
        acc.tri(ax - ox, y, az - oz, bx + ox, y, bz + oz, bx - ox, y, bz - oz, 0, 1, 0, cBianco.r, cBianco.g, cBianco.b);
        divisori++;
      }
    }
  }
}

/**
 * Le isole delle rotonde: cordolo bianco, verde al centro e un cespuglio.
 * Gli anelli possono arrivare spezzati in più way: si raggruppano per
 * vicinanza dei baricentri e si ricava centro e raggio interno.
 */
function isoleRotonde(acc: Accumulo, mondo: MondoLugo) {
  const gruppi = new Map<string, { pts: [number, number][]; larghezza: number }>();
  for (const r of mondo.roads) {
    if (!r.rotonda) continue;
    let cx = 0, cz = 0;
    const n = r.pts.length / 2;
    for (let i = 0; i < n; i++) {
      cx += r.pts[i * 2];
      cz += r.pts[i * 2 + 1];
    }
    cx /= n;
    cz /= n;
    const chiave = Math.round(cx / 30) + ':' + Math.round(cz / 30);
    let g = gruppi.get(chiave);
    if (!g) {
      g = { pts: [], larghezza: r.larghezza };
      gruppi.set(chiave, g);
    }
    for (let i = 0; i < n; i++) g.pts.push([r.pts[i * 2], r.pts[i * 2 + 1]]);
  }

  const cVerde = new THREE.Color(PALETTE.verde);
  const cCordolo = new THREE.Color(PALETTE.segnaletica);
  const cCespuglio = new THREE.Color('#46683A');
  for (const g of gruppi.values()) {
    if (g.pts.length < 6) continue;
    let cx = 0, cz = 0;
    for (const [x, z] of g.pts) {
      cx += x;
      cz += z;
    }
    cx /= g.pts.length;
    cz /= g.pts.length;
    let rMin = Infinity;
    for (const [x, z] of g.pts) rMin = Math.min(rMin, Math.hypot(x - cx, z - cz));
    const rIsola = rMin - g.larghezza / 2 - 0.4;
    if (rIsola < 1.4 || rIsola > 30) continue;
    const lati = 18;
    const y = 0.28;
    for (let i = 0; i < lati; i++) {
      const a0 = (i / lati) * Math.PI * 2;
      const a1 = ((i + 1) / lati) * Math.PI * 2;
      // cordolo
      acc.tri(
        cx + Math.cos(a0) * rIsola, y, cz + Math.sin(a0) * rIsola,
        cx + Math.cos(a1) * rIsola, y, cz + Math.sin(a1) * rIsola,
        cx + Math.cos(a1) * (rIsola - 0.4), y, cz + Math.sin(a1) * (rIsola - 0.4),
        0, 1, 0, cCordolo.r, cCordolo.g, cCordolo.b,
      );
      acc.tri(
        cx + Math.cos(a0) * rIsola, y, cz + Math.sin(a0) * rIsola,
        cx + Math.cos(a1) * (rIsola - 0.4), y, cz + Math.sin(a1) * (rIsola - 0.4),
        cx + Math.cos(a0) * (rIsola - 0.4), y, cz + Math.sin(a0) * (rIsola - 0.4),
        0, 1, 0, cCordolo.r, cCordolo.g, cCordolo.b,
      );
      // prato interno
      acc.tri(
        cx, y + 0.005, cz,
        cx + Math.cos(a0) * (rIsola - 0.4), y + 0.005, cz + Math.sin(a0) * (rIsola - 0.4),
        cx + Math.cos(a1) * (rIsola - 0.4), y + 0.005, cz + Math.sin(a1) * (rIsola - 0.4),
        0, 1, 0, cVerde.r, cVerde.g, cVerde.b,
      );
    }
    // l'isola è alberata, come nelle viste aeree: un gruppo di chiome
    const alberelli: [number, number, number][] = [
      [0, 0, Math.min(3.4, rIsola * 0.6)],
      [rIsola * 0.32, rIsola * 0.2, Math.min(2.4, rIsola * 0.45)],
      [-rIsola * 0.3, -rIsola * 0.24, Math.min(2.1, rIsola * 0.4)],
    ];
    for (const [ox, oz, rC] of alberelli) {
      if (rC < 1) continue;
      const bx = cx + ox;
      const bz = cz + oz;
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * Math.PI * 2;
        const a1 = ((i + 1) / 8) * Math.PI * 2;
        acc.tri(
          bx + Math.cos(a0) * rC, y, bz + Math.sin(a0) * rC,
          bx + Math.cos(a1) * rC, y, bz + Math.sin(a1) * rC,
          bx, y + rC * 1.7, bz,
          Math.cos((a0 + a1) / 2), 0.6, Math.sin((a0 + a1) / 2),
          cCespuglio.r, cCespuglio.g, cCespuglio.b,
        );
      }
    }

    // l'anello rosso della ciclabile attorno alla rotonda
    const cRosso = new THREE.Color('#B8453A');
    const rAnello = rMin + g.larghezza / 2 + 0.55;
    const tratti = 16;
    for (let i = 0; i < tratti; i++) {
      if (i % 2 === 1) continue;
      const a0 = (i / tratti) * Math.PI * 2;
      const a1 = ((i + 0.85) / tratti) * Math.PI * 2;
      acc.tri(
        cx + Math.cos(a0) * rAnello, 0.272, cz + Math.sin(a0) * rAnello,
        cx + Math.cos(a1) * rAnello, 0.272, cz + Math.sin(a1) * rAnello,
        cx + Math.cos(a1) * (rAnello + 0.5), 0.272, cz + Math.sin(a1) * (rAnello + 0.5),
        0, 1, 0, cRosso.r, cRosso.g, cRosso.b,
      );
      acc.tri(
        cx + Math.cos(a0) * rAnello, 0.272, cz + Math.sin(a0) * rAnello,
        cx + Math.cos(a1) * (rAnello + 0.5), 0.272, cz + Math.sin(a1) * (rAnello + 0.5),
        cx + Math.cos(a0) * (rAnello + 0.5), 0.272, cz + Math.sin(a0) * (rAnello + 0.5),
        0, 1, 0, cRosso.r, cRosso.g, cRosso.b,
      );
    }
  }
}

/**
 * I portici di Piazza Baracca: le fonti la descrivono circondata da
 * "eleganti palazzi porticati". Sugli edifici che guardano il monumento:
 * piano terra in ombra, solaio a sbalzo e pilastri bianchi ritmati.
 */
function porticiPiazza(acc: Accumulo, mondo: MondoLugo, esclusi: Set<string>) {
  const p = mondo.poi.get('baracca');
  if (!p) return;
  const cPil = new THREE.Color('#EFE8D8');
  const cOmbra = new THREE.Color('#403830');
  const cSoffitto = new THREE.Color('#E6DCC6');
  const H_PORT = 3.6;
  const SPORTO = 2.3;
  let pilastri = 0;

  for (const b of mondo.buildings) {
    if (b.landmark && esclusi.has(b.landmark)) continue;
    const fp = b.fp;
    const n = fp.length / 2;
    let cx = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += fp[i * 2];
      cz += fp[i * 2 + 1];
    }
    cx /= n;
    cz /= n;
    if (Math.hypot(cx - p.xm, cz - p.zm) > 78) continue;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = fp[i * 2], z1 = fp[i * 2 + 1];
      const x2 = fp[j * 2], z2 = fp[j * 2 + 1];
      const L = Math.hypot(x2 - x1, z2 - z1);
      if (L < 6) continue;
      const mx = (x1 + x2) / 2;
      const mz = (z1 + z2) / 2;
      if (Math.hypot(mx - p.xm, mz - p.zm) > 58) continue;
      let nx = z2 - z1;
      let nz = -(x2 - x1);
      const l = Math.hypot(nx, nz) || 1;
      nx /= l;
      nz /= l;
      if (nx * (mx - cx) + nz * (mz - cz) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const vx = p.xm - mx;
      const vz = p.zm - mz;
      const vl = Math.hypot(vx, vz) || 1;
      if (nx * (vx / vl) + nz * (vz / vl) < 0.55) continue;

      // piano terra in ombra (la profondità del portico è suggerita)
      const ox = nx * 0.02, oz = nz * 0.02;
      acc.tri(x1 + ox, 0, z1 + oz, x2 + ox, 0, z2 + oz, x2 + ox, H_PORT, z2 + oz, nx, 0, nz, cOmbra.r, cOmbra.g, cOmbra.b);
      acc.tri(x1 + ox, 0, z1 + oz, x2 + ox, H_PORT, z2 + oz, x1 + ox, H_PORT, z1 + oz, nx, 0, nz, cOmbra.r, cOmbra.g, cOmbra.b);
      // solaio a sbalzo: intradosso chiaro e bordo
      const s1x = x1 + nx * SPORTO, s1z = z1 + nz * SPORTO;
      const s2x = x2 + nx * SPORTO, s2z = z2 + nz * SPORTO;
      acc.tri(x1, H_PORT, z1, x2, H_PORT, z2, s2x, H_PORT, s2z, 0, -1, 0, cSoffitto.r, cSoffitto.g, cSoffitto.b);
      acc.tri(x1, H_PORT, z1, s2x, H_PORT, s2z, s1x, H_PORT, s1z, 0, -1, 0, cSoffitto.r, cSoffitto.g, cSoffitto.b);
      acc.tri(s1x, H_PORT, s1z, s2x, H_PORT, s2z, s2x, H_PORT + 0.35, s2z, nx, 0, nz, cPil.r, cPil.g, cPil.b);
      acc.tri(s1x, H_PORT, s1z, s2x, H_PORT + 0.35, s2z, s1x, H_PORT + 0.35, s1z, nx, 0, nz, cPil.r, cPil.g, cPil.b);
      // pilastri ritmati sul filo esterno
      const nPil = Math.max(2, Math.round(L / 3.4));
      for (let k = 0; k <= nPil && pilastri < 90; k++) {
        const t = k / nPil;
        const px = x1 + (x2 - x1) * t + nx * (SPORTO - 0.25);
        const pz = z1 + (z2 - z1) * t + nz * (SPORTO - 0.25);
        const lato = 0.22;
        const anello = new Float32Array([
          px - lato, pz - lato, px + lato, pz - lato, px + lato, pz + lato, px - lato, pz + lato,
        ]);
        pareti(acc, anello, H_PORT, cPil, false);
        pilastri++;
      }
    }
  }
}

/**
 * Il mosaico dei campi romagnoli attorno all'abitato: strisce rettangolari
 * allineate agli assi (la centuriazione romana lo è davvero), nei toni di
 * paglia e verde. Si disegnano solo fuori dal raggio urbano.
 */
function campagna(acc: Accumulo, mondo: MondoLugo) {
  const TONI = ['#C9B87E', '#D6C892', '#9FAE6E', '#B5A46B', '#8FA05F', '#DCCB9A', '#C2AE74'].map(
    (c) => new THREE.Color(c),
  );
  const R_URBANO = 1060;
  const { minX, minZ, maxX, maxZ } = mondo.bounds;
  const margine = 380;
  let seme = 555777;
  const rnd = () => {
    seme = (seme * 1664525 + 1013904223) >>> 0;
    return seme / 4294967296;
  };
  let z = minZ - margine;
  while (z < maxZ + margine) {
    const dz = 110 + rnd() * 150;
    let x = minX - margine;
    while (x < maxX + margine) {
      const dx = 55 + rnd() * 130;
      const cx = x + dx / 2;
      const cz = z + dz / 2;
      if (Math.hypot(cx, cz) > R_URBANO) {
        const c = TONI[Math.floor(rnd() * TONI.length)];
        const y = 0.015;
        acc.tri(x, y, z, x + dx - 3, y, z, x + dx - 3, y, z + dz - 3, 0, 1, 0, c.r, c.g, c.b);
        acc.tri(x, y, z, x + dx - 3, y, z + dz - 3, x, y, z + dz - 3, 0, 1, 0, c.r, c.g, c.b);
      }
      x += dx;
    }
    z += dz;
  }
}

/** Mezzeria tratteggiata: trattini di 3 m ogni 9, larghi 16 cm. */
function tratteggio(acc: Accumulo, pts: Float32Array, y: number, colore: THREE.Color) {
  const n = pts.length / 2;
  let residuo = 0;
  for (let i = 0; i + 1 < n; i++) {
    const ax = pts[i * 2];
    const az = pts[i * 2 + 1];
    const dx = pts[(i + 1) * 2] - ax;
    const dz = pts[(i + 1) * 2 + 1] - az;
    const L = Math.hypot(dx, dz);
    if (L < 0.01) continue;
    const ux = dx / L;
    const uz = dz / L;
    const px = -uz * 0.08;
    const pz = ux * 0.08;
    let s = residuo;
    while (s + 3 <= L) {
      const x0 = ax + ux * s;
      const z0 = az + uz * s;
      const x1 = ax + ux * (s + 3);
      const z1 = az + uz * (s + 3);
      acc.tri(x0 - px, y, z0 - pz, x0 + px, y, z0 + pz, x1 + px, y, z1 + pz, 0, 1, 0, colore.r, colore.g, colore.b);
      acc.tri(x0 - px, y, z0 - pz, x1 + px, y, z1 + pz, x1 - px, y, z1 - pz, 0, 1, 0, colore.r, colore.g, colore.b);
      s += 9;
    }
    residuo = s - L;
  }
}
