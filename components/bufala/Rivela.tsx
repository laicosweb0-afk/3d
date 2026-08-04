'use client';

// La comparsa dei blocchi.
//
// Ogni elemento marcato `data-rivela` entra con una dissolvenza lenta e una
// risalita di pochi pixel quando arriva in vista. Non è decorazione: è ciò
// che dà la sensazione che la pagina risponda invece di essere già lì tutta
// insieme.
//
// Un solo osservatore per tutta la pagina, e ogni elemento viene smesso di
// osservare appena si è mostrato: un blocco che ricompare ogni volta che si
// risale è un effetto, e un effetto si nota.
//
// Chi ha chiesto meno movimento non riceve niente: gli elementi partono già
// visibili dal CSS, e questo componente non li tocca.

import { useEffect } from 'react';

export function Rivela() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const elementi = Array.from(document.querySelectorAll<HTMLElement>('[data-rivela]'));
    if (!elementi.length) return;

    for (const el of elementi) el.dataset.rivela = 'attesa';

    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const v of voci) {
          if (!v.isIntersecting) continue;
          (v.target as HTMLElement).dataset.rivela = 'visto';
          osservatore.unobserve(v.target);
        }
      },
      // Si mostra quando è entrato di un quinto: aspettare che sia tutto in
      // vista fa comparire i blocchi alti quando li si sta già leggendo.
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );

    for (const el of elementi) osservatore.observe(el);
    return () => osservatore.disconnect();
  }, []);

  return null;
}
