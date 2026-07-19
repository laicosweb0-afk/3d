// Il progresso master del piano sequenza. Oggetto mutabile fuori da React:
// ScrollTrigger scrive, il render loop 3D e gli overlay DOM leggono.
// Nessun setState per frame — il DOM/canvas si aggiornano via ticker.

export const progress = {
  /** Progresso grezzo dello scroll, 0..1 sul viaggio 3D. */
  p: 0,
  /** Progresso inseguito con smorzamento (usato dalla camera e dagli overlay). */
  smoothed: 0,
  /** Velocità di scroll normalizzata (per il rumore steadicam). */
  velocity: 0,
};

export function dampProgress(dt: number, lambda = 6): void {
  const k = 1 - Math.exp(-lambda * dt);
  const prev = progress.smoothed;
  progress.smoothed += (progress.p - progress.smoothed) * k;
  progress.velocity = dt > 0 ? Math.abs(progress.smoothed - prev) / dt : 0;
}
