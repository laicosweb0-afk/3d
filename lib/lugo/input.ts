'use client';

// Mappa dei comandi per <KeyboardControls> di drei. Tutta la tastiera del
// gioco passa da qui: WASD + frecce, Shift corsa, Spazio freno a mano,
// E/Invio sali-scendi, R raddrizza, F sgancia un pugno.
//
// La E fa sei cose diverse e non è un caso: la sua precedenza è a gradini
// FISSI e sta scritta in Player.tsx (1 chiudi il pannello, 2 scendi,
// 3 la tua auto, 4 il veicolo da prendere, 5 bacheca o bottega, e per
// ultimo il maranza); dentro un gradino, e solo lì, decide la distanza.
// Chi legge questo file per capire cosa fa la E oggi non troverebbe
// nessun indizio su dove guardare.
//
// In sella non cambia niente: E scende, R raddrizza, Spazio frena. Shift
// non fa nulla, perché la bici ha una sola velocità massima — dare uno
// scatto vorrebbe dire tenere Shift premuto per sempre, che è un comando
// che si annulla da solo.

export const CONTROLLI: { name: string; keys: string[] }[] = [
  { name: 'avanti', keys: ['ArrowUp', 'KeyW'] },
  { name: 'indietro', keys: ['ArrowDown', 'KeyS'] },
  { name: 'sinistra', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'destra', keys: ['ArrowRight', 'KeyD'] },
  { name: 'corri', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'freno', keys: ['Space'] },
  { name: 'interagisci', keys: ['KeyE', 'Enter'] },
  { name: 'reset', keys: ['KeyR'] },
  { name: 'colpisci', keys: ['KeyF'] },
];

/**
 * true se l'evento (o il fuoco) è su un comando dello schermo: un bottone,
 * un link, un campo. Lì la tastiera appartiene alla pagina, non al gioco —
 * Spazio preme il bottone, Invio pure, e il gioco sta a guardare.
 */
export function suUnComando(bersaglio: EventTarget | null): boolean {
  const el = bersaglio as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest('button, a[href], input, select, textarea, [contenteditable="true"]'));
}

/** true se il fuoco della tastiera è su un comando dello schermo. */
export function fuocoSuComando(): boolean {
  return typeof document !== 'undefined' && suUnComando(document.activeElement);
}

export interface StatoInput {
  /**
   * Assi analogici normalizzati, l'UNICA sorgente di verità per il
   * movimento: ax = +1 a destra, az = +1 avanti, modulo mai oltre 1
   * (le diagonali non sono più veloci). Li produce `conStick`, che fonde
   * tastiera e joystick; i booleani qui sotto ne sono la lettura a soglia,
   * usata dall'auto e dalle interazioni.
   */
  ax: number;
  az: number;
  avanti: boolean;
  indietro: boolean;
  sinistra: boolean;
  destra: boolean;
  corri: boolean;
  freno: boolean;
  interagisci: boolean;
  reset: boolean;
  colpisci: boolean;
}
