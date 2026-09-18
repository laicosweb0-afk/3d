import { motion } from 'framer-motion';
import { Boccetta } from '../components/Boccetta';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  CONSIGLI, ESITO, OSPITE, PERCENTUALI, famigliaDi, type Fragranza,
} from '../config/gioco';

type Props = {
  /** La famiglia che ha scelto il cliente. */
  scelta: string;
  onAvanti: () => void;
};

/**
 * La rivelazione: cos'era, di chi è, cosa c'è dentro.
 *
 * Due esiti, nessuno dei quali è una sconfitta. Chi ha centrato la famiglia
 * riceve un riconoscimento; chi ha sentito altro riceve una spiegazione — e
 * da qui in poi quello che ha sentito **diventa il criterio** con cui Woman
 * gli sceglie le tre fialette. Per una profumeria è il servizio più prezioso
 * che ci sia, e costa meno di uno sconto.
 */
export function StepRisposta({ scelta, onAvanti }: Props) {
  const centrato = scelta === OSPITE.famiglia;
  const esito = centrato ? ESITO.centrato : ESITO.altrove;
  const famiglia = famigliaDi(scelta);
  const consigli = CONSIGLI[scelta] ?? [];
  const percentuale = PERCENTUALI?.[scelta];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          className="relative flex items-center justify-center"
        >
          <span
            aria-hidden
            className="absolute h-36 w-36 rounded-full blur-2xl"
            style={{ background: 'radial-gradient(circle, rgba(189,58,102,.26), transparent 70%)' }}
          />
          <Boccetta size={108} immagine={OSPITE.immagine} nome={OSPITE.nome} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="kicker mt-5"
        >
          {esito.titolo}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="mt-2 font-serif text-title"
        >
          {OSPITE.nome}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mt-1 text-footnote text-ink-tenue"
        >
          {OSPITE.maison}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
        >
          {OSPITE.note.map((n) => (
            <span key={n}
              className="rounded-pill bg-magenta/[.08] px-3 py-1 text-footnote text-magenta-scuro">
              {n}
            </span>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="mt-5 max-w-[19rem] text-body text-ink-soft"
        >
          {esito.riga(OSPITE as Fragranza)}
        </motion.p>

        {/* La percentuale compare solo se esiste davvero. Finché nessuno ha
            giocato, quel numero non c'è: inventarlo sarebbe l'unica bugia di
            tutta l'esperienza, e per giunta in bocca al negozio. */}
        {percentuale !== undefined && famiglia && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="mt-3 text-footnote text-ink-tenue"
          >
            Il {percentuale}% ha risposto come te: {famiglia.etichetta.toLowerCase()}.
          </motion.p>
        )}
      </div>

      {/* Chi ha sentito altro si porta a casa una consulenza, non una
          correzione: sono le tre fialette che partono da quello che ha
          sentito lui. */}
      {!centrato && consigli.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.45 }}
          className="mt-7 rounded-card bg-superficie p-5 shadow-card ring-1 ring-linea"
        >
          <p className="kicker">Allora ti proponiamo queste</p>
          <p className="mt-2 text-footnote text-ink-soft">
            Tre fialette {famiglia?.plurale}, scelte su quello che hai sentito.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {consigli.map((c) => (
              <li key={c.nome} className="flex gap-3">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-magenta" />
                <span>
                  <span className="block text-callout font-semibold">{c.nome}</span>
                  <span className="block text-footnote text-ink-tenue">{c.riga}</span>
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <div className="mt-auto pt-8">
        <PrimaryButton onClick={onAvanti}>Ritira il credito</PrimaryButton>
      </div>
    </div>
  );
}
