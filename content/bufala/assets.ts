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

const BASE = '/assets/bufala';

export interface Asset {
  src: string;
  /** Descrizione per chi non vede l'immagine. */
  alt: string;
}

export const immagini = {
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
  /** Gli altri prodotti del banco, stessa luce e stessa ardesia. */
  famiglia: {
    src: `${BASE}/famiglia.webp`,
    alt: 'Treccia, bocconcini, burrata e ricotta di bufala su ardesia',
  },
} as const satisfies Record<string, Asset>;

/** Lo scatto di riferimento da cui è stato ricavato il modello 3D.
 *  Non è usato nel sito: serve a poter rigenerare il 3D senza ripartire da
 *  una nuova generazione. */
export const riferimento3D = `${BASE}/riferimento-3d.webp`;

/** Il modello 3D della mozzarella. Non ancora montato: va scaricato,
 *  ottimizzato e illuminato in scena. È l'asset su cui si costruirà la
 *  versione in cui l'oggetto accompagna tutto il sito. */
export const modello3D =
  'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/90720880-daa4-499e-8727-4d6905405586.glb';
