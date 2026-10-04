import Link from 'next/link';
import { deposito } from '@/lib/dati';
import { pipeline as calcolaPipeline, valorePipeline } from '@/lib/dati/istantanea';
import { ETICHETTA_INTERESSE, euro } from '@/lib/dominio/etichette';
import { coloreFonte, nomeFonte } from '@/lib/dominio/fonti';
import { fase as descriviFase } from '@/lib/dominio/fasi';
import { daQuanto, inRitardo, quando } from '@/lib/formato';
import { Kanban, type Colonna } from './kanban';
import { TastoInfo } from '../interattivi';

// Due modi di guardare la stessa cosa: l'imbuto dice dove si perde volume, il
// kanban serve a lavorarci dentro.

export const dynamic = 'force-dynamic';

export default async function Pipeline() {
  const dati = await (await deposito()).istantanea();
  const fasi = calcolaPipeline(dati);
  const totale = valorePipeline(dati);
  const massimo = Math.max(...fasi.map((f) => f.conteggio), 1);
  const attive = fasi.filter((f) => descriviFase(f.fase).attiva);

  const colonne: Colonna[] = fasi.map((f) => ({
    fase: f.fase,
    nome: f.nome,
    valore: f.valore ? euro(f.valore) : '—',
    carte: f.contatti.map((c) => ({
      id: c.id,
      nome: c.nomeCompleto,
      fonte: nomeFonte(c.fonte),
      fonteId: c.fonte,
      interesse: c.interesse ? ETICHETTA_INTERESSE[c.interesse] : null,
      valore: c.valore ? euro(c.valore) : '—',
      ultimoTocco: daQuanto(c.giorniDiSilenzio),
      prossima: c.prossimaAzione?.descrizione ?? null,
      scadenza: c.prossimaAzione ? quando(c.prossimaAzione.scadenza) : null,
      inRitardo: c.prossimaAzione ? inRitardo(c.prossimaAzione.scadenza) : false,
      priorita: c.priorita,
    })),
  }));

  return (
    <main>
      <header className="testata-grande">
        <h1>A che punto siamo</h1>
        <p className="riepilogo">
          <span className="adesso">{euro(totale)} in gioco</span>
          {` · ${attive.reduce((n, f) => n + f.conteggio, 0)} persone nel percorso`}
        </p>
      </header>

      {/* Qui si vede dove sono le persone adesso. Le percentuali di passaggio
          — quante ne arrivano da una fase all'altra — stanno in Numeri, e il
          modo più corto per arrivarci è un pulsante, non una frase. */}
      <section className="sezione" style={{ marginTop: 4, marginBottom: 16 }}>
        <Link href="/analisi" className="bottone bottone-fantasma bottone-grande">
          Vedi i Numeri →
        </Link>
      </section>

      <section className="sezione">
        <div className="azioni-riga" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Dove sono adesso le persone</h2>
          <TastoInfo titolo="Dove sono adesso le persone">
            Questa è una fotografia di adesso, non una conversione: la barra misura quante persone sono ferme in
            quella fase, la cifra a destra quanto valgono. Le percentuali di passaggio stanno in{' '}
            <Link href="/analisi">Numeri</Link>. Tocca una fase per vedere chi c&apos;è dentro. Fuori dal percorso:{' '}
            {fasi.find((f) => f.fase === 'cliente')?.conteggio ?? 0} clienti e{' '}
            {fasi.find((f) => f.fase === 'perso')?.conteggio ?? 0} persi.
          </TastoInfo>
        </div>
        <div className="scheda">
          <div className="imbuto">
            {attive.map((f) => (
              <Link key={f.fase} href={`/contatti?fase=${f.fase}`} className="gradino">
                <span className="nome">{f.nome}</span>
                <span className="barra-valore" aria-hidden="true">
                  <span className="riempimento" style={{ width: `${Math.round((f.conteggio / massimo) * 100)}%` }} />
                </span>
                <span className="conta">{f.conteggio}</span>
                <span className="valore">{f.valore ? euro(f.valore) : '—'}</span>
                <span className="freccia-dx" aria-hidden="true">
                  <svg viewBox="0 0 8 13"><path d="m1 1 5.5 5.5L1 12" /></svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="sezione">
        <div className="azioni-riga" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Il tabellone</h2>
          <TastoInfo titolo="Il tabellone">
            Trascina una card per cambiare fase, o usa il menu «Sposta in» dal telefono. Il CRM registra il passaggio
            nella storia del contatto e, se resta senza prossima azione, gliene propone una.
          </TastoInfo>
        </div>
        <Kanban colonne={colonne} />
      </section>
    </main>
  );
}
