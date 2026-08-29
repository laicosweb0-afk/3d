'use client';

// I landmark veri di Lugo, costruiti sui footprint OSM con i dettagli
// documentati: il Pavaglione (quadriportico ~131/133×82 m, arcate e quattro
// varchi al centro dei lati, logge percorribili), la Rocca Estense in
// mattoni col mastio rotondo a nord-ovest e la merlatura, la stazione con
// la pensilina, il monumento-ala a Francesco Baracca, la caserma con la
// gazzella parcheggiata. Ogni landmark è UNA mesh a vertex colors più
// qualche insegna.

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useMondo, type MondoLugo, type EdificioRT } from '@/lib/lugo/loadMap';
import { Accumulo } from '@/lib/lugo/citygen';
import { puntiVarco, vicinoAVarco, rettangoloMinimo } from '@/lib/lugo/gates';
import { puntoStradaVicino } from '@/lib/lugo/car';
import { infraGioco } from '@/lib/lugo/veicoli';
import { GazzellaMesh } from './Npcs';

const INTONACO = new THREE.Color('#E4CE8F'); // il "giallino" di Lugo
const TERRACOTTA = new THREE.Color('#B06A55'); // il salmone spento del Pavaglione nelle foto
const CREMA = new THREE.Color('#EBDCA8'); // le lesene
const PERSIANA = new THREE.Color('#3E5A3C'); // le persiane verdi
const VETRO_SCURO = new THREE.Color('#2A333E');
const BIANCO = new THREE.Color('#F4EFE3');
const COPPI = new THREE.Color('#A05A38');
const SOFFITTO = new THREE.Color('#EFE6D2');
// il mattone vero della Rocca nelle foto: bruno-tabacco, non rosso acceso
const TEATRO_MURO = new THREE.Color('#EFDFB2'); // l'intonaco chiaro del teatro
const MATTONE = new THREE.Color('#9C7258');
const MATTONE_CUPO = new THREE.Color('#7A5540');
const PIETRA = new THREE.Color('#B9AF9E');
const BRONZO = new THREE.Color('#54544A');
const GIALLO_FS = new THREE.Color('#D8B24A');

/** Parallelepipedo pieno (12 triangoli) centrato in (cx,cy,cz). */
function box(
  acc: Accumulo,
  cx: number, cy: number, cz: number,
  sx: number, sy: number, sz: number,
  c: THREE.Color,
  rotY = 0,
) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const cosR = Math.cos(rotY), sinR = Math.sin(rotY);
  const P: [number, number, number][] = [];
  for (const [ux, uy, uz] of [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
    [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
  ] as [number, number, number][]) {
    P.push([cx + ux * cosR - uz * sinR, cy + uy, cz + ux * sinR + uz * cosR]);
  }
  const faccia = (a: number, b: number, d: number, e: number, nx: number, ny: number, nz: number) => {
    const wnx = nx * cosR - nz * sinR;
    const wnz = nx * sinR + nz * cosR;
    acc.tri(...P[a], ...P[b], ...P[d], wnx, ny, wnz, c.r, c.g, c.b);
    acc.tri(...P[a], ...P[d], ...P[e], wnx, ny, wnz, c.r, c.g, c.b);
  };
  faccia(0, 1, 2, 3, 0, 0, -1);
  faccia(5, 4, 7, 6, 0, 0, 1);
  faccia(1, 5, 6, 2, 1, 0, 0);
  faccia(4, 0, 3, 7, -1, 0, 0);
  faccia(3, 2, 6, 7, 0, 1, 0);
  faccia(4, 5, 1, 0, 0, -1, 0);
}

/** Quadrilatero verticale a doppia faccia con quote diverse ai due estremi (pennacchi degli archi). */
function quadVerticale(
  acc: Accumulo,
  xa: number, za: number, ya0: number, ya1: number,
  xb: number, zb: number, yb0: number, yb1: number,
  c: THREE.Color,
) {
  let nx = zb - za;
  let nz = -(xb - xa);
  const l = Math.hypot(nx, nz) || 1;
  nx /= l;
  nz /= l;
  for (const [sx, sz] of [[nx, nz], [-nx, -nz]]) {
    acc.tri(xa, ya0, za, xb, yb0, zb, xb, yb1, zb, sx, 0, sz, c.r, c.g, c.b);
    acc.tri(xa, ya0, za, xb, yb1, zb, xa, ya1, za, sx, 0, sz, c.r, c.g, c.b);
  }
}

/** Parete verticale a doppia faccia lungo un segmento. */
function muro(
  acc: Accumulo,
  x1: number, z1: number, x2: number, z2: number,
  y0: number, y1: number,
  c: THREE.Color,
) {
  let nx = z2 - z1;
  let nz = -(x2 - x1);
  const l = Math.hypot(nx, nz) || 1;
  nx /= l;
  nz /= l;
  acc.tri(x1, y0, z1, x2, y0, z2, x2, y1, z2, nx, 0, nz, c.r, c.g, c.b);
  acc.tri(x1, y0, z1, x2, y1, z2, x1, y1, z1, nx, 0, nz, c.r, c.g, c.b);
  acc.tri(x1, y0, z1, x2, y0, z2, x2, y1, z2, -nx, 0, -nz, c.r, c.g, c.b);
  acc.tri(x1, y0, z1, x2, y1, z2, x1, y1, z1, -nx, 0, -nz, c.r, c.g, c.b);
}

/** Piano orizzontale triangolato da anello (con eventuali fori). */
function piano(
  acc: Accumulo,
  anello: Float32Array,
  fori: Float32Array[],
  y: number,
  c: THREE.Color,
  normaleGiu = false,
) {
  const contour: THREE.Vector2[] = [];
  for (let i = 0; i < anello.length; i += 2) contour.push(new THREE.Vector2(anello[i], anello[i + 1]));
  const holes = fori.map((f) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < f.length; i += 2) pts.push(new THREE.Vector2(f[i], f[i + 1]));
    return pts;
  });
  let tris: number[][];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, holes);
  } catch {
    return;
  }
  const tutti = contour.concat(...holes);
  const ny = normaleGiu ? -1 : 1;
  for (const [a, b, d] of tris) {
    acc.tri(tutti[a].x, y, tutti[a].y, tutti[b].x, y, tutti[b].y, tutti[d].x, y, tutti[d].y, 0, ny, 0, c.r, c.g, c.b);
  }
}

function anelloSegmenti(a: Float32Array): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const n = a.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    out.push([a[i * 2], a[i * 2 + 1], a[j * 2], a[j * 2 + 1]]);
  }
  return out;
}

function centroDi(a: Float32Array): [number, number] {
  let cx = 0, cz = 0;
  const n = a.length / 2;
  for (let i = 0; i < n; i++) {
    cx += a[i * 2];
    cz += a[i * 2 + 1];
  }
  return [cx / n, cz / n];
}

// ── Pavaglione ──────────────────────────────────────────────────────────────

