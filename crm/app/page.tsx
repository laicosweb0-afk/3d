import Link from 'next/link';
import { deposito } from '@/lib/dati';
import {
  ETICHETTA_PERIODO, analisi as calcolaAnalisi, attenzioni as calcolaAttenzioni,
  contattiInAttenzione, daFare, elenco, type Periodo,
} from '@/lib/dati/istantanea';
import { euro } from '@/lib/dominio/etichette';
import { inRitardo } from '@/lib/formato';
import { Numero, RigaContatto, VoceDaFare } from './pezzi';

// La home risponde a due domande, in quest'ordine: cosa devo fare adesso, e
// cosa sta succedendo. Non è un elenco di persone: è una coda di lavoro.

export const dynamic = 'force-dynamic';

const PERIODI: Periodo[] = ['oggi', '7', '30', 'mese'];

export default async function Oggi({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const parametri = await searchParams;
  const periodo = (PERIODI.includes(parametri.periodo as Periodo) ? parametri.periodo : '30') as Periodo;

  const dati = await (await deposito()).istantanea();
  const coda = daFare(dati, 3);
  const adesso = coda.filter((v) => inRitardo(v.azione.scadenza) || v.priorita === 'urgente');
  const dopo = coda.filter((v) => !adesso.includes(v));
  const numeri = calcolaAnalisi(dati, periodo);
  const avvisi = calcolaAttenzioni(dati).slice(0, 3);
  const senzaAzione = contattiInAttenzione(dati, 'senza_azione').length;
  const maiSentiti = elenco(dati, { fase: 'nuovo', ordine: 'recenti' }).slice(0, 5);

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Oggi</h1>
          <p className="lede">
            {coda.length === 0
              ? 'Niente in scadenza nei prossimi giorni.'
              : `${adesso.length} da fare adesso, ${dopo.length} nei prossimi tre giorni.`}
          </p>
        </div>
        <nav className="azioni-riga" aria-label="Periodo dei numeri">
          {PERIODI.map((p) => (
            <Link
              key={p}
              href={p === '30' ? '/' : `/?periodo=${p}`}
              className={`voce${periodo === p ? ' attiva' : ''}`}
            >
              {ETICHETTA_PERIODO[p]}
            </Link>
          ))}
        </nav>
      </header>

      {avvisi.length > 0 && (
        <section className="sezione" aria-label="Attenzioni">
          {avvisi.map((a) => (
            <Link
              key={a.chiave}
              href={`/contatti?attenzione=${a.chiave}`}
              className={`avviso ${a.gravita === 'alta' ? 'rosso' : 'giallo'}`}
              style={{ display: 'block' }}
            >
              {a.gravita === 'alta' ? '▲' : '●'} {a.titolo} →
            </Link>
          ))}
        </section>
      )}

      <section className="sezione">
        <h2>Da fare adesso</h2>
        <div className="scheda scheda-fitta">
          {adesso.length === 0 && (
            <p className="elenco-vuoto">Niente di urgente. Se hai tempo, guarda cosa arriva domani qui sotto.</p>
          )}
          {adesso.map((v) => (
            <VoceDaFare key={v.azione.id} azione={v.azione} contatto={v.contatto} />
          ))}
        </div>
      </section>

      <div className="colonne">
        <section className="sezione" style={{ marginTop: 26 }}>
          <h2>Nei prossimi giorni</h2>
          <div className="scheda scheda-fitta">
            {dopo.length === 0 && <p className="elenco-vuoto">Niente in calendario.</p>}
            {dopo.map((v) => (
              <VoceDaFare key={v.azione.id} azione={v.azione} contatto={v.contatto} compatta />
            ))}
          </div>
        </section>

        <section className="sezione" style={{ marginTop: 26 }}>
          <h2>Arrivati e mai sentiti</h2>
          <div className="scheda scheda-fitta">
            {maiSentiti.length === 0 && <p className="elenco-vuoto">Nessun lead in attesa: buon segno.</p>}
            {maiSentiti.map((c) => <RigaContatto key={c.id} contatto={c} />)}
          </div>
        </section>
      </div>

      <section className="sezione">
        <h2>Il quadro · {ETICHETTA_PERIODO[periodo].toLowerCase()}</h2>
        <div className="numeri">
          <Numero etichetta="Persone entrate" valore={numeri.ingressi} sotto={`${numeri.qualificati} qualificate`} href="/ingressi" />
          <Numero etichetta="Valore in pipeline" valore={euro(numeri.valorePipeline)} sotto={`${numeri.preventivi} preventivi`} href="/pipeline" />
          <Numero
            etichetta="Ordini chiusi"
            valore={numeri.ordiniChiusi}
            sotto={numeri.ordiniChiusi ? euro(numeri.valoreOrdiniChiusi) : 'nessuno nel periodo'}
            href="/analisi"
          />
          <Numero
            etichetta="Senza prossima azione"
            valore={senzaAzione}
            sotto={senzaAzione ? 'rischiano di essere dimenticati' : 'nessuno lasciato indietro'}
            allarme={senzaAzione > 0}
            href="/contatti?attenzione=senza_azione"
          />
        </div>
      </section>
    </main>
  );
}
