'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '../gsap';
import { SERVICES } from '../content';

// Icone a linea (24×24): disegnate a mano per potersi "tracciare" da sole.
const ICONS: Record<string, React.ReactNode> = {
  content: (
    <>
      <rect x="3" y="6.5" width="18" height="13" rx="3" />
      <circle cx="12" cy="13" r="3.6" />
      <path d="M8.5 6.5 10 4h4l1.5 2.5" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2.5" />
      <path d="M3.4 8 20 4.6M7.5 7.2 9.6 4M12.5 6.2l2.1-3.2" />
      <path d="m10.5 12.5 4 2.2-4 2.2z" />
    </>
  ),
  social: (
    <>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="17.5" cy="5.5" r="2.6" />
      <circle cx="17.5" cy="18.5" r="2.6" />
      <path d="M8.4 10.8 15 6.8M8.4 13.2l6.6 4" />
    </>
  ),
  web: (
    <>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2.5" />
      <path d="M9.5 21h5M12 17v4M3 8.5h18" />
    </>
  ),
  ai: (
    <>
      <path d="M12 4.5c.5 3.4 2.1 5 5.5 5.5-3.4.5-5 2.1-5.5 5.5-.5-3.4-2.1-5-5.5-5.5 3.4-.5 5-2.1 5.5-5.5Z" />
      <path d="M18.5 14.5c.25 1.7 1.05 2.5 2.75 2.75-1.7.25-2.5 1.05-2.75 2.75-.25-1.7-1.05-2.5-2.75-2.75 1.7-.25 2.5-1.05 2.75-2.75Z" />
    </>
  ),
  adv: (
    <>
      <path d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H8l7.5 4.5v-16L8 8.5H5.5A1.5 1.5 0 0 0 4 10Z" />
      <path d="M18.5 10a3 3 0 0 1 0 4M8 15.5V19a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  brand: (
    <>
      <path d="m12 3.5 6.5 9.5-6.5 7.5L5.5 13 12 3.5Z" />
      <path d="M12 3.5V20.5M5.5 13h13" />
    </>
  ),
  strategy: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
};

export function Services() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.mp-service').forEach((card, i) => {
        const strokes = card.querySelectorAll<SVGGeometryElement>(
          '.mp-service-icon path, .mp-service-icon rect, .mp-service-icon circle'
        );
        strokes.forEach((s) => {
          const len = s.getTotalLength();
          s.style.strokeDasharray = `${len}`;
          s.style.strokeDashoffset = `${len}`;
        });

        gsap
          .timeline({
            scrollTrigger: { trigger: card, start: 'top 88%' },
            delay: (i % 4) * 0.08,
          })
          .fromTo(card, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' })
          // l'icona si disegna da sola, poi il testo affiora
          .to(strokes, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.1 }, '<0.15')
          .fromTo(
            card.querySelectorAll('h3, p'),
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.08 },
            '<0.5'
          );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="mp-section mp-servizi" id="servizi">
      <div className="mp-servizi-inner">
        <div>
          <p className="mp-kicker mp-reveal">03 — Servizi</p>
          <h2 className="mp-h2 mp-reveal">Soluzioni su misura per far crescere il tuo business.</h2>
          <p className="mp-sub mp-reveal">
            Un unico partner creativo, dalla strategia alla pubblicazione. Ogni servizio è
            pensato per lavorare insieme agli altri.
          </p>
        </div>
        <div className="mp-servizi-grid">
          {SERVICES.map((s) => (
            <div key={s.id} className="mp-service">
              <svg className="mp-service-icon" viewBox="0 0 24 24" aria-hidden>
                {ICONS[s.id]}
              </svg>
              <h3>{s.label}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
