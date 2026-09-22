import Link from 'next/link';
import { deposito, modoDati } from '@/lib/dati';
import { euro } from '@/lib/dominio/etichette';
import {
  ETICHETTA_RUOLO, NUMERI_MODIFICABILI, PERMESSI_TITOLARE, RUOLO_PRUDENTE, SPIEGAZIONE_PERMESSO, puo,
} from '@/lib/dominio/impostazioni';
import { valorePipeline } from '@/lib/dati/istantanea';
import { caricaDatiDemo, eliminaDatiDemo, salvaImpostazioni } from '../azioni';

// Le impostazioni non sono una vetrina: i numeri che si vedono qui sono gli
// stessi che fanno diventare rossa una riga in Oggi. Si cambiano, si salvano,
// e il CRM cambia comportamento — altrimenti sarebbe una pagina che racconta
// una cosa mentre il programma ne fa un'altra.

export const dynamic = 'force-dynamic';

export default async function Impostazioni({
  searchParams,
}: {
  searchParams: Promise<{ avviso?: string; errore?: string; quanti?: string }>;
}) {
  const { avviso, errore, quanti } = await searchParams;
  const dep = await deposito();
  const [dati, operatori, profilo, quantiDemo] = await Promise.all([
    dep.istantanea(), dep.operatori(), dep.profilo(), dep.quantiDatiDemo(),
  ]);

  const imp = dati.impostazioni;
  const ruolo = profilo?.ruolo ?? RUOLO_PRUDENTE;
  const amministratore = puo(ruolo, 'impostazioni');
  const demo = modoDati() === 'demo';

  const per = (gruppo: string) => NUMERI_MODIFICABILI.filter((v) => v.gruppo === gruppo);
  const valore = (gruppo: string, chiave: string): number => {
    const dentro = (imp as unknown as Record<string, Record<string, number>>)[gruppo];
    return dentro?.[chiave] ?? 0;
  };

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Impostazioni</h1>
          <p className="lede">
            Chi entra, quanto c&apos;è dentro, con che regole lavora il CRM.
            {profilo && <> Sei entrato come <strong>{ETICHETTA_RUOLO[ruolo].toLowerCase()}</strong>.</>}
          </p>
        </div>
      </header>

      {errore === 'permesso' && (
        <p className="avviso rosso">
          Serve essere amministratore per questa operazione. Il controllo è sul server, non solo sul bottone.
        </p>
      )}
      {avviso === 'salvate' && <p className="avviso verde">Impostazioni salvate. Valgono da adesso, per tutte le pagine.</p>}
      {avviso === 'demo-caricati' && <p className="avviso verde">Dati di esempio caricati e marcati come tali.</p>}
      {avviso === 'demo-eliminati' && (
        <p className="avviso verde">
          Dati di esempio eliminati{quanti ? ` — ${quanti} ${Number(quanti) === 1 ? 'riga' : 'righe'}` : ''}.
          I dati veri non sono stati toccati.
        </p>
      )}

      <div className="colonne-pari">
        <section className="sezione" style={{ marginTop: 0 }}>
          <h2>Chi ha accesso</h2>
          <div className="scheda scheda-fitta">
            {operatori.length === 0 && <p className="elenco-vuoto">Nessun profilo registrato.</p>}
            {operatori.map((o) => (
              <div key={o.id} className="riga">
                <span className="cresce"><span className="titolo">{o.nome}</span></span>
                {profilo?.id === o.id && <span className="pastiglia oro">{ETICHETTA_RUOLO[ruolo]}</span>}
              </div>
            ))}
            <p className="nota-piede" style={{ padding: '10px 0 2px' }}>
              Gli account non si creano da qui: si invitano dal pannello Supabase (Authentication → Users → Invite),
              e il ruolo si cambia nella tabella <code>profili</code>. La registrazione libera è disattivata apposta —
              a questo CRM accedete in due, e nessun cliente deve sapere che esiste.
            </p>
          </div>

          <div className="scheda" style={{ marginTop: 10 }}>
            <h3>Cosa può fare solo il titolare</h3>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--ink-2)', fontSize: 13.5 }}>
              {PERMESSI_TITOLARE.map((p) => <li key={p}>{SPIEGAZIONE_PERMESSO[p]}</li>)}
            </ul>
            <p className="nota-piede" style={{ marginTop: 10, marginBottom: 0 }}>
              Tutto il resto — rispondere, spostare di fase, scrivere un&apos;attività, fare un preventivo — lo fanno
              tutti e due. Il lavoro non si ingessa.
              {demo && <> In modalità dimostrativa non c&apos;è login, quindi qui si può fare tutto: altrimenti metà
                delle funzioni non sarebbe provabile.</>}
            </p>
          </div>
        </section>

        <section className="sezione" style={{ marginTop: 0 }}>
          <h2>I dati</h2>
          <div className="scheda">
            <dl className="dati">
              <div><dt>Contatti</dt><dd>{dati.contatti.length}</dd></div>
              <div><dt>Opportunità</dt><dd>{dati.opportunita.length}</dd></div>
              <div><dt>Azioni aperte</dt><dd>{dati.azioni.filter((a) => !a.fattaIl).length}</dd></div>
              <div><dt>Eventi in timeline</dt><dd>{dati.eventi.length}</dd></div>
              <div><dt>Campagne</dt><dd>{dati.campagne.length}</dd></div>
              <div><dt>Card NFC</dt><dd>{dati.card.length}</dd></div>
              <div><dt>Valore in pipeline</dt><dd>{euro(valorePipeline(dati))}</dd></div>
              <div><dt>Modalità</dt><dd>{demo ? 'dimostrativa' : 'dati reali (Supabase)'}</dd></div>
            </dl>
            <p style={{ marginTop: 14, marginBottom: 6 }}>
              <a className="bottone bottone-fantasma" href="/api/export">Scarica i contatti in CSV</a>
            </p>
            <p className="nota-piede" style={{ marginBottom: 0 }}>
              Il CSV si apre in Excel e in Fogli Google: è la garanzia che questi dati restano di Rama, qualunque
              cosa succeda a questo programma.
            </p>
          </div>

          {/* ----------------------------------------------------------------
              Dati di esempio: marcati, quindi eliminabili in un colpo solo
              ---------------------------------------------------------------- */}
          <div className="scheda" style={{ marginTop: 10 }}>
            <h3>Dati di esempio</h3>
            <p style={{ marginTop: 0, fontSize: 13.5, color: 'var(--ink-2)' }}>
              {demo ? (
                <>Qui dentro è tutto di esempio: il CRM gira senza database. «Ricomincia» rimette i dati com&apos;erano,
                  «Svuota» lascia il CRM vuoto — come si presenta il primo giorno di lavoro vero.</>
              ) : (
                <>Ce ne sono <strong>{quantiDemo}</strong> marcati come esempio. Sono segnati da una colonna nel
                  database, non da un nome che sembra finto: cancellarli è un&apos;operazione sola e i dati veri non
                  vengono nemmeno sfiorati.</>
              )}
            </p>
            <div className="azioni-riga">
              <form action={caricaDatiDemo}>
                <button type="submit" className="bottone-fantasma bottone-piccolo" disabled={!amministratore}>
                  {demo ? 'Ricomincia dai dati di esempio' : 'Carica i dati di esempio'}
                </button>
              </form>
              <form action={eliminaDatiDemo}>
                <button type="submit" className="bottone-pericolo bottone-piccolo" disabled={!amministratore}>
                  {demo ? 'Svuota il CRM' : 'Elimina i dati di esempio'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------------------
          Le regole, modificabili
          ------------------------------------------------------------------ */}
      <section className="sezione">
        <h2>Le regole che il CRM applica da solo</h2>
        <form action={salvaImpostazioni}>
          <div className="scheda">
            <h3>Quando una cosa diventa urgente</h3>
            <p className="nota-piede" style={{ marginTop: -2 }}>
              Questi numeri decidono i colori in Oggi, in Pipeline e in Attenzioni. Alzarli vuol dire farsi avvisare
              più tardi; abbassarli, farsi avvisare prima. Se tutto è urgente, niente lo è.
            </p>
            <div className="campi-2">
              {per('soglie').map((v) => (
                <div className="campo" key={v.chiave}>
                  <label htmlFor={`soglie_${v.chiave}`}>
                    {v.etichetta} ({v.unita === 'euro' ? '€' : 'giorni'})
                  </label>
                  <input
                    id={`soglie_${v.chiave}`}
                    name={`soglie_${v.chiave}`}
                    type="number" inputMode="numeric"
                    min={v.min} max={v.max}
                    defaultValue={valore('soglie', v.chiave)}
                    disabled={!amministratore}
                  />
                  <span className="nota-piede">{v.spiegazione}</span>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 18 }}>Ogni quanto ricontattare</h3>
            <p className="nota-piede" style={{ marginTop: -2 }}>
              Nessuna di queste regole manda messaggi a nessuno: aprono promemoria. Il giorno che servirà un invio
              automatico si aggancia in <code>lib/dominio/automazioni.ts</code>, senza toccare le pagine.
            </p>
            <div className="campi-3">
              {per('giorni').map((v) => (
                <div className="campo" key={v.chiave}>
                  <label htmlFor={`giorni_${v.chiave}`}>{v.etichetta} (giorni)</label>
                  <input
                    id={`giorni_${v.chiave}`}
                    name={`giorni_${v.chiave}`}
                    type="number" inputMode="numeric"
                    min={v.min} max={v.max}
                    defaultValue={valore('giorni', v.chiave)}
                    disabled={!amministratore}
                  />
                  <span className="nota-piede">{v.spiegazione}</span>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 18 }}>Preventivi</h3>
            <div className="campi-2">
              {per('preventivo').map((v) => (
                <div className="campo" key={v.chiave}>
                  <label htmlFor={`preventivo_${v.chiave}`}>{v.etichetta} (giorni)</label>
                  <input
                    id={`preventivo_${v.chiave}`}
                    name={`preventivo_${v.chiave}`}
                    type="number" inputMode="numeric"
                    min={v.min} max={v.max}
                    defaultValue={valore('preventivo', v.chiave)}
                    disabled={!amministratore}
                  />
                  <span className="nota-piede">{v.spiegazione}</span>
                </div>
              ))}
              <div className="campo">
                <label htmlFor="preventivo_prefisso">Come si numerano</label>
                <input
                  id="preventivo_prefisso" name="preventivo_prefisso" type="text"
                  defaultValue={imp.preventivo.prefissoNumero} disabled={!amministratore}
                />
                <span className="nota-piede">
                  Il prossimo sarà <strong>{imp.preventivo.prefissoNumero}-{new Date().getFullYear()}-001</strong> o
                  il numero dopo l&apos;ultimo usato.
                </span>
              </div>
            </div>

            <h3 style={{ marginTop: 18 }}>Dati dell&apos;azienda</h3>
            <p className="nota-piede" style={{ marginTop: -2 }}>
              Servono nei preventivi e nelle comunicazioni. Restano qui dentro: il CRM non li manda a nessuno.
            </p>
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="azienda_nome">Nome</label>
                <input id="azienda_nome" name="azienda_nome" type="text" defaultValue={imp.azienda.nome} disabled={!amministratore} />
              </div>
              <div className="campo">
                <label htmlFor="azienda_citta">Città</label>
                <input id="azienda_citta" name="azienda_citta" type="text" defaultValue={imp.azienda.citta} disabled={!amministratore} />
              </div>
              <div className="campo">
                <label htmlFor="azienda_telefono">Telefono</label>
                <input id="azienda_telefono" name="azienda_telefono" type="tel" defaultValue={imp.azienda.telefono} disabled={!amministratore} />
              </div>
              <div className="campo">
                <label htmlFor="azienda_email">Email</label>
                <input id="azienda_email" name="azienda_email" type="email" defaultValue={imp.azienda.email} disabled={!amministratore} />
              </div>
            </div>

            <div className="azioni-riga" style={{ marginTop: 6 }}>
              <button type="submit" className="bottone-oro" disabled={!amministratore}>Salva le impostazioni</button>
              {!amministratore && (
                <span className="nota-piede">Solo un amministratore può cambiarle.</span>
              )}
            </div>
          </div>
        </form>
      </section>

      <p className="nota-piede">
        <Link href="/contatti">← Contatti</Link> · <Link href="/card">Card NFC</Link>
      </p>
    </main>
  );
}
