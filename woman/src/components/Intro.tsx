import { useEffect, useState } from 'react';
import { WomanLogo } from './WomanLogo';
import { pronto, sblocca, spruzzo } from '../lib/suono';

/** Il file dello sprite, servito anche da una sottocartella. */
const CONIGLIO = import.meta.env.BASE_URL + 'coniglio.png';

/**
 * L'apertura, in tre tempi.
 *
 *   1. Il buio. Lo sfondo scuro con i suoi aloni, e nient'altro.
 *   2. **Il Bianconiglio** che lo attraversa di corsa, da sinistra a destra.
 *   3. «Hey.» — e poi «Hai sentito il profumo?».
 *
 * L'ordine conta: il coniglio arriva quando non c'è ancora niente da
 * leggere, e se ne va lasciando lo schermo pronto per la frase. Se passasse
 * mentre c'è scritto qualcosa, si guarderebbero due cose insieme e non se ne
 * ricorderebbe nessuna.
 *
 * La sequenza non parte finché lo sprite non è scaricato — sono 351 KB, e su
 * una riga di rete lenta partirebbe a vuoto, con lo schermo nero e il
 * coniglio che compare a metà corsa. Se dopo un secondo e mezzo non è
 * arrivato si va avanti lo stesso: meglio un'apertura senza coniglio che una
 * card che non si apre.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const [avviato, setAvviato] = useState(false);
  const [corsa, setCorsa] = useState(false);
  const [hey, setHey] = useState<'' | 'show' | 'hide' | 'via'>('');
  const [marchio, setMarchio] = useState(false);
  const [domanda, setDomanda] = useState<'' | 'show' | 'hide'>('');
  const [uscita, setUscita] = useState(false);

  /* Primo tempo: aspettare lo sprite, ma non all'infinito. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFine();
      return;
    }
    let fatto = false;
    const via = () => { if (!fatto) { fatto = true; setAvviato(true); } };
    const img = new Image();
    img.onload = via;
    img.onerror = via;      // niente coniglio, ma l'apertura va avanti
    img.src = CONIGLIO;
    if (img.complete) via();
    const sicurezza = setTimeout(via, 1500);
    return () => clearTimeout(sicurezza);
  }, [onFine]);

  /* Secondo e terzo tempo: la corsa, poi le parole. */
  useEffect(() => {
    if (!avviato) return;
    const t = [
      setTimeout(() => setCorsa(true), 150),
      // la traversata dura 1200ms: il «Hey» aspetta che sia uscito di scena
      setTimeout(() => setHey('show'), 1500),
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
  }, [avviato, onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia && marchio) spruzzo(); }}
    >
      {corsa && !marchio && (
        <div className="coniglio-pista" aria-hidden>
          <div className="coniglio" />
        </div>
      )}
      {marchio && (
        <span className="intro-marchio show">
          <WomanLogo size={30} variante="chiaro" />
        </span>
      )}
      {hey !== 'via' && <span className={`intro-parola ${hey}`}>Hey.</span>}
      <span className={`intro-parola intro-domanda ${domanda}`}>
        Hai sentito<br />il profumo?
      </span>
    </div>
  );
}
