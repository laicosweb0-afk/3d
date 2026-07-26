/**
 * Ponte fra lo scroll (DOM, guidato da GSAP/Lenis) e la scena 3D.
 *
 * È un oggetto mutabile letto dentro useFrame, non uno stato React: la camera
 * deve aggiornarsi a ogni fotogramma, e passare da setState significherebbe
 * un re-render per frame.
 */
export const scroll = {
  /** 0→1 sulla sola sequenza dell'hero. */
  hero: 0,
  /** 0→1 sull'intera pagina: tiene la camera in movimento anche dopo l'hero. */
  page: 0,
  /**
   * Indice frazionario del mondo del portfolio: 0 = primo progetto, 2.4 = poco
   * oltre il terzo. Essendo continuo, il passaggio fra un progetto e l'altro è
   * una miscela e non un taglio.
   */
  world: 0,
  /** 0→1: quanto il portfolio ha preso il controllo della scena. */
  cases: 0,
  /** Posizione del puntatore normalizzata in [-1, 1]. */
  pointer: { x: 0, y: 0 },
};

/** Interpolazione morbida indipendente dal frame rate. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
