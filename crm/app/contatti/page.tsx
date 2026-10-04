import Link from 'next/link';
import { deposito } from '@/lib/dati';
import { CHIAVI_ATTENZIONE, elenco, type ChiaveAttenzione, type Filtri, type Ordine } from '@/lib/dati/istantanea';
import { FASI, FONTI, INTERESSI, type Fase, type Fonte, type Interesse } from '@/lib/dominio/tipi';
import { FASI_DESCRITTE, nomeFase } from '@/lib/dominio/fasi';
import { FONTI_DESCRITTE, coloreFonte, nomeFonte } from '@/lib/dominio/fonti';
import { ETICHETTA_INTERESSE, euro } from '@/lib/dominio/etichette';
import { daQuanto, quando, soloData } from '@/lib/formato';
import { Fonte as PezzoFonte, RigaContatto, Valore } from '../pezzi';
import { TastoFiltri } from '../interattivi';

// La rubrica vera: si cerca, si filtra, si ordina. Le scorciatoie in cima
// sono le domande che ci si fa davvero — "chi non risponde?", "chi è fermo?" —
// scritte una volta sola invece di essere ricomposte ogni giorno a mano.

export const dynamic = 'force-dynamic';

const SCORCIATOIE: { testo: string; query: string }[] = [
  { testo: 'Tutti', query: '' },
  { testo: 'Senza prossima azione', query: 'attenzione=senza_azione' },
  { testo: 'Preventivi sopra 3.000 €', query: 'fase=preventivo&valoreMin=3000' },
  { testo: 'Instagram, ultimi 30 giorni', query: 'fonte=instagram&entratiDa=30' },
  { testo: 'Zitti da più di 5 giorni', query: 'silenzioDa=5' },
  { testo: 'Preventivi senza risposta', query: 'attenzione=preventivo_muto' },
  { testo: 'Azioni scadute', query: 'attenzione=azione_scaduta' },
];

const ORDINI: { id: Ordine; testo: string }[] = [
  { id: 'priorita', testo: 'Priorità' },
  { id: 'valore', testo: 'Valore' },
  { id: 'scadenza', testo: 'Prossima azione' },
  { id: 'recenti', testo: 'Più recenti' },
  { id: 'nome', testo: 'Nome' },
];

const SPIEGA_SCEGLI: Record<string, string> = {
  attivita: 'Scegli la persona a cui aggiungere l’attività.',
  preventivo: 'Scegli la persona per cui registrare il preventivo.',
  nota: 'Scegli la persona su cui scrivere la nota.',
};

