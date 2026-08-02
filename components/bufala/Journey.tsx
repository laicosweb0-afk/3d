'use client';

// Il viaggio: un palco fisso più uno spacer che genera lo scroll.
// Tutto è funzione pura del progresso `p` — nessuna scena ha stato proprio,
// così il viaggio è reversibile per costruzione (stesso principio di
// Mondial Service, TECH_ARCHITECTURE.md §1).

import { useEffect, useRef } from 'react';
import { SCENES, TOTAL_VH, sceneWeight, localT } from '@/lib/bufala/scenes';
import { sceneCopy } from '@/content/bufala/copy';
import { initScroll } from '@/lib/bufala/scroll';
import { Stage } from './Stage';
import { Progresso } from './Progresso';

export function Journey() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  /** Progresso master, fuori da React: si aggiorna a ogni frame senza
   *  rerender (un setState per frame ucciderebbe il frame budget). */
  const p = useRef(0);

  useEffect(() => {
    const spacer = spacerRef.current;
    const overlay = overlayRef.current;
    if (!spacer || !overlay) return;

    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ridotto) return; // il CSS mostra già tutto, senza animazione

    // Lo scroll morbido è parte della regia, non un effetto: senza, il
    // ritmo cerimonioso di DIRECTION_BUFALA.md §6 non esiste.
    const fermaScroll = initScroll();

    const scene = Array.from(
      overlay.querySelectorAll<HTMLElement>('[data-scena]'),
    );

    let raf = 0;
    /** Progresso inseguito con smorzamento: lo scroll non strappa mai
     *  (Direzione §6 — ritmo cerimonioso). */
    let smoothed = 0;
    let ultimo = performance.now();

    const leggiScroll = () => {
      const alt = spacer.offsetHeight - window.innerHeight;
      const y = -spacer.getBoundingClientRect().top;
      p.current = alt > 0 ? Math.min(Math.max(y / alt, 0), 1) : 0;
    };

    const frame = (ora: number) => {
      const dt = Math.min((ora - ultimo) / 1000, 0.1);
      ultimo = ora;

      // Smorzamento esponenziale, indipendente dal frame rate.
      smoothed += (p.current - smoothed) * (1 - Math.exp(-9 * dt));

      for (const el of scene) {
        const id = el.dataset.scena as (typeof SCENES)[number]['id'];
        const peso = sceneWeight(smoothed, id);
        el.style.opacity = String(peso);
        // Deriva verticale minima: il testo respira, non "entra".
        const t = localT(smoothed, id);
        el.style.transform = `translate3d(0, ${(0.5 - t) * 2.5}rem, 0)`;
        el.style.visibility = peso < 0.01 ? 'hidden' : 'visible';
      }

      Stage.render(smoothed);
      Progresso.render(smoothed);
      raf = requestAnimationFrame(frame);
    };

    leggiScroll();
    window.addEventListener('scroll', leggiScroll, { passive: true });
    window.addEventListener('resize', leggiScroll);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', leggiScroll);
      window.removeEventListener('resize', leggiScroll);
      fermaScroll();
    };
  }, []);

  return (
    <>
      <Stage />
      <Progresso />

      <div ref={overlayRef} className="bufala-overlay" aria-hidden="true">
        {SCENES.map((s) => (
          <div key={s.id} className="scena" data-scena={s.id} style={{ opacity: 0 }}>
            <h1>{sceneCopy[s.id].titolo}</h1>
            {sceneCopy[s.id].nota && (
              <p className="micro" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                {sceneCopy[s.id].nota}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Lo spacer genera lo scroll del viaggio: la sua altezza è la somma
          delle durate dichiarate nella scaletta. */}
      <div
        ref={spacerRef}
        className="bufala-spacer"
        style={{ height: `${TOTAL_VH * 100}svh` }}
      />

      {/* Il documento leggibile senza JavaScript e senza movimento: le stesse
          parole del viaggio, in ordine. Il 3D è progressive enhancement. */}
      <noscript>
        <div className="bufala-sezioni">
          {SCENES.map((s) => (
            <section key={s.id} className="bufala-sezione">
              <h2>{sceneCopy[s.id].titolo}</h2>
              {sceneCopy[s.id].nota && <p>{sceneCopy[s.id].nota}</p>}
            </section>
          ))}
        </div>
      </noscript>
    </>
  );
}
