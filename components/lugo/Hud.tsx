'use client';

// L'HUD di gioco, tutto in italiano: pannello missione con timer, denaro,
// reputazione, livello ricercato, schede cinematografiche di inizio e fine
// missione, dialoghi a scelte, avvisi che sfumano da soli, hint, minimappa.
// Solo DOM: niente re-render del canvas 3D.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLugo } from '@/lib/lugo/store';
import { CAPITOLI, capitoloCorrente, type Capitolo } from '@/lib/lugo/capitoli';
import {
  attivitaConMissioni,
  creaMissioneTurno,
  missioneById,
  pontePrimoIncontro,
} from '@/lib/lugo/missions';
import {
  dialogoPostoFisso,
  turnoFattoOggi,
  TURNI_PER_CONTRATTO,
} from '@/lib/lugo/lavoro';
import { setAudioAttivo, suonaEvento } from '@/lib/lugo/audio';
import { orologio } from '@/lib/lugo/tempo';
import { Minimap } from './Minimap';
import { Guardaroba } from './Guardaroba';
import { useMondo } from '@/lib/lugo/loadMap';
import { contaPoi, puntiInteresse } from '@/lib/lugo/poi';
import { DISTINTIVI } from '@/lib/lugo/distintivi';
import { eventiDiOggi } from '@/lib/lugo/eventi';
import {
  chiaveGiorno,
  chiaveSettimana,
  daRiscuotere,
  incarichiDelGiorno,
  incarichiDellaSettimana,
  incarichiVivi,
  type IncaricoVivo,
} from '@/lib/lugo/incarichi';
import { avanzamento, gradoDaRep, livelloDaRep } from '@/lib/lugo/progressione';
import { risposta } from '@/lib/lugo/maranza';
import { stick } from '@/lib/lugo/stick';

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
  const hintAllerta = useLugo((s) => s.hintAllerta);
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
  const scoperta = useLugo((s) => s.scoperta);
  const poiVisitati = useLugo((s) => s.poiVisitati);
  const distintivi = useLugo((s) => s.distintivi);
  const diario = useLugo((s) => s.diario);
  const setDiario = useLugo((s) => s.setDiario);
  const guardaroba = useLugo((s) => s.guardaroba);
  const setGuardaroba = useLugo((s) => s.setGuardaroba);
  const missioniFatte = useLugo((s) => s.missioniFatte);
  const consegneFatte = useLugo((s) => s.consegneFatte);
  const bacheca = useLugo((s) => s.bacheca);
  const setBacheca = useLugo((s) => s.setBacheca);
  const setMissione = useLugo((s) => s.setMissione);
  const setTempoResiduo = useLugo((s) => s.setTempoResiduo);
  const totali = useLugo((s) => s.totali);
  const baseGiorno = useLugo((s) => s.baseGiorno);
  const baseSettimana = useLugo((s) => s.baseSettimana);
  const incarichiRiscossi = useLugo((s) => s.incarichiRiscossi);
  const riscuotiIncarico = useLugo((s) => s.riscuotiIncarico);
  const turniPerBottega = useLugo((s) => s.turniPerBottega);
  const giornoLavoro = useLugo((s) => s.giornoLavoro);
  const turniOggi = useLugo((s) => s.turniOggi);
  const contratto = useLugo((s) => s.contratto);
  const firmaContratto = useLugo((s) => s.firmaContratto);
  const liv = livelloDaRep(punteggio);
  const grado = gradoDaRep(punteggio);
  const avanza = avanzamento(punteggio);
  const mondo = useMondo();

  // Il capitolo della vita a Lugo: SEMPRE derivato dai progressi già
  // salvati (lib/lugo/capitoli.ts), mai memorizzato. Il memo c'è perché
  // l'HUD re-renderizza ~5 volte al secondo per il tachimetro: i quattro
  // ingredienti del capitolo cambiano di rado, e ricalcolare le liste di
  // missioni a ogni lettura del kmh sarebbe lavoro per-frame gratuito.
  const capitolo = useMemo(() => {
    const stato = { missioniFatte, denaro, punteggio, consegneFatte, turniPerBottega, contratto };
    const cap = capitoloCorrente(stato);
    return { cap, passo: cap.prossimoPasso(stato) };
  }, [missioniFatte, denaro, punteggio, consegneFatte, turniPerBottega, contratto]);

  // La scheda «CAPITOLO COMPLETATO»: compare solo quando il capitolo
  // AVANZA durante la partita. Il confronto sta in un ref che parte da
  // null: al primo render (che è anche il render dopo il caricamento di un
  // salvataggio, perché avviaSalvataggio gira nello start screen, prima che
  // l'HUD esista) il ref è vuoto e la scheda non parte — un veterano che
  // ricarica la pagina non deve rivedere il coriandolo del capitolo 3.
  const capPrima = useRef<number | null>(null);
  const [capChiuso, setCapChiuso] = useState<Capitolo | null>(null);
  useEffect(() => {
    const prima = capPrima.current;
    capPrima.current = capitolo.cap.n;
    // niente scheda al primo render, né su una RETROMARCIA: spendere sotto
    // i €400 riporta al capitolo della casa senza fanfare
    if (prima === null || capitolo.cap.n <= prima) return;
    // con un salto di più capitoli in un colpo (i soldi della casa già in
    // tasca quando si chiude il quartiere) si festeggia l'ultimo chiuso
    setCapChiuso(CAPITOLI[capitolo.cap.n - 2]);
    // l'esito di missione, se c'è, sta già suonando lo stesso jingle: due
    // 'successo' nello stesso istante fanno solo volume, non festa
    if (!useLugo.getState().esito) suonaEvento('successo');
  }, [capitolo.cap.n]);
  // la scheda si dissolve da sola: il CSS la sfuma a 5,6s e qui si toglie
  // dal DOM subito dopo, come fanno intro ed esito
  useEffect(() => {
    if (!capChiuso) return;
    const t = setTimeout(() => setCapChiuso(null), 6400);
    return () => clearTimeout(t);
  }, [capChiuso]);

  // Gli incarichi di oggi e di questa settimana, col progresso vero. Le
  // chiavi vengono dalla data: cambiano da sole a mezzanotte e il lunedì.
  const giornalieri = incarichiVivi(
    incarichiDelGiorno(chiaveGiorno()),
    totali,
    baseGiorno,
    incarichiRiscossi,
  );
  const settimanali = incarichiVivi(
    incarichiDellaSettimana(chiaveSettimana()),
    totali,
    baseSettimana,
    incarichiRiscossi,
  );
  const pronti = daRiscuotere(giornalieri) + daRiscuotere(settimanali);
  const programma = eventiDiOggi();

  // Si accetta un lavoro dalla bacheca: da qui in poi è una missione come
  // tutte le altre, e la macchina delle missioni la porta avanti.
  const accetta = (o: { id: string; titolo: string; obiettivo: string }) => {
    const m = missioneById(o.id);
    if (!m) return;
    setMissione(m.id, 'attiva', 0);
    setTempoResiduo(m.tempoLimite ?? null);
    setIntro({
      etichetta: m.tipo === 'consegna' ? 'CONSEGNA' : 'NUOVA MISSIONE',
      titolo: m.titolo,
      frase: m.frase,
      obiettivo: m.tappe[0].titolo,
    });
    setBacheca(null);
    suonaEvento('tappa');
  };

  // ── Il lavoro in vetrina ──────────────────────────────────────────────
  // La bottega aperta può ospitare un turno se sta nel registro delle
  // attività con missioni: è la stessa lista da cui pescano la catena e le
  // bacheche, quindi vetrina e resto del gioco raccontano una sola regola.
  // Player.tsx non c'entra: la vetrina arriva già aperta dallo store, qui
  // si decide solo cosa mostrarci dentro.
  const bottegaTurno = vetrina
    ? (attivitaConMissioni().find((a) => a.id === vetrina.id) ?? null)
    : null;
  const turniQui = vetrina ? (turniPerBottega[vetrina.id] ?? 0) : 0;
  const fattoOggi = vetrina ? turnoFattoOggi(giornoLavoro, turniOggi, vetrina.id) : false;
  const bottegaTua = Boolean(vetrina && contratto && contratto.id === vetrina.id);
  const puoChiedere = Boolean(bottegaTurno && !bottegaTua && turniQui >= TURNI_PER_CONTRATTO);

  // «Lavora qui»: il turno è la missione della categoria, firmata con la
  // bottega. Parte da fuori dalla macchina delle missioni, esattamente come
  // un lavoro accettato in bacheca: al conto alla rovescia pensa lei.
  const lavoraQui = () => {
    if (!bottegaTurno || fattoOggi) return;
    const m = creaMissioneTurno(mondo, bottegaTurno);
    setMissione(m.id, 'attiva', 0);
    setTempoResiduo(m.tempoLimite ?? null);
    setIntro({
      etichetta: 'TURNO DI LAVORO',
      titolo: m.titolo,
      frase: m.frase,
      obiettivo: m.tappe[0].titolo,
    });
    setVetrina(null);
    suonaEvento('tappa');
  };

  // «Chiedi il posto fisso»: si apre il dialogo col titolare (personaggio
  // di fantasia). La risposta passa da `rispondi`, come tutti i dialoghi.
  const chiediPosto = () => {
    if (!vetrina || !puoChiedere) return;
    const d = dialogoPostoFisso(contratto);
    setDialogo({ id: 'lavoro-posto:' + vetrina.id, ...d });
  };

  const riscuoti = (i: IncaricoVivo) => {
    if (!i.completo || i.riscosso) return;
    if (!riscuotiIncarico(i.id)) return;
    addPunti(i.rep);
    addDenaro(i.denaro);
    setAvviso(`${i.titolo} · +€${i.denaro} · +${i.rep} REP`);
    suonaEvento('successo');
  };

  // Esc chiude quello che è aperto. Senza, un pannello aperto per sbaglio
  // si poteva chiudere solo col dito sulla ✕: sulla tastiera non c'era
  // nessuna via d'uscita, e intanto la E non faceva più niente.
  useEffect(() => {
    const giu = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      const s = useLugo.getState();
      if (!s.vetrina && !s.bacheca && !s.diario && !s.guardaroba) return;
      e.preventDefault();
      s.setVetrina(null);
      s.setBacheca(null);
      s.setDiario(false);
      s.setGuardaroba(false);
    };
    window.addEventListener('keydown', giu);
    return () => window.removeEventListener('keydown', giu);
  }, []);

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

  // Le risposte del dialogo. Per l'incontro col maranza qui NON si applica
  // più niente: si scrive soltanto la scelta sul ponte di maranza.ts (lo
  // stesso schema di stick.ts — il DOM scrive, il frame legge) e REP,
  // avvisi e battuta di risposta arrivano dall'esito del ciclo di gioco.
  // Quando invece l'HUD applicava da sé il +25 REP, pannello e mondo
  // raccontavano due cose diverse: a schermo «grazie», e in strada il
  // maranza che continuava a insistere.
  const rispondi = (id: string) => {
    // I dialoghi del primo incontro (m00-*): stessa disciplina del
    // maranza — qui si scrive solo la scelta sul ponte di missions.ts e
    // si chiude il pannello; conseguenze (pacco, missione, fumetti) le
    // applica PrimoIncontro nel ciclo di gioco, che è l'unico padrone
    // della scena. Prima di questo ramo qualunque id non-sigaretta faceva
    // solo setDialogo(null), e il «Volentieri» sarebbe andato perduto.
    if (dialogo?.id.startsWith('m00-')) {
      pontePrimoIncontro.scelta = id;
      setDialogo(null);
      return;
    }
    // Il posto fisso (lavoro-posto:<bottegaId>): qui l'HUD applica da sé,
    // perché il contratto è tutto suo — non c'è un ciclo di gioco che debba
    // dire la sua, come invece per maranza e primo incontro. La bottega si
    // rilegge dal registro con l'id nel dialogo, NON dalla vetrina: la E
    // del Player chiude i pannelli ma lascia vivo il dialogo, e un «sì»
    // detto a vetrina ormai chiusa deve valere lo stesso.
    if (dialogo?.id.startsWith('lavoro-posto:')) {
      if (id === 'si') {
        const bid = dialogo.id.slice('lavoro-posto:'.length);
        const a = attivitaConMissioni().find((x) => x.id === bid);
        if (a) {
          const prima = contratto;
          firmaContratto({ id: a.id, nome: a.nome });
          // il commiato onesto: si saluta la vecchia bottega, senza drammi
          setAvviso(
            prima && prima.id !== a.id
              ? `Hai salutato ${prima.nome}: da oggi la tua bottega è ${a.nome}`
              : `Posto fisso da ${a.nome}: qui ci lavori tu`,
          );
          suonaEvento('successo');
        }
      }
      setDialogo(null);
      return;
    }
    if (dialogo?.id === 'sigaretta' || dialogo?.id === 'sigaretta-insiste') {
      if (id === 'pugno') {
        // riusa il ponte del pulsante ✊ che esiste già, invece di
        // inventare un secondo canale per la stessa identica azione
        setDialogo(null);
        stick.pugnoBtn = true;
        setTimeout(() => {
          stick.pugnoBtn = false;
        }, 140);
        return;
      }
      risposta.scelta = id as 'si' | 'no' | 'via';
      setDialogo(null);
      return;
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
    // un acquisto in bottega vale per l'incarico del giro delle attività
    useLugo.getState().contaTotale('acquisti');
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
      {/* La colonna in alto a sinistra: il pannello missione e, sotto, la
          riga del capitolo. La colonna esiste perché l'altezza del pannello
          cambia (timer, titoli che vanno a capo): un offset fisso per la
          riga del capitolo finiva o sovrapposto o a mezz'aria. */}
      <div className="lugo-capitolo-colonna">
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
        {/* il filo dichiarato: a che punto della vita a Lugo sono */}
        <div className="lugo-capitolo" data-hud="capitolo">
          <span className="lugo-capitolo-n">Cap. {capitolo.cap.n}</span>
          {' · '}
          <span className="lugo-capitolo-nome">{capitolo.cap.nome}</span>
          <span className="lugo-capitolo-passo"> — {capitolo.passo}</span>
        </div>
      </div>

      <div className="lugo-status">
        <div className="lugo-ora" data-hud="ora">{ora}</div>
        <div className="lugo-denaro" data-hud="denaro">
          {euro(denaro)}
        </div>
        <div className="lugo-rep" data-hud="punteggio" title="Reputazione">
          {punteggio}
          <span className="lugo-rep-label"> rep</span>
        </div>
        {/* Il livello: numero, titolo narrativo e quanto manca al prossimo.
            La scala sta tutta in lib/lugo/progressione.ts. */}
        <div className="lugo-livello" data-hud="livello" title={grado.nome}>
          <span className="lugo-livello-n">LIV {liv.n}</span>
          <span className="lugo-livello-titolo">{liv.titolo}</span>
        </div>
        <div
          className="lugo-livello-barra"
          title={avanza.prossimo ? `${avanza.mancano} rep a «${avanza.prossimo.titolo}»` : 'Livello massimo'}
        >
          <div className="lugo-livello-piena" style={{ width: `${Math.round(avanza.frazione * 100)}%` }} />
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

      <button
        type="button"
        className="lugo-diario-btn"
        data-hud="diario-apri"
        title="Diario dell'esplorazione"
        onClick={() => setDiario(!diario)}
      >
        <span className="lugo-diario-icona">◈</span>
        <span className="lugo-diario-conta">{poiVisitati.length}</span>
        {pronti > 0 && (
          <span className="lugo-diario-pronti" data-hud="incarichi-pronti">
            {pronti}
          </span>
        )}
      </button>

      <button
        type="button"
        className="lugo-guardaroba-btn"
        data-hud="guardaroba-apri"
        title="Guardaroba"
        onClick={() => {
          setGuardaroba(!guardaroba);
          if (!guardaroba) setDiario(false);
        }}
      >
        👕
      </button>

      {guardaroba && <Guardaroba />}

      {/* la scheda che compare scoprendo un luogo camminando */}
      {scoperta && (
        <div className="lugo-scoperta" data-hud="scoperta" key={scoperta.nome}>
          <div className="lugo-scoperta-etichetta">SCOPERTO</div>
          <div className="lugo-scoperta-nome">{scoperta.nome}</div>
          <div className="lugo-scoperta-cosa">{scoperta.cosa}</div>
          {scoperta.distintivo && (
            <div className="lugo-scoperta-distintivo">◈ {scoperta.distintivo}</div>
          )}
        </div>
      )}

      {via && (
        <div className="lugo-via" data-hud="via" key={via}>
          {via}
        </div>
      )}

      <div className="lugo-tachimetro" data-hud="tachimetro">
        <span className="lugo-kmh">{kmh}</span>
        <span className="lugo-kmh-label">{mode === 'piedi' ? 'a piedi' : 'km/h'}</span>
      </div>

      <div className="lugo-minimappa-box">
        <Minimap />
      </div>

      {/* il diario dell'esplorazione: dove sono stato, cosa mi manca */}
      {diario && (
        <div className="lugo-diario" data-hud="diario">
          <div className="lugo-diario-testa">
            <div>
              <div className="lugo-vetrina-cat">Diario</div>
              <div className="lugo-vetrina-nome">Lugo esplorata</div>
            </div>
            <button type="button" className="lugo-vetrina-chiudi" onClick={() => setDiario(false)}>
              ✕
            </button>
          </div>
          <div className="lugo-diario-barra">
            <div
              className="lugo-diario-barra-piena"
              style={{ width: `${Math.min(100, (poiVisitati.length / Math.max(1, puntiInteresse(mondo).length)) * 100)}%` }}
            />
          </div>
          <div className="lugo-diario-conteggi">
            <span data-hud="diario-poi">{poiVisitati.length}</span> luoghi su{' '}
            {puntiInteresse(mondo).length} — {contaPoi(mondo).monumento} monumenti,{' '}
            {contaPoi(mondo).attivita} botteghe
          </div>
          {/* Cosa succede oggi in città: gli eventi hanno un calendario, e
              il mercato non c'è la domenica. */}
          <div className="lugo-programma" data-hud="programma">
            <div className="lugo-incarichi-titolo">Oggi a Lugo</div>
            {programma.length === 0 ? (
              <div className="lugo-offerta-testo">Giornata tranquilla: niente di speciale.</div>
            ) : (
              programma.map((e) => (
                <div key={e.id} className="lugo-programma-riga">
                  <span className="lugo-programma-ora">
                    {String(Math.floor(e.daOra)).padStart(2, '0')}:
                    {String(Math.round((e.daOra % 1) * 60)).padStart(2, '0')}
                  </span>
                  <span className="lugo-programma-nome">{e.titolo}</span>
                </div>
              ))
            )}
          </div>

          {/* Gli incarichi: quello che Lugo ti chiede oggi e questa settimana.
              Si riempiono da soli mentre giochi; il premio si incassa qui. */}
          <div className="lugo-incarichi" data-hud="incarichi">
            {([
              ['Oggi', giornalieri],
              ['Questa settimana', settimanali],
            ] as const).map(([titolo, elenco]) => (
              <div key={titolo} className="lugo-incarichi-gruppo">
                <div className="lugo-incarichi-titolo">{titolo}</div>
                {elenco.map((i) => (
                  <div
                    key={i.id}
                    className={
                      'lugo-incarico' +
                      (i.riscosso ? ' lugo-incarico-riscosso' : i.completo ? ' lugo-incarico-ok' : '')
                    }
                  >
                    <div className="lugo-incarico-testa">
                      <span className="lugo-incarico-nome">{i.titolo}</span>
                      <span className="lugo-incarico-conta">
                        {i.metrica === 'euro' ? `€${i.fatto}/€${i.quanto}` : `${i.fatto}/${i.quanto}`}
                      </span>
                    </div>
                    <div className="lugo-incarico-barra">
                      <div
                        className="lugo-incarico-barra-piena"
                        style={{ width: `${(i.fatto / i.quanto) * 100}%` }}
                      />
                    </div>
                    <div className="lugo-incarico-piede">
                      <span className="lugo-incarico-testo">{i.descrizione}</span>
                      {i.riscosso ? (
                        <span className="lugo-incarico-fatto">RISCOSSO</span>
                      ) : i.completo ? (
                        <button
                          type="button"
                          className="lugo-incarico-btn"
                          data-hud="incarico-riscuoti"
                          onClick={() => riscuoti(i)}
                        >
                          RISCUOTI €{i.denaro} · {i.rep} REP
                        </button>
                      ) : (
                        <span className="lugo-incarico-premio">
                          €{i.denaro} · {i.rep} REP
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="lugo-diario-lista">
            {DISTINTIVI.map((d) => {
              const tipoDi = new Map(puntiInteresse(mondo).map((p) => [p.id, p.tipo]));
              const stato = {
                poiVisitati,
                monumenti: poiVisitati.filter((id) => tipoDi.get(id) === 'monumento').length,
                botteghe: poiVisitati.filter((id) => tipoDi.get(id) === 'attivita').length,
                missioniFatte,
                punteggio,
                consegneFatte,
              };
              const p = Math.min(d.meta, d.progresso(stato));
              const fatto = distintivi.includes(d.id);
              return (
                <div key={d.id} className={`lugo-distintivo${fatto ? ' lugo-distintivo-ok' : ''}`}>
                  <div className="lugo-distintivo-testa">
                    <span className="lugo-distintivo-nome">
                      {fatto ? '◈' : '◇'} {d.nome}
                    </span>
                    <span className="lugo-distintivo-conta">
                      {p}/{d.meta}
                    </span>
                  </div>
                  <div className="lugo-distintivo-testo">{d.testo}</div>
                </div>
              );
            })}
          </div>
          <div className="lugo-diario-nota">
            I luoghi si scoprono a piedi. Le attività compaiono con il nome e la
            categoria già pubblici su OpenStreetMap.
          </div>
        </div>
      )}

      {/* La scheda «CAPITOLO COMPLETATO». Vive in una fascia PIÙ BASSA
          delle schede di missione e sta prima di loro nel DOM: quando il
          capitolo si chiude insieme all'ultima missione, l'esito compare
          al suo posto di sempre, subito e sopra — questa scheda non lo
          copre e non lo ritarda, gli fa da seconda riga. */}
      {capChiuso && (
        <div className="lugo-scheda lugo-scheda-capitolo" data-hud="capitolo-scheda" key={capChiuso.n}>
          <div className="lugo-scheda-etichetta lugo-capitolo-etichetta">CAPITOLO COMPLETATO</div>
          <div className="lugo-scheda-titolo">{capChiuso.nome}</div>
          <div className="lugo-capitolo-avanti">
            <span className="lugo-capitolo-avanti-n">
              Cap. {capitolo.cap.n} · {capitolo.cap.nome}
            </span>
            <span className="lugo-capitolo-avanti-motto">{capitolo.cap.motto}</span>
          </div>
        </div>
      )}

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

      {/* La bacheca dei lavori: nei luoghi grandi di Lugo si sceglie cosa
          fare invece di aspettare che una missione parta da sola. */}
      {bacheca && (
        <div className="lugo-vetrina lugo-bacheca" data-hud="bacheca">
          <div className="lugo-vetrina-testa">
            <div>
              <div className="lugo-vetrina-cat">Lavori</div>
              <div className="lugo-vetrina-nome">{bacheca.nome}</div>
            </div>
            <button type="button" className="lugo-vetrina-chiudi" onClick={() => setBacheca(null)}>
              ✕
            </button>
          </div>
          <div className="lugo-vetrina-desc">{bacheca.sottotitolo}</div>
          <div className="lugo-bacheca-lista">
            {bacheca.offerte.map((o) => (
              <div key={o.id} className="lugo-offerta">
                <div className="lugo-offerta-testa">
                  <span className="lugo-offerta-titolo">{o.titolo}</span>
                  <span className={`lugo-offerta-diff lugo-diff-${o.difficolta}`}>
                    {o.difficolta}
                  </span>
                </div>
                <div className="lugo-offerta-testo">{o.descrizione}</div>
                <div className="lugo-offerta-obiettivo">▸ {o.obiettivo}</div>
                <div className="lugo-offerta-piede">
                  <span className="lugo-offerta-premi">
                    €{o.denaro} · {o.rep} REP
                    {o.tempoLimite ? ` · ${Math.round(o.tempoLimite / 60)} min` : ''}
                  </span>
                  <button
                    type="button"
                    className="lugo-offerta-btn"
                    data-hud="bacheca-accetta"
                    onClick={() => accetta(o)}
                  >
                    ACCETTA
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="lugo-vetrina-piede">
            Le proposte cambiano ogni volta che torni. Puoi accettarne una alla volta.
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
          {/* La dicitura di partner compare SOLO se l'esercente l'ha
              autorizzata nel file dei dati: senza autorizzazione il livello
              resta 'NESSUNO' e qui non si scrive niente. */}
          {vetrina.partner && vetrina.livello !== 'NESSUNO' && (
            <div className="lugo-vetrina-partner">ATTIVITÀ PARTNER</div>
          )}
          {vetrina.partner && vetrina.promo && (
            <div className="lugo-vetrina-promo">{vetrina.promo}</div>
          )}
          {/* Il lavoro: solo nelle botteghe che ospitano missioni. Un turno
              per bottega al giorno; a turno fatto il bottone lascia il posto
              al «Torna domani». Il lavoro è finzione di gioco: la bottega ci
              mette solo il nome e la categoria già pubblici su OSM. */}
          {bottegaTurno && (
            <div className="lugo-vetrina-lavoro" data-hud="vetrina-lavoro">
              {bottegaTua && (
                <div className="lugo-vetrina-tua" data-hud="vetrina-tua">
                  ◆ Qui ci lavori tu{fattoOggi ? '' : ' · il turno paga il 25% in più'}
                </div>
              )}
              {fattoOggi ? (
                <div className="lugo-vetrina-domani" data-hud="vetrina-domani">
                  Turno fatto. Torna domani
                </div>
              ) : (
                <button
                  type="button"
                  className="lugo-vetrina-lavora"
                  data-hud="vetrina-lavora"
                  onClick={lavoraQui}
                >
                  LAVORA QUI
                </button>
              )}
              {puoChiedere && (
                <button
                  type="button"
                  className="lugo-vetrina-posto"
                  data-hud="vetrina-posto"
                  onClick={chiediPosto}
                >
                  CHIEDI IL POSTO FISSO
                </button>
              )}
              {!bottegaTua && turniQui > 0 && turniQui < TURNI_PER_CONTRATTO && (
                <div className="lugo-vetrina-turni" data-hud="vetrina-turni">
                  Turni fatti qui: {turniQui} di {TURNI_PER_CONTRATTO}
                </div>
              )}
            </div>
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
        <div
          className={
            'lugo-dialogo' + (dialogo.id === 'sigaretta-insiste' ? ' lugo-dialogo-insiste' : '')
          }
          data-hud="dialogo"
        >
          <div className="lugo-dialogo-chi">{dialogo.chi}</div>
          <div className="lugo-dialogo-testo" data-hud="dialogo-testo">{dialogo.testo}</div>
          <div className="lugo-dialogo-opzioni">
            {dialogo.opzioni.map((o) => (
              <button
                key={o.id}
                type="button"
                className={'lugo-dialogo-btn' + (o.id === 'pugno' ? ' lugo-dialogo-btn-pugno' : '')}
                data-hud={'dialogo-opzione-' + o.id}
                onClick={() => rispondi(o.id)}
              >
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
        <div
          className={'lugo-hint' + (hintAllerta ? ' lugo-hint-allerta' : '')}
          data-hud="hint"
        >
          {hint}
        </div>
      )}
    </div>
  );
}