export default async function Contatti({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const dati = await (await deposito()).istantanea();

  const filtri: Filtri = {
    cerca: p.q ?? '',
    fase: FASI.includes(p.fase as Fase) ? (p.fase as Fase) : null,
    fonte: FONTI.includes(p.fonte as Fonte) ? (p.fonte as Fonte) : null,
    interesse: INTERESSI.includes(p.interesse as Interesse) ? (p.interesse as Interesse) : null,
    valoreMin: p.valoreMin ? Number(p.valoreMin) || null : null,
    silenzioDa: p.silenzioDa ? Number(p.silenzioDa) || null : null,
    entratiDa: p.entratiDa ? Number(p.entratiDa) || null : null,
    attenzione: CHIAVI_ATTENZIONE.includes(p.attenzione as ChiaveAttenzione)
      ? (p.attenzione as ChiaveAttenzione) : null,
    ordine: (ORDINI.some((o) => o.id === p.ordine) ? p.ordine : 'priorita') as Ordine,
  };

  const righe = elenco(dati, filtri);
  const valoreTotale = righe.reduce((s, c) => s + c.valore, 0);
  const queryAttuale = new URLSearchParams(
    Object.entries(p).filter(([k, v]) => v && k !== 'scegli' && k !== 'avviso') as [string, string][],
  ).toString();

  // Quanti filtri sono accesi: è il numero che sta sul pulsante «Filtri», e
  // serve a non dover aprire il foglio per sapere se è rimasto qualcosa su.
  // La ricerca scritta non si conta: quella si vede già nella barra.
  const accesi = [
    filtri.fase, filtri.fonte, filtri.interesse, filtri.valoreMin,
    filtri.silenzioDa, filtri.entratiDa, filtri.attenzione,
    filtri.ordine !== 'priorita' ? filtri.ordine : null,
  ].filter(Boolean).length;

  // Il foglio dei filtri è un modulo GET come prima: cambia solo dove sta.
  // Gli altri parametri viaggiano nascosti, così aprire i filtri non
  // cancella la ricerca che si stava facendo.
  const filtriDelFoglio = (
    <form method="get">
      {p.scegli && <input type="hidden" name="scegli" value={p.scegli} />}
      {filtri.cerca && <input type="hidden" name="q" value={filtri.cerca} />}
      {filtri.attenzione && <input type="hidden" name="attenzione" value={filtri.attenzione} />}
      {filtri.entratiDa && <input type="hidden" name="entratiDa" value={String(filtri.entratiDa)} />}

      <div className="campo">
        <label htmlFor="f-fase">Fase</label>
        <select id="f-fase" name="fase" defaultValue={filtri.fase ?? ''}>
          <option value="">Tutte le fasi</option>
          {FASI_DESCRITTE.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="f-fonte">Da dove arriva</label>
        <select id="f-fonte" name="fonte" defaultValue={filtri.fonte ?? ''}>
          <option value="">Tutte le fonti</option>
          {FONTI_DESCRITTE.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="f-interesse">Che lavoro</label>
        <select id="f-interesse" name="interesse" defaultValue={filtri.interesse ?? ''}>
          <option value="">Tutti i lavori</option>
          {INTERESSI.map((i) => <option key={i} value={i}>{ETICHETTA_INTERESSE[i]}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="f-valore">Valore minimo</label>
        <select id="f-valore" name="valoreMin" defaultValue={p.valoreMin ?? ''}>
          <option value="">Qualsiasi valore</option>
          <option value="1000">da 1.000 €</option>
          <option value="3000">da 3.000 €</option>
          <option value="5000">da 5.000 €</option>
          <option value="10000">da 10.000 €</option>
        </select>
      </div>
      <div className="campo">
        <label htmlFor="f-silenzio">Da quanto non si sentono</label>
        <select id="f-silenzio" name="silenzioDa" defaultValue={p.silenzioDa ?? ''}>
          <option value="">Sentiti quando sia</option>
          <option value="5">Zitti da 5 giorni</option>
          <option value="10">Zitti da 10 giorni</option>
          <option value="20">Zitti da 20 giorni</option>
        </select>
      </div>
      <div className="campo">
        <label htmlFor="f-ordine">Ordina per</label>
        <select id="f-ordine" name="ordine" defaultValue={filtri.ordine}>
          {ORDINI.map((o) => <option key={o.id} value={o.id}>{o.testo}</option>)}
        </select>
      </div>

      <div className="coda-foglio">
        <Link href={p.scegli ? `/contatti?scegli=${p.scegli}` : '/contatti'} className="bottone bottone-fantasma bottone-grande">
          Azzera
        </Link>
        <button type="submit" className="bottone-oro bottone-grande">Mostra risultati</button>
      </div>
    </form>
  );

  return (
    <main>
      <header className="testata-grande">
        <h1>Contatti</h1>
        <p className="riepilogo">
          <span className="adesso">{righe.length} {righe.length === 1 ? 'persona' : 'persone'}</span>
          {valoreTotale > 0 && <> · <span className="euro">{euro(valoreTotale)}</span></>}
        </p>
      </header>

      {p.avviso === 'eliminato' && (
        <p className="avviso verde">Contatto eliminato con tutta la sua storia.</p>
      )}
      {p.scegli && SPIEGA_SCEGLI[p.scegli] && (
        <p className="avviso giallo">{SPIEGA_SCEGLI[p.scegli]}</p>
      )}

      <nav className="scorciatoie" aria-label="Filtri rapidi">
        {SCORCIATOIE.map((s) => (
          <Link
            key={s.testo}
            href={s.query ? `/contatti?${s.query}` : '/contatti'}
            className={`scorciatoia${queryAttuale === s.query ? ' attiva' : ''}`}
          >
            {s.testo}
          </Link>
        ))}
      </nav>

      {/* La ricerca sta sempre in vista; i menu a tendina stanno nel foglio.
          Niente è sparito: aprendo «Filtri» ci sono tutti e sei, con lo
          stesso nome e le stesse scelte di prima. */}
      <div className="riga-ricerca">
        <form method="get" className="ricerca">
          {p.scegli && <input type="hidden" name="scegli" value={p.scegli} />}
          {filtri.fase && <input type="hidden" name="fase" value={filtri.fase} />}
          {filtri.fonte && <input type="hidden" name="fonte" value={filtri.fonte} />}
          {filtri.interesse && <input type="hidden" name="interesse" value={filtri.interesse} />}
          {filtri.valoreMin && <input type="hidden" name="valoreMin" value={String(filtri.valoreMin)} />}
          {filtri.silenzioDa && <input type="hidden" name="silenzioDa" value={String(filtri.silenzioDa)} />}
          {filtri.entratiDa && <input type="hidden" name="entratiDa" value={String(filtri.entratiDa)} />}
          {filtri.attenzione && <input type="hidden" name="attenzione" value={filtri.attenzione} />}
          {filtri.ordine !== 'priorita' && <input type="hidden" name="ordine" value={filtri.ordine} />}
          <span className="lente" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          </span>
          <input type="search" name="q" defaultValue={filtri.cerca} placeholder="Nome, email, telefono, città" aria-label="Cerca" />
        </form>
        <TastoFiltri quanti={accesi}>{filtriDelFoglio}</TastoFiltri>
      </div>

      {righe.length === 0 && (
        <div className="tutto-fatto">
          <span className="faccia" aria-hidden="true">🔍</span>
          <span className="frase">Nessuno con questi filtri</span>
          <span className="sotto-frase">Tocca «Filtri» e poi «Azzera» per rivedere tutti.</span>
        </div>
      )}

      {righe.length > 0 && (
        <>
          <div className="scheda solo-largo" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="tabella-scorri">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Fonte</th>
                    <th>Lavoro</th>
                    <th>Fase</th>
                    <th className="num">Valore</th>
                    <th>Ultimo contatto</th>
                    <th>Prossima azione</th>
                    <th>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/contatti/${c.id}`} className={`con-striscia ${c.priorita}`} style={{ paddingLeft: 9, display: 'inline-block' }}>
                          {c.nomeCompleto}
                          {c.citta && <span style={{ color: 'var(--ink-3)' }}> · {c.citta}</span>}
                        </Link>
                      </td>
                      <td><PezzoFonte id={c.fonte} dettaglio={c.fonteDettaglio} /></td>
                      <td style={{ color: 'var(--ink-2)' }}>{c.interesse ? ETICHETTA_INTERESSE[c.interesse] : '—'}</td>
                      <td><span className="pastiglia">{nomeFase(c.fase)}</span></td>
                      <td className="num"><Valore v={c.valore} /></td>
                      <td style={{ color: 'var(--ink-2)' }}>{daQuanto(c.giorniDiSilenzio)}</td>
                      <td className="tronca" style={{ color: c.prossimaAzione ? undefined : 'var(--urgente)' }}>
                        {c.prossimaAzione?.descrizione ?? 'nessuna'}
                      </td>
                      <td style={{ color: 'var(--ink-2)' }}>
                        {c.prossimaAzione ? quando(c.prossimaAzione.scadenza) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="solo-stretto">
            {righe.map((c) => <RigaContatto key={c.id} contatto={c} />)}
          </div>
        </>
      )}

      <p className="nota-piede" style={{ marginTop: 14 }}>
        <a href="/api/export">Scarica tutto in CSV</a> · <Link href="/impostazioni">Impostazioni</Link>
        {righe.length > 0 && <> · ultimo ingresso {soloData(righe.map((r) => r.creatoIl).sort().reverse()[0])}</>}
      </p>
    </main>
  );
}
