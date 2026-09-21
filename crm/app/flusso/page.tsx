import Link from 'next/link';
import { deposito } from '@/lib/dati';
import {
  ETICHETTA_PERIODO, inizioPeriodo, pipeline as calcolaPipeline,
  conversazioniDaRispondere, daFare, type Periodo,
} from '@/lib/dati/istantanea';
import { FASI_DESCRITTE } from '@/lib/dominio/fasi';
import { euro } from '@/lib/dominio/etichette';
import type { Fonte } from '@/lib/dominio/tipi';
import { Fili } from './fili';

// FLUSSO — la schermata che risponde a una domanda sola: «da dove arriva la
// gente, dove si ferma, e cosa ne esce?»
//
// Si legge dall'alto in basso: quattro porte d'ingresso, il CRM in mezzo, il
// percorso fino all'ordine. Ogni riquadro è un link vero: ci si clicca e si
// vede chi sono quelle persone, una per una. È questa la tracciabilità —
// non un grafico da guardare, un numero da aprire.
//
// Nessun numero qui è una stima: sono conteggi sui contatti veri del CRM.

export const dynamic = 'force-dynamic';

const PERIODI: Periodo[] = ['7', '30', 'mese', 'tutto'];

// Le quattro porte, come le ha descritte il titolare. Ognuna raccoglie più
// fonti: "social" è Instagram più Facebook, non due colonne separate.
const PORTE: { chiave: string; nome: string; sotto: string; luce: string; fonti: Fonte[] }[] = [
  {
    chiave: 'social', nome: 'Social', sotto: 'Instagram e Facebook',
    luce: 'var(--viola)', fonti: ['instagram', 'facebook'],
  },
  {
    chiave: 'sito', nome: 'Sito', sotto: 'moduli e ricerca',
    luce: 'var(--ciano)', fonti: ['sito', 'google'],
  },
  {
    chiave: 'campagne', nome: 'Campagne', sotto: 'annunci a pagamento',
    luce: 'var(--blu)', fonti: ['campagna'],
  },
  {
    chiave: 'negozio', nome: 'Card NFC e showroom', sotto: 'chi passa di persona',
    luce: 'var(--oro)', fonti: ['card_nfc', 'showroom'],
  },
];

