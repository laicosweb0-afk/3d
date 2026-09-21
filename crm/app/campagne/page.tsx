import Link from 'next/link';
import { deposito } from '@/lib/dati';
import { ETICHETTA_PERIODO, campagne as calcolaCampagne, type Periodo } from '@/lib/dati/istantanea';
import { ETICHETTA_CANALE, ETICHETTA_STATO_CAMPAGNA, COLORE_CANALE } from '@/lib/dominio/campagne';
import { euro } from '@/lib/dominio/etichette';
import { Numero } from '../pezzi';

// La domanda a cui questa pagina esiste per rispondere:
// «questa campagna cosa ha prodotto davvero?»
//
// Non impression, non clic: persone, conversazioni, preventivi, ordini, euro.
// Dove un dato non ce l'abbiamo c'è scritto N/D — mai uno zero di comodo.

export const dynamic = 'force-dynamic';

const PERIODI: Periodo[] = ['7', '30', 'mese', 'tutto'];

// Un valore che non conosciamo si scrive così, sempre allo stesso modo.
const ND = <span style={{ color: 'var(--ink-3)' }} title="Dato non disponibile">N/D</span>;

export default async function Campagne({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const p = await searchParams;
  const periodo = (PERIODI.includes(p.periodo as Periodo) ? p.periodo : 'tutto') as Periodo;

  const dati = await (await deposito()).istantanea();
  const righe = calcolaCampagne(dati, periodo);

  const totali = righe.reduce(
    (s, r) => ({
      spesa: r.spesa === null ? s.spesa : s.spesa + r.spesa,
      spesaNota: s.spesaNota && r.spesa !== null,
      contatti: s.contatti + r.contatti,
      conversazioni: s.conversazioni + r.conversazioni,
      lead: s.lead + r.lead,
      preventivi: s.preventivi + r.preventivi,
      ordini: s.ordini + r.ordini,
      valoreOrdini: s.valoreOrdini + r.valoreOrdini,
      valorePreventivi: s.valorePreventivi + r.valorePreventivi,
    }),
    {
      spesa: 0, spesaNota: true, contatti: 0, conversazioni: 0, lead: 0,
      preventivi: 0, ordini: 0, valoreOrdini: 0, valorePreventivi: 0,
    },
  );

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Campagne</h1>
          <p className="lede">
            {righe.length} {righe.length === 1 ? 'campagna' : 'campagne'} · {totali.contatti} persone portate ·{' '}
            {totali.ordini} {totali.ordini === 1 ? 'ordine' : 'ordini'}
          </p>
        </div>
        <div className="azioni-riga">
          <nav className="azioni-riga" aria-label="Periodo">
            {PERIODI.map((x) => (
              <Link key={x} href={x === 'tutto' ? '/campagne' : `/campagne?periodo=${x}`} className={`voce${periodo === x ? ' attiva' : ''}`}>
                {ETICHETTA_PERIODO[x]}
              </Link>
            ))}
          </nav>
          <Link href="/campagne/nuova" className="bottone bottone-oro">+ Nuova campagna</Link>
        </div>
      </header>

      <section className="sezione" style={{ marginTop: 0 }}>
        <div className="numeri">
          <Numero
            etichetta="Spesa"
            valore={totali.spesaNota ? euro(totali.spesa) : `${euro(totali.spesa)}*`}
            sotto={totali.spesaNota ? 'tutte le campagne' : '* alcune campagne non collegate'}
          />
          <Numero etichetta="Conversazioni" valore={totali.conversazioni} sotto="fili aperti dai messaggi" />
          <Numero etichetta="Preventivi" valore={totali.preventivi} sotto={euro(totali.valorePreventivi)} />
          <Numero etichetta="Ordini" valore={totali.ordini} sotto={euro(totali.valoreOrdini)} />
        </div>
      </section>

      <section className="sezione">
        <h2>Cosa ha prodotto ciascuna</h2>
        <div className="scheda" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tabella-scorri">
            <table>
              <thead>
                <tr>
                  <th>Campagna</th>
                  <th className="num">Spesa</th>
                  <th className="num">Contatti</th>
                  <th className="num">Conversaz.</th>
                  <th className="num">Lead</th>
                  <th className="num">Qualificati</th>
                  <th className="num">Preventivi</th>
                  <th className="num">Ordini</th>
                  <th className="num">Valore ordini</th>
                  <th className="num">Costo/ordine</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r) => (
                  <tr key={r.campagna.id}>
                    <td>
                      <Link href={`/campagne/${r.campagna.id}`}>
                        <span className="fonte">
                          <span className="punto" style={{ background: COLORE_CANALE[r.campagna.canaleIngresso] }} aria-hidden="true" />
                          {r.campagna.nome}
                        </span>
                      </Link>
                      <span className="sotto" style={{ display: 'block', color: 'var(--ink-3)', fontSize: 11.5 }}>
                        {ETICHETTA_CANALE[r.campagna.canaleIngresso]} · {ETICHETTA_STATO_CAMPAGNA[r.campagna.stato]}
                      </span>
                    </td>
                    <td className="num">{r.spesa === null ? ND : euro(r.spesa)}</td>
                    <td className="num">{r.contatti}</td>
                    <td className="num">{r.conversazioni}</td>
                    <td className="num">{r.lead}</td>
                    <td className="num">{r.qualificati}</td>
                    <td className="num">{r.preventivi}</td>
                    <td className="num" style={{ color: r.ordini ? 'var(--bene)' : undefined }}>{r.ordini}</td>
                    <td className="num">{r.valoreOrdini ? euro(r.valoreOrdini) : ND}</td>
                    <td className="num">{r.costoPerOrdine === null ? ND : euro(r.costoPerOrdine)}</td>
                  </tr>
                ))}
                {righe.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ color: 'var(--ink-3)' }}>
                      Nessuna campagna registrata. <Link href="/campagne/nuova">Creane una</Link> e collegale i contatti:
                      funziona anche prima che le API di Meta siano attive.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="nota-piede" style={{ marginTop: 10 }}>
          <strong>Contatti</strong>: persone attribuite alla campagna. <strong>Conversazioni</strong>: fili di messaggi
          aperti. <strong>Lead</strong>: quelle che qualcuno ha preso in carico (almeno «contattato»).{' '}
          <strong>N/D</strong>: il dato non ce l&apos;abbiamo — la spesa arriva da Meta solo quando le statistiche
          saranno collegate, oppure si scrive a mano nella scheda della campagna.
        </p>
      </section>
    </main>
  );
}
