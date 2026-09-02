'use client';

// Carica public/lugo/map.json e lo de-quantizza (decimetri → metri) in
// strutture runtime pronte per la generazione mesh e per la fisica.
// Il caricamento è un singleton sospendibile: i componenti lo consumano
// con `use()` dentro un Suspense.

import { use } from 'react';
import { asset } from '@/lib/asset';
import { corridoiVarco, filePilastriCorte, segmentiPilastro, spezzaConVarchi } from './gates';
import { caricaSchedeAttivita } from './attivita';
import type { LugoMap, ClasseStrada, PoiMap, TipoArredo } from './types';

export interface StradaRT {
  classe: ClasseStrada;
  larghezza: number;
  nome?: string;
  /** Anello di rotonda. */
  rotonda: boolean;
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
  /**
   * Altezza dell'ostacolo in metri, ed è la marcatura degli OSTACOLI BASSI:
   * ASSENTE vuol dire infinita, cioè invalicabile. Tutto il costruito —
   * edifici, recinzioni, pilastri del Pavaglione, auto in sosta — nasce
   * senza `h` e resta un muro anche per chi salta: nessun chiamante
   * esistente deve toccare una riga. La ricevono SOLO gli arredi bassi
   * scavalcabili (panchine, fioriere), con la misura presa dalla geometria
   * disegnata in imperfezioni.ts, e chi risolve le collisioni dichiarando
   * la propria quota (risolviCerchio con quotaY) ci passa sopra quando
   * quota ≥ h.
   */
  h?: number;
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
  /** Tetto a falde (dal dato, o dall'euristica per le mappe vecchie). */
  falde: boolean;
  chiesa: boolean;
  /** Colore di facciata dichiarato in OSM, se presente. */
  colore?: string;
  landmark?: string;
  collider: ColliderRT;
}

export interface AreaRT {
  kind: 'verde' | 'acqua' | 'piazza' | 'parcheggio';
  poly: Float32Array;
}

export interface NegozioRT {
  nome: string;
  categoria: string;
  x: number;
  z: number;
  /**
   * Il valore grezzo di shop=* o amenity=* da OpenStreetMap, quando la
   * mappa lo porta. È un dato pubblico, e serve a scegliere il simbolo di
   * mestiere: la categoria del gioco schiaccia due terzi delle botteghe in
   * "negozio", e senza questo campo mezza Lugo porterebbe lo stesso
   * sacchetto sull'insegna.
   */
  osm?: string;
}

export interface ArredoRT {
  tipo: TipoArredo;
  x: number;
  z: number;
}

export interface MondoLugo {
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  roads: StradaRT[];
  buildings: EdificioRT[];
  aree: AreaRT[];
  rail: Float32Array[];
  poi: Map<string, PoiMap & { xm: number; zm: number }>;
  negozi: NegozioRT[];
  arredi: ArredoRT[];
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
  // varchi veri al centro dei lati: lì la facciata si apre lungo un
  // CORRIDOIO che va da fuori fino a dentro la corte. L'anello della corte,
  // invece, di muro non ne ha PROPRIO: il loggiato è disegnato aperto fra i
  // pilastri su tutte le arcate, e la versione precedente — muro continuo
  // con quattro tagli — faceva sbattere il giocatore contro un vetro
  // invisibile sotto ogni arco che vedeva spalancato. Ora il collider dice
  // la stessa cosa del disegno: la facciata piena resta piena (le arcate
  // esterne sono CIECHE, con le vetrine), i pilastri sono solidi uno per
  // uno, e fra pilastro e pilastro si passa.
  const corridoi = b.landmark === 'pavaglione' ? corridoiVarco(fp, fori[0] ?? null) : null;
  // la corte del Pavaglione è ad arcata aperta: niente muro al suo posto
  const anelloAperto = corridoi && fori.length > 0 ? fori[0] : null;
  const segArr: number[] = [];
  for (const a of [fp, ...fori]) {
    if (a === anelloAperto) continue;
    const n = a.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = a[i * 2];
      const az = a[i * 2 + 1];
      const bx = a[j * 2];
      const bz = a[j * 2 + 1];
      if (corridoi) {
        for (const [t0, t1] of spezzaConVarchi(ax, az, bx, bz, corridoi).fuori) {
          segArr.push(
            ax + (bx - ax) * t0, az + (bz - az) * t0,
            ax + (bx - ax) * t1, az + (bz - az) * t1,
          );
        }
        continue;
      }
      segArr.push(ax, az, bx, bz);
    }
  }
  if (corridoi && anelloAperto) {
    // gli STESSI pilastri che Landmarks disegna, quadrato per quadrato
    for (const fila of filePilastriCorte(fp, anelloAperto, corridoi)) {
      for (const p of fila.fronte) if (p) segmentiPilastro(p, segArr);
      for (const p of fila.arretrata) if (p) segmentiPilastro(p, segArr);
    }
  }
  const segs = new Float32Array(segArr);
  return { tipo: 'edges', cx: 0, cz: 0, hw: 0, hd: 0, cos: 1, sin: 0, segs, minX, minZ, maxX, maxZ };
}

