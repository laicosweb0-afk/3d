import { useCallback, useMemo, useState } from 'react';
import { Intro } from './components/Intro';
import { MuteButton } from './components/MuteButton';
import {
  Credito, Dati, Domanda, Fine, Giro, Ingresso, Pezzi, Rivelazione, Vetrina, type DatiModulo,
} from './schermate';
import { articoloDi } from './config/catalogo';
import { PEZZI, SPESA_MINIMA, generaCodice, scadenza, stileDi } from './config/gioco';
import { submitLead, type Lead } from './lib/lead';

type Fase = 'vetrina' | 'ingresso' | 'domanda' | 'rivelazione' | 'ruota' | 'credito' | 'pezzi' | 'dati' | 'fine';

export default function App() {
  const [apertura, setApertura] = useState(true);
  const [fase, setFase] = useState<Fase>('vetrina');
  /** Gli articoli col cuore nella vetrina. */
  const [preferiti, setPreferiti] = useState<Set<string>>(() => new Set());
  const commutaPreferito = useCallback((id: string) => {
    setPreferiti((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);
  /** Lo stile scelto: l'unica risposta, e il dato che conta. */
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
    const nuovo: Lead = {
      nome: d.nome,
      email: d.email,
      telefono: d.telefono,
      stile: stileDi(scelta)?.nome ?? '',
      pezzi: (PEZZI[scelta ?? ''] ?? []).map((p) => p.nome),
      preferiti: [...preferiti].map((id) => articoloDi(id)?.nome ?? id),
      credito,
      spesaMinima: SPESA_MINIMA,
      codiceCredito: generaCodice(),
      scadenza: scadenza().toISOString(),
      consensoMarketing: d.consenso,
      timestamp: new Date().toISOString(),
      sorgente: 'card-nfc',
      club: 'bazar-marrakech',
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
  }, [scelta, credito, preferiti]);

  const ricomincia = useCallback(() => {
    setScelta(null); setCredito(0); setLead(null); setErrore(null); setPreferiti(new Set());
    setFase('vetrina');
  }, []);

  const schermata = useMemo(() => {
    switch (fase) {
      case 'vetrina':
        return (
          <Vetrina preferiti={preferiti} onPreferito={commutaPreferito}
            onAvanti={() => setFase('ingresso')} />
        );
      case 'ingresso':
        return <Ingresso onAvanti={() => setFase('domanda')} />;
      case 'domanda':
        return <Domanda onRisposto={(s) => { setScelta(s); setFase('rivelazione'); }} />;
      case 'rivelazione':
        return scelta
          ? <Rivelazione scelta={scelta} onAvanti={() => setFase('ruota')} />
          : null;
      case 'ruota':
        return <Giro onVinto={(v) => { setCredito(v); setFase('credito'); }} />;
      case 'credito':
        return <Credito valore={credito} onAvanti={() => setFase('pezzi')} />;
      case 'pezzi':
        return scelta
          ? <Pezzi scelta={scelta} onAvanti={() => setFase('dati')} />
          : null;
      case 'dati':
        return <Dati onInvia={invia} inCorso={inCorso} errore={errore} />;
      case 'fine':
        return lead
          ? <Fine lead={lead} onRicomincia={ricomincia} />
          : null;
    }
  }, [fase, scelta, credito, lead, inCorso, errore, invia, ricomincia, preferiti, commutaPreferito]);

  return (
    <>
      {apertura && <Intro onFine={chiudiApertura} />}
      {/*
        Ogni schermata è alta quanto lo schermo e si sostituisce alla
        precedente. La chiave sulla fase fa ripartire l'animazione d'ingresso
        a ogni cambio. Finché l'apertura è a schermo non si monta niente sotto.
      */}
      {!apertura && <div key={fase}>{schermata}</div>}
      <MuteButton />
    </>
  );
}
