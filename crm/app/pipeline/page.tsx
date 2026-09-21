import Link from 'next/link';
import { deposito } from '@/lib/dati';
import { pipeline as calcolaPipeline, valorePipeline } from '@/lib/dati/istantanea';
import { ETICHETTA_INTERESSE, euro } from '@/lib/dominio/etichette';
import { coloreFonte, nomeFonte } from '@/lib/dominio/fonti';
import { fase as descriviFase } from '@/lib/dominio/fasi';
import { daQuanto, inRitardo, quando } from '@/lib/formato';
import { Kanban, type Colonna } from './kanban';

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
      coloreFonte: coloreFonte(c.fonte),
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
      <header className="testata-pagina">
        <div>
          <h1>Pipeline</h1>
          <p className="lede">
            {euro(totale)} in gioco fra chi è stato contattato e chi ha già ordinato.
          </p>
        </div>
      </header>

      <section className="sezione">
        <h2>Dove sono adesso le persone</h2>
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
              </Link>
            ))}
          </div>
          <p className="nota-piede" style={{ marginTop: 12, marginBottom: 0 }}>
            Questa è una fotografia di adesso, non una conversione: la barra misura quante persone sono ferme in
            quella fase, la cifra a destra quanto valgono. Le percentuali di passaggio stanno in{' '}
            <Link href="/analisi">Analisi</Link>. Clicca una fase per vedere chi c&apos;è dentro. Fuori dal percorso:{' '}
            {fasi.find((f) => f.fase === 'cliente')?.conteggio ?? 0} clienti e{' '}
            {fasi.find((f) => f.fase === 'perso')?.conteggio ?? 0} persi.
          </p>
        </div>
      </section>

      <section className="sezione">
        <h2>Il tabellone</h2>
        <p className="nota-piede" style={{ marginTop: -6 }}>
          Trascina una card per cambiare fase, o usa il menu «Sposta in» dal telefono. Il CRM registra il passaggio
          nella storia del contatto e, se resta senza prossima azione, gliene propone una.
        </p>
        <Kanban colonne={colonne} />
      </section>
    </main>
  );
}
