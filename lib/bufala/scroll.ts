'use client';

// Scroll del viaggio: nativo, smussato da Lenis. Nessun hijacking — la
// rotellina fa sempre quello che ci si aspetta, solo più morbido.
//
// Separato da lib/scroll.ts (Mondial Service) di proposito: i due siti hanno
// ritmi diversi e non devono condividere una taratura. Qui lo scroll è più
// pesante e cerimonioso, come chiede DIRECTION_BUFALA.md §6.

import Lenis from 'lenis';

let lenis: Lenis | null = null;

/** Avvia lo scroll morbido. Restituisce la funzione di pulizia. */
export function initScroll(): () => void {
  // lerp basso = lo scroll "pesa" e continua per inerzia: è ciò che separa
  // un movimento cinematografico da uno scatto da pagina web.
  // wheelMultiplier < 1 = lo stesso gesto percorre meno strada, così il
  // viaggio si attraversa lentamente anche con una rotellina nervosa.
  lenis = new Lenis({ lerp: 0.07, smoothWheel: true, wheelMultiplier: 0.75 });

  let raf = 0;
  const tick = (t: number) => {
    lenis?.raf(t);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
}

/** Scroll animato verso una posizione: percorre il viaggio, non ci salta. */
export function scrollTo(y: number): void {
  const distanza = Math.abs(y - window.scrollY);
  const durata = Math.min(0.7 + (distanza / window.innerHeight) * 0.14, 2.8);
  if (lenis) {
    lenis.scrollTo(y, { duration: durata, easing: (t) => 1 - Math.pow(1 - t, 3) });
  } else {
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}
