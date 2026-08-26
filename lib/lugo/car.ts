// Modello di guida arcade "bicycle": pensato per essere divertente e
// leggibile, non realistico. La velocità è un vettore; il grip smorza la
// componente laterale (poco, col freno a mano tirato → derapata).

import type { MondoLugo } from './loadMap';
import type { MondoFisico } from './physics';
import type { StatoInput } from './input';

export interface StatoAuto {
  x: number;
  z: number;
  /** Heading: direzione di marcia = (cos yaw, sin yaw) nel piano x-z. */
  yaw: number;
  vx: number;
  vz: number;
  /** Angolo di sterzo corrente (rad). */
  sterzo: number;
}

export const AUTO = {
  vMax: 22, // ~80 km/h
  vMaxRetro: 6,
  accel: 9,
  frenata: 18,
  dragLin: 0.35,
  dragQuad: 0.012,
  passo: 2.6,
  sterzoMax: 0.55,
  gripNormale: 8,
  gripDerapata: 1.5,
  raggioCorpo: 0.85,
  offsetCerchi: [-1.3, 0, 1.3],
} as const;

export interface EsitoStep {
  /** Modulo dell'urto assorbito in questo frame (m/s), 0 se nessuno. */
  urto: number;
  /** Velocità di marcia con segno (m/s). */
  v: number;
}

export function stepAuto(
  s: StatoAuto,
  input: StatoInput,
  dt: number,
  fisica: MondoFisico,
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
): EsitoStep {
  const fx = Math.cos(s.yaw);
  const fz = Math.sin(s.yaw);
  let vAvanti = s.vx * fx + s.vz * fz;
  let vLato = -s.vx * fz + s.vz * fx;

  // sterzo: pieno da fermi, si chiude con la velocità
  const chiusura = 1 / (1 + Math.abs(vAvanti) / 11);
  const sterzoTarget =
    ((input.sinistra ? -1 : 0) + (input.destra ? 1 : 0)) * AUTO.sterzoMax * chiusura;
  s.sterzo += (sterzoTarget - s.sterzo) * Math.min(1, dt * 10);

  // trazione e freni
  if (input.avanti) {
    vAvanti += AUTO.accel * dt;
  } else if (input.indietro) {
    vAvanti -= (vAvanti > 0.3 ? AUTO.frenata : AUTO.accel * 0.7) * dt;
  }
  if (input.freno) vAvanti -= Math.sign(vAvanti) * Math.min(Math.abs(vAvanti), AUTO.frenata * 0.8 * dt);
  vAvanti -= (AUTO.dragLin * vAvanti + AUTO.dragQuad * vAvanti * Math.abs(vAvanti)) * dt;
  vAvanti = Math.max(-AUTO.vMaxRetro, Math.min(AUTO.vMax, vAvanti));

  // imbardata dal modello bicycle
  if (Math.abs(vAvanti) > 0.05) {
    s.yaw += (vAvanti / AUTO.passo) * Math.tan(s.sterzo) * dt;
  }

  // grip: la velocità laterale muore in fretta (piano, col freno a mano)
  const grip = input.freno ? AUTO.gripDerapata : AUTO.gripNormale;
  vLato *= Math.exp(-grip * dt);

  // ricompone il vettore velocità sul nuovo heading
  const nfx = Math.cos(s.yaw);
  const nfz = Math.sin(s.yaw);
  s.vx = nfx * vAvanti - nfz * vLato;
  s.vz = nfz * vAvanti + nfx * vLato;

  s.x += s.vx * dt;
  s.z += s.vz * dt;

  // collisioni: tre cerchi lungo l'asse dell'auto
  let urto = 0;
  const out = { x: 0, z: 0 };
  for (const off of AUTO.offsetCerchi) {
    const cx = s.x + nfx * off;
    const cz = s.z + nfz * off;
    const contatto = fisica.risolviCerchio(cx, cz, AUTO.raggioCorpo, out);
    if (contatto) {
      s.x += out.x - cx;
      s.z += out.z - cz;
      const [nx, nz] = contatto;
      const vn = s.vx * nx + s.vz * nz;
      if (vn < 0) {
        // scivola lungo il muro con un piccolo rimbalzo e perdita d'energia
        s.vx -= nx * vn * 1.3;
        s.vz -= nz * vn * 1.3;
        s.vx *= 0.88;
        s.vz *= 0.88;
        urto = Math.max(urto, -vn);
      }
    }
  }

  // confine del mondo: muro invisibile
  const margine = 30;
  if (s.x < bounds.minX - margine) { s.x = bounds.minX - margine; s.vx = Math.max(0, s.vx); }
  if (s.x > bounds.maxX + margine) { s.x = bounds.maxX + margine; s.vx = Math.min(0, s.vx); }
  if (s.z < bounds.minZ - margine) { s.z = bounds.minZ - margine; s.vz = Math.max(0, s.vz); }
  if (s.z > bounds.maxZ + margine) { s.z = bounds.maxZ + margine; s.vz = Math.min(0, s.vz); }

  const vFinale = s.vx * nfx + s.vz * nfz;
  return { urto, v: vFinale };
}

/** Punto di strada carrabile più vicino a (x,z): per lo spawn e il tasto R. */
export function puntoStradaVicino(
  mondo: MondoLugo,
  x: number,
  z: number,
): { x: number; z: number; yaw: number } {
  let best = { x, z, yaw: 0, d: Infinity };
  for (const r of mondo.roads) {
    if (r.classe === 'pedonale') continue;
    const pts = r.pts;
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i];
      const az = pts[i + 1];
      const bx = pts[i + 2];
      const bz = pts[i + 3];
      const abx = bx - ax;
      const abz = bz - az;
      const len2 = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / len2));
      const qx = ax + abx * t;
      const qz = az + abz * t;
      const d = Math.hypot(x - qx, z - qz);
      if (d < best.d) best = { x: qx, z: qz, yaw: Math.atan2(bz - az, bx - ax), d };
    }
  }
  return { x: best.x, z: best.z, yaw: best.yaw };
}
