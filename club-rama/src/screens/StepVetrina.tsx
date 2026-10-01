import { motion } from 'framer-motion';
import { PrimaryButton } from '../components/PrimaryButton';
import showroom from '../foto/showroom.jpg';
import lavoro1 from '../foto/lavoro1.webp';
import lavoro2 from '../foto/lavoro2.webp';
import lavoro3 from '../foto/lavoro3.webp';
import lavoro4 from '../foto/lavoro4.webp';
import lavoro5 from '../foto/lavoro5.webp';

/** Le foto dei lavori veri, con la didascalia che c'era sulla prima card. */
const LAVORI = [
  { foto: lavoro1, didascalia: 'Bagno' },
  { foto: lavoro2, didascalia: 'Doppio lavabo' },
  { foto: lavoro3, didascalia: 'Doccia' },
  { foto: lavoro4, didascalia: 'Zona lavabo' },
  { foto: lavoro5, didascalia: 'Vasca' },
];

/** Velo scuro sul fondo della foto: la didascalia si legge su qualunque scatto. */
const VELO = 'linear-gradient(0deg, rgba(15,14,9,.70) 0%, rgba(15,14,9,.04) 58%)';

/**
 * La vetrina: showroom e lavori, come nella prima versione della card, prima
 * di chiedere qualsiasi cosa. Chi tocca la card vede prima chi è Rama, poi
 * gioca.
 */
export function StepVetrina({ onAvanti }: { onAvanti: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        className="relative overflow-hidden rounded-card shadow-card"
      >
        <img src={showroom} alt="Lo showroom Rama Ceramiche a Lugo"
          className="h-[228px] w-full object-cover" loading="eager" />
        <div aria-hidden className="absolute inset-0" style={{ background: VELO }} />
        <span className="absolute bottom-3 left-4 text-[11px] font-semibold uppercase tracking-[.11em] text-white/85">
          Showroom — Lugo
        </span>
      </motion.div>

      <h2 className="mb-3 mt-7 text-headline">I nostri lavori</h2>

      {/* Il binario esce dal margine della colonna: l'ultima foto tagliata dal
          bordo dice che ce n'è dell'altra, senza bisogno di una freccia. */}
      <div className="overflow-x-auto pb-1"
        style={{
          // Niente scroll-snap: aggancia la prima foto e il binario nasce già
          // scorso, con il rientro mangiato. Scorrimento libero, come una
          // striscia di fotografie sul tavolo.
          scrollbarWidth: 'none',
          marginInline: '-24px', paddingInline: '24px',
        }}>
        <div className="flex gap-3">
          {LAVORI.map((l, i) => (
            <motion.figure
              key={l.didascalia}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 30, delay: 0.05 + i * 0.05 }}
              className="relative m-0 h-[166px] w-[132px] shrink-0 overflow-hidden rounded-campo shadow-card"
            >
              <img src={l.foto} alt={l.didascalia} className="h-full w-full object-cover"
                loading={i < 2 ? 'eager' : 'lazy'} />
              <div aria-hidden className="absolute inset-0" style={{ background: VELO }} />
              <figcaption className="absolute bottom-2 left-2.5 text-[10px] font-semibold uppercase tracking-[.09em] text-white/85">
                {l.didascalia}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>

      <h1 className="mt-9 text-largeTitle">Il tuo credito ti aspetta.</h1>
      <p className="mt-2 text-body text-ink-soft">
        Due domande, un giro di ruota, e il credito è tuo.
      </p>

      <div className="mt-auto pt-7">
        <PrimaryButton onClick={onAvanti}>Ritira il tuo credito</PrimaryButton>
      </div>
    </div>
  );
}
