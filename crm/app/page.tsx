import Link from 'next/link';
import { deposito } from '@/lib/dati';
import {
  ETICHETTA_PERIODO, analisi as calcolaAnalisi, attenzioni as calcolaAttenzioni,
  contattiInAttenzione, conversazioniDaRispondere, daFare, elenco, type Periodo,
} from '@/lib/dati/istantanea';
import { ETICHETTA_CANALE } from '@/lib/dominio/campagne';
import { LogoCanale } from './loghi';
import { ETICHETTA_AZIONE, euro } from '@/lib/dominio/etichette';
import { dataOra, inRitardo, quando } from '@/lib/formato';
import { segnaConversazione } from './azioni';
import { CartaAzione } from './interattivi';
import { Numero, RigaContatto } from './pezzi';

// La home risponde a una domanda sola: cosa faccio adesso. Il saluto e la
// riga di riepilogo la rispondono in tre secondi; le card la rispondono con
// un tocco. Tutto il resto — i numeri, i lead mai sentiti, gli avvisi — sta
// sotto o dietro un tocco, ma non è stato toccato: è ancora tutto lì.

export const dynamic = 'force-dynamic';

const PERIODI: Periodo[] = ['oggi', '7', '30', 'mese'];

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
  searchParams: Promise<{ periodo?: string }>;
}) {
  const parametri = await searchParams;
  const periodo = (PERIODI.includes(parametri.periodo as Periodo) ? parametri.periodo : '30') as Periodo;

  const dati = await (await deposito()).istantanea();
  const coda = daFare(dati, 3);
  const adesso = coda.filter((v) => inRitardo(v.azione.scadenza) || v.priorita === 'urgente');
  const dopo = coda.filter((v) => !adesso.includes(v));
  const numeri = calcolaAnalisi(dati, periodo);
  // Tutti gli avvisi, non più solo i primi tre: non si impilano in pagina,
  // si contano in una card sola e si aprono in Attenzioni.
  const avvisi = calcolaAttenzioni(dati);
  const quantiAvvisi = avvisi.reduce((s, a) => s + a.conteggio, 0);
  const senzaAzione = contattiInAttenzione(dati, 'senza_azione').length;
  const maiSentiti = elenco(dati, { fase: 'nuovo', ordine: 'recenti' }).slice(0, 5);
  // Un messaggio senza risposta viene prima di tutto: quello lì è già stato
  // pagato, e sta aspettando.
  const daRispondere = conversazioniDaRispondere(dati);

  return (
    <main>
      <header className="testata-grande">
        <h1>{saluto()}</h1>
        <p className="riepilogo">
          {coda.length === 0 ? (
            'Niente in scadenza nei prossimi giorni.'
          ) : (
            <>
              <span className="adesso">{cose(adesso.length)} da fare adesso</span>
              {dopo.length > 0 && ` · ${dopo.length} nei prossimi giorni`}
            </>
          )}
        </p>
      </header>

      {/* Una card al posto dei banner impilati. Gli avvisi non sono stati
          tolti: sono tutti in Attenzioni, raggruppati, con dentro le persone. */}
      {avvisi.length > 0 && (
        <section className="sezione">
          <Link href="/attenzioni" className="da-controllare">
            <span className="tondino" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 4.5 3.6 19h16.8L12 4.5Z" /><path d="M12 10v4M12 16.6v.4" /></svg>
            </span>
            <span className="testo">
              <span className="forte">Avvisi ({avvisi.length})</span>
              <span className="fiacco">
                {avvisi[0].titolo}
                {avvisi.length > 1 && ` · e altri ${avvisi.length - 1}`}
              </span>
            </span>
            <span className="freccia" aria-hidden="true">
              <svg viewBox="0 0 8 13" width="8" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m1 1 5.5 5.5L1 12" /></svg>
            </span>
          </Link>
        </section>
      )}

      <section className="sezione">
        <h2>Adesso</h2>
        {adesso.length === 0 ? (
          <div className="tutto-fatto">
            <span className="faccia" aria-hidden="true">🎉</span>
            <span className="frase">Tutto fatto per oggi</span>
            <span className="sotto-frase">
              {dopo.length > 0 ? 'Se hai tempo, guarda cosa arriva nei prossimi giorni.' : 'Niente in calendario.'}
            </span>
          </div>
        ) : adesso.map((v) => (
          <CartaAzione
            key={v.azione.id}
            azioneId={v.azione.id}
            contattoId={v.contatto.id}
            cosa={v.azione.descrizione}
            scadenza={v.azione.scadenza}
            scaduto={inRitardo(v.azione.scadenza)}
            scadutoDa={v.giorniDiRitardo}
            chi={(
              <>
                <span>{v.contatto.nomeCompleto}</span>
                {v.contatto.valore > 0 && <span className="euro">{euro(v.contatto.valore)}</span>}
                {!inRitardo(v.azione.scadenza) && <span>{quando(v.azione.scadenza)}</span>}
              </>
            )}
          />
        ))}
      </section>

      {daRispondere.length > 0 && (
        <section className="sezione">
          <h2>Messaggi senza risposta</h2>
          <div className="scheda scheda-fitta">
            {daRispondere.map(({ conversazione: f, contatto }) => (
              <div key={f.id} className="riga">
                <span className="cresce">
                  <Link href={`/contatti/${contatto.id}`} className="titolo">
                    <LogoCanale id={f.canale} />
                    {`${contatto.nome} ${contatto.cognome}`.trim()}
                  </Link>
                  <span className="sotto">
                    {ETICHETTA_CANALE[f.canale]} · {dataOra(f.ultimoMessaggioIl)}
                    {f.ultimoMessaggioTesto ? ` · «${f.ultimoMessaggioTesto.slice(0, 70)}»` : ''}
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
          </div>
        </section>
      )}

      {dopo.length > 0 && (
        <section className="sezione">
          <h2>Prossimi giorni</h2>
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
        </section>
      )}

      <section className="sezione">
        <h2>Arrivati e mai sentiti</h2>
        {maiSentiti.length === 0
          ? <div className="scheda"><p className="elenco-vuoto">Nessuno in attesa: buon segno.</p></div>
          : maiSentiti.map((c) => <RigaContatto key={c.id} contatto={c} />)}
      </section>

      <section className="sezione">
        <h2>Il quadro</h2>
        {/* Il periodo è un selettore a segmenti: le quattro scelte sono tutte
            visibili, una sola è accesa. Sono le stesse di prima. */}
        <nav className="segmentato" aria-label="Periodo dei numeri" style={{ marginBottom: 12 }}>
          {PERIODI.map((p) => (
            <Link
              key={p}
              href={p === '30' ? '/' : `/?periodo=${p}`}
              className={periodo === p ? 'attiva' : undefined}
              aria-current={periodo === p ? 'true' : undefined}
            >
              {ETICHETTA_PERIODO[p]}
            </Link>
          ))}
        </nav>
        <div className="numeri">
          <Numero etichetta="Persone entrate" valore={numeri.ingressi} sotto={`${numeri.qualificati} qualificate`} href="/ingressi" />
          <Numero etichetta="Valore in gioco" valore={euro(numeri.valorePipeline)} sotto={`${numeri.preventivi} preventivi`} href="/pipeline" />
          <Numero
            etichetta="Ordini chiusi"
            valore={numeri.ordiniChiusi}
            sotto={numeri.ordiniChiusi ? euro(numeri.valoreOrdiniChiusi) : 'nessuno nel periodo'}
            href="/analisi"
          />
          <Numero
            etichetta="Avvisi"
            valore={quantiAvvisi}
            sotto={senzaAzione ? `${senzaAzione} senza prossima azione` : 'nessuno lasciato indietro'}
            allarme={senzaAzione > 0}
            href="/attenzioni"
          />
        </div>
      </section>
    </main>
  );
}
