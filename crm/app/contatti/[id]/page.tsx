import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deposito } from '@/lib/dati';
import { scheda as leggiScheda } from '@/lib/dati/istantanea';
import {
  FASI, INTERESSI, MOTIVI_PERSO, PRIORITA, TIPI_AZIONE, TIPI_EVENTO,
} from '@/lib/dominio/tipi';
import { FASI_DESCRITTE, fase as descriviFase, nomeFase } from '@/lib/dominio/fasi';
import { FONTI_DESCRITTE, coloreFonte } from '@/lib/dominio/fonti';
import {
  ETICHETTA_AZIONE, ETICHETTA_EVENTO, ETICHETTA_INTERESSE, ETICHETTA_MOTIVO,
  ETICHETTA_PRIORITA, ETICHETTA_STATO_OPPORTUNITA, euro,
} from '@/lib/dominio/etichette';
import { daQuanto, dataOra, inRitardo, quando, soloData } from '@/lib/formato';
import {
  aggiornaContatto, aggiornaOpportunita, cambiaFase, completaAzione, creaAzione,
  creaOpportunita, eliminaContatto, modificaAzione, posticipaAzione, registraEvento,
} from '../../azioni';
import { Fonte, Priorita } from '../../pezzi';

// La scheda. Si apre e si sa: cosa devo fare, cosa è successo, quanto vale,
// dove siamo arrivati. In quest'ordine.

export const dynamic = 'force-dynamic';

const COLORE_EVENTO: Partial<Record<string, string>> = {
  lead_ricevuto: 'var(--oro)',
  preventivo_inviato: 'var(--da-fare)',
  ordine: 'var(--bene)',
  campione_consegnato: 'var(--da-fare)',
  cambio_fase: 'var(--ink-3)',
};

