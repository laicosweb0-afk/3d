// Il cartone MediaPro — la scaletta, in un file solo.
//
// Questo file è la sceneggiatura eseguibile: i tempi qui dentro sono gli
// stessi che governano camera, oggetti e testi. Non esiste una seconda
// versione dei tempi da qualche altra parte, quindi spostare una battuta di
// mezzo secondo si fa qui e vale ovunque.
//
// Regola di costruzione (la stessa di tutto il repo): tutto è funzione pura
// del tempo `t` in secondi. Nessuna animazione accumulata, nessun `Date.now`,
// nessun numero casuale non seminato — se non lo fosse, lo stesso fotogramma
// non verrebbe identico due volte e il rendering fotogramma per fotogramma
// mostrerebbe scatti che a schermo non si vedono.

/** Fotogrammi al secondo del file consegnato. */
export const FPS = 30;

/** Durata totale in secondi. Trenta: il taglio che regge su Reel e TikTok. */
export const DURATA = 30;

/** Formato di consegna, in pixel. Verticale pieno. */
export const LARGHEZZA = 1080;
export const ALTEZZA = 1920;

export type Battuta = {
  id: string;
  nome: string;
  /** Inizio e fine in secondi. Le battute sono contigue: la fine di una è l'inizio della successiva. */
  da: number;
  a: number;
  /** L'occhiello piccolo in alto, quando la battuta vende un servizio. */
  etichetta?: string;
  /** La riga grande. Poche parole: si legge col telefono in mano, spesso senza audio. */
  testo?: string;
};

/**
 * Nove battute in trenta secondi.
 *
 * L'arco è quello che vende davvero: **il problema prima del servizio**. I
 * primi sei secondi non parlano di noi — parlano di un prodotto buono che
 * nessuno guarda, che è la situazione in cui si trova chi ci chiama. Solo
 * dopo entra il protagonista, e i quattro servizi arrivano come conseguenza,
 * nell'ordine in cui si lavora davvero (STEPS in components/mediapro/content.ts):
 * prima si capisce, poi si costruisce, poi si produce, poi si porta in giro.
 *
 * I sette servizi del sito non ci stanno in trenta secondi e non devono
 * starci: quattro capitoli detti bene valgono più di sette elencati. Gli
 * altri tre (social, web, e la parte di ottimizzazione) vivono nel sito, che
 * è dove va chi si è fermato a guardare.
 */
export const BATTUTE: Battuta[] = [
  {
    id: 'buio',
    nome: 'Il prodotto al buio',
    da: 0,
    a: 3,
    testo: 'Il tuo prodotto è buono.',
  },
  {
    id: 'indifferenza',
    nome: 'Il pubblico non si ferma',
    da: 3,
    a: 6,
    testo: 'Nessuno si ferma a guardarlo.',
  },
  {
    id: 'arrivo',
    nome: "L'arrivo di Pro",
    da: 6,
    a: 9,
    // Nessun testo: qui succede qualcosa, e una didascalia toglierebbe
    // attenzione all'unica cosa che deve essere guardata.
  },
  {
    id: 'strategia',
    nome: 'La misura',
    da: 9,
    a: 12.5,
    etichetta: '01 — Strategia',
    testo: 'Prima si capisce dove andare.',
  },
  {
    id: 'marchio',
    nome: "L'identità",
    da: 12.5,
    a: 16,
    etichetta: '02 — Brand',
    testo: 'Poi si costruisce un’identità.',
  },
  {
    id: 'contenuti',
    nome: 'Le luci',
    da: 16,
    a: 20,
    etichetta: '03 — Contenuti e video',
    testo: 'Si accendono le luci.',
  },
  {
    id: 'campagne',
    nome: 'La distribuzione',
    da: 20,
    a: 23.5,
    etichetta: '04 — Campagne',
    testo: 'E si porta davanti a chi conta.',
  },
  {
    id: 'attenzione',
    nome: 'Il pubblico si ferma',
    da: 23.5,
    a: 26.5,
    testo: 'Adesso si fermano.',
  },
  {
    id: 'firma',
    nome: 'La firma',
    da: 26.5,
    a: 30,
  },
];

/** Comodità: la battuta per id, per non ripetere `.find` in ogni componente. */
const PER_ID = new Map(BATTUTE.map((b) => [b.id, b]));

export function battuta(id: string): Battuta {
  const b = PER_ID.get(id);
  if (!b) throw new Error(`Battuta sconosciuta: ${id}`);
  return b;
}
