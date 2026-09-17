import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/Header';
import { Intro } from './components/Intro';
import { StepVetrina } from './screens/StepVetrina';
import { StepScelta } from './screens/StepScelta';
import { StepRuota } from './screens/StepRuota';
import { StepRivelazione } from './screens/StepRivelazione';
import { StepDati } from './screens/StepDati';
import { StepFine } from './screens/StepFine';
import { AMBIENTI, STILI, generaCodice, scadenza } from './config/game';
import { submitLead, type Lead } from './lib/lead';
import type { DatiModulo } from './components/LeadForm';

type Fase = 'vetrina' | 'ambiente' | 'stile' | 'ruota' | 'rivelazione' | 'dati' | 'fine';

/**
 * I quattro passaggi dichiarati all'utente; rivelazione e fine non contano.
 * La vetrina sta prima del percorso: si guarda, non si compila, e mostrare
 * "0 di 4" farebbe sembrare lunga una cosa che dura un tocco.
 */
const PASSO_DI: Record<Fase, number> = {
  vetrina: 0, ambiente: 1, stile: 2, ruota: 3, rivelazione: 3, dati: 4, fine: 4,
};

export default function App() {
  const [apertura, setApertura] = useState(true);
  const [fase, setFase] = useState<Fase>('vetrina');
  const [avanti, setAvanti] = useState(true);
  const [ambiente, setAmbiente] = useState<string | null>(null);
  const [stile, setStile] = useState<string | null>(null);
  const [credito, setCredito] = useState(0);
  const [lead, setLead] = useState<Lead | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const chiudiApertura = useCallback(() => setApertura(false), []);

  const vai = useCallback((f: Fase, indietro = false) => {
    setAvanti(!indietro);
    setFase(f);
  }, []);

  const etichetta = (lista: typeof AMBIENTI, id: string | null) =>
    lista.find((o) => o.id === id)?.etichetta ?? '';

  const invia = useCallback(async (d: DatiModulo) => {
    setInCorso(true);
    setErrore(null);
    const nuovo: Lead = {
      nome: d.nome,
      email: d.email,
      telefono: d.telefono,
      ambiente: etichetta(AMBIENTI, ambiente),
      stile: etichetta(STILI, stile),
      credito,
      codiceCredito: generaCodice(),
      scadenza: scadenza().toISOString(),
      ritiro: d.ritiro,
      consensoMarketing: d.consenso,
      timestamp: new Date().toISOString(),
      sorgente: 'card-nfc',
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
  }, [ambiente, stile, credito, vai]);

  const ricomincia = useCallback(() => {
    setAmbiente(null); setStile(null); setCredito(0); setLead(null); setErrore(null);
    vai('vetrina', true);
  }, [vai]);

  const schermata = useMemo(() => {
    switch (fase) {
      case 'vetrina':
        return <StepVetrina onAvanti={() => vai('ambiente')} />;
      case 'ambiente':
        return (
          <StepScelta
            titolo="Cosa stai rifacendo?"
            sottotitolo="Due domande veloci, poi giri la ruota."
            opzioni={AMBIENTI} scelta={ambiente} onScegli={setAmbiente}
            onAvanti={() => vai('stile')}
          />
        );
      case 'stile':
        return (
          <StepScelta
            titolo="Che stile ti piace?"
            sottotitolo="Ci serve per consigliarti le collezioni giuste."
            opzioni={STILI} scelta={stile} onScegli={setStile}
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
  }, [fase, ambiente, stile, credito, lead, inCorso, errore, invia, vai, ricomincia]);

  const indietro =
    fase === 'ambiente' ? () => vai('vetrina', true)
    : fase === 'stile' ? () => vai('ambiente', true)
    : fase === 'dati' ? () => vai('rivelazione', true)
    : undefined;

  return (
    <>
    {apertura && <Intro onFine={chiudiApertura} />}
    <div className="flex w-full flex-col" style={{ minHeight: '100dvh' }}>
      <Header
        passo={PASSO_DI[fase]} totale={4}
        mostraContatore={fase !== 'vetrina' && fase !== 'fine'}
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
