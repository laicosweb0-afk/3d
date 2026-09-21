import Link from 'next/link';
import {
  CANALI, ETICHETTA_CANALE, ETICHETTA_PIATTAFORMA, ETICHETTA_STATO_CAMPAGNA,
  PIATTAFORME, STATI_CAMPAGNA,
} from '@/lib/dominio/campagne';
import { creaCampagna } from '../../azioni';

// Una campagna si crea a mano, oggi, senza nessuna API: è così che il CRM
// funziona già prima che Meta sia collegato. Gli agganci (ID annuncio, ref)
// si riempiono quando ci sono — servono al riconoscimento automatico dopo.

export const dynamic = 'force-dynamic';

export default async function NuovaCampagna({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const { errore } = await searchParams;

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <p className="nota-piede" style={{ marginBottom: 4 }}><Link href="/campagne">← Campagne</Link></p>
          <h1>Nuova campagna</h1>
          <p className="lede">Quello che sai adesso. La spesa si può lasciare vuota.</p>
        </div>
      </header>

      {errore === 'nome' && <p className="avviso rosso">Serve almeno il nome della campagna.</p>}

      <form action={creaCampagna}>
        <section className="sezione" style={{ marginTop: 0 }}>
          <h2>La campagna</h2>
          <div className="scheda">
            <div className="campo">
              <label htmlFor="nome">Nome *</label>
              <input id="nome" name="nome" type="text" required autoFocus placeholder="Bagno completo — Settembre" />
            </div>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="piattaforma">Piattaforma</label>
                <select id="piattaforma" name="piattaforma" defaultValue="meta">
                  {PIATTAFORME.map((x) => <option key={x} value={x}>{ETICHETTA_PIATTAFORMA[x]}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="canale_ingresso">Porta su</label>
                <select id="canale_ingresso" name="canale_ingresso" defaultValue="messenger">
                  {CANALI.map((x) => <option key={x} value={x}>{ETICHETTA_CANALE[x]}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="stato">Stato</label>
                <select id="stato" name="stato" defaultValue="attiva">
                  {STATI_CAMPAGNA.map((x) => <option key={x} value={x}>{ETICHETTA_STATO_CAMPAGNA[x]}</option>)}
                </select>
              </div>
            </div>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="data_inizio">Inizio</label>
                <input id="data_inizio" name="data_inizio" type="date" />
              </div>
              <div className="campo">
                <label htmlFor="budget">Budget €</label>
                <input id="budget" name="budget" type="text" inputMode="numeric" placeholder="450" />
              </div>
              <div className="campo">
                <label htmlFor="spesa">Spesa € (se la sai)</label>
                <input id="spesa" name="spesa" type="text" inputMode="numeric" placeholder="lascia vuoto = N/D" />
              </div>
            </div>
          </div>
        </section>

        <section className="sezione">
          <h2>Agganci (facoltativi, servono al riconoscimento automatico)</h2>
          <div className="scheda">
            <p className="nota-piede" style={{ marginTop: 0 }}>
              Quando un messaggio arriverà da un annuncio, Meta ci dirà l&apos;ID dell&apos;annuncio e il parametro{' '}
              <code>ref</code>. Se li scrivi qui, il CRM saprà da sola a quale campagna appartiene quella persona.
              Il <code>ref</code> lo decidi tu quando crei l&apos;annuncio click-to-Messenger.
            </p>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="id_esterno">ID campagna</label>
                <input id="id_esterno" name="id_esterno" type="text" placeholder="120210000000123456" />
              </div>
              <div className="campo">
                <label htmlFor="ad_id">ID annuncio</label>
                <input id="ad_id" name="ad_id" type="text" />
              </div>
              <div className="campo">
                <label htmlFor="parametro_ref">Parametro ref=</label>
                <input id="parametro_ref" name="parametro_ref" type="text" placeholder="bagno-settembre" />
              </div>
            </div>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="utm_source">utm_source</label>
                <input id="utm_source" name="utm_source" type="text" placeholder="facebook" />
              </div>
              <div className="campo">
                <label htmlFor="utm_medium">utm_medium</label>
                <input id="utm_medium" name="utm_medium" type="text" placeholder="cpc" />
              </div>
              <div className="campo">
                <label htmlFor="utm_campaign">utm_campaign</label>
                <input id="utm_campaign" name="utm_campaign" type="text" />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="landing">Pagina di destinazione</label>
              <input id="landing" name="landing" type="text" placeholder="https://ramastore.it/preventivo" />
            </div>
            <div className="campo">
              <label htmlFor="note">Note</label>
              <textarea id="note" name="note" placeholder="Pubblico, creatività, cosa stiamo provando…" />
            </div>
            <div className="azioni-riga">
              <button type="submit" className="bottone-oro">Crea la campagna</button>
              <Link href="/campagne" className="bottone bottone-fantasma">Annulla</Link>
            </div>
          </div>
        </section>
      </form>
    </main>
  );
}
