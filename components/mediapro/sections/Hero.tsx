'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../gsap';
import { scroll } from '../three/scrollState';
import { HERO } from '../content';

/**
 * L'hero non è una schermata con sopra un'animazione: è una sequenza.
 *
 * All'ingresso c'è solo la scena 3D — il cubo, le sfere, la nebbia. Poi lo
 * scroll fa avanzare la camera e, uno alla volta, gli elementi della pagina
 * nascono dentro quella scena: prima il marchio, poi il bagliore, poi le righe
 * del titolo, infine il pulsante. Alla fine della sequenza la scena è
 * completa, e solo allora comincia il sito vero e proprio.
 *
 * Il markup resta un h1 normale con tutto il testo: senza JavaScript o con
 * prefers-reduced-motion si legge tutto, la coreografia è un di più.
 */
export function Hero({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLParagraphElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          // alimenta la scena 3D: la camera legge questo valore ogni frame
          onUpdate: (self) => {
            scroll.hero = self.progress;
          },
        },
        defaults: { ease: 'none' },
      });

      // 1. l'indizio di scroll si ritira appena parti
      tl.to('.mp-hero-scroll', { autoAlpha: 0, duration: 0.06 }, 0);

      // 2. il marchio emerge dalla profondità
      tl.fromTo(
        wordmarkRef.current,
        { autoAlpha: 0, scale: 0.72, filter: 'blur(14px)' },
        { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.14, ease: 'power2.out' },
        0.14
      );

      // 3. il bagliore cresce dietro all'oggetto
      tl.fromTo(
        glowRef.current,
        { autoAlpha: 0, scale: 0.4 },
        { autoAlpha: 1, scale: 1, duration: 0.16, ease: 'power2.in' },
        0.28
      );

      // 4. il marchio lascia il posto al titolo
      tl.to(
        wordmarkRef.current,
        { autoAlpha: 0, scale: 1.35, filter: 'blur(10px)', duration: 0.09 },
        0.36
      );

      // 5. le righe del titolo entrano una alla volta, ognuna con la sua entrata
      tl.fromTo(
        titleRef.current!.querySelectorAll('.mp-hero-line > span'),
        { yPercent: 118, rotateX: -42, autoAlpha: 0 },
        {
          yPercent: 0,
          rotateX: 0,
          autoAlpha: 1,
          duration: 0.11,
          stagger: 0.05,
          ease: 'power3.out',
        },
        0.44
      );

      // 6. il sottotitolo
      tl.fromTo(
        subRef.current,
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 0.08, ease: 'power2.out' },
        0.62
      );

      // 7. il pulsante nasce dalla luce. Chiude a 0.79: l'ultimo quinto di
      // scroll è una pausa a scena completa, prima che l'hero si sganci.
      tl.fromTo(
        ctaRef.current,
        { autoAlpha: 0, scale: 0.62, filter: 'blur(12px)' },
        { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.11, ease: 'back.out(1.7)' },
        0.68
      );

      ScrollTrigger.refresh();
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={sectionRef} className="mp-hero" id="hero">
      <div className="mp-hero-pin">
        <div ref={glowRef} className="mp-hero-glow2" aria-hidden />

        <p ref={wordmarkRef} className="mp-hero-wordmark" aria-hidden>
          MediaPro<em>.</em>
        </p>

        <div className="mp-hero-copy">
          <h1 ref={titleRef} className="mp-hero-title">
            {HERO.lines.map((line) => (
              <span
                key={line.text}
                className={`mp-hero-line${line.accent ? ' mp-hero-line--accent' : ''}`}
              >
                <span>{line.text}</span>
              </span>
            ))}
          </h1>
          <p ref={subRef} className="mp-hero-sub">
            {HERO.sub}
          </p>
          <div ref={ctaRef} className="mp-hero-cta">
            <a className="mp-btn mp-btn--magnetic" href="#portfolio">
              {HERO.cta} <span className="mp-btn-arrow">→</span>
            </a>
          </div>
        </div>

        <div className="mp-hero-scroll">Scroll</div>
      </div>
    </section>
  );
}
