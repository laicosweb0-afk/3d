import { useCallback, useMemo, useState } from 'react';
import { Intro } from './components/Intro';
import { MuteButton } from './components/MuteButton';
import {
  Consigli, Credito, Dati, Domanda, Fine, Giro, Ingresso, Rivelazione, type DatiModulo,
} from './schermate';
import { OSPITE, famigliaDi, generaCodice, livelloDi, scadenza } from './config/gioco';
import { submitLead, type Lead } from './lib/lead';

type Fase = 'ingresso' | 'domanda' | 'rivelazione' | 'ruota' | 'credito' | 'consigli' | 'dati' | 'fine';

export default function App() {
  const [apertura, setApertura] = useState(true);
  const [fase, setFase] = useState<Fase>('ingresso');
  /** Cosa ha sentito: l'unica risposta, e il dato che conta. */
  const [scelta, setScelta] = useState<string | null>(null);
  /** Il credito uscito dalla ruota. */
  const [credito, setCredito] = useState(0);
  const [lead, setLead] = useState<Lead | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const chiudiApertura = useCallback(() => setApertura(false), []);

  const invia = useCallback(async (d: DatiModulo) => {
    setInCorso(true);
    setErrore(null);
    const centrato = scelta === OSPITE.famiglia;
    const nuovo: Lead = {
      nome: d.nome,
      email: d.email,
      telefono: d.telefono,
      fragranza: OSPITE.nome,
      maison: OSPITE.maison,
      famiglia: famigliaDi(scelta)?.etichetta ?? '',
      centrato,
      livello: livelloDi(centrato),
      credito,
      codiceCredito: generaCodice(),
      scadenza: scadenza().toISOString(),
      consensoMarketing: d.consenso,
      timestamp: new Date().toISOString(),
      sorgente: 'card-nfc',
      club: 'woman',
    };
    try {
      await submitLead(nuovo);
      setLead(nuovo);
      setFase('fine');
    } catch (e) {
      // I dati restano nei campi: si riprova senza riscrivere niente.
      setErrore(
        e instanceof Error && e.message
          ? `Non siamo riusciti a salvare il credito. ${e.message}. Riprova.`
          : 'Non siamo riusciti a salvare il credito. Riprova fra un istante.',
      );
    } finally {
      setInCorso(false);
    }
  }, [scelta, credito]);

  const ricomincia = useCallback(() => {
    setScelta(null); setCredito(0); setLead(null); setErrore(null);
    setFase('ingresso');
  }, []);

  const schermata = useMemo(() => {
    switch (fase) {
      case 'ingresso':
        return <Ingresso onAvanti={() => setFase('domanda')} />;
      case 'domanda':
        return <Domanda onRisposto={(f) => { setScelta(f); setFase('rivelazione'); }} />;
      case 'rivelazione':
        return scelta
          ? <Rivelazione scelta={scelta} onAvanti={() => setFase('ruota')} />
          : null;
      case 'ruota':
        return <Giro onVinto={(v) => { setCredito(v); setFase('credito'); }} />;
      case 'credito':
        return <Credito valore={credito} onAvanti={() => setFase('consigli')} />;
      case 'consigli':
        return scelta
          ? <Consigli scelta={scelta} valore={credito} onAvanti={() => setFase('dati')} />
          : null;
      case 'dati':
        return <Dati onInvia={invia} inCorso={inCorso} errore={errore} />;
      case 'fine':
        return lead
          ? <Fine codice={lead.codiceCredito} centrato={lead.centrato} onRicomincia={ricomincia} />
          : null;
    }
  }, [fase, scelta, credito, lead, inCorso, errore, invia, ricomincia]);

  return (
    <>
      {apertura && <Intro onFine={chiudiApertura} />}
      {/*
        Ogni schermata è alta quanto lo schermo e si sostituisce alla
        precedente. La chiave sulla fase fa ripartire l'animazione d'ingresso
        a ogni cambio: senza, React riuserebbe i nodi e la schermata nuova
        comparirebbe di colpo.

        Finché l'apertura è a schermo non si monta niente sotto, e non è una
        pignoleria: la prima schermata fa correre il Bianconiglio all'arrivo,
        e se venisse montata dietro l'apertura lui attraverserebbe lo schermo
        mentre nessuno lo sta guardando.
      */}
      {!apertura && <div key={fase}>{schermata}</div>}
      <MuteButton />
    </>
  );
}