export default async function Flusso({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const p = await searchParams;
  const periodo = (PERIODI.includes(p.periodo as Periodo) ? p.periodo : '30') as Periodo;
  const da = inizioPeriodo(periodo).toISOString();

  const dati = await (await deposito()).istantanea();

  // Il periodo si applica a chi è **entrato** in quella finestra: è l'unico
  // modo perché «100 contatti» e «3 ordini» parlino delle stesse persone.
  const dentro = periodo === 'tutto' ? dati.contatti : dati.contatti.filter((c) => c.creatoIl >= da);

  const porte = PORTE.map((porta) => ({
    ...porta,
    conta: dentro.filter((c) => porta.fonti.includes(c.fonte)).length,
  }));
  const daPorte = porte.reduce((s, x) => s + x.conta, 0);
  const altre = dentro.length - daPorte;

  // Il percorso: le fasi con quanti ci sono dentro adesso e quanto valgono.
  const fasi = calcolaPipeline(dati);
  const perFase = new Map(fasi.map((f) => [f.fase, f]));
  const scia = FASI_DESCRITTE.filter((f) => f.attiva).map((f) => perFase.get(f.id)!);
  const scalaScia = Math.max(...scia.map((r) => r.conteggio), 1);

  const aspettano = daFare(dati, 0).length;
  const messaggi = conversazioniDaRispondere(dati).length;

  const clienti = perFase.get('cliente');
  const persi = perFase.get('perso');
  const inTrattativa = scia.reduce((s, r) => s + r.conteggio, 0);
  const valoreInGioco = scia.reduce((s, r) => s + r.valore, 0);

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Flusso</h1>
          <p className="lede">
            Da dove arriva la gente, dove si ferma, cosa ne esce. Ogni riquadro si apre.
          </p>
        </div>
        <nav className="azioni-riga" aria-label="Periodo">
          {PERIODI.map((x) => (
            <Link
              key={x}
              href={x === '30' ? '/flusso' : `/flusso?periodo=${x}`}
              className={`voce${periodo === x ? ' attiva' : ''}`}
            >
              {ETICHETTA_PERIODO[x]}
            </Link>
          ))}
        </nav>
      </header>

      <section className="sezione flusso" style={{ marginTop: 0 }}>
        <h2>Le porte d&apos;ingresso · {ETICHETTA_PERIODO[periodo].toLowerCase()}</h2>
        <div className="flusso-fascia porte">
          {porte.map((porta) => (
            <Link
              key={porta.chiave}
              href={`/contatti?fonte=${porta.fonti[0]}`}
              className={`tessera${porta.conta === 0 ? ' spenta' : ''}`}
              style={{ ['--luce' as string]: porta.luce }}
            >
              <span className="eti">{porta.nome}</span>
              <span className="val">{porta.conta}</span>
              <span className="sotto">{porta.sotto}</span>
            </Link>
          ))}
        </div>

        {/* Quattro fili che convergono: qualunque porta abbiano usato, le
            persone finiscono tutte nello stesso registro. */}
        <Fili direzione="dentro" />

        {/* Il cuore. Sotto, le due cose che il CRM chiede di fare adesso. */}
        <div className="nucleo">
          <span className="eti">Dentro il CRM</span>
          <span className="val">{dentro.length}</span>
          <p className="sotto">
            {periodo === 'tutto' ? 'persone in tutto' : `persone entrate ${ETICHETTA_PERIODO[periodo].toLowerCase()}`}
            {altre > 0 && <> · {altre} da altre strade</>}
          </p>
          <div className="azioni-riga" style={{ justifyContent: 'center', marginTop: 12 }}>
            <Link href="/" className={`pastiglia ${aspettano > 0 ? 'urgente' : 'bene'}`}>
              {aspettano} {aspettano === 1 ? 'cosa da fare oggi' : 'cose da fare oggi'}
            </Link>
            <Link href="/" className={`pastiglia ${messaggi > 0 ? 'urgente' : 'bene'}`}>
              {messaggi} {messaggi === 1 ? 'messaggio senza risposta' : 'messaggi senza risposta'}
            </Link>
          </div>
        </div>

        <h2>Dove sono arrivate</h2>
        <div className="scheda">
          <div className="scia">
            {scia.map((r) => (
              <Link
                key={r.fase}
                href={`/contatti?fase=${r.fase}`}
                className={`scia-passo${r.conteggio === 0 ? ' vuoto' : ''}`}
              >
                <span className="segno" aria-hidden="true" />
                <span className="nome">{r.nome}</span>
                <span className="barra-valore" aria-hidden="true">
                  <span className="riempimento" style={{ width: `${Math.round((r.conteggio / scalaScia) * 100)}%` }} />
                </span>
                <span className="conta">{r.conteggio}</span>
                <span className="valore">{r.valore ? euro(r.valore) : '—'}</span>
              </Link>
            ))}
          </div>
          <p className="nota-piede" style={{ marginTop: 12, marginBottom: 0 }}>
            Sono le persone che stanno <strong>adesso</strong> in ciascuna fase, non quelle che ci sono passate.
            Il valore è la somma delle opportunità aperte.
          </p>
        </div>

        <Fili direzione="fuori" />

        <h2>Come è finita</h2>
        <div className="flusso-fascia esiti">
          <Link
            href="/contatti?fase=cliente"
            className={`tessera${!clienti?.conteggio ? ' spenta' : ''}`}
            style={{ ['--luce' as string]: 'var(--bene)' }}
          >
            <span className="eti">Clienti</span>
            <span className="val">{clienti?.conteggio ?? 0}</span>
            <span className="sotto">lavoro consegnato</span>
          </Link>
          <Link
            href="/pipeline"
            className={`tessera${!inTrattativa ? ' spenta' : ''}`}
            style={{ ['--luce' as string]: 'var(--blu)' }}
          >
            <span className="eti">In gioco</span>
            <span className="val">{euro(valoreInGioco)}</span>
            <span className="sotto">{inTrattativa} in trattativa</span>
          </Link>
          <Link
            href="/contatti?fase=perso"
            className={`tessera${!persi?.conteggio ? ' spenta' : ''}`}
            style={{ ['--luce' as string]: 'var(--urgente)' }}
          >
            <span className="eti">Persi</span>
            <span className="val">{persi?.conteggio ?? 0}</span>
            <span className="sotto">col motivo, nella scheda</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
