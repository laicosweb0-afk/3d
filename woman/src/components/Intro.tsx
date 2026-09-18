import { useEffect, useState } from 'react';
import { WomanLogo } from './WomanLogo';
import { pronto, sblocca, spruzzo } from '../lib/suono';

/**
 * L'apertura: «Hey.» e poi la domanda, sul fondo scuro con gli aloni di
 * colore — la stessa luce della prima schermata, così il passaggio non si
 * vede. Tempi e curve sono quelli approvati: 1000, 2350, 2650, 4400, 4700,
 * 5300.
 */
export function Intro({ onFine }: { onFine: () => void }) {
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
      setTimeout(() => setHey('show'), 1000),
      setTimeout(() => setHey('hide'), 2350),
      setTimeout(() => {
        setHey('via'); setMarchio(true); setDomanda('show');
        if (pronto()) spruzzo();
      }, 2650),
      setTimeout(() => setDomanda('hide'), 4400),
      setTimeout(() => setUscita(true), 4700),
      setTimeout(onFine, 5300),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia && marchio) spruzzo(); }}
    >
      {marchio && (
        <span className="intro-marchio show">
          <WomanLogo size={22} variante="chiaro" coda animato />
        </span>
      )}
      {hey !== 'via' && <span className={`intro-parola ${hey}`}>Hey.</span>}
      <span className={`intro-parola intro-domanda ${domanda}`}>
        Hai sentito<br />il profumo?
      </span>
    </div>
  );
}
