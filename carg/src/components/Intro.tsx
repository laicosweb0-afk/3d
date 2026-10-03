import { useEffect, useRef, useState } from 'react';
import { APERTURA } from '../config/gioco';
import { pronto, sblocca, spruzzo } from '../lib/suono';

/**
 * Due formati, e l'MP4 per primo.
 *
 * Il browser prende il primo che dice di saper leggere, e ne scarica uno
 * solo. L'MP4 (H.264) sta davanti perché è quello che serve a iOS, che è la
 * metà abbondante di chi avvicinerà il telefono; il WebM (VP9) copre i
 * Chromium compilati senza H.264 — fra cui quello con cui giriamo il
 * collaudo, che altrimenti non riuscirebbe a verificare l'apertura.
 */
const CLIP_MP4 = import.meta.env.BASE_URL + 'apertura.mp4';
const CLIP_WEBM = import.meta.env.BASE_URL + 'apertura.webm';

/**
 * L'apertura: il reveal del marchio, e sopra la frase.
 *
 * Il filmato dura cinque secondi — scintille nel buio, il neon che disegna
 * l'auto, gli attrezzi, il tondo che si compone e si accende — e la frase
 * entra a 3,9 s, cioè **mentre il marchio è già a schermo**, non dopo. Messa
 * in coda allungherebbe l'attesa di un secondo e mezzo buono: chi avvicina
 * il telefono al bancone non sta guardando un film, e ogni secondo prima
 * della prima schermata è un secondo in cui può rimettere il telefono in
 * tasca.
 *
 * Il filmato è muto e con `playsInline`: su iOS un video con audio non parte
 * da solo, e senza `playsInline` Safari lo aprirebbe a tutto schermo nel suo
 * player, mangiandosi la pagina.
 *
 * Se non parte — rete lenta, autoplay negato, formato rifiutato — non si
 * resta sul nero: dopo un secondo e mezzo la frase entra lo stesso. Meglio
 * un'apertura senza filmato che una card che non si apre.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [frase, setFrase] = useState<'' | 'show' | 'hide'>('');
  const [uscita, setUscita] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFine();
      return;
    }

    const v = video.current;
    // `play()` può essere rifiutata: non è un errore da propagare, è il
    // browser che dice di no. Il resto della sequenza va avanti comunque.
    v?.play().catch(() => {});

    const t = [
      setTimeout(() => { setFrase('show'); if (pronto()) spruzzo(); }, 3900),
      setTimeout(() => setFrase('hide'), 5900),
      setTimeout(() => setUscita(true), 6200),
      setTimeout(onFine, 6800),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia) spruzzo(); }}
    >
      <video
        ref={video} className="apertura-clip"
        muted playsInline autoPlay preload="auto"
      >
        <source src={CLIP_MP4} type="video/mp4" />
        <source src={CLIP_WEBM} type="video/webm" />
      </video>
      {/* Una velatura sotto: la frase cade sul riflesso, che è la zona più
          chiara del fotogramma, e senza questa perderebbe contrasto. */}
      <span className="apertura-velo" />
      <span className={`intro-parola apertura-frase ${frase}`}>
        {APERTURA.frase}
      </span>
    </div>
  );
}
