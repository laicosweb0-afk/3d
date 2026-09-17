import { motion } from 'framer-motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { verdetto, type Fragranza } from '../config/gioco';

type Props = {
  fragranza: Fragranza;
  giuste: number;
  totale: number;
  onAvanti: () => void;
};

/**
 * Com'è andata, e soprattutto: cos'era.
 *
 * Il nome della fragranza è il vero premio di questa schermata — il cliente
 * sta annusando qualcosa da dieci minuti e adesso sa come si chiama e può
 * chiederla in cassa. Il punteggio sta sopra ma resta piccolo: sbagliare tre
 * note su tre non deve sembrare una bocciatura.
 */
export function StepEsito({ fragranza, giuste, totale, onAvanti }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-baseline gap-1"
        >
          <span className="tabular text-[76px] font-bold leading-none tracking-[-0.045em]">{giuste}</span>
          <span className="text-title text-ink-soft">/{totale}</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-3 text-headline"
        >
          {verdetto(giuste, totale)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 w-full rounded-card bg-superficie px-6 py-7 shadow-card ring-1 ring-linea"
        >
          <p className="text-footnote uppercase tracking-[.09em] text-ink-soft">Era</p>
          <p className="mt-2 text-title oro-testo">{fragranza.nome}</p>
          <p className="mt-1 text-footnote text-ink-soft">{fragranza.famiglia}</p>
          <p className="mt-4 text-callout text-ink-soft">{fragranza.ritratto}</p>
        </motion.div>
      </div>

      <div className="mt-auto pt-8">
        <PrimaryButton onClick={onAvanti}>Vai alla ruota</PrimaryButton>
      </div>
    </div>
  );
}
