'use client';

// Il palco: ciò che si vede dietro i testi. Resta fisso mentre lo spacer
// scorre, ed è l'unico punto in cui entreranno gli asset del prodotto.
//
// Stato dello scaffold: nessun asset è ancora stato generato, quindi il palco
// disegna un segnaposto procedurale — una sorgente di luce che si avvicina
// con lo scroll. Serve a validare il ritmo e le dissolvenze prima di spendere
// crediti in immagini (SCALETTA_BUFALA.md §7).
//
// Quando gli asset arriveranno, `render(p)` è il solo punto da cambiare:
// che sotto ci sia una sequenza di immagini o un modello 3D, il resto del
// sistema non se ne accorge.

import { useEffect, useRef } from 'react';
import { SCENES, localT, sceneWeight, smooth } from '@/lib/bufala/scenes';

/** Riferimento al palco vivo, condiviso col loop di Journey. */
const palco = { el: null as HTMLDivElement | null, luce: null as HTMLDivElement | null };

export function Stage() {
  const ref = useRef<HTMLDivElement>(null);
  const luceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    palco.el = ref.current;
    palco.luce = luceRef.current;
    return () => {
      palco.el = null;
      palco.luce = null;
    };
  }, []);

  return (
    <div ref={ref} className="bufala-stage" aria-hidden="true">
      <div
        ref={luceRef}
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(closest-side, rgb(246 241 228 / 0.16), transparent 70%)',
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
}

/**
 * Aggiorna il palco per un dato progresso. Chiamata a ogni frame dal loop di
 * Journey — non fa lavoro di layout, solo transform e opacità.
 */
Stage.render = function render(p: number): void {
  const luce = palco.luce;
  if (!luce) return;

  // L'avvicinamento del viaggio (SCALETTA §1): la luce cresce dall'apertura
  // al taglio, poi si ritira nel congedo.
  const avvicinamento = smooth(Math.min(p / 0.62, 1));
  const congedo = smooth(Math.max((p - 0.86) / 0.14, 0));

  const scala = 0.55 + avvicinamento * 1.15;
  const opacita = (0.35 + avvicinamento * 0.65) * (1 - congedo * 0.85);

  luce.style.transform = `scale(${scala.toFixed(3)})`;
  luce.style.opacity = opacita.toFixed(3);
};

/** Esposto per debug/QA: quale scena e quanto pesa a un dato p. */
export function statoScene(p: number) {
  return SCENES.map((s) => ({
    id: s.id,
    titolo: s.titolo,
    t: Number(localT(p, s.id).toFixed(3)),
    peso: Number(sceneWeight(p, s.id).toFixed(3)),
  }));
}
