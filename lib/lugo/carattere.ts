// Il carattere di un edificio: quello che, a Lugo, distingue una casa
// dall'altra.
//
// OpenStreetMap non dichiara l'altezza per il 95% dei fabbricati di Lugo:
// la pipeline ripiegava su un valore quasi costante e ne usciva una città
// a blocchi, tutti alti uguale, tutti dello stesso giallino. Qui ogni
// edificio riceve invece un carattere completo — piani veri, materiale,
// tinta, tetto, dettagli di facciata — dedotto da dove sta, quanto è
// grande, che forma ha e se ha una bottega sotto.
//
// Tutto è DETERMINISTICO: il seme viene dal footprint, quindi la stessa
// Lugo si ricostruisce identica a ogni caricamento e su ogni dispositivo.
// Nessun Math.random.

import * as THREE from 'three';
import { MATERIALI, TETTI, PERSIANE } from './palette';
import type { MondoLugo, EdificioRT } from './loadMap';

export type Materiale = keyof typeof MATERIALI;
export type FormaTetto = 'falde' | 'padiglione' | 'piano' | 'lamiera';
export type Zona = 'centro' | 'semicentro' | 'periferia' | 'campagna';

export interface Carattere {
  zona: Zona;
  /** Piani fuori terra (1..8). */
  piani: number;
  /** Altezza del piano terra: nel centro è più alto, da bottega. */
  hTerra: number;
  /** Altezza dei piani superiori. */
  hPiano: number;
  /** Altezza totale della muratura, fino alla gronda. */
  h: number;
  materiale: Materiale;
  tinta: THREE.Color;
  zoccolo: THREE.Color;
  tetto: FormaTetto;
  tintaTetto: THREE.Color;
  /** Altezza del colmo sopra la gronda (tetti inclinati). */
  salita: number;
  /** Sporto del cornicione in metri. */
  gronda: number;
  /** Fasce marcapiano fra un piano e l'altro. */
  marcapiano: boolean;
  persiane: boolean;
  tintaPersiane: THREE.Color;
  /** Quanti piani hanno il balcone (0..2), a partire dal primo. */
  balconi: number;
  comignoli: number;
  antenna: boolean;
  condizionatori: number;
  /** Piano terra commerciale: vetrina scura e fascia dell'insegna. */
  bottega: boolean;
  /** 0 = solo volume e tinta, 1 = facciata, 2 = tutto il minuto. */
  dettaglio: 0 | 1 | 2;
  /** Quante finestre al massimo si possono disegnare. */
  budgetFinestre: number;
  /** Passo orizzontale delle finestre (m). */
  passo: number;
}

// ── caso deterministico ─────────────────────────────────────────────────────

