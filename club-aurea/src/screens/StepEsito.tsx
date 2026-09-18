import { motion } from 'framer-motion';
import { Boccetta } from '../components/Boccetta';
import { PrimaryButton } from '../components/PrimaryButton';
import { chiosa, verdetto, type Fragranza } from '../config/gioco';

type Props = {
  fragranza: Fragranza;
  giuste: number;
  totale: number;
  onAvanti: () => void;
};

/**
 * Com'è andata, e soprattutto: **cos'era**.
 *
 * Il nome della fragranza è il vero premio di questa schermata — il cliente
 * sta annusando qualcosa da qualche minuto e adesso sa come si chiama e può
 * chiederla in cassa. Per questo il nome sta in grande con la sua boccetta,
 * e il punteggio è una riga piccola sotto il titolo.
 *
 * Il punteggio non è una pagella: anche a zero note prese il titolo parla
 * del naso di chi gioca e non dei suoi errori. Il credito, intanto, è già suo
 * — non è mai dipeso da queste tre risposte.
 */
export function StepEsito({ fragranza, giuste, totale, onAvanti }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-footnote uppercase tracking-[.09em] text-ink-soft"
        >
          Era
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="mt-2 text-largeTitle oro-testo"
        >
          {fragranza.nome}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-1 text-footnote text-ink-soft"
        >
          {fragranza.famiglia}
        </motion.p>

        <div className="relative my-2 flex items-center justify-center">
          <motion.span
            aria-hidden
            className="absolute h-44 w-44 rounded-full blur-2xl"
            style={{ background: 'radial-gradient(circle, rgba(201,165,78,.30), transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Qui la foto ci sta: il nome è già scoperto, non svela più niente. */}
          <Boccetta size={132} immagine={fragranza.immagine} nome={fragranza.nome} />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.45 }}
          className="max-w-[17rem] text-body text-ink-soft"
        >
          {fragranza.ritratto}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.45 }}
          className="mt-7"
        >
          <p className="text-headline">{verdetto(giuste, totale)}</p>
          <p className="mt-1 text-footnote text-ink-soft">{chiosa(giuste, totale)}</p>
        </motion.div>
      </div>

      <div className="mt-auto pt-6">
        <PrimaryButton onClick={onAvanti}>Vai alla ruota</PrimaryButton>
      </div>
    </div>
  );
}
