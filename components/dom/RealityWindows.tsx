'use client';

// Le finestre di realtà (Direzione V4). Due modalità:
//  - foto: si materializza a fuoco dal 3D (blur→nitido);
//  - video: transizione 3D→reale scrubbata dallo scroll (il primo frame
//    è il 3D di quel momento, l'ultimo è la foto reale) — un morph
//    continuo, non un cambio di scena. Il mondo dietro non si ferma.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { localT, span, smooth, clamp01 } from '@/lib/scenes';
import { REALITY_WINDOWS } from '@/content/reality';
import { asset } from '@/lib/asset';
import { afterJourney } from './Overlays';

const GRADE = 'contrast(1.045) saturate(0.96) brightness(1.005)';
// quanto presto, in progresso locale di scena, iniziare a scaricare il
// video: abbastanza in anticipo da essere pronto, non così tanto da
// competere con gli asset critici (Hero, maquette) al primo carico.
const PRELOAD_LEAD = 0.2;

export function RealityWindows() {
  const figs = useRef<(HTMLElement | null)[]>([]);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const caps = useRef<(HTMLElement | null)[]>([]);
  const loaded = useRef<boolean[]>([]);

  useEffect(() => {
    // il canvas 3D: durante una finestra reale lo dissolviamo, così lo
    // spazio DIVENTA foto/reale (cross-dissolve) invece di vedere l'immagine
    // incollata sopra. La camera intanto è ferma (regia): sembra un unico
    // movimento continuo, non uno stacco.
    // Risoluzione pigra: il wrapper del canvas può montare dopo questo effetto.
    let canvas: HTMLElement | null = null;
    const update = () => {
      if (!canvas) canvas = document.querySelector<HTMLElement>('.world-canvas');
      const p = progress.smoothed;
      const out = 1 - afterJourney();
      let maxA = 0;
      REALITY_WINDOWS.forEach((w, i) => {
        const fig = figs.current[i];
        if (!fig) return;
        const t = localT(p, w.scene);

        // caricamento pigro: il video parte a scaricare solo quando la
        // finestra si avvicina, non al mount della pagina
        const vidEl = vids.current[i];
        if (vidEl && w.video && !loaded.current[i] && t > w.from - PRELOAD_LEAD) {
          loaded.current[i] = true;
          vidEl.preload = 'auto';
          vidEl.load();
        }

        // entrata più morbida e lunga: un vero incrocio, non uno snap
        const inWin = w.video ? 0.13 : 0.15;
        const outWin = 0.1;
        const a = out *
          smooth(span(t, w.from, w.from + inWin)) *
          (1 - smooth(span(t, w.to - outWin, w.to)));
        fig.style.opacity = String(a);
        fig.style.visibility = a < 0.004 ? 'hidden' : 'visible';
        if (a > maxA) maxA = a;

        const vid = vids.current[i];
        if (vid && w.video) {
          // scrub: il morph si completa entro il 72% della finestra,
          // poi tiene sull'ultimo frame (la foto reale)
          const morph = clamp01((t - w.from) / ((w.to - w.from) * 0.72));
          const dur = (w.videoDuration ?? vid.duration) || 2;
          const target = smooth(morph) * Math.max(dur - 0.05, 0.05);
          if (Number.isFinite(target) && Math.abs(vid.currentTime - target) > 0.016) {
            vid.currentTime = target;
          }
          // niente blur/scale marcati: con il cross-dissolve del 3D sotto,
          // un velo minimo basta e resta pulito
          const vblur = (1 - a) * 2;
          vid.style.filter = `${GRADE} blur(${vblur.toFixed(2)}px)`;
          vid.style.transform = `scale(${(1.02 - a * 0.02).toFixed(4)})`;
        }
        const img = imgs.current[i];
        if (img && !w.video) {
          const blur = (1 - a) * 4;
          img.style.filter = `${GRADE} blur(${blur.toFixed(2)}px)`;
          img.style.transform = `scale(${(1.04 - a * 0.04).toFixed(4)})`;
        }
        const cap = caps.current[i];
        if (cap) {
          const ca = smooth(span(a, 0.55, 1));
          cap.style.opacity = String(ca);
          cap.style.transform = `translateY(${((1 - ca) * 0.8).toFixed(2)}rem)`;
        }
      });
      // il 3D si ritira mentre il reale emerge: lo spazio si trasforma
      if (canvas) canvas.style.opacity = String(1 - 0.92 * maxA);
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
          {w.video ? (
            <video
              className="rw-img"
              ref={(el) => { vids.current[i] = el; }}
              muted
              playsInline
              preload="none"
              // poster e fallback: la foto reale (ultimo frame). Il
              // download vero parte lazy (vedi PRELOAD_LEAD sopra).
              poster={asset(w.src)}
            >
              <source src={asset(`${w.video}.webm`)} type="video/webm" />
              <source src={asset(`${w.video}.mp4`)} type="video/mp4" />
            </video>
          ) : (
            <img
              className="rw-img"
              ref={(el) => { imgs.current[i] = el; }}
              src={asset(w.src)}
              alt=""
              draggable={false}
            />
          )}
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
