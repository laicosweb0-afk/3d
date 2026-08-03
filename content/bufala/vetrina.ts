// La vetrina: il filmato dei prodotti legato allo scorrimento.
//
// Stesso principio del viaggio, ruotato di novanta gradi: il fotogramma è
// funzione della posizione, e la posizione la comanda il dito. Scorri avanti
// e la processione avanza, torni indietro e si riavvolge. Non c'è nessuna
// animazione da interrompere, quindi cambiare direzione a metà di un'uscita
// non rompe niente: il prodotto che stava andando via semplicemente rientra.
//
// I nomi NON stanno dentro il filmato. Stanno qui, come dati, e finiscono in
// tipografia viva sopra il pannello — la stessa regola per cui abbiamo
// ritagliato via il titolo che il cliente aveva composto dentro la sua
// fotografia. Un'etichetta stampata dentro un video generato non è
// affidabile; un nome scritto in HTML lo è sempre.

import { BASE_PATH } from '@/lib/asset';

const BASE = `${BASE_PATH}/assets/bufala`;

/** Il filmato della vetrina.
 *
 *  ⚠️ Come per il filmato del viaggio, il numero nel nome è una versione e va
 *  aumentato ogni volta che il file cambia: i browser tengono i file in cache
 *  per URL, e senza un nome nuovo chi ha già visitato il sito continuerebbe a
 *  vedere la versione vecchia. */
export const vetrina = {
  webm: `${BASE}/vetrina-1.webm`,
  mp4: `${BASE}/vetrina-1.mp4`,
  poster: `${BASE}/vetrina-1-poster.webp`,
};

export interface Tappa {
  /** Il nome reale del prodotto. Nessun claim, nessun aggettivo: il nome. */
  nome: string;
  /** Il produttore, dove è leggibile sulla confezione reale del cliente. */
  produttore?: string;
  /** L'istante del filmato in cui questo prodotto passa più vicino al centro.
   *  Da misurare sul filmato vero, non da dedurre dal prompt: il modello
   *  sposta sempre i tempi rispetto a quelli chiesti. */
  secondo: number;
}

/** Le cinque tappe della processione.
 *
 *  ⚠️ I secondi qui sotto sono provvisori — la spartizione teorica in cinque
 *  parti uguali. Vanno sostituiti con gli istanti misurati sul filmato
 *  consegnato, esattamente come è stato fatto per il viaggio. */
export const tappe: Tappa[] = [
  { nome: 'Prataiola alla rucola', produttore: 'Moncalo', secondo: 1.5 },
  { nome: 'Formaggio di capra', secondo: 4.5 },
  { nome: 'Prosciutto stagionato', secondo: 7.5 },
  { nome: "Friarielli all'olio", secondo: 10.5 },
  { nome: 'Olive Bella di Cerignola', secondo: 13.5 },
];
