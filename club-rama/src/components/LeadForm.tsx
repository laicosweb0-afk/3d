import { useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { SegmentedControl } from './SegmentedControl';

export type Ritiro = 'negozio' | 'email';
export type DatiModulo = { nome: string; email: string; ritiro: Ritiro; consenso: boolean };

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

type Props = {
  onInvia: (d: DatiModulo) => void;
  inCorso: boolean;
  errore: string | null;
};

export function LeadForm({ onInvia, inCorso, errore }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [ritiro, setRitiro] = useState<Ritiro | null>(null);
  const [consenso, setConsenso] = useState(false);
  const [toccato, setToccato] = useState<{ nome?: boolean; email?: boolean }>({});

  const nomeOk = nome.trim().length >= 2;
  const emailOk = EMAIL_OK.test(email.trim());
  const valido = nomeOk && emailOk && ritiro !== null;

  const erroreNome = toccato.nome && !nomeOk ? 'Scrivi il tuo nome, bastano due lettere.' : null;
  const erroreEmail = toccato.email && !emailOk
    ? (email.trim() === '' ? 'Ci serve un indirizzo per mandarti il codice.' : "Controlla l'indirizzo: manca qualcosa.")
    : null;

  return (
    <form
      className="flex flex-1 flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setToccato({ nome: true, email: true });
        if (valido && ritiro) onInvia({ nome: nome.trim(), email: email.trim(), ritiro, consenso });
      }}
    >
      <Campo
        id="nome" etichetta="Nome" valore={nome} onChange={setNome}
        onBlur={() => setToccato((t) => ({ ...t, nome: true }))}
        errore={erroreNome} autoComplete="given-name" placeholder="Il tuo nome"
      />
      <Campo
        id="email" etichetta="Email" tipo="email" valore={email} onChange={setEmail}
        onBlur={() => setToccato((t) => ({ ...t, email: true }))}
        errore={erroreEmail} autoComplete="email" inputMode="email" placeholder="nome@esempio.it"
      />

      <div>
        <p className="mb-2 text-footnote text-ink-soft">Come vuoi ritirarlo</p>
        <SegmentedControl
          label="Modalità di ritiro del credito"
          voci={[{ id: 'negozio', etichetta: 'In negozio' }, { id: 'email', etichetta: 'Via email' }]}
          valore={ritiro}
          onChange={setRitiro}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 pt-1">
        <input
          type="checkbox" checked={consenso} onChange={(e) => setConsenso(e.target.checked)}
          className="mt-[2px] h-5 w-5 shrink-0 accent-[#C9A54E]"
        />
        <span className="text-footnote leading-[19px] text-ink-soft">
          Voglio ricevere novità e offerte di Rama Ceramiche via email.{' '}
          <a href="#privacy" className="underline underline-offset-2">Informativa privacy</a>
        </span>
      </label>

      <div className="mt-auto pt-2">
        {errore && (
          <p role="alert" className="mb-3 rounded-campo bg-[#FDECEC] px-4 py-3 text-footnote text-[#B3261E]">
            {errore}
          </p>
        )}
        <PrimaryButton type="submit" disabled={!valido} loading={inCorso}>
          {inCorso ? 'Un attimo…' : 'Ricevi il credito'}
        </PrimaryButton>
      </div>
    </form>
  );
}

function Campo({
  id, etichetta, valore, onChange, onBlur, errore, tipo = 'text', ...resto
}: {
  id: string; etichetta: string; valore: string; onChange: (v: string) => void;
  onBlur: () => void; errore: string | null; tipo?: string;
  autoComplete?: string; inputMode?: 'email'; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-footnote text-ink-soft">{etichetta}</label>
      <input
        id={id} type={tipo} value={valore} onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!errore} aria-describedby={errore ? `${id}-errore` : undefined}
        className={[
          'min-h-[52px] w-full rounded-campo bg-superficie px-4 text-body',
          'ring-1 transition-shadow duration-200 placeholder:text-ink-soft/55',
          errore ? 'ring-[#E0A0A0]' : 'ring-linea focus:ring-oro',
        ].join(' ')}
        {...resto}
      />
      {errore && <p id={`${id}-errore`} className="mt-2 text-footnote text-[#B3261E]">{errore}</p>}
    </div>
  );
}
