// Dove stanno gli occhi e la bocca sul personaggio.
//
// Questi numeri NON sono a occhio: sono misurati sui pixel dello sprite che
// sta in `public/bianconiglio.webp` (1200×2886), derivato dal character sheet
// 4K fornito il 6/8/2026 — didascalia rimossa, scontorno locale, nessun tool
// di generazione. Se l'immagine cambia, si ricalibra qui: apri la demo con
// `?calibra=1` e sposta i numeri finché i mirini non coincidono.
//
// Tutte le misure sono percentuali del riquadro dell'immagine, non pixel: così
// restano giuste su qualsiasi schermo. Le x e y sul rispettivo lato, i raggi
// sempre sulla larghezza.

export const ANATOMIA = {
  /** Centro dell'iride sinistra **vista da chi guarda**, non del coniglio. */
  occhioSinistro: { x: 30.8, y: 37.9 },
  /** Centro dell'iride destra vista da chi guarda. La testa è un filo inclinata. */
  occhioDestro: { x: 58.9, y: 36.8 },

  /**
   * Il disco d'iride che copre l'occhio disegnato. L'iride dipinta ha raggio
   * ~5.3% della larghezza: il disco è appena più largo per coprirne il bordo
   * senza mangiarsi la sclera bianca intorno, che resta quella del disegno.
   */
  raggioIride: 5.9,
  /** La pupilla dipinta ha raggio ~3.75%: la nostra è un pelo più piccola. */
  raggioPupilla: 3.6,
  /** Corsa massima: entro iride−pupilla (2.2), col margine per non sbordare. */
  corsaPupilla: 1.6,

  /**
   * La bocca. Il personaggio ha già il sorriso chiuso disegnato: a riposo la
   * nostra ellisse è alta zero (invisibile, resta il disegno), e sulla voce si
   * apre VERSO IL BASSO partendo dalla linea del sorriso — come una mascella
   * che cade, non un buco che cresce dal centro. `y` è la linea del sorriso.
   */
  bocca: {
    // La x sta sull'asse del muso (il filtro sotto il naso, misurato dal
    // verificatore a ~43.1%), non a metà degli occhi: il sorriso del disegno
    // è un filo asimmetrico e la bocca aperta deve cadere dov'è il disegno.
    x: 44.0,
    y: 45.4,
    larghezza: 11.0,
    altezzaChiusa: 0,
    altezzaAperta: 5.2,
  },
} as const;

/**
 * I colori dell'occhio, campionati dai pixel dell'iride dipinta: ambra
 * #C68232 in basso dove batte la luce, orlo bruno #602B10 in alto dove
 * l'ombra della palpebra la scurisce. Il gradiente rifà quella luce.
 */
export const COLORI_OCCHIO = {
  iride:
    'radial-gradient(circle at 50% 68%, #C68232 0%, #A0611F 42%, #602B10 76%, #45200C 100%)',
  pupilla: '#0A0503',
  /** Il puntino di luce che rende vivo l'occhio, in alto a sinistra come nel disegno. */
  luce: 'rgba(255, 250, 240, 0.92)',
};

/**
 * L'interno della bocca quando si apre: scuro in alto dove c'è la cavità,
 * più caldo in basso dove s'intuisce la lingua. Un colore piatto sembrava un
 * adesivo incollato sul render.
 */
export const GRADIENTE_BOCCA =
  'radial-gradient(ellipse at 50% 26%, #23090E 0%, #401A22 52%, #6B3440 100%)';

/**
 * Percorso della seconda posa, a bocca aperta.
 *
 * Se un giorno generi la variante «bocca aperta» dall'Element Higgsfield e la
 * metti in `public/`, scrivi qui il suo percorso: la demo smette di disegnare la
 * bocca e passa alla dissolvenza fra le due immagini, che è più bella. Finché
 * resta `null`, funziona il disegno.
 */
export const POSA_BOCCA_APERTA: string | null = null;

/**
 * L'immagine principale. WebP con trasparenza (308 kB): il PNG equivalente
 * pesava 2,6 MB e avrebbe affossato il caricamento su mobile.
 */
export const POSA_BASE = '/bianconiglio.webp';
