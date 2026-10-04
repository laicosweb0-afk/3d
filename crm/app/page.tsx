import Link from 'next/link';
import { deposito } from '@/lib/dati';
import {
  attenzioni as calcolaAttenzioni, conversazioniDaRispondere, daFare, elenco,
} from '@/lib/dati/istantanea';
import { ETICHETTA_CANALE } from '@/lib/dominio/campagne';
import { LogoCanale } from './loghi';
import { ETICHETTA_AZIONE, euro } from '@/lib/dominio/etichette';
import { dataOra, inRitardo, quando } from '@/lib/formato';
import { segnaConversazione } from './azioni';
import { CartaAzione, FrecciaDestra } from './interattivi';

// La home risponde a una domanda sola: cosa faccio adesso.
//
// Tutto quello che risponde a un'altra domanda è stato spostato dove quella
// domanda si fa: i numeri stanno in Numeri, gli avvisi in Avvisi, chi è
// appena arrivato sta nei Contatti. Niente è sparito — in fondo c'è una
// riga per ognuno — ma non è più davanti agli occhi di chi deve solo
// sapere chi chiamare adesso.
//
// E il rosso: una cosa in scadenza oggi non è in ritardo. Il rosso parte dal
// primo giorno di ritardo vero, se no è rosso dappertutto e non vuol dire
// più niente.

export const dynamic = 'force-dynamic';

