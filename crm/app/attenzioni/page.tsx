import Link from 'next/link';
import { deposito } from '@/lib/dati';
import { arricchisci, attenzioni as calcolaAttenzioni, contattiInAttenzione } from '@/lib/dati/istantanea';
import { euro } from '@/lib/dominio/etichette';
import { quando } from '@/lib/formato';
import { RigaContatto } from '../pezzi';

// Quello che sta per sfuggire di mano. Il CRM se ne accorge da sé: sono
// regole scritte in un file solo (lib/dati/istantanea.ts), non impressioni.

export const dynamic = 'force-dynamic';

export default async function Attenzioni() {
  const dati = await (await deposito()).istantanea();
  const avvisi = calcolaAttenzioni(dati);

  const gruppi = avvisi.map((a) => ({
    ...a,
    contatti: contattiInAttenzione(dati, a.chiave)
      .map((c) => arricchisci(dati, c))
      .sort((x, y) => y.valore - x.valore),
  }));

  const valoreARischio = gruppi
    .flatMap((g) => g.contatti)
    .filter((c, i, tutti) => tutti.findIndex((x) => x.id === c.id) === i)
    .reduce((s, c) => s + c.valore, 0);

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Attenzioni</h1>
          <p className="lede">
            {avvisi.length === 0
              ? 'Niente fuori posto. Raro, godiamocelo.'
              : `${avvisi.length} ${avvisi.length === 1 ? 'cosa' : 'cose'} da sistemare · ${euro(valoreARischio)} coinvolti.`}
          </p>
        </div>
      </header>

      {gruppi.length === 0 && (
        <div className="scheda">
          <p className="elenco-vuoto">
            Nessun contatto senza prossima azione, nessun preventivo muto, nessun campione dimenticato.
          </p>
        </div>
      )}

      {gruppi.map((g) => (
        <section key={g.chiave} className="sezione" style={{ marginTop: 20 }}>
          <div className={`avviso ${g.gravita === 'alta' ? 'rosso' : 'giallo'}`} style={{ marginBottom: 8 }}>
            {g.gravita === 'alta' ? '▲' : '●'} {g.titolo}
          </div>
          <div className="scheda scheda-fitta">
            {g.contatti.slice(0, 8).map((c) => <RigaContatto key={c.id} contatto={c} />)}
            {g.contatti.length > 8 && (
              <p className="nota-piede" style={{ padding: '10px 0 2px' }}>
                <Link href={`/contatti?attenzione=${g.chiave}`}>
                  Vedi tutti e {g.contatti.length} →
                </Link>
              </p>
            )}
          </div>
        </section>
      ))}

      <section className="sezione">
        <h2>Come vengono trovate</h2>
        <div className="scheda">
          <dl className="dati">
            <div><dt>Senza prossima azione</dt><dd>Contatto attivo con nessun promemoria aperto.</dd></div>
            <div><dt>Azione scaduta</dt><dd>La prossima azione ha una data già passata.</dd></div>
            <div><dt>Preventivo senza risposta</dt><dd>Preventivo inviato da più di 5 giorni, e da allora niente.</dd></div>
            <div><dt>Fermo da troppo</dt><dd>Nessuna traccia di contatto da 14 giorni.</dd></div>
            <div><dt>Campione senza follow-up</dt><dd>Campione consegnato da più di 7 giorni, mai rientrato né richiamato.</dd></div>
            <div><dt>Appuntamento senza seguito</dt><dd>L&apos;incontro è passato e dopo non è stato registrato niente.</dd></div>
            <div><dt>Alto valore fermo</dt><dd>Sopra 5.000 € e zitto da più di una settimana.</dd></div>
          </dl>
          <p className="nota-piede" style={{ marginTop: 12, marginBottom: 0 }}>
            Le soglie stanno in <code>lib/dominio/priorita.ts</code> e in <code>lib/dati/istantanea.ts</code>: cambiarle
            è cambiare un numero, non riscrivere il CRM.
          </p>
        </div>
      </section>

      <p className="nota-piede">
        Ultimo controllo: {quando(new Date().toISOString())} — le attenzioni si ricalcolano a ogni apertura della pagina.
      </p>
    </main>
  );
}