async function carica(): Promise<MondoLugo> {
  // le schede di presentazione delle attività viaggiano insieme alla mappa,
  // così il registro nasce già con i dati autorizzati (se ce ne sono)
  const [res] = await Promise.all([
    fetch(asset('/lugo/map.json')),
    caricaSchedeAttivita(asset('')),
  ]);
  if (!res.ok) throw new Error('mappa di Lugo non trovata (' + res.status + ')');
  const raw = (await res.json()) as LugoMap;

  const buildings: EdificioRT[] = raw.buildings.map((b) => {
    const fp = toMeters(b.fp);
    const fori = (b.fori ?? []).map(toMeters);
    // mappe vecchie senza il campo: euristica (case basse e non troppo grandi)
    let falde: boolean;
    if (b.falde !== undefined) falde = b.falde === 1;
    else {
      let area = 0;
      const n = fp.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += fp[i * 2] * fp[j * 2 + 1] - fp[j * 2] * fp[i * 2 + 1];
      }
      falde = fori.length === 0 && b.h < 12 && Math.abs(area / 2) < 650;
    }
    const e: EdificioRT = {
      fp,
      fori,
      h: b.h,
      tinta: b.tinta,
      falde,
      chiesa: b.chiesa === 1,
      collider: colliderDa(b, fp, fori),
    };
    if (b.col) e.colore = b.col;
    if (b.landmark) e.landmark = b.landmark;
    return e;
  });

  const poi = new Map<string, PoiMap & { xm: number; zm: number }>();
  for (const p of raw.poi) poi.set(p.id, { ...p, xm: p.x * M, zm: p.z * M });

  // Su OpenStreetMap un monumento può essere un NODO dentro un edificio che
  // non ha nessun tag: il POI c'è, ma nessuna sagoma porta il suo nome, e il
  // luogo finisce disegnato come una casa qualunque. È così che il Teatro
  // Rossini era una palazzina come le altre. Qui il nodo adotta l'edificio
  // che lo contiene (o il più vicino a pochi metri), una volta sola, al
  // caricamento: da lì in poi il landmark esiste come per la Rocca.
  adottaEdifici(buildings, poi, ['teatro']);

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
      rotonda: r.rotonda === 1,
      pts: toMeters(r.pts),
    })),
    buildings,
    aree: raw.aree.map((a) => ({ kind: a.kind, poly: toMeters(a.poly) })),
    rail: raw.rail.map(toMeters),
    poi,
    negozi: (raw.negozi ?? []).map((s) => ({
      nome: s.n,
      categoria: s.c ?? 'negozio',
      x: s.x * M,
      z: s.z * M,
      ...(s.s ? { osm: s.s } : {}),
    })),
    arredi: (raw.arredi ?? []).map((a) => ({ tipo: a.t, x: a.x * M, z: a.z * M })),
  };
}

/** true se il punto sta dentro l'anello (ray casting). */
function dentroAnello(fp: Float32Array, x: number, z: number): boolean {
  let dentro = false;
  const n = fp.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = fp[i * 2], zi = fp[i * 2 + 1];
    const xj = fp[j * 2], zj = fp[j * 2 + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** Distanza dal centro del footprint: serve solo a scegliere il più vicino. */
function distanzaDalCentro(fp: Float32Array, x: number, z: number): number {
  let cx = 0, cz = 0;
  const n = fp.length / 2;
  for (let i = 0; i < n; i++) {
    cx += fp[i * 2];
    cz += fp[i * 2 + 1];
  }
  return Math.hypot(cx / n - x, cz / n - z);
}

/**
 * Dà il landmark del POI all'edificio che lo ospita, quando nessun edificio
 * ce l'ha già. Prima cerca chi CONTIENE il punto; se nessuno lo contiene,
 * prende il più vicino entro trenta metri — oltre non è più casa sua.
 */
function adottaEdifici(
  buildings: EdificioRT[],
  poi: Map<string, PoiMap & { xm: number; zm: number }>,
  ids: string[],
): void {
  for (const id of ids) {
    const p = poi.get(id);
    if (!p) continue;
    if (buildings.some((b) => b.landmark === id)) continue;
    let scelto: EdificioRT | null = null;
    let distanza = 30;
    for (const b of buildings) {
      if (b.landmark) continue;
      if (dentroAnello(b.fp, p.xm, p.zm)) {
        scelto = b;
        break;
      }
      const d = distanzaDalCentro(b.fp, p.xm, p.zm);
      if (d < distanza) {
        distanza = d;
        scelto = b;
      }
    }
    if (scelto) scelto.landmark = id;
  }
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
