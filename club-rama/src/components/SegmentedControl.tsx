import { motion } from 'framer-motion';
import { tocco } from '../lib/suono';

type Voce<T extends string> = { id: T; etichetta: string };

/** Controllo segmentato come quelli di iOS: la pastiglia bianca scivola. */
export function SegmentedControl<T extends string>({
  voci, valore, onChange, label,
}: { voci: Voce<T>[]; valore: T | null; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label}
      className="relative flex gap-1 rounded-campo bg-ink/[.06] p-1">
      {voci.map((v) => {
        const attiva = valore === v.id;
        return (
          <button
            key={v.id} type="button" role="radio" aria-checked={attiva}
            onClick={() => { tocco(); onChange(v.id); }}
            className="relative flex-1 min-h-[40px] rounded-[11px] text-callout font-medium"
          >
            {attiva && (
              <motion.span layoutId="pastiglia" aria-hidden
                transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                className="absolute inset-0 rounded-[11px] bg-superficie shadow-card" />
            )}
            <span className={`relative ${attiva ? 'text-ink' : 'text-ink-soft'}`}>{v.etichetta}</span>
          </button>
        );
      })}
    </div>
  );
}
