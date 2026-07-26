'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../gsap';
import { scroll } from '../three/scrollState';
import { PROJECTS } from '../content';

/**
 * Il portfolio non è una griglia di card: è una sequenza di scene.
 *
 * Una sola sezione alta cinque viewport, con un pannello di testo fisso
 * sopra la scena 3D. Lo scroll non fa scorrere delle schede — muove
 * `scroll.world`, cioè l'indice frazionario del mondo, e la scena 3D si
 * trasforma di conseguenza: la materia del progetto precedente diventa
 * quella del successivo senza che ci sia mai uno stacco.
 *
 * Il testo di ogni progetto entra e esce in dissolvenza incrociata sulla base
 * dello stesso indice, così non esiste un momento di "cambio pagina".
 */
export function Cases({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;
    const n = PROJECTS.length;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          // 0 → n-1 sull'intera sezione
          const w = self.progress * (n - 1);
          scroll.world = w;

          // ogni scheda è piena vicino al proprio indice e sfuma allontanandosi
          cardsRef.current.forEach((el, i) => {
            if (!el) return;
            const d = Math.abs(w - i);
            const a = Math.max(0, 1 - d * 1.55);
            el.style.opacity = String(a);
            el.style.transform = `translateY(${(w - i) * 34}px)`;
            el.style.pointerEvents = a > 0.5 ? 'auto' : 'none';
          });
        },
      });

      // La scena prende il controllo quando la sezione entra e lo restituisce
      // quando esce: fuori da qui la materia resta dentro al cubo.
      ScrollTrigger.create({
        trigger: section,
        start: 'top 85%',
        end: 'top top',
        scrub: 0.6,
        onUpdate: (self) => {
          scroll.cases = self.progress;
        },
      });
      ScrollTrigger.create({
        trigger: section,
        start: 'bottom bottom',
        end: 'bottom 40%',
        scrub: 0.6,
        onUpdate: (self) => {
          scroll.cases = 1 - self.progress;
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      className="mp-cases"
      id="portfolio"
      style={{ height: `${PROJECTS.length * 100}vh` }}
    >
      <div className="mp-cases-pin">
        <p className="mp-kicker mp-cases-kicker">02 — Portfolio</p>

        <div className="mp-cases-stack">
          {PROJECTS.map((p, i) => (
            <div
              key={p.id}
              className="mp-case"
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              style={reduced ? undefined : { opacity: i === 0 ? 1 : 0 }}
            >
              <p className="mp-case-num">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mp-case-client">{p.client}</h3>
              <p className="mp-case-type">{p.type}</p>
              <p className="mp-case-line">{p.line}</p>
              <p className="mp-case-matter">
                <span>Materia</span> {p.matter}
              </p>
            </div>
          ))}
        </div>

        <div className="mp-cases-index" aria-hidden>
          {PROJECTS.map((p, i) => (
            <span key={p.id} className="mp-cases-tick" data-i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
