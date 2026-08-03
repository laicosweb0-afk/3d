'use client';

// Il video legato allo scroll: è questo che dà la sensazione di "3D".
//
// Non c'è nessun 3D vero. Il video non parte e non si ferma da solo: il suo
// fotogramma è funzione dello scroll, esattamente come tutto il resto del
// viaggio. Scorri e la mozzarella si apre, torni indietro e si richiude —
// il visitatore comanda il gesto invece di guardarlo. È la stessa tecnica
// dei siti prodotto Apple, ed è più affidabile del 3D in tempo reale su un
// oggetto bianco e traslucido, che è il caso peggiore per un motore WebGL.
//
// Vincoli pratici che il file video deve rispettare:
//  - camera ferma nella ripresa, altrimenti il movimento legato allo scroll
//    sembra un difetto invece di una regia;
//  - codifica con molti fotogrammi chiave, altrimenti saltare a un istante
//    qualsiasi costa troppo e lo scrub singhiozza (vedi tools/bufala-video.mjs).

import { useEffect, useRef } from 'react';

const player = {
  el: null as HTMLVideoElement | null,
  pronto: false,
};

export interface VideoProps {
  src: string;
  /** Poster mostrato finché il video non è pronto: senza, il primo
   *  fotogramma resta nero e si vede lo stacco. */
  poster: string;
}

export function Video({ src, poster }: VideoProps) {
  const rif = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = rif.current;
    if (!v) return;
    player.el = v;

    const pronto = () => {
      player.pronto = true;
    };
    v.addEventListener('loadedmetadata', pronto);
    // Alcuni browser non emettono `loadedmetadata` se il video è già in
    // cache: se la durata c'è già, siamo pronti comunque.
    if (v.readyState >= 1) pronto();

    return () => {
      v.removeEventListener('loadedmetadata', pronto);
      player.el = null;
      player.pronto = false;
    };
  }, []);

  return (
    <video
      ref={rif}
      className="strato strato--video"
      src={src}
      poster={poster}
      muted
      playsInline
      preload="auto"
      // Mai `autoplay`: il video non deve mai avanzare da solo, il suo
      // tempo appartiene allo scroll.
      aria-hidden="true"
      style={{ opacity: 0 }}
    />
  );
}

/**
 * Porta il video al fotogramma corrispondente a `t` (0..1) e ne imposta
 * l'opacità. Chiamata dallo stesso loop del viaggio.
 */
Video.render = function render(t: number, opacita: number): void {
  const v = player.el;
  if (!v) return;

  v.style.opacity = opacita.toFixed(3);
  v.style.visibility = opacita < 0.005 ? 'hidden' : 'visible';
  if (!player.pronto || !Number.isFinite(v.duration)) return;

  // Un margine dalla fine: alcuni browser, se si chiede esattamente
  // `duration`, riportano il video a zero invece di restare sull'ultimo
  // fotogramma — e il salto si vede.
  const target = Math.min(Math.max(t, 0), 0.999) * v.duration;

  // Si scrive solo se lo scarto conta: assegnare `currentTime` a ogni frame
  // anche per differenze invisibili fa lavorare il decoder a vuoto e sui
  // portatili si sente.
  if (Math.abs(v.currentTime - target) > 1 / 60) {
    v.currentTime = target;
  }
};
