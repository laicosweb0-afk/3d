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
   *  comanda chi scorre. Le scene con `video` devono essere consecutive.
   *  L'immagine resta dichiarata comunque: serve da ripiego se il video non
   *  può partire. */
  video?: boolean;

  /** I secondi del filmato coperti da questa scena, da inizio a fine.
   *
   *  È il punto della regia: prima il video veniva spalmato in parti uguali
   *  sull'arco delle scene, e il risultato era che i titoli non avevano
   *  niente a che vedere con quello che si vedeva — "Una lama" compariva a
   *  7,3 s mentre il coltello entrava a 10. Dichiarando qui gli istanti,
   *  ogni titolo possiede il proprio movimento: il testo cambia quando
   *  cambia il gesto, non quando è scaduto un conteggio di viewport.
   *
   *  Vincoli: gli intervalli di scene consecutive devono combaciare
   *  (l'uscita di una è l'entrata della successiva), altrimenti il filmato
   *  salta al confine. Un intervallo con i due estremi uguali congela il
   *  fotogramma: è come si tiene ferma la fine della ripresa mentre la luce
   *  si spegne. Il rapporto secondi/vh dà la velocità di riproduzione: se
   *  due scene vicine hanno rapporti molto diversi, al confine si sente uno
   *  scarto di velocità. */
  tempo?: [number, number];

  /** Come il filmato avanza dentro la scena.
   *
   *  `lineare` (predefinito) tiene una velocità costante: giusto quando le
   *  scene vicine hanno rapporti secondi/vh simili.
   *
   *  `dolce` parte e finisce ferma, accelerando in mezzo. Serve dove due
   *  scene vicine hanno velocità molto diverse: la hero tiene il filmato
   *  quasi immobile (0,17 s per viewport) e la discesa lo fa correre cinque
   *  volte tanto, e al confine quello scatto si vede — la mozzarella non
   *  entra, sobbalza. Con `dolce` su entrambe le scene la velocità arriva a
   *  zero da una parte e riparte da zero dall'altra: il passaggio non ha
   *  gradino. */
  curva?: 'lineare' | 'dolce';
  /** Nota di regia: perché la scena si muove così. Non è decorazione,
   *  è il contratto con chi ritarerà i numeri dopo di me. */
  nota: string;
}

export const regia: Record<SceneId, Regia> = {
  // Il campo vuoto attraversato da una goccia. Non c'è ancora niente da
  // guardare, e infatti si guarda la frase.
  s01: {
    video: true,
    immagine: 'macro',
    tempo: [0, 1.0],
    curva: 'dolce',
    zoom: [1.06, 1.0],
    luce: [0.6, 1.0],
    nota: 'Il campo vuoto e la frase. Il soggetto non c’è ancora: sta arrivando.',
  },

  // La discesa: entra veloce, frena, e l'inerzia stacca l'anello di gocce.
  s02: {
    video: true,
    immagine: 'intera',
    tempo: [1.0, 2.6],
    curva: 'dolce',
    zoom: [1.0, 1.0],
    luce: [1.0, 1.0],
    nota: 'La discesa. Il movimento è del soggetto, non della camera.',
  },

  // La sospensione: gira su sé stessa fra le gocce che derivano. È il tratto
  // più lungo del viaggio perché è quello che si guarda più volentieri.
  s03: {
    video: true,
    immagine: 'macro',
    tempo: [2.6, 5.8],
    zoom: [1.0, 1.06],
    luce: [1.0, 1.0],
    nota: 'La sospensione: gira fra le gocce mentre la camera si avvicina di un soffio.',
  },

  // Scende la lama, dall'alto e al centro.
  s04: {
    video: true,
    immagine: 'mani',
    tempo: [5.8, 7.0],
    zoom: [1.06, 1.0],
    luce: [1.0, 1.0],
    nota: 'Entra la lama: la camera arretra quel tanto che serve al gesto.',
  },

  // Il taglio e quello che ne segue.
  s05: {
    video: true,
    immagine: 'taglio',
    tempo: [7.0, 9.6],
    zoom: [1.0, 1.04],
    luce: [1.0, 1.0],
    nota: 'Il clou: la lama apre la forma e il latte esplode.',
  },

  // Il latte invade il campo fino a coprire l'obiettivo. È la transizione:
  // il filmato consegna la pagina al documento senza uno stacco, perché
  // l'ultimo fotogramma è già il fondo su cui il documento si legge.
  s06: {
    video: true,
    immagine: 'intera',
    tempo: [9.6, 11.98],
    curva: 'dolce',
    zoom: [1.04, 1.0],
    luce: [1.0, 1.0],
    nota: 'Il latte copre l’obiettivo. Da qui comincia la pagina.',
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
