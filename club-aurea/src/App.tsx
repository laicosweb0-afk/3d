import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { Intro } from './components/Intro';
import { StepAvvio } from './screens/StepAvvio';
import { StepQuiz } from './screens/StepQuiz';
import { StepEsito } from './screens/StepEsito';
import { StepRuota } from './screens/StepRuota';
import { StepRivelazione } from './screens/StepRivelazione';
import { StepDati } from './screens/StepDati';
import { StepFine } from './screens/StepFine';
import { fragranzaDelGiorno, generaCodice, scadenza } from './config/gioco';
import { submitLead, type Lead } from './lib/lead';
import type { DatiModulo } from './components/LeadForm';

type Fase = 'avvio' | 'quiz' | 'esito' | 'ruota' | 'rivelazione' | 'dati' | 'fine';

/** I tre passaggi dichiarati all'utente: le note, la ruota, il credito. */
const PASSO_DI: Record<Fase, number> = {
  avvio: 1, quiz: 1, esito: 1, ruota: 2, rivelazione: 2, dati: 3, fine: 3,
};

export default function App() {
  const [apertura, setApertura] = useState(true);
  const [fase, setFase] = useState<Fase>('avvio');
  const [avanti, setAvanti] = useState(true);
  /*
   * La fragranza si sceglie una volta sola, al montaggio: se la rileggessimo
   * a ogni render, con IN_DIFFUSIONE a null cambierebbe fra una domanda e
   * l'altra e il quiz diventerebbe impossibile.
   */
  const [fragranza, setFragranza] = useState(fragranzaDelGiorno);
  const [domanda, setDomanda] = useState(0);
  const [giuste, setGiuste] = useState(0);
  const [credito, setCredito] = useState(0);
  const [lead, setLead] = useState<Lead | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const chiudiApertura = useCallback(() => setApertura(false), []);

  const vai = useCallback((f: Fase, indietro = false) => {
    setAvanti(!indietro);
    setFase(f);
  }, []);

  const risposto = useCallback((esatta: boolean) => {
    if (esatta) setGiuste((g) => g + 1);
    setAvanti(true);
    if (domanda + 1 < fragranza.domande.length) setDomanda((d) => d + 1);
    else setFase('esito');
  }, [domanda, fragranza.domande.length]);

  const invia = useCallback(async (d: DatiModulo) => {
    setInCorso(true);
    setErrore(null);
    const nuovo: Lead = {
      nome: d.nome,
      email: d.email,
      telefono: d.telefono,
      fragranza: fragranza.nome,
      giuste,
      domande: fragranza.domande.length,
      credito,
      codiceCredito: generaCodice(),
      scadenza: scadenza().toISOString(),
      consensoMarketing: d.consenso,
      timestamp: new Date().toISOString(),
      sorgente: 'card-nfc',
      club: 'aurea',
    };
    try {
      await submitLead(nuovo);
      setLead(nuovo);
      vai('fine');
    } catch (e) {
      // I dati restano nei campi: si riprova senza riscrivere niente.
      setErrore(
        e instanceof Error && e.message
          ? `Non siamo riusciti a registrare il credito. ${e.message}. Riprova.`
          : 'Non siamo riusciti a registrare il credito. Riprova fra un istante.',
      );
    } finally {
      setInCorso(false);
    }
  }, [fragranza, giuste, credito, vai]);

  const ricomincia = useCallback(() => {
    setFragranza(fragranzaDelGiorno());
    setDomanda(0); setGiuste(0); setCredito(0); setLead(null); setErrore(null);
    vai('avvio', true);
  }, [vai]);

  const schermata = useMemo(() => {
    switch (fase) {
      case 'avvio':
        return <StepAvvio domande={fragranza.domande.length} onAvanti={() => vai('quiz')} />;
      case 'quiz':
        return (
          <StepQuiz
            domanda={fragranza.domande[domanda]}
            indice={domanda}
            totale={fragranza.domande.length}
            onRisposto={risposto}
          />
        );
      case 'esito':
        return (
          <StepEsito
            fragranza={fragranza} giuste={giuste} totale={fragranza.domande.length}
            onAvanti={() => vai('ruota')}
          />
        );
      case 'ruota':
        return <StepRuota onVinto={(v) => { setCredito(v); vai('rivelazione'); }} />;
      case 'rivelazione':
        return <StepRivelazione credito={credito} onAvanti={() => vai('dati')} />;
      case 'dati':
        return <StepDati onInvia={invia} inCorso={inCorso} errore={errore} />;
      case 'fine':
        return lead ? <StepFine lead={lead} onRicomincia={ricomincia} /> : null;
    }
  }, [fase, fragranza, domanda, giuste, credito, lead, inCorso, errore, invia, vai, risposto, ricomincia]);

  const indietro = fase === 'dati' ? () => vai('rivelazione', true) : undefined;

  return (
    <>
    {apertura && <Intro onFine={chiudiApertura} />}
    <div className="flex w-full flex-col" style={{ minHeight: '100dvh' }}>
      <Header
        passo={PASSO_DI[fase]} totale={3}
        mostraContatore={fase !== 'fine'}
        onIndietro={indietro}
      />

      <main
        className="relative flex flex-1 flex-col overflow-hidden"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {/*
            La chiave porta dentro il numero della domanda: senza, le tre
            schermate del quiz sarebbero la stessa fase e cambierebbero i
            testi sul posto, senza la transizione — e con lo stato della
            risposta rimasto quello di prima.
          */}
          <motion.div
            key={fase === 'quiz' ? `quiz-${domanda}` : fase}
            initial={{ opacity: 0, x: avanti ? 26 : -26, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: avanti ? -20 : 20, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.7 }}
            className="flex flex-1 flex-col px-6 pt-8"
          >
            {schermata}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
    </>
  );
}