function geometriaPavaglione(b: EdificioRT): THREE.BufferGeometry | null {
  const corte = b.fori[0];
  if (!corte) return null;
  const acc = new Accumulo();
  const fp = b.fp;
  const varchi = puntiVarco(fp);
  const H = 8.4;
  const H_ARCO = 5.3;
  const rect = rettangoloMinimo(fp);
  const [ccx, ccz] = centroDi(corte);

  // perimetro esterno come nelle foto: campiture terracotta ritmate da
  // lesene crema, finestre con persiane verdi al piano nobile
  const [pcx, pcz] = centroDi(fp);
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    const alVarco = vicinoAVarco(mx, mz, varchi);
    if (alVarco) {
      // ai portali l'arco reale sale quasi al cornicione
      muro(acc, x1, z1, x2, z2, 7.2, H, TERRACOTTA);
    } else {
      muro(acc, x1, z1, x2, z2, 0, H, TERRACOTTA);
    }
    const L = Math.hypot(x2 - x1, z2 - z1);
    if (L < 3) continue;
    const ex = (x2 - x1) / L;
    const ez = (z2 - z1) / L;
    // normale verso l'esterno del quadriportico
    let nx = z2 - z1;
    let nz = -(x2 - x1);
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl;
    nz /= nl;
    if (nx * (mx - pcx) + nz * (mz - pcz) < 0) {
      nx = -nx;
      nz = -nz;
    }
    // il marcapiano crema continuo che chiude il registro rosso in basso
    if (!alVarco) {
      muro(acc, x1 + nx * 0.06, z1 + nz * 0.06, x2 + nx * 0.06, z2 + nz * 0.06, 5.32, 5.7, CREMA);
    }
    const nCampi = Math.max(1, Math.round(L / 4.3));
    for (let k = 0; k <= nCampi; k++) {
      const t = k / nCampi;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      if (!vicinoAVarco(px, pz, varchi, 3.4)) {
        // lesena crema, dal suolo alla cornice
        box(acc, px + nx * 0.08, H / 2, pz + nz * 0.08, 0.52, H, 0.2, CREMA, Math.atan2(ez, ex));
      }
      // l'arcata cieca della Loggia al piano terra, tra le lesene, con la
      // sua cornice crema tutt'attorno come nelle foto da vicino
      if (k < nCampi) {
        const ta = (k + 0.5) / nCampi;
        const ax2 = x1 + (x2 - x1) * ta;
        const az2 = z1 + (z2 - z1) * ta;
        if (!vicinoAVarco(ax2, az2, varchi, 3.2)) {
          const giroY = Math.atan2(ez, ex);
          // vetrina in bruno caldo sopra lo zoccolo, mai un buco nero
          box(acc, ax2 + nx * 0.05, 1.95, az2 + nz * 0.05, 2.3, 3.1, 0.04, new THREE.Color('#4E413A'), giroY);
          box(acc, ax2 + nx * 0.06 + ex * 1.32, 1.95, az2 + nz * 0.06 + ez * 1.32, 0.34, 3.5, 0.05, CREMA, giroY);
          box(acc, ax2 + nx * 0.06 - ex * 1.32, 1.95, az2 + nz * 0.06 - ez * 1.32, 0.34, 3.5, 0.05, CREMA, giroY);
          box(acc, ax2 + nx * 0.06, 3.72, az2 + nz * 0.06, 2.98, 0.35, 0.05, CREMA, giroY);
          // il sopraluce rosso incassato tra architrave e marcapiano
          box(acc, ax2 + nx * 0.05, 4.5, az2 + nz * 0.05, 2.3, 1.0, 0.04, new THREE.Color('#A9705E'), giroY);
        }
      }
      // finestra del piano nobile al centro del campo, con le persiane
      if (k < nCampi) {
        const tw = (k + 0.5) / nCampi;
        const wx = x1 + (x2 - x1) * tw;
        const wz = z1 + (z2 - z1) * tw;
        if (vicinoAVarco(wx, wz, varchi, 3.2)) continue;
        const ox = nx * 0.07;
        const oz = nz * 0.07;
        const giroY = Math.atan2(ez, ex);
        // cornice crema dietro, poi vetro e persiane bruno-grigie (le foto
        // mostrano legno scuro, non il verde lughese generico)
        const PERSIANA_PAV = new THREE.Color('#4A423A');
        box(acc, wx + nx * 0.04, 6.55, wz + nz * 0.04, 1.9, 2.05, 0.03, CREMA, giroY);
        box(acc, wx + ox, 6.55, wz + oz, 1.0, 1.7, 0.05, VETRO_SCURO, giroY);
        box(acc, wx + ox + ex * 0.72, 6.55, wz + oz + ez * 0.72, 0.38, 1.7, 0.04, PERSIANA_PAV, giroY);
        box(acc, wx + ox - ex * 0.72, 6.55, wz + oz - ez * 0.72, 0.38, 1.7, 0.04, PERSIANA_PAV, giroY);
        box(acc, wx + ox, 5.55, wz + oz, 1.5, 0.14, 0.08, CREMA, giroY);
      }
    }
  }
  // cornice chiara in sommità (bassa quanto basta a restare sotto la falda)
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    muro(acc, x1, z1, x2, z2, H, H + 0.3, CREMA);
  }

  // il fondale chiaro della loggia: rivestimento interno con le porte
  // scure, così dalla corte non si vede il retro rosso del muro esterno
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    if (vicinoAVarco(mx, mz, varchi)) continue;
    const L = Math.hypot(x2 - x1, z2 - z1);
    if (L < 2) continue;
    const ex = (x2 - x1) / L;
    const ez = (z2 - z1) / L;
    let nx = z2 - z1;
    let nz = -(x2 - x1);
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl;
    nz /= nl;
    if (nx * (mx - pcx) + nz * (mz - pcz) < 0) {
      nx = -nx;
      nz = -nz;
    }
    // verso la corte = -n
    muro(acc, x1 - nx * 0.18, z1 - nz * 0.18, x2 - nx * 0.18, z2 - nz * 0.18, 0.1, H_ARCO, SOFFITTO);
    const giroY = Math.atan2(ez, ex);
    for (let s = 3.5; s < L - 2; s += 7) {
      box(acc, x1 + ex * s - nx * 0.24, 1.7, z1 + ez * s - nz * 0.24, 2.2, 3.2, 0.05, new THREE.Color('#3E362E'), giroY);
    }
  }

  // arcate sulla corte: pilastri ritmati + fascia degli archi;
  // sui lati corti (fonti: arcate doppie) una seconda fila arretrata
  const dirLungoX = Math.cos(rect.angle);
  const dirLungoZ = Math.sin(rect.angle);
  for (const [x1, z1, x2, z2] of anelloSegmenti(corte)) {
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    const L = Math.hypot(x2 - x1, z2 - z1);
    // la fascia sopra gli archi della corte è rosata come l'esterno
    muro(acc, x1, z1, x2, z2, H_ARCO, H, new THREE.Color('#B06A54'));
    if (L < 2) continue;
    const dx = (x2 - x1) / L;
    const dz = (z2 - z1) / L;
    // il lato è "corto" se corre perpendicolare all'asse lungo del rettangolo
    const lungoIlLungo = Math.abs(dx * dirLungoX + dz * dirLungoZ);
    const doppia = lungoIlLungo < 0.5;
    // fuori dalla corte = verso la loggia
    let fx = ccx - mx;
    let fz = ccz - mz;
    const fl = Math.hypot(fx, fz) || 1;
    fx = -fx / fl;
    fz = -fz / fl;
    // pilastri fino alla linea d'imposta, poi gli ARCHI: pennacchi curvi
    // che salgono dal capitello alla fascia — è il ritmo vero del Pavaglione
    const IMPOSTA = 4.15;
    // il ritmo fitto delle arcate vere: un pilastro ogni ~3.6 m
    const nPil = Math.max(1, Math.round(L / 3.6));
    const posPil: (null | [number, number])[] = [];
    for (let k = 0; k <= nPil; k++) {
      const t = k / nPil;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      if (vicinoAVarco(px, pz, varchi, 4)) {
        posPil.push(null);
        continue;
      }
      posPil.push([px, pz]);
      box(acc, px, IMPOSTA / 2, pz, 0.72, IMPOSTA, 0.72, BIANCO);
      box(acc, px, IMPOSTA + 0.08, pz, 0.9, 0.16, 0.9, BIANCO); // capitello
      if (doppia) box(acc, px + fx * 3.1, IMPOSTA / 2, pz + fz * 3.1, 0.6, IMPOSTA, 0.6, BIANCO);
      // la finestrella del registro sopra ogni campata, verso la corte
      if (k < nPil) {
        const tf = (k + 0.5) / nPil;
        const fxm = x1 + (x2 - x1) * tf;
        const fzm = z1 + (z2 - z1) * tf;
        box(acc, fxm - fx * 0.06, 6.6, fzm - fz * 0.06, 0.9, 0.7, 0.05, new THREE.Color('#3A342C'), Math.atan2(dz, dx));
      }
    }
    for (let k = 0; k + 1 < posPil.length; k++) {
      const pa = posPil[k];
      const pb = posPil[k + 1];
      if (!pa || !pb) continue;
      const salita = H_ARCO - IMPOSTA;
      const passi = 6;
      for (let s2 = 0; s2 < passi; s2++) {
        const tA = s2 / passi;
        const tB = (s2 + 1) / passi;
        const xa = pa[0] + (pb[0] - pa[0]) * tA;
        const za = pa[1] + (pb[1] - pa[1]) * tA;
        const xb = pa[0] + (pb[0] - pa[0]) * tB;
        const zb = pa[1] + (pb[1] - pa[1]) * tB;
        const ya = IMPOSTA + salita * Math.sin(Math.PI * tA);
        const yb = IMPOSTA + salita * Math.sin(Math.PI * tB);
        // il pennacchio riempie dall'arco fino alla fascia: crema come i
        // pilastri, così la curva dell'arco resta leggibile
        quadVerticale(acc, xa, za, ya, H_ARCO, xb, zb, yb, H_ARCO, CREMA);
      }
    }
  }

  // ── il tetto a padiglione: doppia falda di coppi con il colmo a metà
  // dell'anello, come si vede nelle foto aeree. Le falde si costruiscono
  // sul rettangolo minimo (il quadriportico è regolare), gli angoli fanno
  // da displuvi da soli perché gli anelli condividono i vertici.
  const COPPI_EST = new THREE.Color('#A05A4C');
  const COPPI_INT = new THREE.Color('#AA6355');
  const ux = Math.cos(rect.angle);
  const uzA = Math.sin(rect.angle);
  const vxA = -uzA;
  const vzA = ux;
  // estensione E CENTRO della corte nel sistema di assi del rettangolo
  // esterno: la corte vera è decentrata di ~1 m, l'anello va centrato su
  // di lei o resta scoperta una striscia di sottotetto
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < corte.length; i += 2) {
    const du = (corte[i] - rect.cx) * ux + (corte[i + 1] - rect.cz) * uzA;
    const dv = (corte[i] - rect.cx) * vxA + (corte[i + 1] - rect.cz) * vzA;
    minU = Math.min(minU, du);
    maxU = Math.max(maxU, du);
    minV = Math.min(minV, dv);
    maxV = Math.max(maxV, dv);
  }
  const cU = (minU + maxU) / 2;
  const cV = (minV + maxV) / 2;
  const angoli = (offU: number, offV: number, hw: number, hd: number): [number, number][] => {
    const ox2 = rect.cx + ux * offU + vxA * offV;
    const oz2 = rect.cz + uzA * offU + vzA * offV;
    return [
      [ox2 + ux * hw + vxA * hd, oz2 + uzA * hw + vzA * hd],
      [ox2 - ux * hw + vxA * hd, oz2 - uzA * hw + vzA * hd],
      [ox2 - ux * hw - vxA * hd, oz2 - uzA * hw - vzA * hd],
      [ox2 + ux * hw - vxA * hd, oz2 + uzA * hw - vzA * hd],
    ];
  };
  const esterno = angoli(0, 0, rect.hw + 0.9, rect.hd + 0.9);
  const interno = angoli(cU, cV, (maxU - minU) / 2 - 0.7, (maxV - minV) / 2 - 0.7);
  const colmo: [number, number][] = esterno.map((p, i) => [
    (p[0] + interno[i][0]) / 2,
    (p[1] + interno[i][1]) / 2,
  ]);
  const Y_GRONDA = H + 0.15;
  const Y_COLMO = H + 2.6;
  const falda = (
    a: [number, number], b: [number, number], ya: number,
    c: [number, number], d: [number, number], yc: number,
    tinta: THREE.Color,
  ) => {
    // normale vera della falda, per la luce radente
    const e1x = b[0] - a[0], e1y = 0, e1z = b[1] - a[1];
    const e2x = d[0] - a[0], e2y = yc - ya, e2z = d[1] - a[1];
    let nx2 = e1y * e2z - e1z * e2y;
    let ny2 = e1z * e2x - e1x * e2z;
    let nz2 = e1x * e2y - e1y * e2x;
    const nl2 = Math.hypot(nx2, ny2, nz2) || 1;
    nx2 /= nl2; ny2 /= nl2; nz2 /= nl2;
    if (ny2 < 0) { nx2 = -nx2; ny2 = -ny2; nz2 = -nz2; }
    acc.tri(a[0], ya, a[1], b[0], ya, b[1], c[0], yc, c[1], nx2, ny2, nz2, tinta.r, tinta.g, tinta.b);
    acc.tri(a[0], ya, a[1], c[0], yc, c[1], d[0], yc, d[1], nx2, ny2, nz2, tinta.r, tinta.g, tinta.b);
  };
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    falda(esterno[i], esterno[j], Y_GRONDA, colmo[j], colmo[i], Y_COLMO, COPPI_EST);
    falda(colmo[i], colmo[j], Y_COLMO, interno[j], interno[i], Y_GRONDA, COPPI_INT);
  }
  // la linea di colmo chiara che disegna la doppia falda dall'alto
  const LINEA_COLMO = new THREE.Color('#C07A5E');
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const dxC = colmo[j][0] - colmo[i][0];
    const dzC = colmo[j][1] - colmo[i][1];
    const Lc = Math.hypot(dxC, dzC);
    box(
      acc,
      (colmo[i][0] + colmo[j][0]) / 2, Y_COLMO + 0.05,
      (colmo[i][1] + colmo[j][1]) / 2,
      Lc + 0.3, 0.12, 0.35, LINEA_COLMO, Math.atan2(dzC, dxC),
    );
  }
  // comignoli radi, tono su tono col manto
  const COMIGNOLO = new THREE.Color('#9C6A52');
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const Lc = Math.hypot(colmo[j][0] - colmo[i][0], colmo[j][1] - colmo[i][1]);
    for (let s = 12; s < Lc - 8; s += 24) {
      const t = s / Lc;
      box(
        acc,
        colmo[i][0] + (colmo[j][0] - colmo[i][0]) * t, Y_COLMO + 0.35,
        colmo[i][1] + (colmo[j][1] - colmo[i][1]) * t,
        0.6, 0.6, 0.6, COMIGNOLO, rect.angle,
      );
    }
  }
  // sottotetto di chiusura: sia sul footprint sia sull'intero anello del
  // tetto, così agli angoli rientranti sotto la falda si vede un soffitto
  // scuro e mai il cielo
  const SOTTOTETTO = new THREE.Color('#6E5A4C');
  piano(acc, fp, [corte], H + 0.1, SOTTOTETTO);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quadVerticale(acc, esterno[i][0], esterno[i][1], H + 0.08, H + 0.09, esterno[j][0], esterno[j][1], H + 0.08, H + 0.09, SOTTOTETTO);
    acc.tri(esterno[i][0], H + 0.08, esterno[i][1], esterno[j][0], H + 0.08, esterno[j][1], interno[j][0], H + 0.08, interno[j][1], 0, -1, 0, SOTTOTETTO.r, SOTTOTETTO.g, SOTTOTETTO.b);
    acc.tri(esterno[i][0], H + 0.08, esterno[i][1], interno[j][0], H + 0.08, interno[j][1], interno[i][0], H + 0.08, interno[i][1], 0, -1, 0, SOTTOTETTO.r, SOTTOTETTO.g, SOTTOTETTO.b);
  }
  piano(acc, fp, [corte], H_ARCO, SOFFITTO, true);

  // ── i portali monumentali: lesene binate, arco alto due piani con la
  // lunetta rossa, trabeazione e timpano chiuso che rompe la gronda
  // (foto da Corso Mazzini e dal lato Martiri)
  const CAMPO_TIMPANO = new THREE.Color('#A9503A');
  const LUNETTA = new THREE.Color('#8F4A3C');
  const portale = (vx2: number, vz2: number, cieco: boolean) => {
    // normale del lato: dal centro verso il punto, sull'asse dominante
    let dnx = vx2 - rect.cx;
    let dnz = vz2 - rect.cz;
    const suU = Math.abs(dnx * ux + dnz * uzA) / (Math.hypot(dnx, dnz) || 1);
    if (suU > 0.7) {
      const s = Math.sign(dnx * ux + dnz * uzA) || 1;
      dnx = ux * s;
      dnz = uzA * s;
    } else {
      const s = Math.sign(dnx * vxA + dnz * vzA) || 1;
      dnx = vxA * s;
      dnz = vzA * s;
    }
    const tx2 = -dnz;
    const tz2 = dnx;
    const giro = Math.atan2(tz2, tx2);
    const fuoriX = vx2 + dnx * 0.28;
    const fuoriZ = vz2 + dnz * 0.28;
    // lesene binate ai lati, alte fino alla trabeazione
    for (const lato of [3.1, 4.6, -3.1, -4.6]) {
      box(acc, fuoriX + tx2 * lato, 7.5 / 2, fuoriZ + tz2 * lato, 1.0, 7.5, 0.5, CREMA, giro);
    }
    // la lunetta rossa dentro l'arco alto (nei portali ciechi è l'arco
    // cieco incassato nella campitura)
    box(acc, fuoriX - dnx * 0.06, cieco ? 4.4 : 6.2, fuoriZ - dnz * 0.06, 6.0, cieco ? 5.2 : 2.0, 0.1, LUNETTA, giro);
    // trabeazione crema orizzontale su tutto l'avancorpo
    box(acc, fuoriX, 7.85, fuoriZ, 10.6, 0.7, 0.55, CREMA, giro);
    // il timpano: prisma triangolare CHIUSO (facce, spioventi e fondo)
    const yBase = H + 0.3;
    const yApice = H + 2.5;
    const mezzaL = 5.2;
    const ax3 = fuoriX + tx2 * mezzaL;
    const az3 = fuoriZ + tz2 * mezzaL;
    const bx3 = fuoriX - tx2 * mezzaL;
    const bz3 = fuoriZ - tz2 * mezzaL;
    const MEZZO_SP = 0.35;
    for (const lato of [MEZZO_SP, -MEZZO_SP]) {
      const ox2 = dnx * lato;
      const oz2 = dnz * lato;
      acc.tri(
        ax3 + ox2, yBase, az3 + oz2, bx3 + ox2, yBase, bz3 + oz2,
        fuoriX + ox2, yApice, fuoriZ + oz2,
        dnx * Math.sign(lato), 0, dnz * Math.sign(lato),
        CREMA.r, CREMA.g, CREMA.b,
      );
    }
    // spioventi e fondo che chiudono il prisma
    const chiudi = (
      px1: number, pz1: number, py1: number,
      px2: number, pz2: number, py2: number,
    ) => {
      const fx1 = px1 + dnx * MEZZO_SP, fz1 = pz1 + dnz * MEZZO_SP;
      const bx1 = px1 - dnx * MEZZO_SP, bz1 = pz1 - dnz * MEZZO_SP;
      const fx2 = px2 + dnx * MEZZO_SP, fz2 = pz2 + dnz * MEZZO_SP;
      const bx2 = px2 - dnx * MEZZO_SP, bz2 = pz2 - dnz * MEZZO_SP;
      // normale approssimata verso l'alto lungo lo spiovente
      acc.tri(fx1, py1, fz1, fx2, py2, fz2, bx2, py2, bz2, 0, 1, 0, CREMA.r, CREMA.g, CREMA.b);
      acc.tri(fx1, py1, fz1, bx2, py2, bz2, bx1, py1, bz1, 0, 1, 0, CREMA.r, CREMA.g, CREMA.b);
    };
    chiudi(ax3, az3, yBase, fuoriX, fuoriZ, yApice);
    chiudi(fuoriX, fuoriZ, yApice, bx3, bz3, yBase);
    chiudi(ax3, az3, yBase - 0.02, bx3, bz3, yBase - 0.02);
    // campo rosso del timpano, appena in rilievo sulla faccia esterna
    acc.tri(
      ax3 * 0.82 + fuoriX * 0.18 + dnx * (MEZZO_SP + 0.04), yBase + 0.25, az3 * 0.82 + fuoriZ * 0.18 + dnz * (MEZZO_SP + 0.04),
      bx3 * 0.82 + fuoriX * 0.18 + dnx * (MEZZO_SP + 0.04), yBase + 0.25, bz3 * 0.82 + fuoriZ * 0.18 + dnz * (MEZZO_SP + 0.04),
      fuoriX + dnx * (MEZZO_SP + 0.04), yApice - 0.42, fuoriZ + dnz * (MEZZO_SP + 0.04),
      dnx, 0, dnz,
      CAMPO_TIMPANO.r, CAMPO_TIMPANO.g, CAMPO_TIMPANO.b,
    );
  };
  for (const [vx2, vz2] of varchi) portale(vx2, vz2, false);
  // gli avancorpi ciechi ripetuti sui lati lunghi, come nella foto
  for (const lato of [1, -1]) {
    for (const quarto of [0.5, -0.5]) {
      portale(
        rect.cx + ux * (rect.hw * quarto) + vxA * (rect.hd * lato),
        rect.cz + uzA * (rect.hw * quarto) + vzA * (rect.hd * lato),
        true,
      );
    }
  }

  // lastrico della corte: sabbia quasi bianca, con la croce dei
  // camminamenti che unisce i quattro varchi
  const CORTE_CHIARA = new THREE.Color('#E5DED0');
  const RIGA_CORTE = new THREE.Color('#CDC5B2');
  piano(acc, corte, [], 0.16, CORTE_CHIARA);
  const rc = rettangoloMinimo(corte);
  const rux = Math.cos(rc.angle);
  const ruz = Math.sin(rc.angle);
  box(acc, rc.cx, 0.172, rc.cz, rc.hw * 1.9, 0.012, 3.0, RIGA_CORTE, rc.angle);
  box(acc, rc.cx, 0.174, rc.cz, 3.0, 0.012, rc.hd * 1.9, RIGA_CORTE, rc.angle);
  // il palco a ridosso del lato nord, con le file di sedie davanti
  let offVx = -ruz * rc.hd * 0.72;
  let offVz = rux * rc.hd * 0.72;
  if (offVz > 0) {
    // il nord è dove z mondiale decresce
    offVx = -offVx;
    offVz = -offVz;
  }
  const palcoX = rc.cx + offVx + rux * 6;
  const palcoZ = rc.cz + offVz + ruz * 6;
  box(acc, palcoX, 0.55, palcoZ, 9, 0.9, 5.2, new THREE.Color('#6E6254'), rc.angle);
  box(acc, rc.cx + offVx * 0.9 - rux * 14, 1.35, rc.cz + offVz * 0.9 - ruz * 14, 5.2, 2.7, 3.4, new THREE.Color('#7C6E5E'), rc.angle);
  const versoCorteX = -offVx / (rc.hd * 0.72);
  const versoCorteZ = -offVz / (rc.hd * 0.72);
  const SEDIE = new THREE.Color('#B8B0A1');
  for (let fila = 0; fila < 8; fila++) {
    const d = 4.2 + fila * 1.4;
    box(acc, palcoX + versoCorteX * d, 0.21, palcoZ + versoCorteZ * d, 7, 0.35, 0.35, SEDIE, rc.angle);
  }

  // il camminamento rosato che circonda il quadriportico, come dall'alto
  const ROSATO = new THREE.Color('#B08A80');
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    const L = Math.hypot(x2 - x1, z2 - z1);
    if (L < 1) continue;
    const ex = (x2 - x1) / L;
    const ez = (z2 - z1) / L;
    let nx = ez;
    let nz = -ex;
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    if (nx * (mx - pcx) + nz * (mz - pcz) < 0) {
      nx = -nx;
      nz = -nz;
    }
    const ax = x1 - ex * 4;
    const az = z1 - ez * 4;
    const bx = x2 + ex * 4;
    const bz = z2 + ez * 4;
    acc.tri(ax, 0.165, az, bx, 0.165, bz, bx + nx * 8, 0.165, bz + nz * 8, 0, 1, 0, ROSATO.r, ROSATO.g, ROSATO.b);
    acc.tri(ax, 0.165, az, bx + nx * 8, 0.165, bz + nz * 8, ax + nx * 8, 0.165, az + nz * 8, 0, 1, 0, ROSATO.r, ROSATO.g, ROSATO.b);
  }

  return acc.build();
}

