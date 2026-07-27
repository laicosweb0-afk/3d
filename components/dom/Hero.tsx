'use client';

// S01 — la Hero è anche il loader: bianco, tipografia, silenzio.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { pAt, span, smooth } from '@/lib/scenes';
import { asset } from '@/lib/asset';
import { HERO } from '@/content/copy';

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const p = progress.smoothed;
      // Finestra espressa in progresso assoluto, non ancorata alle scene 3D:
      // il viaggio col girato reale è più corto, e con la vecchia finestra
      // l'hero restava fermo quattro secondi buoni — quattro fotogrammi
      // identici nel punto in cui l'utente decide se restare.
      const fade = 1 - smooth(span(p, 0.005, 0.045));
      const gone = 1 - fade;
      ref.current.style.opacity = String(fade);
      // arretra e va fuori fuoco: profondità, non un semplice dissolvi
      ref.current.style.transform = `translateY(${gone * -4}rem) scale(${1 - gone * 0.03})`;
      ref.current.style.filter = gone > 0.001 ? `blur(${(gone * 9).toFixed(2)}px)` : 'none';
      ref.current.style.visibility = fade < 0.005 ? 'hidden' : 'visible';
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <div className="hero" ref={ref}>
      <img
        className="hero-logo"
        src={asset('/assets/brand/logo-full-text.png')}
        alt="Mondial Service — Ristrutturazioni, Impianti, Servizi"
      />
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
