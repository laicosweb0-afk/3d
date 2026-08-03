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
  /** Nota di regia: perché la scena si muove così. Non è decorazione,
   *  è il contratto con chi ritarerà i numeri dopo di me. */
  nota: string;
}

export const regia: Record<SceneId, Regia> = {
  // Il campo vuoto. Ardesia, verde profondo, una luce di taglio: non c'è
  // ancora niente da guardare, e infatti si guarda la frase.
  //
  // Prima qui c'era un ingrandimento fortissimo (2.6) su una macro, e il
  // sito si apriva "uscendo da uno zoom": un movimento che è solo un
  // movimento, senza un fatto dentro. Ora l'apertura è il primo fotogramma
  // del filmato, e il fatto arriva scorrendo — la mozzarella entra dall'alto
  // nel campo vuoto. Il video avanza pochissimo (0,35 s su 2 viewport):
  // quanto basta perché alla fine della hero si intraveda il soggetto
  // affacciarsi dal bordo alto, che è l'invito a continuare.
  s01: {
    video: true,
    immagine: 'macro',
    // Finisce a 0,35 s e non oltre: a 0,5 s il soggetto è già entrato nella
    // fascia alta, dove vive la headline. Il numero non è scelto a occhio,
    // è il fotogramma in cui la misura passa da "fondo scuro" a "occupato".
    tempo: [0, 0.35],
    zoom: [1.08, 1.02],
    luce: [0.55, 0.95],
    nota: 'Il campo vuoto e la frase. Il soggetto non c’è ancora: sta arrivando.',
  },

  // La discesa. Il movimento è tutto del soggetto: la camera sta ferma e
  // lascia che sia lui a entrare.
  s02: {
    video: true,
    immagine: 'intera',
    tempo: [0.35, 1.6],
    zoom: [1.02, 1.0],
    luce: [0.95, 1.0],
    nota: 'La discesa. Il movimento è del soggetto, non della camera.',
  },

  // La sospensione: resta in aria e gira. È il tratto più lungo perché è
  // quello che si guarda più volentieri — e perché la rotazione è la sola
  // cosa che rende leggibile la superficie senza uno stacco in macro.
  s03: {
    video: true,
    immagine: 'macro',
    tempo: [1.6, 4.8],
    zoom: [1.0, 1.08],
    luce: [1.0, 1.0],
    nota: 'La sospensione: gira su sé stessa mentre la camera si avvicina di un soffio.',
  },

  // Scende la lama, dall'alto e al centro. La camera arretra quel tanto che
  // serve a far stare il gesto in campo.
  s04: {
    video: true,
    immagine: 'mani',
    tempo: [4.8, 6.8],
    zoom: [1.08, 1.02],
    luce: [1.0, 1.0],
    nota: 'Entra la lama: la camera arretra quel tanto che serve al gesto.',
  },

  // Il taglio. Due secondi di filmato distribuiti su tre viewport: è il
  // tratto riprodotto più lentamente del viaggio, ed è voluto — qui la
  // lentezza è il peso.
  //
  // Finisce a 8,8 s e non a 10: negli ultimi 1,2 secondi le due metà
  // restano sospese ciascuna su un filo di latte verticale, e leggono come
  // due gambe sottili invece che come latte che cola. La ripresa si taglia
  // dov'è più forte — è un secondo numero da cambiare, se si preferisce
  // tenerla intera.
  s05: {
    video: true,
    immagine: 'taglio',
    tempo: [6.8, 8.8],
    zoom: [1.02, 1.12],
    luce: [1.0, 1.0],
    nota: 'Il clou. Le due metà si separano e il latte cade.',
  },

  // L'ultimo fotogramma tenuto fermo mentre la luce cala: la ripresa non
  // viene interrotta da uno stacco, si spegne.
  //
  // Prima qui tornava una fotografia della mozzarella *intera*, subito dopo
  // averla vista tagliare: una contraddizione visiva che nessuna dissolvenza
  // può salvare. Congelare la coda del filmato costa zero e non contraddice
  // niente.
  s06: {
    video: true,
    immagine: 'intera',
    tempo: [8.8, 8.8],
    // La distanza finale deve combaciare con l'inizio di S07: il rig non
    // fa mai uno scatto tra due scene, anche quando il movimento primario
    // è un altro (qui la luce).
    zoom: [1.12, 1.0],
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
