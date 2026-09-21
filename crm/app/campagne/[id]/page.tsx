import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deposito } from '@/lib/dati';
import { arricchisci, campagne as calcolaCampagne } from '@/lib/dati/istantanea';
import {
  CANALI, ETICHETTA_CANALE, ETICHETTA_STATO_CAMPAGNA, ETICHETTA_STATO_CONVERSAZIONE,
  ETICHETTA_PIATTAFORMA, PIATTAFORME, STATI_CAMPAGNA, COLORE_CANALE,
} from '@/lib/dominio/campagne';
import { euro } from '@/lib/dominio/etichette';
import { dataOra, soloData } from '@/lib/formato';
import { aggiornaCampagna } from '../../azioni';
import { RigaContatto } from '../../pezzi';

// La scheda di una campagna: l'imbuto vero, dalle persone portate agli euro
// incassati, e sotto chi sono quelle persone.

export const dynamic = 'force-dynamic';

const ND = <span style={{ color: 'var(--ink-3)' }} title="Dato non disponibile">N/D</span>;

export default async function SchedaCampagna({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dati = await (await deposito()).istantanea();

  const riga = calcolaCampagne(dati, 'tutto').find((r) => r.campagna.id === id);
  if (!riga) notFound();

  const c = riga.campagna;
  const persone = dati.contatti
    .filter((x) => x.campagnaId === c.id)
    .map((x) => arricchisci(dati, x))
    .sort((a, b) => b.valore - a.valore);
  const fili = dati.conversazioni.filter((x) => x.campagnaId === c.id);

  // L'imbuto della campagna, nell'ordine in cui lo si legge.
  const gradini = [
    { nome: 'Contatti', valore: riga.contatti },
    { nome: 'Conversazioni', valore: riga.conversazioni },
    { nome: 'Lead presi in carico', valore: riga.lead },
    { nome: 'Qualificati', valore: riga.qualificati },
    { nome: 'Preventivi', valore: riga.preventivi },
    { nome: 'Ordini', valore: riga.ordini },
  ];
  const scala = Math.max(...gradini.map((g) => g.valore), 1);

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <p className="nota-piede" style={{ marginBottom: 4 }}><Link href="/campagne">← Campagne</Link></p>
          <h1>{c.nome}</h1>
          <p className="lede">
            <span className="fonte">
              <span className="punto" style={{ background: COLORE_CANALE[c.canaleIngresso] }} aria-hidden="true" />
              {ETICHETTA_PIATTAFORMA[c.piattaforma]}
            </span>
            {' · '}porta su {ETICHETTA_CANALE[c.canaleIngresso]}
            {' · '}{ETICHETTA_STATO_CAMPAGNA[c.stato]}
            {c.dataInizio && <> · dal {soloData(c.dataInizio)}</>}
            {c.dataFine && <> al {soloData(c.dataFine)}</>}
          </p>
        </div>
      </header>

      <section className="sezione" style={{ marginTop: 0 }}>
        <div className="numeri">
          <div className="numero">
            <span className="eti">Spesa</span>
            <span className="val">{c.spesa === null ? ND : euro(c.spesa)}</span>
            <span className="sotto">
              {c.spesa === null
                ? 'da collegare o da scrivere a mano'
                : c.spesaAggiornataIl ? `aggiornata ${dataOra(c.spesaAggiornataIl)}` : ''}
            </span>
          </div>
          <div className="numero">
            <span className="eti">Costo per contatto</span>
            <span className="val">{riga.costoPerContatto === null ? ND : euro(riga.costoPerContatto)}</span>
            <span className="sotto">{riga.contatti} {riga.contatti === 1 ? 'persona portata' : 'persone portate'}</span>
          </div>
          <div className="numero">
            <span className="eti">Costo per ordine</span>
            <span className="val">{riga.costoPerOrdine === null ? ND : euro(riga.costoPerOrdine)}</span>
            <span className="sotto">{riga.ordini} {riga.ordini === 1 ? 'ordine' : 'ordini'}</span>
          </div>
          <div className="numero">
            <span className="eti">Valore generato</span>
            <span className="val">{riga.valoreOrdini ? euro(riga.valoreOrdini) : ND}</span>
            <span className="sotto">{euro(riga.valorePreventivi)} in preventivi</span>
          </div>
        </div>
      </section>

      <div className="colonne">
        <section className="sezione">
          <h2>L&apos;imbuto di questa campagna</h2>
          <div className="scheda">
            <div className="imbuto">
              {gradini.map((g, i) => {
                const prima = i > 0 ? gradini[i - 1].valore : null;
                const resa = prima ? Math.round((g.valore / prima) * 100) : null;
                return (
                  <div key={g.nome} className="gradino">
                    <span className="nome">{g.nome}</span>
                    <span className="barra-valore" aria-hidden="true">
                      <span className="riempimento" style={{ width: `${Math.round((g.valore / scala) * 100)}%` }} />
                    </span>
                    <span className="conta">{g.valore}</span>
                    <span className="valore">{resa === null ? '—' : `${resa}%`}</span>
                  </div>
                );
              })}
            </div>
            <p className="nota-piede" style={{ marginTop: 12, marginBottom: 0 }}>
              Ogni numero è contato sui dati veri del CRM: nessuna stima. La percentuale a destra è quanti passano
              dal gradino sopra a questo.
            </p>
          </div>

          <div className="scheda" style={{ marginTop: 10 }}>
            <h3>Conversazioni</h3>
            {fili.length === 0 && (
              <p className="elenco-vuoto">
                Nessuna conversazione collegata. Arriveranno da sole quando i webhook di Meta saranno accesi.
              </p>
            )}
            {fili.map((f) => {
              const persona = dati.contatti.find((x) => x.id === f.contattoId);
              return (
                <div key={f.id} className="riga">
                  <span className="cresce">
                    <span className="titolo">
                      {persona ? `${persona.nome} ${persona.cognome}`.trim() : 'contatto rimosso'}
                    </span>
                    <span className="sotto">
                      {ETICHETTA_CANALE[f.canale]} · {dataOra(f.ultimoMessaggioIl)}
                      {f.ultimoMessaggioTesto ? ` · «${f.ultimoMessaggioTesto.slice(0, 60)}»` : ''}
                    </span>
                  </span>
                  <span className={`pastiglia ${f.nonLetta ? 'urgente' : 'bene'}`}>
                    {ETICHETTA_STATO_CONVERSAZIONE[f.stato]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="sezione">
          <h2>Le persone che ha portato</h2>
          <div className="scheda scheda-fitta">
            {persone.length === 0 && (
              <p className="elenco-vuoto">
                Ancora nessuna. Puoi collegare un contatto a questa campagna dalla sua scheda.
              </p>
            )}
            {persone.map((p) => <RigaContatto key={p.id} contatto={p} />)}
          </div>
        </section>
      </div>

      <section className="sezione">
        <h2>Dati della campagna</h2>
        <div className="scheda">
          <form action={aggiornaCampagna}>
            <input type="hidden" name="id" value={c.id} />
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" name="nome" type="text" defaultValue={c.nome} required />
            </div>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="piattaforma">Piattaforma</label>
                <select id="piattaforma" name="piattaforma" defaultValue={c.piattaforma}>
                  {PIATTAFORME.map((x) => <option key={x} value={x}>{ETICHETTA_PIATTAFORMA[x]}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="canale_ingresso">Porta su</label>
                <select id="canale_ingresso" name="canale_ingresso" defaultValue={c.canaleIngresso}>
                  {CANALI.map((x) => <option key={x} value={x}>{ETICHETTA_CANALE[x]}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="stato">Stato</label>
                <select id="stato" name="stato" defaultValue={c.stato}>
                  {STATI_CAMPAGNA.map((x) => <option key={x} value={x}>{ETICHETTA_STATO_CAMPAGNA[x]}</option>)}
                </select>
              </div>
            </div>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="data_inizio">Inizio</label>
                <input id="data_inizio" name="data_inizio" type="date" defaultValue={c.dataInizio ?? ''} />
              </div>
              <div className="campo">
                <label htmlFor="data_fine">Fine</label>
                <input id="data_fine" name="data_fine" type="date" defaultValue={c.dataFine ?? ''} />
              </div>
              <div className="campo">
                <label htmlFor="obiettivo">Obiettivo</label>
                <input id="obiettivo" name="obiettivo" type="text" defaultValue={c.obiettivo ?? ''} placeholder="Messaggi, Moduli, Traffico…" />
              </div>
            </div>
            <div className="campi-2">
              <div className="campo">
                <label htmlFor="budget">Budget €</label>
                <input id="budget" name="budget" type="text" inputMode="numeric" defaultValue={c.budget ?? ''} />
              </div>
              <div className="campo">
                <label htmlFor="spesa">Spesa € — lascia vuoto se non la sai</label>
                <input id="spesa" name="spesa" type="text" inputMode="numeric" defaultValue={c.spesa ?? ''} placeholder="N/D" />
              </div>
            </div>

            <h3 style={{ marginTop: 16 }}>Agganci alla piattaforma</h3>
            <p className="nota-piede" style={{ marginTop: -4 }}>
              Servono al CRM per riconoscere da sola la campagna quando arriverà un messaggio. Si leggono nel gestore
              inserzioni di Meta; il <strong>ref</strong> è quello che scrivi tu nell&apos;annuncio click-to-Messenger.
            </p>
            <div className="campi-3">
              <div className="campo">
                <label htmlFor="id_esterno">ID campagna</label>
                <input id="id_esterno" name="id_esterno" type="text" defaultValue={c.idEsterno ?? ''} />
              </div>
              <div className="campo">
                <label htmlFor="ad_id">ID annuncio</label>
                <input id="ad_id" name="ad_id" type="text" defaultValue={c.adId ?? ''} />
              </div>
              <div className="campo">
                <label htmlFor="parametro_ref">Parametro ref=</label>
                <input id="parametro_ref" name="parametro_ref" type="text" defaultValue={c.parametroRef ?? ''} />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="landing">Pagina di destinazione</label>
              <input id="landing" name="landing" type="text" defaultValue={c.landing ?? ''} />
            </div>
            <div className="campo">
              <label htmlFor="note">Note</label>
              <textarea id="note" name="note" defaultValue={c.note ?? ''} />
            </div>
            <button type="submit">Salva la campagna</button>
          </form>
        </div>
      </section>
    </main>
  );
}
