// La schermata d'ingresso: la headline e le tre porte.
//
// Sta NEL FLUSSO, prima del palco fisso del viaggio: scorrendo si alza come
// un sipario e scopre il film che le sta dietro — l'uscita elegante non è
// un effetto, è l'architettura. Il progresso del viaggio non si sposta di
// una riga: si misura dal bordo dello spacer, non dalla cima della pagina.
//
// Le tre porte rispondono alla domanda di chi NON vuole il cinema: banco,
// prodotti, dove. Ogni riga è un'ancora vera — niente JavaScript, niente
// stato — e chi invece vuole il film semplicemente scorre.

import { asset } from '@/lib/asset';
import { ingresso } from '@/content/bufala/copy';
import { OggiPilla } from './Oggi';

/** Le miniature delle porte: file DEDICATI da 240px (10 e 6 kB), non le
 *  fotografie intere — prima l'ingresso scaricava 158 kB per due
 *  francobolli da 68px. La terza non è una fotografia: è lo stesso fondale
 *  a spillo della scheda mappa — una mini-mappa vera qui sarebbe una terza
 *  dipendenza esterna per un francobollo. */
const FOTO: Record<string, { src: string; alt: string } | null> = {
  banco: {
    src: '/assets/bufala/porta-banco.webp',
    alt: '',
  },
  prodotto: {
    src: '/assets/bufala/porta-prodotti.webp',
    alt: '',
  },
  mappa: null,
};

export function Ingresso() {
  return (
    <section className="bufala-ingresso">
      {/* Il messaggio del titolare, quando c'è il dato di oggi: una riga
          viva in cima allo schermo. Assoluta: comparendo non sposta di un
          pixel il resto (lo spostamento di layout resta zero). */}
      <OggiPilla />
      <div className="ingresso-campo">
        <p className="micro ingresso-marchio">{ingresso.marchio}</p>
        <h1>
          {ingresso.titolo.split('\n').map((riga, i) => (
            <span key={i}>{riga}</span>
          ))}
        </h1>
        {/* Niente sottotitolo (riferimento dell'utente, 04/08): dalla
            headline si va dritti alle porte. La frase spiegava cosa c'è al
            banco, ma le tre porte lo MOSTRANO — era una didascalia di cose
            già in campo. */}

        <nav className="ingresso-porte" aria-label={ingresso.domanda}>
          <p className="micro porte-domanda">{ingresso.domanda}</p>
          {ingresso.porte.map((porta) => {
            const foto = FOTO[porta.foto];
            return (
              <a className="porta" href={porta.href} key={porta.href}>
                {foto ? (
                  <img
                    className="porta-foto"
                    src={asset(foto.src)}
                    alt=""
                    aria-hidden="true"
                    width={120}
                    height={120}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="porta-foto porta-foto--pin" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                  </span>
                )}
                <span className="porta-testi">
                  <span className="porta-nome">{porta.nome}</span>
                  <span className="porta-descrizione">{porta.testo}</span>
                </span>
                <span className="porta-freccia" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h15M13 6l6 6-6 6" />
                  </svg>
                </span>
              </a>
            );
          })}
        </nav>

        <p className="micro ingresso-payoff">{ingresso.payoff}</p>
        <p className="micro ingresso-scorri">{ingresso.nota}</p>
      </div>
    </section>
  );
}
