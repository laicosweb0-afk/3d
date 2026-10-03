import { useEffect, useState } from 'react';
import { BazarLogo } from './BazarLogo';
import { campanello, pronto, sblocca } from '../lib/suono';

/**
 * L'apertura, in tre tempi.
 *
 *   1. Il nero del biglietto da visita, e **il filo d'oro** che si apre dal
 *      centro verso i due capi: lo stesso filo che sul biglietto separa
 *      BAZAR da MARRAKECH.
 *   2. «Marhaba.» — benvenuto, nella lingua di Marrakech.
 *   3. Il fronte del biglietto, com'è stampato — BAZAR, il filo, MARRAKECH,
 *      SHOWROOM ARREDAMENTO · LUGO — e sotto «Benvenuto nel Bazar.».
 *
 * Prima si guarda, poi si legge: il filo finisce di aprirsi prima che
 * compaia la prima parola, e se ne va prima della frase.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const [filo, setFilo] = useState<'' | 'show' | 'via'>('');
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
      setTimeout(() => setFilo('show'), 150),
      // il filo si apre in 1100ms: la parola aspetta che sia steso
      setTimeout(() => setFilo('via'), 1450),
      setTimeout(() => setCiao('show'), 1700),
      setTimeout(() => setCiao('hide'), 2800),
      setTimeout(() => {
        setCiao('via'); setMarchio(true); setFrase('show');
        // Suona solo se qualcuno ha già toccato lo schermo: prima di un
        // gesto iOS non lascia svegliare l'audio.
        if (pronto()) campanello();
      }, 3100),
      setTimeout(() => setFrase('hide'), 5000),
      setTimeout(() => setUscita(true), 5300),
      setTimeout(onFine, 5900),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia && marchio) campanello(); }}
    >
      {filo && <span className={`intro-filo ${filo}`} />}
      {marchio && (
        <span className="intro-marchio show">
          <BazarLogo size={17} esteso />
        </span>
      )}
      {ciao !== 'via' && <span className={`intro-parola ${ciao}`}>Marhaba.</span>}
      <span className={`intro-parola intro-domanda ${frase}`}>
        Benvenuto<br />nel Bazar.
      </span>
    </div>
  );
}
