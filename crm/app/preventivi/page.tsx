import Link from 'next/link';
import { deposito } from '@/lib/dati';
import {
  ETICHETTA_PERIODO, ETICHETTA_STATO_PREVENTIVO, preventivi as calcolaPreventivi,
  type Periodo, type StatoPreventivoVisto,
} from '@/lib/dati/istantanea';
import { ETICHETTA_INTERESSE, euro } from '@/lib/dominio/etichette';
import { soloData } from '@/lib/formato';
import { Numero } from '../pezzi';

// PREVENTIVI — la sezione che risponde a «quanto ho fuori, e da quanto».
//
// Un preventivo mandato e dimenticato è il modo più comune di perdere un
// lavoro già quasi fatto: il cliente non dice no, smette di rispondere. Qui
// si vede subito quali stanno per scadere e quali sono scaduti davvero.
//
// «Scaduto» non è uno stato salvato: è la data confrontata con oggi. Uno
// stato salvato invecchia da solo e servirebbe qualcosa che lo aggiorni ogni
// notte; una data domattina è già giusta.

export const dynamic = 'force-dynamic';

const PERIODI: Periodo[] = ['30', 'mese', 'tutto'];
const STATI: StatoPreventivoVisto[] = ['bozza', 'inviato', 'accettato', 'rifiutato', 'scaduto'];

const COLORE_STATO: Record<StatoPreventivoVisto, string> = {
  nessuno: '', bozza: '', inviato: 'da_fare', accettato: 'bene', rifiutato: 'urgente', scaduto: 'urgente',
};

