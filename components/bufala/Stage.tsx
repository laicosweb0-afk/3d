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

/** Le scene coperte dal video, in ordine. Ciascuna dichiara quali secondi
 *  del filmato le appartengono (`tempo` in content/bufala/direction.ts):
 *  non è più una divisione in parti uguali, è una mappa. */
const sceneVideo = SCENES.filter((s) => regia[s.id].video);

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
      {sceneVideo.length > 0 && <Video mp4={clip.mp4} webm={clip.webm} poster={clip.poster} />}
    </div>
  );
}

/** La scena che *contiene* p — non quella di peso maggiore. La distanza e il
 *  tempo del filmato devono restare continui anche durante le dissolvenze:
 *  se si scegliesse la scena dominante, a metà dissolvenza scatterebbero
 *  entrambi. */
function scenaContenitrice(p: number) {
  for (const s of SCENES) {
    if (p <= sceneRange(s.id).p1) return s;
  }
  return SCENES[SCENES.length - 1];
}

/** Interpola dentro la scena contenitrice i valori dichiarati nella regia. */
function valori(p: number) {
  const s = scenaContenitrice(p);
  const r = regia[s.id];
  const t = smooth(localT(p, s.id));
  return {
    zoom: r.zoom[0] + (r.zoom[1] - r.zoom[0]) * t,
    luce: r.luce[0] + (r.luce[1] - r.luce[0]) * t,
    deriva: r.deriva ? r.deriva[0] + (r.deriva[1] - r.deriva[0]) * t : 0,
  };
}

/** L'istante del filmato che corrisponde a p, in secondi.
 *
 *  L'avanzamento dentro la scena è lineare per difetto: smorzare *ogni*
 *  scena farebbe rallentare e ripartire il gesto a ogni confine, senza
 *  motivo. Lo smorzamento si chiede scena per scena (`curva: 'dolce'`), e
 *  serve solo dove due scene vicine hanno velocità molto diverse — lì il
 *  gradino di velocità si vede, ed è quello che faceva "sobbalzare"
 *  l'ingresso della mozzarella.
 *
 *  Fuori dall'arco del video si restituisce l'estremo più vicino: prima
 *  dell'inizio il primo fotogramma, dopo la fine l'ultimo. */
function secondiVideo(p: number): number {
  const s = scenaContenitrice(p);
  const r = regia[s.id];
  if (r.tempo) {
    const grezzo = localT(p, s.id);
    const t = r.curva === 'dolce' ? smooth(grezzo) : grezzo;
    return r.tempo[0] + (r.tempo[1] - r.tempo[0]) * t;
  }
  const primo = sceneVideo[0];
  const ultimo = sceneVideo[sceneVideo.length - 1];
  if (!primo) return 0;
  return p < sceneRange(primo.id).p0
    ? (regia[primo.id].tempo?.[0] ?? 0)
    : (regia[ultimo.id].tempo?.[1] ?? 0);
}

Stage.render = function render(p: number): void {
  const { zoom, luce, deriva } = valori(p);

  // Il peso di ciascuna immagine è la somma dei pesi delle scene che la
  // usano: se due scene consecutive condividono l'inquadratura, lo strato
  // resta pieno attraverso il confine invece di sfumare contro sé stesso.
  //
  // Contano solo le scene *senza* video. Una scena col video dichiara
  // comunque un'immagine (le serve da ripiego), ma quell'immagine non deve
  // pesare qui: se pesasse, e se un'altra scena la montasse davvero, la
  // foto ferma resterebbe disegnata sotto al filmato. Finché il video è
  // pieno non si nota; appena la sua opacità scende — in dissolvenza o
  // quando `luce` è sotto 1 — riaffiora come una seconda mozzarella
  // fantasma dietro quella vera. È esattamente il difetto visto in
  // anteprima all'ingresso del video.
  const pesi = new Map<Chiave, number>();
  for (const s of SCENES) {
    if (regia[s.id].video) continue;
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

  // Il video: ogni scena dell'arco possiede i propri secondi di filmato, e
  // il fotogramma è la posizione dentro quelli. Scene consecutive con
  // intervalli combacianti fanno scorrere il gesto senza interruzioni
  // attraverso i confini.
  if (!sceneVideo.length) return;
  const peso = sceneVideo.reduce((acc, s) => acc + sceneWeight(p, s.id), 0);
  Video.render(secondiVideo(p), Math.min(peso, 1) * luce, trasforma);
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
