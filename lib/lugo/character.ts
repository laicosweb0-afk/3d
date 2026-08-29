// Controller del personaggio a piedi.
//
// Regole del movimento, in chiaro perché non si perdano:
//  1. l'input arriva come DUE ASSI normalizzati (ax = destra, az = avanti),
//     identici che vengano dalla tastiera o dal joystick;
//  2. quegli assi si trasformano nel piano del mondo usando il riferimento
//     della CAMERA: "avanti" è ciò che il giocatore vede come avanti;
//  3. il personaggio RUOTA verso la direzione richiesta e cammina lungo la
//     direzione in cui guarda — così non scivola mai di lato e non sembra
//     mai andare al contrario;
//  4. mentre gira stretto rallenta, come farebbe una persona vera;
//  5. tutto è in metri al secondo e moltiplicato per dt: la velocità non
//     dipende dagli FPS.
//
// Convenzioni degli assi (le stesse di tutto il gioco): x = est, z = sud,
// yaw = atan2(dz, dx) — 0 guarda +x. Il modello 3D è costruito lungo +X e
// viene ruotato con `rotation.y = -yaw`, che è la corrispondenza corretta
// fra questo sistema e quello di three.js.

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

/** Tutti i numeri del movimento in un posto solo, facili da ritoccare. */
/** Radianti di fase per metro percorso: 2π / 1.8 m di falcata. */
const FALCATA = 3.5;

export const PERSONA = {
  vCammina: 2.3,
  vCorsa: 5.2,
  /** m/s²: quanto in fretta si prende velocità. */
  accelerazione: 16,
  /** m/s²: quanto in fretta ci si ferma (più alta: stop più secco). */
  decelerazione: 22,
  /** rad/s: quanto in fretta il personaggio si gira. */
  velRotazione: 11,
  /** Sotto questo modulo l'input è considerato nullo. */
  zonaMorta: 0.12,
  raggio: 0.35,
} as const;

/** Differenza fra due angoli, riportata in (−π, π]. */
function delta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function stepPersona(
  s: StatoPersona,
  input: StatoInput,
  dt: number,
  fisica: MondoFisico,
  cameraYaw: number,
): number {
  // ── 1. l'input nel riferimento della camera ──────────────────────────
  // avanti = dove guarda la camera; destra = avanti ruotato di +90° nel
  // piano x-z, che con questi assi è (−sin, +cos).
  const cy = Math.cos(cameraYaw);
  const sy = Math.sin(cameraYaw);
  const ax = input.ax;
  const az = input.az;
  const spinta = Math.min(1, Math.hypot(ax, az));

  let vTarget = 0;
  let yawTarget = s.yaw;
  if (spinta > PERSONA.zonaMorta) {
    const wx = az * cy - ax * sy;
    const wz = az * sy + ax * cy;
    yawTarget = Math.atan2(wz, wx);
    vTarget = spinta * (input.corri ? PERSONA.vCorsa : PERSONA.vCammina);
  }

  // ── 2. rotazione morbida verso la direzione richiesta ────────────────
  const scarto = delta(yawTarget, s.yaw);
  if (vTarget > 0) {
    const passoMax = PERSONA.velRotazione * dt;
    s.yaw += Math.abs(scarto) <= passoMax ? scarto : Math.sign(scarto) * passoMax;
    // girando stretto si rallenta: niente virate innaturali a piena velocità
    const strettezza = Math.min(1, Math.abs(scarto) / Math.PI);
    vTarget *= 1 - 0.75 * strettezza;
  }

  // ── 3. velocità con accelerazione e decelerazione ────────────────────
  const vAttuale = Math.hypot(s.vx, s.vz);
  const rampa = vTarget > vAttuale ? PERSONA.accelerazione : PERSONA.decelerazione;
  let v = vAttuale + Math.sign(vTarget - vAttuale) * rampa * dt;
  // niente oltrepassamenti: la rampa non deve scavalcare il bersaglio
  if ((vTarget > vAttuale && v > vTarget) || (vTarget < vAttuale && v < vTarget)) v = vTarget;
  if (v < 0.02) v = 0;

  // si cammina SEMPRE lungo la direzione in cui si guarda
  s.vx = Math.cos(s.yaw) * v;
  s.vz = Math.sin(s.yaw) * v;

  // ── 4. spostamento e collisione ──────────────────────────────────────
  s.x += s.vx * dt;
  s.z += s.vz * dt;

  const out = { x: 0, z: 0 };
  const contatto = fisica.risolviCerchio(s.x, s.z, PERSONA.raggio, out);
  if (contatto) {
    s.x = out.x;
    s.z = out.z;
    // si scivola lungo il muro invece di incollarsi
    const [nx, nz] = contatto;
    const vn = s.vx * nx + s.vz * nz;
    if (vn < 0) {
      s.vx -= nx * vn;
      s.vz -= nz * vn;
    }
  }

  // ── 5. animazione al passo con la velocità reale ─────────────────────
  // La fase avanza con la DISTANZA percorsa, non col tempo: così il passo
  // resta agganciato al terreno. Il fattore è la falcata: con l'ampiezza
  // d'anca di Character.tsx (±0.5 rad su una gamba di 0.94 m) un ciclo
  // completo copre circa 1,8 m, cioè due passi da 90 cm. Con il vecchio 2.2
  // il ciclo copriva 2,9 m e i piedi strisciavano sull'asfalto.
  const vFinale = Math.hypot(s.vx, s.vz);
  if (vFinale > 0.05) s.fase += vFinale * dt * FALCATA;
  return vFinale;
}
