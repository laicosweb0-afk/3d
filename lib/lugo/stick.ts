// Stato condiviso del joystick virtuale: lo scrive il componente DOM
// (Joystick.tsx), lo legge la fisica a ogni frame (Player.tsx). Vive fuori
// da React apposta: niente re-render, niente stati doppi da sincronizzare.

import type { StatoInput } from './input';

export const stick = {
  /** true mentre un dito o il mouse sta trascinando la palla */
  attivo: false,
  /** -1..1, positivo verso destra */
  x: 0,
  /** -1..1, positivo verso il basso (indietro) */
  y: 0,
  /** pulsante FRENO tenuto premuto */
  freno: false,
  /** pulsante CORRI tenuto premuto (a piedi) */
  corriBtn: false,
  /** pulsante E tenuto premuto (il fronte lo gestisce già il Player) */
  interagisci: false,
};

export function resetStick() {
  stick.attivo = false;
  stick.x = 0;
  stick.y = 0;
}

const ZONA_MORTA = 0.24;

/** Fonde tastiera e joystick: basta uno dei due per muoversi. */
export function conStick(t: StatoInput): StatoInput {
  if (!stick.attivo && !stick.freno && !stick.corriBtn && !stick.interagisci) return t;
  const spinta = Math.hypot(stick.x, stick.y);
  return {
    avanti: t.avanti || stick.y < -ZONA_MORTA,
    indietro: t.indietro || stick.y > ZONA_MORTA,
    sinistra: t.sinistra || stick.x < -ZONA_MORTA,
    destra: t.destra || stick.x > ZONA_MORTA,
    // spinta a fondo corsa = corsa a piedi (o il pulsante CORRI)
    corri: t.corri || stick.corriBtn || spinta > 0.9,
    freno: t.freno || stick.freno,
    interagisci: t.interagisci || stick.interagisci,
    reset: t.reset,
  };
}
