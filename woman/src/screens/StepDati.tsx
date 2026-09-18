import { LeadForm, type DatiModulo } from '../components/LeadForm';
import { CONTATTO_RICHIESTO } from '../config/gioco';

type Props = { onInvia: (d: DatiModulo) => void; inCorso: boolean; errore: string | null };

export function StepDati({ onInvia, inCorso, errore }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="font-serif text-largeTitle">A chi lo intestiamo?</h1>
      <p className="mb-7 mt-2 text-body text-ink-soft">
        {CONTATTO_RICHIESTO === 'uno'
          ? 'Nome e cognome, e dove scriverti quando le fialette sono pronte: email o telefono, uno dei due basta.'
          : 'Nome e cognome, l’email e il numero: il credito viaggia lì.'}
      </p>
      <LeadForm onInvia={onInvia} inCorso={inCorso} errore={errore} />
    </div>
  );
}
