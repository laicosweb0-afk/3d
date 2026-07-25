'use client';

import { useEffect } from 'react';
import { gsap } from './gsap';

/**
 * Effetto magnetico sui bottoni: avvicinando il puntatore, il bottone si
 * sposta verso di lui, e la sua luce interna segue il punto di contatto.
 * Lo spostamento è volutamente minimo — deve sembrare peso e attrazione,
 * non un elemento che scappa.
 */
export function Magnetic() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = gsap.utils.toArray<HTMLElement>('.mp-btn--magnetic, .mp-btn');
    const RADIUS = 90; // distanza oltre la quale non attrae più
    const PULL = 0.32; // quanto insegue: sotto 1 resta sempre indietro

    const cleanups = targets.map((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        if (Math.hypot(dx, dy) > Math.max(r.width, r.height) / 2 + RADIUS) return;
        x(dx * PULL);
        y(dy * PULL);
        // la luce interna segue il puntatore
        el.style.setProperty('--bx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--by', `${((e.clientY - r.top) / r.height) * 100}%`);
      };
      const onLeave = () => {
        x(0);
        y(0);
      };

      window.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', onLeave);
      return () => {
        window.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      };
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
