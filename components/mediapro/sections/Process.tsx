'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '../gsap';
import { SplitTitle } from '../SplitTitle';
import { STEPS } from '../content';

export function Process({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;
    const vertical = window.matchMedia('(max-width: 900px)').matches;

    const ctx = gsap.context(() => {
      const steps = gsap.utils.toArray<HTMLElement>('.mp-step');

      // La linea si riempie con lo scroll; i punti si accendono al passaggio.
      gsap.fromTo(
        '.mp-timeline-fill',
        vertical ? { scaleY: 0 } : { scaleX: 0 },
        {
          ...(vertical ? { scaleY: 1 } : { scaleX: 1 }),
          ease: 'none',
          scrollTrigger: {
            trigger: '.mp-timeline',
            start: 'top 75%',
            end: vertical ? 'bottom 55%' : 'bottom 45%',
            scrub: 0.8,
            onUpdate: (st) => {
              const active = Math.floor(st.progress * steps.length + 0.15);
              steps.forEach((el, i) => el.classList.toggle('is-active', i < active));
            },
          },
        }
      );

      gsap.fromTo(
        steps,
        { opacity: 0, y: 44 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: { trigger: '.mp-timeline', start: 'top 82%' },
        }
      );
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={sectionRef} className="mp-section mp-metodo" id="metodo">
      <p className="mp-kicker mp-reveal">05 — Il nostro metodo</p>
      <SplitTitle
        className="mp-h2"
        text="Un processo collaudato per risultati straordinari."
        accent={['straordinari']}
      />
      <div className="mp-timeline">
        <div className="mp-timeline-fill" />
        {STEPS.map((s) => (
          <div key={s.n} className="mp-step">
            <div className="mp-step-dot">{s.n}</div>
            <h3>{s.label}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
