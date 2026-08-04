// Le sezioni dopo il viaggio: il documento vero e proprio.
// Solo dati reali (content/bufala/company.ts). Dove il cliente non ha ancora
// fornito il contenuto, la sezione non compare — nessun segnaposto inventato.
//
// L'ordine e le forme vengono dall'architettura (Task 01) e dalla
// composizione (Task 04): ogni movimento ha una forma diversa dal
// precedente, il blocco occhiello+titolo+paragrafo esiste una volta sola,
// e la griglia si rompe in un punto solo — il 04:30.

import { asset } from '@/lib/asset';
import { company, indirizzoPuntoVendita, mappaEmbed, mappaApri } from '@/content/bufala/company';
import { sezioni } from '@/content/bufala/copy';
import { Vetrina } from './Vetrina';
import { Rivela } from './Rivela';

const pv = company.puntoVendita;

/** I tre passi della visita, dai dati confermati del punto vendita. */
const passi = [
  { nome: 'In auto', testo: pv.uscita },
  { nome: 'Dove', testo: `${pv.presso} — ${pv.dettaglio}` },
  { nome: 'All’ingresso', testo: pv.accesso },
];

export function Sections() {
  return (
    <>
    <Rivela />
    {/* — La metà chiara — */}
    <div className="bufala-sezioni">
      {/* Movimento 2 · Chi siamo. L'unica dichiarazione centrata del
          documento, e l'unico posto dove la forma occhiello+titolo+riga è
          ammessa: qui il centrato è guadagnato — una frase sola, tanto
          spazio intorno. */}
      <section className="bufala-sezione bufala-apertura" data-rivela>
        <p className="micro">{sezioni.apertura.occhiello}</p>
        <h2>{sezioni.apertura.frase}</h2>
        <p>{sezioni.apertura.testo}</p>
      </section>

      {/* Movimento 3 · Per chi. La fotografia VERA del banco — arrivata il
          04/08, dopo che quella generata era stata bocciata («troppo da
          IA», con ragione) — scura sulla carta chiara come una stampa
          impaginata. Accanto, i due pubblici con pesi diversi perche' sono
          diversi: l'orario dice che chi compra per lavoro viene prima; la
          colonna minore e' sfalsata, non affiancata pari (Composizione
          §regola 4). Regola permanente di questo movimento: o la realta',
          o la tipografia — mai una fotografia sintetica. */}
      <section className="bufala-sezione bufala-perchi" data-rivela>
        <p className="micro">{sezioni.perChi.titolo}</p>
        <h2>{sezioni.perChi.frase}</h2>
        <div className="perchi-campo">
          <figure className="perchi-foto">
            <img
              src={asset('/assets/bufala/banco.webp')}
              alt="Il banco di Quelli della bufala: formaggi e salumi nel banco frigo, prosciutti appesi alle travi"
              width={1169}
              height={914}
              loading="lazy"
            />
            <figcaption className="micro">Il banco, dentro il C.A.R.R. di Rimini</figcaption>
          </figure>
          <div className="perchi-blocchi">
            <div className="perchi-blocco perchi-blocco--lavoro">
              <h3>{sezioni.perChi.lavoro.nome}</h3>
              <p>{sezioni.perChi.lavoro.testo}</p>
            </div>
            <div className="perchi-blocco perchi-blocco--casa">
              <h3>{sezioni.perChi.casa.nome}</h3>
              <p>{sezioni.perChi.casa.testo}</p>
            </div>
          </div>
        </div>
        <p className="perchi-nota">{sezioni.perChi.nota}</p>
      </section>
    </div>

    {/* Il passaggio dalla panna al verde: una fascia che scorre, il colore
        cambia perche' la fascia passa. */}
    <div className="bufala-passaggio" aria-hidden="true" />

    <div className="bufala-sezioni bufala-buio">
      {/* Movimento 4 · Il banco. Il testo si ferma alla soglia: etichetta e
          titolo, poi comanda l'immagine. Le ragioni dei prodotti vivranno
          nelle didascalie della vetrina (Task 07), non in un paragrafo. */}
      <section className="bufala-sezione" data-rivela>
        <p className="micro">{sezioni.prodotti.titolo}</p>
        <h2>{sezioni.prodotti.frase}</h2>
      </section>

      <Vetrina />

      {/* Movimento 5 · La visita. L'unica rottura di griglia del sito: il
          04:30 come immagine, da margine a margine, l'ottone usato come
          colore di testo qui e mai altrove. Sotto, gli orari veri e i tre
          passi — stessa anatomia di riga del colophon (una famiglia sola
          di elenco, Composizione §regola 3). */}
      <section className="bufala-sezione bufala-visita" id="orari" data-rivela>
        <p className="micro">{sezioni.visita.titolo}</p>
        <p className="visita-ora" aria-hidden="true">04:30</p>
        <h2 className="visita-frase">{sezioni.visita.frase}</h2>
        <p className="visita-testo">{sezioni.visita.testo}</p>

        <dl className="recapito-voci">
          {company.orari.map((o) => (
            <div className="recapito-voce recapito-voce--orario" key={o.giorno}>
              <dt>{o.giorno}</dt>
              <dd>{'apre' in o ? `${o.apre} – ${o.chiude}` : 'Chiuso'}</dd>
            </div>
          ))}
        </dl>

        <ol className="visita-passi">
          {passi.map((p, i) => (
            <li className="recapito-voce recapito-voce--passo" key={p.nome}>
              <span className="passo-numero" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <span className="voce-nome">{p.nome}</span>
                <span className="voce-dato">{p.testo}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Movimento 6 · Come arrivare. La mappa e' protagonista; sotto, il
          colophon ridotto alle due righe che restano — indirizzo e telefono
          — e il congedo SOPRA i bottoni: messa prima, la frase e' la
          ragione per premerli; messa dopo, era un saluto a pagina finita. */}
      <section className="bufala-sezione bufala-mappa" id="dove" data-rivela>
        <p className="micro">{sezioni.mappa.titolo}</p>
        <a
          className="scheda scheda--mappa"
          href={mappaApri}
          target="_blank"
          rel="noreferrer"
          aria-label={`${sezioni.mappa.azione}: ${company.brand}, ${indirizzoPuntoVendita}`}
        >
          <span className="scheda-riflesso" aria-hidden="true" />
          <iframe
            src={mappaEmbed}
            title={`${company.brand} — ${indirizzoPuntoVendita}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            tabIndex={-1}
          />
          <span className="scheda-azione">{sezioni.mappa.azione}</span>
        </a>
      </section>

      <section className="bufala-sezione bufala-recapito" data-rivela>
        <p className="micro">{sezioni.luogo.titolo}</p>

        <dl className="recapito-voci recapito-voci--colophon">
          <div className="recapito-voce">
            <dt>Indirizzo</dt>
            <dd>
              {pv.presso}
              <br />
              {pv.via}, {pv.cap} {pv.comune} ({pv.provincia})
            </dd>
          </div>
          <div className="recapito-voce">
            <dt>Telefono</dt>
            <dd>
              <a href={company.telefonoHref}>{company.telefono}</a>
            </dd>
          </div>
        </dl>

        <h2 className="recapito-congedo">{sezioni.congedo.frase}</h2>
        <div className="scheda-azioni">
          <a
            className="bottone bottone--pieno"
            href={mappaApri}
            target="_blank"
            rel="noreferrer"
          >
            {sezioni.luogo.azione}
          </a>
          <a className="bottone" href={company.telefonoHref}>
            {sezioni.luogo.chiama}
          </a>
        </div>
      </section>

      {/* Movimento 7 · La firma: il marchio storico sulla carta di latte.
          Qui il centrato e' guadagnato — e' una firma. */}
      <section className="bufala-sezione bufala-firma">
        <img
          className="marchio"
          src={asset("/assets/brand-bufala/logo-marchio.png")}
          alt=""
          aria-hidden="true"
          width={1242}
          height={970}
        />
        <img
          className="wordmark"
          src={asset("/assets/brand-bufala/logo-wordmark-scuro.png")}
          alt={company.brand}
          width={2328}
          height={426}
        />
      </section>

      <footer className="bufala-sezione bufala-piede">
        <p>
          {company.ragioneSociale}
          <br />
          Sede legale: {company.sedeLegale.via}, {company.sedeLegale.cap}{' '}
          {company.sedeLegale.comune} ({company.sedeLegale.provincia})
        </p>
      </footer>
    </div>
    </>
  );
}
