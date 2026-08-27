// Generazione della città: dalla mappa runtime alle mesh fuse.
// Tutto finisce in DUE geometrie non indicizzate (edifici + suolo) con
// vertex colors: due draw call per l'intera Lugo. Le superfici piatte
// (strade, verde, acqua, piazze, ferrovia) stanno su quote leggermente
// diverse per evitare z-fighting senza costi.

import * as THREE from 'three';
import { PALETTE } from './palette';
import { rettangoloMinimo } from './gates';
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

/** Griglia di finestre su una parete; qualcuna è accesa nel tramonto. */
function finestre(
  acc: Accumulo,
  x1: number, z1: number, x2: number, z2: number,
  nx: number, nz: number,
  h: number,
  budget: { n: number },
) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  if (L < 3.4 || h < 4 || budget.n <= 0) return;
  const piani = Math.min(3, Math.floor((h - 1.4) / 3));
  if (piani < 1) return;
  const nFin = Math.min(4, Math.floor(L / 3.2));
  const ex = ((x2 - x1) / L) * 0.46;
  const ez = ((z2 - z1) / L) * 0.46;
  for (let p = 0; p < piani; p++) {
    const y0 = 1.35 + p * 3.0;
    if (y0 + 1.35 > h - 0.35) break;
    for (let w = 0; w < nFin; w++) {
      if (budget.n-- <= 0) return;
      const t = (w + 1) / (nFin + 1);
      const wx = x1 + (x2 - x1) * t + nx * 0.06;
      const wz = z1 + (z2 - z1) * t + nz * 0.06;
      // cornice chiara dietro, vetro davanti
      const fx = ex * 1.28;
      const fz = ez * 1.28;
      const gx = wx - nx * 0.018;
      const gz = wz - nz * 0.018;
      acc.tri(gx - fx, y0 - 0.09, gz - fz, gx + fx, y0 - 0.09, gz + fz, gx + fx, y0 + 1.44, gz + fz, nx, 0, nz, cCornice.r, cCornice.g, cCornice.b);
      acc.tri(gx - fx, y0 - 0.09, gz - fz, gx + fx, y0 + 1.44, gz + fz, gx - fx, y0 + 1.44, gz - fz, nx, 0, nz, cCornice.r, cCornice.g, cCornice.b);
      const c = lucePseudo(wx, y0, wz) < 0.3 ? cFinAccesa : cFinSpenta;
      acc.tri(wx - ex, y0, wz - ez, wx + ex, y0, wz + ez, wx + ex, y0 + 1.35, wz + ez, nx, 0, nz, c.r, c.g, c.b);
      acc.tri(wx - ex, y0, wz - ez, wx + ex, y0 + 1.35, wz + ez, wx - ex, y0 + 1.35, wz - ez, nx, 0, nz, c.r, c.g, c.b);
    }
  }
}

