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
  /* WebM davanti, come per il film: l'MP4-davanti ha rotto un tablet
   * Android sul campo (vedi components/bufala/Video.tsx). */
  webm: `${BASE}/vetrina-1.webm`,
  mp4: `${BASE}/vetrina-1.mp4`,
  poster: `${BASE}/vetrina-1-poster.webp`,
};

export interface Tappa {
  /** Il nome reale del prodotto. Nessun claim, nessun aggettivo: il nome. */
  nome: string;
  /** Cos'è, quando il nome da solo non lo dice — solo se confermato dal
   *  materiale del cliente (etichetta o didascalia sua), mai dedotto. */
  tipo?: string;
  /** Il produttore, dove è leggibile sulla confezione reale del cliente. */
  produttore?: string;
  /** L'istante del filmato in cui questo prodotto passa più vicino al centro.
   *  Da misurare sul filmato vero, non da dedurre dal prompt: il modello
   *  sposta sempre i tempi rispetto a quelli chiesti. */
  secondo: number;
}

// ⚠️ Le «ragioni» delle didascalie (perché OGNI prodotto è al banco — il
// criterio di selezione dimostrato cinque volte, Architettura mov. 4) NON
// possono nascere qui: sarebbero parole messe in bocca al cliente. Vanno
// chieste a lui, una riga per prodotto. Finché non arrivano, la didascalia
// dice solo ciò che è confermato: nome, tipo, produttore.

/** Le cinque tappe della processione, con gli istanti letti sul filmato
 *  consegnato — non quelli chiesti nel prompt, che il modello sposta sempre.
 *
 *  La spartizione teorica in cinque parti uguali avrebbe messo i nomi a 1,5 /
 *  4,5 / 7,5 / 10,5 / 13,5 s: fino a un secondo e mezzo di scarto dal
 *  prodotto a cui si riferiscono, cioè un nome sbagliato sotto un prodotto
 *  giusto. */
export const tappe: Tappa[] = [
  { nome: 'Prataiola alla rucola', tipo: 'Formaggio di pecora', produttore: 'Moncalo', secondo: 2.0 },
  { nome: 'Formaggio di capra', secondo: 5.6 },
  { nome: 'Prosciutto stagionato', secondo: 7.3 },
  { nome: "Friarielli all'olio", secondo: 9.2 },
  { nome: 'Olive Bella di Cerignola', produttore: 'Luliv', secondo: 11.6 },
];
