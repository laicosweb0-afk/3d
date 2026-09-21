import Link from 'next/link';
import { deposito } from '@/lib/dati';
import { DESTINAZIONE_PREDEFINITA } from '@/lib/dominio/card';
import { puo } from '@/lib/dominio/impostazioni';
import { dataOra } from '@/lib/formato';
import { aggiornaCard, creaCard, eliminaCard } from '../azioni';
import { Numero } from '../pezzi';

// CARD NFC — quale card ha portato quella persona.
//
// Con una card sola la domanda non esiste. Con quattro sì, ed è la domanda
// che decide se comprarne altre o spostare quella che c'è.
//
// Un tocco non è un contatto: tanta gente appoggia il telefono per curiosità
// e se ne va. I due numeri si tengono separati apposta — mescolarli farebbe
// sembrare la card molto più efficace di quello che è.

export const dynamic = 'force-dynamic';

export default async function Card({
  searchParams,
}: {
  searchParams: Promise<{ avviso?: string; errore?: string }>;
}) {
  const { avviso, errore } = await searchParams;
  const dep = await deposito();
  const [dati, profilo] = await Promise.all([dep.istantanea(), dep.profilo()]);
  const amministratore = puo(profilo?.ruolo ?? 'operatore', 'gestisci_card');

  const card = [...dati.card].sort((a, b) => b.tocchi - a.tocchi);
  const tocchiTotali = card.reduce((s, c) => s + c.tocchi, 0);

  // Quante persone sono entrate davvero da una card: si contano i contatti
  // con fonte «card_nfc», non i tocchi.
  const daCard = dati.contatti.filter((c) => c.fonte === 'card_nfc').length;
  const resa = tocchiTotali ? Math.round((daCard / tocchiTotali) * 100) : null;

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <p className="nota-piede" style={{ marginBottom: 4 }}><Link href="/impostazioni">← Impostazioni</Link></p>
          <h1>Card NFC</h1>
          <p className="lede">Quale card sta funzionando, e quale è lì per bellezza.</p>
        </div>
      </header>

      {errore === 'permesso' && <p className="avviso rosso">Serve essere amministratore per gestire le card.</p>}
      {errore === 'doppio' && <p className="avviso rosso">Quel codice è già usato da un&apos;altra card.</p>}
      {errore === 'dati' && <p className="avviso rosso">Servono almeno il codice e il nome.</p>}
      {avviso === 'creata' && <p className="avviso verde">Card creata. Adesso va scritto l&apos;indirizzo dentro il chip.</p>}
      {avviso === 'salvata' && <p className="avviso verde">Card aggiornata.</p>}
      {avviso === 'eliminata' && (
        <p className="avviso giallo">
          Card eliminata. Se quella fisica è ancora in giro, adesso porta a una pagina che non esiste.
        </p>
      )}

      <section className="sezione" style={{ marginTop: 0 }}>
        <div className="numeri">
          <Numero etichetta="Card attive" valore={card.filter((c) => c.attiva).length} sotto={`${card.length} in tutto`} />
          <Numero etichetta="Tocchi" valore={tocchiTotali} sotto="telefoni appoggiati" />
          <Numero etichetta="Contatti da card" valore={daCard} sotto="hanno lasciato il nome" />
          <Numero
            etichetta="Chi lascia il nome"
            valore={resa === null ? '—' : `${resa}%`}
            sotto={resa === null ? 'nessun tocco ancora' : 'dei tocchi diventa contatto'}
          />
        </div>
      </section>

      <section className="sezione">
        <h2>Le card</h2>
        {card.length === 0 && (
          <div className="scheda">
            <p className="elenco-vuoto" style={{ padding: 0 }}>
              Nessuna card registrata. Creane una qui sotto: il CRM ti dà l&apos;indirizzo da scrivere nel chip.
            </p>
          </div>
        )}

        {card.map((c) => (
          <details key={c.id} className="scheda" style={{ marginBottom: 10 }}>
            <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="titolo" style={{ fontWeight: 600 }}>{c.nome}</span>
              <code style={{ color: 'var(--ciano)' }}>/nfc/{c.codice}</code>
              <span className={`pastiglia ${c.attiva ? 'bene' : ''}`}>{c.attiva ? 'Attiva' : 'Spenta'}</span>
              <span className="mono" style={{ marginLeft: 'auto' }}>
                {c.tocchi} {c.tocchi === 1 ? 'tocco' : 'tocchi'}
              </span>
            </summary>

            <p className="nota-piede" style={{ marginTop: 10 }}>
              {c.luogo ? <>Sta in: {c.luogo}. </> : null}
              {c.ultimoToccoIl ? <>Ultimo tocco {dataOra(c.ultimoToccoIl)}.</> : <>Non l&apos;ha ancora toccata nessuno.</>}
            </p>

            <div className="scheda" style={{ background: 'var(--carta-2)', marginBottom: 12 }}>
              <span className="eti" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Da scrivere dentro il chip</span>
              <p className="mono" style={{ margin: '4px 0 0', overflowWrap: 'anywhere', fontSize: 13 }}>
                https://<span style={{ color: 'var(--ink-3)' }}>indirizzo-del-crm</span>/nfc/{c.codice}
              </p>
              <p className="nota-piede" style={{ marginTop: 6, marginBottom: 0 }}>
                È l&apos;unica cosa che va trascritta a mano su un oggetto fisico, e un errore lì si scopre solo in
                negozio: copialo, non riscriverlo.
              </p>
            </div>

            <form action={aggiornaCard}>
              <input type="hidden" name="id" value={c.id} />
              <div className="campi-2">
                <div className="campo">
                  <label htmlFor={`nome-${c.id}`}>Nome</label>
                  <input id={`nome-${c.id}`} name="nome" type="text" defaultValue={c.nome} disabled={!amministratore} />
                </div>
                <div className="campo">
                  <label htmlFor={`luogo-${c.id}`}>Dov&apos;è</label>
                  <input id={`luogo-${c.id}`} name="luogo" type="text" defaultValue={c.luogo ?? ''} placeholder="Cassa, vetrina bagni…" disabled={!amministratore} />
                </div>
              </div>
              <div className="campi-2">
                <div className="campo">
                  <label htmlFor={`campagna-${c.id}`}>Dentro una campagna</label>
                  <select id={`campagna-${c.id}`} name="campagna_id" defaultValue={c.campagnaId ?? ''} disabled={!amministratore}>
                    <option value="">— nessuna —</option>
                    {dati.campagne.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor={`dest-${c.id}`}>Dove manda</label>
                  <input
                    id={`dest-${c.id}`} name="destinazione" type="text"
                    defaultValue={c.destinazione ?? ''}
                    placeholder={DESTINAZIONE_PREDEFINITA}
                    disabled={!amministratore}
                  />
                </div>
              </div>
              <div className="campo">
                <label htmlFor={`note-${c.id}`}>Note</label>
                <textarea id={`note-${c.id}`} name="note" defaultValue={c.note ?? ''} disabled={!amministratore} />
              </div>
              <div className="campo">
                <label style={{ display: 'flex', gap: 9, alignItems: 'center', color: 'var(--ink-2)' }}>
                  <input type="checkbox" name="attiva" value="si" defaultChecked={c.attiva} style={{ width: 'auto' }} disabled={!amministratore} />
                  <span style={{ fontSize: 13 }}>Attiva — se la spegni, chi la tocca non viene più registrato</span>
                </label>
              </div>
              <button type="submit" className="bottone-fantasma" disabled={!amministratore}>Salva</button>
            </form>

            <details style={{ marginTop: 12 }}>
              <summary className="nota-piede" style={{ cursor: 'pointer', color: 'var(--urgente)' }}>Elimina questa card</summary>
              <p className="nota-piede" style={{ marginTop: 8 }}>
                Se la card fisica è ancora in negozio, dopo non porterà più da nessuna parte. Di solito conviene
                spegnerla invece di eliminarla: i tocchi già contati restano.
              </p>
              <form action={eliminaCard}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="bottone-pericolo bottone-piccolo" disabled={!amministratore}>
                  Sì, elimina
                </button>
              </form>
            </details>
          </details>
        ))}
      </section>

      <section className="sezione">
        <h2>Nuova card</h2>
        <div className="scheda">
          <form action={creaCard}>
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="codice">Codice *</label>
                <input id="codice" name="codice" type="text" required placeholder="bancone-01" disabled={!amministratore} />
                <span className="nota-piede">
                  Finisce nell&apos;indirizzo e va letto al telefono: minuscolo, senza spazi né accenti.
                </span>
              </div>
              <div className="campo">
                <label htmlFor="nome">Nome *</label>
                <input id="nome" name="nome" type="text" required placeholder="Bancone showroom" disabled={!amministratore} />
              </div>
            </div>
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="luogo">Dov&apos;è</label>
                <input id="luogo" name="luogo" type="text" placeholder="Cassa, piano terra" disabled={!amministratore} />
              </div>
              <div className="campo">
                <label htmlFor="campagna_id">Dentro una campagna</label>
                <select id="campagna_id" name="campagna_id" defaultValue="" disabled={!amministratore}>
                  <option value="">— nessuna —</option>
                  {dati.campagne.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="note">Note</label>
              <textarea id="note" name="note" placeholder="Quando l'abbiamo messa, perché lì…" disabled={!amministratore} />
            </div>
            <button type="submit" className="bottone-oro" disabled={!amministratore}>Crea la card</button>
            {!amministratore && <p className="nota-piede" style={{ marginTop: 8 }}>Solo un amministratore può gestire le card.</p>}
          </form>
        </div>
      </section>
    </main>
  );
}
