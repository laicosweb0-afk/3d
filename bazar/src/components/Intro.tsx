import { useEffect, useState } from 'react';
import { Arco, BazarLogo } from './BazarLogo';
import { campanello, pronto, sblocca } from '../lib/suono';

/**
 * L'apertura, in tre tempi.
 *
 *   1. Il buio caldo, e **l'arco** d'oro che si disegna da sé: la porta del
 *      bazar.
 *   2. «Marhaba.» — benvenuto, nella lingua di Marrakech.
 *   3. Il marchio, e «Benvenuto nel Bazar.».
 *
 * L'ordine conta come nella card Woman: prima si guarda, poi si legge. L'arco
 * finisce di tracciarsi prima che compaia la prima parola, e sparisce prima
 * della frase: due cose insieme a schermo non se le ricorda nessuno.
 *
 * L'arco è un SVG dentro il codice, non un'immagine: non c'è niente da
 * aspettare che si scarichi, e la sequenza parte subito.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const [arco, setArco] = useState<'' | 'show' | 'via'>('');
  const [ciao, setCiao] = useState<'' | 'show' | 'hide' | 'via'>('');
  const [marchio, setMarchio] = useState(false);
  const [frase, setFrase] = useState<'' | 'show' | 'hide'>('');
  const [uscita, setUscita] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFine();
      return;
    }
    const t = [
      setTimeout(() => setArco('show'), 150),
      // l'arco si traccia in 1300ms: la parola aspetta che sia chiuso
      setTimeout(() => setArco('via'), 1500),
      setTimeout(() => setCiao('show'), 1750),
      setTimeout(() => setCiao('hide'), 2850),
      setTimeout(() => {
        setCiao('via'); setMarchio(true); setFrase('show');
        // Suona solo se qualcuno ha già toccato lo schermo: prima di un
        // gesto iOS non lascia svegliare l'audio.
        if (pronto()) campanello();
      }, 3150),
      setTimeout(() => setFrase('hide'), 4900),
      setTimeout(() => setUscita(true), 5200),
      setTimeout(onFine, 5800),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia && marchio) campanello(); }}
    >
      {arco && <Arco className={`intro-arco ${arco}`} traccia />}
      {marchio && (
        <span className="intro-marchio show">
          <BazarLogo size={30} variante="chiaro" />
        </span>
      )}
      {ciao !== 'via' && <span className={`intro-parola ${ciao}`}>Marhaba.</span>}
      <span className={`intro-parola intro-domanda ${frase}`}>
        Benvenuto<br />nel Bazar.
      </span>
    </div>
  );
}
