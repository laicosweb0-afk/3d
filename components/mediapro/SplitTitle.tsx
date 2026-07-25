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
 * Titolo che si rivela parola per parola: ogni parola sale da dietro una
 * maschera, con un leggero sfasamento. È il reveal usato su tutti i titoli
 * di sezione, al posto del fade generico.
 */
export function SplitTitle({ text, as: Tag = 'h2', className = '', accent = [] }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('.mp-word > span'),
        { yPercent: 118 },
        {
          yPercent: 0,
          duration: 1.2,
          ease: 'power3.out',
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: 'top 88%' },
        }
      );
    }, el);

    return () => ctx.revert();
  }, []);

  const words = text.split(' ');

  return (
    <Tag ref={ref} className={`mp-split ${className}`.trim()}>
      {words.map((word, i) => {
        const bare = word.replace(/[.,;:!?—]/g, '');
        return (
          <Fragment key={`${word}-${i}`}>
            <span className={`mp-word${accent.includes(bare) ? ' mp-word--accent' : ''}`}>
              <span>{word}</span>
            </span>
            {i < words.length - 1 && ' '}
          </Fragment>
        );
      })}
    </Tag>
  );
}
