'use client';

// I testi del viaggio: entrano solo a camera quasi ferma, ancorati alla
// finestra di p della propria scena. Aggiornamento via ticker, mai setState.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { localT, span, smooth, clamp01, TOTAL_VH } from '@/lib/scenes';
import { JOURNEY_COPY } from '@/content/copy';
import { whiteout } from '@/content/direction';
import { asset } from '@/lib/asset';

/** 1 quando il viewport ha superato la fine del viaggio (siamo nelle sezioni). */
export function afterJourney(): number {
  const endY = (TOTAL_VH - 1) * window.innerHeight;
  return clamp01((window.scrollY - endY) / (window.innerHeight * 0.35));
}

export function Overlays() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const white = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const update = () => {
      const p = progress.smoothed;
      const out = 1 - afterJourney(); // tutto il layer del viaggio si congeda
      JOURNEY_COPY.forEach((c, i) => {
        const el = refs.current[i];
        if (!el) return;
        const t = localT(p, c.scene);
        const win = 0.14;
        const a = out * smooth(span(t, c.from, c.from + win)) * (1 - smooth(span(t, c.to - win, c.to)));
        el.style.opacity = String(a);
        // Lo scostamento d'ingresso passa da una variabile, non dal transform.
        // Scrivendo `transform` da qui si cancellava quello del foglio di
        // stile: il testo del congedo è centrato con translateX(-50%) e
        // restava appeso a partire da metà schermo. Ora la CSS compone i due
        // pezzi e ogni scena tiene la propria centratura.
        el.style.setProperty('--copy-y', `${(1 - a) * 1.2}rem`);
        el.style.visibility = a < 0.005 ? 'hidden' : 'visible';
      });
      const w = whiteout(p);
      if (white.current) {
        // Il bianco della chiusura accompagna l'atterraggio, poi si ritira.
        white.current.style.opacity = String(w * 0.9 * out);
      }
      if (logo.current) {
        // la casa è tornata foglio bianco: ora è il logo a comparire
        const lg = smooth(span(w, 0.55, 1)) * out;
        logo.current.style.opacity = String(lg);
        logo.current.style.transform = `translate(-50%, -50%) scale(${0.94 + lg * 0.06})`;
      }
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <>
      {JOURNEY_COPY.map((c, i) => (
        <div
          key={`${c.scene}-${i}`}
          className={`scene-copy scene-copy--${c.scene}`}
          ref={(el) => { refs.current[i] = el; }}
        >
          {c.kicker && <p className="scene-copy-kicker">{c.kicker}</p>}
          <h2 className="scene-copy-title">{c.title}</h2>
          {c.body && <p className="scene-copy-body">{c.body}</p>}
        </div>
      ))}
      <div className="whiteout" ref={white} aria-hidden="true" />
      <img
        className="whiteout-logo"
        ref={logo}
        src={asset('/assets/brand/logo-full-text.png')}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </>
  );
}