/** Pareti + finestre + zoccolo, cornicione e portone di un anello (solo perimetro esterno). */
function paretiConFinestre(
  acc: Accumulo,
  anello: Float32Array,
  h: number,
  tinta: THREE.Color,
  budget: { n: number } | null,
  zoccolo: THREE.Color | null = null,
) {
  const n = anello.length / 2;
  if (n < 3) return;
  let cx = 0, cz = 0;
  let latoPortone = -1;
  let latoMax = 0;
  for (let i = 0; i < n; i++) {
    cx += anello[i * 2];
    cz += anello[i * 2 + 1];
    const j = (i + 1) % n;
    const L = Math.hypot(anello[j * 2] - anello[i * 2], anello[j * 2 + 1] - anello[i * 2 + 1]);
    if (L > latoMax) {
      latoMax = L;
      latoPortone = i;
    }
  }
  cx /= n;
  cz /= n;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = anello[i * 2], z1 = anello[i * 2 + 1];
    const x2 = anello[j * 2], z2 = anello[j * 2 + 1];
    const L = Math.hypot(x2 - x1, z2 - z1);
    let nx = z2 - z1;
    let nz = -(x2 - x1);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    const mx = (x1 + x2) / 2 - cx;
    const mz = (z1 + z2) / 2 - cz;
    if (nx * mx + nz * mz < 0) {
      nx = -nx;
      nz = -nz;
    }
    // la grana dell'intonaco: UV in metri (la texture si ripete ogni ~3.2 m)
    const uMax = L / 3.2;
    const vMax = h / 3.2;
    acc.triUV(x1, 0, z1, x2, 0, z2, x2, h, z2, nx, 0, nz, tinta.r, tinta.g, tinta.b, 0, 0, uMax, 0, uMax, vMax);
    acc.triUV(x1, 0, z1, x2, h, z2, x1, h, z1, nx, 0, nz, tinta.r, tinta.g, tinta.b, 0, 0, uMax, vMax, 0, vMax);

    // il portone sul lato più lungo, come dal vivo: anta scura e cornice
    if (budget && i === latoPortone && L >= 3.5 && h >= 3.5) {
      const t = 0.32;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      const ex = ((x2 - x1) / L);
      const ez = ((z2 - z1) / L);
      const cPorta = 0.62;
      const cCorn = 0.78;
      const ox = nx * 0.05, oz = nz * 0.05;
      acc.tri(
        px - ex * cCorn + ox, 0, pz - ez * cCorn + oz,
        px + ex * cCorn + ox, 0, pz + ez * cCorn + oz,
        px + ex * cCorn + ox, 2.65, pz + ez * cCorn + oz,
        nx, 0, nz, cCornice.r, cCornice.g, cCornice.b,
      );
      acc.tri(
        px - ex * cCorn + ox, 0, pz - ez * cCorn + oz,
        px + ex * cCorn + ox, 2.65, pz + ez * cCorn + oz,
        px - ex * cCorn + ox, 2.65, pz - ez * cCorn + oz,
        nx, 0, nz, cCornice.r, cCornice.g, cCornice.b,
      );
      const ox2 = nx * 0.08, oz2 = nz * 0.08;
      acc.tri(
        px - ex * cPorta + ox2, 0, pz - ez * cPorta + oz2,
        px + ex * cPorta + ox2, 0, pz + ez * cPorta + oz2,
        px + ex * cPorta + ox2, 2.45, pz + ez * cPorta + oz2,
        nx, 0, nz, 0.16, 0.11, 0.08,
      );
      acc.tri(
        px - ex * cPorta + ox2, 0, pz - ez * cPorta + oz2,
        px + ex * cPorta + ox2, 2.45, pz + ez * cPorta + oz2,
        px - ex * cPorta + ox2, 2.45, pz - ez * cPorta + oz2,
        nx, 0, nz, 0.16, 0.11, 0.08,
      );
    }
    if (zoccolo && h > 3) {
      // zoccolo scuro alla base, cornicione chiaro sotto la gronda
      const ox = nx * 0.03;
      const oz = nz * 0.03;
      acc.tri(x1 + ox, 0, z1 + oz, x2 + ox, 0, z2 + oz, x2 + ox, 0.75, z2 + oz, nx, 0, nz, zoccolo.r, zoccolo.g, zoccolo.b);
      acc.tri(x1 + ox, 0, z1 + oz, x2 + ox, 0.75, z2 + oz, x1 + ox, 0.75, z1 + oz, nx, 0, nz, zoccolo.r, zoccolo.g, zoccolo.b);
      acc.tri(x1 + ox, h - 0.42, z1 + oz, x2 + ox, h - 0.42, z2 + oz, x2 + ox, h, z2 + oz, nx, 0, nz, cCornice.r, cCornice.g, cCornice.b);
      acc.tri(x1 + ox, h - 0.42, z1 + oz, x2 + ox, h, z2 + oz, x1 + ox, h, z1 + oz, nx, 0, nz, cCornice.r, cCornice.g, cCornice.b);
    }
    if (budget) finestre(acc, x1, z1, x2, z2, nx, nz, h, budget);
  }
}

