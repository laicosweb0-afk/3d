'use client';

// Le opere — non più un trascina-per-confrontare, ma una rivelazione
// guidata dallo scroll: lo stesso principio del viaggio sopra, portato nel
// documento. Il cantiere (grezzo, reale) scorre via da destra a sinistra
// mentre si scende nella pagina, e sotto compare il risultato (reale,
// consegnato). Nessuna interazione da scoprire: lo scroll fa già tutto.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { smooth, clamp01 } from '@/lib/scenes';

interface Props {
  before: string;
  after: string;
  alt: string;
  labelBefore?: string;
  labelAfter?: string;
}

export function OpereReveal({
  before, after, alt,
  labelBefore = 'Il cantiere',
  labelAfter = 'La consegna',
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const beforeLayer = useRef<HTMLDivElement>(null);
  const capBefore = useRef<HTMLSpanElement>(null);
  const capAfter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 quando la card è appena entrata dal basso del viewport, 1 quando
      // ha raggiunto una lettura comoda verso il centro: la rivelazione
      // avviene DURANTE lo scroll che porta la card in vista, non prima.
      const raw = (vh * 0.95 - r.top) / (vh * 0.55);
      const t = smooth(clamp01(raw));
      if (beforeLayer.current) {
        beforeLayer.current.style.transform = `translate3d(${(-t * 100).toFixed(2)}%,0,0)`;
      }
      if (capBefore.current) capBefore.current.style.opacity = String(1 - smooth(clamp01(t * 1.6)));
      if (capAfter.current) capAfter.current.style.opacity = String(smooth(clamp01((t - 0.35) * 1.6)));
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <figure className="or" ref={wrap} aria-label={`${alt}: dal cantiere alla consegna`}>
      <img className="or-img" src={after} alt={`${alt} — ${labelAfter}`} draggable={false} loading="lazy" />
      <div className="or-before" ref={beforeLayer}>
        <img className="or-img" src={before} alt={`${alt} — ${labelBefore}`} draggable={false} loading="lazy" />
        <span className="or-edge" aria-hidden="true" />
      </div>
      <figcaption className="or-labels" aria-hidden="true">
        <span ref={capBefore}>{labelBefore}</span>
        <span ref={capAfter}>{labelAfter}</span>
      </figcaption>
    </figure>
  );
}
