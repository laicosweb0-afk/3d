// I pedoni di Lugo: maranza a gruppetti, anziani col bastone, carabinieri
// in coppia attorno ai landmark, più la gazzella di pattuglia sui viali.
// Simulazione volutamente semplice: vagabondaggio a waypoint sulle strade,
// collisione a cerchio con scivolamento, balzo laterale quando l'auto del
// giocatore arriva addosso. Niente investimenti: qui al massimo ci si
// becca un'imprecazione.

import type { MondoLugo } from './loadMap';
import type { MondoFisico } from './physics';
import type { RuntimeGioco } from './runtime';

export type TipoNpc = 'maranza' | 'anziano' | 'carabiniere';
export type StatoNpc = 'cammina' | 'fermo' | 'balzo';

export interface Npc {
  tipo: TipoNpc;
  x: number;
  z: number;
  yaw: number;
  /** Velocità di camminata propria (m/s). */
  passo: number;
  /** Fase del ciclo di camminata. */
  fase: number;
  stato: StatoNpc;
  timer: number;
  targetX: number;
  targetZ: number;
  /** Indice variante colori. */
  variante: number;
  /** Direzione del balzo. */
  bx: number;
  bz: number;
  /** Velocità corrente (per l'animazione). */
  v: number;
  /** Progresso verso il waypoint, per sbloccarsi dai muri. */
  fermoDa: number;
  /** Indice del collega da seguire (il secondo della coppia di carabinieri). */
  segue?: number;
}

export const RAGGIO_NPC = 0.3;

const PASSO = { maranza: 1.5, anziano: 0.7, carabiniere: 1.1 } as const;

export const FRASI_BALZO = [
  'Uè! Sta’ attento!',
  'Boia d’un mond léder!',
  'Ciò! Guarda dove vai!',
  'Socmel!',
  'Ma sei matto?!',
] as const;

function rand(seme: { s: number }): number {
  // LCG deterministico: gli NPC nascono uguali a ogni partita
  seme.s = (seme.s * 1664525 + 1013904223) >>> 0;
  return seme.s / 4294967296;
}

/** Punto casuale su una strada camminabile entro `raggio` da (x,z). */
function puntoStradaCasuale(
  mondo: MondoLugo,
  x: number,
  z: number,
  raggio: number,
  seme: { s: number },
): [number, number] {
  const candidate = mondo.roads.filter(
    (r) => r.classe === 'pedonale' || r.classe === 'residenziale' || r.classe === 'servizio' || r.classe === 'secondaria',
  );
  for (let tentativi = 0; tentativi < 12; tentativi++) {
    const r = candidate[Math.floor(rand(seme) * candidate.length)];
    if (!r || r.pts.length < 4) continue;
    const i = Math.floor(rand(seme) * (r.pts.length / 2 - 1));
    const t = rand(seme);
    const px = r.pts[i * 2] + (r.pts[i * 2 + 2] - r.pts[i * 2]) * t;
    const pz = r.pts[i * 2 + 1] + (r.pts[i * 2 + 3] - r.pts[i * 2 + 1]) * t;
    if (Math.hypot(px - x, pz - z) <= raggio) {
      // spostati verso il bordo (marciapiede)
      const lato = (rand(seme) - 0.5) * r.larghezza * 1.3;
      const dx = r.pts[i * 2 + 2] - r.pts[i * 2];
      const dz = r.pts[i * 2 + 3] - r.pts[i * 2 + 1];
      const l = Math.hypot(dx, dz) || 1;
      return [px - (dz / l) * lato, pz + (dx / l) * lato];
    }
  }
  return [x, z];
}

