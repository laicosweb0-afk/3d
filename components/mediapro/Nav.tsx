'use client';

import { useEffect, useState } from 'react';
import { NAV } from './content';

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [active, setActive] = useState('hero');

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Evidenzia la voce della sezione attualmente in vista.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
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
