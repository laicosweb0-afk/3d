// Controller del personaggio a piedi: movimento relativo alla camera,
// accelerazione rapida, collisione a cerchio con scivolamento.

import type { MondoFisico } from './physics';
import type { StatoInput } from './input';

export interface StatoPersona {
  x: number;
  z: number;
  /** Direzione verso cui guarda il modello (rad). */
  yaw: number;
  vx: number;
  vz: number;
  /** Fase del passo per l'animazione (cresce con la distanza percorsa). */
  fase: number;
}

export const PERSONA = {
  vCammina: 2.2,
  vCorsa: 5.0,
  accel: 20,
  raggio: 0.35,
} as const;

export function stepPersona(
  s: StatoPersona,
  input: StatoInput,
  dt: number,
  fisica: MondoFisico,
  cameraYaw: number,
): number {
  // direzione richiesta nel riferimento della camera
  let ix = (input.destra ? 1 : 0) - (input.sinistra ? 1 : 0);
  let iz = (input.indietro ? 1 : 0) - (input.avanti ? 1 : 0);
  const li = Math.hypot(ix, iz);
  let tvx = 0;
  let tvz = 0;
  if (li > 0) {
    ix /= li;
    iz /= li;
    const cy = Math.cos(cameraYaw);
    const sy = Math.sin(cameraYaw);
    // avanti = direzione di vista della camera; destra = vista +90° nel piano x-z
    const wx = -iz * cy - ix * sy;
    const wz = -iz * sy + ix * cy;
    const vMax = input.corri ? PERSONA.vCorsa : PERSONA.vCammina;
    tvx = wx * vMax;
    tvz = wz * vMax;
  }
  const k = Math.min(1, PERSONA.accel * dt / Math.max(0.001, input.corri ? PERSONA.vCorsa : PERSONA.vCammina));
  s.vx += (tvx - s.vx) * k;
  s.vz += (tvz - s.vz) * k;

  s.x += s.vx * dt;
  s.z += s.vz * dt;

  const out = { x: 0, z: 0 };
  const contatto = fisica.risolviCerchio(s.x, s.z, PERSONA.raggio, out);
  if (contatto) {
    s.x = out.x;
    s.z = out.z;
    const [nx, nz] = contatto;
    const vn = s.vx * nx + s.vz * nz;
    if (vn < 0) {
      s.vx -= nx * vn;
      s.vz -= nz * vn;
    }
  }

  const v = Math.hypot(s.vx, s.vz);
  if (v > 0.2) {
    const targetYaw = Math.atan2(s.vz, s.vx);
    let d = targetYaw - s.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    s.yaw += d * Math.min(1, dt * 12);
    s.fase += v * dt * 2.2;
  }
  return v;
}
