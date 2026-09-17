import { LeadForm, type DatiModulo } from '../components/LeadForm';

type Props = { onInvia: (d: DatiModulo) => void; inCorso: boolean; errore: string | null };

export function StepDati({ onInvia, inCorso, errore }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-largeTitle">Dove ti mandiamo il credito?</h1>
      <p className="mb-7 mt-2 text-body text-ink-soft">Lo usi quando chiedi il preventivo.</p>
      <LeadForm onInvia={onInvia} inCorso={inCorso} errore={errore} />
    </div>
  );
}
