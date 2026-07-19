'use client';

// I testi del viaggio: entrano solo a camera quasi ferma, ancorati alla
// finestra di p della propria scena. Aggiornamento via ticker, mai setState.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { localT, span, smooth } from '@/lib/scenes';
import { JOURNEY_COPY } from '@/content/copy';
import { whiteout } from '@/content/direction';

export function Overlays() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const white = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const p = progress.smoothed;
      JOURNEY_COPY.forEach((c, i) => {
        const el = refs.current[i];
        if (!el) return;
        const t = localT(p, c.scene);
        const win = 0.14;
        const a = smooth(span(t, c.from, c.from + win)) * (1 - smooth(span(t, c.to - win, c.to)));
        el.style.opacity = String(a);
        el.style.transform = `translateY(${(1 - a) * 1.2}rem)`;
        el.style.visibility = a < 0.005 ? 'hidden' : 'visible';
      });
      if (white.current) {
        // Il bianco assoluto della chiusura: accompagna l'atterraggio su S13.
        white.current.style.opacity = String(whiteout(p) * 0.9);
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
    </>
  );
}
