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
  /** pulsante SALTO (a piedi): l'equivalente dello Spazio sullo schermo */
  saltoBtn: false,
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
/**
 * Da qui in su la corsa comincia a MONTARE, in sfumatura fino a fondo
 * corsa. Il vecchio 0.92 era una soglia secca: a 43 px dei 46 della palla
 * il bersaglio di velocità saltava da ~2,2 a ~4,8 m/s attraversando meno
 * di un pixel di pollice, senza isteresi — sul bordo il personaggio poteva
 * oscillare cammina/corri a ogni tremolio del dito, e la camminata piena
 * (2,3 m/s) era irraggiungibile col solo stick. Con la sfumatura la soglia
 * non esiste più come gradino: 0.87 lascia ~6 px di palla alla corsa, cioè
 * al massimo ~0,5 m/s di bersaglio per pixel di dito.
 */
const SOGLIA_CORSA = 0.87;
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
  let corsaStick = 0;
  if (stick.attivo) {
    const m = Math.hypot(stick.x, stick.y);
    if (m > ZONA_MORTA) {
      // 0 al bordo della zona morta, 1 alla soglia di corsa: nessun salto,
      // e la banda della camminata copre TUTTA la sua corsa utile. Prima
      // si riscalava fino a fondo corsa (1) mentre la corsa scattava a
      // 0.92: la camminata piena non arrivava mai, e il tratto oltre la
      // soglia era spinta sprecata.
      spintaStick = Math.min(1, (m - ZONA_MORTA) / (SOGLIA_CORSA - ZONA_MORTA));
      // l'ultimo tratto della palla è la corsa, in analogico: la spinta
      // resta satura a 1 e a montare è `corsa`, così gli assi non calano
      // mai spingendo di più (la bici li usa come gas: un tuffo del modulo
      // a metà spinta sarebbe un colpo di freno fantasma)
      if (m > SOGLIA_CORSA) corsaStick = Math.min(1, (m - SOGLIA_CORSA) / (1 - SOGLIA_CORSA));
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
    corri: t.corri || stick.corriBtn || corsaStick > 0,
    // il tasto (Shift o CORRI) vale 1 secco, lo stick sfuma: è questo
    // numero — non il booleano — che il personaggio usa per il bersaglio
    corsa: t.corri || stick.corriBtn ? 1 : corsaStick,
    freno: t.freno || stick.freno,
    // lo Spazio E il bottone ↑ chiedono il salto; il freno resta com'è,
    // perché a decidere quale dei due mestieri dello Spazio conta è il
    // Player, che conosce la modalità. In auto `salta` è true mentre si
    // frena e non fa niente: nessuno lo legge da dietro un volante.
    salta: t.freno || stick.saltoBtn,
    interagisci: t.interagisci || stick.interagisci,
    reset: t.reset,
    colpisci: t.colpisci || stick.pugnoBtn,
  };
}
