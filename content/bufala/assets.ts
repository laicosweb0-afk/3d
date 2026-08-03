// Gli asset visivi del viaggio.
//
// I file vivono nel progetto, in `public/assets/bufala/`: un sito di
// produzione non dipende dal CDN di un fornitore di generazione, che può
// cambiare gli indirizzi o scadere.
//
// Formato WebP a qualità 84: le foto originali pesavano 4,6 MB in tutto,
// ora ne pesano 134 KB — con una differenza non percepibile (PSNR sopra i
// 40 dB su tutte). Su un sito che si vuole premium la lentezza si nota
// quanto un dettaglio grafico sbagliato.

import { BASE_PATH } from '@/lib/asset';

// Il prefisso base viene dall'ambiente: vuoto quando il sito vive alla
// radice del dominio, "/3d" quando è pubblicato in una sottocartella come
// l'anteprima su GitHub Pages. Senza, in anteprima non carica *niente* —
// né foto né video — perché ogni percorso punterebbe alla radice sbagliata.
const BASE = `${BASE_PATH}/assets/bufala`;

export interface Asset {
  src: string;
  /** Descrizione per chi non vede l'immagine. */
  alt: string;
  /** Come l'immagine riempie il palco.
   *  `cover` (predefinito) la ingrandisce fino a coprire tutto: giusto per
   *  le inquadrature con un soggetto solo, dove tagliare i bordi non toglie
   *  niente. `contain` la mostra intera: serve quando la composizione *è*
   *  il contenuto — una fila di prodotti tagliata ai lati perde il senso. */
  adatta?: 'cover' | 'contain';
}

export type Inquadratura =
  | 'macro' | 'intera' | 'mani' | 'taglio' | 'famiglia';

export const immagini: Record<Inquadratura, Asset> = {
  /** Macro sulla superficie bagnata, con la goccia sospesa: l'attacco.
   *  La goccia nella foto coincide con la transizione-firma della scaletta
   *  (§4) — non era previsto, ma è il motivo per cui questa è la hero. */
  macro: {
    src: `${BASE}/macro.webp`,
    alt: 'La superficie bagnata della mozzarella in macro, con una goccia di siero',
  },
  /** La forma intera sull'ardesia, soggetto a sinistra: lo spazio vuoto a
   *  destra è dove si impagina la tipografia. */
  intera: {
    src: `${BASE}/intera.webp`,
    alt: 'Una mozzarella di bufala intera su una lastra di ardesia',
  },
  /** Le mani che la sostengono: la prima scala umana del viaggio. */
  mani: {
    src: `${BASE}/mani.webp`,
    alt: 'Due mani sostengono una mozzarella di bufala sopra una lastra di ardesia',
  },
  /** Il taglio: la pasta aperta, i filamenti, il latte sull'ardesia.
   *  È il culmine del viaggio — la scena per cui si è scorso fin lì. */
  taglio: {
    src: `${BASE}/taglio.webp`,
    alt: 'Una mozzarella di bufala aperta, con il cuore filante e il latte che cola',
  },
  /** La selezione del banco, in fila sullo stesso set delle altre scene.
   *  Lo scatto originale del cliente aveva il titolo composto dentro
   *  l'immagine: è stato ritagliato via, perché il testo del sito deve
   *  restare vivo — scala su ogni schermo, si seleziona, e si cambia senza
   *  rigenerare la fotografia. Sotto restano i prodotti con l'aria sopra in
   *  cui la tipografia si impagina. */
  famiglia: {
    src: `${BASE}/famiglia.webp`,
    alt: 'La selezione del banco: formaggi, olive, friarielli e prosciutto stagionato',
    // Intera, non ritagliata: la fila di prodotti è la composizione, e
    // tagliata ai lati perderebbe i due prodotti di testa e di coda. Le
    // bande che restano sopra e sotto non si vedono, perché il fondo dello
    // scatto è lo stesso verde del palco.
    adatta: 'contain',
  },
};

/** Il video legato allo scroll: è questo il "3D" del sito.
 *
 *  Un unico piano: campo vuoto attraversato da una goccia, poi la mozzarella
 *  scende dall'alto e frena in sospensione staccando un anello di goccioline
 *  che resta sospeso, gira su sé stessa con un bordo di luce che ne segue la
 *  sagoma, e infine una lama scende dall'alto e la apre.
 *
 *  Girato da 12 secondi e tenuto a 7,5: dopo quell'istante il modello perde
 *  il soggetto — le due metà si appiattiscono in due ali e compare in mezzo
 *  un terzo oggetto che non è mozzarella. La ripresa si taglia dove è ancora
 *  vera. L'ultima parte, in cui il latte copriva l'obiettivo di bianco, è
 *  andata persa con essa: quel passaggio lo fa il velo di latte in CSS.
 *
 *  Ripulito dal filo di sospensione con tools/bufala-filo.mjs, e ricodificato
 *  da tools/bufala-video.mjs con fotogrammi chiave ravvicinati, senza i quali
 *  lo scrub singhiozza.
 *
 *  ⚠️ Il numero nel nome è una versione, e va aumentato ogni volta che il
 *  filmato cambia. Sostituire il contenuto lasciando lo stesso nome non
 *  basta: i browser tengono i file in cache per URL, e chi ha già visitato
 *  il sito continua a vedere il filmato vecchio finché la cache non scade —
 *  senza nessun modo, per lui, di accorgersene o di forzarla (su iPhone il
 *  ricaricamento forzato non esiste). Un nome nuovo è un URL nuovo, e un URL
 *  nuovo non può essere servito da una cache. */
export const video = {
  webm: `${BASE}/mozzarella-4.webm`,
  mp4: `${BASE}/mozzarella-4.mp4`,
  poster: `${BASE}/mozzarella-4-poster.webp`,
};

/** I prodotti reali del banco, fotografati dal cliente sullo stesso set
 *  (fondo verde, basilico, olio, ardesia) delle scene del viaggio: la
 *  coerenza non è nostra, è già nel loro materiale.
 *
 *  Sono in formato ritratto — vanno in fila, non a tutto schermo: un
 *  ritratto dentro un'inquadratura panoramica si taglierebbe male.
 *
 *  Nota: portano i marchi dei produttori (Moncalo, La Campagnola, Corte
 *  Poderi, Luliva). Non è un problema, è il racconto giusto — "Quelli della
 *  bufala" produce la propria mozzarella e seleziona specialità italiane,
 *  come dice il claim del loro stesso logo. */
export const prodotti = [
  { src: `${BASE}/p-caprino.webp`, alt: 'Formaggio di capra' },
  { src: `${BASE}/p-prataiola.webp`, alt: 'Prataiola alla rucola, formaggio di pecora' },
  { src: `${BASE}/p-prosciutto.webp`, alt: 'Prosciutto stagionato' },
  { src: `${BASE}/p-friarielli.webp`, alt: "Friarielli all'olio" },
  { src: `${BASE}/p-olive.webp`, alt: 'Olive verdi Bella di Cerignola' },
] as const;

/** Lo scatto di riferimento da cui è stato ricavato il modello 3D.
 *  Non è usato nel sito: serve a poter rigenerare il 3D senza ripartire da
 *  una nuova generazione. */
export const riferimento3D = `${BASE}/riferimento-3d.webp`;

/** Il modello 3D della mozzarella. Non ancora montato: va scaricato,
 *  ottimizzato e illuminato in scena. È l'asset su cui si costruirà la
 *  versione in cui l'oggetto accompagna tutto il sito. */
export const modello3D =
  'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/90720880-daa4-499e-8727-4d6905405586.glb';
