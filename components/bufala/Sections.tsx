// Le sezioni dopo il viaggio: il documento vero e proprio.
// Solo dati reali (content/bufala/company.ts). Dove il cliente non ha ancora
// fornito il contenuto, la sezione non compare — nessun segnaposto inventato.

import { asset } from '@/lib/asset';
import { company, indirizzoPuntoVendita } from '@/content/bufala/company';
import { sezioni } from '@/content/bufala/copy';
import { Vetrina } from './Vetrina';

const pv = company.puntoVendita;

export function Sections() {
  return (
    <>
    {/* La meta' chiara: solo le informazioni che devono essere leggibili. */}
    <div className="bufala-sezioni">
      {/* L'apertura: una frase sola, tanto spazio intorno. È il primo
          respiro dopo il viaggio, e la prima cosa che si legge sul chiaro. */}
      <section className="bufala-sezione bufala-apertura">
        <h2>{sezioni.apertura.frase}</h2>
      </section>

      <section className="bufala-sezione">
        <p className="micro">{sezioni.banco.titolo}</p>
        <h2>{sezioni.banco.frase}</h2>
        <p>{sezioni.banco.testo}</p>
      </section>

    </div>

    {/* Il rientro nel buio.

        La parte chiara serve a una cosa sola: le informazioni che devono
        essere leggibili. Finita quella si torna nel verde e non se ne esce
        piu', perche' i prodotti sono fotografati su quel fondo — mostrarli
        sul chiaro vorrebbe dire cinque rettangoli scuri su una pagina crema,
        che e' esattamente il collage che avevamo scartato.

        Il verde risale con un bordo curvo come il latte era sceso: la
        simmetria fa leggere le due meta' del sito come un respiro, non come
        due pagine attaccate. E' un contenitore unico, non un fondo per
        sezione — dandolo alle singole sezioni si ottengono scatole scure su
        pagina crema, con i vuoti in mezzo. */}
    <div className="bufala-eclisse" aria-hidden="true" />

    <div className="bufala-sezioni bufala-buio">

      {/* I prodotti: le foto reali del cliente, non un elenco. Una lista di
          nomi non dice niente; questi scatti dicono tutto — compreso che
          dietro il banco c'è una selezione, non un assortimento a caso. */}
      <section className="bufala-sezione">
        <p className="micro">{sezioni.prodotti.titolo}</p>
        <h2>{sezioni.prodotti.frase}</h2>
        <p>{sezioni.prodotti.testo}</p>
      </section>

      {/* La vetrina: il pannello col filmato dei prodotti legato allo
          scorrimento. Sta fuori da .bufala-sezione perche' ha bisogno
          dell'intera larghezza e di una propria altezza di scorrimento. */}
      <Vetrina />

      <section className="bufala-sezione" id="dove">
        <p className="micro">{sezioni.dove.titolo}</p>
        <h2>{pv.comune}</h2>
        <p>
          {pv.presso}
          <br />
          {indirizzoPuntoVendita}
          <br />
          {pv.dettaglio}
        </p>
        <p className="micro">
          {pv.uscita} · {pv.accesso}
        </p>
      </section>

      {/* I contatti sono dati, non affermazioni: vanno nel carattere di
          testo, non in quello di display. Un numero di telefono composto in
          un serif da titolo si legge come uno slogan e si copia peggio —
          il display serve a dire una cosa, non a elencare un recapito.
          La gerarchia qui la fanno dimensione e spazio, non la famiglia. */}
      <section className="bufala-sezione" id="contatti">
        <p className="micro">{sezioni.contatti.titolo}</p>
        <div className="bufala-dati">
          <a className="dato" href={company.telefonoHref}>{company.telefono}</a>
          <a className="dato" href={`mailto:${company.email}`}>{company.email}</a>
        </div>
      </section>

      {/* Il congedo, dove prima finiva il viaggio. */}
      <section className="bufala-sezione bufala-apertura">
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
