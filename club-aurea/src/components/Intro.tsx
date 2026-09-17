import { useEffect, useState } from 'react';
import { AureaLogo } from './AureaLogo';
import { pronto, sblocca, spruzzo } from '../lib/suono';

/**
 * L'apertura, la stessa sequenza in due tempi di Club Rama: prima "Hey.", poi
 * la domanda. Lì era un benvenuto, qui è l'unica domanda che conta quando uno
 * è appena entrato in profumeria — hai sentito il profumo?
 *
 * Sotto, l'alone di magenta che si allarga: è il profumo che si diffonde
 * nella stanza, ed è l'unico movimento della schermata.
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
        // Suona solo se qualcuno ha già toccato lo schermo: prima di un
        // gesto iOS non lascia svegliare l'audio, e lo spruzzo andrebbe
        // sprecato nel silenzio.
        if (pronto()) spruzzo();
      }, 2650),
      setTimeout(() => setDomanda('hide'), 4600),
      setTimeout(() => setUscita(true), 4900),
      setTimeout(onFine, 5500),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      // Un dito appoggiato sullo schermo durante l'apertura basta a
      // sbloccare l'audio: chi tocca, sente.
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia && marchio) spruzzo(); }}
    >
      <span className={`intro-alone${marchio ? ' show' : ''}`} />

      {/* Monta già visibile: la dissolvenza del contenitore sopra il flacone
          che si compone faceva due sfumature sovrapposte. */}
      {marchio && (
        <span className="intro-marchio show">
          <AureaLogo size={48} variant="magenta" animato />
        </span>
      )}
      {hey !== 'via' && <span className={`intro-parola ${hey}`}>Hey.</span>}
      <span className={`intro-parola intro-domanda ${domanda}`}>
        Hai sentito<br />il profumo?
      </span>
    </div>
  );
}
