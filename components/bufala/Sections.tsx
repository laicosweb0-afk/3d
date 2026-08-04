// Le sezioni dopo il viaggio: il documento vero e proprio.
// Solo dati reali (content/bufala/company.ts). Dove il cliente non ha ancora
// fornito il contenuto, la sezione non compare — nessun segnaposto inventato.

import { asset } from '@/lib/asset';
import { company, indirizzoPuntoVendita, mappaEmbed, mappaApri } from '@/content/bufala/company';
import { sezioni } from '@/content/bufala/copy';
import { Vetrina } from './Vetrina';
import { Rivela } from './Rivela';

const pv = company.puntoVendita;

export function Sections() {
  return (
    <>
    <Rivela />
    {/* La meta' chiara: solo le informazioni che devono essere leggibili. */}
    <div className="bufala-sezioni">
      {/* L'apertura: una frase sola, tanto spazio intorno. È il primo
          respiro dopo il viaggio, e la prima cosa che si legge sul chiaro. */}
      <section className="bufala-sezione bufala-apertura" data-rivela>
        <p className="micro">{sezioni.apertura.occhiello}</p>
        <h2>{sezioni.apertura.frase}</h2>
        <p>{sezioni.apertura.testo}</p>
      </section>

      <section className="bufala-sezione" data-rivela>
        <p className="micro">{sezioni.banco.titolo}</p>
        <h2>{sezioni.banco.frase}</h2>
        <p>{sezioni.banco.testo}</p>
      </section>

    </div>

    {/* Il passaggio dalla panna al verde: l'avvicinarsi al banco.

        Non e' piu' un palco incollato alto quasi due schermate. Quella
        versione teneva ferma una schermata intera mentre il colore
        cambiava, e il risultato era esattamente cio' che doveva evitare:
        uno schermo verde vuoto, e quindi un blocco separato. Ora e' una
        fascia che scorre, e il colore cambia perche' la fascia passa —
        come succede in una stanza quando ci si avvicina a una parete in
        ombra. Meno meccanica, piu' continuita'. */}
    <div className="bufala-passaggio" aria-hidden="true" />

    <div className="bufala-sezioni bufala-buio">

      {/* I prodotti: le foto reali del cliente, non un elenco. Una lista di
          nomi non dice niente; questi scatti dicono tutto — compreso che
          dietro il banco c'è una selezione, non un assortimento a caso. */}
      <section className="bufala-sezione" data-rivela>
        <p className="micro">{sezioni.prodotti.titolo}</p>
        <h2>{sezioni.prodotti.frase}</h2>
        <p>{sezioni.prodotti.testo}</p>
      </section>

      {/* La vetrina: il pannello col filmato dei prodotti legato allo
          scorrimento. Sta fuori da .bufala-sezione perche' ha bisogno
          dell'intera larghezza e di una propria altezza di scorrimento. */}
      <Vetrina />

      {/* — Siamo qui —
          La mappa e' protagonista e non ha bisogno di essere presentata:
          sopra di lei due parole, dentro solo lei, sotto niente. Tutto
          quello che si puo' leggere sta nella sezione dopo, che e' un'altra
          cosa e va letta come tale. Prima erano un blocco solo, e il blocco
          leggeva come "ecco la nostra sede" invece che come un luogo. */}
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

      {/* — Punto vendita —
          Non una scheda. La mappa e' gia' il fuoco visivo della pagina, e
          un secondo riquadro subito sotto la fa sembrare un pannello di
          controllo: due contenitori uno sull'altro leggono come un widget,
          non come un documento. Qui le informazioni sono impaginate nella
          pagina — una riga per voce, l'etichetta a sinistra, il dato a
          destra, un filo di capello fra l'una e l'altra. E' la stessa
          composizione di una pagina di colophon, ed e' il motivo per cui si
          legge senza sembrare un modulo. */}
      <section className="bufala-sezione bufala-recapito" data-rivela>
        <p className="micro">{sezioni.luogo.titolo}</p>
        <h2 className="recapito-insegna">{company.brand}</h2>

        <dl className="recapito-voci">
          <div className="recapito-voce">
            <dt>Indirizzo</dt>
            <dd>
              {pv.presso}
              <br />
              {pv.via}
              <br />
              {pv.cap} {pv.comune} ({pv.provincia})
            </dd>
          </div>
          <div className="recapito-voce">
            <dt>Dove esattamente</dt>
            <dd>{pv.dettaglio}</dd>
          </div>
          <div className="recapito-voce">
            <dt>Ingresso</dt>
            <dd>{pv.accesso}</dd>
          </div>
          <div className="recapito-voce">
            <dt>In auto</dt>
            <dd>{pv.uscita}</dd>
          </div>
          <div className="recapito-voce">
            <dt>Telefono</dt>
            <dd>
              <a href={company.telefonoHref}>{company.telefono}</a>
            </dd>
          </div>
        </dl>

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

      {/* Il congedo, dove prima finiva il viaggio. */}
      <section className="bufala-sezione bufala-apertura" data-rivela>
        <h2>{sezioni.congedo.frase}</h2>
      </section>

      {/* La firma: il marchio storico a colori e la scritta originale del
          logo, senza la targhetta di legno. Restano sul verde del sito —
          niente riquadro marrone (Direzione §2). */}
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
          src={asset("/assets/brand-bufala/logo-wordmark.png")}
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