export default async function Preventivi({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; stato?: string }>;
}) {
  const p = await searchParams;
  const periodo = (PERIODI.includes(p.periodo as Periodo) ? p.periodo : 'tutto') as Periodo;
  const stato = STATI.includes(p.stato as StatoPreventivoVisto) ? (p.stato as StatoPreventivoVisto) : null;

  const dati = await (await deposito()).istantanea();
  const tutti = calcolaPreventivi(dati, { periodo });
  const righe = stato ? tutti.filter((r) => r.stato === stato) : tutti;

  const somma = (s: StatoPreventivoVisto) =>
    tutti.filter((r) => r.stato === s).reduce((t, r) => t + r.valore, 0);
  const quanti = (s: StatoPreventivoVisto) => tutti.filter((r) => r.stato === s).length;

  const inGioco = somma('inviato');
  const scaduti = quanti('scaduto');

  const collegamento = (s: StatoPreventivoVisto | null) => {
    const parti = [
      periodo !== 'tutto' ? `periodo=${periodo}` : '',
      s ? `stato=${s}` : '',
    ].filter(Boolean);
    return parti.length ? `/preventivi?${parti.join('&')}` : '/preventivi';
  };

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Preventivi</h1>
          <p className="lede">
            {tutti.length === 0
              ? 'Nessun preventivo registrato.'
              : `${euro(inGioco)} in attesa di risposta${scaduti ? ` · ${scaduti} ${scaduti === 1 ? 'scaduto' : 'scaduti'}` : ''}`}
          </p>
        </div>
        <nav className="azioni-riga" aria-label="Periodo">
          {PERIODI.map((x) => (
            <Link
              key={x}
              href={x === 'tutto' ? (stato ? `/preventivi?stato=${stato}` : '/preventivi') : `/preventivi?periodo=${x}${stato ? `&stato=${stato}` : ''}`}
              className={`voce${periodo === x ? ' attiva' : ''}`}
            >
              {ETICHETTA_PERIODO[x]}
            </Link>
          ))}
        </nav>
      </header>

      <section className="sezione" style={{ marginTop: 0 }}>
        <div className="numeri">
          <Numero etichetta="In attesa" valore={euro(inGioco)} sotto={`${quanti('inviato')} ${quanti('inviato') === 1 ? 'inviato' : 'inviati'}`} />
          <Numero etichetta="Accettati" valore={euro(somma('accettato'))} sotto={`${quanti('accettato')} ${quanti('accettato') === 1 ? 'lavoro preso' : 'lavori presi'}`} />
          <Numero
            etichetta="Scaduti"
            valore={scaduti}
            sotto={scaduti ? `${euro(somma('scaduto'))} da recuperare` : 'nessuno'}
            allarme={scaduti > 0}
          />
          <Numero etichetta="Rifiutati" valore={quanti('rifiutato')} sotto={euro(somma('rifiutato'))} />
        </div>
      </section>

      <section className="sezione">
        <nav className="scorciatoie" aria-label="Stato">
          <Link href={collegamento(null)} className={`scorciatoia${stato ? '' : ' attiva'}`}>Tutti</Link>
          {STATI.map((s) => (
            <Link key={s} href={collegamento(s)} className={`scorciatoia${stato === s ? ' attiva' : ''}`}>
              {ETICHETTA_STATO_PREVENTIVO[s]} {quanti(s) > 0 && <span className="mono">· {quanti(s)}</span>}
            </Link>
          ))}
        </nav>

        <div className="scheda" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tabella-scorri solo-largo">
            <table>
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Cliente</th>
                  <th>Lavoro</th>
                  <th>Inviato</th>
                  <th>Scade</th>
                  <th className="num">Importo</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r) => (
                  <tr key={r.opportunita.id}>
                    <td className="mono">{r.opportunita.numeroPreventivo ?? '—'}</td>
                    <td>
                      <Link href={`/contatti/${r.contatto.id}`}>{r.contatto.nomeCompleto}</Link>
                    </td>
                    <td className="tronca">
                      {r.opportunita.titolo}
                      <span style={{ color: 'var(--ink-3)' }}> · {ETICHETTA_INTERESSE[r.opportunita.interesse]}</span>
                    </td>
                    <td>{r.opportunita.dataPreventivo ? soloData(r.opportunita.dataPreventivo) : '—'}</td>
                    <td>
                      {r.opportunita.scadenzaPreventivo ? soloData(r.opportunita.scadenzaPreventivo) : '—'}
                      {r.stato === 'inviato' && r.giorniAllaScadenza !== null && r.giorniAllaScadenza <= 7 && (
                        <span style={{ color: 'var(--da-fare)' }}>
                          {' '}· fra {r.giorniAllaScadenza} {r.giorniAllaScadenza === 1 ? 'giorno' : 'giorni'}
                        </span>
                      )}
                      {r.stato === 'scaduto' && r.giorniAllaScadenza !== null && (
                        <span style={{ color: 'var(--urgente)' }}>
                          {' '}· da {Math.abs(r.giorniAllaScadenza)} {Math.abs(r.giorniAllaScadenza) === 1 ? 'giorno' : 'giorni'}
                        </span>
                      )}
                    </td>
                    <td className="num euro">{euro(r.valore)}</td>
                    <td>
                      <span className={`pastiglia ${COLORE_STATO[r.stato]}`}>
                        {ETICHETTA_STATO_PREVENTIVO[r.stato]}
                      </span>
                    </td>
                  </tr>
                ))}
                {righe.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ color: 'var(--ink-3)' }}>
                      Nessun preventivo qui. Se ne crea uno dalla scheda di un contatto, sotto l&apos;opportunità:
                      il preventivo è l&apos;offerta di un lavoro, non una cosa che vive per conto suo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Su telefono la tabella non ci sta: stessa lista, vestita da righe. */}
          <div className="solo-stretto" style={{ padding: '0 16px' }}>
            {righe.length === 0 && <p className="elenco-vuoto">Nessun preventivo qui.</p>}
            {righe.map((r) => (
              <div key={r.opportunita.id} className="riga">
                <span className="cresce">
                  <Link href={`/contatti/${r.contatto.id}`} className="titolo">{r.contatto.nomeCompleto}</Link>
                  <span className="sotto">
                    {r.opportunita.numeroPreventivo ?? 'senza numero'} · {r.opportunita.titolo}
                    {r.opportunita.dataPreventivo && <> · {soloData(r.opportunita.dataPreventivo)}</>}
                  </span>
                </span>
                <span className="euro">{euro(r.valore)}</span>
                <span className={`pastiglia ${COLORE_STATO[r.stato]}`}>{ETICHETTA_STATO_PREVENTIVO[r.stato]}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="nota-piede" style={{ marginTop: 10 }}>
          Il preventivo sta sopra il lavoro, non per conto suo: un lavoro ha un&apos;offerta corrente, e se la si
          rifà, la nuova sostituisce la vecchia — il passaggio resta comunque scritto nella storia del contatto.
          <strong> Scaduto</strong> è calcolato dalla data, non salvato: per questo domattina è già giusto senza che
          nessuno faccia niente.
        </p>
      </section>
    </main>
  );
}
