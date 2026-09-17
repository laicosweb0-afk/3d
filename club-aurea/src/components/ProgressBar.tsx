import { motion } from 'framer-motion';

/** Filo d'oro sotto l'header: dice a che punto si è senza chiedere attenzione. */
export function ProgressBar({ passo, totale }: { passo: number; totale: number }) {
  return (
    <div className="h-[2px] w-full bg-linea" role="presentation">
      <motion.div
        className="h-full rounded-pill bg-gradient-to-r from-oro-chiaro via-oro to-oro-scuro"
        initial={false}
        animate={{ width: `${(passo / totale) * 100}%` }}
        transition={{ type: 'spring', stiffness: 220, damping: 32 }}
      />
    </div>
  );
}
