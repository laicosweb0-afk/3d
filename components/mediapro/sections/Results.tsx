'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '../gsap';
import { SplitTitle } from '../SplitTitle';
import { STATS, formatIt } from '../content';

export function Results({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.mp-stat').forEach((card, i) => {
        const valueEl = card.querySelector<HTMLElement>('.mp-stat-num')!;
        const target = Number(valueEl.dataset.value);
        const counter = { v: 0 };
        // L'HTML contiene già il numero vero (così senza JS non si legge "0"):
        // lo azzeriamo solo ora che il conteggio parte davvero.
        valueEl.textContent = '0';

        gsap
          .timeline({ scrollTrigger: { trigger: card, start: 'top 88%' }, delay: i * 0.08 })
          .fromTo(card, { opacity: 0, y: 54 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })
          .to(
            counter,
            {
              v: target,
              duration: 1.8,
              ease: 'power2.out',
              onUpdate: () => {
                valueEl.textContent = formatIt(Math.round(counter.v));
              },
            },
            '<0.2'
          );
      });
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={sectionRef} className="mp-section" id="risultati">
      <p className="mp-kicker mp-reveal">04 — Risultati</p>
      <SplitTitle
        className="mp-h2"
        text="Numeri che raccontano il nostro impegno."
        accent={['impegno']}
      />
      <p className="mp-sub mp-reveal">
        La creatività si misura: ogni progetto parte da un obiettivo e finisce in un dato.
      </p>
      <div className="mp-risultati-grid">
        {STATS.map((s) => (
          <div key={s.label} className="mp-stat">
            <p className="mp-stat-value">
              <span className="mp-stat-num" data-value={s.value}>
                {formatIt(s.value)}
              </span>
              <em>{s.suffix}</em>
            </p>
            <p className="mp-stat-label">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
