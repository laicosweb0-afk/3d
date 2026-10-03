import { useEffect, useState } from 'react';
import { CargLogo } from './CargLogo';
import { pronto, sblocca, spruzzo } from '../lib/suono';

/**
 * L'apertura, in tre tempi.
 *
 *   1. Il buio.
 *   2. **Un'auto che passa**: due fasci di luce che tagliano lo schermo da
 *      sinistra a destra, con la scia dietro.
 *   3. «Hey.» — e poi «Da quanto non fai il tagliando?».
 *
 * Su Woman qui correva il Bianconiglio, che era uno sprite da 351 KB. Il
 * passaggio dei fari è disegnato in CSS e pesa zero: non c'è un file da
 * aspettare, quindi la sequenza parte subito e non serve la rete.
 *
 * I fari e non la sagoma di un'auto, per due motivi. Di notte di un'auto che
 * passa si vedono quelli, non la carrozzeria — e un'auto disegnata male si
 * riconosce subito, mentre una luce fatta bene no. E poi il notturno è
 * esattamente quello che Car.G vende e gli altri in zona non hanno.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const [corsa, setCorsa] = useState(false);
  const [hey, setHey] = useState<'' | 'show' | 'hide' | 'via'>('');
  const [marchio, setMarchio] = useState(false);
  const [domanda, setDomanda] = useState<'' | 'show' | 'hide'>('');
  const [uscita, setUscita] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFine();
      return;
    }
    const t = [
      setTimeout(() => setCorsa(true), 150),
      // il passaggio dura 1100ms: il «Hey» aspetta che sia uscito di scena
      setTimeout(() => setHey('show'), 1450),
      setTimeout(() => setHey('hide'), 2600),
      setTimeout(() => {
        setHey('via'); setMarchio(true); setDomanda('show');
        // Suona solo se qualcuno ha già toccato lo schermo: prima di un
        // gesto iOS non lascia svegliare l'audio.
        if (pronto()) spruzzo();
      }, 2900),
      setTimeout(() => setDomanda('hide'), 4650),
      setTimeout(() => setUscita(true), 4950),
      setTimeout(onFine, 5550),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia && marchio) spruzzo(); }}
    >
      {corsa && !marchio && (
        <div className="passaggio" aria-hidden>
          <span className="faro faro-alto" />
          <span className="faro faro-basso" />
        </div>
      )}
      {marchio && (
        <span className="intro-marchio show">
          <CargLogo size={46} />
        </span>
      )}
      {hey !== 'via' && <span className={`intro-parola ${hey}`}>Hey.</span>}
      <span className={`intro-parola intro-domanda ${domanda}`}>
        Da quanto non<br />fai il tagliando?
      </span>
    </div>
  );
}
