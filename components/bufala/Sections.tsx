// Le sezioni dopo il viaggio: il documento vero e proprio.
// Solo dati reali (content/bufala/company.ts). Dove il cliente non ha ancora
// fornito il contenuto, la sezione non compare — nessun segnaposto inventato.

import { company, indirizzoPuntoVendita } from '@/content/bufala/company';
import { sezioni } from '@/content/bufala/copy';

const pv = company.puntoVendita;

export function Sections() {
  return (
    <div className="bufala-sezioni">
      <section className="bufala-sezione">
        <p className="micro">{sezioni.banco.titolo}</p>
        <h2>Si entra, si guarda, si chiede.</h2>
        <p>{sezioni.banco.testo}</p>
      </section>

      {/* La sezione prodotti resta fuori finché il cliente non fornisce
          l'elenco reale (SCALETTA_BUFALA.md §5). */}
      {sezioni.prodotti.testo && (
        <section className="bufala-sezione">
          <p className="micro">{sezioni.prodotti.titolo}</p>
          <p>{sezioni.prodotti.testo}</p>
        </section>
      )}

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

      <section className="bufala-sezione" id="contatti">
        <p className="micro">{sezioni.contatti.titolo}</p>
        <h2>
          <a href={company.telefonoHref}>{company.telefono}</a>
        </h2>
        <p>
          <a href={`mailto:${company.email}`}>{company.email}</a>
        </p>
      </section>

      {/* Il logo storico, intero, sul suo atterraggio in noce scuro:
          è l'unico punto della pagina in cui appare pieno (Direzione §2). */}
      <section className="bufala-sezione">
        <div className="bufala-logo-atterraggio">
          <img
            src="/assets/brand-bufala/logo-full.png"
            alt={company.brand}
            width={2497}
            height={1795}
          />
        </div>
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
  );
}