export function creaNpcs(mondo: MondoLugo, quanti: number): Npc[] {
  const seme = { s: 12345 };
  const npcs: Npc[] = [];

  // ancore: densi vicino ai luoghi vivi, radi altrove
  const ancore: [number, number][] = [];
  for (const id of ['pavaglione', 'baracca', 'rocca', 'stazione', 'bar']) {
    const p = mondo.poi.get(id);
    if (p) ancore.push([p.xm, p.zm]);
  }
  if (!ancore.length) ancore.push([0, 0]);

  const spawn = (tipo: TipoNpc, ax: number, az: number, raggio: number) => {
    const [x, z] = puntoStradaCasuale(mondo, ax, az, raggio, seme);
    const npc: Npc = {
      tipo,
      x,
      z,
      yaw: rand(seme) * Math.PI * 2,
      passo: PASSO[tipo] * (0.85 + rand(seme) * 0.3),
      fase: rand(seme) * Math.PI * 2,
      stato: rand(seme) < 0.3 ? 'fermo' : 'cammina',
      timer: 1 + rand(seme) * 5,
      targetX: x,
      targetZ: z,
      variante: Math.floor(rand(seme) * 4),
      bx: 0,
      bz: 0,
      v: 0,
      fermoDa: 0,
    };
    const [tx, tz] = puntoStradaCasuale(mondo, x, z, 120, seme);
    npc.targetX = tx;
    npc.targetZ = tz;
    npcs.push(npc);
    return npc;
  };

  // carabinieri: coppie fisse vicino ai landmark istituzionali
  for (const id of ['rocca', 'pavaglione', 'stazione']) {
    const p = mondo.poi.get(id);
    if (!p) continue;
    const capo = spawn('carabiniere', p.xm, p.zm, 60);
    const indiceCapo = npcs.length - 1;
    const secondo = spawn('carabiniere', p.xm, p.zm, 60);
    // il secondo cammina di fianco al primo, sempre
    secondo.segue = indiceCapo;
    secondo.x = capo.x + 0.9;
    secondo.z = capo.z + 0.3;
    secondo.passo = capo.passo;
    secondo.stato = 'cammina';
  }

  // maranza: gruppetti di 2-3 attorno alle piazze
  const nMaranza = Math.floor(quanti * 0.42);
  let fatti = 0;
  while (fatti < nMaranza) {
    const [ax, az] = ancore[Math.floor(rand(seme) * ancore.length)];
    const gruppo = 2 + Math.floor(rand(seme) * 2);
    const [gx, gz] = puntoStradaCasuale(mondo, ax, az, 160, seme);
    for (let i = 0; i < gruppo && fatti < nMaranza; i++, fatti++) {
      const m = spawn('maranza', gx, gz, 12);
      if (rand(seme) < 0.45) {
        m.stato = 'fermo'; // in posa col telefono
        m.timer = 6 + rand(seme) * 14;
      }
    }
  }

  // anziani: sparsi, lenti
  const nAnziani = quanti - npcs.length;
  for (let i = 0; i < nAnziani; i++) {
    const [ax, az] = ancore[Math.floor(rand(seme) * ancore.length)];
    spawn('anziano', ax, az, 240);
  }

  return npcs;
}

export interface EsitoNpcs {
  /** Una frase da mostrare (balzo appena scattato), o null. */
  frase: string | null;
}

const semeFrasi = { s: 777 };

export function stepNpcs(
  npcs: Npc[],
  dt: number,
  mondo: MondoLugo,
  fisica: MondoFisico,
  rt: RuntimeGioco,
  modeAuto: boolean,
): EsitoNpcs {
  let frase: string | null = null;
  const autoVeloce = modeAuto && Math.abs(rt.vAuto) > 4;
  const out = { x: 0, z: 0 };

  for (const n of npcs) {
    // l'auto del giocatore arriva addosso → balzo laterale
    if (autoVeloce && n.stato !== 'balzo') {
      const dx = n.x - rt.auto.x;
      const dz = n.z - rt.auto.z;
      const d = Math.hypot(dx, dz);
      if (d < 6.5) {
        n.stato = 'balzo';
        n.timer = 0.38;
        // via dalla traiettoria: perpendicolare alla marcia dell'auto
        const fx = Math.cos(rt.auto.yaw);
        const fz = Math.sin(rt.auto.yaw);
        const lato = -fz * dx + fx * dz >= 0 ? 1 : -1;
        n.bx = -fz * lato;
        n.bz = fx * lato;
        if (frase === null && Math.random() < 0.5) {
          frase = FRASI_BALZO[Math.floor(rand(semeFrasi) * FRASI_BALZO.length)];
        }
      }
    }

    // il gregario tiene la posizione di fianco al capo
    if (n.segue !== undefined && n.stato !== 'balzo') {
      const capo = npcs[n.segue];
      n.targetX = capo.x - Math.sin(capo.yaw) * 0.95 - Math.cos(capo.yaw) * 0.2;
      n.targetZ = capo.z + Math.cos(capo.yaw) * 0.95 - Math.sin(capo.yaw) * 0.2;
      n.stato = 'cammina';
    }

    let vx = 0;
    let vz = 0;
    if (n.stato === 'balzo') {
      vx = n.bx * 6.5;
      vz = n.bz * 6.5;
      n.timer -= dt;
      if (n.timer <= 0) {
        n.stato = 'fermo';
        n.timer = 0.8 + Math.random() * 1.5;
      }
    } else if (n.stato === 'fermo') {
      n.timer -= dt;
      if (n.timer <= 0) {
        n.stato = 'cammina';
        const seme = { s: (n.x * 131 + n.z * 977) >>> 0 || 1 };
        const [tx, tz] = puntoStradaCasuale(mondo, n.x, n.z, 130, seme);
        n.targetX = tx;
        n.targetZ = tz;
      }
    } else {
      const dx = n.targetX - n.x;
      const dz = n.targetZ - n.z;
      const d = Math.hypot(dx, dz);
      if (n.segue !== undefined) {
        // il gregario non si ferma mai a chiacchierare: tiene il passo
        if (d > 0.5) {
          const spinta = d > 3 ? 1.6 : 1;
          vx = (dx / d) * n.passo * spinta;
          vz = (dz / d) * n.passo * spinta;
        }
      } else if (d < 1.2) {
        n.stato = 'fermo';
        n.timer = n.tipo === 'maranza' ? 3 + Math.random() * 10 : 1 + Math.random() * 4;
      } else {
        vx = (dx / d) * n.passo;
        vz = (dz / d) * n.passo;
      }
    }

    if (vx !== 0 || vz !== 0) {
      n.x += vx * dt;
      n.z += vz * dt;
      const contatto = fisica.risolviCerchio(n.x, n.z, RAGGIO_NPC, out);
      if (contatto) {
        n.x = out.x;
        n.z = out.z;
        n.fermoDa += dt;
        // incastrato contro un muro: cambia meta
        if (n.fermoDa > 2 && n.stato === 'cammina') {
          n.fermoDa = 0;
          n.stato = 'fermo';
          n.timer = 0.5;
        }
      } else {
        n.fermoDa = 0;
      }
      const targetYaw = Math.atan2(vz, vx);
      let dy = targetYaw - n.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      n.yaw += dy * Math.min(1, dt * 8);
    }
    n.v = Math.hypot(vx, vz);
    n.fase += n.v * dt * (n.tipo === 'anziano' ? 3.2 : 2.4);
  }

  return { frase };
}

