import { useEffect, useState } from 'react';
import { APERTURA, OFFICINA } from '../config/gioco';
import { CargLogo } from './CargLogo';
import { pronto, sblocca, spruzzo } from '../lib/suono';

/**
 * L'apertura, in due tempi — la cadenza di Woman e di Club Rama.
 *
 *   1. «Hey.» — grande, al centro, da solo.
 *   2. «Un minuto / per la tua auto.», con la firma sotto.
 *
 * Il saluto non è un vezzo: senza, le due righe entrano su uno schermo nero
 * e vuoto, e nel mezzo secondo prima che arrivino la card sembra ancora da
 * caricare. «Hey.» riempie quel vuoto con una cosa che si legge in un
 * istante, e soprattutto dà il tempo di guardare lo schermo prima che ci
 * sia scritto qualcosa che conta.
 *
 * Il saluto esce **prima** che entri la frase, non insieme: due testi che si
 * dissolvono uno nell'altro al centro dello schermo si leggono male tutti e
 * due.
 *
 * Niente filmato: è tutto testo, quindi zero byte da scaricare e la
 * sequenza parte nell'istante in cui la pagina si apre.
 */
export function Intro({ onFine }: { onFine: () => void }) {
  const [saluto, setSaluto] = useState<'' | 'show' | 'hide' | 'via'>('');
  const [fase, setFase] = useState(0);
  const [uscita, setUscita] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFine();
      return;
    }
    const t = [
      setTimeout(() => setSaluto('show'), 200),
      setTimeout(() => setSaluto('hide'), 1400),
      setTimeout(() => { setSaluto('via'); setFase(1); }, 1750),
      setTimeout(() => setFase(2), 1890),
      setTimeout(() => {
        setFase(3);
        // Suona solo se qualcuno ha già toccato lo schermo: prima di un
        // gesto iOS non lascia svegliare l'audio.
        if (pronto()) spruzzo();
      }, 2150),
      setTimeout(() => setUscita(true), 3900),
      setTimeout(onFine, 4400),
    ];
    return () => t.forEach(clearTimeout);
  }, [onFine]);

  return (
    <div
      className={`intro${uscita ? ' leaving' : ''}`}
      aria-hidden
      onPointerDown={() => { const gia = pronto(); sblocca(); if (!gia) spruzzo(); }}
    >
      {saluto !== 'via' && (
        <span className={`intro-parola ${saluto}`}>{APERTURA.saluto}</span>
      )}

      {saluto === 'via' && (
        <p className="apertura-titolo">
          <span className={`apertura-riga${fase >= 1 ? ' dentro' : ''}`}>
            {APERTURA.riga1}
          </span>
          <span className={`apertura-riga apertura-riga-blu${fase >= 2 ? ' dentro' : ''}`}>
            {APERTURA.riga2}
          </span>
        </p>
      )}

      {/* La firma in basso, come nella creative: marchio e nome in
          maiuscoletto spaziato, piccoli, fuori dal campo del titolo. */}
      <span className={`apertura-firma${fase >= 3 ? ' dentro' : ''}`}>
        <CargLogo size={24} />
        {OFFICINA.nome}
      </span>
    </div>
  );
}
