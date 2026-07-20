'use client';

// Prima/Dopo — il principio di interazione del riferimento, ridisegnato
// nel linguaggio del sito: hairline antracite, maniglia minima, etichette
// tipografiche. Trascinamento con la stessa morbidezza dello scroll.

import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  before: string;
  after: string;
  alt: string;
  labelBefore?: string;
  labelAfter?: string;
}

export function BeforeAfter({
  before, after, alt,
  labelBefore = 'Il progetto',
  labelAfter = 'La consegna',
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const target = useRef(0.5);
  const [pos, setPos] = useState(0.5);
  const raf = useRef<number>(0);

  // inseguimento morbido (stessa fisica dello scroll del viaggio)
  useEffect(() => {
    const tick = () => {
      setPos((prev) => {
        const next = prev + (target.current - prev) * 0.14;
        return Math.abs(next - target.current) < 0.0005 ? target.current : next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    target.current = Math.min(0.96, Math.max(0.04, (clientX - r.left) / r.width));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons > 0 || e.pointerType === 'touch') setFromClientX(e.clientX);
  };

  return (
    <figure
      className="ba"
      ref={wrap}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      role="slider"
      aria-label={`${alt}: confronto ${labelBefore} / ${labelAfter}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') target.current = Math.max(0.04, target.current - 0.08);
        if (e.key === 'ArrowRight') target.current = Math.min(0.96, target.current + 0.08);
      }}
    >
      <img className="ba-img" src={after} alt={`${alt} — ${labelAfter}`} draggable={false} />
      <div className="ba-clip" style={{ clipPath: `inset(0 ${100 - pos * 100}% 0 0)` }}>
        <img className="ba-img" src={before} alt={`${alt} — ${labelBefore}`} draggable={false} />
      </div>
      <div className="ba-line" style={{ left: `${pos * 100}%` }} aria-hidden="true">
        <span className="ba-handle" />
      </div>
      <figcaption className="ba-labels" aria-hidden="true">
        <span>{labelBefore}</span>
        <span>{labelAfter}</span>
      </figcaption>
    </figure>
  );
}
