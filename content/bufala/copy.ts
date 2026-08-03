// Il copy del viaggio.
//
// Regole di scrittura (DIRECTION_BUFALA.md §4 e SCALETTA_BUFALA.md §6):
// affermazioni brevi, nessuna spiegazione, nessun claim commerciale che non
// sia verificabile, nessun riferimento geografico (vincolo esplicito del
// cliente). Niente superlativi, niente "il migliore", niente "da sempre":
// un marchio premium non si autoproclama, mostra.
//
// Ogni riga dice una cosa sola e la dice piana. Se una frase potrebbe stare
// sul sito di un qualsiasi altro caseificio, è sbagliata e va riscritta.
//
// ⚠️ Da approvare col cliente prima della pubblicazione: sono parole scritte
// per lui, non da lui.

import type { SceneId } from '@/lib/bufala/scenes';

export interface SceneCopy {
  /** Titolo grande. Poche parole: gli a capo sono voluti, non casuali. */
  titolo: string;
  /** Riga di accompagnamento, opzionale. Corpo piccolo, sotto il titolo. */
  nota?: string;
  /** Solo per la hero: il payoff. Non è un sottotitolo — vive lontano dalla
   *  headline, in fondo al campo. La distanza è il messaggio: un marchio di
   *  lusso non ha bisogno di stare attaccato al proprio nome. */
  payoff?: string;
}

export const sceneCopy: Record<SceneId, SceneCopy> = {
  // La hero. Headline dominante, payoff piccolo e lontanissimo, niente
  // altro: nessun cliché di categoria (tradizione, artigianale, qualità,
  // genuinità, passione) — sono le parole che ogni caseificio usa, e sono
  // esattamente ciò che impedisce di sembrare un marchio internazionale.
  s01: {
    titolo: 'La semplicità\nrichiede eccellenza.',
    payoff: 'Mozzarella di Bufala',
    nota: 'Scorri',
  },

  // La discesa: l'oggetto entra in campo e il sito dice di chi è.
  //
  // Qui prima c'era "Mozzarella di bufala." — le stesse identiche parole del
  // payoff della hero, che la precede di due secondi. Con i titoli tutti
  // nella fascia bassa le due righe si incrociavano nello stesso punto dello
  // schermo, e per un tratto di scroll si leggevano sovrapposte: la
  // ripetizione, che era già un difetto del testo, diventava un difetto
  // visibile. Dirlo due volte non lo rende più vero.
  //
  // Al suo posto l'unica cosa che nessun concorrente può copiare: che la
  // mozzarella è loro. È un dato confermato dal cliente — la produce lui —
  // e non nomina nessun luogo, come da vincolo.
  s02: {
    titolo: 'La produciamo\nnoi.',
  },

  // La materia, mentre il soggetto ruota appena: si parla della superficie,
  // non del sapore.
  // Da qui in poi il testo non racconta più il filmato.
  //
  // Prima diceva "La pelle trattiene il siero", "Una lama. Nient'altro.",
  // "Poi si apre": didascalie di quello che si stava già vedendo. Un titolo
  // che descrive l'immagine sotto non aggiunge niente e consuma l'unica
  // occasione che il sito ha di dire chi è. E lega il testo al filmato: se
  // un giorno si cambia ripresa, il copy diventa falso.
  //
  // Le frasi parlano invece del progetto: la bufala, il caseificio, il
  // banco. Restano vere anche se il filmato cambia.
  s03: {
    titolo: 'Un latte solo:\nquello di bufala.',
  },

  // Il vero elemento di distinzione: non rivendono, producono. È un dato
  // confermato dal cliente, e non nomina nessun luogo (vincolo esplicito).
  s04: {
    titolo: 'Dietro, un caseificio.\nNon un magazzino.',
  },

  // La frase più corta del sito, dove il filmato è più forte: qui le parole
  // devono togliersi di mezzo.
  s05: {
    titolo: 'Nessuna scorciatoia.',
  },

  s06: {
    titolo: 'Una mozzarella\nsi misura in ore.',
  },

  // I prodotti reali del banco. Non solo la mozzarella prodotta da loro:
  // anche le specialità italiane che selezionano, come dice il claim del
  // loro stesso logo ("prodotti tipici italiani").
  s07: {
    titolo: "L'eccellenza,\nsenza compromessi.",
  },

  // Il congedo: si passa il testimone al documento.
  s08: {
    titolo: 'Vi aspettiamo\nal banco.',
  },
};

/** Le sezioni dopo il viaggio. */
export const sezioni = {
  banco: {
    titolo: 'Il banco',
    frase: 'Si entra, si guarda, si chiede.',
    testo:
      'Il punto vendita è aperto a grossisti e privati senza distinzione: si entra, si assaggia, si porta via quello che serve.',
  },
  prodotti: {
    titolo: 'Al banco',
    frase: 'La nostra mozzarella, e una selezione che le sta accanto.',
    // Nessun elenco scritto: i prodotti si mostrano, non si elencano. Le
    // foto sono quelle reali del cliente, con i marchi dei produttori che
    // seleziona — è più credibile di qualsiasi lista.
  },
  dove: { titolo: 'Dove siamo' },
  contatti: { titolo: 'Contatti' },
} as const;
