import { useState } from 'react';
import { motion } from 'framer-motion';
import { OptionCard, type StatoRisposta } from '../components/OptionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import type { Domanda } from '../config/gioco';
import { giusta as giustaAptica, sbagliata as sbagliataAptica, tocco } from '../lib/haptics';
import { giusta as giustaSuono, pop, sbagliata as sbagliataSuono } from '../lib/suono';

type Props = {
  domanda: Domanda;
  indice: number;
  totale: number;
  /** Arriva a domanda chiusa, con l'esito: chi sta sopra tiene il punteggio. */
  onRisposto: (esatta: boolean) => void;
};

/**
 * Una domanda del quiz. La risposta si conferma in due tempi — prima la
 * scelta, poi "Conferma" — perché sul telefono un tocco parte anche per
 * sbaglio, e qui il tocco sbagliato costa un punto.
 *
 * Dopo la conferma la schermata non cambia: resta lì, con la risposta giusta
 * accesa e le altre spente. È il momento in cui si impara qualcosa, e vale
 * più del punto.
 */
export function StepQuiz({ domanda, indice, totale, onRisposto }: Props) {
  const [scelta, setScelta] = useState<string | null>(null);
  const [chiusa, setChiusa] = useState(false);

  const esatta = scelta === domanda.giusta;

  const conferma = () => {
    if (!scelta) return;
    setChiusa(true);
    if (scelta === domanda.giusta) { giustaSuono(); giustaAptica(); }
    else { sbagliataSuono(); sbagliataAptica(); }
  };

  const stato = (id: string): StatoRisposta => {
    if (!chiusa) return scelta === id ? 'scelta' : 'neutro';
    if (id === domanda.giusta) return 'giusta';
    if (id === scelta) return 'sbagliata';
    return 'spenta';
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2">
        <span className="rounded-pill bg-magenta/10 px-2.5 py-1 text-footnote font-semibold text-magenta-scuro">
          {domanda.livello}
        </span>
        <span className="text-footnote text-ink-soft tabular">Nota {indice + 1} di {totale}</span>
      </div>

      <h1 className="mt-3 text-largeTitle">{domanda.titolo}</h1>
      <p className="mt-2 text-body text-ink-soft">{domanda.sottotitolo}</p>

      <div role="radiogroup" aria-label={domanda.titolo} className="mt-6 flex flex-col gap-3">
        {domanda.opzioni.map((o) => (
          <OptionCard
            key={o.id}
            etichetta={o.etichetta}
            nota={o.nota}
            stato={stato(o.id)}
            disabilitata={chiusa}
            onClick={() => { tocco(); pop(); setScelta(o.id); }}
          />
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {chiusa ? (esatta ? 'Risposta giusta.' : 'Risposta sbagliata.') : ''}
      </p>

      <div className="mt-auto pt-8">
        {chiusa && (
          <motion.p
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-3 text-center text-callout text-ink-soft"
          >
            {esatta ? 'Esatto, è proprio quella.' : 'Non c’eri. Riannusa, e senti la differenza.'}
          </motion.p>
        )}
        {chiusa ? (
          <PrimaryButton onClick={() => onRisposto(esatta)}>
            {indice + 1 === totale ? 'Vedi com’è andata' : 'Prossima nota'}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={conferma} disabled={!scelta}>Conferma</PrimaryButton>
        )}
      </div>
    </div>
  );
}
