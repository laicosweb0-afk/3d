'use client';

import { Fragment, useEffect, useRef } from 'react';
import { gsap } from './gsap';

type Props = {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  /** Parole da rendere in oro (confronto senza punteggiatura). */
  accent?: string[];
};

/**
 * Titolo che si assembla lettera per lettera.
 *
 * Ogni carattere arriva da una profondità diversa e ruota sul proprio asse
 * mentre si mette a posto: non è una dissolvenza, è un testo che si compone.
 * Le parole restano unità indivisibili (`white-space: nowrap` sulla parola),
 * così l'animazione non manda a capo il testo in modo innaturale.
 */
export function SplitTitle({ text, as: Tag = 'h2', className = '', accent = [] }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.mp-char'),
        // Meno rotazione e meno profondità: il ribaltamento da 78 gradi si
        // leggeva come uno sfarfallio quando le lettere sono tante, e su un
        // titolo lungo diventava rumore. Un quarto di quel giro, più lento,
        // dà lo stesso senso di lettere che si mettono in piano — con la
        // differenza che si riesce a leggerle mentre lo fanno.
        { yPercent: 104, rotateX: -34, autoAlpha: 0, z: -24 },
        {
          yPercent: 0,
          rotateX: 0,
          autoAlpha: 1,
          z: 0,
          duration: 1.05,
          ease: 'power3.out',
          stagger: { each: 0.021, from: 'start' },
          scrollTrigger: { trigger: el, start: 'top 86%' },
        }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  const words = text.split(' ');

  return (
    <Tag ref={ref} className={`mp-split ${className}`.trim()}>
      {words.map((word, wi) => {
        const bare = word.replace(/[.,;:!?—]/g, '');
        const isAccent = accent.includes(bare);
        return (
          <Fragment key={`${word}-${wi}`}>
            <span className={`mp-word${isAccent ? ' mp-word--accent' : ''}`}>
              {[...word].map((ch, ci) => (
                <span key={ci} className="mp-char">
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.length - 1 && ' '}
          </Fragment>
        );
      })}
    </Tag>
  );
}
