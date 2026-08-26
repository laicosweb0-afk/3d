'use client';

// L'HUD di gioco, tutto in italiano: tachimetro, pannello missione con
// timer, punteggio, avvisi centrali che sfumano da soli, hint contestuali,
// minimappa. Solo DOM: niente re-render del canvas 3D.

import { useEffect, useState } from 'react';
import { useLugo } from '@/lib/lugo/store';
import { missioneById } from '@/lib/lugo/missions';
import { Minimap } from './Minimap';

function tempoMMSS(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export function Hud() {
  const kmh = useLugo((s) => s.kmh);
  const punteggio = useLugo((s) => s.punteggio);
  const missioneId = useLugo((s) => s.missioneId);
  const statoMissione = useLugo((s) => s.statoMissione);
  const tappa = useLugo((s) => s.tappa);
  const tempoResiduo = useLugo((s) => s.tempoResiduo);
  const avviso = useLugo((s) => s.avviso);
  const hint = useLugo((s) => s.hint);
  const mode = useLugo((s) => s.mode);

  const [avvisoMostrato, setAvvisoMostrato] = useState<string | null>(null);
  useEffect(() => {
    if (!avviso) return;
    setAvvisoMostrato(avviso);
    const t = setTimeout(() => setAvvisoMostrato(null), 4200);
    return () => clearTimeout(t);
  }, [avviso]);

  const missione = missioneId ? missioneById(missioneId) : null;

  return (
    <div className="lugo-hud">
      {missione && statoMissione === 'attiva' && (
        <div className="lugo-missione" data-hud="missione">
          <div className="lugo-missione-titolo">{missione.titolo}</div>
          <div className="lugo-missione-obiettivo" data-hud="obiettivo">
            {missione.tappe[tappa].titolo}
            {missione.tappe.length > 1 && (
              <span className="lugo-missione-passi">
                {' '}
                · {tappa + 1}/{missione.tappe.length}
              </span>
            )}
          </div>
          {tempoResiduo !== null && (
            <div
              className={'lugo-missione-timer' + (tempoResiduo <= 10 ? ' lugo-timer-critico' : '')}
              data-hud="timer"
            >
              {tempoMMSS(tempoResiduo)}
            </div>
          )}
        </div>
      )}

      <div className="lugo-punteggio" data-hud="punteggio">
        {punteggio}
        <span className="lugo-punteggio-label"> punti</span>
      </div>

      <div className="lugo-tachimetro" data-hud="tachimetro">
        <span className="lugo-kmh">{kmh}</span>
        <span className="lugo-kmh-label">{mode === 'auto' ? 'km/h' : 'a piedi'}</span>
      </div>

      <div className="lugo-minimappa-box">
        <Minimap />
      </div>

      {avvisoMostrato && (
        <div className="lugo-avviso" data-hud="avviso" key={avvisoMostrato}>
          {avvisoMostrato}
        </div>
      )}
      {hint && (
        <div className="lugo-hint" data-hud="hint">
          {hint}
        </div>
      )}
    </div>
  );
}
