'use client';

// L'apertura di LUGO CITY: il filmato che parte dalla Piazza dei Martiri
// vera e si trasforma nella sua versione a blocchi, fino al titolo.
//
// Regole di buona educazione, che sono anche quelle dei browser:
//  - parte muto, perché è l'unico modo per cui l'autoplay è permesso
//    ovunque; un tasto accende l'audio e la scelta resta per la sessione;
//  - si salta sempre, con un tasto ben visibile, con Esc o con Invio;
//  - se il video non si carica (rete lenta, formato non supportato) il
//    gioco parte lo stesso: l'intro non deve mai essere un muro.

import { useEffect, useRef, useState } from 'react';
import { asset } from '@/lib/asset';

const VISTA = 'lugo-intro-vista';

/** true se l'intro è già stata vista in questa scheda. */
export function introGiaVista(): boolean {
  try {
    return window.sessionStorage.getItem(VISTA) === '1';
  } catch {
    return false;
  }
}

export function Intro({ onFine }: { onFine: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [audio, setAudio] = useState(false);
  const [pronto, setPronto] = useState(false);
  const chiuso = useRef(false);

  const chiudi = () => {
    if (chiuso.current) return;
    chiuso.current = true;
    try {
      window.sessionStorage.setItem(VISTA, '1');
    } catch {
      // niente sessionStorage: pazienza, l'intro ricomparirà
    }
    onFine();
  };

  useEffect(() => {
    const v = video.current;
    if (v) {
      // l'autoplay muto è l'unico consentito senza un gesto dell'utente
      v.muted = true;
      void v.play().catch(() => setPronto(true));
    }
    // rete lenta o codec non supportato: dopo 20 s si entra comunque.
    // Con più <source> il browser non alza onError sul <video> finché non
    // ha esaurito la lista, quindi questo è l'unico salvagente affidabile.
    const salvagente = setTimeout(chiudi, 20000);
    const tasto = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        chiudi();
      }
    };
    window.addEventListener('keydown', tasto);
    return () => {
      clearTimeout(salvagente);
      window.removeEventListener('keydown', tasto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lugo-intro" data-hud="intro-video">
      {/* due formati: H.264 lo leggono tutti i browser d'uso comune, VP9
          copre le build senza codec proprietari. Se falliscono entrambi
          scatta onError sul <video> e si entra comunque nel gioco. */}
      <video
        ref={video}
        className="lugo-intro-video"
        poster={asset('/lugo/intro-copertina.jpg')}
        playsInline
        preload="auto"
        onEnded={chiudi}
        onError={chiudi}
        onCanPlay={() => setPronto(true)}
      >
        <source src={asset('/lugo/intro.webm')} type="video/webm" />
        <source src={asset('/lugo/intro.mp4')} type="video/mp4" />
      </video>
      <div className="lugo-intro-comandi">
        <button
          type="button"
          className="lugo-intro-audio"
          aria-label={audio ? 'Togli l’audio' : 'Attiva l’audio'}
          onClick={() => {
            const v = video.current;
            if (!v) return;
            v.muted = audio;
            setAudio(!audio);
            void v.play().catch(() => undefined);
          }}
        >
          {audio ? '🔊' : '🔇'}
        </button>
        <button type="button" className="lugo-intro-salta" data-hud="salta-intro" onClick={chiudi}>
          SALTA
        </button>
      </div>
      {!pronto && <div className="lugo-intro-attesa">Lugo City sta arrivando…</div>}
    </div>
  );
}
