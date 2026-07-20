'use client';

// La radice dell'esperienza: canvas fisso + spacer di scroll + layer DOM.
// Con prefers-reduced-motion il viaggio si ritira e resta il documento.

import { useEffect, useRef, useState } from 'react';
import { World } from './canvas/World';
import { Hero } from './dom/Hero';
import { Overlays } from './dom/Overlays';
import { TimelineMetro } from './dom/TimelineMetro';
import { initScroll } from '@/lib/scroll';
import { TOTAL_VH } from '@/lib/scenes';
import { progress, debugState } from '@/lib/progress';

export function ExperienceRoot() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const spacer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // modalità fotogramma per still di produzione/QA
    const q = new URLSearchParams(window.location.search);
    const pParam = q.get('p');
    if (pParam !== null) {
      debugState.fixedP = Math.min(1, Math.max(0, parseFloat(pParam)));
      progress.p = debugState.fixedP;
      progress.smoothed = debugState.fixedP;
    }
    debugState.clay = q.get('clay') === '1';
    debugState.still = q.get('still') === '1';
    if (q.get('ui') === '0') document.body.classList.add('no-ui');
    setMounted(true);
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!mounted || reduced || !spacer.current) return;
    if (debugState.fixedP !== null) return; // fotogramma bloccato: niente scroll
    return initScroll(spacer.current);
  }, [mounted, reduced]);

  if (mounted && reduced) {
    return (
      <div className="reduced">
        <Hero />
      </div>
    );
  }

  return (
    <>
      <div className="world" aria-hidden="true">
        {mounted && <World />}
      </div>
      <div
        className="journey-spacer"
        ref={spacer}
        style={{ height: `${TOTAL_VH * 100}svh` }}
      />
      <Hero />
      <Overlays />
      <TimelineMetro />
      <header className="chrome">
        <span className="chrome-logo">Mondial Service</span>
        <a className="chrome-cta" href="#contatti">Contattaci</a>
      </header>
    </>
  );
}
