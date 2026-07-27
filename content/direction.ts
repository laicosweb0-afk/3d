// LA REGIA. In produzione questi dati saranno autorati in Blender ed
// esportati come extras glTF; nel prototipo M1 sono scritti a mano.
// Tutto è funzione pura di p: nessun evento, solo tracce campionate.

import { pAt, span, smooth, clamp01 } from '@/lib/scenes';
import { debugState } from '@/lib/progress';

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
  // il volo: una salita dolce che rivela la casa dal fronte (niente orbita)
  { p: pAt('s05', 0.45), pos: [-5, 5, 13.5],   tgt: [0, 1.3, 1],   fov: 40 },
  { p: pAt('s05', 1.0),  pos: [1.5, 4.6, 12.5], tgt: [0, 1.3, 2.2], fov: 41 },
  // la soglia: discesa a crane verso l'ingresso, dritti (porta a z=+4)
  { p: pAt('s06', 0.4),  pos: [1.2, 3.0, 9.3],  tgt: [0, 1.4, 3.2], fov: 43 },
  { p: pAt('s06', 0.75), pos: [0.5, 2.0, 7.5],  tgt: [0, 1.5, 3.9], fov: 45 },
  { p: pAt('s06', 1.0),  pos: [0, 1.65, 6.2],   tgt: [0, 1.45, 3.9], fov: 46 },
  // ATTO III — dentro. La camera entra nel soggiorno e poi TIENE FERMO
  // per tutta la finestra del morph (video 3D→foto): l'utente resta al suo
  // posto, è lo scroll a pilotare la trasformazione, non un movimento.
  { p: pAt('s07', 0.15), pos: [0, 1.6, 3.1],    tgt: [-0.5, 1.4, 0],    fov: 52 },
  { p: pAt('s07', 0.5),  pos: [0.5, 1.6, 1.7],  tgt: [-1.8, 1.35, -0.5], fov: 52 },
  { p: pAt('s07', 0.9),  pos: [0.47, 1.6, 1.66], tgt: [-1.83, 1.35, -0.53], fov: 52 },
  { p: pAt('s07', 1.0),  pos: [-0.4, 1.55, 0.9], tgt: [-2.7, 1.45, -1.6], fov: 52 },
  // dentro la parete (parete interna a z=-1.5)
  { p: pAt('s08', 0.4),  pos: [-1.9, 1.55, 0.2], tgt: [-2.7, 1.35, -1.55], fov: 52 },
  { p: pAt('s08', 0.85), pos: [-2.65, 1.5, -1.1], tgt: [-2.8, 1.2, -3.1], fov: 54 },
  { p: pAt('s08', 1.0),  pos: [-2.7, 1.55, -2.0], tgt: [-3.0, 0.6, -3.0], fov: 54 },
  // sotto il pavimento: esploso della stratigrafia, si segue la serpentina
  { p: pAt('s09', 0.25), pos: [-2.5, 1.4, -1.95], tgt: [-3.0, 0.6, -2.9], fov: 54 },
  { p: pAt('s09', 0.55), pos: [-2.25, 0.78, -2.25], tgt: [-3.8, 0.52, -3.1], fov: 54 },
  { p: pAt('s09', 0.85), pos: [-3.0, 0.75, -3.1],  tgt: [-4.3, 0.55, -3.4], fov: 54 },
  // il bagno: risalita, poi la camera incornicia la vasca e TIENE FERMO per
  // tutta la finestra del morph (video 3D→foto reale). Vasca centrale,
  // finestra piccola a sinistra: match con la foto reale.
  { p: pAt('s10', 0.2),  pos: [-2.7, 1.45, -2.8],   tgt: [-4.3, 0.9, -3.3],   fov: 50 },
  { p: pAt('s10', 0.4),  pos: [-3.25, 1.3, -2.72],  tgt: [-4.35, 0.82, -3.28], fov: 46 },
  { p: pAt('s10', 0.75), pos: [-3.28, 1.31, -2.71], tgt: [-4.37, 0.84, -3.29], fov: 46 },
  { p: pAt('s10', 1.0),  pos: [-2.9, 1.55, -2.9],   tgt: [-5.0, 1.4, -3.0],   fov: 50 },
  // ATTO IV — si esce dalla finestra. È il gesto che chiude il viaggio e, allo
  // stesso tempo, cuce l'esperienza al resto del sito: il passaggio alle
  // sezioni non è una dissolvenza ma un movimento di macchina, così l'utente
  // non percepisce nessuno stacco — la camera semplicemente continua.
  // L'apertura del bagno è centrata su [-4.85, 1.65, -3.0]; windowOpen() la
  // spalanca entro s11 0.55, cioè prima che la si attraversi a 0.7.
  // L'attraversamento va fatto IN ASSE con l'apertura (y 1.65, z -3.0) e
  // guardando lontano: con un bersaglio vicino la direzione ruota mentre ci si
  // avvicina, il fotogramma si riempie di stipite e il passaggio non si legge.
  { p: pAt('s11', 0.35), pos: [-3.2, 1.65, -3.0],  tgt: [-13, 1.65, -3.0], fov: 50 },
  { p: pAt('s11', 0.7),  pos: [-4.85, 1.65, -3.0], tgt: [-13, 1.65, -3.0], fov: 48 },
  // Appena fuori lo sguardo comincia già a ruotare verso la casa: se la camera
  // uscisse guardando dritto davanti a sé si troverebbe il vuoto in campo, e
  // il congedo dovrebbe recuperare con una rotazione brusca.
  { p: pAt('s11', 1.0),  pos: [-7.5, 1.9, -2.8],   tgt: [-11.0, 1.75, -1.6], fov: 46 },
  // fuori: la spinta che ci ha portati fuori prosegue e prende quota mentre lo
  // sguardo rientra sull'edificio, che si ricompone di tre quarti da sinistra.
  // Niente orbita attorno alla casa: la posizione va sempre nella stessa
  // direzione, è solo il bersaglio che rientra.
  { p: pAt('s12', 0.35), pos: [-10.5, 2.5, 0.5],   tgt: [-6.0, 1.5, -1.4], fov: 44 },
  { p: pAt('s12', 1.0),  pos: [-14.5, 3.4, 7.5],   tgt: [-2.0, 1.1, -0.6], fov: 40 },
];

