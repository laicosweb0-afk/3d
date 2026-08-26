'use client';

// Carica public/lugo/map.json e lo de-quantizza (decimetri → metri) in
// strutture runtime pronte per la generazione mesh e per la fisica.
// Il caricamento è un singleton sospendibile: i componenti lo consumano
// con `use()` dentro un Suspense.

import { use } from 'react';
import { asset } from '@/lib/asset';
import { puntiVarco, vicinoAVarco } from './gates';
import type { LugoMap, ClasseStrada, PoiMap } from './types';

export interface StradaRT {
  classe: ClasseStrada;
  larghezza: number;
  nome?: string;
  /** [x0,z0,x1,z1,…] in metri. */
  pts: Float32Array;
}

export interface ColliderRT {
  tipo: 'obb' | 'edges';
  // OBB (metri/radianti)
  cx: number;
  cz: number;
  hw: number;
  hd: number;
  cos: number;
  sin: number;
  /** Segmenti del perimetro [x1,z1,x2,z2]×n (solo tipo 'edges'). */
  segs: Float32Array | null;
  // bbox per la spatial hash
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface EdificioRT {
  /** Footprint [x0,z0,…] in metri. */
  fp: Float32Array;
  /** Cortili del footprint (fori), in metri. */
  fori: Float32Array[];
  h: number;
  tinta: number;
  landmark?: string;
  collider: ColliderRT;
}

export interface AreaRT {
  kind: 'verde' | 'acqua' | 'piazza';
  poly: Float32Array;
}

export interface MondoLugo {
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  roads: StradaRT[];
  buildings: EdificioRT[];
  aree: AreaRT[];
  rail: Float32Array[];
  poi: Map<string, PoiMap & { xm: number; zm: number }>;
}

const M = 0.1; // dm → m

function toMeters(flat: number[]): Float32Array {
  const out = new Float32Array(flat.length);
  for (let i = 0; i < flat.length; i++) out[i] = flat[i] * M;
  return out;
}

function colliderDa(
  b: LugoMap['buildings'][number],
  fp: Float32Array,
  fori: Float32Array[],
): ColliderRT {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < fp.length; i += 2) {
    if (fp[i] < minX) minX = fp[i];
    if (fp[i] > maxX) maxX = fp[i];
    if (fp[i + 1] < minZ) minZ = fp[i + 1];
    if (fp[i + 1] > maxZ) maxZ = fp[i + 1];
  }
  if ('obb' in b.collider) {
    const [cx, cz, hw, hd, angle] = b.collider.obb;
    return {
      tipo: 'obb',
      cx: cx * M,
      cz: cz * M,
      hw: hw * M,
      hd: hd * M,
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      segs: null,
      minX,
      minZ,
      maxX,
      maxZ,
    };
  }
  // segmenti dal perimetro esterno E dai bordi dei cortili: dentro la corte
  // si cammina, contro i muri (anche interni) si sbatte. Il Pavaglione ha i
  // varchi veri al centro dei lati: lì il muro si apre.
  const varchi = b.landmark === 'pavaglione' ? puntiVarco(fp) : null;
  const anelli = [fp, ...fori];
  const segArr: number[] = [];
  for (const a of anelli) {
    const n = a.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (varchi) {
        const mx = (a[i * 2] + a[j * 2]) / 2;
        const mz = (a[i * 2 + 1] + a[j * 2 + 1]) / 2;
        if (vicinoAVarco(mx, mz, varchi)) continue;
      }
      segArr.push(a[i * 2], a[i * 2 + 1], a[j * 2], a[j * 2 + 1]);
    }
  }
  const segs = new Float32Array(segArr);
  return { tipo: 'edges', cx: 0, cz: 0, hw: 0, hd: 0, cos: 1, sin: 0, segs, minX, minZ, maxX, maxZ };
}

async function carica(): Promise<MondoLugo> {
  const res = await fetch(asset('/lugo/map.json'));
  if (!res.ok) throw new Error('mappa di Lugo non trovata (' + res.status + ')');
  const raw = (await res.json()) as LugoMap;

  const buildings: EdificioRT[] = raw.buildings.map((b) => {
    const fp = toMeters(b.fp);
    const fori = (b.fori ?? []).map(toMeters);
    const e: EdificioRT = { fp, fori, h: b.h, tinta: b.tinta, collider: colliderDa(b, fp, fori) };
    if (b.landmark) e.landmark = b.landmark;
    return e;
  });

  const poi = new Map<string, PoiMap & { xm: number; zm: number }>();
  for (const p of raw.poi) poi.set(p.id, { ...p, xm: p.x * M, zm: p.z * M });

  return {
    bounds: {
      minX: raw.bounds[0] * M,
      minZ: raw.bounds[1] * M,
      maxX: raw.bounds[2] * M,
      maxZ: raw.bounds[3] * M,
    },
    roads: raw.roads.map((r) => ({
      classe: r.classe,
      larghezza: r.larghezza,
      ...(r.nome ? { nome: r.nome } : {}),
      pts: toMeters(r.pts),
    })),
    buildings,
    aree: raw.aree.map((a) => ({ kind: a.kind, poly: toMeters(a.poly) })),
    rail: raw.rail.map(toMeters),
    poi,
  };
}

let promessa: Promise<MondoLugo> | null = null;

export function mondoLugo(): Promise<MondoLugo> {
  if (!promessa) promessa = carica();
  return promessa;
}

/** Da usare dentro un Suspense. */
export function useMondo(): MondoLugo {
  return use(mondoLugo());
}
