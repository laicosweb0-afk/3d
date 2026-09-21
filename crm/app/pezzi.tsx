import Link from 'next/link';
import type { Azione, ContattoInElenco, Fonte, Priorita } from '@/lib/dominio/tipi';
import { coloreFonte, nomeFonte } from '@/lib/dominio/fonti';
import { nomeFase } from '@/lib/dominio/fasi';
import { ETICHETTA_AZIONE, ETICHETTA_PRIORITA, euro } from '@/lib/dominio/etichette';
import { inRitardo, quando } from '@/lib/formato';
import { completaAzione, posticipaAzione } from './azioni';

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
// bottoni che la chiudono. È il pezzo più importante del CRM.
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

export function RigaContatto({ contatto }: { contatto: ContattoInElenco }) {
  return (
    <Link href={`/contatti/${contatto.id}`} className={`riga cliccabile con-striscia ${contatto.priorita}`} style={{ paddingLeft: 12 }}>
      <span className="cresce">
        <span className="titolo">{contatto.nomeCompleto}</span>
        <span className="sotto">
          {contatto.citta ?? 'città non indicata'}
          {' · '}
          {contatto.prossimaAzione
            ? `${contatto.prossimaAzione.descrizione} — ${quando(contatto.prossimaAzione.scadenza)}`
            : 'nessuna prossima azione'}
        </span>
      </span>
      <Fonte id={contatto.fonte} dettaglio={contatto.fonteDettaglio} />
      <Valore v={contatto.valore} />
      <Fase id={contatto.fase} />
    </Link>
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
