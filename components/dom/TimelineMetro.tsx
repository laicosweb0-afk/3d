'use client';

// Il metro: la timeline dei capitoli nel linguaggio del logo (nastro graduato).
// Hairline neutra, tratto percorso in antracite, tacca attiva in --pietra.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { progress } from '@/lib/progress';
import { SCENES, sceneRange, sceneAt, pAt } from '@/lib/scenes';
import { scrollToP } from '@/lib/scroll';
import { useApp } from '@/lib/store';

export function TimelineMetro() {
  const fill = useRef<HTMLDivElement>(null);
  const setScene = useApp((s) => s.setScene);
  const scene = useApp((s) => s.scene);

  useEffect(() => {
    const update = () => {
      const p = progress.smoothed;
      if (fill.current) fill.current.style.height = `${p * 100}%`;
      const s = sceneAt(p);
      if (s.id !== useApp.getState().scene) setScene(s.id);
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [setScene]);

  return (
    <nav className="metro" aria-label="Capitoli del viaggio">
      <div className="metro-track" aria-hidden="true">
        <div className="metro-fill" ref={fill} />
      </div>
      <ul className="metro-ticks">
        {SCENES.map((s) => (
          <li
            key={s.id}
            style={{ top: `${sceneRange(s.id).p0 * 100}%` }}
            className={scene === s.id ? 'is-active' : ''}
          >
            <button
              type="button"
              aria-label={`${s.titolo} — vai al capitolo`}
              aria-current={scene === s.id ? 'step' : undefined}
              onClick={() => scrollToP(pAt(s.id, 0.02))}
            >
              <span className="metro-label">{s.titolo}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
