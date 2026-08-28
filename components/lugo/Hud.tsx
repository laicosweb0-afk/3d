'use client';

// L'HUD di gioco, tutto in italiano: pannello missione con timer, denaro,
// reputazione, livello ricercato, schede cinematografiche di inizio e fine
// missione, dialoghi a scelte, avvisi che sfumano da soli, hint, minimappa.
// Solo DOM: niente re-render del canvas 3D.

import { useEffect, useState } from 'react';
import { useLugo } from '@/lib/lugo/store';
import { missioneById } from '@/lib/lugo/missions';
import { setAudioAttivo, suonaEvento } from '@/lib/lugo/audio';
import { orologio } from '@/lib/lugo/tempo';
import { Minimap } from './Minimap';

function tempoMMSS(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function euro(v: number): string {
  return '€ ' + v.toLocaleString('it-IT');
}

export function Hud() {
  const kmh = useLugo((s) => s.kmh);
  const punteggio = useLugo((s) => s.punteggio);
  const denaro = useLugo((s) => s.denaro);
  const wanted = useLugo((s) => s.wanted);
  const missioneId = useLugo((s) => s.missioneId);
  const statoMissione = useLugo((s) => s.statoMissione);
  const tappa = useLugo((s) => s.tappa);
  const tempoResiduo = useLugo((s) => s.tempoResiduo);
  const intro = useLugo((s) => s.intro);
  const esito = useLugo((s) => s.esito);
  const dialogo = useLugo((s) => s.dialogo);
  const vetrina = useLugo((s) => s.vetrina);
  const outfit = useLugo((s) => s.outfit);
  const avviso = useLugo((s) => s.avviso);
  const hint = useLugo((s) => s.hint);
  const mode = useLugo((s) => s.mode);
  const via = useLugo((s) => s.via);
  const audioOn = useLugo((s) => s.audioOn);
  const toggleAudio = useLugo((s) => s.toggleAudio);
  const setIntro = useLugo((s) => s.setIntro);
  const setEsito = useLugo((s) => s.setEsito);
  const setDialogo = useLugo((s) => s.setDialogo);
  const setVetrina = useLugo((s) => s.setVetrina);
  const setOutfit = useLugo((s) => s.setOutfit);
  const addDenaro = useLugo((s) => s.addDenaro);
  const addPunti = useLugo((s) => s.addPunti);
  const setAvviso = useLugo((s) => s.setAvviso);

  // l'ora di gioco, aggiornata due volte al secondo (basta e avanza)
  const [ora, setOra] = useState(orologio());
  useEffect(() => {
    const t = setInterval(() => setOra(orologio()), 500);
    return () => clearInterval(t);
  }, []);

  const [avvisoMostrato, setAvvisoMostrato] = useState<string | null>(null);
  useEffect(() => {
    if (!avviso) return;
    setAvvisoMostrato(avviso);
    const t = setTimeout(() => setAvvisoMostrato(null), 4200);
    return () => clearTimeout(t);
  }, [avviso]);

  // le schede di inizio/fine missione si dissolvono da sole
  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => setIntro(null), 5200);
    return () => clearTimeout(t);
  }, [intro, setIntro]);
  useEffect(() => {
    if (!esito) return;
    const t = setTimeout(() => setEsito(null), 4600);
    return () => clearTimeout(t);
  }, [esito, setEsito]);

  const missione = missioneId ? missioneById(missioneId) : null;

  // le risposte del dialogo della sigaretta (e futuri): effetti semplici
  const rispondi = (id: string) => {
    if (dialogo?.id === 'sigaretta') {
      if (id === 'si') {
        addPunti(25);
        setAvviso('“Grande, sei un bravo!” · +25 REP');
        suonaEvento('tappa');
      } else if (id === 'no') {
        setAvviso('“Vabbè, ciao.”');
      }
    }
    setDialogo(null);
  };

  // l'acquisto in bottega: si paga, e qualcosa succede
  const compra = (art: { nome: string; prezzo: number; effetto?: string }) => {
    if (denaro < art.prezzo) {
      setAvviso('Non hai abbastanza soldi.');
      return;
    }
    addDenaro(-art.prezzo);
    if (art.effetto === 'outfit') {
      setOutfit((outfit + 1) % 4);
      setAvviso(`${art.nome} · nuovo look`);
      addPunti(10);
    } else if (art.effetto === 'fortuna') {
      // gratta e vinci: quasi sempre niente, ogni tanto la soddisfazione
      const r = Math.random();
      const vinto = r > 0.93 ? 100 : r > 0.75 ? 20 : r > 0.45 ? 5 : 0;
      if (vinto > 0) addDenaro(vinto);
      setAvviso(vinto > 0 ? `Hai vinto €${vinto}!` : 'Niente. Sarà per la prossima.');
    } else {
      addPunti(5);
      setAvviso(`${art.nome} · +5 REP`);
    }
    suonaEvento(art.effetto === 'fortuna' ? 'tappa' : 'successo');
  };

  return (
    <div className="lugo-hud">
      {missione && statoMissione === 'attiva' && !intro && (
        <div className="lugo-missione" data-hud="missione">
          <div className="lugo-missione-tipo">
            {missione.tipo === 'consegna' ? 'CONSEGNA' : 'MISSIONE'}
          </div>
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

      <div className="lugo-status">
        <div className="lugo-ora" data-hud="ora">{ora}</div>
        <div className="lugo-denaro" data-hud="denaro">
          {euro(denaro)}
        </div>
        <div className="lugo-rep" data-hud="punteggio" title="Reputazione">
          {punteggio}
          <span className="lugo-rep-label"> rep</span>
        </div>
        {wanted > 0 && (
          <div className="lugo-wanted" data-hud="wanted" title="Ricercato">
            {'★'.repeat(wanted)}
            <span className="lugo-wanted-vuote">{'★'.repeat(3 - wanted)}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="lugo-audio"
        data-hud="audio"
        title={audioOn ? 'Silenzia' : 'Riattiva audio'}
        onClick={() => {
          setAudioAttivo(!audioOn);
          toggleAudio();
        }}
      >
        {audioOn ? '♪' : '∅'}
      </button>

      {via && (
        <div className="lugo-via" data-hud="via" key={via}>
          {via}
        </div>
      )}

      <div className="lugo-tachimetro" data-hud="tachimetro">
        <span className="lugo-kmh">{kmh}</span>
        <span className="lugo-kmh-label">{mode === 'auto' ? 'km/h' : 'a piedi'}</span>
      </div>

      <div className="lugo-minimappa-box">
        <Minimap />
      </div>

      {/* scheda cinematografica di inizio missione */}
      {intro && (
        <div className="lugo-scheda lugo-scheda-intro" data-hud="intro" key={intro.titolo}>
          <div className="lugo-scheda-etichetta">{intro.etichetta}</div>
          <div className="lugo-scheda-titolo">{intro.titolo}</div>
          {intro.frase && <div className="lugo-scheda-frase">{intro.frase}</div>}
          <div className="lugo-scheda-obiettivo">
            <span>OBIETTIVO</span> {intro.obiettivo}
          </div>
        </div>
      )}

      {/* scheda di missione completata con le ricompense */}
      {esito && (
        <div className="lugo-scheda lugo-scheda-esito" data-hud="esito" key={esito.titolo + esito.denaro}>
          <div className="lugo-scheda-etichetta lugo-etichetta-ok">MISSIONE COMPLETATA</div>
          <div className="lugo-scheda-titolo">{esito.titolo}</div>
          <div className="lugo-scheda-premi">
            <span className="lugo-premio-euro">+€{esito.denaro}</span>
            <span className="lugo-premio-rep">+{esito.rep} REP</span>
            {esito.extra && <span className="lugo-premio-extra">{esito.extra}</span>}
          </div>
        </div>
      )}

      {/* la vetrina dell'attività: nome vero, listino di fantasia */}
      {vetrina && (
        <div className="lugo-vetrina" data-hud="vetrina">
          <div className="lugo-vetrina-testa">
            <div>
              <div className="lugo-vetrina-cat">{vetrina.categoria}</div>
              <div className="lugo-vetrina-nome">{vetrina.nome}</div>
            </div>
            <button type="button" className="lugo-vetrina-chiudi" onClick={() => setVetrina(null)}>
              ✕
            </button>
          </div>
          <div className="lugo-vetrina-desc">{vetrina.descrizione}</div>
          {vetrina.partner && vetrina.promo && (
            <div className="lugo-vetrina-promo">{vetrina.promo}</div>
          )}
          {vetrina.articoli.length === 0 ? (
            <div className="lugo-vetrina-vuoto">Oggi qui non si vende niente. Torna domani.</div>
          ) : (
            <div className="lugo-vetrina-lista">
              {vetrina.articoli.map((a) => (
                <button
                  key={a.nome}
                  type="button"
                  className="lugo-vetrina-art"
                  disabled={denaro < a.prezzo}
                  onClick={() => compra(a)}
                >
                  <span>{a.nome}</span>
                  <span className="lugo-vetrina-prezzo">€{a.prezzo.toFixed(2).replace('.00', '')}</span>
                </button>
              ))}
            </div>
          )}
          <div className="lugo-vetrina-piede">
            Attività di Lugo · listino di fantasia, non una promozione reale
          </div>
        </div>
      )}

      {/* dialogo a scelte con un NPC */}
      {dialogo && (
        <div className="lugo-dialogo" data-hud="dialogo">
          <div className="lugo-dialogo-chi">{dialogo.chi}</div>
          <div className="lugo-dialogo-testo">{dialogo.testo}</div>
          <div className="lugo-dialogo-opzioni">
            {dialogo.opzioni.map((o) => (
              <button key={o.id} type="button" className="lugo-dialogo-btn" onClick={() => rispondi(o.id)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* l'avviso cede il posto alle schede: dicono già la stessa cosa */}
      {avvisoMostrato && !intro && !esito && (
        <div className="lugo-avviso" data-hud="avviso" key={avvisoMostrato}>
          {avvisoMostrato}
        </div>
      )}
      {hint && !dialogo && !vetrina && (
        <div className="lugo-hint" data-hud="hint">
          {hint}
        </div>
      )}
    </div>
  );
}
