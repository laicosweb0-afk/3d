import { useState } from 'react';
import { motion } from 'framer-motion';
import { OptionCard, type StatoRisposta } from '../components/OptionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { CONFERMA, CONSOLAZIONE, type Domanda } from '../config/gioco';
import { giusta as giustaAptica, tocco } from '../lib/haptics';
import { giusta as giustaSuono, pop, tocco as toccoSuono } from '../lib/suono';

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
 * sbaglio.
 *
 * Dopo la conferma la schermata non cambia: resta lì, con la nota giusta
 * accesa e accanto quella scelta, se era un'altra. È il momento in cui si
 * impara qualcosa, e vale più del punto.
 *
 * **Da qui non si esce mai bocciati.** Non c'è un rosso, non c'è una croce e
 * non c'è la parola «sbagliato»: chi ha scelto un'altra nota si sente dire
 * perché quelle due si somigliano — cosa vera, non una pacca sulla spalla — e
 * il credito arriva comunque. Il punteggio serve a raccontare la fragranza,
 * non a meritarsi lo sconto.
 */
export function StepQuiz({ domanda, indice, totale, onRisposto }: Props) {
  const [scelta, setScelta] = useState<string | null>(null);
  const [chiusa, setChiusa] = useState(false);

  const esatta = scelta === domanda.giusta;

  const conferma = () => {
    if (!scelta) return;
    setChiusa(true);
    if (scelta === domanda.giusta) { giustaSuono(); giustaAptica(); }
    // Una nota diversa non merita il suono del «no»: un tocco morbido, e
    // si va avanti. Il rimprovero, anche solo in due note, si sente.
    else { toccoSuono(); tocco(); }
  };

  const stato = (id: string): StatoRisposta => {
    if (!chiusa) return scelta === id ? 'scelta' : 'neutro';
    if (id === domanda.giusta) return 'giusta';
    if (id === scelta) return 'tua';
    return 'spenta';
  };

  /** La riga scritta apposta per quella nota, se c'è; se no, quella generica. */
  const commento = esatta
    ? CONFERMA
    : (scelta && domanda.vicine?.[scelta]) || CONSOLAZIONE;

  const etichettaGiusta =
    domanda.opzioni.find((o) => o.id === domanda.giusta)?.etichetta ?? '';

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2">
        <span className="rounded-pill bg-oro/[.18] px-2.5 py-1 text-footnote font-semibold text-ink">
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
        {chiusa ? `${commento} La nota era ${etichettaGiusta}.` : ''}
      </p>

      <div className="mt-auto pt-8">
        {chiusa && (
          <motion.p
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-3 text-center text-callout text-ink-soft"
          >
            {commento}
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
