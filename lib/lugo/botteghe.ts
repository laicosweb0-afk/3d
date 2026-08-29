// Il FRONTE di ogni bottega: quale edificio la ospita, su che lato del
// footprint affaccia, su che tratto di quel lato, e a che quota il muro le
// ha preparato il posto per l'insegna.
//
// Nasce perché due sistemi diversi deducevano la stessa cosa con due regole
// diverse: citygen apre la vetrina sul lato lungo dell'edificio, Insegne
// appendeva il cartello sul muro geometricamente più vicino al nodo. In via
// Codazzi, dove la carreggiata è larga sei metri, il muro più vicino è
// quello del palazzo DI FRONTE: il cartello finiva dall'altra parte della
// strada. E la vetrina restava dietro l'angolo.
//
// Qui la regola è una sola, ed è quella giusta per chi cammina: la bottega
// sta nell'edificio che la CONTIENE, e la sua insegna dà SULLA VIA.

import type { EdificioRT, MondoLugo } from './loadMap';
import { caratteriCitta, type Carattere } from './carattere';

export interface FronteBottega {
  /** Indice in mondo.negozi. */
  negozio: number;
  /** L'edificio che la ospita, o null se non se n'è trovato nessuno. */
  edificio: EdificioRT | null;
  /** Indice del lato del footprint. */
  lato: number;
  /** Punto di mezzo del fronte, sul muro. */
  x: number;
  z: number;
  /** Normale del muro, verso fuori. */
  nx: number;
  nz: number;
  /** Versore del lato. */
  ex: number;
  ez: number;
  /** Il tratto del lato occupato, in [0,1]. */
  t0: number;
  t1: number;
  /** Larghezza del fronte in metri. */
  larghezza: number;
  /** Quota della cimasa: dove appoggia l'insegna. */
  yCimasa: number;
  /** Altezza del piano terra dell'edificio ospite. */
  hTerra: number;
}

/** L'altezza della fascia frontale, e della cornicetta che la incornicia. */
export const ALTEZZA_FASCIA = 0.72;
export const ALTEZZA_CORNICETTA = 0.14;

/**
 * Dove finisce la vetrina e comincia l'insegna. È esattamente la quota che
 * `vetrina()` in citygen.ts calcola già oggi per chiudere le vetrate: sta
 * qui perché la usino in due senza poter divergere. Prima le insegne
 * stavano a quota FISSA 2,75 m mentre la cimasa vera va da 2,20 a 3,20
 * secondo il piano terra: metà delle insegne di Lugo galleggiavano sopra la
 * loro fascia, o ci entravano dentro.
 */
export function quotaCimasa(k: Carattere): number {
  return Math.max(2.2, k.hTerra - 0.85);
}

/** Quote di ripiego per una bottega che non ha trovato nessun muro. */
const CIMASA_ORFANA = 2.6;
const TERRA_ORFANA = 3.45;

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

/** Il punto di carreggiata più vicino, per sapere da che parte è la via. */
function versoLaVia(mondo: MondoLugo, x: number, z: number): [number, number] {
  let bx = 0;
  let bz = 0;
  let best = 60 * 60;
  for (const r of mondo.roads) {
    const pts = r.pts;
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i], az = pts[i + 1];
      const dx = pts[i + 2] - ax, dz = pts[i + 3] - az;
      const L2 = dx * dx + dz * dz;
      if (L2 < 1) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const qx = ax + dx * t, qz = az + dz * t;
      const d2 = (x - qx) * (x - qx) + (z - qz) * (z - qz);
      if (d2 < best) {
        best = d2;
        bx = qx;
        bz = qz;
      }
    }
  }
  const d = Math.sqrt(best);
  if (d < 0.3) return [0, 0];
  return [(bx - x) / d, (bz - z) / d];
}

const cache = new WeakMap<MondoLugo, FronteBottega[]>();
const cachePerEdificio = new WeakMap<MondoLugo, Map<EdificioRT, FronteBottega[]>>();

/**
 * L'anagrafe dei fronti, costruita una volta per mondo. La cache non è un
 * lusso: Insegne si sospende con `use()` e React butta via i `useMemo` del
 * tentativo sospeso — è lo stesso motivo per cui ce l'hanno attivita.ts,
 * carattere.ts e veicoli.ts.
 */
