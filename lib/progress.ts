// Il progresso master del piano sequenza. Oggetto mutabile fuori da React:
// ScrollTrigger scrive, il render loop 3D e gli overlay DOM leggono.
// Nessun setState per frame — il DOM/canvas si aggiornano via ticker.

export const progress = {
  /** Progresso grezzo dello scroll, 0..1 sul viaggio 3D. */
  p: 0,
  /**
   * Progresso inseguito con smorzamento. È quello che leggono la camera, le
   * tracce della regia e gli overlay.
   *
   * Nel viaggio ibrido (3D fuori, girato dentro casa) lo scroll copre due
   * linguaggi: qui ci finisce già rimappato sul solo tratto 3D, così tutta la
   * regia continua a ragionare nel suo intervallo naturale senza sapere che
   * dopo la soglia il racconto passa alle riprese. Il progresso globale, per
   * chi deve vedere l'intero viaggio, resta in `viaggio`.
   */
  smoothed: 0,
  /** Velocità di scroll normalizzata (per il rumore steadicam). */
  velocity: 0,
  /** Progresso dell'intero viaggio, 3D e girato insieme. 0..1. */
  viaggio: 0,
};

/**
 * Modalità fotogramma (per still di produzione e QA): ?p=0.52 blocca il
 * progresso, &clay=1 forza lo stato maquette, &still=1 spegne la steadicam.
 */
export const debugState = {
  fixedP: null as number | null,
  clay: false,
  still: false,
  /**
   * Forza l'avanzamento della costruzione, scollegandolo dal progresso.
   * Serve alla previz: per generare il girato reale bisogna poter renderizzare
   * la camera di un confine con lo stato di cantiere di un altro momento —
   * quanto è costruita la casa lo decide il racconto, non la curva del 3D.
   * `null` = comportamento normale, la costruzione segue lo scroll.
   */
  bp: null as number | null,
};

/**
 * Rimappa il progresso del viaggio su quello che deve vedere il 3D.
 * Impostata da chi monta il viaggio ibrido; lasciata nulla, 3D e viaggio
 * coincidono (il sito tutto in modello, com'era all'origine).
 */
let mappa3D: ((viaggio: number) => number) | null = null;
export function setMappa3D(f: ((viaggio: number) => number) | null): void {
  mappa3D = f;
}

export function dampProgress(dt: number, lambda = 5): void {
  const k = 1 - Math.exp(-lambda * dt);
  const prev = progress.viaggio;
  progress.viaggio += (progress.p - progress.viaggio) * k;
  progress.smoothed = mappa3D ? mappa3D(progress.viaggio) : progress.viaggio;
  progress.velocity = dt > 0 ? Math.abs(progress.viaggio - prev) / dt : 0;
}
