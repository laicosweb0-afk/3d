import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCoin } from '../components/CreditCoin';
import { Confetti } from '../components/Confetti';
import { PrimaryButton } from '../components/PrimaryButton';
import { VALIDITA_GIORNI } from '../config/game';

export function StepRivelazione({ credito, onAvanti }: { credito: number; onAvanti: () => void }) {
  const [mostrato, setMostrato] = useState(0);

  // Il numero sale da zero: il credito si guadagna sotto gli occhi.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMostrato(credito);
      return;
    }
    const durata = 900, t0 = performance.now();
    let vivo = true;
    const passo = (ora: number) => {
      if (!vivo) return;
      const t = Math.min(1, (ora - t0) / durata);
      setMostrato(Math.round(credito * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(passo);
    };
    const avvio = setTimeout(() => requestAnimationFrame(passo), 420);
    return () => { vivo = false; clearTimeout(avvio); };
  }, [credito]);

  return (
    <div className="relative flex flex-1 flex-col">
      <Confetti attivi />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <CreditCoin />

        <div className="mt-9 flex items-baseline justify-center gap-1">
          <span className="tabular text-credito">{mostrato}</span>
          <span className="text-title text-ink-soft">€</span>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.45 }}
          className="mt-3 max-w-[15rem] text-body text-ink-soft"
        >
          di credito sul tuo preventivo Rama
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.45 }}
          className="mt-6 text-footnote text-ink-soft/80"
        >
          Valido {VALIDITA_GIORNI} giorni in negozio o online
        </motion.p>
      </div>

      <div className="relative mt-auto">
        <PrimaryButton onClick={onAvanti}>Ritira il credito</PrimaryButton>
      </div>
    </div>
  );
}
