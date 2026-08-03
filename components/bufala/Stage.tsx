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

import { useEffect, useMemo } from 'react';
import {
  SCENES, localT, sceneWeight, smooth, sceneRange,
} from '@/lib/bufala/scenes';
import { regia } from '@/content/bufala/direction';
import { immagini, video as clip } from '@/content/bufala/assets';
import { Video } from './Video';

type Chiave = keyof typeof immagini;

const palco = {
  strati: new Map<Chiave, HTMLDivElement>(),
};

/** Le scene coperte dal video, in ordine: formano un unico arco continuo
 *  su cui si distribuiscono i 15 secondi del filmato. */
const sceneVideo = SCENES.filter((s) => regia[s.id].video);

/** L'intervallo di scroll occupato dal video. */
const arcoVideo = sceneVideo.length
  ? {
      p0: sceneRange(sceneVideo[0].id).p0,
      p1: sceneRange(sceneVideo[sceneVideo.length - 1].id).p1,
    }
  : null;

/** Le immagini da montare: quelle delle scene *senza* video. Nelle scene
 *  coperte dal filmato l'immagine non si vede mai, e montarla costerebbe
 *  un download inutile. */
const chiaviUsate = Array.from(
  new Set(SCENES.filter((s) => !regia[s.id].video).map((s) => regia[s.id].immagine)),
) as Chiave[];

export function Stage() {
  const rifs = useMemo(
    () => new Map<Chiave, React.RefObject<HTMLDivElement | null>>(
      chiaviUsate.map((k) => [k, { current: null }]),
    ),
    [],
  );

  useEffect(() => {
    for (const [k, r] of rifs) if (r.current) palco.strati.set(k, r.current);
    return () => {
      palco.strati.clear();
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
          className={immagini[k].adatta === 'contain' ? 'strato strato--intero' : 'strato'}
          style={{
            backgroundImage: `url(${immagini[k].src})`,
            backgroundSize: immagini[k].adatta ?? 'cover',
            opacity: 0,
          }}
        />
      ))}
      {arcoVideo && <Video webm={clip.webm} mp4={clip.mp4} poster={clip.poster} />}
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

  const trasforma =
    `translate3d(0, ${(deriva * 100).toFixed(2)}vh, 0) scale(${zoom.toFixed(3)})`;

  for (const [k, el] of palco.strati) {
    const w = Math.min(pesi.get(k) ?? 0, 1);
    el.style.opacity = (w * luce).toFixed(3);
    el.style.transform = trasforma;
    el.style.visibility = w < 0.005 ? 'hidden' : 'visible';
  }

  // Il video occupa l'arco delle scene che lo dichiarano: il suo tempo è
  // la posizione dentro quell'arco, non dentro la singola scena — così i
  // 15 secondi scorrono continui attraverso i confini invece di ripartire
  // da capo a ogni scena.
  if (!arcoVideo) return;
  const peso = sceneVideo.reduce((acc, s) => acc + sceneWeight(p, s.id), 0);
  Video.render(
    (p - arcoVideo.p0) / (arcoVideo.p1 - arcoVideo.p0),
    Math.min(peso, 1) * luce,
    trasforma,
  );
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