function estrudiEdificio(acc: Accumulo, b: EdificioRT, tintaBase: THREE.Color, tetto: THREE.Color) {
  const fp = b.fp;
  const fori = b.fori;
  const h = b.h;
  const n = fp.length / 2;
  if (n < 3) return;

  // colore OSM dichiarato, ammorbidito verso la palette per non stonare
  const tinta = b.colore ? new THREE.Color(b.colore).lerp(tintaBase, 0.3) : tintaBase;

  const budget = { n: 16 };
  const zoccolo = tinta.clone().multiplyScalar(0.55);
  paretiConFinestre(acc, fp, h, tinta, budget, zoccolo);
  for (const foro of fori) pareti(acc, foro, h, tinta, true);

  // tetto piano triangolato (coi buchi dei cortili)
  const contour: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(fp[i * 2], fp[i * 2 + 1]));
  const holes = fori.map((f) => {
    const hpts: THREE.Vector2[] = [];
    for (let i = 0; i < f.length; i += 2) hpts.push(new THREE.Vector2(f[i], f[i + 1]));
    return hpts;
  });
  let tris: number[][];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, holes);
  } catch {
    return;
  }
  // gli indici restituiti puntano a contour ⧺ holes, in quest'ordine
  const tutti = contour.concat(...holes);
  for (const [ia, ib, ic] of tris) {
    acc.tri(
      tutti[ia].x, h, tutti[ia].y,
      tutti[ib].x, h, tutti[ib].y,
      tutti[ic].x, h, tutti[ic].y,
      0, 1, 0,
      tetto.r, tetto.g, tetto.b,
    );
  }

  // tetto a falde sopra il cappello piatto: colmo lungo l'asse maggiore
  if (b.falde && fori.length === 0) {
    const r = rettangoloMinimo(fp);
    const hw = r.hw + 0.45;
    const hd = r.hd + 0.45;
    const ux = Math.cos(r.angle), uz = Math.sin(r.angle);
    const vx = -uz, vz = ux;
    const salita = Math.min(2.6, hd * 0.62);
    const A = [r.cx - ux * hw - vx * hd, r.cz - uz * hw - vz * hd];
    const B = [r.cx + ux * hw - vx * hd, r.cz + uz * hw - vz * hd];
    const C = [r.cx + ux * hw + vx * hd, r.cz + uz * hw + vz * hd];
    const D = [r.cx - ux * hw + vx * hd, r.cz - uz * hw + vz * hd];
    const R1 = [r.cx - ux * hw, r.cz - uz * hw];
    const R2 = [r.cx + ux * hw, r.cz + uz * hw];
    const hc = h + salita;
    // due falde
    triAuto(acc, A[0], h, A[1], B[0], h, B[1], R2[0], hc, R2[1], tetto);
    triAuto(acc, A[0], h, A[1], R2[0], hc, R2[1], R1[0], hc, R1[1], tetto);
    triAuto(acc, C[0], h, C[1], D[0], h, D[1], R1[0], hc, R1[1], tetto);
    triAuto(acc, C[0], h, C[1], R1[0], hc, R1[1], R2[0], hc, R2[1], tetto);
    // timpani alle testate, color facciata
    triAuto(acc, A[0], h, A[1], D[0], h, D[1], R1[0], hc, R1[1], tinta, -ux, -uz);
    triAuto(acc, B[0], h, B[1], C[0], h, C[1], R2[0], hc, R2[1], tinta, ux, uz);

    // qualche falda ha i pannelli solari, come si vede dall'alto
    if (lucePseudo(r.cx, h, r.cz) < 0.09 && hw > 3.5 && hd > 2.2) {
      const cPannello = new THREE.Color('#26364E');
      const nPan = Math.min(4, Math.floor(hw / 1.6));
      for (let k = 0; k < nPan; k++) {
        const t = (k + 0.5) / nPan - 0.5;
        // sul falso piano della falda sud: leggermente sopra, a metà pendenza
        const bx = r.cx + ux * t * hw * 1.6 + vx * hd * 0.5;
        const bz = r.cz + uz * t * hw * 1.6 + vz * hd * 0.5;
        const by = h + salita * 0.5 + 0.06;
        const ax2 = ux * 0.65, az2 = uz * 0.65;
        const bx2 = vx * 0.5, bz2 = vz * 0.5;
        triAuto(acc, bx - ax2 - bx2, by - 0.25, bz - az2 - bz2, bx + ax2 - bx2, by - 0.25, bz + az2 - bz2, bx + ax2 + bx2, by + 0.25, bz + az2 + bz2, cPannello);
        triAuto(acc, bx - ax2 - bx2, by - 0.25, bz - az2 - bz2, bx + ax2 + bx2, by + 0.25, bz + az2 + bz2, bx - ax2 + bx2, by + 0.25, bz - az2 + bz2, cPannello);
      }
    }
  }

  // campanile per gli edifici di culto
  if (b.chiesa) {
    const r = rettangoloMinimo(fp);
    const ux = Math.cos(r.angle), uz = Math.sin(r.angle);
    const vx = -uz, vz = ux;
    const bx = r.cx + ux * Math.max(0, r.hw - 2.4) + vx * Math.max(0, r.hd - 2.4);
    const bz = r.cz + uz * Math.max(0, r.hw - 2.4) + vz * Math.max(0, r.hd - 2.4);
    const lato = 1.7;
    const hTorre = h + 9;
    const anello = new Float32Array([
      bx - lato, bz - lato, bx + lato, bz - lato, bx + lato, bz + lato, bx - lato, bz + lato,
    ]);
    pareti(acc, anello, hTorre, tinta, false);
    // cuspide piramidale
    const punta = hTorre + 2.6;
    triAuto(acc, bx - lato, hTorre, bz - lato, bx + lato, hTorre, bz - lato, bx, punta, bz, tetto);
    triAuto(acc, bx + lato, hTorre, bz - lato, bx + lato, hTorre, bz + lato, bx, punta, bz, tetto);
    triAuto(acc, bx + lato, hTorre, bz + lato, bx - lato, hTorre, bz + lato, bx, punta, bz, tetto);
    triAuto(acc, bx - lato, hTorre, bz + lato, bx - lato, hTorre, bz - lato, bx, punta, bz, tetto);
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

  const tetto = new THREE.Color(PALETTE.tetto);
  const tinte = PALETTE.intonaci.map((c) => new THREE.Color(c));
  const tettoTinte = tinte.map((t) => tetto.clone().lerp(t, 0.25));

  const esclusi = new Set(senzaLandmark);
  for (const b of mondo.buildings) {
    if (b.landmark && esclusi.has(b.landmark)) continue;
    estrudiEdificio(edifici, b, tinte[b.tinta % tinte.length], tettoTinte[b.tinta % tinte.length]);
  }
  porticiPiazza(edifici, mondo, esclusi);

  // superfici piatte, dal basso verso l'alto
  const cVerde = new THREE.Color(PALETTE.verde);
  const cAcqua = new THREE.Color(PALETTE.acqua);
  const cPiazza = new THREE.Color(PALETTE.piazza);
  const cParcheggio = new THREE.Color('#C4C0C6');
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

  return { edifici: edifici.build(), suolo: suolo.build() };
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
