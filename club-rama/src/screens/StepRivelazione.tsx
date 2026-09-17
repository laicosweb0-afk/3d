import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCoin } from '../components/CreditCoin';
import { Confetti } from '../components/Confetti';
import { PrimaryButton } from '../components/PrimaryButton';
import { VALIDITA_GIORNI } from '../config/game';
import { conteggio, vittoria as notifica } from '../lib/suono';
import { vittoria as vittoriaAptica } from '../lib/haptics';

export function StepRivelazione({ credito, onAvanti }: { credito: number; onAvanti: () => void }) {
  const [mostrato, setMostrato] = useState(0);
  const [festa, setFesta] = useState(false);

  // Il numero sale da zero: il credito si guadagna sotto gli occhi.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMostrato(credito);
      setFesta(true);
      notifica();
      return;
    }
    const durata = 1500, t0 = performance.now();
    // Una tacca ogni sedicesimo di corsa: abbastanza da sentire il totale
    // salire, non tante da diventare un ronzio.
    const TACCHE = 16;
    let ultimaTacca = -1;
    let vivo = true;
    const passo = (ora: number) => {
      if (!vivo) return;
      const t = Math.min(1, (ora - t0) / durata);
      const avanzamento = 1 - Math.pow(1 - t, 3);
      setMostrato(Math.round(credito * avanzamento));

      const tacca = Math.floor(avanzamento * TACCHE);
      if (tacca > ultimaTacca && tacca < TACCHE) {
        ultimaTacca = tacca;
        conteggio(avanzamento);
      }

      if (t < 1) requestAnimationFrame(passo);
      else {
        // Il totale è lì: adesso la notifica, con la vibrazione piena.
        // I coriandoli cadono sulla notifica, non all'ingresso: prima si
        // guarda il numero salire, poi si festeggia il totale.
        setFesta(true);
        notifica();
        vittoriaAptica();
      }
    };
    const avvio = setTimeout(() => requestAnimationFrame(passo), 420);
    return () => { vivo = false; clearTimeout(avvio); };
  }, [credito]);

  return (
    <div className="relative flex flex-1 flex-col">
      <Confetti attivi={festa} />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <CreditCoin />

        <div className="mt-9 flex items-baseline justify-center gap-1">
          <span className="tabular text-credito">{mostrato}</span>
          <span className="text-title text-ink-soft">€</span>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.95, duration: 0.45 }}
          className="mt-3 max-w-[15rem] text-body text-ink-soft"
        >
          di credito sul tuo preventivo Rama
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 2.15, duration: 0.45 }}
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
