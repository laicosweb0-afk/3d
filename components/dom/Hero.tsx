'use client';

// S01 — la Hero è anche il loader: bianco, tipografia, silenzio.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { pAt, span, smooth } from '@/lib/scenes';
import { HERO } from '@/content/copy';

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const p = progress.smoothed;
      const fade = 1 - smooth(span(p, pAt('s01', 0.35), pAt('s02', 0.45)));
      ref.current.style.opacity = String(fade);
      ref.current.style.transform = `translateY(${(1 - fade) * -4}rem)`;
      ref.current.style.visibility = fade < 0.005 ? 'hidden' : 'visible';
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <div className="hero" ref={ref}>
      <p className="hero-brand">Mondial Service</p>
      <h1 className="hero-title">
        {HERO.title.split('\n').map((line) => (
          <span key={line}>{line}</span>
        ))}
      </h1>
      <p className="hero-sub">{HERO.sub}</p>
      <p className="hero-hint" aria-hidden="true">{HERO.scrollHint}</p>
    </div>
  );
}
