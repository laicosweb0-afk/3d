'use client';

import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { Nav } from './Nav';
import { Hero } from './sections/Hero';
import { Portfolio } from './sections/Portfolio';
import { Services } from './sections/Services';
import { Results } from './sections/Results';
import { Process } from './sections/Process';
import { Contact } from './sections/Contact';
import { BRAND } from './content';

export function Site() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  // Scroll fluido con Lenis, agganciato al ticker GSAP: un solo rAF loop.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
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
    if (reduced) return;
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
  }, [reduced]);

  return (
    <div ref={rootRef} className={`mp${reduced ? ' mp--reduced' : ''}`}>
      <Nav />
      <main>
        <Hero reduced={reduced} />
        <Portfolio />
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
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </footer>
    </div>
  );
}
