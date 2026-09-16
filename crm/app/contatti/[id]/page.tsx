import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { dataOra, inRitardo, quando, soloData } from '@/lib/formato';
import {
  ETICHETTE_PROVENIENZA,
  ETICHETTE_STATO,
  ETICHETTE_TIPO,
  STATI,
  TIPI_ATTIVITA,
  type Attivita,
  type Contatto,
  type LeadCard,
  type Nota,
  type Profilo,
} from '@/lib/tipi';
import {
  aggiornaContatto,
  aggiungiNota,
  creaAttivita,
  eliminaContatto,
  segnaAttivitaFatta,
} from '../../azioni';

// La scheda: tutto quello che si sa di una persona in una schermata sola.

export const dynamic = 'force-dynamic';

type NotaConAutore = Nota & { profili: { nome: string } | null };

export default async function SchedaContatto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ avviso?: string }>;
}) {
  const { id } = await params;
  const { avviso } = await searchParams;
  const supabase = await supabaseServer();

  const { data: grezzo } = await supabase.from('contatti').select('*').eq('id', id).maybeSingle();
  if (!grezzo) notFound();
  const contatto = grezzo as unknown as Contatto;

  const [{ data: crediti }, { data: noteGrezze }, { data: attivitaGrezze }, { data: profiliGrezzi }] =
    await Promise.all([
      supabase.from('lead_card').select('*').eq('contatto_id', id).order('creato_il', { ascending: false }),
      supabase
        .from('note')
        .select('id, testo, creato_il, autore, profili(nome)')
        .eq('contatto_id', id)
        .order('creato_il', { ascending: false }),
      supabase.from('attivita').select('*').eq('contatto_id', id).order('scadenza', { ascending: true }),
      supabase.from('profili').select('id, nome, ruolo, attivo').eq('attivo', true).order('nome'),
    ]);

  const lead = (crediti ?? []) as unknown as LeadCard[];
  const note = (noteGrezze ?? []) as unknown as NotaConAutore[];
  const attivita = (attivitaGrezze ?? []) as unknown as Attivita[];
  const profili = (profiliGrezzi ?? []) as unknown as Profilo[];
  const daFare = attivita.filter((a) => !a.fatta_il);

  return (
    <main>
      <header className="intestazione">
        <p className="occhiello">{ETICHETTE_PROVENIENZA[contatto.provenienza]}</p>
        <h1>{contatto.nome}</h1>
        <p className="lede">
          <span className={`pastiglia ${contatto.stato}`}>{ETICHETTE_STATO[contatto.stato]}</span>{' '}
          in rubrica dal {soloData(contatto.creato_il)}
          {contatto.ultimo_contatto_il ? ` · sentito ${quando(contatto.ultimo_contatto_il)}` : ' · mai sentito'}
        </p>
      </header>

      {avviso === 'esisteva' && (
        <p className="avviso">Questa email era già in rubrica: ecco la scheda che esisteva.</p>
      )}

      <section className="scheda">
        <h2>Dati</h2>
        <form action={aggiornaContatto}>
          <input type="hidden" name="id" value={contatto.id} />
          <div className="campo">
            <label htmlFor="nome">Nome</label>
            <input id="nome" name="nome" type="text" defaultValue={contatto.nome} required />
          </div>
          <div className="campi-affiancati">
            <div className="campo">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" defaultValue={contatto.email ?? ''} />
            </div>
            <div className="campo">
              <label htmlFor="telefono">Telefono</label>
              <input id="telefono" name="telefono" type="tel" defaultValue={contatto.telefono ?? ''} />
            </div>
          </div>
          <div className="campi-affiancati">
            <div className="campo">
              <label htmlFor="stato">Stato</label>
              <select id="stato" name="stato" defaultValue={contatto.stato}>
                {STATI.map((s) => (
                  <option key={s} value={s}>{ETICHETTE_STATO[s]}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="assegnato_a">Segue</label>
              <select id="assegnato_a" name="assegnato_a" defaultValue={contatto.assegnato_a ?? ''}>
                <option value="">Nessuno</option>
                {profili.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="campo">
            <label htmlFor="tag">Tag (separati da virgola)</label>
            <input id="tag" name="tag" type="text" defaultValue={contatto.tag.join(', ')} placeholder="gres, seconda casa" />
          </div>
          <div className="azioni">
            <button type="submit">Salva</button>
            {contatto.telefono && (
              <a className="bottone bottone-secondario" href={`tel:${contatto.telefono}`}>Chiama</a>
            )}
            {contatto.email && (
              <a className="bottone bottone-secondario" href={`mailto:${contatto.email}`}>Scrivi</a>
            )}
          </div>
        </form>
        <p className="nota-piede" style={{ marginTop: 12 }}>
          Consenso promozionale:{' '}
          {contatto.consenso_marketing ? `sì, dato il ${soloData(contatto.consenso_il)}` : 'non dato'}.
        </p>
      </section>

      <section className="scheda">
        <h2>Credito Club Rama</h2>
        {lead.length === 0 && <p className="vuoto">Non è mai passato dalla card NFC.</p>}
        {lead.map((credito) => (
          <div key={credito.id} className="riga">
            <div className="cresce">
              <div className="nome codice">{credito.codice}</div>
              <div className="sotto">
                {credito.progetto} · stile {credito.stile.toLowerCase()} · ritiro {credito.consegna.toLowerCase()} ·{' '}
                {credito.credito_eur} € · scade il {soloData(credito.scadenza)}
              </div>
            </div>
            {credito.riscattato_il ? (
              <span className="pastiglia cliente">riscattato</span>
            ) : (
              <span className="pastiglia">da riscattare</span>
            )}
          </div>
        ))}
        {lead.length > 0 && (
          <p className="nota-piede" style={{ marginTop: 10 }}>
            Il riscatto si segna dalla pagina <Link href="/codice">Codice</Link>, cercando il codice che mostra il cliente.
          </p>
        )}
      </section>

      <section className="scheda">
        <h2>Promemoria</h2>
        {daFare.length === 0 && <p className="vuoto">Niente in sospeso per questo contatto.</p>}
        {daFare.map((voce) => (
          <div key={voce.id} className="riga">
            <div className="cresce">
              <div className="nome">{voce.titolo}</div>
              <div className="sotto">{ETICHETTE_TIPO[voce.tipo]} · {quando(voce.scadenza)}</div>
            </div>
            {inRitardo(voce.scadenza) && <span className="pastiglia ritardo">in ritardo</span>}
            <form action={segnaAttivitaFatta}>
              <input type="hidden" name="id" value={voce.id} />
              <button type="submit" className="bottone-minuto">Fatto</button>
            </form>
          </div>
        ))}
        <form action={creaAttivita} style={{ marginTop: 14 }}>
          <input type="hidden" name="contatto_id" value={contatto.id} />
          <div className="campo">
            <label htmlFor="titolo">Nuovo promemoria</label>
            <input id="titolo" name="titolo" type="text" required placeholder={`Richiamare ${contatto.nome}`} />
          </div>
          <div className="campi-affiancati">
            <div className="campo">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" name="tipo" defaultValue="chiamata">
                {TIPI_ATTIVITA.map((tipo) => (
                  <option key={tipo} value={tipo}>{ETICHETTE_TIPO[tipo]}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="scadenza">Quando</label>
              <input id="scadenza" name="scadenza" type="datetime-local" />
            </div>
          </div>
          <button type="submit" className="bottone-secondario">Aggiungi</button>
        </form>
      </section>

      <section className="scheda">
        <h2>Note</h2>
        <form action={aggiungiNota}>
          <input type="hidden" name="contatto_id" value={contatto.id} />
          <div className="campo">
            <label htmlFor="testo">Cosa è successo</label>
            <textarea id="testo" name="testo" required placeholder="Cercava un gres effetto legno per il salotto…" />
          </div>
          <button type="submit">Salva nota</button>
        </form>
        <ul className="timeline" style={{ marginTop: 14 }}>
          {note.length === 0 && <li className="vuoto">Nessuna nota.</li>}
          {note.map((nota) => (
            <li key={nota.id}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{nota.testo}</div>
              <div className="meta">
                {dataOra(nota.creato_il)}
                {nota.profili?.nome ? ` · ${nota.profili.nome}` : ''}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="scheda">
        <h2>Cancellazione</h2>
        <p className="nota-piede">
          Se il cliente chiede di essere cancellato, qui sparisce davvero: scheda, note, promemoria e credito. Non si
          torna indietro.
        </p>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--allarme)' }}>Elimina questo contatto</summary>
          <form action={eliminaContatto} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={contatto.id} />
            <button type="submit" className="bottone-pericolo">Sì, elimina tutto</button>
          </form>
        </details>
      </section>

      <p className="nota-piede"><Link href="/contatti">← Tutti i contatti</Link></p>
    </main>
  );
}
