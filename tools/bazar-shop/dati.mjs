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
  {
    slug: 'salotto-nero',
    nome: 'Salotto Nero',
    collezione: 'Capitonné',
    stile: 'capitonne',
    colore: { id: 'nero', nome: 'Nero', hex: '#1B1A19' },
    breve: 'Velluto nero, capitonné e profili argento, con il tavolino ovale e il mobile basso.',
    descrizione: [
      'Il nero pieno del velluto, il capitonné sugli schienali e un filo d’argento sui cuscini e alla base delle poltrone.',
      'Al centro, il tavolino ovale effetto marmo nero con i piedi color oro; davanti, il mobile basso col piano chiaro.',
    ],
    composizioneFoto: ['Due divani in velluto nero', 'Due poltrone', 'Tavolino ovale effetto marmo nero', 'Mobile basso con piano effetto marmo bianco'],
    finiture: ['Velluto nero', 'Lavorazione capitonné', 'Profili color argento', 'Piedi del tavolino color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/salotto-nero-poltrone', 1600, 1200, 'Le poltrone in velluto nero del Salotto Nero'),
    foto: [
      img('studio/salotto-nero-poltrone', 1600, 1200, 'Le poltrone in velluto nero con base color argento'),
      img('salotto-nero-scena', 1200, 944, 'Salotto Nero completo nello showroom'),
      img('studio/salotto-nero-tavolino', 1600, 1200, 'Tavolino ovale effetto marmo nero con piedi color oro'),
      img('studio/salotto-nero-mobile', 1600, 1200, 'Mobile basso con piano effetto marmo bianco'),
      img('salotto-nero-poltrone', 1000, 1333, 'Le poltrone in velluto nero con base color argento'),
      img('salotto-nero-tavolino', 1000, 1333, 'Tavolino ovale effetto marmo nero davanti ai divani'),
      img('salotto-nero-tavolino-alto', 1000, 1333, 'Il piano del tavolino ovale, effetto marmo nero con venature chiare'),
    ],
  },
  {
    slug: 'salotto-avorio',
    nome: 'Salotto Avorio',
    collezione: 'Contemporanea',
    stile: 'contemporanea',
    colore: { id: 'avorio', nome: 'Avorio', hex: '#ECE4D6' },
    breve: 'Tessuto avorio lavorato, schienale a canne, inserti a specchio e piedi color oro.',
    descrizione: [
      'Uno schienale a canne verticali, il tessuto avorio lavorato a rilievo, gli inserti a specchio che incorniciano i braccioli.',
      'Le poltrone riprendono lo stesso tessuto, con la base color oro disegnata come una scultura.',
    ],
    composizioneFoto: ['Divano con schienale a canne', 'Due poltrone'],
    finiture: ['Tessuto avorio lavorato', 'Inserti a specchio', 'Piedi color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/salotto-avorio-poltrone', 1600, 1200, 'Le due poltrone del Salotto Avorio, tessuto lavorato e base color oro'),
    foto: [
      img('salotto-avorio-divano', 1200, 736, 'Divano avorio con schienale a canne e inserti a specchio'),
      img('studio/salotto-avorio-poltrone', 1600, 1200, 'Le due poltrone del Salotto Avorio'),
      img('salotto-avorio-poltrone', 1100, 851, 'Le poltrone avorio nello showroom'),
    ],
  },
  {
    slug: 'sala-pranzo-avorio',
    tipo: 'pranzo',
    nome: 'Sala da pranzo Avorio',
    collezione: 'Sale da pranzo',
    stile: 'sale-da-pranzo',
    colore: { id: 'avorio', nome: 'Avorio', hex: '#ECE4D6' },
    breve: 'Piano avorio con la greca e il centro effetto marmo nero, base a canne su zoccolo color oro.',
    descrizione: [
      'Il piano avorio incornicia un centro effetto marmo nero con una greca sottile; sotto, la base a canne poggia su uno zoccolo color oro.',
      'Intorno, sedie imbottite trapuntate a rombi.',
    ],
    composizioneFoto: ['Tavolo con piano avorio e greca', 'Sedie imbottite trapuntate'],
    finiture: ['Piano avorio con greca', 'Centro effetto marmo nero', 'Base a canne, zoccolo color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    foto: [img('pranzo-avorio', 1000, 1333, 'Tavolo con piano avorio, greca e centro effetto marmo nero, con le sedie imbottite')],
  },
  {
    slug: 'sala-pranzo-nero-oro',
    tipo: 'pranzo',
    nome: 'Sala da pranzo Nero e Oro',
    collezione: 'Sale da pranzo',
    stile: 'sale-da-pranzo',
    colore: { id: 'nero', nome: 'Nero', hex: '#1B1A19' },
    breve: 'Tavolo effetto marmo nero su base a canne color oro, sedie in velluto nero.',
    descrizione: [
      'Il piano effetto marmo nero con le venature bianche, la base a canne color oro, le sedie in velluto nero con lo schienale trapuntato.',
    ],
    composizioneFoto: ['Tavolo effetto marmo nero con base a canne color oro', 'Sedie in velluto nero'],
    finiture: ['Piano effetto marmo nero', 'Base a canne color oro', 'Velluto nero'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    foto: [img('pranzo-nero-oro', 1000, 1667, 'Tavolo effetto marmo nero apparecchiato, con le sedie in velluto nero')],
  },
  {
    slug: 'sala-pranzo-ovale-blu',
    tipo: 'pranzo',
    nome: 'Sala da pranzo Ovale Blu',
    collezione: 'Sale da pranzo',
    stile: 'sale-da-pranzo',
    colore: { id: 'blu', nome: 'Blu', hex: '#3A4A6B' },
    breve: 'Tavolo ovale effetto marmo nero col bordo color oro, sedie in velluto blu.',
    descrizione: [
      'Un ovale effetto marmo nero, un filo color oro sul bordo e la base incrociata; intorno, sedie in velluto blu con il profilo color oro.',
    ],
    composizioneFoto: ['Tavolo ovale effetto marmo nero', 'Sedie in velluto blu'],
    finiture: ['Piano effetto marmo nero', 'Bordo e base color oro', 'Velluto blu'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/pranzo-ovale-blu', 1600, 1200, 'Sala da pranzo Ovale Blu: tavolo ovale effetto marmo nero e sedie in velluto blu'),
    foto: [
      img('studio/pranzo-ovale-blu', 1600, 1200, 'Tavolo ovale effetto marmo nero con le sedie in velluto blu'),
      img('pranzo-ovale-blu', 1100, 1069, 'La sala da pranzo Ovale Blu nello showroom'),
    ],
  },
  {
    slug: 'sala-pranzo-greca',
    tipo: 'pranzo',
    nome: 'Sala da pranzo Greca',
    collezione: 'Sale da pranzo',
    stile: 'sale-da-pranzo',
    colore: { id: 'avorio', nome: 'Avorio', hex: '#ECE4D6' },
    breve: 'Piano avorio con la greca e il centro effetto marmo nero, sedie trapuntate moka e avorio.',
    descrizione: [
      'Il piano avorio è incorniciato da una greca brillante; al centro, un pannello effetto marmo nero con venature bianche.',
      'Le sedie hanno lo schienale avvolgente: avorio trapuntato davanti, moka trapuntato dietro, gambe nere con puntali color oro.',
    ],
    composizioneFoto: ['Tavolo rettangolare avorio con greca e centro effetto marmo nero', 'Sei sedie trapuntate moka e avorio'],
    finiture: ['Piano avorio con greca', 'Centro effetto marmo nero', 'Sedie in similpelle trapuntata', 'Puntali color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/sedia-moka', 1600, 2000, 'La sedia trapuntata moka e avorio della Sala da pranzo Greca'),
    foto: [
      img('pranzo-moka-scena', 1200, 1072, 'Sala da pranzo Greca nello showroom: tavolo avorio con greca e sei sedie trapuntate'),
      img('studio/sedia-moka', 1600, 2000, 'La sedia trapuntata moka e avorio, in studio'),
      img('pranzo-moka-sedia', 900, 1200, 'Lo schienale trapuntato moka con le cuciture a rombi'),
    ],
  },
  {
    slug: 'salotto-crema',
    nome: 'Salotto Crema',
    collezione: 'Contemporanea',
    stile: 'contemporanea',
    colore: { id: 'crema', nome: 'Crema', hex: '#EFE6D8' },
    breve: 'Divani a canne con le cornici a specchio e oro, poltrone avvolgenti, il mobile TV con il camino.',
    descrizione: [
      'Lo schienale a canne verticali, il tessuto crema lavorato a rilievo e i braccioli incorniciati da specchio e oro.',
      'Al centro il tavolino ovale effetto marmo con la fascia in pelle a righe; davanti, il mobile TV con il camino elettrico.',
    ],
    composizioneFoto: ['Due divani con schienale a canne', 'Due poltrone avvolgenti', 'Tavolino ovale effetto marmo', 'Mobile TV con camino elettrico'],
    finiture: ['Tessuto crema lavorato', 'Cornici a specchio e color oro', 'Piani effetto marmo', 'Basi color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/salotto-crema-camino', 1600, 1200, 'Salotto Crema: divani a canne, poltrone, tavolino ovale e mobile TV con camino'),
    foto: [
      img('studio/salotto-crema-camino', 1600, 1200, 'Salotto Crema completo con il mobile TV e il camino'),
      img('studio/salotto-crema-angolo', 1600, 1200, 'Salotto Crema in composizione ad angolo'),
      img('studio/tavolino-ovale-studio', 1600, 1200, 'Il tavolino ovale effetto marmo con la fascia in pelle a righe'),
      img('studio/mobile-tv-camino', 1600, 1200, 'Il mobile TV con il camino elettrico e il tavolino ovale'),
      img('nuovi/salotto-crema-camino', 1400, 1050, 'Salotto Crema completo con il mobile TV e il camino'),
      img('nuovi/salotto-crema-angolo', 1400, 1050, 'Salotto Crema in composizione ad angolo'),
      img('nuovi/tavolino-ovale-studio', 1400, 1254, 'Il tavolino ovale effetto marmo con la fascia in pelle a righe'),
      img('nuovi/mobile-tv-camino', 1400, 1050, 'Il mobile TV con il camino elettrico e il tavolino ovale'),
    ],
  },
  {
    slug: 'salotto-antracite',
    nome: 'Salotto Antracite',
    collezione: 'Contemporanea',
    stile: 'contemporanea',
    colore: { id: 'antracite', nome: 'Antracite', hex: '#3A3836' },
    breve: 'Divano a canne con i braccioli capitonné e i profili oro, poltrone avvolgenti sulla base color oro.',
    descrizione: [
      'Lo schienale a canne, i braccioli capitonné e un filo color oro che corre lungo tutto il profilo.',
      'Le poltrone hanno il retro lavorato a rilievo e appoggiano su una fascia color oro.',
    ],
    composizioneFoto: ['Divano a canne con braccioli capitonné', 'Divano capitonné', 'Due poltrone avvolgenti'],
    finiture: ['Velluto antracite lavorato', 'Profili color oro', 'Piedi color oro intrecciati'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/salotto-antracite', 1600, 1200, 'Salotto Antracite: divano a canne con profili oro e due poltrone'),
    foto: [
      img('studio/salotto-antracite', 1600, 1200, 'Salotto Antracite con il tappeto effetto marmo'),
      img('nuovi/salotto-antracite', 1400, 1154, 'Salotto Antracite con il tappeto effetto marmo'),
    ],
  },
  {
    slug: 'salotto-grafite',
    nome: 'Salotto Grafite',
    collezione: 'Contemporanea',
    stile: 'contemporanea',
    colore: { id: 'grafite', nome: 'Grafite', hex: '#4A4C55' },
    breve: 'Divani ad angolo con le cornici a specchio e oro, poltrone con la fascia oro, tavolino ovale chiaro.',
    descrizione: [
      'La stessa linea a canne del Salotto Crema, in velluto grafite: braccioli incorniciati da specchio e oro, basi a lamelle color oro.',
      'Le poltrone avvolgenti hanno una fascia color oro e i piedi a gabbia.',
    ],
    composizioneFoto: ['Divani in composizione ad angolo', 'Due poltrone avvolgenti', 'Tavolino ovale chiaro'],
    finiture: ['Velluto grafite lavorato', 'Cornici a specchio e color oro', 'Basi color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/salotto-grafite', 1600, 1200, 'Salotto Grafite: divani ad angolo, due poltrone e tavolino ovale'),
    foto: [
      img('studio/salotto-grafite', 1600, 1200, 'Salotto Grafite in composizione ad angolo'),
      img('nuovi/salotto-grafite', 1400, 1054, 'Salotto Grafite in composizione ad angolo'),
    ],
  },
  {
    slug: 'salotto-grigio',
    nome: 'Salotto Grigio',
    collezione: 'Chesterfield',
    stile: 'chesterfield',
    colore: { id: 'grigio', nome: 'Grigio', hex: '#7C7D80' },
    breve: 'Capitonné tutto intorno: due divani, due poltrone, il tavolino tondo nero e il mobile TV effetto marmo.',
    descrizione: [
      'Il capitonné fitto avvolge divani e poltrone, con un filo argento sul bracciolo.',
      'Al centro il tavolino tondo nero lucido; davanti, il mobile TV con il piano effetto marmo bianco e i piedi color oro.',
    ],
    composizioneFoto: ['Due divani capitonné', 'Due poltrone capitonné', 'Tavolino tondo nero', 'Mobile TV effetto marmo bianco'],
    finiture: ['Velluto grigio', 'Lavorazione capitonné', 'Profili color argento', 'Piedi del mobile color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/salotto-grigio', 1600, 1200, 'Salotto Grigio: divani e poltrone capitonné, tavolino tondo e mobile TV'),
    foto: [
      img('studio/salotto-grigio', 1600, 1200, 'Salotto Grigio completo, visto dall’alto'),
      img('nuovi/salotto-grigio', 1400, 1078, 'Salotto Grigio completo, visto dall’alto'),
    ],
  },
  {
    slug: 'salotto-sabbia',
    nome: 'Salotto Sabbia',
    collezione: 'Capitonné',
    stile: 'capitonne',
    colore: { id: 'sabbia', nome: 'Sabbia', hex: '#D8CFC2' },
    breve: 'Divani a canne e capitonné, poltrone avvolgenti, tavolini effetto marmo bruno con i cassetti decorati.',
    descrizione: [
      'Un divano con lo schienale a canne, l’altro capitonné; le poltrone avvolgenti hanno il tessuto lavorato a onde.',
      'Al centro due tavolini con il piano effetto marmo bruno e i cassetti decorati color oro.',
    ],
    composizioneFoto: ['Divano a canne', 'Divano capitonné', 'Due poltrone avvolgenti', 'Due tavolini con cassetti'],
    finiture: ['Tessuto sabbia lavorato', 'Profili color oro', 'Piani effetto marmo bruno'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/salotto-sabbia', 1600, 1200, 'Salotto Sabbia: divani, poltrone e tavolini effetto marmo bruno'),
    foto: [
      img('studio/salotto-sabbia', 1600, 1200, 'Salotto Sabbia completo'),
      img('nuovi/salotto-sabbia', 1400, 1050, 'Salotto Sabbia completo'),
    ],
  },
  {
    slug: 'mobile-tv-camino',
    tipo: 'complemento',
    nome: 'Mobile TV con camino',
    collezione: 'Complementi d’arredo',
    stile: 'complementi',
    colore: { id: 'taupe', nome: 'Taupe', hex: '#9C8F86' },
    breve: 'Piano effetto marmo, quattro cassetti in pelle a righe, il camino elettrico al centro, basi color oro.',
    descrizione: [
      'Il mobile TV ha il piano effetto marmo, quattro cassetti rivestiti in pelle a righe e il camino elettrico al centro.',
      'Si abbina al tavolino ovale con lo stesso piano e la stessa fascia in pelle.',
    ],
    composizioneFoto: ['Mobile TV con camino elettrico', 'Tavolino ovale abbinato'],
    finiture: ['Piano effetto marmo', 'Pelle a righe color taupe', 'Basi color oro'],
    configurazioni: [],
    misure: [],
    prezzo: null,
    copertina: img('studio/mobile-tv-camino', 1600, 1200, 'Mobile TV con camino elettrico e tavolino ovale effetto marmo'),
    foto: [
      img('studio/mobile-tv-camino', 1600, 1200, 'Il mobile TV con camino e il tavolino ovale'),
      img('studio/tavolino-ovale-studio', 1600, 1200, 'Il tavolino ovale effetto marmo con la fascia in pelle a righe'),
      img('studio/salotto-crema-camino', 1600, 1200, 'Il mobile TV nel Salotto Crema'),
      img('nuovi/mobile-tv-camino', 1400, 1050, 'Il mobile TV con camino e il tavolino ovale'),
      img('nuovi/tavolino-ovale-studio', 1400, 1254, 'Il tavolino ovale effetto marmo con la fascia in pelle a righe'),
      img('nuovi/salotto-crema-camino', 1400, 1050, 'Il mobile TV nel Salotto Crema'),
    ],
  },
];
