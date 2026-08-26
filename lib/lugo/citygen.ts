// Generazione della città: dalla mappa runtime alle mesh fuse.
// Tutto finisce in DUE geometrie non indicizzate (edifici + suolo) con
// vertex colors: due draw call per l'intera Lugo. Le superfici piatte
// (strade, verde, acqua, piazze, ferrovia) stanno su quote leggermente
// diverse per evitare z-fighting senza costi.

import * as THREE from 'three';
import { PALETTE } from './palette';
import type { MondoLugo } from './loadMap';

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

function estrudiEdificio(
  acc: Accumulo,
  fp: Float32Array,
  fori: Float32Array[],
  h: number,
  tinta: THREE.Color,
  tetto: THREE.Color,
) {
  const n = fp.length / 2;
  if (n < 3) return;

  pareti(acc, fp, h, tinta, false);
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
  for (const [a, b, c] of tris) {
    acc.tri(
      tutti[a].x, h, tutti[a].y,
      tutti[b].x, h, tutti[b].y,
      tutti[c].x, h, tutti[c].y,
      0, 1, 0,
      tetto.r, tetto.g, tetto.b,
    );
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
    estrudiEdificio(edifici, b.fp, b.fori, b.h, tinte[b.tinta % tinte.length], tettoTinte[b.tinta % tinte.length]);
  }

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
  for (const r of mondo.roads) {
    nastro(suolo, r.pts, r.larghezza, QUOTA[r.classe], cStrade[r.classe]);
  }
  for (const linea of mondo.rail) {
    nastro(suolo, linea, 1.6, QUOTA.ferrovia, cFerro);
  }

  return { edifici: edifici.build(), suolo: suolo.build() };
}