// ── Rocca Estense ───────────────────────────────────────────────────────────

function geometriaRocca(b: EdificioRT): THREE.BufferGeometry {
  const acc = new Accumulo();
  const fp = b.fp;
  const H = 12.5;

  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    muro(acc, x1, z1, x2, z2, 0, H, MATTONE);
  }
  for (const foro of b.fori) {
    for (const [x1, z1, x2, z2] of anelloSegmenti(foro)) {
      muro(acc, x1, z1, x2, z2, 0, H, MATTONE);
    }
  }
  piano(acc, fp, b.fori, H, MATTONE_CUPO);

  // merlatura lungo il perimetro (ripristino del 1910, dicono le fonti)
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    const L = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.floor(L / 2.1);
    for (let k = 0; k <= n; k++) {
      const t = n > 0 ? k / n : 0.5;
      box(acc, x1 + (x2 - x1) * t, H + 0.65, z1 + (z2 - z1) * t, 1.0, 1.3, 0.7, MATTONE);
    }
  }

  // il mastio di Uguccione: torrione rotondo a nord-ovest (x e z minimi)
  let mx = fp[0];
  let mz = fp[1];
  for (let i = 0; i < fp.length; i += 2) {
    if (fp[i] + fp[i + 1] < mx + mz) {
      mx = fp[i];
      mz = fp[i + 1];
    }
  }
  const [cx, cz] = centroDi(fp);
  const dx = cx - mx;
  const dz = cz - mz;
  const dl = Math.hypot(dx, dz) || 1;
  const tx = mx + (dx / dl) * 4;
  const tz = mz + (dz / dl) * 4;
  const R = 6.2;
  const HT = 18.5;
  const lati = 14;
  for (let i = 0; i < lati; i++) {
    const a0 = (i / lati) * Math.PI * 2;
    const a1 = ((i + 1) / lati) * Math.PI * 2;
    muro(acc, tx + Math.cos(a0) * R, tz + Math.sin(a0) * R, tx + Math.cos(a1) * R, tz + Math.sin(a1) * R, 0, HT, MATTONE);
    // merli del mastio
    box(acc, tx + Math.cos(a0) * R, HT + 0.6, tz + Math.sin(a0) * R, 0.9, 1.2, 0.9, MATTONE, a0);
  }
  // copertura del mastio
  const cerchio = new Float32Array(lati * 2);
  for (let i = 0; i < lati; i++) {
    cerchio[i * 2] = tx + Math.cos((i / lati) * Math.PI * 2) * R;
    cerchio[i * 2 + 1] = tz + Math.sin((i / lati) * Math.PI * 2) * R;
  }
  piano(acc, cerchio, [], HT, MATTONE_CUPO);

  return acc.build();
}

