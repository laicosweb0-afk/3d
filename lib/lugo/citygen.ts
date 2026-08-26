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

  tri(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    nx: number, ny: number, nz: number,
    r: number, g: number, b: number,
  ) {
    // il winding deve concordare con la normale dichiarata (materiali
    // FrontSide): se il triangolo è avvolto al contrario, si scambiano B e C
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const gx = uy * vz - uz * vy;
    const gy = uz * vx - ux * vz;
    const gz = ux * vy - uy * vx;
    if (gx * nx + gy * ny + gz * nz < 0) {
      this.pos.push(ax, ay, az, cx, cy, cz, bx, by, bz);
    } else {
      this.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    }
    this.nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.col.push(r, g, b, r, g, b, r, g, b);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

const QUOTA = {
  verde: 0.05,
  acqua: 0.1,
  piazza: 0.15,
  pedonale: 0.18,
  servizio: 0.2,
  residenziale: 0.22,
  secondaria: 0.24,
  primaria: 0.26,
  ferrovia: 0.3,
} as const;

/** Poligono piatto triangolato (earcut di three) nel piano XZ alla quota y. */
function poligonoPiatto(acc: Accumulo, poly: Float32Array, y: number, colore: THREE.Color) {
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
    acc.tri(
      contour[a].x, y, contour[a].y,
      contour[b].x, y, contour[b].y,
      contour[c].x, y, contour[c].y,
      0, 1, 0,
      colore.r, colore.g, colore.b,
    );
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

/** Pareti + finestre + zoccolo e cornicione di un anello (solo perimetro esterno). */
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
    if (nx * mx + nz * mz < 0) {
      nx = -nx;
      nz = -nz;
    }
    acc.tri(x1, 0, z1, x2, 0, z2, x2, h, z2, nx, 0, nz, tinta.r, tinta.g, tinta.b);
    acc.tri(x1, 0, z1, x2, h, z2, x1, h, z1, nx, 0, nz, tinta.r, tinta.g, tinta.b);
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
  const cFerro = new THREE.Color(PALETTE.ferrovia);
  for (const a of mondo.aree) {
    const y = QUOTA[a.kind];
    const c = a.kind === 'verde' ? cVerde : a.kind === 'acqua' ? cAcqua : cPiazza;
    poligonoPiatto(suolo, a.poly, y, c);
  }
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

  return { edifici: edifici.build(), suolo: suolo.build() };
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
