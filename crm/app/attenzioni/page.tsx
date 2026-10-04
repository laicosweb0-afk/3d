import Link from 'next/link';
import { deposito } from '@/lib/dati';
import {
  arricchisci, attenzioni as calcolaAttenzioni, contattiInAttenzione, type ChiaveAttenzione,
} from '@/lib/dati/istantanea';
import { euro } from '@/lib/dominio/etichette';
import { quando } from '@/lib/formato';
import { RigaContatto } from '../pezzi';

// La casa unica degli avvisi. Il CRM se ne accorge da sé: sono regole
// scritte in un file solo (lib/dati/istantanea.ts), non impressioni.
//
// Ogni avviso è una fisarmonica: fuori il nome, quante persone e quanto
// valore; dentro le persone. Chiusa si legge in un colpo d'occhio, aperta si
// lavora. Nessun avviso è stato tolto: ci sono tutti, uno sotto l'altro.

export const dynamic = 'force-dynamic';

// Il nome corto che sta nell'intestazione. La frase lunga — quella che dice
// la soglia — resta dentro, sotto il titolo: è la spiegazione di perché
// quella persona è finita lì.
const NOME_BREVE: Record<ChiaveAttenzione, string> = {
  conversazione_senza_risposta: 'Messaggi senza risposta',
  senza_azione: 'Senza prossima azione',
  azione_scaduta: 'Azioni scadute',
  preventivo_muto: 'Preventivi fermi',
  fermo_da_troppo: 'Fermi da troppo',
  campione_senza_seguito: 'Campioni senza seguito',
  appuntamento_senza_seguito: 'Appuntamenti senza seguito',
  alto_valore_fermo: 'Alto valore fermo',
  possibile_duplicato: 'Possibili doppioni',
};

const persone = (n: number) => `${n} ${n === 1 ? 'persona' : 'persone'}`;

export default async function Attenzioni() {
  const dati = await (await deposito()).istantanea();
  const avvisi = calcolaAttenzioni(dati);
  const soglie = dati.impostazioni.soglie;

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
      <header className="testata-grande">
        <h1>Avvisi</h1>
        <p className="riepilogo">
          {avvisi.length === 0
            ? 'Niente fuori posto. Raro, godiamocelo.'
            : (
              <>
                <span className="adesso">{avvisi.length} {avvisi.length === 1 ? 'cosa' : 'cose'} da sistemare</span>
                {valoreARischio > 0 && ` · ${euro(valoreARischio)} coinvolti`}
              </>
            )}
        </p>
      </header>

      {gruppi.length === 0 && (
        <div className="tutto-fatto">
          <span className="faccia" aria-hidden="true">🎉</span>
          <span className="frase">Non c&apos;è niente da controllare</span>
          <span className="sotto-frase">
            Nessun contatto senza prossima azione, nessun preventivo muto, nessun campione dimenticato.
          </span>
        </div>
      )}

      <section className="sezione">
        {gruppi.map((g, posto) => {
          const valore = g.contatti.reduce((s, c) => s + c.valore, 0);
          return (
            /* La prima è già aperta: chi arriva qui vuole vedere subito la
               cosa più grossa, non toccare un'altra volta. */
            <details key={g.chiave} className="fisarmonica" open={posto === 0}>
              <summary>
                <span className={`segno-avviso ${g.gravita}`} aria-hidden="true" />
                <span className="testo-avviso">
                  <span className="titolo-avviso">{NOME_BREVE[g.chiave]}</span>
                  <span className="conto-avviso">
                    {persone(g.conteggio)}
                    {valore > 0 && <> · <span className="euro">{euro(valore)}</span></>}
                  </span>
                </span>
                <span className="giu" aria-hidden="true">
                  <svg viewBox="0 0 13 8"><path d="m1 1 5.5 5.5L12 1" /></svg>
                </span>
              </summary>

              <div className="dentro">
                <p className="nota-piede" style={{ padding: '10px 0 2px' }}>{g.titolo}</p>
                {g.contatti.slice(0, 8).map((c) => <RigaContatto key={c.id} contatto={c} />)}
                {g.contatti.length > 8 && (
                  <p className="nota-piede" style={{ padding: '10px 0 2px' }}>
                    <Link href={`/contatti?attenzione=${g.chiave}`}>
                      Vedi tutti e {g.contatti.length} →
                    </Link>
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </section>

      {/* Come vengono trovate: le soglie le legge dalle impostazioni, non da
          una frase scritta a mano. Se il titolare porta il silenzio grave a
          21 giorni, qui c'è scritto 21. */}
      <section className="sezione">
        <details className="fisarmonica">
          <summary>
            <span className="testo-avviso">
              <span className="titolo-avviso">Come vengono trovate</span>
              <span className="conto-avviso">Le regole, con i numeri di adesso</span>
            </span>
            <span className="giu" aria-hidden="true">
              <svg viewBox="0 0 13 8"><path d="m1 1 5.5 5.5L12 1" /></svg>
            </span>
          </summary>
          <div className="dentro">
            <dl className="dati" style={{ paddingTop: 12 }}>
              <div><dt>Messaggi senza risposta</dt><dd>Un messaggio arrivato e non letto da più di 4 ore.</dd></div>
              <div><dt>Senza prossima azione</dt><dd>Contatto attivo con nessun promemoria aperto.</dd></div>
              <div><dt>Azione scaduta</dt><dd>La prossima azione ha una data già passata.</dd></div>
              <div><dt>Preventivo senza risposta</dt><dd>Preventivo inviato da più di 5 giorni, e da allora niente.</dd></div>
              <div><dt>Fermo da troppo</dt><dd>Nessuna traccia di contatto da {soglie.silenzioGrave} giorni.</dd></div>
              <div><dt>Campione senza follow-up</dt><dd>Campione consegnato da più di 7 giorni, mai rientrato né richiamato.</dd></div>
              <div><dt>Appuntamento senza seguito</dt><dd>L&apos;incontro è passato e dopo non è stato registrato niente.</dd></div>
              <div><dt>Alto valore fermo</dt><dd>Sopra {euro(soglie.valoreAlto)} e zitto da più di {soglie.silenzioLungo} giorni.</dd></div>
              <div><dt>Possibili doppioni</dt><dd>Due schede con lo stesso telefono o la stessa email.</dd></div>
            </dl>
            <p className="nota-piede" style={{ marginTop: 12 }}>
              Le soglie si cambiano in <Link href="/impostazioni">Impostazioni</Link>: è un numero, non una riscrittura.
            </p>
          </div>
        </details>
      </section>

      <p className="nota-piede">
        Ultimo controllo: {quando(new Date().toISOString())} — le attenzioni si ricalcolano a ogni apertura della pagina.
      </p>
    </main>
  );
}