export function frontiBotteghe(mondo: MondoLugo): FronteBottega[] {
  const gia = cache.get(mondo);
  if (gia) return gia;

  const caratteri = caratteriCitta(mondo);
  const grezzi: (FronteBottega & { t: number; L: number })[] = [];

  for (let indice = 0; indice < mondo.negozi.length; indice++) {
    const negozio = mondo.negozi[indice];
    const [vx, vz] = versoLaVia(mondo, negozio.x, negozio.z);

    // 1. chi ospita chi: prima chi CONTIENE il nodo, poi chi gli sta vicino
    let ospite: EdificioRT | null = null;
    let vicino: EdificioRT | null = null;
    let dVicino = 9;
    for (const b of mondo.buildings) {
      const c = b.collider;
      if (
        negozio.x < c.minX - 10 || negozio.x > c.maxX + 10 ||
        negozio.z < c.minZ - 10 || negozio.z > c.maxZ + 10
      ) {
        continue;
      }
      if (dentroAnello(b.fp, negozio.x, negozio.z)) {
        ospite = b;
        break;
      }
      const dx = Math.max(c.minX - negozio.x, 0, negozio.x - c.maxX);
      const dz = Math.max(c.minZ - negozio.z, 0, negozio.z - c.maxZ);
      const d = Math.hypot(dx, dz);
      if (d < dVicino) {
        dVicino = d;
        vicino = b;
      }
    }
    const edificio = ospite ?? vicino;

    if (!edificio) {
      grezzi.push({
        negozio: indice, edificio: null, lato: -1,
        x: negozio.x, z: negozio.z, nx: vx || 1, nz: vz || 0, ex: -(vz || 0), ez: vx || 1,
        t0: 0, t1: 1, larghezza: 4.2, yCimasa: CIMASA_ORFANA, hTerra: TERRA_ORFANA,
        t: 0.5, L: 4.2,
      });
      continue;
    }

    // 2. quale lato: quello vicino al nodo E rivolto verso la via. Il
    // secondo termine è la ragione di tutto — senza, le botteghe degli
    // isolati con cortile mettono il cartello DENTRO la corte, dove non
    // passa nessuno.
    const fp = edificio.fp;
    const n = fp.length / 2;
    let cx = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      cx += fp[i * 2];
      cz += fp[i * 2 + 1];
    }
    cx /= n;
    cz /= n;

    let scelto = -1;
    let punteggio = -Infinity;
    let sx = 0, sz = 0, snx = 1, snz = 0, sex = 0, sez = 1, st = 0.5, sL = 4;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = fp[i * 2], z1 = fp[i * 2 + 1];
      const x2 = fp[j * 2], z2 = fp[j * 2 + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const L2 = dx * dx + dz * dz;
      if (L2 < 16) continue;
      const L = Math.sqrt(L2);
      const tRaw = ((negozio.x - x1) * dx + (negozio.z - z1) * dz) / L2;
      const t = Math.max(0, Math.min(1, tRaw));
      const qx = x1 + dx * t, qz = z1 + dz * t;
      const d = Math.hypot(negozio.x - qx, negozio.z - qz);
      let nx = dz / L;
      let nz = -dx / L;
      if (nx * (qx - cx) + nz * (qz - cz) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const p = 0.65 * (1 - Math.min(1, d / 14)) + 0.35 * Math.max(0, nx * vx + nz * vz);
      if (p > punteggio) {
        punteggio = p;
        scelto = i;
        sx = qx;
        sz = qz;
        snx = nx;
        snz = nz;
        sex = dx / L;
        sez = dz / L;
        st = t;
        sL = L;
      }
    }
    if (scelto < 0) {
      grezzi.push({
        negozio: indice, edificio, lato: -1,
        x: negozio.x, z: negozio.z, nx: vx || 1, nz: vz || 0, ex: -(vz || 0), ez: vx || 1,
        t0: 0, t1: 1, larghezza: 4.2, yCimasa: CIMASA_ORFANA, hTerra: TERRA_ORFANA,
        t: 0.5, L: 4.2,
      });
      continue;
    }

    const k = caratteri.get(edificio);
    grezzi.push({
      negozio: indice, edificio, lato: scelto,
      x: sx, z: sz, nx: snx, nz: snz, ex: sex, ez: sez,
      t0: 0, t1: 1, larghezza: 0,
      yCimasa: k ? quotaCimasa(k) : CIMASA_ORFANA,
      hTerra: k ? k.hTerra : TERRA_ORFANA,
      t: st, L: sL,
    });
  }

  // 3. la spartizione del muro. Prima ogni cartello era largo 3,4 m fissi e
  // centrato sul nodo: tre botteghe attaccate sotto lo stesso portico si
  // sovrapponevano di due metri a testa. Ora il lato si divide in fette
  // contigue, una per bottega, in ordine di posizione.
  const gruppi = new Map<string, (FronteBottega & { t: number; L: number })[]>();
  for (const f of grezzi) {
    const chiave =
      f.edificio && f.lato >= 0
        ? `${indiceEdificio(mondo, f.edificio)}|${f.lato}`
        : `solo|${f.negozio}`;
    const g = gruppi.get(chiave);
    if (g) g.push(f);
    else gruppi.set(chiave, [f]);
  }

  const LARGO_MAX = 6.4;
  for (const g of gruppi.values()) {
    g.sort((a, b) => a.t - b.t);
    const L = g[0].L;
    if (g.length === 1) {
      const f = g[0];
      const largo = Math.min(LARGO_MAX, L * 0.92);
      const meta = largo / L / 2;
      f.t0 = Math.max(0.04, Math.min(0.96 - largo / L, f.t - meta));
      f.t1 = f.t0 + largo / L;
    } else {
      const fetta = 0.92 / g.length;
      g.forEach((f, q) => {
        f.t0 = 0.04 + q * fetta;
        f.t1 = f.t0 + fetta;
      });
    }
    for (const f of g) {
      f.larghezza = (f.t1 - f.t0) * L;
      // il punto di mezzo del fronte è il centro della fetta, non più la
      // proiezione del nodo: è lì che va appesa l'insegna
      if (f.edificio && f.lato >= 0) {
        const fp = f.edificio.fp;
        const n = fp.length / 2;
        const j = (f.lato + 1) % n;
        const x1 = fp[f.lato * 2], z1 = fp[f.lato * 2 + 1];
        const x2 = fp[j * 2], z2 = fp[j * 2 + 1];
        const tm = (f.t0 + f.t1) / 2;
        f.x = x1 + (x2 - x1) * tm;
        f.z = z1 + (z2 - z1) * tm;
      }
    }
  }

  const out: FronteBottega[] = grezzi.map((f) => ({
    negozio: f.negozio, edificio: f.edificio, lato: f.lato,
    x: f.x, z: f.z, nx: f.nx, nz: f.nz, ex: f.ex, ez: f.ez,
    t0: f.t0, t1: f.t1, larghezza: f.larghezza || 4.2,
    yCimasa: f.yCimasa, hTerra: f.hTerra,
  }));
  cache.set(mondo, out);
  return out;
}

// gli edifici non hanno un id: per raggruppare serve una chiave stabile, e
// l'indice nell'array del mondo lo è (l'array non cambia mai dopo il
// caricamento). Si costruisce una volta e si tiene.
const indici = new WeakMap<MondoLugo, Map<EdificioRT, number>>();
function indiceEdificio(mondo: MondoLugo, b: EdificioRT): number {
  let m = indici.get(mondo);
  if (!m) {
    m = new Map();
    mondo.buildings.forEach((e, i) => m!.set(e, i));
    indici.set(mondo, m);
  }
  return m.get(b) ?? -1;
}

/** La stessa lista, indicizzata per edificio: la consuma chi disegna i muri. */
export function frontiPerEdificio(mondo: MondoLugo): Map<EdificioRT, FronteBottega[]> {
  const gia = cachePerEdificio.get(mondo);
  if (gia) return gia;
  const m = new Map<EdificioRT, FronteBottega[]>();
  for (const f of frontiBotteghe(mondo)) {
    if (!f.edificio) continue;
    const g = m.get(f.edificio);
    if (g) g.push(f);
    else m.set(f.edificio, [f]);
  }
  cachePerEdificio.set(mondo, m);
  return m;
}
