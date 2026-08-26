'use client';

// I landmark veri di Lugo, costruiti sui footprint OSM con i dettagli
// documentati: il Pavaglione (quadriportico ~131/133×82 m, arcate e quattro
// varchi al centro dei lati, logge percorribili), la Rocca Estense in
// mattoni col mastio rotondo a nord-ovest e la merlatura, la stazione con
// la pensilina, il monumento-ala a Francesco Baracca, la caserma con la
// gazzella parcheggiata. Ogni landmark è UNA mesh a vertex colors più
// qualche insegna.

import { useMemo } from 'react';
import * as THREE from 'three';
import { useMondo, type MondoLugo, type EdificioRT } from '@/lib/lugo/loadMap';
import { Accumulo } from '@/lib/lugo/citygen';
import { puntiVarco, vicinoAVarco, rettangoloMinimo } from '@/lib/lugo/gates';
import { puntoStradaVicino } from '@/lib/lugo/car';
import { GazzellaMesh } from './Npcs';

const INTONACO = new THREE.Color('#E8D5A6');
const BIANCO = new THREE.Color('#F4EFE3');
const COPPI = new THREE.Color('#A05A38');
const SOFFITTO = new THREE.Color('#EFE6D2');
const MATTONE = new THREE.Color('#8A4632');
const MATTONE_CUPO = new THREE.Color('#6E3626');
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

  // perimetro esterno: pannelli pieni, sopra i varchi resta l'architrave
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    if (vicinoAVarco(mx, mz, varchi)) {
      muro(acc, x1, z1, x2, z2, H_ARCO, H, INTONACO);
    } else {
      muro(acc, x1, z1, x2, z2, 0, H, INTONACO);
    }
  }
  // cornice bianca in sommità
  for (const [x1, z1, x2, z2] of anelloSegmenti(fp)) {
    muro(acc, x1, z1, x2, z2, H, H + 0.5, BIANCO);
  }

  // arcate sulla corte: pilastri ritmati + fascia degli archi;
  // sui lati corti (fonti: arcate doppie) una seconda fila arretrata
  const dirLungoX = Math.cos(rect.angle);
  const dirLungoZ = Math.sin(rect.angle);
  for (const [x1, z1, x2, z2] of anelloSegmenti(corte)) {
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    const L = Math.hypot(x2 - x1, z2 - z1);
    muro(acc, x1, z1, x2, z2, H_ARCO, H, INTONACO);
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
    const nPil = Math.max(1, Math.round(L / 4.3));
    for (let k = 0; k <= nPil; k++) {
      const t = k / nPil;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      if (vicinoAVarco(px, pz, varchi, 4)) continue;
      box(acc, px, H_ARCO / 2, pz, 0.55, H_ARCO, 0.55, BIANCO);
      if (doppia) box(acc, px + fx * 3.1, H_ARCO / 2, pz + fz * 3.1, 0.5, H_ARCO, 0.5, BIANCO);
    }
  }

  // tetto a corona e soffitto della loggia
  piano(acc, fp, [corte], H + 0.5, COPPI);
  piano(acc, fp, [corte], H_ARCO, SOFFITTO, true);
  // lastrico della corte
  piano(acc, corte, [], 0.16, PIETRA);

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
    return {
      pavaglione: pav ? geometriaPavaglione(pav) : null,
      rocca: rocca ? geometriaRocca(rocca) : null,
      stazione: geometriaStazione(staz, mondo),
      poiBaracca: mondo.poi.get('baracca') ?? null,
      poiCaserma: mondo.poi.get('caserma') ?? null,
      poiRocca: mondo.poi.get('rocca') ?? null,
    };
  }, [mondo]);

  const materiale = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  const targaCaserma = useMemo(
    () => (typeof document !== 'undefined' ? usaTarga('CARABINIERI', '#1A2238') : null),
    [],
  );
  const targaStazione = useMemo(
    () => (typeof document !== 'undefined' ? usaTarga('LUGO', '#20406A') : null),
    [],
  );

  const parcheggioGazzella = useMemo(() => {
    if (!dati.poiCaserma) return null;
    const p = puntoStradaVicino(mondo, dati.poiCaserma.xm, dati.poiCaserma.zm);
    return { x: p.x, z: p.z, yaw: p.yaw };
  }, [dati.poiCaserma, mondo]);

  return (
    <group>
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

      {/* Monumento a Francesco Baracca: basamento e l'ala verticale */}
      {dati.poiBaracca && (
        <group position={[dati.poiBaracca.xm, 0, dati.poiBaracca.zm]} rotation={[0, -(dati.poiBaracca.rot ?? 0), 0]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[2.2, 2.5, 0.7, 12]} />
            <meshLambertMaterial color="#B9AF9E" />
          </mesh>
          <mesh position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[1.6, 1.9, 1.6]} />
            <meshLambertMaterial color="#ABA08C" />
          </mesh>
          <mesh position={[0, 5.1, -0.3]} rotation={[0.08, 0, 0]} castShadow>
            <boxGeometry args={[0.35, 5.4, 2.3]} />
            <meshLambertMaterial color="#54544A" />
          </mesh>
          <mesh position={[0, 3.3, 0.7]} castShadow>
            <boxGeometry args={[0.5, 1.5, 0.5]} />
            <meshLambertMaterial color="#5E5E54" />
          </mesh>
          <mesh position={[0, 4.25, 0.7]}>
            <boxGeometry args={[0.32, 0.36, 0.32]} />
            <meshLambertMaterial color="#54544A" />
          </mesh>
        </group>
      )}

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
    </group>
  );
}