// ── Stazione ────────────────────────────────────────────────────────────────

// ── Teatro Rossini ──────────────────────────────────────────────────────────
// Su OpenStreetMap il teatro è un nodo dentro un edificio senza tag: finché
// nessuno gliela dava, la sagoma veniva disegnata come una palazzina come le
// altre, e la missione che ti manda a ritirare il pacco "al Teatro Rossini"
// ti mandava davanti a una casa qualunque. Qui il teatro all'italiana prende
// la forma che ha: corpo intonacato con zoccolo in pietra, facciata scandita
// da lesene con frontone e tre portali, e dietro la torre scenica, il volume
// alto che ospita il palco e che si riconosce da fuori in ogni teatro.

function geometriaTeatro(
  b: EdificioRT,
  mondo: MondoLugo,
): { geo: THREE.BufferGeometry; fronte: { x: number; z: number; nx: number; nz: number } } | null {
  const fp = b.fp;
  if (fp.length < 8) return null;
  const acc = new Accumulo();
  const [cx, cz] = centroDi(fp);

  const H_ZOCCOLO = 1.15;
  const H = 10.4;
  const H_CORNICE = 0.55;
  const H_TORRE = 13.8;

  // Il fronte è il lato che dà sullo SPAZIO APERTO, non solo quello più
  // vicino a una strada: la via più vicina può passare dietro, e la
  // facciata finirebbe a un metro dal muro del vicino. Per ogni lato largo
  // abbastanza si guarda fuori a sei, dodici e diciotto metri: vince chi
  // ha più campo libero davanti, e a parità chi ha la strada più vicina.
  const fisica = infraGioco(mondo).fisica;
  let fronte: { x1: number; z1: number; x2: number; z2: number; L: number } | null = null;
  let miglior = -Infinity;
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    const L = Math.hypot(x2 - x1, z2 - z1);
    if (L < 9) continue;
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    let ox = -(z2 - z1) / L;
    let oz = (x2 - x1) / L;
    if ((mx - cx) * ox + (mz - cz) * oz < 0) {
      ox = -ox;
      oz = -oz;
    }
    let aperto = 0;
    for (const d of [6, 12, 18]) {
      if (fisica.cerchioLibero(mx + ox * d, mz + oz * d, 2)) aperto++;
    }
    const p = puntoStradaVicino(mondo, mx, mz);
    const strada = Math.hypot(p.x - mx, p.z - mz);
    const punti = aperto * 100 - strada + Math.min(L, 30) * 0.5;
    if (punti > miglior) {
      miglior = punti;
      fronte = { x1, z1, x2, z2, L };
    }
  }
  if (!fronte) return null;

  // corpo: zoccolo in pietra, intonaco sopra, cornice sporgente in cima
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    muro(acc, x1, z1, x2, z2, 0, H_ZOCCOLO, PIETRA);
    muro(acc, x1, z1, x2, z2, H_ZOCCOLO, H, TEATRO_MURO);
  }

  // Finestre sui fianchi. Senza, il teatro era un parallelepipedo cieco in
  // mezzo a case tutte finestrate: si vedeva da lontano che qualcosa non
  // andava. Il fronte le ha sue e viene saltato più sotto.
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    const L = Math.hypot(x2 - x1, z2 - z1);
    if (L < 6) continue;
    const ux = (x2 - x1) / L;
    const uz = (z2 - z1) / L;
    const mmx = (x1 + x2) / 2;
    const mmz = (z1 + z2) / 2;
    let ox = -uz;
    let oz = ux;
    if ((mmx - cx) * ox + (mmz - cz) * oz < 0) {
      ox = -ox;
      oz = -oz;
    }
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const quante = Math.max(1, Math.floor(L / 4.6));
    for (let k = 0; k < quante; k++) {
      const t = -L / 2 + (L * (k + 0.5)) / quante;
      const wx = mmx + ux * t;
      const wz = mmz + uz * t;
      box(acc, wx + ox * 0.07, 3.1, wz + oz * 0.07, 1.35, 2.3, 0.18, VETRO_SCURO, ang);
      box(acc, wx + ox * 0.11, 4.35, wz + oz * 0.11, 1.65, 0.22, 0.26, CREMA, ang);
      box(acc, wx + ox * 0.07, 7.2, wz + oz * 0.07, 1.2, 1.8, 0.18, VETRO_SCURO, ang);
    }
  }
  for (const foro of b.fori) {
    for (const [x1, z1, x2, z2] of anelloSegmenti(foro)) {
      muro(acc, x1, z1, x2, z2, 0, H, TEATRO_MURO);
    }
  }
  piano(acc, fp, b.fori, H + H_CORNICE, COPPI);

  // la cornice gira tutto intorno, appena più larga del muro
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    const L = Math.hypot(x2 - x1, z2 - z1) || 1;
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    const ang = Math.atan2(z2 - z1, x2 - x1);
    box(acc, mx, H + H_CORNICE / 2, mz, L, H_CORNICE, 0.55, CREMA, ang);
  }

  // ── la facciata ──
  const fx = fronte.x2 - fronte.x1;
  const fz = fronte.z2 - fronte.z1;
  const L = fronte.L;
  const tx = fx / L; // lungo il fronte
  const tz = fz / L;
  const mx = (fronte.x1 + fronte.x2) / 2;
  const mz = (fronte.z1 + fronte.z2) / 2;
  // la normale che guarda FUORI: quella che si allontana dal centro
  let nx = -tz;
  let nz = tx;
  if ((mx - cx) * nx + (mz - cz) * nz < 0) {
    nx = -nx;
    nz = -nz;
  }
  const ang = Math.atan2(fz, fx);

  // lesene: quattro coppie che scandiscono il fronte, come nelle facciate
  // neoclassiche dei teatri di provincia
  const quante = Math.max(4, Math.min(7, Math.round(L / 5)));
  for (let i = 0; i <= quante; i++) {
    const t = -L / 2 + (L * i) / quante;
    box(
      acc,
      mx + tx * t + nx * 0.16,
      H_ZOCCOLO + (H - H_ZOCCOLO) / 2,
      mz + tz * t + nz * 0.16,
      0.62,
      H - H_ZOCCOLO,
      0.34,
      CREMA,
      ang,
    );
  }

  // tre portali al piano terra e altrettante finestre alte sopra
  for (const k of [-1, 0, 1]) {
    const t = k * Math.min(3.6, L / 3.4);
    box(acc, mx + tx * t + nx * 0.1, 1.75, mz + tz * t + nz * 0.1, 1.9, 3.5, 0.22, VETRO_SCURO, ang);
    box(acc, mx + tx * t + nx * 0.1, 6.6, mz + tz * t + nz * 0.1, 1.5, 2.6, 0.2, VETRO_SCURO, ang);
    box(acc, mx + tx * t + nx * 0.14, 8.1, mz + tz * t + nz * 0.14, 1.9, 0.28, 0.3, CREMA, ang);
  }

  // Il frontone: il timpano triangolare sopra l'ingresso, con lo spessore
  // vero. Gli spioventi non si possono fare con una scatola — una scatola
  // ruota solo attorno al suo asse verticale, e restava una sbarra
  // orizzontale sospesa in mezzo al timpano: qui i due spioventi sono
  // quadrilateri costruiti a mano fra la faccia davanti e quella dietro.
  const semi = Math.min(L / 2, 9.5);
  const yBase = H + H_CORNICE;
  const yPunta = yBase + 2.9;
  const SP = 0.34; // mezzo spessore del timpano
  const punta = (s: number): [number, number, number] => [mx + nx * s * SP, yPunta, mz + nz * s * SP];
  const spalla = (v: number, s: number): [number, number, number] => [
    mx + tx * semi * v + nx * s * SP,
    yBase,
    mz + tz * semi * v + nz * s * SP,
  ];
  for (const s of [1, -1]) {
    const [ax, ay, az] = spalla(-1, s);
    const [bx, by, bz] = spalla(1, s);
    const [px2, py2, pz2] = punta(s);
    acc.tri(ax, ay, az, bx, by, bz, px2, py2, pz2, nx * s, 0, nz * s, CREMA.r, CREMA.g, CREMA.b);
  }
  // i due spioventi, dalla spalla alla punta
  for (const v of [1, -1]) {
    const a = spalla(v, 1);
    const b = spalla(v, -1);
    const c = punta(-1);
    const d = punta(1);
    // normale rivolta in su e verso l'esterno dello spiovente
    const uy = 0.75;
    const ux = tx * v * 0.66;
    const uz = tz * v * 0.66;
    acc.tri(...a, ...b, ...c, ux, uy, uz, BIANCO.r, BIANCO.g, BIANCO.b);
    acc.tri(...a, ...c, ...d, ux, uy, uz, BIANCO.r, BIANCO.g, BIANCO.b);
  }
  // il cornicione alla base del timpano
  box(acc, mx, yBase + 0.16, mz, semi * 2 + 0.5, 0.32, SP * 2 + 0.24, BIANCO, ang);

  // ── la torre scenica: il volume alto del palco, dietro la facciata ──
  // sta sull'altra metà dell'edificio, rientrata, e non esce mai dal
  // footprint perché si misura sul rettangolo che lo contiene
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < fp.length; i += 2) {
    minX = Math.min(minX, fp[i]);
    maxX = Math.max(maxX, fp[i]);
    minZ = Math.min(minZ, fp[i + 1]);
    maxZ = Math.max(maxZ, fp[i + 1]);
  }
  const lato = Math.min(maxX - minX, maxZ - minZ) * 0.52;
  if (lato > 5) {
    const dx = cx - mx;
    const dz = cz - mz;
    const dl = Math.hypot(dx, dz) || 1;
    const px = cx + (dx / dl) * lato * 0.25;
    const pz = cz + (dz / dl) * lato * 0.25;
    box(acc, px, H_TORRE / 2, pz, lato * 1.25, H_TORRE, lato, TEATRO_MURO, ang);
    box(acc, px, H_TORRE + 0.3, pz, lato * 1.35, 0.6, lato * 1.1, COPPI, ang);
  }

  return { geo: acc.build(), fronte: { x: mx + nx * 1.2, z: mz + nz * 1.2, nx, nz } };
}

