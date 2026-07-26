'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '../gsap';
import { SplitTitle } from '../SplitTitle';
import { SECTORS } from '../content';

/**
 * Sezione 04.
 *
 * Qui prima c'erano dei contatori: 100+ clienti, 2.500+ contenuti, 50M+
 * visualizzazioni. Erano cifre inventate, e su un portfolio una cifra
 * inventata è l'unica cosa che un potenziale cliente può verificare e trovare
 * falsa. Al loro posto ci sono i settori realmente attraversati, con i nomi
 * dei clienti: meno appariscente, ma vero e controllabile.
 */
export function Results({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.mp-sector').forEach((card, i) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 54 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            delay: i * 0.09,
            scrollTrigger: { trigger: card, start: 'top 88%' },
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={sectionRef} className="mp-section" id="risultati">
      <p className="mp-kicker mp-reveal">04 — Dove lavoriamo</p>
      <SplitTitle
        className="mp-h2"
        text="Quattro settori, un solo modo di lavorare."
        accent={['lavorare.']}
      />
      <p className="mp-sub mp-reveal">
        Ogni progetto qui sotto è verificabile: nomi veri, lavori veri.
      </p>
      <div className="mp-settori-grid">
        {SECTORS.map((s) => (
          <div key={s.label} className="mp-sector">
            <h3>{s.label}</h3>
            <p className="mp-sector-clients">{s.clients}</p>
            <p className="mp-sector-line">{s.line}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
