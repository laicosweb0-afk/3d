'use client';

// Mappa dei comandi per <KeyboardControls> di drei. Tutta la tastiera del
// gioco passa da qui: WASD + frecce, Shift corsa, Spazio freno a mano,
// E/Invio sali-scendi, R raddrizza.

export const CONTROLLI: { name: string; keys: string[] }[] = [
  { name: 'avanti', keys: ['ArrowUp', 'KeyW'] },
  { name: 'indietro', keys: ['ArrowDown', 'KeyS'] },
  { name: 'sinistra', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'destra', keys: ['ArrowRight', 'KeyD'] },
  { name: 'corri', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'freno', keys: ['Space'] },
  { name: 'interagisci', keys: ['KeyE', 'Enter'] },
  { name: 'reset', keys: ['KeyR'] },
];

export interface StatoInput {
  avanti: boolean;
  indietro: boolean;
  sinistra: boolean;
  destra: boolean;
  corri: boolean;
  freno: boolean;
  interagisci: boolean;
  reset: boolean;
}
