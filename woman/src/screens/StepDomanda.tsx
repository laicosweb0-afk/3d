import { useState } from 'react';
import { motion } from 'framer-motion';
import { OptionCard, type StatoRisposta } from '../components/OptionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Boccetta } from '../components/Boccetta';
import { DOMANDA, FAMIGLIE, PREMIO } from '../config/gioco';
import { tocco } from '../lib/haptics';
import { pop } from '../lib/suono';

/**
 * L'unica domanda del gioco.
 *
 * È una sola per regola, non per pigrizia: il documento strategico lo mette
 * fra le tre cose permanenti — «ogni domanda in più abbassa i completamenti»
 * — e non c'è un secondo tentativo, o la risposta perde valore come dato.
 *
 * Per lo stesso motivo qui dentro c'è tutto quello che serve: la boccetta, la
 * domanda, le quattro famiglie e la riga sul credito. Una schermata di
 * benvenuto prima di questa sarebbe un passaggio in più fra il cartoncino e
 * l'unica cosa che chiediamo.
 */
export function StepDomanda({ onRisposto }: { onRisposto: (famiglia: string) => void }) {
  const [scelta, setScelta] = useState<string | null>(null);

  const stato = (id: string): StatoRisposta => (scelta === id ? 'scelta' : 'neutro');

  return (
    <div className="flex flex-1 flex-col">
      <p className="kicker">{DOMANDA.kicker}</p>
      <h1 className="mt-2 font-serif text-largeTitle">{DOMANDA.titolo}</h1>
      <p className="mt-2 text-body text-ink-soft">{DOMANDA.sottotitolo}</p>

      {/* La boccetta senza nome: è quella che il cliente ha in mano. Piccola,
          perché qui la protagonista è la domanda. */}
      <div className="relative flex items-center justify-center py-3">
        <motion.span
          aria-hidden
          className="absolute h-32 w-32 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(189,58,102,.26), transparent 70%)' }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <Boccetta size={92} />
      </div>

      <div role="radiogroup" aria-label={DOMANDA.titolo} className="flex flex-col gap-2.5">
        {FAMIGLIE.map((f) => (
          <OptionCard
            key={f.id}
            etichetta={f.etichetta}
            nota={f.nota}
            stato={stato(f.id)}
            onClick={() => { tocco(); pop(); setScelta(f.id); }}
          />
        ))}
      </div>

      <div className="mt-auto pt-6">
        {/* Il patto, in una riga: si gioca sapendo già che il premio arriva.
            Chi lo scopre dopo pensa di essere stato preso in giro. */}
        <p className="mb-3 text-center text-footnote text-ink-tenue">
          {PREMIO.valore} € in {PREMIO.fialette} fialette, comunque vada.
        </p>
        <PrimaryButton onClick={() => scelta && onRisposto(scelta)} disabled={!scelta}>
          {DOMANDA.conferma}
        </PrimaryButton>
      </div>
    </div>
  );
}
