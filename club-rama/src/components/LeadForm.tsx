import { useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { SegmentedControl } from './SegmentedControl';

export type Ritiro = 'negozio' | 'email' | 'whatsapp';
export type DatiModulo = {
  nome: string; email: string; telefono: string; ritiro: Ritiro; consenso: boolean;
};

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Restano solo le cifre: spazi, punti e trattini li scrive chi vuole. */
const soleCifre = (v: string) => v.replace(/\D/g, '');

type Props = { onInvia: (d: DatiModulo) => void; inCorso: boolean; errore: string | null };

export function LeadForm({ onInvia, inCorso, errore }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ritiro, setRitiro] = useState<Ritiro | null>(null);
  const [consenso, setConsenso] = useState(false);
  const [toccato, setToccato] = useState<Record<string, boolean>>({});

  const cifre = soleCifre(telefono);
  const nomeOk = nome.trim().length >= 2;
  const emailOk = EMAIL_OK.test(email.trim());
  // Un cellulare italiano ha nove o dieci cifre. Largo di manica sotto e
  // sopra: chi scrive il prefisso o un fisso non deve trovarsi bloccato.
  const telefonoOk = cifre.length >= 9 && cifre.length <= 13;
  const valido = nomeOk && emailOk && telefonoOk && ritiro !== null;

  const erroreNome = toccato.nome && !nomeOk ? 'Scrivi il tuo nome, bastano due lettere.' : null;
  const erroreEmail = toccato.email && !emailOk
    ? (email.trim() === '' ? "Ci serve un'email per mandarti il codice." : "Controlla l'indirizzo: manca qualcosa.")
    : null;
  const erroreTelefono = toccato.telefono && !telefonoOk
    ? (cifre.length === 0 ? 'Ci serve il numero per scriverti su WhatsApp.' : 'Controlla il numero: sembra incompleto.')
    : null;

  const segna = (campo: string) => () => setToccato((t) => ({ ...t, [campo]: true }));

  return (
    <form
      className="flex flex-1 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setToccato({ nome: true, email: true, telefono: true });
        if (valido && ritiro) {
          onInvia({
            nome: nome.trim(), email: email.trim(),
            telefono: `+39 ${cifre}`, ritiro, consenso,
          });
        }
      }}
    >
      <Campo id="nome" etichetta="Nome" valore={nome} onChange={setNome}
        onBlur={segna('nome')} errore={erroreNome}
        autoComplete="given-name" placeholder="Il tuo nome" />

      <Campo id="email" etichetta="Email" tipo="email" valore={email} onChange={setEmail}
        onBlur={segna('email')} errore={erroreEmail}
        autoComplete="email" inputMode="email" placeholder="nome@esempio.it" />

      <Campo id="telefono" etichetta="Telefono" tipo="tel" valore={telefono} onChange={setTelefono}
        onBlur={segna('telefono')} errore={erroreTelefono}
        autoComplete="tel" inputMode="tel" placeholder="333 123 4567" prefisso="+39" />

      <div className="pt-1">
        <p className="mb-2 text-footnote text-ink-soft">Come vuoi ritirarlo</p>
        <SegmentedControl
          label="Modalità di ritiro del credito"
          voci={[
            { id: 'negozio', etichetta: 'In negozio' },
            { id: 'email', etichetta: 'Email' },
            { id: 'whatsapp', etichetta: 'WhatsApp' },
          ]}
          valore={ritiro}
          onChange={setRitiro}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 pt-1">
        <input type="checkbox" checked={consenso} onChange={(e) => setConsenso(e.target.checked)}
          className="mt-[2px] h-5 w-5 shrink-0 accent-[#C9A54E]" />
        <span className="text-footnote leading-[19px] text-ink-soft">
          Voglio ricevere novità e offerte di Rama Ceramiche.{' '}
          <a href="#privacy" className="underline underline-offset-2">Informativa privacy</a>
        </span>
      </label>

      <div className="mt-auto pt-4">
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
  id, etichetta, valore, onChange, onBlur, errore, tipo = 'text', prefisso, ...resto
}: {
  id: string; etichetta: string; valore: string; onChange: (v: string) => void;
  onBlur: () => void; errore: string | null; tipo?: string; prefisso?: string;
  autoComplete?: string; inputMode?: 'email' | 'tel'; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-footnote text-ink-soft">{etichetta}</label>
      <div
        className={[
          'flex items-stretch overflow-hidden rounded-campo bg-superficie',
          'ring-1 transition-shadow duration-200',
          errore ? 'ring-[#E0A0A0]' : 'ring-linea focus-within:ring-oro',
        ].join(' ')}
      >
        {prefisso && (
          <span className="flex select-none items-center border-r border-linea px-4 text-body text-ink-soft">
            {prefisso}
          </span>
        )}
        <input
          id={id} type={tipo} value={valore} onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!errore} aria-describedby={errore ? `${id}-errore` : undefined}
          className="min-h-[52px] w-full bg-transparent px-4 text-body outline-none placeholder:text-ink-soft/55"
          {...resto}
        />
      </div>
      {errore && <p id={`${id}-errore`} className="mt-2 text-footnote text-[#B3261E]">{errore}</p>}
    </div>
  );
}
