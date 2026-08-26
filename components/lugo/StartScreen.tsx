'use client';

// Lo start screen: titolo, comandi, scelta del colore dell'auto, GIOCA.
// Il click su GIOCA sblocca anche l'AudioContext (gesto utente).

import { useLugo } from '@/lib/lugo/store';
import { TINTE_AUTO } from '@/lib/lugo/palette';

const COMANDI: [string, string][] = [
  ['W A S D / Frecce', 'guida e cammina'],
  ['E / Invio', 'scendi e sali dall’auto'],
  ['Shift', 'corri'],
  ['Spazio', 'freno a mano'],
  ['R', 'raddrizza l’auto'],
];

export function StartScreen() {
  const avvia = useLugo((s) => s.avvia);
  const tintaAuto = useLugo((s) => s.tintaAuto);
  const setTintaAuto = useLugo((s) => s.setTintaAuto);

  return (
    <div className="lugo-start" data-hud="start">
      <div className="lugo-start-card">
        <h1 className="lugo-start-titolo">LUGO</h1>
        <p className="lugo-start-sotto">un open world romagnolo</p>
        <p className="lugo-start-luogo">
          La vera Lugo di Ravenna: il Pavaglione, la Rocca Estense, le vie del centro.
        </p>

        <dl className="lugo-start-comandi">
          {COMANDI.map(([tasto, azione]) => (
            <div key={tasto} className="lugo-start-riga">
              <dt>{tasto}</dt>
              <dd>{azione}</dd>
            </div>
          ))}
        </dl>

        <div className="lugo-start-tinte">
          <span className="lugo-start-tinte-label">La tua auto:</span>
          {TINTE_AUTO.map((t, i) => (
            <button
              key={t.nome}
              type="button"
              title={t.nome}
              className={'lugo-tinta' + (i === tintaAuto ? ' lugo-tinta-scelta' : '')}
              style={{ background: t.colore }}
              onClick={() => setTintaAuto(i)}
            />
          ))}
        </div>

        <button type="button" className="lugo-gioca" data-hud="gioca" onClick={avvia}>
          GIOCA
        </button>
        <p className="lugo-start-nota">Per ora si gioca con la tastiera: da computer, non da telefono.</p>
      </div>
    </div>
  );
}