// Il saluto è l'ora di Roma, non quella del server.
function saluto(): string {
  const ora = Number(new Date().toLocaleString('it-IT', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' }));
  if (ora < 12) return 'Buongiorno';
  if (ora < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

const cose = (n: number) => (n === 1 ? '1 cosa' : `${n} cose`);

export default async function Oggi({
  searchParams,
}: {
  searchParams: Promise<{ vetrina?: string }>;
}) {
  const parametri = await searchParams;

  const dati = await (await deposito()).istantanea();
  const coda = daFare(dati, 3);
  const adesso = coda.filter((v) => inRitardo(v.azione.scadenza) || v.priorita === 'urgente');
  const dopo = coda.filter((v) => !adesso.includes(v));
  const quantiAvvisi = calcolaAttenzioni(dati).reduce((s, a) => s + a.conteggio, 0);
  const maiSentiti = elenco(dati, { fase: 'nuovo', ordine: 'recenti' });
  // Un messaggio senza risposta viene prima di tutto: quello lì è già stato
  // pagato, e sta aspettando. Se ne mostrano tre, il resto sta in Avvisi.
  const daRispondere = conversazioniDaRispondere(dati);

  // La riga sotto il saluto: una frase, non un bollettino.
  const riepilogo = adesso.length > 0
    ? `${cose(adesso.length)} da fare adesso`
    : dopo.length > 0
      ? `Niente di urgente · ${dopo.length} nei prossimi giorni`
      : 'Niente in scadenza nei prossimi giorni';

  return (
    <main>
      <header className="testata-grande">
        <h1>{saluto()}</h1>
        <p className="riepilogo"><span className="adesso">{riepilogo}</span></p>
      </header>

      {parametri.vetrina === 'bloccato' && (
        <div className="avviso-vetrina">
          <span className="faccia" aria-hidden="true">👀</span>
          <span className="testo">
            <strong>Questa copia si guarda e basta.</strong> Gira dove vuoi, apri tutto, non c&apos;è
            niente da rompere: le modifiche qui non vengono salvate.
          </span>
        </div>
      )}

      <section className="sezione" style={{ marginTop: 4 }}>
        {adesso.length === 0 ? (
          <div className="tutto-fatto">
            <span className="faccia" aria-hidden="true">🎉</span>
            <span className="frase">Tutto fatto per oggi</span>
            <span className="sotto-frase">
              {dopo.length > 0 ? 'Qui sotto c’è cosa arriva nei prossimi giorni.' : 'Niente in calendario.'}
            </span>
          </div>
        ) : adesso.map((v) => (
          <CartaAzione
            key={v.azione.id}
            azioneId={v.azione.id}
            contattoId={v.contatto.id}
            cosa={v.azione.descrizione}
            scadenza={v.azione.scadenza}
            /* In scadenza oggi non è in ritardo: il rosso parte da domani. */
            scaduto={v.giorniDiRitardo >= 1}
            scadutoDa={v.giorniDiRitardo}
            chi={(
              <>
                <span>{v.contatto.nomeCompleto}</span>
                {v.contatto.valore > 0 && <span className="euro">{euro(v.contatto.valore)}</span>}
                {v.giorniDiRitardo < 1 && <span>{quando(v.azione.scadenza)}</span>}
              </>
            )}
          />
        ))}
      </section>

      {daRispondere.length > 0 && (
        <section className="sezione">
          <h2>Messaggi senza risposta</h2>
          <div className="scheda scheda-fitta">
            {daRispondere.slice(0, 3).map(({ conversazione: f, contatto }) => (
              <div key={f.id} className="riga">
                <span className="cresce">
                  <Link href={`/contatti/${contatto.id}`} className="titolo">
                    <LogoCanale id={f.canale} />
                    {`${contatto.nome} ${contatto.cognome}`.trim()}
                  </Link>
                  <span className="sotto">
                    {ETICHETTA_CANALE[f.canale]} · {dataOra(f.ultimoMessaggioIl)}
                    {f.ultimoMessaggioTesto ? ` · «${f.ultimoMessaggioTesto.slice(0, 60)}»` : ''}
                  </span>
                </span>
                <form action={segnaConversazione}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="contatto_id" value={contatto.id} />
                  <input type="hidden" name="stato" value="gestita" />
                  <button type="submit" className="bottone-fantasma bottone-piccolo">Ho risposto</button>
                </form>
              </div>
            ))}
            {daRispondere.length > 3 && (
              <p className="nota-piede" style={{ padding: '10px 0 2px' }}>
                <Link href="/attenzioni">Vedi tutti e {daRispondere.length} →</Link>
              </p>
            )}
          </div>
        </section>
      )}

      {/* I prossimi giorni non sono il lavoro di adesso: stanno piegati, a un
          tocco. Aperti occupavano metà schermo per cose che non si fanno. */}
      {dopo.length > 0 && (
        <section className="sezione">
          <details className="fisarmonica">
            <summary>
              <span className="testo-avviso">
                <span className="titolo-avviso">Prossimi giorni</span>
                <span className="conto-avviso">{cose(dopo.length)} in calendario</span>
              </span>
              <span className="giu" aria-hidden="true">
                <svg viewBox="0 0 13 8"><path d="m1 1 5.5 5.5L12 1" /></svg>
              </span>
            </summary>
            <div className="dentro">
          {dopo.map((v) => (
            <CartaAzione
              key={v.azione.id}
              azioneId={v.azione.id}
              contattoId={v.contatto.id}
              cosa={v.azione.descrizione}
              scadenza={v.azione.scadenza}
              scaduto={false}
              scadutoDa={0}
              compatta
              chi={(
                <>
                  <span>{v.contatto.nomeCompleto}</span>
                  {v.contatto.valore > 0 && <span className="euro">{euro(v.contatto.valore)}</span>}
                  <span>{quando(v.azione.scadenza)}</span>
                  <span className="pastiglia">{ETICHETTA_AZIONE[v.azione.tipo]}</span>
                </>
              )}
            />
          ))}
            </div>
          </details>
        </section>
      )}

      {/* Il resto della casa, in fondo e senza allarmi. Sono le stesse cose
          di prima: hanno solo smesso di mettersi davanti al lavoro. */}
      <section className="sezione">
        <h2>Il resto</h2>
        <div className="lista-ios">
          <Link className="voce-ios" href="/attenzioni">
            Da controllare
            <span className="conto-ios">{quantiAvvisi}</span>
            <FrecciaDestra />
          </Link>
          <Link className="voce-ios" href="/contatti?fase=nuovo&ordine=recenti">
            Arrivati e mai sentiti
            <span className="conto-ios">{maiSentiti.length}</span>
            <FrecciaDestra />
          </Link>
          <Link className="voce-ios" href="/analisi">
            I numeri del periodo
            <span className="conto-ios" />
            <FrecciaDestra />
          </Link>
        </div>
      </section>
    </main>
  );
}