export default async function Scheda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dati = await (await deposito()).istantanea();
  const s = leggiScheda(dati, id);
  if (!s) notFound();

  const { contatto: c, prossimaAzione: prossima } = s;
  const nomeIntero = `${c.nome} ${c.cognome}`.trim();
  const opportunitaAperta = s.opportunita.find((o) => o.stato === 'aperta');
  const azioniFatte = s.azioni.filter((a) => a.fattaIl);
  const altreAperte = s.azioni.filter((a) => !a.fattaIl && a.id !== prossima?.id);

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <p className="nota-piede" style={{ marginBottom: 4 }}>
            <Link href="/contatti">← Contatti</Link>
          </p>
          <h1>{nomeIntero}</h1>
          <p className="lede">
            {c.citta ? `${c.citta}${c.provincia ? ` (${c.provincia})` : ''}` : 'città non indicata'}
            {' · '}
            in rubrica dal {soloData(c.creatoIl)}
            {' · '}
            {s.giorniDiSilenzio === 0 ? 'sentito oggi' : `sentito ${daQuanto(s.giorniDiSilenzio)}`}
          </p>
        </div>
        <div className="azioni-riga">
          {c.telefono && <a className="bottone bottone-fantasma" href={`tel:${c.telefono}`}>Chiama</a>}
          {c.telefono && (
            <a className="bottone bottone-fantasma" href={`https://wa.me/${c.telefono.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener">
              WhatsApp
            </a>
          )}
          {c.email && <a className="bottone bottone-fantasma" href={`mailto:${c.email}`}>Email</a>}
        </div>
      </header>

      <div className="azioni-riga" style={{ marginBottom: 18 }}>
        <Fonte id={c.fonte} dettaglio={c.fonteDettaglio} />
        <span className="pastiglia oro">{nomeFase(c.fase)}</span>
        <Priorita valore={s.priorita} />
        <span className="euro" style={{ fontSize: 17, marginLeft: 'auto' }}>{euro(s.valore)}</span>
      </div>

      {/* ------------------------------------------------------------------
          1. PROSSIMA AZIONE — la ragione per cui questa pagina esiste
          ------------------------------------------------------------------ */}
      <section className="sezione" style={{ marginTop: 0 }}>
        <div className={`prossima-azione ${prossima ? (inRitardo(prossima.scadenza) ? 'urgente' : '') : 'nessuna'}`}>
          <h2 style={{ margin: 0 }}>Prossima azione</h2>
          {prossima ? (
            <>
              <p className="cosa">{prossima.descrizione}</p>
              <p className="quando">
                {ETICHETTA_AZIONE[prossima.tipo]} · {inRitardo(prossima.scadenza) ? 'era ' : ''}
                {prossima.haOra ? dataOra(prossima.scadenza) : quando(prossima.scadenza)}
                {inRitardo(prossima.scadenza) && <strong style={{ color: 'var(--urgente)' }}> — in ritardo</strong>}
              </p>
              <div className="azioni-riga" style={{ marginTop: 12 }}>
                <form action={completaAzione}>
                  <input type="hidden" name="id" value={prossima.id} />
                  <input type="hidden" name="contatto_id" value={c.id} />
                  <button type="submit" className="bottone-oro">Completa</button>
                </form>
                {[1, 3, 7].map((g) => (
                  <form key={g} action={posticipaAzione}>
                    <input type="hidden" name="id" value={prossima.id} />
                    <input type="hidden" name="contatto_id" value={c.id} />
                    <input type="hidden" name="giorni" value={g} />
                    <button type="submit" className="bottone-fantasma bottone-piccolo">
                      +{g} {g === 1 ? 'giorno' : 'giorni'}
                    </button>
                  </form>
                ))}
              </div>

              <details style={{ marginTop: 12 }}>
                <summary className="nota-piede" style={{ cursor: 'pointer' }}>Modifica questa azione</summary>
                <form action={modificaAzione} style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={prossima.id} />
                  <input type="hidden" name="contatto_id" value={c.id} />
                  <div className="campo">
                    <label htmlFor="mod-descrizione">Cosa</label>
                    <input id="mod-descrizione" name="descrizione" type="text" defaultValue={prossima.descrizione} required />
                  </div>
                  <div className="campi-3">
                    <div className="campo">
                      <label htmlFor="mod-tipo">Tipo</label>
                      <select id="mod-tipo" name="tipo" defaultValue={prossima.tipo}>
                        {TIPI_AZIONE.map((t) => <option key={t} value={t}>{ETICHETTA_AZIONE[t]}</option>)}
                      </select>
                    </div>
                    <div className="campo">
                      <label htmlFor="mod-scadenza">Quando</label>
                      <input id="mod-scadenza" name="scadenza" type="datetime-local" defaultValue={prossima.scadenza.slice(0, 16)} />
                    </div>
                    <div className="campo">
                      <label htmlFor="mod-priorita">Priorità</label>
                      <select id="mod-priorita" name="priorita" defaultValue={prossima.priorita}>
                        {PRIORITA.map((p) => <option key={p} value={p}>{ETICHETTA_PRIORITA[p]}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="bottone-fantasma">Salva l&apos;azione</button>
                </form>
              </details>
            </>
          ) : (
            <>
              <p className="cosa" style={{ color: 'var(--urgente)' }}>Nessuna prossima azione</p>
              <p className="quando">
                {descriviFase(c.fase).chiusa
                  ? 'Il contatto è fuori dal percorso: va bene così.'
                  : 'Questo contatto è vivo e non sta aspettando niente da nessuno. Decidi cosa fare, qui sotto.'}
              </p>
            </>
          )}
        </div>

        {altreAperte.length > 0 && (
          <div className="scheda scheda-fitta" style={{ marginTop: 10 }}>
            {altreAperte.map((a) => (
              <div key={a.id} className="riga">
                <span className="cresce">
                  <span className="titolo">{a.descrizione}</span>
                  <span className="sotto">{ETICHETTA_AZIONE[a.tipo]} · {quando(a.scadenza)}</span>
                </span>
                <form action={completaAzione}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="contatto_id" value={c.id} />
                  <button type="submit" className="bottone-fantasma bottone-piccolo">Completa</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------
          2. FASE
          ------------------------------------------------------------------ */}
      <section className="sezione">
        <h2>A che punto siamo</h2>
        <div className="scheda">
          <form action={cambiaFase} className="azioni-riga">
            <input type="hidden" name="id" value={c.id} />
            <div style={{ flex: 1, minWidth: 190 }}>
              <label htmlFor="fase">Fase</label>
              <select id="fase" name="fase" defaultValue={c.fase}>
                {FASI_DESCRITTE.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <button type="submit" style={{ marginTop: 17 }}>Sposta</button>
          </form>
          <p className="nota-piede" style={{ marginTop: 10, marginBottom: 0 }}>
            <strong>{nomeFase(c.fase)}</strong> — {descriviFase(c.fase).entra}. Si esce quando: {descriviFase(c.fase).esce.toLowerCase()}.
          </p>
        </div>
      </section>

      <div className="colonne">
        {/* ----------------------------------------------------------------
            3. PERCORSO
            ---------------------------------------------------------------- */}
        <section className="sezione" style={{ marginTop: 26 }}>
          <h2>Il percorso</h2>
          <div className="scheda">
            <ul className="tempo">
              {s.eventi.length === 0 && <li className="elenco-vuoto">Ancora niente da raccontare.</li>}
              {s.eventi.map((e) => (
                <li key={e.id} style={{ ['--segno' as string]: COLORE_EVENTO[e.tipo] ?? 'var(--ink-3)' }}>
                  <span className="quando">{dataOra(e.quando)}</span>
                  <div className="cosa">
                    {ETICHETTA_EVENTO[e.tipo]}
                    {e.valore ? <span className="euro" style={{ color: 'var(--oro-chiaro)' }}> · {euro(e.valore)}</span> : null}
                  </div>
                  <div className="dettaglio">{e.descrizione}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="scheda" style={{ marginTop: 10 }}>
            <h3>+ Nuova attività</h3>
            <form action={registraEvento}>
              <input type="hidden" name="contatto_id" value={c.id} />
              <div className="campi-2">
                <div className="campo">
                  <label htmlFor="ev-tipo">Cos&apos;è successo</label>
                  <select id="ev-tipo" name="tipo" defaultValue="telefonata">
                    {TIPI_EVENTO.filter((t) => t !== 'cambio_fase').map((t) => (
                      <option key={t} value={t}>{ETICHETTA_EVENTO[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="campo">
                  <label htmlFor="ev-valore">Valore (facoltativo)</label>
                  <input id="ev-valore" name="valore" type="text" inputMode="numeric" placeholder="4850" />
                </div>
              </div>
              <div className="campo">
                <label htmlFor="ev-descrizione">Come è andata</label>
                <textarea id="ev-descrizione" name="descrizione" required placeholder="Richiamata: valuta ancora, risente entro venerdì" />
              </div>
              <button type="submit">Registra</button>
            </form>
            <p className="nota-piede" style={{ marginTop: 10, marginBottom: 0 }}>
              Registrando un preventivo o una consegna di campioni, il CRM apre da sé il promemoria di follow-up —
              se non ce n&apos;è già uno aperto.
            </p>
          </div>
        </section>

        <div>
          {/* --------------------------------------------------------------
              4. OPPORTUNITÀ
              -------------------------------------------------------------- */}
          <section className="sezione" style={{ marginTop: 26 }}>
            <h2>Opportunità</h2>
            <div className="scheda scheda-fitta">
              {s.opportunita.length === 0 && (
                <p className="elenco-vuoto">Nessun lavoro aperto: senza, questo contatto non pesa in pipeline.</p>
              )}
              {s.opportunita.map((o) => (
                <div key={o.id} className="riga" style={{ display: 'block' }}>
                  <div className="azioni-riga" style={{ justifyContent: 'space-between' }}>
                    <span className="titolo">{o.titolo}</span>
                    <span className={`pastiglia ${o.stato === 'vinta' ? 'bene' : o.stato === 'persa' ? 'urgente' : ''}`}>
                      {ETICHETTA_STATO_OPPORTUNITA[o.stato]}
                    </span>
                  </div>
                  <div className="sotto" style={{ marginTop: 2 }}>
                    {ETICHETTA_INTERESSE[o.interesse]}
                    {o.descrizione ? ` · ${o.descrizione}` : ''}
                    {o.dataPreventivo ? ` · preventivo del ${soloData(o.dataPreventivo)}` : ''}
                    {o.motivoPerso ? ` · perso per ${ETICHETTA_MOTIVO[o.motivoPerso].toLowerCase()}` : ''}
                  </div>
                  <div className="azioni-riga" style={{ marginTop: 8 }}>
                    <span className="euro">
                      {o.valorePreventivo ? `preventivo ${euro(o.valorePreventivo)}` : `stima ${euro(o.valoreStimato)}`}
                    </span>
                    {o.stato === 'aperta' && (
                      <>
                        <form action={aggiornaOpportunita}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="contatto_id" value={c.id} />
                          <input type="hidden" name="stato" value="vinta" />
                          <button type="submit" className="bottone-fantasma bottone-piccolo">Vinta</button>
                        </form>
                        <details>
                          <summary className="nota-piede" style={{ cursor: 'pointer' }}>Persa…</summary>
                          <form action={aggiornaOpportunita} style={{ marginTop: 8 }}>
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="contatto_id" value={c.id} />
                            <input type="hidden" name="stato" value="persa" />
                            <div className="campo">
                              <label htmlFor={`motivo-${o.id}`}>Perché</label>
                              <select id={`motivo-${o.id}`} name="motivo_perso" defaultValue="prezzo">
                                {MOTIVI_PERSO.map((m) => <option key={m} value={m}>{ETICHETTA_MOTIVO[m]}</option>)}
                              </select>
                            </div>
                            <button type="submit" className="bottone-pericolo bottone-piccolo">Segna persa</button>
                          </form>
                        </details>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <details className="scheda" style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 550 }}>+ Nuova opportunità</summary>
              <form action={creaOpportunita} style={{ marginTop: 12 }}>
                <input type="hidden" name="contatto_id" value={c.id} />
                <div className="campo">
                  <label htmlFor="opp-titolo">Che lavoro</label>
                  <input id="opp-titolo" name="titolo" type="text" required placeholder="Bagno padronale + lavanderia" />
                </div>
                <div className="campi-3">
                  <div className="campo">
                    <label htmlFor="opp-interesse">Tipo</label>
                    <select id="opp-interesse" name="interesse" defaultValue="bagno">
                      {INTERESSI.map((i) => <option key={i} value={i}>{ETICHETTA_INTERESSE[i]}</option>)}
                    </select>
                  </div>
                  <div className="campo">
                    <label htmlFor="opp-stima">Stima €</label>
                    <input id="opp-stima" name="valore_stimato" type="text" inputMode="numeric" placeholder="4200" />
                  </div>
                  <div className="campo">
                    <label htmlFor="opp-preventivo">Preventivo €</label>
                    <input id="opp-preventivo" name="valore_preventivo" type="text" inputMode="numeric" />
                  </div>
                </div>
                <button type="submit" className="bottone-fantasma">Aggiungi</button>
              </form>
            </details>
          </section>

          {/* --------------------------------------------------------------
              5. PROMEMORIA
              -------------------------------------------------------------- */}
          <section className="sezione">
            <h2>Aggiungi un promemoria</h2>
            <div className="scheda">
              <form action={creaAzione}>
                <input type="hidden" name="contatto_id" value={c.id} />
                <div className="campo">
                  <label htmlFor="az-descrizione">Cosa va fatto</label>
                  <input
                    id="az-descrizione" name="descrizione" type="text" required
                    placeholder={`Richiamare ${c.nome}`}
                  />
                </div>
                <div className="campi-3">
                  <div className="campo">
                    <label htmlFor="az-tipo">Tipo</label>
                    <select id="az-tipo" name="tipo" defaultValue="richiamare">
                      {TIPI_AZIONE.map((t) => <option key={t} value={t}>{ETICHETTA_AZIONE[t]}</option>)}
                    </select>
                  </div>
                  <div className="campo">
                    <label htmlFor="az-scadenza">Quando</label>
                    <input id="az-scadenza" name="scadenza" type="datetime-local" />
                  </div>
                  <div className="campo">
                    <label htmlFor="az-priorita">Priorità</label>
                    <select id="az-priorita" name="priorita" defaultValue="da_fare">
                      {PRIORITA.map((p) => <option key={p} value={p}>{ETICHETTA_PRIORITA[p]}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="bottone-fantasma">Aggiungi</button>
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          6. ANAGRAFICA
          ------------------------------------------------------------------ */}
      <section className="sezione">
        <h2>Dati</h2>
        <div className="scheda">
          <form action={aggiornaContatto}>
            <input type="hidden" name="id" value={c.id} />
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="nome">Nome</label>
                <input id="nome" name="nome" type="text" defaultValue={c.nome} required />
              </div>
              <div className="campo">
                <label htmlFor="cognome">Cognome</label>
                <input id="cognome" name="cognome" type="text" defaultValue={c.cognome} />
              </div>
            </div>
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="telefono">Telefono</label>
                <input id="telefono" name="telefono" type="tel" defaultValue={c.telefono ?? ''} />
              </div>
              <div className="campo">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" defaultValue={c.email ?? ''} />
              </div>
            </div>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="citta">Città</label>
                <input id="citta" name="citta" type="text" defaultValue={c.citta ?? ''} />
              </div>
              <div className="campo">
                <label htmlFor="provincia">Provincia</label>
                <input id="provincia" name="provincia" type="text" maxLength={2} defaultValue={c.provincia ?? ''} />
              </div>
              <div className="campo">
                <label htmlFor="fonte">Fonte</label>
                <select id="fonte" name="fonte" defaultValue={c.fonte}>
                  {FONTI_DESCRITTE.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="fonte_dettaglio">Come è arrivato, in dettaglio</label>
              <input id="fonte_dettaglio" name="fonte_dettaglio" type="text" defaultValue={c.fonteDettaglio ?? ''} placeholder="campagna «bagno settembre», storia del 12…" />
            </div>
            <div className="campo">
              <label htmlFor="tag">Tag (separati da virgola)</label>
              <input id="tag" name="tag" type="text" defaultValue={c.tag.join(', ')} />
            </div>
            <div className="campo">
              <label htmlFor="note">Note</label>
              <textarea id="note" name="note" defaultValue={c.note ?? ''} placeholder="Gusti, vincoli, chi decide davvero…" />
            </div>
            <div className="campo">
              <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: 'var(--ink-2)' }}>
                <input type="checkbox" name="consenso" defaultChecked={c.consensoMarketing} style={{ width: 'auto', marginTop: 3 }} />
                <span style={{ fontSize: 13 }}>
                  Ha dato il consenso alle comunicazioni promozionali
                  {c.consensoIl && <> — registrato il {soloData(c.consensoIl)}</>}
                </span>
              </label>
            </div>
            <button type="submit">Salva</button>
          </form>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--linea)' }}>
            <dl className="dati">
              <div><dt>Entrato il</dt><dd>{soloData(c.creatoIl)}</dd></div>
              <div><dt>Ultima modifica</dt><dd>{dataOra(c.aggiornatoIl)}</dd></div>
              <div><dt>Attività registrate</dt><dd>{s.eventi.length}</dd></div>
              <div><dt>Azioni completate</dt><dd>{azioniFatte.length}</dd></div>
            </dl>
          </div>

          <details style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--urgente)' }}>Elimina questo contatto</summary>
            <p className="nota-piede" style={{ marginTop: 8 }}>
              Se chiede di essere cancellato, qui sparisce davvero: scheda, storia, opportunità e promemoria.
              Non si torna indietro.
            </p>
            <form action={eliminaContatto}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="bottone-pericolo">Sì, elimina tutto</button>
            </form>
          </details>
        </div>
      </section>

      <p className="nota-piede">
        Colore della fonte: <span className="punto" style={{ background: coloreFonte(c.fonte), display: 'inline-block' }} />{' '}
        {opportunitaAperta ? `lavoro aperto: ${opportunitaAperta.titolo}` : 'nessun lavoro aperto'}
        {' · '}
        {FASI.length} fasi possibili, questa è la {FASI.indexOf(c.fase) + 1}ª.
      </p>
    </main>
  );
}
