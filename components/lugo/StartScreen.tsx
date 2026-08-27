'use client';

// Lo start screen: la pagina di lancio del gioco. Titolo grande sopra la
// città viva che gira dietro, GIOCA, e i pannelli COME SI GIOCA e
// IMPOSTAZIONI. Il click su GIOCA sblocca anche l'AudioContext.

import { useState } from 'react';
import { useLugo } from '@/lib/lugo/store';
import { TINTE_AUTO } from '@/lib/lugo/palette';
import { setAudioAttivo } from '@/lib/lugo/audio';

const COMANDI: [string, string][] = [
  ['W A S D / Frecce', 'guida e cammina'],
  ['E / Invio', 'scendi, sali, parla'],
  ['Shift', 'corri'],
  ['Spazio', 'freno a mano'],
  ['R', 'raddrizza l’auto'],
  ['Palla a destra', 'guida col mouse o col dito'],
];

export function StartScreen() {
  const avvia = useLugo((s) => s.avvia);
  const tintaAuto = useLugo((s) => s.tintaAuto);
  const setTintaAuto = useLugo((s) => s.setTintaAuto);
  const audioOn = useLugo((s) => s.audioOn);
  const toggleAudio = useLugo((s) => s.toggleAudio);
  const denaro = useLugo((s) => s.denaro);
  const missioniFatte = useLugo((s) => s.missioniFatte);
  const [pannello, setPannello] = useState<'niente' | 'comandi' | 'impostazioni'>('niente');

  const gioca = () => {
    // il click è il gesto utente che sblocca l'AudioContext
    if (audioOn) setAudioAttivo(true);
    avvia();
  };

  const haSalvataggio = denaro > 0 || missioniFatte.length > 0;

  return (
    <div className="lugo-start" data-hud="start">
      <div className="lugo-start-scrim" />
      <div className="lugo-start-inner">
        <header className="lugo-start-testata">
          <h1 className="lugo-start-titolo">LUGO</h1>
          <p className="lugo-start-sotto">UN OPEN WORLD ROMAGNOLO</p>
        </header>

        <div className="lugo-start-blocco">
          {haSalvataggio && (
            <p className="lugo-start-salvataggio">
              Bentornato · €{denaro.toLocaleString('it-IT')} · {missioniFatte.length} missioni fatte
            </p>
          )}

          <button type="button" className="lugo-gioca" data-hud="gioca" onClick={gioca}>
            {haSalvataggio ? 'CONTINUA' : 'GIOCA'}
          </button>

          <div className="lugo-start-secondari">
            <button
              type="button"
              className="lugo-start-btn"
              onClick={() => setPannello(pannello === 'comandi' ? 'niente' : 'comandi')}
            >
              COME SI GIOCA
            </button>
            <button
              type="button"
              className="lugo-start-btn"
              onClick={() => setPannello(pannello === 'impostazioni' ? 'niente' : 'impostazioni')}
            >
              IMPOSTAZIONI
            </button>
          </div>

          {pannello === 'comandi' && (
            <div className="lugo-start-pannello">
              <dl className="lugo-start-comandi">
                {COMANDI.map(([tasto, azione]) => (
                  <div key={tasto} className="lugo-start-riga">
                    <dt>{tasto}</dt>
                    <dd>{azione}</dd>
                  </div>
                ))}
              </dl>
              <p className="lugo-start-nota">
                Trova il tuo amico Giacomo, fai le consegne per guadagnare, e occhio ai
                Carabinieri: la città è quella vera.
              </p>
            </div>
          )}

          {pannello === 'impostazioni' && (
            <div className="lugo-start-pannello">
              <div className="lugo-start-imp">
                <span>Audio</span>
                <button type="button" className="lugo-start-btn" onClick={toggleAudio}>
                  {audioOn ? 'ACCESO' : 'SPENTO'}
                </button>
              </div>
              <div className="lugo-start-imp">
                <span>La tua auto</span>
                <span className="lugo-start-tinte">
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
                </span>
              </div>
              <p className="lugo-start-nota">
                La qualità grafica si regola da sola sulle prestazioni del tuo dispositivo. I
                progressi si salvano automaticamente.
              </p>
            </div>
          )}
        </div>

        <footer className="lugo-start-piede">
          La vera Lugo di Ravenna · il Pavaglione · la Rocca Estense · le vie del centro
        </footer>
      </div>
    </div>
  );
}
