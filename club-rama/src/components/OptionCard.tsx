import { motion } from 'framer-motion';

type Props = { etichetta: string; scelta: boolean; onClick: () => void };

export function OptionCard({ etichetta, scelta, onClick }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      role="radio"
      aria-checked={scelta}
      whileTap={{ scale: 0.985 }}
      animate={{ scale: scelta ? 1.012 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={[
        'flex min-h-[60px] w-full items-center justify-between rounded-card px-5 py-4 text-left',
        'bg-superficie text-body transition-shadow duration-200',
        scelta
          ? 'shadow-rilievo ring-[1.5px] ring-oro'
          : 'shadow-card ring-1 ring-linea',
      ].join(' ')}
    >
      <span className={scelta ? 'font-semibold' : ''}>{etichetta}</span>
      <span
        aria-hidden
        className={[
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full',
          'transition-colors duration-200',
          scelta ? 'bg-gradient-to-br from-oro-chiaro to-oro-scuro' : 'ring-1 ring-linea',
        ].join(' ')}
      >
        {scelta && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.4 4.9 8.8 9.5 3.6" stroke="#fff" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </motion.button>
  );
}
