'use client';

// Le finestre di realtà: la fotografia autentica affiora a piena
// inquadratura sopra il 3D, guidata dallo scroll, reversibile.
// Il mondo dietro non si ferma: quando la finestra si richiude,
// la continuità non si è mai spezzata.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { localT, span, smooth } from '@/lib/scenes';
import { REALITY_WINDOWS } from '@/content/reality';
import { afterJourney } from './Overlays';

export function RealityWindows() {
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const update = () => {
      const p = progress.smoothed;
      const out = 1 - afterJourney();
      REALITY_WINDOWS.forEach((w, i) => {
        const el = refs.current[i];
        if (!el) return;
        const t = localT(p, w.scene);
        const win = 0.1;
        const a = out *
          smooth(span(t, w.from, w.from + win)) *
          (1 - smooth(span(t, w.to - win, w.to)));
        el.style.opacity = String(a);
        el.style.visibility = a < 0.004 ? 'hidden' : 'visible';
        const img = el.firstElementChild as HTMLElement | null;
        if (img) img.style.transform = `scale(${1.045 - a * 0.045})`;
      });
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <>
      {REALITY_WINDOWS.map((w, i) => (
        <figure
          key={w.id}
          className="rw"
          ref={(el) => { refs.current[i] = el; }}
          aria-hidden="true"
        >
          <img className="rw-img" src={w.src} alt="" draggable={false} />
          <figcaption className="rw-caption">
            <span className="rw-kicker">{w.kicker}</span>
            <span className="rw-text">{w.caption}</span>
          </figcaption>
        </figure>
      ))}
    </>
  );
}
