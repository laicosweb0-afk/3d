'use client';

// Il palco: le immagini del viaggio, dietro i testi. Resta fisso mentre lo
// spacer scorre.
//
// Ogni immagine distinta viene montata una volta sola e riusata da tutte le
// scene che la dichiarano (content/bufala/direction.ts): montarne una per
// scena significherebbe scaricare due volte lo stesso file, e far
// ricomparire un'immagine già vista è un mezzo di regia voluto.
//
// La distanza (`zoom`) è continua attraverso i confini di scena, così la
// camera non scatta mai; l'opacità invece incrocia, così le inquadrature si
// danno il cambio senza stacchi.

import { useEffect, useMemo, useRef } from 'react';
import {
  SCENES, localT, sceneWeight, smooth, span, sceneRange,
} from '@/lib/bufala/scenes';
import { regia, goccia } from '@/content/bufala/direction';
import { immagini } from '@/content/bufala/assets';

type Chiave = keyof typeof immagini;

const palco = {
  strati: new Map<Chiave, HTMLDivElement>(),
  goccia: null as HTMLDivElement | null,
};

/** Le immagini effettivamente usate, senza duplicati. */
const chiaviUsate = Array.from(
  new Set(SCENES.map((s) => regia[s.id].immagine)),
) as Chiave[];

export function Stage() {
  const drop = useRef<HTMLDivElement>(null);
  const rifs = useMemo(
    () => new Map<Chiave, React.RefObject<HTMLDivElement | null>>(
      chiaviUsate.map((k) => [k, { current: null }]),
    ),
    [],
  );

  useEffect(() => {
    for (const [k, r] of rifs) if (r.current) palco.strati.set(k, r.current);
    palco.goccia = drop.current;
    return () => {
      palco.strati.clear();
      palco.goccia = null;
    };
  }, [rifs]);

  return (
    <div className="bufala-stage" aria-hidden="true">
      {chiaviUsate.map((k) => (
        <div
          key={k}
          ref={(el) => {
            const r = rifs.get(k);
            if (r) r.current = el;
          }}
          className="strato"
          style={{
            backgroundImage: `url(${immagini[k].src})`,
            opacity: 0,
          }}
        />
      ))}
      <div ref={drop} className="goccia" />
    </div>
  );
}

/** Interpola dentro la scena in cui p ricade i valori dichiarati nella regia.
 *  Si usa la scena "contenitrice" e non quella di peso maggiore: la distanza
 *  deve restare continua anche durante le dissolvenze, altrimenti scatta. */
function valori(p: number) {
  for (const s of SCENES) {
    const { p1 } = sceneRange(s.id);
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

Stage.render = function render(p: number): void {
  const { zoom, luce, deriva } = valori(p);

  // Il peso di ciascuna immagine è la somma dei pesi delle scene che la
  // usano: se due scene consecutive condividono l'inquadratura, lo strato
  // resta pieno attraverso il confine invece di sfumare contro sé stesso.
  const pesi = new Map<Chiave, number>();
  for (const s of SCENES) {
    const k = regia[s.id].immagine;
    pesi.set(k, (pesi.get(k) ?? 0) + sceneWeight(p, s.id));
  }

  for (const [k, el] of palco.strati) {
    const w = Math.min(pesi.get(k) ?? 0, 1);
    el.style.opacity = (w * luce).toFixed(3);
    el.style.transform =
      `translate3d(0, ${(deriva * 100).toFixed(2)}vh, 0) scale(${zoom.toFixed(3)})`;
    el.style.visibility = w < 0.005 ? 'hidden' : 'visible';
  }

  const g = palco.goccia;
  if (!g) return;
  const nascita = smooth(span(p, sceneRange('s01').p0, sceneRange('s01').p1 * 0.8));
  const cade = smooth(span(p, sceneRange('s06').p0, sceneRange('s06').p1));
  const y = goccia.nascita.da
    + (goccia.nascita.a - goccia.nascita.da) * nascita
    + (goccia.caduta - goccia.nascita.a) * cade;
  const viva = 1 - smooth(span(p, sceneRange('s08').p0, sceneRange('s08').p1));
  g.style.transform = `translate3d(-50%, ${(y * 100).toFixed(2)}vh, 0)`;
  g.style.opacity = (nascita * viva * 0.85).toFixed(3);
};

/** Esposto per QA: cosa fa la regia a un dato p. */
export function statoScene(p: number) {
  return SCENES.map((s) => ({
    id: s.id,
    titolo: s.titolo,
    immagine: regia[s.id].immagine,
    t: Number(localT(p, s.id).toFixed(3)),
    peso: Number(sceneWeight(p, s.id).toFixed(3)),
  }));
}
