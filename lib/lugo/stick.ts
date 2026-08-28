'use client';

// L'UNICO ingresso del movimento. Tastiera e joystick virtuale finiscono
// entrambi qui e producono la stessa cosa: due assi normalizzati
// (ax = destra, az = avanti). Il resto del gioco legge solo quelli — e i
// booleani, che di quegli assi sono la lettura a soglia.
//
// Lo stato del joystick vive fuori da React apposta: lo scrive il
// componente DOM, lo legge la fisica a ogni frame, zero re-render.

import type { StatoInput } from './input';

export const stick = {
  /** true mentre un dito o il mouse sta trascinando la palla */
  attivo: false,
  /** -1..1, positivo verso destra */
  x: 0,
  /** -1..1, positivo verso il basso dello schermo (= indietro) */
  y: 0,
  /** pulsante FRENO tenuto premuto */
  freno: false,
  /** pulsante CORRI tenuto premuto (a piedi) */
  corriBtn: false,
  /** pulsante PUGNO */
  pugnoBtn: false,
  /** pulsante E tenuto premuto (il fronte lo gestisce già il Player) */
  interagisci: false,
};

export function resetStick() {
  stick.attivo = false;
  stick.x = 0;
  stick.y = 0;
}

/** Sotto questa spinta il joystick è considerato fermo (niente derive). */
export const ZONA_MORTA = 0.18;
/** Oltre questa spinta si scatta: a piedi è la corsa. */
const SOGLIA_CORSA = 0.92;
/** Da che spinta un asse conta come "tasto premuto" per l'auto. */
const SOGLIA_BOOL = 0.2;

/**
 * Fonde tastiera e joystick in un solo stato di input.
 * - la tastiera dà assi digitali (0 o ±1)
 * - il joystick dà assi analogici, riscalati oltre la zona morta così che
 *   il movimento parta da zero e non a scatti
 * - il vettore risultante viene limitato a modulo 1: in diagonale non si
 *   va più veloci che dritti
 */
export function conStick(t: StatoInput): StatoInput {
  let ax = (t.destra ? 1 : 0) - (t.sinistra ? 1 : 0);
  let az = (t.avanti ? 1 : 0) - (t.indietro ? 1 : 0);

  let spintaStick = 0;
  if (stick.attivo) {
    const m = Math.hypot(stick.x, stick.y);
    if (m > ZONA_MORTA) {
      // 0 al bordo della zona morta, 1 a fondo corsa: nessun salto
      spintaStick = Math.min(1, (m - ZONA_MORTA) / (1 - ZONA_MORTA));
      const k = spintaStick / m;
      ax += stick.x * k;
      az += -stick.y * k; // sullo schermo, giù = indietro
    }
  }

  const l = Math.hypot(ax, az);
  if (l > 1) {
    ax /= l;
    az /= l;
  }

  return {
    ax,
    az,
    // i booleani sono la lettura a soglia degli assi: una sola verità
    avanti: az > SOGLIA_BOOL,
    indietro: az < -SOGLIA_BOOL,
    sinistra: ax < -SOGLIA_BOOL,
    destra: ax > SOGLIA_BOOL,
    corri: t.corri || stick.corriBtn || spintaStick > SOGLIA_CORSA,
    freno: t.freno || stick.freno,
    interagisci: t.interagisci || stick.interagisci,
    reset: t.reset,
    colpisci: t.colpisci || stick.pugnoBtn,
  };
}
