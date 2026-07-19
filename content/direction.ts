// LA REGIA. In produzione questi dati saranno autorati in Blender ed
// esportati come extras glTF; nel prototipo M1 sono scritti a mano.
// Tutto è funzione pura di p: nessun evento, solo tracce campionate.

import { pAt, span, smooth, clamp01 } from '@/lib/scenes';

export interface CamKey {
  p: number;
  pos: [number, number, number];
  tgt: [number, number, number];
  fov: number;
}

// Un unico percorso continuo: ogni keyframe nasce dal precedente (piano sequenza).
export const CAMERA_KEYS: CamKey[] = [
  // ATTO I — il foglio
  { p: pAt('s01', 0.0), pos: [0, 2.2, 16.5], tgt: [0, 1.2, 0], fov: 40 },
  { p: pAt('s02', 0.5), pos: [0.5, 5.5, 13],  tgt: [0, 0, 0],   fov: 42 },
  { p: pAt('s03', 0.0), pos: [5, 4.5, 13],   tgt: [0, 0.8, 0], fov: 42 },
  { p: pAt('s03', 0.6), pos: [8.5, 3.4, 11], tgt: [0, 1.2, 0], fov: 42 },
  { p: pAt('s03', 1.0), pos: [9.5, 3.2, 10.5], tgt: [0, 1.4, 0], fov: 42 },
  // ATTO II — la materia (dolly laterale: la lama insegue la camera)
  { p: pAt('s04', 0.5), pos: [0, 3.2, 14],   tgt: [0, 1.5, 0], fov: 42 },
  { p: pAt('s04', 1.0), pos: [-9.5, 3.2, 11], tgt: [-1, 1.5, 0], fov: 42 },
  // il volo: orbita a drone dietro la casa
  { p: pAt('s05', 0.35), pos: [-14.5, 7.5, 1], tgt: [0, 0.9, 0], fov: 40 },
  { p: pAt('s05', 0.7),  pos: [-9, 10, -13],   tgt: [0, 0.8, 0], fov: 40 },
  { p: pAt('s05', 1.0),  pos: [5, 9, -14.5],   tgt: [0, 0.9, 0], fov: 40 },
  // la soglia: discesa a crane verso l'ingresso (porta a z=+4)
  { p: pAt('s06', 0.35), pos: [10, 4.5, 8],   tgt: [0, 1.3, 2], fov: 42 },
  { p: pAt('s06', 0.75), pos: [2.6, 2.2, 8.8], tgt: [0, 1.5, 3.8], fov: 44 },
  { p: pAt('s06', 1.0),  pos: [0, 1.65, 6.4], tgt: [0, 1.45, 3.9], fov: 46 },
  // ATTO III — dentro
  { p: pAt('s07', 0.15), pos: [0, 1.6, 3.1],  tgt: [-0.5, 1.4, 0], fov: 52 },
  { p: pAt('s07', 0.55), pos: [0.9, 1.6, 1.4], tgt: [-2.5, 1.3, -0.6], fov: 52 },
  { p: pAt('s07', 1.0),  pos: [-0.4, 1.55, 0.9], tgt: [-2.7, 1.45, -1.6], fov: 52 },
  // dentro la parete (parete interna a z=-1.5)
  { p: pAt('s08', 0.4),  pos: [-1.9, 1.55, 0.2], tgt: [-2.7, 1.35, -1.55], fov: 52 },
  { p: pAt('s08', 0.85), pos: [-2.65, 1.5, -1.1], tgt: [-2.8, 1.2, -3.1], fov: 54 },
  { p: pAt('s08', 1.0),  pos: [-2.7, 1.55, -2.0], tgt: [-3.0, 0.6, -3.0], fov: 54 },
  // sotto il pavimento: esploso della stratigrafia, si segue la serpentina
  { p: pAt('s09', 0.25), pos: [-2.5, 1.4, -1.95], tgt: [-3.0, 0.6, -2.9], fov: 54 },
  { p: pAt('s09', 0.55), pos: [-2.25, 0.78, -2.25], tgt: [-3.8, 0.52, -3.1], fov: 54 },
  { p: pAt('s09', 0.85), pos: [-3.0, 0.75, -3.1],  tgt: [-4.3, 0.55, -3.4], fov: 54 },
  // il bagno: risalita
  { p: pAt('s10', 0.2),  pos: [-2.6, 1.5, -2.9],  tgt: [-4.3, 1.0, -3.35], fov: 52 },
  { p: pAt('s10', 0.65), pos: [-2.1, 1.6, -2.5],  tgt: [-4.5, 0.95, -3.5], fov: 50 },
  { p: pAt('s10', 1.0),  pos: [-2.9, 1.6, -2.9],  tgt: [-5.0, 1.5, -3.0], fov: 50 },
  // ATTO IV — la finestra (sulla parete ovest x=-5), uscita e risalita
  { p: pAt('s11', 0.35), pos: [-3.9, 1.6, -3.0],  tgt: [-5.1, 1.55, -3.0], fov: 48 },
  { p: pAt('s11', 0.7),  pos: [-7.8, 3.2, -3.1],  tgt: [0, 1.3, -1], fov: 44 },
  { p: pAt('s11', 1.0),  pos: [-11, 5, -0.5],     tgt: [0, 1.3, 0], fov: 42 },
  // il nuovo foglio: ritorno al bianco
  { p: pAt('s12', 0.45), pos: [-7, 5, 10],        tgt: [0, 1.0, 0], fov: 41 },
  { p: pAt('s12', 1.0),  pos: [0, 3.2, 17],       tgt: [0, 0.9, 0], fov: 40 },
];

