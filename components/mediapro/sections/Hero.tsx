'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '../gsap';
import { scroll } from '../three/scrollState';
import { BRAND, HERO } from '../content';

/**
 * L'hero dice cosa facciamo prima che tu debba fare qualcosa.
 *
 * Prima la coreografia era guidata dallo scroll: all'arrivo c'era solo la scena
 * 3D, e titolo, sottotitolo e pulsante nascevano man mano che si scorreva. Era
 * bello da vedere e sbagliato da progettare — chi apriva la pagina e restava
 * fermo due secondi vedeva un cubo nel buio e la parola "Scroll", e non aveva
 * il minimo indizio di cosa fosse questo sito. È esattamente il momento in cui
 * si chiude una scheda.
 *
 * Ora l'ingresso è a tempo, non a scroll: entro due secondi dal caricamento il
 * titolo, la frase e il pulsante sono lì, senza che l'utente muova un dito. Lo
 * scroll governa l'uscita — la copia arretra mentre la camera entra nella scena
 * e passa il testimone al portfolio. Stessa regia, ordine invertito.
 *
 * Il markup resta un h1 con tutto il testo: senza JavaScript, o con
 * prefers-reduced-motion, si legge tutto e la coreografia è un di più.
 */
export function Hero({ reduced }: { reduced: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current!;

    const ctx = gsap.context(() => {
      // ---- ingresso: a tempo, parte da solo al caricamento ----
      const intro = gsap.timeline({ delay: 0.12 });

      intro.fromTo(
        glowRef.current,
        { autoAlpha: 0, scale: 0.55 },
        { autoAlpha: 0.55, scale: 1, duration: 1.6, ease: 'power2.out' },
        0
      );
      intro.fromTo(
        titleRef.current!.querySelectorAll('.mp-hero-line > span'),
        { yPercent: 112, autoAlpha: 0 },
        {
          yPercent: 0,
          autoAlpha: 1,
          duration: 1.05,
          stagger: 0.13,
          ease: 'power3.out',
        },
        0
      );
      intro.fromTo(
        '.mp-hero-sub',
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power2.out' },
        0.5
      );
      intro.fromTo(
        '.mp-hero-cta',
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' },
        0.68
      );
      // l'indizio di scroll arriva per ultimo: prima si legge, poi si scorre
      intro.fromTo(
        '.mp-hero-scroll',
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.7, ease: 'power2.out' },
        1.05
      );

      // ---- uscita: guidata dallo scroll ----
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

      // l'indizio si ritira al primo accenno di scroll
      tl.to('.mp-hero-scroll', { autoAlpha: 0, duration: 0.05 }, 0);
      // il bagliore cresce mentre la camera entra
      tl.to(glowRef.current, { autoAlpha: 1, scale: 1.35, duration: 0.6 }, 0.1);
      // La copia si ritira nella seconda metà: resta leggibile per tutta la
      // prima, così anche chi scorre piano ha il tempo di finire la frase.
      tl.to(
        copyRef.current,
        { autoAlpha: 0, y: -70, filter: 'blur(6px)', duration: 0.42 },
        0.46
      );

      ScrollTrigger.refresh();
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={sectionRef} className="mp-hero" id="hero">
      <div className="mp-hero-pin">
        <div ref={glowRef} className="mp-hero-glow2" aria-hidden />

        <div ref={copyRef} className="mp-hero-copy">
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
          <p className="mp-hero-sub mp-hero-anim">{HERO.sub}</p>
          <div className="mp-hero-cta mp-hero-anim">
            <a className="mp-btn mp-btn--gold mp-btn--magnetic" href="#portfolio">
              {HERO.cta} <span className="mp-btn-arrow">→</span>
            </a>
            <a
              className="mp-btn"
              href={`https://wa.me/${BRAND.phoneDigits}`}
              target="_blank"
              rel="noopener"
            >
              {HERO.ctaAlt} <span className="mp-btn-arrow">→</span>
            </a>
          </div>
        </div>

        <div className="mp-hero-scroll mp-hero-anim">Scroll</div>
      </div>
    </section>
  );
}
