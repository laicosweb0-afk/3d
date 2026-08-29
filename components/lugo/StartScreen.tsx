'use client';

// Lo start screen: la pagina di lancio del gioco. Titolo grande sopra la
// città viva che gira dietro, GIOCA, e i pannelli COME SI GIOCA e
// IMPOSTAZIONI. Il click su GIOCA sblocca anche l'AudioContext.

import { useState } from 'react';
import { useLugo } from '@/lib/lugo/store';
import { TINTE_AUTO } from '@/lib/lugo/palette';
import { CARROZZERIE } from '@/lib/lugo/carrozzerie';
import { setAudioAttivo, setVolumi } from '@/lib/lugo/audio';
import { asset } from '@/lib/asset';

/** Lo stemma LC dello scudo esagonale, in SVG: nitido a ogni dimensione. */
export function Stemma({ classe = 'lugo-stemma' }: { classe?: string }) {
  const punti = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(50 + Math.cos(a) * 46).toFixed(1)},${(50 + Math.sin(a) * 48).toFixed(1)}`;
  }).join(' ');
  return (
    <svg className={classe} viewBox="0 0 100 100" aria-hidden="true">
      <polygon className="lugo-stemma-scudo" points={punti} />
      <path className="lugo-stemma-segno" d="M32 28 L32 68 L56 68" strokeLinecap="butt" />
      <path className="lugo-stemma-segno" d="M74 34 A22 22 0 1 0 74 64" strokeLinecap="butt" />
    </svg>
  );
}

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
  const modelloAuto = useLugo((s) => s.modelloAuto);
  const setModelloAuto = useLugo((s) => s.setModelloAuto);
  const audioOn = useLugo((s) => s.audioOn);
  const toggleAudio = useLugo((s) => s.toggleAudio);
  const volumi = useLugo((s) => s.volumi);
  const setVolume = useLugo((s) => s.setVolume);
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
    <div className="lugo-start lugo-start-keyart" data-hud="start">
      {/* La copertina di LUGO CITY: il titolo, il protagonista e la Piazza
          dei Martiri stanno già nell'illustrazione, quindi qui sopra ci va
          solo il tasto per entrare. WebP piccola sul telefono, WebP grande
          altrove, JPEG per chi non legge WebP. */}
      <picture className="lugo-start-copertina">
        <source
          srcSet={asset('/lugo/keyart-piccola.webp')}
          type="image/webp"
          media="(max-width: 760px)"
        />
        <source srcSet={asset('/lugo/keyart.webp')} type="image/webp" />
        <img src={asset('/lugo/keyart.jpg')} alt="LUGO CITY — la tua città, il tuo gioco" />
      </picture>
      <div className="lugo-start-velo" />
      <div className="lugo-start-inner">
        {/* Sul telefono tenuto in verticale l'illustrazione copre solo la
            fascia alta: sotto ci va il marchio, non un buco azzurro. */}
        <div className="lugo-start-marchietto">
          <Stemma />
          <div className="lugo-menu-marchio-testo">
            <strong>LUGO CITY</strong>
            <span>La tua città. Il tuo gioco.</span>
          </div>
        </div>
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
              {(['effetti', 'voce', 'ambiente', 'musica'] as const).map((c) => (
                <div className="lugo-start-imp" key={c}>
                  <span className="lugo-imp-etichetta">
                    {c === 'effetti' ? 'Effetti' : c === 'voce' ? 'Voci' : c === 'ambiente' ? 'Ambiente' : 'Musica'}
                  </span>
                  <input
                    type="range"
                    className="lugo-slider"
                    min={0}
                    max={100}
                    value={Math.round(volumi[c] * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      setVolume(c, v);
                      setVolumi({ [c]: v });
                    }}
                  />
                </div>
              ))}
              <div className="lugo-start-imp">
                <span className="lugo-imp-etichetta">Carrozzeria</span>
                <button
                  type="button"
                  className="lugo-start-btn"
                  onClick={() => setModelloAuto((modelloAuto + 1) % CARROZZERIE.length)}
                >
                  {CARROZZERIE[modelloAuto % CARROZZERIE.length].nome}
                </button>
              </div>
              <div className="lugo-start-imp">
                <span className="lugo-imp-etichetta">Colore</span>
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