// ---- Tracce degli eventi ancorati (tutte f(p), tutte reversibili) ----

/** Linee CAD: 0 = assenti, 1 = disegno completo. Si ritraggono in S12. */
export function cadDraw(p: number): number {
  const draw = smooth(span(p, pAt('s02', 0.05), pAt('s02', 0.9)));
  const retract = smooth(span(p, pAt('s12', 0.55), pAt('s12', 0.92)));
  return draw * (1 - retract);
}

/** Costruzione della maquette: parte quasi subito (mentre la hero si
 * congeda) e si completa più reattiva, entro la prima metà di S03. Così
 * ai primi scroll la casa sta già nascendo, non resta un foglio vuoto. */
export function buildProgress(p: number): number {
  // La previz può fissarlo per renderizzare un dato stato di cantiere sotto una
  // camera qualsiasi (vedi debugState.bp). Non tocca il viaggio vero.
  if (debugState.bp !== null) return debugState.bp;
  return span(p, pAt('s01', 0.7), pAt('s03', 0.45));
}

/**
 * Lama di trasformazione: posizione x del piano prima/dopo nel mondo.
 * Fuori range: oltre i bordi della casa. Avanza in S04 (da +x a -x,
 * inseguendo il dolly) e si ritira in S12.
 */
export function sweepX(p: number): number {
  const IN = 8, OUT = -8;
  if (debugState.clay) return IN;
  const fwd = smooth(span(p, pAt('s04', 0.02), pAt('s04', 0.95)));
  const back = smooth(span(p, pAt('s12', 0.08), pAt('s12', 0.5)));
  const x = IN + (OUT - IN) * fwd; // avanti: +8 → -8
  return x + (IN - OUT) * back;    // indietro: torna a +8
}

/** Contesto reale (terreno, cielo): appare nel volo, sparisce nel ritorno. */
export function contextAmount(p: number): number {
  if (debugState.clay) return 0; // il "progetto" vive nel mondo bianco
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
