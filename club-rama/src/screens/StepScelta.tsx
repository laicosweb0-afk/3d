import { OptionCard } from '../components/OptionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import type { Opzione } from '../config/game';
import { tocco } from '../lib/haptics';
import { pop } from '../lib/suono';

type Props = {
  titolo: string;
  sottotitolo: string;
  opzioni: Opzione[];
  scelta: string | null;
  onScegli: (id: string) => void;
  onAvanti: () => void;
};

/** Le due domande hanno la stessa forma: una sola schermata le serve entrambe. */
export function StepScelta({ titolo, sottotitolo, opzioni, scelta, onScegli, onAvanti }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-largeTitle">{titolo}</h1>
      <p className="mt-2 text-body text-ink-soft">{sottotitolo}</p>

      <div role="radiogroup" aria-label={titolo} className="mt-7 flex flex-col gap-3">
        {opzioni.map((o) => (
          <OptionCard
            key={o.id} etichetta={o.etichetta} scelta={scelta === o.id}
            onClick={() => { tocco(); pop(); onScegli(o.id); }}
          />
        ))}
      </div>

      <div className="mt-auto pt-8">
        <PrimaryButton onClick={onAvanti} disabled={!scelta}>Continua</PrimaryButton>
      </div>
    </div>
  );
}
