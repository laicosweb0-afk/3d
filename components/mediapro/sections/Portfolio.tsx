'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '../gsap';
import { PROJECTS } from '../content';
import { asset } from '@/lib/asset';

export function Portfolio() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (!reduced) {
        // Le card emergono dalla profondità, come prodotti che escono dal buio.
        gsap.fromTo(
          '.mp-project',
          { opacity: 0, z: -420, y: 90, rotationX: 8, filter: 'blur(10px)' },
          {
            opacity: 1,
            z: 0,
            y: 0,
            rotationX: 0,
            filter: 'blur(0px)',
            duration: 1.6,
            ease: 'power3.out',
            stagger: 0.14,
            scrollTrigger: { trigger: '.mp-portfolio-grid', start: 'top 82%' },
          }
        );
      }

      // Tilt fisico al passaggio del mouse, con ritorno morbido.
      const cards = gsap.utils.toArray<HTMLElement>('.mp-project');
      const cleanups = cards.map((card) => {
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3.out' });
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3.out' });
        const ty = gsap.quickTo(card, 'y', { duration: 0.7, ease: 'power3.out' });
        const onMove = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
          ry(nx * 4);
          rx(ny * -4);
          ty(-8);
          card.style.setProperty('--hx', `${((e.clientX - r.left) / r.width) * 100}%`);
          card.style.setProperty('--hy', `${((e.clientY - r.top) / r.height) * 100}%`);
        };
        const onLeave = () => {
          rx(0);
          ry(0);
          ty(0);
        };
        card.addEventListener('pointermove', onMove);
        card.addEventListener('pointerleave', onLeave);
        return () => {
          card.removeEventListener('pointermove', onMove);
          card.removeEventListener('pointerleave', onLeave);
        };
      });
      return () => cleanups.forEach((fn) => fn());
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="mp-section mp-portfolio" id="portfolio">
      <div className="mp-portfolio-head">
        <div>
          <p className="mp-kicker mp-reveal">02 — Portfolio</p>
          <h2 className="mp-h2 mp-reveal">
            Ogni progetto è una storia di creatività, strategia e impatto.
          </h2>
        </div>
        <a className="mp-btn mp-reveal" href="#contatti">
          Vedi tutti i progetti <span className="mp-btn-arrow">→</span>
        </a>
      </div>

      <div className="mp-portfolio-grid">
        {PROJECTS.map((p, i) => (
          <a
            key={p.id}
            className={`mp-project${i === 0 ? ' mp-project--lead' : ''}`}
            href="#contatti"
            aria-label={`${p.client} — ${p.type}`}
          >
            <div className="mp-project-media" style={{ background: p.fallback }}>
              <img
                src={asset(p.image)}
                alt=""
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="mp-project-shine" />
            <div className="mp-project-meta">
              <div>
                <p className="mp-project-year">{p.year}</p>
                <p className="mp-project-client">{p.client}</p>
                <p className="mp-project-type">{p.type}</p>
              </div>
              <span className="mp-project-arrow">→</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
