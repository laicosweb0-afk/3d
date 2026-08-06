// Dove stanno gli occhi e la bocca sul PNG.
//
// Questo file è l'unica cosa da ritoccare quando arriva l'immagine definitiva,
// ed è fatto apposta per essere calibrato a occhio in due minuti: apri la demo
// con `?calibra=1` in fondo all'indirizzo e comparirà una griglia con i mirini
// sopra il coniglio. Sposti i numeri qui, ricarichi, finché i mirini non
// coincidono con le pupille e con la bocca. Poi togli `?calibra=1`.
//
// Tutte le misure sono percentuali del riquadro dell'immagine, non pixel: così
// restano giuste su qualsiasi schermo, dal telefono al monitor del negozio.

export const ANATOMIA = {
  /** Centro dell'occhio sinistro **visto da chi guarda**, non del coniglio. */
  occhioSinistro: { x: 42.0, y: 31.5 },
  /** Centro dell'occhio destro visto da chi guarda. */
  occhioDestro: { x: 56.5, y: 31.5 },

  /**
   * Il disco d'iride che copre l'occhio disegnato nel PNG. Deve essere appena
   * più grande dell'occhio originale, altrimenti si vede un bordo.
   */
  raggioIride: 2.05,
  /** La pupilla che si muove dentro l'iride. */
  raggioPupilla: 1.05,
  /** Quanto la pupilla può allontanarsi dal centro dell'iride. */
  corsaPupilla: 0.75,

  /**
   * La bocca. `altezzaChiusa` è quanto si vede quando tace (una linea sottile),
   * `altezzaAperta` quanto si apre sul picco della voce.
   */
  bocca: {
    x: 49.3,
    y: 43.0,
    larghezza: 4.6,
    altezzaChiusa: 0.35,
    altezzaAperta: 3.2,
  },
} as const;

/**
 * I colori dell'occhio. Ambra grande e tondo è una scelta di design del
 * personaggio (§1.7), non un dettaglio tecnico: se cambia il PNG, cambiano qui.
 */
export const COLORI_OCCHIO = {
  iride: 'radial-gradient(circle at 35% 30%, #F0C578 0%, #D79A3E 45%, #A2661F 100%)',
  pupilla: '#1A1210',
  /** Il puntino di luce che rende vivo l'occhio. */
  luce: 'rgba(255, 250, 240, 0.92)',
};

/** Il colore dentro la bocca quando si apre. */
export const COLORE_BOCCA = '#5B2733';

/**
 * Percorso della seconda posa, a bocca aperta.
 *
 * Se un giorno generi la variante «bocca aperta» dall'Element Higgsfield e la
 * metti in `public/`, scrivi qui il suo percorso: la demo smette di disegnare la
 * bocca e passa alla dissolvenza fra le due immagini, che è più bella. Finché
 * resta `null`, funziona il disegno.
 */
export const POSA_BOCCA_APERTA: string | null = null;

/** L'immagine principale, a bocca chiusa. */
export const POSA_BASE = '/bianconiglio.png';
