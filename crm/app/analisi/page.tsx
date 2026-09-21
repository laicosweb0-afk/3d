import Link from 'next/link';
import { deposito } from '@/lib/dati';
import {
  ETICHETTA_PERIODO, analisi as calcolaAnalisi, contattiInAttenzione, daFare, elenco,
  ingressi as calcolaIngressi, pipeline as calcolaPipeline, type Periodo,
} from '@/lib/dati/istantanea';
import { euro } from '@/lib/dominio/etichette';
import { Numero } from '../pezzi';

// I numeri che dicono se il mese sta andando. Nessuna percentuale inventata:
// dove manca il dato, resta un trattino.

export const dynamic = 'force-dynamic';

const PERIODI: Periodo[] = ['7', '30', 'mese', 'tutto'];

export default async function Analisi({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const p = await searchParams;
  const periodo = (PERIODI.includes(p.periodo as Periodo) ? p.periodo : '30') as Periodo;

  const dati = await (await deposito()).istantanea();
  const a = calcolaAnalisi(dati, periodo);
  const fasi = calcolaPipeline(dati);
  const fonti = calcolaIngressi(dati, periodo).filter((f) => f.lead > 0).slice(0, 5);

  // Le domande che il titolare fa davvero, con la risposta calcolata e il
  // link a chi la compone. Questa è la base su cui si appoggerà l'assistente:
  // se una risposta non si può calcolare da qui, non deve esistere.
  const daFareOggi = daFare(dati, 0);
  const preventiviMuti = contattiInAttenzione(dati, 'preventivo_muto');
  const instagramSenzaRisposta = elenco(dati, { fonte: 'instagram', fase: 'nuovo' });
  const grosseFerme = elenco(dati, { valoreMin: 3000, silenzioDa: 7, soloAttivi: true });
  const dimenticabili = contattiInAttenzione(dati, 'senza_azione');
  const fontiSempre = calcolaIngressi(dati, 'tutto');
  const fonteMigliore = [...fontiSempre].sort((x, y) => y.ordini - x.ordini)[0];

  const risposte = [
    {
      domanda: 'Cosa devo fare oggi?',
      risposta: daFareOggi.length
        ? daFareOggi.slice(0, 2).map((v) => v.contatto.nomeCompleto).join(', ') + (daFareOggi.length > 2 ? ' e altri' : '')
        : 'niente in scadenza',
      quanti: daFareOggi.length,
      dove: '/',
    },
    {
      domanda: 'Quali preventivi devo seguire?',
      risposta: preventiviMuti.length ? 'senza risposta da più di cinque giorni' : 'nessuno fermo',
      quanti: preventiviMuti.length,
      dove: '/contatti?attenzione=preventivo_muto',
    },
    {
      domanda: 'Quali lead Instagram sono ancora senza risposta?',
      risposta: instagramSenzaRisposta.length ? 'arrivati e mai sentiti' : 'nessuno in attesa',
      quanti: instagramSenzaRisposta.length,
      dove: '/contatti?fonte=instagram&fase=nuovo',
    },
    {
      domanda: 'Quali opportunità sopra 3.000 € sono ferme?',
      risposta: grosseFerme.length ? `${euro(grosseFerme.reduce((s, c) => s + c.valore, 0))} in gioco` : 'nessuna',
      quanti: grosseFerme.length,
      dove: '/contatti?valoreMin=3000&silenzioDa=7',
    },
    {
      domanda: 'Quale fonte ha generato più ordini?',
      risposta: fonteMigliore && fonteMigliore.ordini > 0
        ? `${fonteMigliore.nome} · ${euro(fonteMigliore.valoreOrdini)}`
        : 'ancora nessuna, servono più dati',
      quanti: fonteMigliore?.ordini ?? null,
      dove: '/ingressi?periodo=tutto',
    },
    {
      domanda: 'Chi rischio di dimenticare?',
      risposta: dimenticabili.length ? 'contatti vivi senza nessuna prossima azione' : 'nessuno lasciato indietro',
      quanti: dimenticabili.length,
      dove: '/contatti?attenzione=senza_azione',
    },
  ];

  const scala = Math.max(a.ingressi, 1);
  const gradini = [
    { nome: 'Ingressi', valore: a.ingressi },
    { nome: 'Qualificati', valore: a.qualificati },
    { nome: 'Preventivi', valore: a.preventivi },
    { nome: 'Ordini', valore: a.ordini },
  ];

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Analisi</h1>
          <p className="lede">Come si muove il lavoro, non solo quanto ce n&apos;è.</p>
        </div>
        <nav className="azioni-riga" aria-label="Periodo">
          {PERIODI.map((x) => (
            <Link key={x} href={x === '30' ? '/analisi' : `/analisi?periodo=${x}`} className={`voce${periodo === x ? ' attiva' : ''}`}>
              {ETICHETTA_PERIODO[x]}
            </Link>
          ))}
        </nav>
      </header>

      <section className="sezione" style={{ marginTop: 0 }}>
        <div className="numeri">
          <Numero etichetta="Valore in pipeline" valore={euro(a.valorePipeline)} sotto="trattative aperte, oggi" href="/pipeline" />
          <Numero
            etichetta="Ordini chiusi nel periodo"
            valore={a.ordiniChiusi}
            sotto={a.ordiniChiusi ? euro(a.valoreOrdiniChiusi) : 'nessuno'}
          />
          <Numero
            etichetta="Da ingresso a preventivo"
            valore={a.giorniIngressoPreventivo === null ? '—' : `${a.giorniIngressoPreventivo} gg`}
            sotto="tempo medio"
          />
          <Numero
            etichetta="Da preventivo a ordine"
            valore={a.giorniPreventivoOrdine === null ? '—' : `${a.giorniPreventivoOrdine} gg`}
            sotto="tempo medio"
          />
        </div>
      </section>

      <div className="colonne-pari">
        <section className="sezione">
          <h2>Dove si perde per strada</h2>
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
              Qui si guardano <strong>le persone entrate nel periodo</strong> e fin dove sono arrivate: la percentuale
              a destra è quanti passano dal gradino sopra a questo. Gli ordini chiusi qui sopra sono un&apos;altra
              cosa — quelli firmati nel periodo, da chiunque fosse entrato prima.
              {a.conversioni.every((c) => c.percentuale === null) && ' Servono più dati per dire qualcosa di serio.'}
            </p>
          </div>
        </section>

        <section className="sezione">
          <h2>Le fonti migliori</h2>
          <div className="scheda scheda-fitta">
            {fonti.length === 0 && <p className="elenco-vuoto">Nessun ingresso nel periodo.</p>}
            {fonti.map((f) => (
              <Link key={f.fonte} href={`/contatti?fonte=${f.fonte}`} className="riga cliccabile">
                <span className="cresce">
                  <span className="titolo">{f.nome}</span>
                  <span className="sotto">
                    {f.lead} lead · {f.preventivi} preventivi · {f.ordini} ordini
                  </span>
                </span>
                <span className="euro">{f.valoreOrdini ? euro(f.valoreOrdini) : '—'}</span>
              </Link>
            ))}
            <p className="nota-piede" style={{ padding: '10px 0 2px' }}>
              <Link href="/ingressi">Tutte le fonti →</Link>
            </p>
          </div>
        </section>
      </div>

      <section className="sezione">
        <h2>Dove sono adesso le persone</h2>
        <div className="scheda" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tabella-scorri">
            <table>
              <thead>
                <tr>
                  <th>Fase</th>
                  <th className="num">Persone</th>
                  <th className="num">Valore</th>
                </tr>
              </thead>
              <tbody>
                {fasi.filter((f) => f.conteggio > 0).map((f) => (
                  <tr key={f.fase}>
                    <td><Link href={`/contatti?fase=${f.fase}`}>{f.nome}</Link></td>
                    <td className="num">{f.conteggio}</td>
                    <td className="num">{f.valore ? euro(f.valore) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="sezione">
        <h2>Assistente — le risposte che il CRM sa già dare</h2>
        <div className="scheda scheda-fitta">
          {risposte.map((r) => (
            <Link key={r.domanda} href={r.dove} className="riga cliccabile">
              <span className="cresce">
                <span className="titolo">{r.domanda}</span>
                <span className="sotto">{r.risposta}</span>
              </span>
              <span className="mono" style={{ color: r.quanti ? 'var(--oro-chiaro)' : 'var(--ink-3)' }}>
                {r.quanti === null ? '—' : r.quanti}
              </span>
            </Link>
          ))}
        </div>
        <p className="nota-piede" style={{ marginTop: 10 }}>
          Nessuna di queste risposte è una stima: sono conti fatti adesso sui dati presenti, e ognuna porta
          all&apos;elenco delle persone di cui parla. Il giorno che ci metteremo un assistente in linguaggio naturale,
          leggerà da qui — dalle stesse funzioni in <code>lib/dati/istantanea.ts</code> — e non potrà inventarsi
          niente, perché non avrà altro da cui attingere.
        </p>
      </section>
    </main>
  );
}
