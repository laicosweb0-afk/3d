import { useEffect, useState } from 'react';
import { RamaLogo } from './RamaLogo';

/**
 * L'apertura: "Hey." e poi "Benvenuto da Rama Ceramiche!", com'era nella
 * prima versione. Tempi, curve e dimensioni sono quelli originali, non
 * un'approssimazione: la sequenza era già stata approvata così.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const [hey, setHey] = useState<'' | 'show' | 'hide' | 'via'>('');
  const [marchio, setMarchio] = useState(false);
  const [benvenuto, setBenvenuto] = useState<'' | 'show' | 'hide'>('');
  const [uscita, setUscita] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFine();
      return;
    }
    const t = [
      setTimeout(() => setHey('show'), 1000),
      setTimeout(() => setHey('hide'), 2350),
      setTimeout(() => { setHey('via'); setMarchio(true); setBenvenuto('show'); }, 2650),
      setTimeout(() => setBenvenuto('hide'), 4400),
      setTimeout(() => setUscita(true), 4700),
      setTimeout(onFine, 5300),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div className={`intro${uscita ? ' leaving' : ''}`} aria-hidden>
      {/* Monta già visibile: la dissolvenza del contenitore sopra le
          piastrelle che si posano faceva due sfumature sovrapposte. */}
      {marchio && (
        <span className="intro-marchio show">
          <RamaLogo size={46} animato />
        </span>
      )}
      {hey !== 'via' && <span className={`intro-parola ${hey}`}>Hey.</span>}
      <span className={`intro-parola intro-benvenuto ${benvenuto}`}>
        Benvenuto da<br />Rama Ceramiche!
      </span>
    </div>
  );
}
