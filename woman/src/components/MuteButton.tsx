import { useEffect, useState } from 'react';
import { commutaSilenzio, osservaSilenzio, silenziato } from '../lib/suono';

/** Il silenziatore: piccolo, tenue, sempre raggiungibile. */
export function MuteButton() {
  const [muto, setMuto] = useState(silenziato());
  useEffect(() => osservaSilenzio(setMuto), []);

  return (
    <button
      type="button"
      onClick={() => commutaSilenzio()}
      aria-label={muto ? 'Riattiva i suoni' : 'Silenzia i suoni'}
      aria-pressed={muto}
      className="-mr-1 flex h-11 w-11 items-center justify-center text-ink-soft"
    >
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M4 7.6h2.6L10.4 4v12L6.6 12.4H4a1 1 0 0 1-1-1V8.6a1 1 0 0 1 1-1Z"
          fill="currentColor" />
        {muto ? (
          <path d="M13.6 7.6l3.8 4.8M17.4 7.6l-3.8 4.8" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" />
        ) : (
          <>
            <path d="M13.4 7.4a3.6 3.6 0 0 1 0 5.2" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" />
            <path d="M15.6 5.4a6.6 6.6 0 0 1 0 9.2" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
          </>
        )}
      </svg>
    </button>
  );
}
