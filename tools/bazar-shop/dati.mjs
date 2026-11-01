/**
 * BAZAR MARRAKECH — i dati del negozio online.
 *
 * Unica fonte per tutte le pagine: `node tools/bazar-shop/build.mjs` le
 * rigenera in public/bazar-shop/. Qui non c'è niente di inventato:
 *
 *  - NEGOZIO: dal biglietto da visita (gli stessi della card NFC,
 *    bazar/src/config/gioco.ts). Orari: dal cartello sulla porta.
 *  - SET: solo le composizioni fotografate insieme. Prezzi, misure e
 *    composizioni definitive restano vuoti finché il negozio non li dà;
 *    le pagine mostrano solo i campi compilati.
 */

export const NEGOZIO = {
  nome: 'Bazar Marrakech',
  ragioneSociale: 'Bazar Marrakech S.n.c.',
  via: 'Via Fratelli Zucchini 5',
  cap: '48022',
  citta: 'Lugo',
  provincia: 'RA',
  mappa: 'https://maps.google.com/?q=Via+Fratelli+Zucchini+5,+48022+Lugo+RA',
  /** Dal biglietto da visita. I numeri del cartello sulla porta
   *  (347 570 5464, 327 652 6025) non sono inseriti: da confermare. */
  telefoni: [
    { nome: 'Fatima Zahra', numero: '328 785 3098' },
    { nome: 'Salah', numero: '389 012 7054' },
  ],
  email: 'bazarmarrakech.snc@hotmail.com',
  instagram: 'bazar.marrakech9',
  /** P.IVA: da inserire (obbligatoria nel piè di pagina di un sito commerciale). */
  piva: '',
};

/** Dal cartello sulla porta. `giorni`: 0 = domenica … 6 = sabato. */
export const ORARI = [
  { etichetta: 'Lunedì – Sabato', giorni: [1, 2, 3, 4, 5, 6], fasce: [['09:00', '13:00'], ['15:30', '20:00']] },
  { etichetta: 'Domenica', giorni: [0], fasce: [['09:00', '13:00']] },
];

/**
 * Invio delle richieste d'ordine: Web3Forms (https://web3forms.com).
 * Il negozio crea la chiave gratis con l'email bazarmarrakech.snc@hotmail.com
 * e la incolla qui. Finché è vuota il modulo NON finge di inviare: offre
 * l'invio tramite il programma di posta del cliente.
 */
export const WEB3FORMS_KEY = '';

/** Numero WhatsApp ufficiale, con prefisso e senza spazi (es. '393890127054').
 *  Vuoto = nessun pulsante WhatsApp. */
export const WHATSAPP = ''; // [NUMERO WHATSAPP DA CONFERMARE]

/** Il messaggio già scritto del pulsante WhatsApp nell'header. [TESTO DA CONFERMARE] */
export const WHATSAPP_MESSAGGIO = 'Buongiorno, vorrei informazioni sui vostri salotti e prenotare una visita allo showroom di Lugo.';

/** Documenti legali: quando il testo vero è pronto, `pronto: true`. */
export const LEGALI = [
  { slug: 'privacy', titolo: 'Privacy policy', pronto: false },
  { slug: 'cookie', titolo: 'Cookie policy', pronto: false },
  { slug: 'condizioni', titolo: 'Condizioni di vendita', pronto: false },
];

const img = (file, w, h, alt) => ({ file, w, h, alt });

/**
 * I set. Ogni campo vuoto (prezzo, misure, configurazioni, materiali) non
 * compare in pagina. `composizioneFoto` è ciò che si vede nella foto, non
 * una composizione commerciale: quella va in `configurazioni` quando il
 * negozio la conferma.
 */
export const SET = [
  {
    slug: 'salotto-tortora',
    nome: 'Salotto Tortora',
    collezione: 'Capitonné',
    stile: 'capitonne',
    colore: { id: 'tortora', nome: 'Tortora', hex: '#9C8F80' },
    breve: 'Velluto tortora, capitonné e profili in oro, dal divano alle poltrone.',
    descrizione: [
      'Uno schienale che gira tutto intorno, come un abbraccio. Il capitonné fitto, il velluto arricciato sui fianchi e un profilo d\'oro che segue ogni curva.',
      'Le poltrone tonde riprendono le stesse linee, i tavolini nesting lo stesso oro: un salotto pensato come un insieme.',
    ],
    composizioneFoto: ['Divano capitonné', 'Due poltrone tonde girevoli', 'Tavolini nesting in oro'],
    finiture: ['Velluto tortora', 'Lavorazione capitonné', 'Profili e basi color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    /** Copertina in studio (tools/bazar-shop/studio.py): card, borsa, anteprime. */
    copertina: img('studio/salotto-tortora', 1600, 1200, 'Salotto Tortora: divano capitonné, due poltrone tonde e tavolini nesting'),
    foto: [
      img('studio/salotto-tortora', 1600, 1200, 'Salotto Tortora: divano capitonné, due poltrone tonde e tavolini nesting'),
      img('salotto-completo', 1200, 670, 'Salotto Tortora completo, ambientato'),
      img('studio/divano-tortora', 1600, 1200, 'Divano capitonné tortora con profili in oro, vista di tre quarti'),
      img('divano-ambientato', 640, 800, 'Divano capitonné tortora in un soggiorno con vista sulla città'),
      img('poltrone-tonde-salotto', 760, 950, 'Due poltrone tonde capitonné accanto ai tavolini nesting'),
      img('studio/divano-tortora-studio', 1600, 1200, 'Divano capitonné tortora, vista frontale'),
      img('studio/poltrona-tonda', 1600, 2000, 'Poltrona tonda capitonné in velluto tortora con base color oro'),
      img('velluto-dettaglio', 720, 900, 'Dettaglio del velluto tortora e del profilo in oro'),
      img('tavolini-oro', 490, 612, 'Tavolini nesting con struttura color oro'),
    ],
  },
  {
    slug: 'salotto-beige',
    nome: 'Salotto Beige',
    collezione: 'Chesterfield',
    stile: 'chesterfield',
    colore: { id: 'beige', nome: 'Beige', hex: '#E6D8C3' },
    breve: 'Due chesterfield affacciati, luminosi, con il tavolino in marmo fra loro.',
    descrizione: [
      'Due divani uno di fronte all\'altro: il salotto della conversazione.',
      'Il beige porta la luce, il capitonné disegna gli schienali, l\'oro li solleva da terra.',
    ],
    composizioneFoto: ['Due divani chesterfield', 'Tavolino in marmo e oro'],
    finiture: ['Velluto beige', 'Lavorazione capitonné', 'Gambe color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    foto: [
      img('divano-beige', 1000, 749, 'Salotto Beige: due divani chesterfield affacciati con tavolino in marmo'),
    ],
  },
];
