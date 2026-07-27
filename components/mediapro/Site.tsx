'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { Ambient, Cursor, ScrollProgress } from './Chrome';
import { Magnetic } from './Magnetic';
import { scroll } from './three/scrollState';

// La scena 3D è pesante e ha senso solo lato client: fuori dal bundle
// iniziale, e caricata solo quando le animazioni sono davvero attive.
const Scene = dynamic(() => import('./three/Scene').then((m) => m.Scene), {
  ssr: false,
});
import { Nav } from './Nav';
import { Hero } from './sections/Hero';
import { Cases } from './sections/Cases';
import { Services } from './sections/Services';
import { Results } from './sections/Results';
import { Process } from './sections/Process';
import { Contact } from './sections/Contact';
import { BRAND } from './content';

/**
 * Tre stati, non due: finché il JavaScript non ha girato siamo in "pending" e
 * NIENTE viene nascosto. È la differenza fra una pagina che degrada bene e una
 * che resta mezza vuota se lo script non parte o se l'utente ha chiesto meno
 * animazioni: nascondere è un'azione, non l'impostazione di partenza.
 */
type Motion = 'pending' | 'motion' | 'reduced';

export function Site() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Motion>('pending');
  const reduced = mode === 'reduced';

  // Scroll fluido con Lenis, agganciato al ticker GSAP: un solo rAF loop.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMode(mq.matches ? 'reduced' : 'motion');
    if (mq.matches) return;

    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Le ancore della nav scorrono con Lenis, non con il jump nativo.
    const onAnchor = (e: Event) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]');
      if (!a) return;
      const target = document.querySelector(a.getAttribute('href')!);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { duration: 1.6 });
    };
    document.addEventListener('click', onAnchor);

    return () => {
      document.removeEventListener('click', onAnchor);
      gsap.ticker.remove(tick);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  // Reveal generico: ogni .mp-reveal sale dolcemente entrando in viewport.
  useEffect(() => {
    if (mode !== 'motion') return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.mp-reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 48 },
          {
            opacity: 1,
            y: 0,
            duration: 1.3,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 86%' },
          }
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, [mode]);

  // Alimenta la scena 3D: avanzamento sull'intera pagina e posizione del
  // puntatore. Nessuno dei due passa da setState — la camera li legge a ogni
  // fotogramma, un re-render per frame sarebbe insostenibile.
  useEffect(() => {
    if (mode !== 'motion') return;

    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        scroll.page = self.progress;
      },
    });

    const onPointer = (e: PointerEvent) => {
      scroll.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      scroll.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      st.kill();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [mode]);

  return (
    <div ref={rootRef} className={`mp mp--${mode}`}>
      {mode === 'motion' ? <Scene /> : <Ambient />}
      <ScrollProgress />
      <Cursor />
      <Magnetic />
      <Nav />
      <main>
        <Hero reduced={reduced} />
        <Cases reduced={reduced} />
        <Services />
        <Results reduced={reduced} />
        <Process reduced={reduced} />
        <Contact />
      </main>
      <footer className="mp-footer">
        <span>
          © {new Date().getFullYear()} {BRAND.name}. Tutti i diritti riservati.
        </span>
        <span>{BRAND.tagline}</span>
        <a href={`tel:+${BRAND.phoneDigits}`}>{BRAND.phone}</a>
      </footer>
    </div>
  );
}
