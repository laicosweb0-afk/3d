import { useEffect, useState } from 'react';
import { APERTURA, OFFICINA } from '../config/gioco';
import { CargLogo } from './CargLogo';
import { pronto, sblocca, spruzzo } from '../lib/suono';

/**
 * L'apertura: solo tipografia.
 *
 * Prima c'era il filmato del marchio. Era bello e non funzionava come
 * apertura di una card NFC: cinque secondi di film prima di poter toccare
 * qualcosa, mezzo megabyte da scaricare, e il sospetto — in chi ha appena
 * avvicinato il telefono al bancone — di essere finito dentro una pubblicità
 * invece che in uno strumento.
 *
 * Al suo posto l'impianto della creative di riferimento: titolo enorme e
 * nero al centro, la seconda riga nel colore del marchio, e la firma in
 * basso in maiuscoletto spaziato. Pesa zero byte, parte nell'istante in cui
 * la pagina si apre e dura **2,8 secondi** invece di 6,8.
 *
 * Le due righe entrano sfalsate di 140ms. Non è un vezzo: sfalsate si
 * leggono nell'ordine giusto, insieme si leggono come un blocco e la
 * seconda — che è quella colorata, quella che deve restare — si perde.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const [fase, setFase] = useState(0);
  const [uscita, setUscita] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFine();
      return;
    }
    const t = [
      setTimeout(() => setFase(1), 120),
      setTimeout(() => setFase(2), 260),
      setTimeout(() => { setFase(3); if (pronto()) spruzzo(); }, 520),
      setTimeout(() => setUscita(true), 2300),
      setTimeout(onFine, 2800),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia) spruzzo(); }}
    >
      <p className="apertura-titolo">
        <span className={`apertura-riga${fase >= 1 ? ' dentro' : ''}`}>
          {APERTURA.riga1}
        </span>
        <span className={`apertura-riga apertura-riga-blu${fase >= 2 ? ' dentro' : ''}`}>
          {APERTURA.riga2}
        </span>
      </p>

      {/* La firma in basso, come nella creative: marchio e nome in
          maiuscoletto spaziato, piccoli, fuori dal campo del titolo. */}
      <span className={`apertura-firma${fase >= 3 ? ' dentro' : ''}`}>
        <CargLogo size={24} />
        {OFFICINA.nome}
      </span>
    </div>
  );
}