// ---- Tracce degli eventi ancorati (tutte f(p), tutte reversibili) ----

/** Linee CAD: 0 = assenti, 1 = disegno completo. Si ritraggono in S12. */
export function cadDraw(p: number): number {
  const draw = smooth(span(p, pAt('s02', 0.05), pAt('s02', 0.9)));
  const retract = smooth(span(p, pAt('s12', 0.55), pAt('s12', 0.92)));
  return draw * (1 - retract);
}

/** Costruzione della maquette: 0..1 sull'arco di S03 (leggero anticipo per gruppo). */
export function buildProgress(p: number): number {
  return span(p, pAt('s02', 0.85), pAt('s03', 0.98));
}

/**
 * Lama di trasformazione: posizione x del piano prima/dopo nel mondo.
 * Fuori range: oltre i bordi della casa. Avanza in S04 (da +x a -x,
 * inseguendo il dolly) e si ritira in S12.
 */
export function sweepX(p: number): number {
  const IN = 8, OUT = -8;
  const fwd = smooth(span(p, pAt('s04', 0.02), pAt('s04', 0.95)));
  const back = smooth(span(p, pAt('s12', 0.08), pAt('s12', 0.5)));
  const x = IN + (OUT - IN) * fwd; // avanti: +8 → -8
  return x + (IN - OUT) * back;    // indietro: torna a +8
}

/** Contesto reale (terreno, cielo): appare nel volo, sparisce nel ritorno. */
export function contextAmount(p: number): number {
  const on = smooth(span(p, pAt('s05', 0.0), pAt('s05', 0.7)));
  const off = smooth(span(p, pAt('s11', 0.8), pAt('s12', 0.45)));
  return on * (1 - off);
}

/** Porta d'ingresso: 0 chiusa, 1 aperta (~100°). Lo scroll la apre; la casa si richiude nel congedo. */
export function doorOpen(p: number): number {
  const open = smooth(span(p, pAt('s06', 0.55), pAt('s06', 0.98)));
  const close = smooth(span(p, pAt('s12', 0.0), pAt('s12', 0.3)));
  return open * (1 - close);
}

/** Spaccato della parete: 0 chiusa, 1 aperta. Si richiude a fine S08. */
export function wallOpen(p: number): number {
  const open = smooth(span(p, pAt('s08', 0.12), pAt('s08', 0.55)));
  const close = smooth(span(p, pAt('s08', 0.9), pAt('s09', 0.12)));
  return open * (1 - close);
}

/** Esploso della stratigrafia: 0 chiuso, 1 esploso. Si richiude a fine S09. */
export function strataOpen(p: number): number {
  const open = smooth(span(p, pAt('s09', 0.08), pAt('s09', 0.4)));
  const close = smooth(span(p, pAt('s09', 0.82), pAt('s10', 0.12)));
  return open * (1 - close);
}

/** S10-bis: la casa si accende. */
export function lightsOn(p: number): number {
  const on = smooth(span(p, pAt('s10', 0.75), pAt('s10', 0.98)));
  const off = smooth(span(p, pAt('s12', 0.05), pAt('s12', 0.35)));
  return on * (1 - off);
}

/** Finestra del bagno: si apre per l'uscita, si richiude nel congedo. */
export function windowOpen(p: number): number {
  const open = smooth(span(p, pAt('s11', 0.15), pAt('s11', 0.55)));
  const close = smooth(span(p, pAt('s12', 0.0), pAt('s12', 0.3)));
  return open * (1 - close);
}

/** Bianco assoluto della chiusura (fade DOM, non di scena: il mondo resta). */
export function whiteout(p: number): number {
  return smooth(span(p, pAt('s12', 0.8), pAt('s12', 1.0)));
}

export { clamp01 };
