'use client';

import { useEffect, useState } from 'react';
import { NAV } from './content';

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState('hero');

  useEffect(() => {
    // Qui prima c'era un IntersectionObserver: segnalava l'entrata di una
    // sezione ma non l'uscita, quindi in una scrollata veloce vinceva
    // l'ultimo evento arrivato e la voce evidenziata poteva restare indietro.
    // Misurare a ogni frame utile quale sezione contiene il centro dello
    // schermo è deterministico: non c'è ordine di eventi che possa sbagliarlo.
    let queued = false;

    const measure = () => {
      queued = false;
      setSolid(window.scrollY > 40);
      const mid = window.innerHeight / 2;
      let current = NAV[0].id;
      for (const { id } of NAV) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) current = id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <header className={`mp-nav${solid ? ' mp-nav--solid' : ''}`}>
      <a className="mp-nav-logo" href="#hero">
        MediaPro<em>.</em>
      </a>
      <nav aria-label="Navigazione principale">
        <ul className="mp-nav-links">
          {NAV.map((item, i) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className={active === item.id ? 'is-active' : ''}>
                <span className="mp-nav-num">{String(i + 1).padStart(2, '0')}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <a className="mp-btn mp-btn--gold" href="#contatti">
        Lavora con noi <span className="mp-btn-arrow">→</span>
      </a>
    </header>
  );
}
