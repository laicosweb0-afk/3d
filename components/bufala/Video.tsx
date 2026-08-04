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
import { SCENES } from '@/lib/bufala/scenes';
import { regia } from '@/content/bufala/direction';

const player = {
  el: null as HTMLVideoElement | null,
  pronto: false,
};

export interface VideoProps {
  /** MP4/H.264, PRIMA sorgente: decodifica hardware su ogni dispositivo
   *  vero. L'ordine è la cura del singhiozzo sui tablet Android economici,
   *  che col WebM davanti finivano sul decodificatore VP9 software. */
  mp4: string;
  /** WebM/VP9, riserva: serve solo ai Chromium open-source senza codec
   *  proprietari (fra cui il banco di prova di questo progetto). */
  webm: string;
  /** Poster mostrato finché il video non è pronto: senza, il primo
   *  fotogramma resta nero e si vede lo stacco. */
  poster: string;
}

export function Video({ mp4, webm, poster }: VideoProps) {
  const rif = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = rif.current;
    if (!v) return;
    player.el = v;

    const pronto = () => {
      player.pronto = true;
    };
    v.addEventListener('loadedmetadata', pronto);
    v.addEventListener('loadeddata', pronto);
    v.addEventListener('canplay', pronto);
    // Alcuni browser non emettono `loadedmetadata` se il video è già in
    // cache: se la durata c'è già, siamo pronti comunque.
    if (v.readyState >= 1) pronto();

    // Lo sblocco per iPhone.
    //
    // Safari su iOS non scarica un video finché l'utente non ha interagito
    // con la pagina, e su rete cellulare lo fa ancora meno: `preload="auto"`
    // viene semplicemente ignorato. Il risultato è che i metadati non
    // arrivano mai, la durata resta NaN, `render` esce subito e il filmato
    // non si muove di un fotogramma — chi guarda vede solo il poster e
    // conclude, giustamente, che il video non c'è.
    //
    // Un play seguito subito da un pause al primo tocco autorizza l'elemento
    // a scaricare e a spostarsi nel tempo. Il video non parte davvero: viene
    // fermato nello stesso istante, e da lì in poi il suo tempo torna a
    // essere solo lo scroll. È muto e `playsInline`, quindi iOS lo consente
    // senza chiedere niente e senza aprire il lettore a tutto schermo.
    const sblocca = () => {
      v.load();
      const avvio = v.play();
      if (avvio && typeof avvio.then === 'function') {
        avvio.then(() => v.pause()).catch(() => {});
      } else {
        v.pause();
      }
    };
    const opzioni = { once: true, passive: true } as const;
    window.addEventListener('touchstart', sblocca, opzioni);
    window.addEventListener('pointerdown', sblocca, opzioni);
    window.addEventListener('scroll', sblocca, opzioni);

    return () => {
      v.removeEventListener('loadedmetadata', pronto);
      v.removeEventListener('loadeddata', pronto);
      v.removeEventListener('canplay', pronto);
      window.removeEventListener('touchstart', sblocca);
      window.removeEventListener('pointerdown', sblocca);
      window.removeEventListener('scroll', sblocca);
      player.el = null;
      player.pronto = false;
    };
  }, []);

  return (
    <video
      ref={rif}
      className="strato strato--video"
      poster={poster}
      muted
      playsInline
      preload="auto"
      // Mai `autoplay`: il video non deve mai avanzare da solo, il suo
      // tempo appartiene allo scroll.
      aria-hidden="true"
      // Parte già alla luce che avrà a inizio viaggio (la `luce` iniziale
      // della prima scena in direction.ts), non a zero: così il primo
      // fotogramma — o il poster, finché il filmato non è pronto — si vede
      // anche prima che il JavaScript prenda il comando, e quando lo prende
      // non c'è nessuno scatto di luminosità.
      style={{ opacity: regia[SCENES[0].id].luce[0] }}
    >
      <source src={mp4} type="video/mp4" />
      <source src={webm} type="video/webm" />
    </video>
  );
}

/**
 * Porta il video al secondo indicato e ne imposta opacità e trasformazione.
 * Chiamata dallo stesso loop del viaggio, con la stessa trasformazione degli
 * strati immagine: così la camera del sito e quella del filmato restano lo
 * stesso movimento.
 *
 * `secondi` è un istante assoluto del filmato, non una frazione: gli istanti
 * li dichiara la regia (content/bufala/direction.ts), che ragiona in secondi
 * perché è in secondi che si guarda un video e si decide dove mettere un
 * titolo.
 */
Video.render = function render(secondi: number, opacita: number, trasforma: string): void {
  const v = player.el;
  if (!v) return;

  v.style.opacity = opacita.toFixed(3);
  v.style.transform = trasforma;
  v.style.visibility = opacita < 0.005 ? 'hidden' : 'visible';
  if (!player.pronto || !Number.isFinite(v.duration)) return;

  // Un margine dalla fine: alcuni browser, se si chiede esattamente
  // `duration`, riportano il video a zero invece di restare sull'ultimo
  // fotogramma — e il salto si vede.
  const target = Math.min(Math.max(secondi, 0), v.duration - 0.05);

  // Si scrive solo se lo scarto conta: assegnare `currentTime` a ogni frame
  // anche per differenze invisibili fa lavorare il decoder a vuoto e sui
  // portatili si sente.
  if (Math.abs(v.currentTime - target) > 1 / 60) {
    v.currentTime = target;
  }
};