/** Hash intero → [0,1): estrazioni indipendenti dallo stesso seme. */
function estrai(seme: number, k: number): number {
  let x = (seme ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Seme dal footprint: stabile, unico, indipendente dall'ordine di caricamento. */
function semeDa(b: EdificioRT): number {
  const fp = b.fp;
  let s = (fp.length * 2654435761) | 0;
  for (let i = 0; i < fp.length; i++) s = (Math.imul(s, 31) + Math.round(fp[i] * 10)) | 0;
  return (s ^ Math.imul(b.tinta + 1, 0x27d4eb2d)) >>> 0;
}

/** Estrazione a pesi: `pesi[i]` è la probabilità relativa dell'indice i. */
function pesato(r: number, pesi: readonly number[]): number {
  let tot = 0;
  for (const p of pesi) tot += p;
  let acc = r * tot;
  for (let i = 0; i < pesi.length; i++) {
    acc -= pesi[i];
    if (acc < 0) return i;
  }
  return pesi.length - 1;
}

/** Tinta dalla famiglia del materiale, con scarto di tono casa per casa. */
function tinge(famiglia: readonly string[], r1: number, r2: number, r3: number): THREE.Color {
  const c = new THREE.Color(famiglia[Math.floor(r1 * famiglia.length) % famiglia.length]);
  // lo scarto è piccolo ma basta perché due case vicine non siano gemelle
  c.offsetHSL((r2 - 0.5) * 0.024, (r3 - 0.5) * 0.13, (r1 - 0.5) * 0.085);
  return c;
}

// ── zone e mestieri ─────────────────────────────────────────────────────────

/** Pesi dei piani (1..6) per zona: il centro è alto, la campagna è bassa. */
const PIANI_ZONA: Record<Zona, readonly number[]> = {
  centro: [2, 12, 34, 32, 14, 6],
  semicentro: [6, 32, 40, 18, 4, 0],
  periferia: [18, 50, 26, 6, 0, 0],
  campagna: [42, 44, 13, 1, 0, 0],
};

/** Pesi dei materiali per zona, nell'ordine di MATERIALI. */
const MAT_ZONA: Record<Zona, readonly number[]> = {
  //          intonaco mattone pietra cemento metallo legno
  centro: [76, 13, 5, 6, 0, 0],
  semicentro: [69, 14, 2, 13, 2, 0],
  periferia: [58, 15, 1, 18, 7, 1],
  campagna: [48, 24, 1, 14, 9, 4],
};

const NOMI_MAT = Object.keys(MATERIALI) as Materiale[];

// ── contesto della città ────────────────────────────────────────────────────

export interface ContestoCitta {
  /** Centro storico (il Pavaglione), in metri. */
  cx: number;
  cz: number;
  /** Bordi delle piazze del centro, per il test di affaccio. */
  piazze: Float32Array[];
  /** Posizioni delle botteghe vere, per marcare i piani terra commerciali. */
  botteghe: { x: number; z: number }[];
}

export function preparaContesto(mondo: MondoLugo): ContestoCitta {
  const pav = mondo.poi.get('pavaglione');
  const cx = pav ? pav.xm : 0;
  const cz = pav ? pav.zm : 0;
  const piazze: Float32Array[] = [];
  for (const a of mondo.aree) {
    if (a.kind !== 'piazza') continue;
    let px = 0, pz = 0;
    const n = a.poly.length / 2;
    for (let i = 0; i < n; i++) {
      px += a.poly[i * 2];
      pz += a.poly[i * 2 + 1];
    }
    if (Math.hypot(px / n - cx, pz / n - cz) < 190) piazze.push(a.poly);
  }
  return { cx, cz, piazze, botteghe: mondo.negozi.map((n) => ({ x: n.x, z: n.z })) };
}

/** L'edificio affaccia su una delle piazze del centro? */
function affacciaSuPiazza(ctx: ContestoCitta, px: number, pz: number): boolean {
  for (const poly of ctx.piazze) {
    const n = poly.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = poly[i * 2], az = poly[i * 2 + 1];
      const dx = poly[j * 2] - ax, dz = poly[j * 2 + 1] - az;
      const L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
      const qx = ax + dx * t - px;
      const qz = az + dz * t - pz;
      if (qx * qx + qz * qz < 900) return true;
    }
  }
  return false;
}

// ── geometria di comodo ─────────────────────────────────────────────────────

export function centroide(fp: Float32Array): { x: number; z: number } {
  const n = fp.length / 2;
  let x = 0, z = 0;
  for (let i = 0; i < n; i++) {
    x += fp[i * 2];
    z += fp[i * 2 + 1];
  }
  return { x: x / n, z: z / n };
}

export function areaPoligono(fp: Float32Array): number {
  const n = fp.length / 2;
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    a += fp[j * 2] * fp[i * 2 + 1] - fp[i * 2] * fp[j * 2 + 1];
  }
  return Math.abs(a) / 2;
}

// ── il carattere ────────────────────────────────────────────────────────────

/**
 * Deduce il carattere di un edificio. `b.h` viene rispettata solo quando
 * dice davvero qualcosa: la pipeline OSM, in mancanza di dati, riempie la
 * banda 5.5–9.7 m con un valore quasi costante, ed è proprio quella banda
 * che rendeva Lugo una scacchiera.
 */
