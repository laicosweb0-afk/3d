// Stato "caldo" del gioco, aggiornato ogni frame fuori da React: posizioni,
// velocità, fasi. Il Player lo scrive; missioni, minimappa e audio lo
// leggono. Un singleton mutabile evita re-render e prop-drilling.

import type { StatoAuto } from './car';
import type { StatoPersona } from './character';

export interface RuntimeGioco {
  auto: StatoAuto;
  persona: StatoPersona;
  /** Velocità di marcia dell'auto con segno (m/s). */
  vAuto: number;
  vPersona: number;
  /** Rotazione accumulata delle ruote (rad). */
  faseRuote: number;
  /** Direzione di vista della camera nel piano x-z (rad). */
  cameraYaw: number;
  /** Modulo dell'ultimo urto (m/s), per audio/feedback. */
  urto: number;
}

export const runtime: {
  rt: RuntimeGioco | null;
  /** Posizione della gazzella di pattuglia (per la collisione col giocatore). */
  gazzella: { x: number; z: number; yaw: number } | null;
  /** Camera pilotata dalla verifica (cartoline): attiva finché `fino` non scade. */
  cameraOverride: { x: number; y: number; z: number; tx: number; ty: number; tz: number; fino: number } | null;
} = { rt: null, gazzella: null, cameraOverride: null };

/** Posizione del giocatore attivo (auto o persona) secondo la modalità. */
export function posGiocatore(mode: 'auto' | 'piedi'): { x: number; z: number; yaw: number } {
  const rt = runtime.rt;
  if (!rt) return { x: 0, z: 0, yaw: 0 };
  const t = mode === 'auto' ? rt.auto : rt.persona;
  return { x: t.x, z: t.z, yaw: t.yaw };
}
