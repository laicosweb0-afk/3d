import { useEffect, useState } from 'react';
import { AureaLogo } from './AureaLogo';
import { pronto, sblocca, spruzzo } from '../lib/suono';

/**
 * L'apertura: «Hey.» e poi la domanda. Tempi, curve e dimensioni sono quelli
 * di Club Rama, non un'approssimazione — 1000, 2350, 2650, 4400, 4700, 5300:
 * quella sequenza era già stata approvata così, e qui cambia solo la frase.
 *
 * Al posto del tintinnio c'è lo spruzzo del vaporizzatore: è l'unico suono
 * diverso di tutta l'app, e lo è perché un profumo non si annuncia con un
 * carillon.
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
      // Un dito appoggiato sullo schermo durante l'apertura basta a
      // sbloccare l'audio: chi tocca, sente.
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia && marchio) spruzzo(); }}
    >
      {/* Monta già visibile: la dissolvenza del contenitore sopra il flacone
          che si compone faceva due sfumature sovrapposte. */}
      {marchio && (
        <span className="intro-marchio show">
          <AureaLogo size={46} animato />
        </span>
      )}
      {hey !== 'via' && <span className={`intro-parola ${hey}`}>Hey.</span>}
      <span className={`intro-parola intro-domanda ${domanda}`}>
        Hai sentito<br />il profumo?
      </span>
    </div>
  );
}
