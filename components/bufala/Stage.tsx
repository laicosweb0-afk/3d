'use client';

// Il palco: ciò che si vede dietro i testi. Resta fisso mentre lo spacer
// scorre, ed è l'unico punto in cui entreranno gli asset del prodotto.
//
// Stato: nessun asset è ancora stato generato, quindi il soggetto è un
// segnaposto — una forma luminosa che obbedisce alla regia vera
// (content/bufala/direction.ts). Serve a validare ritmo, distanze e
// dissolvenze prima di spendere crediti in immagini.
//
// Quando gli asset arriveranno, cambia solo *cosa* viene disegnato: la
// regia, i tempi e il resto del sistema restano com'è.

import { useEffect, useRef } from 'react';
import { SCENES, localT, sceneWeight, smooth, span, sceneRange } from '@/lib/bufala/scenes';
import { regia, goccia } from '@/content/bufala/direction';

const palco = {
  soggetto: null as HTMLDivElement | null,
  goccia: null as HTMLDivElement | null,
};

export function Stage() {
  const soggetto = useRef<HTMLDivElement>(null);
  const drop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    palco.soggetto = soggetto.current;
    palco.goccia = drop.current;
    return () => {
      palco.soggetto = null;
      palco.goccia = null;
    };
  }, []);

  return (
    <div className="bufala-stage" aria-hidden="true">
      <div ref={soggetto} className="soggetto" />
      <div ref={drop} className="goccia" />
    </div>
  );
}

/** Interpola dentro la scena attiva i valori dichiarati nella regia. */
function valori(p: number) {
  // La scena "attiva" ai fini della regia è quella in cui p ricade davvero,
  // non quella col peso maggiore: la distanza deve essere continua anche
  // durante le dissolvenze incrociate, altrimenti la camera scatta.
  for (const s of SCENES) {
    const { p0, p1 } = sceneRange(s.id);
    if (p <= p1 || s.id === SCENES[SCENES.length - 1].id) {
      const r = regia[s.id];
      const t = smooth(localT(p, s.id));
      return {
        zoom: r.zoom[0] + (r.zoom[1] - r.zoom[0]) * t,
        luce: r.luce[0] + (r.luce[1] - r.luce[0]) * t,
        deriva: r.deriva ? r.deriva[0] + (r.deriva[1] - r.deriva[0]) * t : 0,
      };
    }
  }
  return { zoom: 1, luce: 1, deriva: 0 };
}

/**
 * Aggiorna il palco per un dato progresso. Chiamata a ogni frame dal loop
 * di Journey: solo transform e opacità, nessun lavoro di layout.
 */
Stage.render = function render(p: number): void {
  const sog = palco.soggetto;
  if (!sog) return;

  const { zoom, luce, deriva } = valori(p);
  sog.style.transform = `translate3d(0, ${(deriva * 100).toFixed(2)}vh, 0) scale(${zoom.toFixed(3)})`;
  sog.style.opacity = luce.toFixed(3);

  // La goccia: nasce in S01, resta sospesa, cade in S06.
  const g = palco.goccia;
  if (!g) return;
  const nascita = smooth(span(p, sceneRange('s01').p0, sceneRange('s01').p1 * 0.8));
  const cade = smooth(span(p, sceneRange('s06').p0, sceneRange('s06').p1));
  const y = goccia.nascita.da
    + (goccia.nascita.a - goccia.nascita.da) * nascita
    + (goccia.caduta - goccia.nascita.a) * cade;
  // Sparisce col congedo, come tutto il resto.
  const viva = 1 - smooth(span(p, sceneRange('s08').p0, sceneRange('s08').p1));
  g.style.transform = `translate3d(-50%, ${(y * 100).toFixed(2)}vh, 0)`;
  g.style.opacity = (nascita * viva * 0.9).toFixed(3);
};

/** Esposto per QA: cosa fa la regia a un dato p. */
export function statoScene(p: number) {
  return SCENES.map((s) => ({
    id: s.id,
    titolo: s.titolo,
    t: Number(localT(p, s.id).toFixed(3)),
    peso: Number(sceneWeight(p, s.id).toFixed(3)),
    nota: regia[s.id].nota,
  }));
}