// ── gazzella di pattuglia ───────────────────────────────────────────────────

export interface Gazzella {
  x: number;
  z: number;
  yaw: number;
  /** Percorso: la polilinea più lunga tra primarie e secondarie. */
  percorso: Float32Array;
  /** Ascissa curvilinea corrente (m) e verso (+1/−1). */
  s: number;
  verso: 1 | -1;
  lunghezza: number;
}

export function creaGazzella(mondo: MondoLugo): Gazzella | null {
  let migliore: Float32Array | null = null;
  let migliorLunghezza = 0;
  for (const r of mondo.roads) {
    if (r.classe !== 'primaria' && r.classe !== 'secondaria') continue;
    let l = 0;
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      l += Math.hypot(r.pts[i + 2] - r.pts[i], r.pts[i + 3] - r.pts[i + 1]);
    }
    if (l > migliorLunghezza) {
      migliorLunghezza = l;
      migliore = r.pts;
    }
  }
  if (!migliore || migliorLunghezza < 80) return null;
  return {
    x: migliore[0],
    z: migliore[1],
    yaw: 0,
    percorso: migliore,
    s: 0,
    verso: 1,
    lunghezza: migliorLunghezza,
  };
}

const V_GAZZELLA = 7;
const V_INSEGUIMENTO = 15;

/**
 * Pattuglia sui viali; con `caccia` punta dritta al giocatore (wanted):
 * niente percorso, solo pressione — arcade quanto basta.
 */
export function stepGazzella(
  g: Gazzella,
  dt: number,
  caccia?: { x: number; z: number },
): void {
  if (caccia) {
    const dx = caccia.x - g.x;
    const dz = caccia.z - g.z;
    const d = Math.hypot(dx, dz);
    if (d > 3.2) {
      const passo = Math.min(V_INSEGUIMENTO * dt, d - 3);
      g.x += (dx / d) * passo;
      g.z += (dz / d) * passo;
      g.yaw = Math.atan2(dz, dx);
    }
    // aggiorna l'ascissa al punto del percorso più vicino? No: al rientro
    // in pattuglia riparte da dove si trova l'ascissa salvata, va benissimo.
    return;
  }
  g.s += V_GAZZELLA * dt * g.verso;
  if (g.s >= g.lunghezza) {
    g.s = g.lunghezza;
    g.verso = -1;
  } else if (g.s <= 0) {
    g.s = 0;
    g.verso = 1;
  }
  // posizione lungo la polilinea all'ascissa s
  let resto = g.s;
  const pts = g.percorso;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const dx = pts[i + 2] - pts[i];
    const dz = pts[i + 3] - pts[i + 1];
    const l = Math.hypot(dx, dz);
    if (resto <= l || i + 4 >= pts.length) {
      const t = l > 0 ? Math.min(1, resto / l) : 0;
      g.x = pts[i] + dx * t;
      g.z = pts[i + 1] + dz * t;
      const dir = g.verso;
      g.yaw = Math.atan2(dz * dir, dx * dir);
      return;
    }
    resto -= l;
  }
}
