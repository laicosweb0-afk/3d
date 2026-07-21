'use client';

// Le finestre di realtà (Direzione V4): la fotografia autentica non
// "compare" — si materializza. Emerge dal 3D andando a fuoco (blur→
// nitido) mentre rientra di scala, così il passaggio è una continuità,
// non un cambio di scena. Il mondo dietro non si ferma: quando la
// finestra si richiude, la continuità non si è mai spezzata.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { localT, span, smooth } from '@/lib/scenes';
import { REALITY_WINDOWS } from '@/content/reality';
import { afterJourney } from './Overlays';

// grading condiviso (allineato al 3D, quiet luxury)
const GRADE = 'contrast(1.045) saturate(0.96) brightness(1.005)';

export function RealityWindows() {
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const caps = useRef<(HTMLElement | null)[]>([]);
  const figs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const update = () => {
      const p = progress.smoothed;
      const out = 1 - afterJourney();
      REALITY_WINDOWS.forEach((w, i) => {
        const fig = figs.current[i];
        const img = imgs.current[i];
        const cap = caps.current[i];
        if (!fig) return;
        const t = localT(p, w.scene);
        // ingresso lento (materializzazione), uscita più rapida
        const inWin = 0.14;
        const outWin = 0.1;
        const a = out *
          smooth(span(t, w.from, w.from + inWin)) *
          (1 - smooth(span(t, w.to - outWin, w.to)));
        fig.style.opacity = String(a);
        fig.style.visibility = a < 0.004 ? 'hidden' : 'visible';
        if (img) {
          // va a fuoco mentre entra: blur→0, scala 1.06→1
          const blur = (1 - a) * 7;
          img.style.filter = `${GRADE} blur(${blur.toFixed(2)}px)`;
          img.style.transform = `scale(${(1.06 - a * 0.06).toFixed(4)})`;
        }
        if (cap) {
          // la didascalia arriva dopo che l'immagine si è risolta
          const ca = smooth(span(a, 0.55, 1));
          cap.style.opacity = String(ca);
          cap.style.transform = `translateY(${((1 - ca) * 0.8).toFixed(2)}rem)`;
        }
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
          ref={(el) => { figs.current[i] = el; }}
          aria-hidden="true"
        >
          <img
            className="rw-img"
            src={w.src}
            alt=""
            draggable={false}
            ref={(el) => { imgs.current[i] = el; }}
          />
          <figcaption
            className="rw-caption"
            ref={(el) => { caps.current[i] = el; }}
          >
            <span className="rw-kicker">{w.kicker}</span>
            <span className="rw-text">{w.caption}</span>
          </figcaption>
        </figure>
      ))}
    </>
  );
}
