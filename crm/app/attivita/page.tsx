import Link from 'next/link';
import { deposito } from '@/lib/dati';
import {
  ETICHETTA_PERIODO, attivita as calcolaAttivita,
  type GenereAttivita, type Periodo,
} from '@/lib/dati/istantanea';
import { ETICHETTA_AZIONE, ETICHETTA_EVENTO, euro } from '@/lib/dominio/etichette';
import { dataOra, soloData } from '@/lib/formato';
import type { TipoAzione, TipoEvento } from '@/lib/dominio/tipi';

// ATTIVITÀ — tutto quello che è successo, in un posto solo.
//
// Il CRM tiene due tabelle diverse perché rispondono a due domande diverse:
// gli eventi dicono «cos'è successo», le azioni dicono «cosa devo fare».
// Ma chi cerca «cosa è successo martedì» non deve sapere che sono due
// tabelle — le vede in fila, in ordine di tempo.

export const dynamic = 'force-dynamic';

const PERIODI: Periodo[] = ['oggi', '7', '30', 'mese', 'tutto'];

const GIORNO = (iso: string) => iso.slice(0, 10);

export default async function Attivita({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; genere?: string; contatto?: string }>;
}) {
  const p = await searchParams;
  const periodo = (PERIODI.includes(p.periodo as Periodo) ? p.periodo : '30') as Periodo;
  const genere = p.genere === 'evento' || p.genere === 'azione' ? (p.genere as GenereAttivita) : null;
  const contattoId = p.contatto || null;

  const dati = await (await deposito()).istantanea();
  const voci = calcolaAttivita(dati, { periodo, genere, contattoId });
  const persona = contattoId ? dati.contatti.find((c) => c.id === contattoId) : null;

  // Raggruppate per giorno: è così che si ricorda una settimana di lavoro.
  const giorni = new Map<string, typeof voci>();
  for (const v of voci) {
    const g = GIORNO(v.quando);
    if (!giorni.has(g)) giorni.set(g, []);
    giorni.get(g)!.push(v);
  }

  const fatte = voci.filter((v) => v.genere === 'azione' && v.fatta).length;
  const daFare = voci.filter((v) => v.genere === 'azione' && v.fatta === false).length;

  const link = (cambi: Record<string, string | null>) => {
    const base: Record<string, string | null> = {
      periodo: periodo === '30' ? null : periodo,
      genere,
      contatto: contattoId,
      ...cambi,
    };
    const q = Object.entries(base)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return q ? `/attivita?${q}` : '/attivita';
  };

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Attività</h1>
          <p className="lede">
            {persona
              ? <>Tutto quello che è successo con <strong>{`${persona.nome} ${persona.cognome}`.trim()}</strong>.</>
              : <>{voci.length} {voci.length === 1 ? 'cosa' : 'cose'} · {fatte} {fatte === 1 ? 'azione fatta' : 'azioni fatte'}{daFare > 0 && <> · {daFare} ancora aperte</>}</>}
          </p>
        </div>
        <nav className="azioni-riga" aria-label="Periodo">
          {PERIODI.map((x) => (
            <Link key={x} href={link({ periodo: x === '30' ? null : x })} className={`voce${periodo === x ? ' attiva' : ''}`}>
              {ETICHETTA_PERIODO[x]}
            </Link>
          ))}
        </nav>
      </header>

      <section className="sezione" style={{ marginTop: 0 }}>
        <nav className="scorciatoie" aria-label="Genere">
          <Link href={link({ genere: null })} className={`scorciatoia${genere ? '' : ' attiva'}`}>Tutto</Link>
          <Link href={link({ genere: 'evento' })} className={`scorciatoia${genere === 'evento' ? ' attiva' : ''}`}>
            Cos&apos;è successo
          </Link>
          <Link href={link({ genere: 'azione' })} className={`scorciatoia${genere === 'azione' ? ' attiva' : ''}`}>
            Cosa è stato deciso
          </Link>
          {persona && (
            <Link href={link({ contatto: null })} className="scorciatoia">
              ✕ togli il filtro su {persona.nome}
            </Link>
          )}
        </nav>

        {voci.length === 0 && (
          <div className="scheda">
            <p className="elenco-vuoto" style={{ padding: 0 }}>
              Niente in questo periodo. Le attività si scrivono dalla scheda di un contatto — «Nuova attività» —
              oppure nascono da sole quando arriva un messaggio o si completa un promemoria.
            </p>
          </div>
        )}

        {[...giorni.entries()].map(([giorno, delGiorno]) => (
          <div key={giorno} style={{ marginBottom: 14 }}>
            <h2 style={{ marginBottom: 8 }}>{soloData(giorno)}</h2>
            <div className="scheda scheda-fitta">
              {delGiorno.map((v) => (
                <div key={v.id} className="riga">
                  <span
                    className="punto"
                    style={{
                      background: v.genere === 'azione'
                        ? (v.fatta ? 'var(--bene)' : 'var(--da-fare)')
                        : 'var(--blu)',
                      borderRadius: v.genere === 'azione' ? '50%' : 2,
                    }}
                    aria-hidden="true"
                  />
                  <span className="cresce">
                    <span className="titolo">{v.descrizione}</span>
                    <span className="sotto">
                      {v.genere === 'evento'
                        ? ETICHETTA_EVENTO[v.tipo as TipoEvento]
                        : `${ETICHETTA_AZIONE[v.tipo as TipoAzione]} — ${v.fatta ? 'fatta' : 'da fare'}`}
                      {' · '}
                      <Link href={`/contatti/${v.contatto.id}`}>{v.contatto.nomeCompleto}</Link>
                      {' · '}{dataOra(v.quando)}
                      {v.automatico && ' · scritto dal CRM'}
                    </span>
                  </span>
                  {v.valore ? <span className="euro">{euro(v.valore)}</span> : null}
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="nota-piede">
          Il pallino tondo è un promemoria — giallo se è ancora da fare, verde se è stato fatto. Il quadratino è
          una cosa successa davvero: un messaggio, una telefonata, un preventivo, una consegna. Quelle marcate
          «scritto dal CRM» le ha registrate il programma da sé, non una persona.
        </p>
      </section>
    </main>
  );
}
