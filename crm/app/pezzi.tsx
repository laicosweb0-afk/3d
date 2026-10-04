import Link from 'next/link';
import type { Azione, ContattoInElenco, Fonte, Priorita } from '@/lib/dominio/tipi';
import { coloreFonte, nomeFonte } from '@/lib/dominio/fonti';
import { nomeFase } from '@/lib/dominio/fasi';
import { ETICHETTA_AZIONE, ETICHETTA_PRIORITA, euro } from '@/lib/dominio/etichette';
import { inRitardo, quando } from '@/lib/formato';
import { completaAzione, posticipaAzione } from './azioni';
import { ContattoScorribile } from './interattivi';

// I pezzi che tornano in più pagine. Stanno qui perché una pastiglia di
// priorità deve avere lo stesso aspetto e lo stesso significato ovunque.

export function Priorita({ valore }: { valore: Priorita }) {
  return <span className={`pastiglia ${valore}`}>{ETICHETTA_PRIORITA[valore]}</span>;
}

export function Fonte({ id, dettaglio }: { id: Fonte; dettaglio?: string | null }) {
  return (
    <span className="fonte" title={dettaglio ?? undefined}>
      <span className="punto" style={{ background: coloreFonte(id) }} aria-hidden="true" />
      {nomeFonte(id)}
    </span>
  );
}

export function Fase({ id }: { id: ContattoInElenco['fase'] }) {
  return <span className="pastiglia">{nomeFase(id)}</span>;
}

export function Valore({ v }: { v: number | null }) {
  if (!v) return <span className="euro" style={{ color: 'var(--ink-3)' }}>—</span>;
  return <span className="euro">{euro(v)}</span>;
}

// Una voce della coda operativa: cosa fare, per chi, entro quando, e i tre
// bottoni che la chiudono.
//
// In Oggi al suo posto c'è ora <CartaAzione> (app/interattivi.tsx): stessa
// roba, un pulsante solo in vista e gli altri due nello swipe e nel menu
// «•••». Questa resta qui, funzionante, perché non si butta via niente senza
// dirlo: se la forma vecchia serve da qualche parte, è ancora importabile.
export function VoceDaFare({
  azione, contatto, compatta = false,
}: {
  azione: Azione;
  contatto: ContattoInElenco;
  compatta?: boolean;
}) {
  const ritardo = inRitardo(azione.scadenza);

  return (
    <div className={`riga con-striscia ${contatto.priorita}`} style={{ paddingLeft: 12, alignItems: 'flex-start' }}>
      <div className="cresce">
        <span className="titolo">{azione.descrizione}</span>
        <span className="sotto">
          {ETICHETTA_AZIONE[azione.tipo]} · <Link href={`/contatti/${contatto.id}`}>{contatto.nomeCompleto}</Link>
          {contatto.valore > 0 && <> · {euro(contatto.valore)}</>}
          {' · '}
          <span style={{ color: ritardo ? 'var(--urgente)' : undefined }}>
            {ritardo ? `in ritardo, era ${quando(azione.scadenza)}` : quando(azione.scadenza)}
          </span>
        </span>
        {!compatta && (
          <div className="azioni-riga" style={{ marginTop: 9 }}>
            <form action={completaAzione}>
              <input type="hidden" name="id" value={azione.id} />
              <input type="hidden" name="contatto_id" value={contatto.id} />
              <button type="submit" className="bottone-piccolo">Completato</button>
            </form>
            <form action={posticipaAzione}>
              <input type="hidden" name="id" value={azione.id} />
              <input type="hidden" name="contatto_id" value={contatto.id} />
              <input type="hidden" name="giorni" value="2" />
              <button type="submit" className="bottone-fantasma bottone-piccolo">Posticipa 2 giorni</button>
            </form>
            <Link href={`/contatti/${contatto.id}`} className="bottone bottone-fantasma bottone-piccolo">
              Apri contatto
            </Link>
          </div>
        )}
      </div>
      <Priorita valore={contatto.priorita} />
    </div>
  );
}

