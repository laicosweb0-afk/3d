import Link from 'next/link';
import { FASI_DESCRITTE } from '@/lib/dominio/fasi';
import { FONTI_DESCRITTE } from '@/lib/dominio/fonti';
import { INTERESSI, PRIORITA, TIPI_AZIONE } from '@/lib/dominio/tipi';
import { ETICHETTA_AZIONE, ETICHETTA_INTERESSE, ETICHETTA_PRIORITA } from '@/lib/dominio/etichette';
import { creaContatto } from '../../azioni';

// Chi entra in negozio, chi telefona, chi scrive in privato. Quattro cose sono
// obbligatorie — nome, fonte, fase e prossima azione — perché un contatto
// senza prossima azione è un contatto che fra due settimane nessuno ricorderà.

export const dynamic = 'force-dynamic';

export default async function NuovoContatto({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const { errore } = await searchParams;

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <p className="nota-piede" style={{ marginBottom: 4 }}><Link href="/contatti">← Contatti</Link></p>
          <h1>Nuovo contatto</h1>
          <p className="lede">Quello che sai adesso. Il resto si aggiunge dopo.</p>
        </div>
      </header>

      {errore === 'campi' && (
        <p className="avviso rosso">Servono almeno il nome e la prossima azione: senza, il contatto si perde.</p>
      )}

      <form action={creaContatto}>
        <section className="sezione" style={{ marginTop: 0 }}>
          <h2>Chi è</h2>
          <div className="scheda">
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="nome">Nome *</label>
                <input id="nome" name="nome" type="text" required autoFocus placeholder="Silvia" />
              </div>
              <div className="campo">
                <label htmlFor="cognome">Cognome</label>
                <input id="cognome" name="cognome" type="text" placeholder="Montanari" />
              </div>
            </div>
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="telefono">Telefono</label>
                <input id="telefono" name="telefono" type="tel" placeholder="+39 347 992 1144" />
              </div>
              <div className="campo">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" />
              </div>
            </div>
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="citta">Città</label>
                <input id="citta" name="citta" type="text" placeholder="Lugo" />
              </div>
              <div className="campo">
                <label htmlFor="provincia">Provincia</label>
                <input id="provincia" name="provincia" type="text" maxLength={2} placeholder="RA" />
              </div>
            </div>
            <div className="campo">
              <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: 'var(--ink-2)' }}>
                <input type="checkbox" name="consenso" style={{ width: 'auto', marginTop: 3 }} />
                <span style={{ fontSize: 13 }}>
                  Ha dato il consenso alle comunicazioni promozionali. Spuntalo solo se te l&apos;ha detto davvero:
                  la data viene registrata.
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="sezione">
          <h2>Da dove arriva *</h2>
          <div className="scheda">
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="fonte">Fonte</label>
                <select id="fonte" name="fonte" defaultValue="showroom">
                  {FONTI_DESCRITTE.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="fase">Fase di partenza</label>
                <select id="fase" name="fase" defaultValue="da_contattare">
                  {FASI_DESCRITTE.filter((f) => f.attiva).map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="fonte_dettaglio">In dettaglio</label>
              <input id="fonte_dettaglio" name="fonte_dettaglio" type="text" placeholder="entrata di sabato senza appuntamento, mandata dal geometra…" />
            </div>
          </div>
        </section>

        <section className="sezione">
          <h2>Cosa gli serve</h2>
          <div className="scheda">
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="interesse">Lavoro</label>
                <select id="interesse" name="interesse" defaultValue="bagno">
                  {INTERESSI.map((i) => <option key={i} value={i}>{ETICHETTA_INTERESSE[i]}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="valore_stimato">Valore stimato €</label>
                <input id="valore_stimato" name="valore_stimato" type="text" inputMode="numeric" placeholder="4000" />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="note">Note</label>
              <textarea id="note" name="note" placeholder="Cerca un gres effetto legno per il salotto, ha le misure sul telefono" />
            </div>
            <p className="nota-piede" style={{ margin: 0 }}>
              Se non sai il valore, lascia vuoto: meglio una casella vuota di un numero inventato.
            </p>
          </div>
        </section>

        <section className="sezione">
          <h2>Prossima azione *</h2>
          <div className="scheda">
            <div className="campo">
              <label htmlFor="azione_descrizione">Cosa va fatto</label>
              <input
                id="azione_descrizione" name="azione_descrizione" type="text" required
                defaultValue="Prima chiamata" placeholder="Prima chiamata"
              />
            </div>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="azione_tipo">Tipo</label>
                <select id="azione_tipo" name="azione_tipo" defaultValue="telefonare">
                  {TIPI_AZIONE.map((t) => <option key={t} value={t}>{ETICHETTA_AZIONE[t]}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="azione_scadenza">Quando</label>
                <input id="azione_scadenza" name="azione_scadenza" type="datetime-local" />
              </div>
              <div className="campo">
                <label htmlFor="azione_priorita">Priorità</label>
                <select id="azione_priorita" name="azione_priorita" defaultValue="da_fare">
                  {PRIORITA.map((p) => <option key={p} value={p}>{ETICHETTA_PRIORITA[p]}</option>)}
                </select>
              </div>
            </div>
            <p className="nota-piede" style={{ margin: '0 0 12px' }}>
              Senza data il CRM la mette a domani.
            </p>
            <div className="azioni-riga">
              <button type="submit" className="bottone-oro">Salva il contatto</button>
              <Link href="/contatti" className="bottone bottone-fantasma">Annulla</Link>
            </div>
          </div>
        </section>
      </form>
    </main>
  );
}
