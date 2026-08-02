// La regia, scritta come dati. Ogni scena dichiara il proprio movimento;
// il palco li interpreta. Ritarare il ritmo è cambiare numeri qui, mai
// codice — stesso principio di Mondial Service (TECH_ARCHITECTURE.md §1,3).
//
// Il viaggio è un avvicinamento a un oggetto, non un attraversamento di
// spazi (SCALETTA_BUFALA.md §1): l'unico movimento primario è quindi la
// distanza, e `zoom` è il parametro che conta. Tutto il resto è contorno.

import type { SceneId } from '@/lib/bufala/scenes';
import { immagini } from './assets';

export interface Regia {
  /** L'immagine che occupa il palco in questa scena. Scene diverse possono
   *  condividere la stessa: il ritorno di un'inquadratura è un mezzo di
   *  regia, non una ripetizione — è ciò che tiene insieme il viaggio. */
  immagine: keyof typeof immagini;
  /** Distanza dal soggetto, da inizio a fine scena. 1 = inquadratura piena;
   *  sopra 1 si è dentro il dettaglio, sotto 1 si è lontani. */
  zoom: [number, number];
  /** Intensità della luce sul soggetto, 0..1. */
  luce: [number, number];
  /** Deriva laterale in frazioni di viewport: quasi sempre zero — la camera
   *  si avvicina, non vaga. */
  deriva?: [number, number];
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
    zoom: [2.6, 2.35],
    luce: [0.55, 0.7],
    nota: 'Macro illeggibile. Immobile: il movimento arriva dopo, ed è il ritiro.',
  },

  // Il ritiro: è la transizione-firma del sito. Nessun taglio, solo
  // distanza che cresce finché la forma si dichiara.
  s02: {
    immagine: 'intera',
    zoom: [2.35, 1.0],
    luce: [0.7, 1.0],
    nota: 'Il ritiro. La stessa inquadratura passa da astratta a riconoscibile.',
  },

  // Si torna dentro, ma ora sapendo cosa si guarda: è un'altra cosa.
  s03: {
    immagine: 'macro',
    zoom: [1.0, 2.1],
    luce: [1.0, 0.85],
    nota: 'Ritorno in macro, con lo sguardo informato: la materia, non l’enigma.',
  },

  // Le mani: prima scala umana. La camera indietreggia per farci stare
  // il gesto, e per la prima volta il soggetto non è solo.
  s04: {
    immagine: 'mani',
    zoom: [2.1, 0.95],
    luce: [0.85, 0.95],
    deriva: [0, -0.02],
    nota: 'Entra la mano: la camera arretra per fare spazio al gesto.',
  },

  // Il taglio: il movimento più lento di tutto il sito. Avvicinamento
  // minimo su una scena lunga — è la lentezza a dare peso, non l'ampiezza.
  s05: {
    immagine: 'taglio',
    zoom: [0.95, 1.35],
    luce: [0.95, 1.0],
    nota: 'Il clou. Scena lunga, movimento corto: il tempo fa il lavoro.',
  },

  // Il tempo: la luce cambia e la goccia dell'apertura finisce di cadere.
  // La distanza resta ferma — qui non ci si muove, si aspetta.
  s06: {
    immagine: 'intera',
    // La distanza finale deve combaciare con l'inizio di S07: il rig non
    // fa mai uno scatto tra due scene, anche quando il movimento primario
    // è un altro (qui la luce).
    zoom: [1.35, 1.0],
    luce: [1.0, 0.6],
    nota: 'Nessun avvicinamento: cambia solo la luce. È la scena dell’attesa.',
  },

  // Gli altri prodotti, uno alla volta, alla stessa distanza: la ripetizione
  // dell'inquadratura è ciò che li fa leggere come una famiglia.
  // Gli altri prodotti del banco, alla stessa distanza delle altre scene.
  // ⚠️ L'immagine attuale (quattro tipi di mozzarella, generata) è stata
  // scartata dal cliente: attende il suo scatto sostitutivo. Il resto della
  // scena è già tarato e non va toccato quando arriva la foto nuova.
  s07: {
    immagine: 'famiglia',
    zoom: [1.0, 1.0],
    luce: [0.6, 0.9],
    nota: 'Inquadratura ferma: sono i soggetti a cambiare, non la camera.',
  },

  // Il congedo: tutto si allontana e si spegne, resta la firma.
  s08: {
    immagine: 'intera',
    zoom: [1.0, 0.75],
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
