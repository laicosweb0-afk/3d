// Le auto degli altri: parcheggiate lungo le vie residenziali (solide, coi
// loro collider) e un filo di traffico civile che percorre le strade
// lunghe. Qui vive anche l'infrastruttura condivisa del mondo fisico: una
// sola spatial hash per giocatore, pedoni e ostacoli.

import type { MondoLugo, StradaRT } from './loadMap';
import { MondoFisico } from './physics';

export const TINTE_PARCO = [
  '#D8D5CE', '#9A9AA2', '#5A6470', '#22366E', '#8A2E28', '#3A3A40', '#C8C0A8', '#6E7A64',
] as const;

export interface Posteggio {
  x: number;
  z: number;
  yaw: number;
  tinta: number;
}

export interface AutoCivile {
  percorso: Float32Array;
  lunghezza: number;
  s: number;
  verso: 1 | -1;
  velocita: number;
  colore: string;
  x: number;
  z: number;
  yaw: number;
}

function lcg(seme: { s: number }): number {
  seme.s = (seme.s * 1664525 + 1013904223) >>> 0;
  return seme.s / 4294967296;
}

function lunghezzaStrada(r: StradaRT): number {
  let l = 0;
  for (let i = 0; i + 3 < r.pts.length; i += 2) {
    l += Math.hypot(r.pts[i + 2] - r.pts[i], r.pts[i + 3] - r.pts[i + 1]);
  }
  return l;
}

const MAX_POSTEGGI = 170;

function creaParcheggi(mondo: MondoLugo, fisica: MondoFisico): Posteggio[] {
  const seme = { s: 20260 };
  const out: Posteggio[] = [];
  for (const r of mondo.roads) {
    if (r.classe !== 'residenziale' && r.classe !== 'servizio') continue;
    let lato = 1;
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      const ax = r.pts[i];
      const az = r.pts[i + 1];
      const dx = r.pts[i + 2] - ax;
      const dz = r.pts[i + 3] - az;
      const L = Math.hypot(dx, dz);
      if (L < 14) continue;
      const ux = dx / L;
      const uz = dz / L;
      for (let s = 9; s + 5 < L; s += 24) {
        if (out.length >= MAX_POSTEGGI) return out;
        lato = -lato;
        if (lcg(seme) > 0.55) continue;
        const off = (r.larghezza / 2 - 0.95) * lato;
        const x = ax + ux * s - uz * off;
        const z = az + uz * s + ux * off;
        if (!fisica.cerchioLibero(x, z, 1.5)) continue;
        const yaw = Math.atan2(uz * lato, ux * lato); // parcheggiata nel verso del suo lato
        out.push({ x, z, yaw, tinta: Math.floor(lcg(seme) * TINTE_PARCO.length) });
        fisica.aggiungiObb(x, z, 1.85, 0.85, yaw);
      }
    }
  }
  return out;
}

/** Distanza dal centro storico (l'origine della mappa è la Rocca). */
function distanzaDalCentro(pts: Float32Array): number {
  const i = (Math.floor(pts.length / 4) * 2) | 0;
  return Math.hypot(pts[i], pts[i + 1]);
}

function creaTraffico(mondo: MondoLugo, quante: number): AutoCivile[] {
  const seme = { s: 777001 };
  const strade = mondo.roads
    .filter((r) => (r.classe === 'secondaria' || r.classe === 'residenziale') && r.pts.length >= 6)
    .map((r) => ({ r, l: lunghezzaStrada(r), d: distanzaDalCentro(r.pts) }));

  // Le strade più lunghe di Lugo sono tutte di cintura: scegliendo solo
  // quelle, il traffico girava in periferia e il centro restava deserto.
  // Metà delle auto nasce quindi vicino al centro, su vie più corte.
  const lunghe = strade
    .filter((c) => c.l > 260)
    .sort((a, b) => b.l - a.l)
    .slice(1); // la più lunga resta alla gazzella
  const centrali = strade
    .filter((c) => c.d < 430 && c.l > 90)
    .sort((a, b) => b.l - a.l);

  const inCentro = Math.ceil(quante / 2);
  const candidate: { r: StradaRT; l: number }[] = [];
  const prese = new Set<Float32Array>();
  const aggiungi = (elenco: typeof strade, massimo: number) => {
    for (const c of elenco) {
      if (candidate.length >= massimo) break;
      if (prese.has(c.r.pts)) continue;
      prese.add(c.r.pts);
      candidate.push(c);
    }
  };
  aggiungi(centrali, inCentro);
  aggiungi(lunghe, quante);
  aggiungi(centrali, quante);

  const out: AutoCivile[] = [];
  for (let i = 0; i < quante && i < candidate.length; i++) {
    const c = candidate[i];
    out.push({
      percorso: c.r.pts,
      lunghezza: c.l,
      s: lcg(seme) * c.l,
      verso: lcg(seme) < 0.5 ? 1 : -1,
      velocita: 5.5 + lcg(seme) * 2.5,
      colore: TINTE_PARCO[Math.floor(lcg(seme) * TINTE_PARCO.length)],
      x: c.r.pts[0],
      z: c.r.pts[1],
      yaw: 0,
    });
  }
  return out;
}

const CORSIA = 1.6; // guida a destra

export function stepAutoCivile(a: AutoCivile, dt: number): void {
  a.s += a.velocita * dt * a.verso;
  if (a.s >= a.lunghezza) {
    a.s = a.lunghezza;
    a.verso = -1;
  } else if (a.s <= 0) {
    a.s = 0;
    a.verso = 1;
  }
  let resto = a.s;
  const pts = a.percorso;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const dx = pts[i + 2] - pts[i];
    const dz = pts[i + 3] - pts[i + 1];
    const l = Math.hypot(dx, dz);
    if (resto <= l || i + 4 >= pts.length) {
      const t = l > 0 ? Math.min(1, resto / l) : 0;
      const ux = (dx / (l || 1)) * a.verso;
      const uz = (dz / (l || 1)) * a.verso;
      // corsia di destra rispetto al senso di marcia
      const px = pts[i] + dx * t - uz * CORSIA;
      const pz = pts[i + 1] + dz * t + ux * CORSIA;
      a.x = px;
      a.z = pz;
      a.yaw = Math.atan2(uz, ux);
      return;
    }
    resto -= l;
  }
}

// ── infrastruttura condivisa ────────────────────────────────────────────────

export interface InfraGioco {
  fisica: MondoFisico;
  parcheggi: Posteggio[];
  traffico: AutoCivile[];
}

const cache = new WeakMap<MondoLugo, InfraGioco>();

/** Un solo mondo fisico (edifici + auto parcheggiate) per tutti i sistemi. */
export function infraGioco(mondo: MondoLugo): InfraGioco {
  let infra = cache.get(mondo);
  if (!infra) {
    const fisica = new MondoFisico(mondo);
    const parcheggi = creaParcheggi(mondo, fisica);
    const traffico = creaTraffico(mondo, 9);
    infra = { fisica, parcheggi, traffico };
    cache.set(mondo, infra);
  }
  return infra;
}
