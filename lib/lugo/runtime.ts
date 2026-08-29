// Stato "caldo" del gioco, aggiornato ogni frame fuori da React: posizioni,
// velocità, fasi. Il Player lo scrive; missioni, minimappa e audio lo
// leggono. Un singleton mutabile evita re-render e prop-drilling.

import type { StatoAuto } from './car';
import type { StatoPersona } from './character';
import type { Npc } from './npc';
import type { Modalita } from './store';

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
  /**
   * Quanto si è "in sella": 0 a piedi, 1 in bici, con la rampa in mezzo.
   * Sta qui e non nello store perché cambia a ogni fotogramma come
   * faseRuote, e perché è un numero continuo: la posa del ciclista si
   * MESCOLA con quella del camminatore invece di sostituirla di scatto.
   */
  sella: number;
  /** Inclinazione in curva della bici e di chi ci sta sopra (rad). */
  piega: number;
}

export const runtime: {
  rt: RuntimeGioco | null;
  /** Posizione della gazzella di pattuglia (per la collisione col giocatore). */
  gazzella: { x: number; z: number; yaw: number } | null;
  /** Camera pilotata dalla verifica (cartoline): attiva finché `fino` non scade. */
  cameraOverride: { x: number; y: number; z: number; tx: number; ty: number; tz: number; fino: number } | null;
  /**
   * I pedoni vivi (scritti da Npcs, letti dal Player per dialoghi e pugni).
   * Il tipo è quello vero: quando qui c'era { tipo; x; z } il Player doveva
   * passare da un doppio cast per toccare stato/timer/bx/bz del bersaglio, e
   * un cast è un controllo di tipo spento proprio dove serviva acceso.
   * L'import è di solo tipo: a runtime non nasce nessun ciclo.
   */
  npcs: Npc[] | null;
  /**
   * Il pugno in corso: `t` scende da 0,42 a 0 lungo l'animazione e il colpo
   * va a segno a metà strada, non all'istante del tasto. Stato caldo come
   * vPersona — lo scrive il Player, lo legge Character.tsx per piegare
   * spalla e busto, e non passa da React perché un pugno che fa un
   * re-render costa più del pugno.
   */
  pugno: { t: number; colpito: boolean; bersaglio: string | null; molesto: boolean; compagni: number };
  /** true quando la gazzella sta inseguendo il giocatore (wanted > 0). */
  caccia: boolean;
  /** true mentre il giocatore frena (per gli stop dell'auto). */
  frenata: boolean;
  /** Gli assi di movimento dell'ultimo frame (li legge la camera). */
  assi: { ax: number; az: number };
  /**
   * L'indice, dentro la lista delle imperfezioni, della bici che si sta
   * guidando (−1 = nessuna). La bici in sella È quella che era appoggiata
   * al muro: non se ne crea una nuova, si toglie quella dal muro.
   */
  biciInSella: number;
  /**
   * Gli indici delle bici da ridisegnare, che chi disegna svuota appena le
   * ha riscritte. Prendere o posare una bici deve costare sei matrici, non
   * un ri-render dell'intera città.
   */
  biciSporche: number[];
  /**
   * Contatore di revisione delle imperfezioni: un intero confrontato una
   * volta per fotogramma è gratis, e non fa passare da React niente che
   * cambia in mezzo al gioco.
   */
  revImperfezioni: number;
} = {
  rt: null,
  gazzella: null,
  cameraOverride: null,
  npcs: null,
  pugno: { t: 0, colpito: false, bersaglio: null, molesto: false, compagni: 0 },
  caccia: false,
  frenata: false,
  assi: { ax: 0, az: 0 },
  biciInSella: -1,
  biciSporche: [],
  revImperfezioni: 0,
};

/**
 * Posizione del giocatore attivo secondo la modalità. La bici VIVE su
 * rt.persona: è la scelta che fa funzionare da sola metà del gioco
 * (camera, minimappa, missioni, eventi, nome della via) senza toccarla.
 */
export function posGiocatore(mode: Modalita): { x: number; z: number; yaw: number } {
  const rt = runtime.rt;
  if (!rt) return { x: 0, z: 0, yaw: 0 };
  const t = mode === 'auto' ? rt.auto : rt.persona;
  return { x: t.x, z: t.z, yaw: t.yaw };
}
