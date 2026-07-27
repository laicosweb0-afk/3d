'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '../gsap';
import { SplitTitle } from '../SplitTitle';
import { SERVICES } from '../content';

/**
 * Gli oggetti dei servizi.
 *
 * Non icone a linea: quelle sono le stesse su qualunque sito, disegnate dalla
 * stessa libreria. Questi sono piccoli oggetti con un volume — un corpo, una
 * luce da una parte sola, un'ombra sotto — costruiti con gradienti invece che
 * con un contorno. Restano SVG, quindi non costano un poligono alla scena 3D
 * che gira già dietro a tutta la pagina, ma si leggono come cose, non simboli.
 */
const OBJECTS: Record<string, React.ReactNode> = {
  // incastro di solidi: i pezzi della direzione che combaciano
  strategy: (
    <>
      <path d="M32 8 52 20v10L32 18 12 30V20Z" fill="url(#g-top)" />
      <path d="M12 30l20 12v14L12 44Z" fill="url(#g-left)" />
      <path d="M52 30 32 42v14l20-12Z" fill="url(#g-right)" />
      <path d="M32 18 52 30 32 42 12 30Z" fill="url(#g-face)" />
    </>
  ),
  // monolite: il marchio come oggetto solido
  brand: (
    <>
      <path d="M22 10h20l6 6v38H22Z" fill="url(#g-face)" />
      <path d="M42 10l6 6h-6Z" fill="url(#g-top)" />
      <rect x="27" y="24" width="10" height="10" rx="5" fill="url(#g-gold)" />
      <path d="M22 10h4v44h-4Z" fill="url(#g-edge)" />
    </>
  ),
  // corpo macchina con obiettivo
  content: (
    <>
      <path d="M26 14h12l3 5h9a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V23a4 4 0 0 1 4-4h9Z" fill="url(#g-face)" />
      <circle cx="32" cy="34" r="11" fill="url(#g-left)" />
      <circle cx="32" cy="34" r="7" fill="url(#g-gold)" />
      <circle cx="28.5" cy="30.5" r="2.4" fill="#fff" opacity=".55" />
      <rect x="44" y="23" width="6" height="3" rx="1.5" fill="#fff" opacity=".3" />
    </>
  ),
  // ottica cinematografica di taglio: anelli concentrici
  video: (
    <>
      <ellipse cx="32" cy="32" rx="20" ry="20" fill="url(#g-face)" />
      <ellipse cx="32" cy="32" rx="15" ry="15" fill="url(#g-left)" />
      <ellipse cx="32" cy="32" rx="10" ry="10" fill="url(#g-gold)" />
      <ellipse cx="32" cy="32" rx="5" ry="5" fill="#0b0b0d" />
      <path d="M22 20a20 20 0 0 1 16-5" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" fill="none" />
    </>
  ),
  // onde di luce che si propagano
  adv: (
    <>
      <path d="M16 26h8l12-9v30l-12-9h-8Z" fill="url(#g-face)" />
      <path d="M42 22a14 14 0 0 1 0 20" stroke="url(#g-gold)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M48 16a22 22 0 0 1 0 32" stroke="url(#g-gold)" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".6" />
      <path d="M54 11a30 30 0 0 1 0 42" stroke="url(#g-gold)" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".3" />
    </>
  ),
  // nodi collegati
  social: (
    <>
      <path d="M20 32 44 18M20 32l24 14" stroke="url(#g-gold)" strokeWidth="1.8" opacity=".65" />
      <circle cx="20" cy="32" r="8" fill="url(#g-face)" />
      <circle cx="44" cy="18" r="6" fill="url(#g-left)" />
      <circle cx="44" cy="46" r="6" fill="url(#g-left)" />
      <circle cx="17.5" cy="29.5" r="2.6" fill="#fff" opacity=".5" />
    </>
  ),
  // pannelli sovrapposti: profondità di un'interfaccia
  web: (
    <>
      <rect x="12" y="18" width="34" height="24" rx="4" fill="url(#g-left)" opacity=".7" />
      <rect x="18" y="24" width="34" height="24" rx="4" fill="url(#g-face)" />
      <rect x="18" y="24" width="34" height="7" rx="4" fill="url(#g-top)" />
      <rect x="23" y="36" width="16" height="2.4" rx="1.2" fill="url(#g-gold)" />
      <rect x="23" y="41" width="10" height="2.4" rx="1.2" fill="#fff" opacity=".22" />
    </>
  ),
};

