import { useEffect, useState } from 'react';
import { BazarLogo } from './BazarLogo';
import { campanello, pronto, sblocca } from '../lib/suono';

/**
 * L'apertura, in due tempi.
 *
 *   1. Il saluto: «Marhaba.» in oro e, subito sotto, «Benvenuto» — la stessa
 *      parola nelle due lingue, un blocco solo al centro dello schermo.
 *   2. Il marchio, da solo e al centro, che si compone come sul fronte del
 *      biglietto: BAZAR che si stringe, il filo d'oro che si apre dal centro,
 *      MARRAKECH, e per ultima la riga SHOWROOM ARREDAMENTO · LUGO.
 *
 * Il saluto se ne va prima che arrivi il marchio: due cose insieme a schermo
 * non se le ricorda nessuno.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const [saluto, setSaluto] = useState<'' | 'show' | 'hide' | 'via'>('');
  const [marchio, setMarchio] = useState(false);
  const [uscita, setUscita] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFine();
      return;
    }
    const t = [
      setTimeout(() => setSaluto('show'), 250),
      setTimeout(() => setSaluto('hide'), 2300),
      setTimeout(() => {
        setSaluto('via'); setMarchio(true);
        // Suona solo se qualcuno ha già toccato lo schermo: prima di un
        // gesto iOS non lascia svegliare l'audio.
        if (pronto()) campanello();
      }, 2750),
      // il marchio si compone in 1800ms, poi resta fermo un momento
      setTimeout(() => setUscita(true), 5600),
      setTimeout(onFine, 6200),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia && marchio) campanello(); }}
    >
      {saluto !== 'via' && (
        <span className={`intro-saluto ${saluto}`}>
          <span className="intro-marhaba">Marhaba.</span>
          <span className="intro-benvenuto">Benvenuto</span>
        </span>
      )}
      {marchio && (
        <span className="intro-marchio">
          <BazarLogo size={21} esteso composto />
        </span>
      )}
    </div>
  );
}
