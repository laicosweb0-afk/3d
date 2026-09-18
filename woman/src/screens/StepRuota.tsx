import { useRef, useState } from 'react';
import { Wheel, type WheelHandle } from '../components/Wheel';
import { PREMIO, type Spicchio } from '../config/gioco';
import { PrimaryButton } from '../components/PrimaryButton';
import { tocco as toccoAptico } from '../lib/haptics';
import { arresto } from '../lib/suono';

export function StepRuota({ onVinto }: { onVinto: (premio: Spicchio) => void }) {
  const ruota = useRef<WheelHandle>(null);
  const [girata, setGirata] = useState(false);
  const [girata2, setGirata2] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="font-serif text-largeTitle">Gira la ruota</h1>
      <p className="mt-2 text-body text-ink-soft">
        Un giro solo. Ogni spicchio vale {PREMIO.valore} €: qui si vince e basta.
      </p>

      <div className="flex flex-1 items-center justify-center py-2">
        <div className="w-full">
          <Wheel
            ref={ruota}
            disabilitata={girata}
            onRisultato={(s) => {
              setGirata(true);
              setGirata2(true);
              toccoAptico();
              arresto();
              // Il tempo di vedere dove si è posata, non uno di più: la coda
              // della frenata ha già regalato mezzo secondo di ruota immobile.
              setTimeout(() => onVinto(s), 750);
            }}
          />
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {girata2 ? `Hai vinto ${PREMIO.valore} euro in fialette.` : ''}
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
