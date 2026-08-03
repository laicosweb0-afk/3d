// La regia, scritta come dati. Ogni scena dichiara il proprio movimento;
// il palco li interpreta. Ritarare il ritmo è cambiare numeri qui, mai
// codice — stesso principio di Mondial Service (TECH_ARCHITECTURE.md §1,3).
//
// Il viaggio è un avvicinamento a un oggetto, non un attraversamento di
// spazi (SCALETTA_BUFALA.md §1): l'unico movimento primario è quindi la
// distanza, e `zoom` è il parametro che conta. Tutto il resto è contorno.

import type { SceneId } from '@/lib/bufala/scenes';
import type { Inquadratura } from './assets';

export interface Regia {
  /** L'immagine che occupa il palco in questa scena. Scene diverse possono
   *  condividere la stessa: il ritorno di un'inquadratura è un mezzo di
   *  regia, non una ripetizione — è ciò che tiene insieme il viaggio. */
  immagine: Inquadratura;
  /** Distanza dal soggetto, da inizio a fine scena. 1 = inquadratura piena;
   *  sopra 1 si è dentro il dettaglio, sotto 1 si è lontani. */
  zoom: [number, number];
  /** Intensità della luce sul soggetto, 0..1. */
  luce: [number, number];
  /** Deriva laterale in frazioni di viewport: quasi sempre zero — la camera
   *  si avvicina, non vaga. */
  deriva?: [number, number];
  /** Se vero, la scena mostra il video legato allo scroll invece
   *  dell'immagine: il fotogramma segue il progresso, così il gesto lo
   *  comanda chi scorre. Le scene con `video` devono essere consecutive —
   *  il palco le tratta come un unico arco e ci distribuisce sopra i 15
   *  secondi del filmato. L'immagine resta dichiarata comunque: serve da
   *  ripiego se il video non può partire. */
  video?: boolean;
  /** Nota di regia: perché la scena si muove così. Non è decorazione,
   *  è il contratto con chi ritarerà i numeri dopo di me. */
  nota: string;
}

export const regia: Record<SceneId, Regia> = {
  // Si parte dentro: la superficie riempie il campo e non si capisce cosa
  // sia. Il movimento è quasi fermo — deve sembrare un fermo immagine che
  // respira, così il primo scroll sorprende.
  s01: {
    immagine: 'macro',
    // Il ritiro — la transizione-firma della scaletta (§4) — avviene qui
    // dentro, sotto la headline ferma: si parte dentro la superficie, e
    // arretrando la si riconosce. Finisce esattamente dove comincia il
    // video, altrimenti al confine si vedrebbe uno scatto.
    zoom: [2.6, 1.12],
    luce: [0.55, 0.9],
    nota: 'Il ritiro: da superficie illeggibile a forma riconoscibile.',
  },

  // Qui comincia il video, e con esso il vero "3D" del sito: la mozzarella
  // scende dall'alto. La camera non ha bisogno di arretrare come faceva
  // prima — è il soggetto che entra in campo da solo.
  s02: {
    video: true,
    immagine: 'intera',
    zoom: [1.12, 1.06],
    luce: [0.75, 1.0],
    nota: 'La discesa. Il movimento è del soggetto, non della camera.',
  },

  // Si è posata. Un avvicinamento appena percettibile mentre ruota: la
  // materia si legge senza che serva uno stacco in macro.
  s03: {
    video: true,
    immagine: 'macro',
    zoom: [1.06, 1.16],
    luce: [1.0, 1.0],
    nota: 'La sosta. La camera si avvicina di un soffio mentre il soggetto ruota.',
  },

  // Entra la mano con la lama. La camera arretra di poco per far stare il
  // gesto in campo, non per cambiare inquadratura.
  s04: {
    video: true,
    immagine: 'mani',
    zoom: [1.16, 1.04],
    luce: [1.0, 1.0],
    nota: 'Entra la lama: la camera arretra quel tanto che serve al gesto.',
  },

  // Il taglio. Scena lunga e movimento corto: è la lentezza a dare peso.
  // Alla fine la camera si avvicina appena, sulle due metà e sul latte.
  s05: {
    video: true,
    immagine: 'taglio',
    zoom: [1.04, 1.18],
    luce: [1.0, 1.0],
    nota: 'Il clou. Il video finisce qui, sulle due metà e sul latte.',
  },

  // Il tempo: la luce cambia e la goccia dell'apertura finisce di cadere.
  // La distanza resta ferma — qui non ci si muove, si aspetta.
  s06: {
    immagine: 'intera',
    // La distanza finale deve combaciare con l'inizio di S07: il rig non
    // fa mai uno scatto tra due scene, anche quando il movimento primario
    // è un altro (qui la luce).
    zoom: [1.18, 1.0],
    luce: [1.0, 0.6],
    nota: 'Nessun avvicinamento: cambia solo la luce. È la scena dell’attesa.',
  },

  // Gli altri prodotti, uno alla volta, alla stessa distanza: la ripetizione
  // dell'inquadratura è ciò che li fa leggere come una famiglia.
  // La selezione del banco. La fila di prodotti è già composta dentro la
  // fotografia, quindi la camera non ha bisogno di muoversi: un lentissimo
  // avvicinamento basta a non far sembrare la scena un fermo immagine.
  s07: {
    immagine: 'famiglia',
    zoom: [1.0, 1.06],
    luce: [0.6, 0.95],
    nota: 'La fila è già nella foto: alla camera basta respirare.',
  },

  // Il congedo: tutto si allontana e si spegne, resta la firma.
  s08: {
    immagine: 'intera',
    // Riparte da dove finisce S07: nessuno scatto ai confini, mai.
    zoom: [1.06, 0.78],
    luce: [0.9, 0.25],
    nota: 'Si arretra e si spegne. La pagina prende il posto del piano sequenza.',
  },
};

/** La goccia: nasce in S01, resta sospesa per tutto il viaggio e completa
 *  la caduta solo in S06. Chiude il cerchio senza che nessuno lo spieghi
 *  (SCALETTA_BUFALA.md §4). Valori in frazioni di viewport. */
export const goccia = {
  /** Dove appare e dove si ferma, in S01. */
  nascita: { da: -0.06, a: 0.06 },
  /** Dove arriva quando finalmente cade, in S06. */
  caduta: 0.62,
} as const;