function geometriaStazione(b: EdificioRT | null, mondo: MondoLugo): { geo: THREE.BufferGeometry; cx: number; cz: number } | null {
  const poi = mondo.poi.get('stazione');
  if (!b && !poi) return null;
  const acc = new Accumulo();

  let cx: number, cz: number, hw: number, hd: number, ang: number;
  if (b) {
    const r = rettangoloMinimo(b.fp);
    cx = r.cx; cz = r.cz; hw = Math.max(8, r.hw); hd = Math.max(5, r.hd); ang = r.angle;
  } else {
    cx = poi!.xm; cz = poi!.zm; hw = 13; hd = 5; ang = poi!.rot ?? 0;
  }
  // corpo giallo ferrovia a due piani con fasce bianche
  box(acc, cx, 4, cz, hw * 2, 8, hd * 2, GIALLO_FS, ang);
  box(acc, cx, 8.25, cz, hw * 2 + 0.6, 0.5, hd * 2 + 0.6, BIANCO, ang);
  box(acc, cx, 4.1, cz, hw * 2 + 0.15, 0.35, hd * 2 + 0.15, BIANCO, ang);
  // pensilina verso i binari (il lato più vicino alla ferrovia)
  let latoBinari = 1;
  if (mondo.rail.length) {
    const r0 = mondo.rail[0];
    const nx = -Math.sin(ang);
    const nz = Math.cos(ang);
    const versoRotaia = (r0[0] - cx) * nx + (r0[1] - cz) * nz;
    latoBinari = versoRotaia >= 0 ? 1 : -1;
  }
  const px = cx + -Math.sin(ang) * (hd + 2.2) * latoBinari;
  const pz = cz + Math.cos(ang) * (hd + 2.2) * latoBinari;
  box(acc, px, 3.5, pz, hw * 1.7, 0.22, 4.2, MATTONE_CUPO, ang);
  for (let k = -2; k <= 2; k++) {
    box(acc, px + Math.cos(ang) * k * hw * 0.4, 1.75, pz + Math.sin(ang) * k * hw * 0.4, 0.28, 3.5, 0.28, PIETRA, ang);
  }
  return { geo: acc.build(), cx, cz };
}

