import { useRef, useState } from 'react';
import { Wheel, type WheelHandle } from '../components/Wheel';
import { PrimaryButton } from '../components/PrimaryButton';
import { vittoria } from '../lib/haptics';
import { vittoria as suonoVittoria } from '../lib/suono';

export function StepRuota({ onVinto }: { onVinto: (valore: number) => void }) {
  const ruota = useRef<WheelHandle>(null);
  const [girata, setGirata] = useState(false);
  const [risultato, setRisultato] = useState<number | null>(null);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-largeTitle">Gira la ruota</h1>
      <p className="mt-2 text-body text-ink-soft">Un solo giro. Il credito vale sul tuo preventivo.</p>

      <div className="flex flex-1 items-center justify-center py-2">
        <div className="w-full">
          <Wheel
            ref={ruota}
            disabilitata={girata}
            onRisultato={(v) => {
              setGirata(true);
              setRisultato(v);
              vittoria();
              suonoVittoria();
              // Un respiro con la ruota ferma prima di passare alla rivelazione:
              // il premio si deve vedere dove è caduto.
              setTimeout(() => onVinto(v), 1150);
            }}
          />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {risultato !== null ? `Hai vinto ${risultato} euro di credito.` : ''}
      </p>

      <div className="mt-auto">
        <PrimaryButton
          disabled={girata}
          onClick={() => { setGirata(true); ruota.current?.gira(); }}
        >
          {girata ? 'La ruota sta girando…' : 'Gira'}
        </PrimaryButton>
      </div>
    </div>
  );
}
