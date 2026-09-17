import { useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { CONTATTO_RICHIESTO } from '../config/gioco';

export type DatiModulo = { nome: string; email: string; telefono: string; consenso: boolean };

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Restano solo le cifre: spazi, punti e trattini li scrive chi vuole. */
const soleCifre = (v: string) => v.replace(/\D/g, '');

/** Nome e cognome: due parole, non una. Gli accenti e gli apostrofi valgono. */
const NOME_OK = /^[\p{L}'’.-]{2,}(\s+[\p{L}'’.-]{2,})+$/u;

const UNO_BASTA = CONTATTO_RICHIESTO === 'uno';

type Props = { onInvia: (d: DatiModulo) => void; inCorso: boolean; errore: string | null };

export function LeadForm({ onInvia, inCorso, errore }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [consenso, setConsenso] = useState(false);
  const [toccato, setToccato] = useState<Record<string, boolean>>({});

  const cifre = soleCifre(telefono);
  const nomeOk = NOME_OK.test(nome.trim());
  const emailScritta = email.trim() !== '';
  const emailOk = EMAIL_OK.test(email.trim());
  // Un cellulare italiano ha nove o dieci cifre. Largo di manica sotto e
  // sopra: chi scrive il prefisso o un fisso non deve trovarsi bloccato.
  const telefonoOk = cifre.length >= 9 && cifre.length <= 13;

  const contattoOk = UNO_BASTA
    ? (emailScritta ? emailOk : false) || (cifre.length > 0 ? telefonoOk : false)
    : emailOk && telefonoOk;
  const valido = nomeOk && contattoOk;

  const erroreNome = toccato.nome && !nomeOk
    ? (nome.trim() === '' ? 'Scrivi nome e cognome.' : 'Serve anche il cognome.')
    : null;

  // In modalità «uno dei due» un campo vuoto non è un errore: lo diventa solo
  // se sono vuoti tutti e due, e lo dice una riga sola sotto la coppia.
  const erroreEmail = toccato.email && (UNO_BASTA ? emailScritta && !emailOk : !emailOk)
    ? (emailScritta ? 'Controlla l’indirizzo: manca qualcosa.' : 'Ci serve un’email per mandarti il codice.')
    : null;
  const erroreTelefono = toccato.telefono && (UNO_BASTA ? cifre.length > 0 && !telefonoOk : !telefonoOk)
    ? (cifre.length === 0 ? 'Ci serve il numero per scriverti.' : 'Controlla il numero: sembra incompleto.')
    : null;
  const erroreContatto = UNO_BASTA && (toccato.email || toccato.telefono) && !contattoOk
    && !erroreEmail && !erroreTelefono
    ? 'Lasciaci l’email oppure il numero: ci serve per farti avere il codice.'
    : null;

  const segna = (campo: string) => () => setToccato((t) => ({ ...t, [campo]: true }));

  return (
    <form
      className="flex flex-1 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setToccato({ nome: true, email: true, telefono: true });
        if (valido) {
          onInvia({
            nome: nome.trim(),
            email: email.trim(),
            telefono: cifre ? `+39 ${cifre}` : '',
            consenso,
          });
        }
      }}
    >
      <Campo id="nome" etichetta="Nome e cognome" valore={nome} onChange={setNome}
        onBlur={segna('nome')} errore={erroreNome}
        autoComplete="name" placeholder="Giulia Rossi" />

      <Campo id="email" etichetta="Email" tipo="email" valore={email} onChange={setEmail}
        onBlur={segna('email')} errore={erroreEmail}
        autoComplete="email" inputMode="email" placeholder="nome@esempio.it" />

      {UNO_BASTA && (
        <p className="-my-1 text-center text-footnote text-ink-soft/80">oppure</p>
      )}

      <Campo id="telefono" etichetta="Numero di telefono" tipo="tel" valore={telefono}
        onChange={setTelefono}
        onBlur={segna('telefono')} errore={erroreTelefono}
        autoComplete="tel" inputMode="tel" placeholder="333 123 4567" prefisso="+39" />

      {erroreContatto && (
        <p role="alert" className="-mt-1 text-footnote text-[#B3261E]">{erroreContatto}</p>
      )}

      <label className="flex cursor-pointer items-start gap-3 pt-1">
        <input type="checkbox" checked={consenso} onChange={(e) => setConsenso(e.target.checked)}
          className="mt-[2px] h-5 w-5 shrink-0 accent-[#C9A54E]" />
        <span className="text-footnote leading-[19px] text-ink-soft">
          Voglio ricevere novità, anteprime e inviti di Aurea.{' '}
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