export function Services() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.mp-service').forEach((row) => {
        gsap
          .timeline({ scrollTrigger: { trigger: row, start: 'top 90%' } })
          // La riga non compare: sale dalla profondità della stessa scena che
          // le scorre dietro, e si mette in piano arrivando.
          .fromTo(
            row,
            { opacity: 0, z: -240, y: 44, rotateX: -18 },
            { opacity: 1, z: 0, y: 0, rotateX: 0, duration: 1.1, ease: 'power3.out' }
          )
          // poi la luce percorre il filetto in tutta la sua lunghezza
          .fromTo(
            row.querySelector('.mp-service-rule i'),
            { scaleX: 0, transformOrigin: 'left center' },
            { scaleX: 1, duration: 1.2, ease: 'power2.inOut' },
            '<0.1'
          )
          // e il contenuto si costruisce: prima il numero, poi il titolo, poi il resto
          .fromTo(
            row.querySelectorAll('.mp-service-n, .mp-service-title, .mp-service-desc'),
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.72, ease: 'power2.out', stagger: 0.09 },
            '<0.25'
          )
          .fromTo(
            row.querySelector('.mp-service-obj'),
            { opacity: 0, scale: 0.82, rotate: -8 },
            { opacity: 1, scale: 1, rotate: 0, duration: 0.9, ease: 'power3.out' },
            '<0.1'
          );
      });

      // Il puntatore avvicina la riga di pochi pixel e porta con sé la luce:
      // niente sollevamenti da card, solo una superficie che si accorge di te.
      const rows = gsap.utils.toArray<HTMLElement>('.mp-service');
      const cleanups = rows.map((row) => {
        const ry = gsap.quickTo(row, 'rotationY', { duration: 0.7, ease: 'power3.out' });
        const zz = gsap.quickTo(row, 'z', { duration: 0.7, ease: 'power3.out' });
        const onMove = (e: PointerEvent) => {
          const r = row.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          ry(nx * 2.2);
          zz(26);
          row.style.setProperty('--bx', `${((e.clientX - r.left) / r.width) * 100}%`);
        };
        const onLeave = () => {
          ry(0);
          zz(0);
        };
        row.addEventListener('pointermove', onMove);
        row.addEventListener('pointerleave', onLeave);
        return () => {
          row.removeEventListener('pointermove', onMove);
          row.removeEventListener('pointerleave', onLeave);
        };
      });
      return () => cleanups.forEach((fn) => fn());
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="mp-section mp-servizi" id="servizi">
      {/* I gradienti degli oggetti stanno una volta sola: sette copie dello
          stesso <defs> sarebbero sette volte lo stesso peso. */}
      <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="g-face" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#3b3b41" />
            <stop offset="1" stopColor="#17171a" />
          </linearGradient>
          <linearGradient id="g-top" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#63636c" />
            <stop offset="1" stopColor="#2c2c31" />
          </linearGradient>
          <linearGradient id="g-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2a2a2f" />
            <stop offset="1" stopColor="#121214" />
          </linearGradient>
          <linearGradient id="g-right" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#212125" />
            <stop offset="1" stopColor="#0e0e10" />
          </linearGradient>
          <linearGradient id="g-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6d6d77" />
            <stop offset="1" stopColor="#2a2a2f" />
          </linearGradient>
          <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f0d9a8" />
            <stop offset="0.5" stopColor="#d6b37a" />
            <stop offset="1" stopColor="#8a6a3a" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mp-servizi-head">
        <p className="mp-kicker mp-reveal">03 — Cosa facciamo</p>
        <SplitTitle className="mp-h2" text="Costruiamo brand che restano." accent={['restano']} />
        <p className="mp-sub mp-reveal">
          Un unico partner, dalla direzione alla pubblicazione. Non vendiamo ore di
          produzione: vendiamo il risultato che resta quando la produzione è finita.
        </p>
      </div>

      <div className="mp-servizi-list">
        {SERVICES.map((s, i) => (
          <article key={s.id} className="mp-service">
            <div className="mp-service-rule" aria-hidden>
              <i />
            </div>
            <div className="mp-service-body">
              <span className="mp-service-n">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mp-service-title">{s.label}</h3>
              <p className="mp-service-desc">{s.desc}</p>
              <svg className="mp-service-obj" viewBox="0 0 64 64" aria-hidden>
                {OBJECTS[s.id]}
              </svg>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
