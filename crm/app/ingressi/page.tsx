import Link from 'next/link';
import { deposito, modoDati } from '@/lib/dati';
import { ETICHETTA_PERIODO, ingressi as calcolaIngressi, type Periodo } from '@/lib/dati/istantanea';
import { coloreFonte } from '@/lib/dominio/fonti';
import { euro } from '@/lib/dominio/etichette';

// Da dove arrivano le persone, e — la domanda vera — quali fonti portano
// lavoro, non solo messaggi.

export const dynamic = 'force-dynamic';

const PERIODI: Periodo[] = ['7', '30', 'mese', 'tutto'];

export default async function Ingressi({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const p = await searchParams;
  const periodo = (PERIODI.includes(p.periodo as Periodo) ? p.periodo : '30') as Periodo;

  const dati = await (await deposito()).istantanea();
  const righe = calcolaIngressi(dati, periodo).filter((r) => r.lead > 0);
  const totali = righe.reduce(
    (s, r) => ({
      lead: s.lead + r.lead,
      qualificati: s.qualificati + r.qualificati,
      preventivi: s.preventivi + r.preventivi,
      ordini: s.ordini + r.ordini,
      valorePreventivi: s.valorePreventivi + r.valorePreventivi,
      valoreOrdini: s.valoreOrdini + r.valoreOrdini,
    }),
    { lead: 0, qualificati: 0, preventivi: 0, ordini: 0, valorePreventivi: 0, valoreOrdini: 0 },
  );
  const massimo = Math.max(...righe.map((r) => r.lead), 1);

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Ingressi</h1>
          <p className="lede">
            {totali.lead} persone entrate, {totali.ordini} arrivate all&apos;ordine.
          </p>
        </div>
        <nav className="azioni-riga" aria-label="Periodo">
          {PERIODI.map((x) => (
            <Link key={x} href={x === '30' ? '/ingressi' : `/ingressi?periodo=${x}`} className={`voce${periodo === x ? ' attiva' : ''}`}>
              {ETICHETTA_PERIODO[x]}
            </Link>
          ))}
        </nav>
      </header>

      {modoDati() === 'demo' && (
        <p className="avviso giallo">
          Questi numeri vengono dai dati di esempio. L&apos;impianto è quello vero: appena i contatti reali entreranno
          dalle quattro porte, la tabella si riempirà da sé.
        </p>
      )}

      <section className="sezione" style={{ marginTop: 0 }}>
        <h2>Cosa porta ogni fonte</h2>
        <div className="scheda" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tabella-scorri">
            <table>
              <thead>
                <tr>
                  <th>Fonte</th>
                  <th className="num">Lead</th>
                  <th className="num">Qualificati</th>
                  <th className="num">Preventivi</th>
                  <th className="num">Ordini</th>
                  <th className="num">Valore preventivi</th>
                  <th className="num">Valore ordini</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((r) => (
                  <tr key={r.fonte}>
                    <td>
                      <Link href={`/contatti?fonte=${r.fonte}`} className="fonte">
                        <span className="punto" style={{ background: coloreFonte(r.fonte) }} aria-hidden="true" />
                        {r.nome}
                      </Link>
                    </td>
                    <td className="num">{r.lead}</td>
                    <td className="num">{r.qualificati}</td>
                    <td className="num">{r.preventivi}</td>
                    <td className="num" style={{ color: r.ordini ? 'var(--bene)' : undefined }}>{r.ordini}</td>
                    <td className="num">{r.valorePreventivi ? euro(r.valorePreventivi) : '—'}</td>
                    <td className="num">{r.valoreOrdini ? euro(r.valoreOrdini) : '—'}</td>
                  </tr>
                ))}
                {righe.length === 0 && (
                  <tr><td colSpan={7} style={{ color: 'var(--ink-3)' }}>Nessun ingresso in questo periodo.</td></tr>
                )}
              </tbody>
              {righe.length > 0 && (
                <tfoot>
                  <tr>
                    <td style={{ color: 'var(--ink-3)' }}>Totale</td>
                    <td className="num">{totali.lead}</td>
                    <td className="num">{totali.qualificati}</td>
                    <td className="num">{totali.preventivi}</td>
                    <td className="num">{totali.ordini}</td>
                    <td className="num">{euro(totali.valorePreventivi)}</td>
                    <td className="num">{euro(totali.valoreOrdini)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </section>

      <section className="sezione">
        <h2>Quanto pesa ciascuna</h2>
        <div className="scheda">
          <div className="imbuto">
            {righe.map((r) => (
              <Link key={r.fonte} href={`/contatti?fonte=${r.fonte}`} className="gradino">
                <span className="nome">{r.nome}</span>
                <span className="barra-valore" aria-hidden="true">
                  <span
                    className="riempimento"
                    style={{ width: `${Math.round((r.lead / massimo) * 100)}%`, background: coloreFonte(r.fonte) }}
                  />
                </span>
                <span className="conta">{r.lead}</span>
                <span className="valore">
                  {r.lead ? `${Math.round((r.ordini / r.lead) * 100)}% a ordine` : '—'}
                </span>
              </Link>
            ))}
          </div>
          <p className="nota-piede" style={{ marginTop: 12, marginBottom: 0 }}>
            La barra è il numero di persone; a destra quante di quelle sono arrivate all&apos;ordine. Una fonte che
            porta tanti messaggi e nessun ordine costa tempo, non lo fa guadagnare.
          </p>
        </div>
      </section>
    </main>
  );
}
