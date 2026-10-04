import { useEffect, useState } from 'react';
import { commutaSilenzio, osservaSilenzio, silenziato } from '../lib/suono';

/**
 * Il silenziatore: in alto a destra, tenue, fuori dal percorso. I suoni —
 * gli scatti della ruota, il conteggio del credito — ci sono perché in
 * negozio fanno la differenza, ma non devono mai essere una sorpresa da cui
 * si scappa.
 */
export function MuteButton() {
  const [muto, setMuto] = useState(silenziato());
  useEffect(() => osservaSilenzio(setMuto), []);

  return (
    <button
      type="button"
      onClick={() => commutaSilenzio()}
      aria-label={muto ? 'Riattiva i suoni' : 'Silenzia i suoni'}
      aria-pressed={muto}
      // In alto a destra, in vetro come i bottoni sopra le foto: in basso
      // c'è la barra della vetrina, e due cose che galleggiano nello stesso
      // angolo si pestano i piedi.
      style={{
        position: 'fixed', right: 16,
        top: 'calc(18px + env(safe-area-inset-top, 0px))',
        width: 32, height: 32, borderRadius: '50%',
        border: '1px solid rgba(242,235,221,.08)',
        background: 'rgba(33,27,23,.72)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        color: '#EDE7DD', opacity: 0.7, zIndex: 20, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 7.6h2.6L10.4 4v12L6.6 12.4H4a1 1 0 0 1-1-1V8.6a1 1 0 0 1 1-1Z"
          fill="currentColor" />
        {muto
          ? <path d="M13.6 7.6l3.8 4.8M17.4 7.6l-3.8 4.8" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" />
          : <path d="M13.4 7.4a3.6 3.6 0 0 1 0 5.2" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" />}
      </svg>
    </button>
  );
}
