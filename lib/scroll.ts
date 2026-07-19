'use client';

// Scroll nativo + Lenis (smoothing) + ScrollTrigger (unica sorgente di p).
// Nessun hijacking: il salto di capitolo è uno scroll animato, mai un teleport.

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { progress } from './progress';
import { TOTAL_VH } from './scenes';

let lenis: Lenis | null = null;

export function initScroll(spacer: HTMLElement): () => void {
  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  const st = ScrollTrigger.create({
    trigger: spacer,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      progress.p = self.progress;
    },
  });

  return () => {
    st.kill();
    gsap.ticker.remove(raf);
    lenis?.destroy();
    lenis = null;
  };
}

/** Scroll animato verso un p target: percorre il piano sequenza, non salta. */
export function scrollToP(p: number): void {
  const total = (TOTAL_VH - 1) * window.innerHeight;
  const target = p * total;
  const distance = Math.abs(target - window.scrollY);
  const duration = Math.min(0.6 + (distance / window.innerHeight) * 0.12, 2.6);
  if (lenis) lenis.scrollTo(target, { duration, easing: (t) => 1 - Math.pow(1 - t, 3) });
  else window.scrollTo({ top: target, behavior: 'smooth' });
}