export function carattereDi(b: EdificioRT, ctx: ContestoCitta): Carattere {
  const s = semeDa(b);
  const c = centroide(b.fp);
  const area = areaPoligono(b.fp);
  const dist = Math.hypot(c.x - ctx.cx, c.z - ctx.cz);
  // soglie tarate sui dati veri: il 90% dei fabbricati mappati sta fra i
  // 300 e i 1100 m dal Pavaglione, e 55 botteghe su 65 entro i 400
  const zona: Zona =
    dist < 400 ? 'centro' : dist < 700 ? 'semicentro' : dist < 1050 ? 'periferia' : 'campagna';

  const suPiazza = ctx.piazze.length > 0 && affacciaSuPiazza(ctx, c.x, c.z);
  // la bottega si cerca dentro l'ingombro vero, non attorno al baricentro:
  // su un isolato lungo il centroide può stare a decine di metri dal negozio
  const bb = b.collider;
  let bottegaVicina = false;
  for (const n of ctx.botteghe) {
    if (n.x > bb.minX - 8 && n.x < bb.maxX + 8 && n.z > bb.minZ - 8 && n.z < bb.maxZ + 8) {
      bottegaVicina = true;
      break;
    }
  }

  // altezza dichiarata credibile: fuori dalla banda di ripiego della pipeline
  const dichiarata = b.h < 5.4 || b.h > 9.7;
  const rimessa = area < 46 && !b.chiesa;
  const capannone = area > 780 && zona !== 'centro' && !b.chiesa;

  // ── piani ──
  let piani: number;
  let hPiano: number;
  let hTerra: number;
  if (b.chiesa) {
    piani = 1;
    hPiano = Math.max(9, b.h);
    hTerra = hPiano;
  } else if (rimessa) {
    piani = 1;
    hPiano = 2.5 + estrai(s, 1) * 1.1;
    hTerra = hPiano;
  } else if (capannone) {
    piani = 1;
    hPiano = 6.0 + estrai(s, 2) * 3.6;
    hTerra = hPiano;
  } else if (dichiarata) {
    // l'altezza vera comanda, ma la si divide in piani per la facciata
    piani = Math.max(1, Math.min(8, Math.round(b.h / 3.15)));
    hPiano = b.h / piani;
    hTerra = hPiano;
  } else {
    piani = pesato(estrai(s, 3), PIANI_ZONA[zona]) + 1;
    if (suPiazza) piani = Math.max(3, Math.min(5, piani + 1));
    // un fabbricato minuscolo non fa cinque piani
    if (area < 90) piani = Math.min(piani, 3);
    if (area < 65) piani = Math.min(piani, 2);
    hPiano = 2.86 + estrai(s, 4) * 0.56;
    const alto = suPiazza || zona === 'centro' || bottegaVicina;
    hTerra = hPiano + (alto ? 0.7 + estrai(s, 5) * 0.6 : 0.1 + estrai(s, 5) * 0.4);
  }
  const h = hTerra + (piani - 1) * hPiano;

  // ── materiale e tinta ──
  let materiale: Materiale;
  if (capannone) materiale = estrai(s, 6) < 0.62 ? 'metallo' : 'cemento';
  else if (rimessa) materiale = NOMI_MAT[pesato(estrai(s, 6), [30, 26, 0, 18, 16, 10])];
  else if (b.chiesa) materiale = estrai(s, 6) < 0.5 ? 'mattone' : 'pietra';
  else materiale = NOMI_MAT[pesato(estrai(s, 6), MAT_ZONA[zona])];

  const famiglia = MATERIALI[materiale];
  const tinta = b.colore
    ? new THREE.Color(b.colore)
    : tinge(famiglia, estrai(s, 7), estrai(s, 8), estrai(s, 9));
  // lo zoccolo: pietra chiara sull'intonaco, tinta unita altrove
  const zoccolo =
    materiale === 'intonaco'
      ? tinta.clone().lerp(new THREE.Color('#8E8778'), 0.55)
      : tinta.clone().multiplyScalar(0.72);

  // ── tetto ──
  let tetto: FormaTetto;
  const quadrato = area > 130 && b.fp.length / 2 <= 12;
  if (capannone) tetto = estrai(s, 10) < 0.5 ? 'lamiera' : 'piano';
  else if (materiale === 'metallo') tetto = 'lamiera';
  else if (materiale === 'cemento' && zona !== 'centro') tetto = estrai(s, 10) < 0.34 ? 'piano' : 'falde';
  else if (piani >= 5 && estrai(s, 10) < 0.24) tetto = 'piano';
  else if (quadrato && estrai(s, 11) < 0.44) tetto = 'padiglione';
  else if (!b.falde && estrai(s, 10) < 0.3) tetto = 'piano';
  else tetto = 'falde';
  // un isolato col cortile, a Lugo, ha sempre l'anello di coppi attorno
  // alla corte: mai la piastra piatta
  if (b.fori.length > 0 && tetto !== 'falde' && tetto !== 'padiglione') {
    tetto = quadrato ? 'padiglione' : 'falde';
  }

  const tintaTetto =
    tetto === 'piano'
      ? tinge(TETTI.guaina, estrai(s, 12), estrai(s, 13), estrai(s, 14))
      : tetto === 'lamiera'
        ? tinge(TETTI.lamiera, estrai(s, 12), estrai(s, 13), estrai(s, 14))
        : tinge(TETTI.coppo, estrai(s, 12), estrai(s, 13), estrai(s, 14));

  // ── dettaglio: fitto dove si cammina, sobrio in lontananza ──
  const dettaglio: 0 | 1 | 2 =
    dist < 520 || suPiazza || bottegaVicina ? 2 : dist < 950 ? 1 : 0;

  const bottega = !rimessa && !capannone && !b.chiesa && (bottegaVicina || suPiazza || (zona === 'centro' && estrai(s, 15) < 0.34));

  return {
    zona,
    piani,
    hTerra,
    hPiano,
    h,
    materiale,
    tinta,
    zoccolo,
    tetto,
    tintaTetto,
    salita: tetto === 'piano' ? 0 : tetto === 'lamiera' ? 0.55 + estrai(s, 16) * 0.8 : 1.5 + estrai(s, 16) * 2.1,
    gronda: tetto === 'piano' ? 0.12 + estrai(s, 17) * 0.16 : 0.24 + estrai(s, 17) * 0.36,
    marcapiano: dettaglio >= 1 && piani >= 2 && materiale !== 'metallo' && estrai(s, 18) < 0.62,
    persiane: dettaglio >= 1 && materiale !== 'metallo' && !capannone && estrai(s, 19) < 0.72,
    tintaPersiane: tinge(PERSIANE, estrai(s, 20), estrai(s, 21), estrai(s, 22)),
    balconi: dettaglio === 2 && piani >= 3 && !capannone ? (estrai(s, 23) < 0.34 ? 2 : estrai(s, 23) < 0.66 ? 1 : 0) : 0,
    comignoli: tetto === 'falde' || tetto === 'padiglione' ? 1 + Math.floor(estrai(s, 24) * 2.4) : 0,
    antenna: dettaglio >= 1 && !capannone && estrai(s, 25) < 0.45,
    condizionatori: dettaglio === 2 && piani >= 2 ? Math.floor(estrai(s, 26) * 3.2) : 0,
    bottega,
    dettaglio,
    budgetFinestre: dettaglio === 2 ? 34 : dettaglio === 1 ? 18 : 8,
    passo: 3.0 + estrai(s, 27) * 1.5,
  };
}

// ── registro della città ────────────────────────────────────────────────────

const CACHE = new WeakMap<MondoLugo, Map<EdificioRT, Carattere>>();

/**
 * Il carattere di TUTTI gli edifici, calcolato una volta sola per mondo.
 * Lo usano la generazione delle mesh, le insegne e l'arredo urbano, così
 * tende e cartelli finiscono sempre alla quota giusta della loro facciata.
 */
export function caratteriCitta(mondo: MondoLugo): Map<EdificioRT, Carattere> {
  const gia = CACHE.get(mondo);
  if (gia) return gia;
  const ctx = preparaContesto(mondo);
  const m = new Map<EdificioRT, Carattere>();
  for (const b of mondo.buildings) m.set(b, carattereDi(b, ctx));
  CACHE.set(mondo, m);
  return m;
}
