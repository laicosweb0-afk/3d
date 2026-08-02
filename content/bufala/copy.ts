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
}

export const sceneCopy: Record<SceneId, SceneCopy> = {
  // L'attacco. Non si capisce cosa si sta guardando: il testo non deve
  // spiegarlo, deve solo invitare a continuare.
  s01: {
    titolo: 'Latte, caglio, sale.',
    nota: 'Scorri',
  },

  // Il ritiro: la forma si dichiara. Qui si può dire cos'è, ma senza enfasi.
  s02: {
    titolo: 'Mozzarella\ndi bufala.',
    nota: 'La produciamo noi',
  },

  // La materia. Si parla della superficie, non del sapore.
  s03: {
    titolo: 'La pelle\ntrattiene il siero.',
  },

  // Le mani. È il momento della fiducia. Nessun numero, nessun dettaglio di
  // lavorazione: non li conosciamo, e inventarli sarebbe il modo più veloce
  // di perdere la credibilità che questa scena serve a costruire.
  s04: {
    titolo: 'Passa di mano\nin mano.',
  },

  // Il culmine. La frase più corta del sito, perché l'immagine parla da sé.
  s05: {
    titolo: 'Poi si apre.',
  },

  // La freschezza. Che una mozzarella si misuri in ore è una proprietà del
  // prodotto, non un vanto sui tempi di questa azienda: quelli non li
  // conosciamo. ⚠️ Se il cliente conferma i tempi reali, questa è la scena
  // dove dirli — è il suo argomento di vendita più forte.
  s06: {
    titolo: 'Una mozzarella\nsi misura in ore.',
  },

  // Gli altri prodotti. ⚠️ L'elenco è quello raffigurato nell'immagine
  // generata: va sostituito con i prodotti che il cliente vende davvero.
  s07: {
    titolo: 'E tutto\nquello che segue.',
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
    titolo: 'I prodotti',
    // ⚠️ L'elenco reale non è ancora stato fornito dal cliente. Finché non
    // arriva, la sezione resta fuori: meglio una sezione in meno che una
    // sezione inventata (regola non negoziabile del progetto).
    elenco: null as string[] | null,
  },
  dove: { titolo: 'Dove siamo' },
  contatti: { titolo: 'Contatti' },
} as const;
