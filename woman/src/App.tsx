import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { Intro } from './components/Intro';
import { StepDomanda } from './screens/StepDomanda';
import { StepRisposta } from './screens/StepRisposta';
import { StepRuota } from './screens/StepRuota';
import { StepRivelazione } from './screens/StepRivelazione';
import { StepDati } from './screens/StepDati';
import { StepFine } from './screens/StepFine';
import {
  OSPITE, SPICCHI, famigliaDi, generaCodice, livelloDi, scadenza, type Spicchio,
} from './config/gioco';
import { submitLead, type Lead } from './lib/lead';
import type { DatiModulo } from './components/LeadForm';

type Fase = 'domanda' | 'risposta' | 'ruota' | 'rivelazione' | 'dati' | 'fine';

/** I tre passaggi dichiarati: la risposta, il premio, il credito. */
const PASSO_DI: Record<Fase, number> = {
  domanda: 1, risposta: 1, ruota: 2, rivelazione: 2, dati: 3, fine: 3,
};

export default function App() {
  const [apertura, setApertura] = useState(true);
  const [fase, setFase] = useState<Fase>('domanda');
  const [avanti, setAvanti] = useState(true);
  /** Cosa ha sentito: l'unica risposta, e il dato che conta. */
  const [scelta, setScelta] = useState<string | null>(null);
  const [premio, setPremio] = useState<Spicchio>(SPICCHI[0]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const chiudiApertura = useCallback(() => setApertura(false), []);

  const vai = useCallback((f: Fase, indietro = false) => {
    setAvanti(!indietro);
    setFase(f);
  }, []);

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
      credito: premio.valore,
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
  }, [scelta, premio, vai]);

  const ricomincia = useCallback(() => {
    setScelta(null); setPremio(SPICCHI[0]); setLead(null); setErrore(null);
    vai('domanda', true);
  }, [vai]);

  const schermata = useMemo(() => {
    switch (fase) {
      case 'domanda':
        return <StepDomanda onRisposto={(f) => { setScelta(f); vai('risposta'); }} />;
      case 'risposta':
        return scelta
          ? <StepRisposta scelta={scelta} onAvanti={() => vai('ruota')} />
          : null;
      case 'ruota':
        return <StepRuota onVinto={(s) => { setPremio(s); vai('rivelazione'); }} />;
      case 'rivelazione':
        return <StepRivelazione premio={premio} onAvanti={() => vai('dati')} />;
      case 'dati':
        return <StepDati onInvia={invia} inCorso={inCorso} errore={errore} />;
      case 'fine':
        return lead ? <StepFine lead={lead} onRicomincia={ricomincia} /> : null;
    }
  }, [fase, scelta, premio, lead, inCorso, errore, invia, vai, ricomincia]);

  /*
   * Indietro solo dal modulo. Dalla risposta non si torna: la domanda è una
   * sola e non c'è un secondo tentativo — è la regola del documento, e una
   * freccia che la aggira la smonterebbe senza dirlo a nessuno.
   */
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
          <motion.div
            key={fase}
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