// La card di un contatto, uguale in ogni elenco: tre righe e basta.
//
//   riga 1 — il nome, e l'importo a destra
//   riga 2 — città · prossima azione
//   riga 3 — da dove arriva (pallino + parola) e a che punto è (pastiglia)
//
// Lo swipe a destra chiama, a sinistra apre WhatsApp. Il tocco apre la
// scheda, come prima.
export function RigaContatto({ contatto }: { contatto: ContattoInElenco }) {
  return (
    <ContattoScorribile telefono={contatto.telefono} nome={contatto.nomeCompleto}>
      <Link href={`/contatti/${contatto.id}`} className="carta-contatto">
        <span className="riga1">
          <span className="nome">{contatto.nomeCompleto}</span>
          <Valore v={contatto.valore} />
        </span>
        <span className="riga2">
          {contatto.citta ?? 'città non indicata'}
          {' · '}
          {contatto.prossimaAzione
            ? `${contatto.prossimaAzione.descrizione} — ${quando(contatto.prossimaAzione.scadenza)}`
            : 'nessuna prossima azione'}
        </span>
        <span className="riga3">
          <Fonte id={contatto.fonte} dettaglio={contatto.fonteDettaglio} />
          <Fase id={contatto.fase} />
        </span>
      </Link>
    </ContattoScorribile>
  );
}

export function Numero({
  etichetta, valore, sotto, allarme = false, href,
}: {
  etichetta: string;
  valore: string | number;
  sotto?: string;
  allarme?: boolean;
  href?: string;
}) {
  const dentro = (
    <>
      <span className="eti">{etichetta}</span>
      <span className="val">{valore}</span>
      {sotto && <span className="sotto">{sotto}</span>}
    </>
  );
  const classe = `numero${allarme ? ' allarme' : ''}`;
  return href ? <Link href={href} className={classe}>{dentro}</Link> : <div className={classe}>{dentro}</div>;
}

// ---------------------------------------------------------------------------
// I quattro pulsanti rotondi della scheda, come in Contatti su iPhone.
// Se il dato non c'è il pulsante non sparisce: diventa grigio, dice
// «Aggiungi» e porta ai dati, dove si scrive.
// ---------------------------------------------------------------------------
const ICONE_CONTATTO = {
  telefono: <path d="M6.2 3.5h3l1.3 3.4-2 1.4a11.5 11.5 0 0 0 5.2 5.2l1.4-2 3.4 1.3v3c0 .9-.7 1.7-1.7 1.7A14.7 14.7 0 0 1 4.5 5.2c0-1 .8-1.7 1.7-1.7Z" />,
  whatsapp: <path d="M4.5 19.5 5.7 16a7.6 7.6 0 1 1 2.9 2.8l-4.1.7Zm4.9-6.3c.8 1.7 2 2.6 3.4 3.2.8.3 1.4.1 1.8-.3l.5-.7-1.8-1-.6.7a5 5 0 0 1-1.9-1.9l.7-.6-1-1.8-.7.5c-.5.4-.6 1-.4 1.9Z" />,
  email: <><rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2" /><path d="m4 7 8 5.6L20 7" /></>,
  messaggio: <path d="M20.5 11.6c0 3.6-3.8 6.5-8.5 6.5-.9 0-1.8-.1-2.6-.3L4.5 19.5l1.2-3.1a6.3 6.3 0 0 1-2.2-4.8C3.5 8 7.3 5.1 12 5.1s8.5 2.9 8.5 6.5Z" />,
} as const;

function Tondo({
  genere, etichetta, href, esterno = false,
}: {
  genere: keyof typeof ICONE_CONTATTO;
  etichetta: string;
  href: string | null;
  esterno?: boolean;
}) {
  const manca = href === null;
  return (
    <a
      className={`tondo${manca ? ' vuoto' : ''}`}
      href={manca ? '#dati' : href}
      target={esterno && !manca ? '_blank' : undefined}
      rel={esterno && !manca ? 'noopener' : undefined}
    >
      <span className="cerchio" aria-hidden="true">
        <svg viewBox="0 0 24 24">{ICONE_CONTATTO[genere]}</svg>
      </span>
      {manca ? 'Aggiungi' : etichetta}
    </a>
  );
}

export function TastiTondi({ telefono, email }: { telefono: string | null; email: string | null }) {
  const numero = telefono?.replace(/[^\d+]/g, '') || '';
  return (
    <div className="tondi">
      <Tondo genere="telefono" etichetta="Chiama" href={numero ? `tel:${numero}` : null} />
      <Tondo genere="whatsapp" etichetta="WhatsApp" esterno href={numero ? `https://wa.me/${numero.replace(/^\+/, '')}` : null} />
      <Tondo genere="email" etichetta="Email" href={email ? `mailto:${email}` : null} />
      <Tondo genere="messaggio" etichetta="Messaggio" href={numero ? `sms:${numero}` : null} />
    </div>
  );
}
