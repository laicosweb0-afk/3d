import { useEffect, useState } from 'react';
import { commutaSilenzio, osservaSilenzio, silenziato } from '../lib/suono';

/**
 * Il silenziatore: in basso a destra, tenue, fuori dal percorso. I suoni —
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
      style={{
        position: 'fixed', right: 16,
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        width: 34, height: 34, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,.18)',
        background: 'rgba(255,255,255,.10)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        color: 'currentColor', opacity: 0.5, zIndex: 20, cursor: 'pointer',
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
