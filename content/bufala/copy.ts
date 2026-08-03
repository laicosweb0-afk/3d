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
  // La hero: headline dominante, payoff piccolo e lontanissimo.
  s01: {
    titolo: 'La semplicità\nrichiede eccellenza.',
    payoff: 'Mozzarella di Bufala',
    nota: 'Scorri',
  },

  // I titoli non raccontano il filmato: parlano del progetto — la bufala,
  // il caseificio, il banco. Una didascalia di quello che si sta già
  // vedendo non aggiunge niente, consuma l'unica occasione che il sito ha
  // di dire chi è, e diventa falsa il giorno in cui si cambia ripresa.
  s02: {
    titolo: 'La produciamo\nnoi.',
  },

  s03: {
    titolo: 'Un latte solo:\nquello di bufala.',
  },

  // Il vero elemento di distinzione: non rivendono, producono. Dato
  // confermato dal cliente, e non nomina nessun luogo.
  s04: {
    titolo: 'Dietro, un caseificio.\nNon un magazzino.',
  },

  s05: {
    titolo: 'Nessuna scorciatoia.',
  },

  // Nessun titolo: qui il fotogramma diventa bianco, e un testo chiaro su
  // fondo chiaro sarebbe illeggibile per costruzione. La scena è una
  // transizione, non una pagina — le parole riprendono sotto, sul documento.
  s06: {
    titolo: '',
  },
};

/** Le sezioni dopo il viaggio. */
export const sezioni = {
  // L'apertura del documento, sul latte. Raccoglie la frase che stava
  // nell'ultima scena scura del viaggio: quella scena non esiste più, ma la
  // frase è del progetto e non del filmato, quindi vive benissimo qui.
  apertura: {
    frase: 'Una mozzarella si misura in ore.',
  },
  banco: {
    titolo: 'Il banco',
    frase: 'Si entra, si guarda, si chiede.',
    testo:
      'Il punto vendita è aperto a grossisti e privati senza distinzione: si entra, si assaggia, si porta via quello che serve.',
  },
  prodotti: {
    titolo: 'Al banco',
    frase: "L'eccellenza, senza compromessi.",
    testo: 'La nostra mozzarella, e una selezione che le sta accanto.',
    // Nessun elenco scritto: i prodotti si mostrano, non si elencano.
  },
  dove: { titolo: 'Dove siamo' },
  contatti: { titolo: 'Contatti' },
  congedo: { frase: 'Vi aspettiamo al banco.' },
} as const;