// ── testo su targa (CanvasTexture: nessun asset esterno) ────────────────────

function usaTarga(testo: string, sfondo: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = sfondo;
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#F5F1E6';
  ctx.font = 'bold 56px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(testo, 256, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

// ── il gruppo dei landmark ──────────────────────────────────────────────────

export function Landmarks() {
  const mondo = useMondo();

  const dati = useMemo(() => {
    const pav = mondo.buildings.find((b) => b.landmark === 'pavaglione' && b.fori.length > 0) ?? null;
    const rocca = mondo.buildings.find((b) => b.landmark === 'rocca') ?? null;
    const staz = mondo.buildings.find((b) => b.landmark === 'stazione') ?? null;
    const teatro = mondo.buildings.find((b) => b.landmark === 'teatro') ?? null;
    return {
      teatro: teatro ? geometriaTeatro(teatro, mondo) : null,
      pavaglione: pav ? geometriaPavaglione(pav) : null,
      rocca: rocca ? geometriaRocca(rocca) : null,
      stazione: geometriaStazione(staz, mondo),
      poiBaracca: mondo.poi.get('baracca') ?? null,
      poiCaserma: mondo.poi.get('caserma') ?? null,
      poiRocca: mondo.poi.get('rocca') ?? null,
      poiTeatro: mondo.poi.get('teatro') ?? null,
    };
  }, [mondo]);

  // quali landmark hanno davvero una forma propria e non sono rimasti una
  // casa come le altre: il collaudo lo controlla a ogni giro
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      landmark3d: () => ({
        pavaglione: !!dati.pavaglione,
        rocca: !!dati.rocca,
        stazione: !!dati.stazione,
        teatro: !!dati.teatro,
      }),
      // dove guarda la facciata del teatro: serve alla cartolina di collaudo
      frontTeatro: () => dati.teatro?.fronte ?? null,
    };
  }, [dati]);

  const materiale = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  const targaCaserma = useMemo(
    () => (typeof document !== 'undefined' ? usaTarga('CARABINIERI', '#1A2238') : null),
    [],
  );
  const targaStazione = useMemo(
    () => (typeof document !== 'undefined' ? usaTarga('LUGO', '#20406A') : null),
    [],
  );
  const targaTeatro = useMemo(
    () => (typeof document !== 'undefined' ? usaTarga('TEATRO ROSSINI', '#5A2430') : null),
    [],
  );

  const parcheggioGazzella = useMemo(() => {
    if (!dati.poiCaserma) return null;
    const p = puntoStradaVicino(mondo, dati.poiCaserma.xm, dati.poiCaserma.zm);
    return { x: p.x, z: p.z, yaw: p.yaw };
  }, [dati.poiCaserma, mondo]);

  // la giostrina nel parco della Rocca, come nella vista dall'alto
  const giostra = useMemo(() => {
    const rocca = mondo.poi.get('rocca');
    if (!rocca) return null;
    let best: [number, number] | null = null;
    let bestArea = 0;
    for (const a of mondo.aree) {
      if (a.kind !== 'verde') continue;
      const n = a.poly.length / 2;
      let cx = 0, cz = 0;
      for (let i = 0; i < n; i++) {
        cx += a.poly[i * 2];
        cz += a.poly[i * 2 + 1];
      }
      cx /= n;
      cz /= n;
      if (Math.hypot(cx - rocca.xm, cz - rocca.zm) > 130) continue;
      let area = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += a.poly[i * 2] * a.poly[j * 2 + 1] - a.poly[j * 2] * a.poly[i * 2 + 1];
      }
      area = Math.abs(area / 2);
      if (area > bestArea) {
        bestArea = area;
        best = [cx, cz];
      }
    }
    if (!best) return null;
    // nelle foto sta SUL lastricato accanto allo spigolo del Pavaglione
    // verso la stele: la si ancora lì, non al prato
    const bar = mondo.poi.get('baracca');
    const pav = mondo.buildings.find((b) => b.landmark === 'pavaglione' && b.fori.length > 0);
    if (!bar || !pav) return { x: best[0] + 8, z: best[1] - 6 };
    const r = rettangoloMinimo(pav.fp);
    const rux2 = Math.cos(r.angle);
    const ruz2 = Math.sin(r.angle);
    let angolo: [number, number] | null = null;
    let dMin = Infinity;
    for (const su of [1, -1]) {
      for (const sv of [1, -1]) {
        const axc = r.cx + rux2 * r.hw * su + -ruz2 * r.hd * sv;
        const azc = r.cz + ruz2 * r.hw * su + rux2 * r.hd * sv;
        const d = Math.hypot(axc - bar.xm, azc - bar.zm);
        if (d < dMin) {
          dMin = d;
          angolo = [axc, azc];
        }
      }
    }
    if (!angolo) return null;
    // 14 m fuori dallo spigolo, lungo la diagonale che esce dal centro
    let dx = angolo[0] - r.cx;
    let dz = angolo[1] - r.cz;
    const dl = Math.hypot(dx, dz) || 1;
    dx /= dl;
    dz /= dl;
    let gx = angolo[0] + dx * 14;
    let gz = angolo[1] + dz * 14;
    const dBar = Math.hypot(gx - bar.xm, gz - bar.zm);
    if (dBar < 13) {
      // mai addosso alla stele
      const s = 13 / (dBar || 1);
      gx = bar.xm + (gx - bar.xm) * s;
      gz = bar.zm + (gz - bar.zm) * s;
    }
    return { x: gx, z: gz };
  }, [mondo]);

  // il tetto a spicchi bianchi e rosa della giostra, come nelle foto
  const tettoGiostra = useMemo(() => {
    const acc = new Accumulo();
    const chiaro = new THREE.Color('#F0EAE0');
    const rosa = new THREE.Color('#C25E78');
    const R = 4.5; // il tendone vero è largo ~9 m
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2;
      const a1 = ((i + 1) / 10) * Math.PI * 2;
      const c = i % 2 ? rosa : chiaro;
      const x0 = Math.cos(a0) * R;
      const z0 = Math.sin(a0) * R;
      const x1 = Math.cos(a1) * R;
      const z1 = Math.sin(a1) * R;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const ml = Math.hypot(mx, mz) || 1;
      acc.tri(x0, 2.75, z0, x1, 2.75, z1, 0, 4.45, 0, (mx / ml) * 0.8, 0.6, (mz / ml) * 0.8, c.r, c.g, c.b);
    }
    return acc.build();
  }, []);

  // le bancarelle scure in fila lungo il fianco del Pavaglione verso la
  // stele, come nella vista aerea
  const bancarelle = useMemo(() => {
    const pav = mondo.buildings.find((b) => b.landmark === 'pavaglione' && b.fori.length > 0);
    const bar = mondo.poi.get('baracca');
    if (!pav || !bar) return [];
    const r = rettangoloMinimo(pav.fp);
    const bux = Math.cos(r.angle);
    const buz = Math.sin(r.angle);
    const bvx = -buz;
    const bvz = bux;
    const du = (bar.xm - r.cx) * bux + (bar.zm - r.cz) * buz;
    const dv = (bar.xm - r.cx) * bvx + (bar.zm - r.cz) * bvz;
    const suU = Math.abs(du) / r.hw > Math.abs(dv) / r.hd;
    const out: { x: number; z: number; rot: number }[] = [];
    // quattro banchi, passo irregolare e un filo fuori asse, come dal vivo
    for (let k = -2; k <= 1; k++) {
      const s = k * 6.8 + ((k * 37) % 5) * 0.5 + 3.4;
      const scarto = (((k * 53) % 7) - 3) * 0.27;
      if (suU) {
        const segno = Math.sign(du) || 1;
        out.push({
          x: r.cx + bux * segno * (r.hw + 6.5 + scarto) + bvx * s,
          z: r.cz + buz * segno * (r.hw + 6.5 + scarto) + bvz * s,
          rot: r.angle + Math.PI / 2,
        });
      } else {
        const segno = Math.sign(dv) || 1;
        out.push({
          x: r.cx + bvx * segno * (r.hd + 6.5 + scarto) + bux * s,
          z: r.cz + bvz * segno * (r.hd + 6.5 + scarto) + buz * s,
          rot: r.angle,
        });
      }
    }
    return out;
  }, [mondo]);

  return (
    <group name="landmark">
      {dati.pavaglione && <mesh geometry={dati.pavaglione} material={materiale} castShadow receiveShadow />}
      {dati.rocca && <mesh geometry={dati.rocca} material={materiale} castShadow receiveShadow />}
      {dati.stazione && (
        <group>
          <mesh geometry={dati.stazione.geo} material={materiale} castShadow receiveShadow />
          {targaStazione && (
            <mesh position={[dati.stazione.cx, 6.8, dati.stazione.cz]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[6, 1.1]} />
              <meshBasicMaterial map={targaStazione} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      )}

      {/* bandiera sul mastio della Rocca */}
      {dati.poiRocca && (
        <group position={[dati.poiRocca.xm, 0, dati.poiRocca.zm]}>
          <mesh position={[0, 21.5, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 5, 6]} />
            <meshLambertMaterial color="#8A8578" />
          </mesh>
          <mesh position={[0.55, 23.2, 0]}>
            <boxGeometry args={[1.0, 0.7, 0.04]} />
            <meshLambertMaterial color="#2E7D46" />
          </mesh>
          <mesh position={[1.5, 23.2, 0]}>
            <boxGeometry args={[1.0, 0.7, 0.04]} />
            <meshLambertMaterial color="#F5F1E6" />
          </mesh>
          <mesh position={[2.45, 23.2, 0]}>
            <boxGeometry args={[1.0, 0.7, 0.04]} />
            <meshLambertMaterial color="#C0362C" />
          </mesh>
        </group>
      )}

      {/* Monumento a Baracca com'è nelle viste 3D: l'alta stele-ala BIANCA
          di Rambelli sui gradini, con la statua scura dell'aviatore accanto */}
      {dati.poiBaracca && (
        <group position={[dati.poiBaracca.xm, 0, dati.poiBaracca.zm]} rotation={[0, -(dati.poiBaracca.rot ?? 0), 0]}>
          <mesh position={[0, 0.14, 0]} receiveShadow>
            <boxGeometry args={[9, 0.28, 7]} />
            <meshLambertMaterial color="#C6C0B2" />
          </mesh>
          <mesh position={[0, 0.4, 0]} receiveShadow>
            <boxGeometry args={[7, 0.26, 5.4]} />
            <meshLambertMaterial color="#CCC6B8" />
          </mesh>
          <mesh position={[0, 0.66, 0]} receiveShadow>
            <boxGeometry args={[5.2, 0.28, 4]} />
            <meshLambertMaterial color="#D2CCBE" />
          </mesh>
          {/* la stele: prisma rastremato, sottile come una lama bianca */}
          <mesh position={[-0.6, 6.8, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.28]} castShadow>
            <cylinderGeometry args={[0.4, 0.95, 12.2, 4]} />
            <meshLambertMaterial color="#E4E0D4" />
          </mesh>
          {/* l'aviatore in bronzo, in piedi accanto alla lama */}
          <mesh position={[1.7, 1.7, 0.2]} castShadow>
            <boxGeometry args={[0.55, 1.9, 0.5]} />
            <meshLambertMaterial color="#4A4A42" />
          </mesh>
          <mesh position={[1.7, 2.85, 0.2]}>
            <boxGeometry args={[0.3, 0.34, 0.3]} />
            <meshLambertMaterial color="#44443C" />
          </mesh>
        </group>
      )}

      {/* Teatro Rossini (1761, Bibiena): la targa sul prototipo del teatro all'italiana */}
      {/* Teatro Rossini: il corpo intonacato, la facciata col frontone e la
          torre scenica dietro. La targa sta SULLA facciata, non sospesa sul
          nodo di OpenStreetMap come prima. */}
      {dati.teatro && <mesh geometry={dati.teatro.geo} material={materiale} castShadow receiveShadow />}
      {targaTeatro &&
        (dati.teatro ? (
          <mesh
            position={[dati.teatro.fronte.x, 9.35, dati.teatro.fronte.z]}
            // un piano guarda il suo +Z: per farlo guardare fuori dalla
            // facciata l'angolo è atan2(nx, nz), non -atan2(nz, nx) — con
            // quello la targa restava di taglio e non si leggeva
            rotation={[0, Math.atan2(dati.teatro.fronte.nx, dati.teatro.fronte.nz), 0]}
          >
            <planeGeometry args={[6.5, 1.0]} />
            <meshBasicMaterial map={targaTeatro} side={THREE.DoubleSide} />
          </mesh>
        ) : (
          dati.poiTeatro && (
            <mesh
              position={[dati.poiTeatro.xm, 5.6, dati.poiTeatro.zm]}
              rotation={[0, -(dati.poiTeatro.rot ?? 0), 0]}
            >
              <planeGeometry args={[6.5, 1.0]} />
              <meshBasicMaterial map={targaTeatro} side={THREE.DoubleSide} />
            </mesh>
          )
        ))}

      {/* Caserma: insegna, tricolore e gazzella parcheggiata davanti */}
      {dati.poiCaserma && (
        <group position={[dati.poiCaserma.xm, 0, dati.poiCaserma.zm]}>
          {targaCaserma && (
            <mesh position={[0, 3.4, 0]} rotation={[0, -(dati.poiCaserma.rot ?? 0), 0]}>
              <planeGeometry args={[5, 0.95]} />
              <meshBasicMaterial map={targaCaserma} side={THREE.DoubleSide} />
            </mesh>
          )}
          <mesh position={[3, 3.5, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 7, 6]} />
            <meshLambertMaterial color="#8A8578" />
          </mesh>
          <mesh position={[3.5, 6.4, 0]}>
            <boxGeometry args={[0.9, 0.6, 0.04]} />
            <meshLambertMaterial color="#2E7D46" />
          </mesh>
          <mesh position={[4.35, 6.4, 0]}>
            <boxGeometry args={[0.9, 0.6, 0.04]} />
            <meshLambertMaterial color="#F5F1E6" />
          </mesh>
          <mesh position={[5.2, 6.4, 0]}>
            <boxGeometry args={[0.9, 0.6, 0.04]} />
            <meshLambertMaterial color="#C0362C" />
          </mesh>
        </group>
      )}
      {parcheggioGazzella && (
        <group
          position={[parcheggioGazzella.x, 0, parcheggioGazzella.z]}
          rotation={[0, -parcheggioGazzella.yaw, 0]}
        >
          <GazzellaMesh />
        </group>
      )}

      {/* la giostrina della festa nel parco della Rocca */}
      {giostra && (
        <group position={[giostra.x, 0, giostra.z]}>
          <mesh position={[0, 0.22, 0]} receiveShadow>
            <cylinderGeometry args={[4.2, 4.4, 0.44, 12]} />
            <meshLambertMaterial color="#C8B8A8" />
          </mesh>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 3, 6]} />
            <meshLambertMaterial color="#8A8578" />
          </mesh>
          <mesh geometry={tettoGiostra} material={materiale} castShadow />
          <mesh position={[0, 2.85, 0]}>
            <cylinderGeometry args={[4.55, 4.55, 0.18, 12]} />
            <meshLambertMaterial color="#F2EDE2" />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 2.9, 1.05, Math.sin(a) * 2.9]}>
                <boxGeometry args={[0.7, 0.5, 0.3]} />
                <meshLambertMaterial color={i % 2 ? '#E8E2D2' : '#C05A64'} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* le bancarelle del mercato lungo il fianco del Pavaglione */}
      {bancarelle.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, -b.rot, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[2.6, 0.9, 1.6]} />
            <meshLambertMaterial color="#8A7A66" />
          </mesh>
          <mesh position={[1.15, 1.45, 0.65]}>
            <boxGeometry args={[0.08, 1.3, 0.08]} />
            <meshLambertMaterial color="#4A453C" />
          </mesh>
          <mesh position={[-1.15, 1.45, -0.65]}>
            <boxGeometry args={[0.08, 1.3, 0.08]} />
            <meshLambertMaterial color="#4A453C" />
          </mesh>
          <mesh position={[0, 2.16, 0]} castShadow>
            <boxGeometry args={[3.0, 0.14, 2.0]} />
            <meshLambertMaterial color={i % 2 ? '#A34A3E' : '#D8D2C4'} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
