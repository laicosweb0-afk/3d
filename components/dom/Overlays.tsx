'use client';

// I testi del viaggio: card di vetro sospese, non testo appoggiato sul video.
// Tre fasi per ogni card — entra, resta ferma (respira), esce — tutte
// funzione pura di p: scrubbabili, reversibili, mai un tween a tempo fisso.
// Mentre una card è in scena, lo sfondo 3D perde leggermente fuoco (l'occhio
// deve leggere senza sforzo); torna nitido quando la card è sparita.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { localT, span, smooth, clamp01, TOTAL_VH } from '@/lib/scenes';
import { JOURNEY_COPY } from '@/content/copy';
import { whiteout, logoReveal } from '@/content/direction';
import { asset } from '@/lib/asset';

/**
 * 1 quando il viewport ha superato la fine del viaggio (siamo nelle sezioni).
 * Il congedo parte alla FINE vera del viaggio, non una schermata prima: se si
 * ritira troppo presto il velo bianco sparisce mentre le sezioni non hanno
 * ancora coperto, e per un istante riaffiora il 3D sotto.
 */
export function afterJourney(): number {
  const endY = TOTAL_VH * window.innerHeight;
  return clamp01((window.scrollY - endY) / (window.innerHeight * 0.5));
}

// Curve di entrata/uscita: pure funzioni di un 0..1 di scroll, non del
// tempo — restano scrubbabili al 100%, ma "sentono" come easeOutExpo /
// easeIn perché è così che il piano sequenza deve muoversi in tutto il sito.
function expoOut(x: number): number {
  const t = clamp01(x);
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
function cubicIn(x: number): number {
  const t = clamp01(x);
  return t * t * t;
}

// Alternanza di posizione: il ritmo compositivo che il brief chiede
// (sinistra/destra/centro/sinistra-bassa...), applicato per indice della
// card, non per scena — così resta indipendente dal numero di beat.
const POSITIONS = ['left', 'right', 'center', 'left-low', 'right', 'center'] as const;

// mezza-finestra di entrata/uscita nel progresso locale della SCENA della
// card (non della finestra from/to): tenuta stretta perché alcune card
// vivono in finestre corte e devono comunque avere un tratto di sosta.
const WIN = 0.11;

export function Overlays() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const white = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLImageElement>(null);
  const t0 = useRef(Math.random() * 100);

  useEffect(() => {
    // il canvas 3D: lazy, può montare dopo questo effetto
    let canvas: HTMLElement | null = null;
    const update = () => {
      if (!canvas) canvas = document.querySelector<HTMLElement>('.world-canvas');
      const p = progress.smoothed;
      const out = 1 - afterJourney(); // tutto il layer del viaggio si congeda
      const time = t0.current + performance.now() / 1000;
      let maxA = 0;

      JOURNEY_COPY.forEach((c, i) => {
        const el = refs.current[i];
        if (!el) return;
        const t = localT(p, c.scene);

        const enterT = expoOut(span(t, c.from, c.from + WIN));
        const exitT = cubicIn(span(t, c.to - WIN, c.to));
        const a = out * enterT * (1 - exitT);
        if (a > maxA) maxA = a;

        // "quanto è ferma": 1 in pausa di lettura, scende durante enter/exit
        const steady = Math.min(enterT, 1 - exitT);
        const breathe = steady > 0.985 ? Math.sin(time * 0.55 + i * 1.7) * 0.11 : 0;

        // traslazione: 80px→0 in entrata (≈5rem), poi 0→-70px in uscita (≈4.375rem)
        const ty = (1 - enterT) * 5 - exitT * 4.375 + breathe;
        // scala: 0.94→1 in entrata, poi 1→0.97 in uscita
        const scale = 0.94 + enterT * 0.06 - exitT * 0.03;
        // blur della card stessa (non il vetro, quello è fisso in CSS):
        // 10px→0 in entrata, 0→8px in uscita
        const blurPx = (1 - enterT) * 10 + exitT * 8;

        el.style.opacity = String(a);
        el.style.transform = `translateY(${ty.toFixed(3)}rem) scale(${scale.toFixed(4)})`;
        el.style.filter = blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : 'none';
        el.style.visibility = a < 0.004 ? 'hidden' : 'visible';
      });

      // effetto focus: lo sfondo 3D perde leggermente fuoco mentre si legge,
      // torna nitido quando nessuna card è in scena
      if (canvas) {
        canvas.style.filter = maxA > 0.01
          ? `brightness(${(1 - 0.1 * maxA).toFixed(3)}) contrast(${(1 - 0.08 * maxA).toFixed(3)}) saturate(${(1 - 0.05 * maxA).toFixed(3)}) blur(${(2 * maxA).toFixed(2)}px)`
          : 'none';
      }

      const w = whiteout(p);
      if (white.current) {
        // Bianco PIENO: raccoglie il bianco del video della finestra e lo
        // tiene. Se restasse trasparente si intravedrebbe il 3D sotto e il
        // passaggio si vedrebbe. Si ritira solo entrando nelle sezioni.
        white.current.style.opacity = String(w * out);
      }
      if (logo.current) {
        // la casa è tornata foglio bianco: ora è il logo a comparire
        const lg = logoReveal(p) * out;
        logo.current.style.opacity = String(lg);
        logo.current.style.transform = `translate(-50%, -50%) scale(${0.94 + lg * 0.06})`;
      }
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <>
      {JOURNEY_COPY.map((c, i) => {
        const isFinal = c.scene === 's12';
        const pos = isFinal ? 'center' : POSITIONS[i % POSITIONS.length];
        return (
          <div
            key={`${c.scene}-${i}`}
            className={`scene-copy scene-copy--${pos}${isFinal ? ' scene-copy--final' : ''}`}
            ref={(el) => { refs.current[i] = el; }}
          >
            {!isFinal && <span className="scene-copy-num">{String(i + 1).padStart(2, '0')}</span>}
            {c.kicker && <p className="scene-copy-kicker">{c.kicker}</p>}
            <h2 className="scene-copy-title">{c.title}</h2>
            {c.body && <p className="scene-copy-body">{c.body}</p>}
            {!isFinal && (
              <p className="scene-copy-cta" aria-hidden="true">
                Continua <span className="scene-copy-arrow">↓</span>
              </p>
            )}
          </div>
        );
      })}
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
