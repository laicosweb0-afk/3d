import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCoin } from '../components/CreditCoin';
import { Confetti } from '../components/Confetti';
import { PrimaryButton } from '../components/PrimaryButton';
import { PREMIO, type Spicchio } from '../config/gioco';
import { conteggio, vittoria as notifica } from '../lib/suono';
import { vittoria as vittoriaAptica } from '../lib/haptics';

/**
 * Il credito che sale da zero.
 *
 * Il numero è sempre lo stesso — 15 € per tutti — e questo non toglie niente
 * al momento: quello che si guarda non è quanto si è vinto, è che si è vinto.
 * La riga sotto dice subito come si ritira, perché è lì che il premio diventa
 * un secondo ordine invece di un buono dimenticato.
 */
export function StepRivelazione({
  premio, onAvanti,
}: { premio: Spicchio; onAvanti: () => void }) {
  const [mostrato, setMostrato] = useState(0);
  const [festa, setFesta] = useState(false);
  const [ridotto] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (ridotto) {
      setMostrato(premio.valore);
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
      setMostrato(Math.round(premio.valore * avanzamento));

      const tacca = Math.floor(avanzamento * TACCHE);
      if (tacca > ultimaTacca && tacca < TACCHE) {
        ultimaTacca = tacca;
        conteggio(avanzamento);
      }

      if (t < 1) requestAnimationFrame(passo);
      else {
        setFesta(true);
        notifica();
        vittoriaAptica();
      }
    };
    const avvio = setTimeout(() => requestAnimationFrame(passo), 420);
    return () => { vivo = false; clearTimeout(avvio); };
  }, [premio.valore, ridotto]);

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
          transition={{ delay: ridotto ? 0 : 1.95, duration: 0.45 }}
          className="mt-3 max-w-[17rem] font-serif text-title"
        >
          in {PREMIO.fialette} fialette
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: ridotto ? 0 : 2.1, duration: 0.45 }}
          className="mt-2 max-w-[17rem] text-body text-ink-soft"
        >
          Tre da {PREMIO.taglio} €, da ritirare con il tuo prossimo ordine.
        </motion.p>

        {/* L'omaggio in più, quando lo spicchio ce l'ha. Sta qui e non sulla
            ruota perché in mezzo al giro non lo leggerebbe nessuno. */}
        {premio.extra && (
          <motion.p
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: ridotto ? 0 : 2.35, type: 'spring', stiffness: 260, damping: 20 }}
            className="mt-5 rounded-pill bg-magenta/[.10] px-4 py-2 text-callout font-semibold text-magenta-scuro"
          >
            {premio.extra}
          </motion.p>
        )}
      </div>

      <div className="relative mt-auto">
        <PrimaryButton onClick={onAvanti}>Intestalo a me</PrimaryButton>
      </div>
    </div>
  );
}
