import { motion } from 'framer-motion';

/**
 * La scheda di una risposta. È l'`OptionCard` di Club Rama — stessa altezza
 * minima, stesso raggio, stessa molla, stesso anello d'oro quando è scelta —
 * con due stati in più che là non servivano, perché là non c'era niente da
 * indovinare.
 *
 * - `neutro`  nessuno ha ancora toccato niente
 * - `scelta`  selezionata, ma la domanda è ancora aperta
 * - `giusta`  la nota che c'era davvero, accesa dopo la conferma
 * - `tua`     quella che aveva scelto il cliente, quando era un'altra
 * - `spenta`  una delle altre, dopo la conferma: si tira indietro
 *
 * `tua` non è rossa e non ha una croce. Qui non si viene bocciati: la nota
 * scelta resta segnata con un cerchietto pieno, perché si veda da dove si
 * era partiti, e accanto si accende quella giusta. Il rosso in quest'app
 * vuol dire una cosa sola — un campo del modulo scritto male — e una
 * risposta a naso non è un errore di compilazione.
 */
export type StatoRisposta = 'neutro' | 'scelta' | 'giusta' | 'tua' | 'spenta';

type Props = {
  etichetta: string;
  nota?: string;
  stato: StatoRisposta;
  disabilitata?: boolean;
  onClick: () => void;
};

const CORNICE: Record<StatoRisposta, string> = {
  neutro: 'shadow-card ring-1 ring-linea',
  scelta: 'shadow-rilievo ring-[1.5px] ring-oro',
  giusta: 'shadow-rilievo ring-[1.5px] ring-oro bg-oro/[.08]',
  tua: 'ring-1 ring-linea opacity-80',
  spenta: 'ring-1 ring-linea opacity-55',
};

export function OptionCard({ etichetta, nota, stato, disabilitata, onClick }: Props) {
  const scelta = stato === 'scelta' || stato === 'giusta' || stato === 'tua';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabilitata}
      role="radio"
      aria-checked={scelta}
      whileTap={disabilitata ? undefined : { scale: 0.985 }}
      animate={{ scale: stato === 'scelta' || stato === 'giusta' ? 1.012 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={[
        'flex min-h-[60px] w-full items-center justify-between gap-3 rounded-card px-5 py-3.5 text-left',
        'bg-superficie text-body transition-all duration-200',
        CORNICE[stato],
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className={`block ${scelta ? 'font-semibold' : ''}`}>{etichetta}</span>
        {nota && <span className="mt-0.5 block text-footnote text-ink-soft">{nota}</span>}
      </span>
      <Segno stato={stato} />
    </motion.button>
  );
}

function Segno({ stato }: { stato: StatoRisposta }) {
  const oro = stato === 'scelta' || stato === 'giusta';
  return (
    <span
      aria-hidden
      className={[
        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full',
        'transition-colors duration-200',
        oro ? 'bg-gradient-to-br from-oro-chiaro to-oro-scuro' : 'ring-1 ring-linea',
      ].join(' ')}
    >
      {oro && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.4 4.9 8.8 9.5 3.6" stroke="#fff" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {/* La nota scelta quando ce n'era un'altra: un punto pieno, tenue.
          Dice «eri qui», non «hai sbagliato». */}
      {stato === 'tua' && <span className="h-[9px] w-[9px] rounded-full bg-ink-soft/45" />}
    </span>
  );
}
