'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from './gsap';

/**
 * Sottile barra dorata in cima che segue l'avanzamento nella pagina.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: 0.25 },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  return <div ref={ref} className="mp-progress" aria-hidden />;
}

/**
 * Cursore su misura: un punto che segue subito il mouse e un anello che lo
 * insegue con ritardo e si allarga sugli elementi interattivi. Solo su
 * dispositivi con puntatore preciso.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.body.classList.add('mp-has-cursor');

    const dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3.out' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3.out' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
    };
    const onOver = (e: PointerEvent) => {
      const interactive = (e.target as HTMLElement).closest('a, button');
      ring.classList.toggle('is-active', Boolean(interactive));
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.body.classList.remove('mp-has-cursor');
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="mp-cursor-ring" aria-hidden />
      <div ref={dotRef} className="mp-cursor-dot" aria-hidden />
    </>
  );
}

/**
 * Luci di fondo che attraversano tutta la pagina, ognuna a una velocità
 * diversa: sono i piani di profondità dietro al contenuto, e sono ciò che
 * tiene insieme una sezione e la successiva.
 */
export function Ambient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const drift = (selector: string, yPercent: number, scrub: number) =>
        gsap.to(selector, {
          yPercent,
          ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub },
        });

      drift('.mp-amb--a', -22, 1);
      drift('.mp-amb--b', -52, 1.6);
      drift('.mp-amb--c', 26, 0.8);
    }, el);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <div ref={ref} className="mp-ambient" aria-hidden>
      <span className="mp-amb mp-amb--a" />
      <span className="mp-amb mp-amb--b" />
      <span className="mp-amb mp-amb--c" />
    </div>
  );
}
