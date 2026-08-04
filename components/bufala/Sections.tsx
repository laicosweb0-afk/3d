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
import { Oggi } from './Oggi';
import { Ordina } from './Ordina';
import { IconaWhatsApp, IconaInstagram } from './icone';
import { Fondale } from './Fondale';

const pv = company.puntoVendita;

export function Sections() {
  return (
    <>
    <Rivela />
    <Fondale />
    {/* Il documento intero — metà chiara, fascia, metà scura — vive in un
        contenitore solo: è il SUO sfondo che cambia colore durante lo
        scorrimento (Fondale). Le metà diventano trasparenti solo quando
        il fondale si accende; senza JavaScript resta la fascia dipinta. */}
    <div className="bufala-documento">
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

      {/* Movimento 3 · Per chi. Brief dell'utente (04/08): due percorsi con
          peso visivo identico — due carte gemelle, icona + titolo + testo,
          stessa altezza, stesse ancore. Sopra, la fotografia VERA del banco
          come tavola d'apertura (regola permanente: o la realta' o la
          tipografia, mai una foto sintetica) e il titolo di sezione.
          L'entrata e' opacity+translateY con scaglionamento dal sistema:
          il velo di sfocatura chiesto dal brief non entra — il budget B15
          vieta di animare i filtri, ed e' la regola che protegge la
          fluidita' dello scroll. Costo dichiarato, non taciuto. */}
      <section className="bufala-sezione bufala-perchi" id="banco" data-rivela>
        <p className="micro">{sezioni.perChi.titolo}</p>
        {/* Il banco che si compone (idea dell'utente, variante a costo
            zero — Task 11): tre veli di carta coprono la fotografia e si
            alzano a battute scaglionate quando la sezione entra in vista.
            I pixel restano quelli veri: si anima la carta, mai la foto.
            Solo transform e opacity (B15); senza JavaScript o con
            prefers-reduced-motion i veli non esistono e la foto è ferma. */}
        <figure className="perchi-foto">
          <span className="foto-cornice">
            <img
              src={asset('/assets/bufala/banco.webp')}
              alt="Il banco di Quelli della bufala: formaggi e salumi nel banco frigo, prosciutti appesi alle travi"
              width={1169}
              height={914}
              loading="lazy"
            />
            <span className="foto-velo" aria-hidden="true" />
            <span className="foto-velo" aria-hidden="true" />
            <span className="foto-velo" aria-hidden="true" />
          </span>
          <figcaption className="micro">Il banco, dentro il C.A.R.R. di Rimini</figcaption>
        </figure>
        <div className="perchi-carte" data-rivela>
          <article className="perchi-carta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {/* L'edificio: il percorso di chi compra per lavoro. */}
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9.5 21v-4.5h5V21" />
              <path d="M9.5 10.5h.01M14.5 10.5h.01M9.5 14h.01M14.5 14h.01" />
            </svg>
            <h3>{sezioni.perChi.lavoro.nome}</h3>
            <p>{sezioni.perChi.lavoro.testo}</p>
          </article>
          <article className="perchi-carta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {/* La casa: il percorso di chi cucina. */}
              <path d="M4 11.5 12 4l8 7.5M6 10v10h12V10" />
              <path d="M10 20v-5h4v5" />
            </svg>
            <h3>{sezioni.perChi.casa.nome}</h3>
            <p>{sezioni.perChi.casa.testo}</p>
          </article>
        </div>
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

      {/* Movimento 4-bis · L'ordine (richiesta del titolare, 04/08).
          Subito dopo la vetrina, perché è la sua conseguenza: i prodotti
          si sono appena visti, qui si mettono nel messaggio. Il sito è
          statico: la carta compone, WhatsApp consegna, il banco conferma.
          Le finestre di prenotazione stanno DENTRO la carta come
          informazione — la stessa delicatezza delle luci di «Oggi al
          banco» — mai come cancello. */}
      <section className="bufala-sezione bufala-ordina" id="ordina" data-rivela>
        <p className="micro">{sezioni.ordina.titolo}</p>
        <h2>{sezioni.ordina.frase}</h2>
        <Ordina />
      </section>

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

        {/* Ridisegno del 04/08 (brief Apple): disponibilità, orari e azioni
            sono UNA carta, non tre componenti — la carta vive in Oggi.tsx.
            I tre passi della strada sono passati sotto la mappa, dove è
            casa loro. */}
        <Oggi />
      </section>

      {/* Movimento 6 · Dove trovarci — ridisegno Apple (brief dell'utente,
          04/08): la sezione non mostra informazioni, guida alle azioni.
          Gerarchia: l'invito («Vi aspettiamo al banco.», che smette di
          essere un congedo e diventa il titolo), le due azioni GEMELLE —
          venire o chiamare, nessuna dominante: un pieno d'ottone qui
          sarebbe una scelta fatta al posto dell'utente — poi la mappa
          ridotta a supporto, e le carte senza fili: la gerarchia la fanno
          spazio e tipografia, mai le righe. Facebook non compare: manca
          l'indirizzo reale, e un recapito inventato non entra. */}
      <section className="bufala-sezione bufala-dove" id="dove" data-rivela>
        <p className="micro">{sezioni.dove.titolo}</p>
        <h2>{sezioni.dove.frase}</h2>
        <p className="dove-sotto">{sezioni.dove.sotto}</p>

        <div className="dove-azioni">
          <a className="bottone dove-cta" href={mappaApri} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {sezioni.dove.indicazioni}
          </a>
          <a className="bottone dove-cta" href={company.telefonoHref}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h3.5l2 5-2.2 1.3a11.5 11.5 0 0 0 5.4 5.4L15 13.5l5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
            </svg>
            {sezioni.dove.chiama}
          </a>
        </div>

        {/* La mappa, ridotta a supporto (brief: «non deve sembrare un
            iframe incollato»): mezza altezza di prima, stessa curvatura,
            stessa attesa disegnata per la rete lenta. */}
        <a
          className="scheda scheda--mappa"
          href={mappaApri}
          target="_blank"
          rel="noreferrer"
          aria-label={`${sezioni.dove.mappa}: ${company.brand}, ${indirizzoPuntoVendita}`}
        >
          <span className="scheda-riflesso" aria-hidden="true" />
          <span className="mappa-attesa" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span className="micro">{pv.via} \u00b7 {pv.comune}</span>
          </span>
          <iframe
            src={mappaEmbed}
            title={`${company.brand} \u2014 ${indirizzoPuntoVendita}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            tabIndex={-1}
          />
          <span className="scheda-azione">{sezioni.dove.mappa}</span>
        </a>

        <div className="dove-carte">
          {/* La strada: una carta, quattro momenti, zero fili — lo
              spazio verticale E' la gerarchia. L'ultima parola con la
              provincia non si spezza: niente orfani «(RN)». */}
          <article className="dove-carta">
            <div className="via-voce">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <div>
                <p className="micro via-nome">{sezioni.dove.strada.indirizzo}</p>
                <p className="via-dato">
                  {pv.presso}
                  <br />
                  {pv.via}, {pv.cap} <span className="intero">{pv.comune} ({pv.provincia})</span>
                </p>
              </div>
            </div>
            <div className="via-voce">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 15.5 6 10.5a2 2 0 0 1 1.9-1.4h8.2a2 2 0 0 1 1.9 1.4l1.5 5" />
                <path d="M4 15.5h16v3.5h-2.4v-1.6H6.4v1.6H4Z" />
              </svg>
              <div>
                <p className="micro via-nome">{sezioni.dove.strada.auto}</p>
                <p className="via-dato">{pv.uscita}</p>
              </div>
            </div>
            <div className="via-voce">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9.5 21v-4.5h5V21" />
                <path d="M9.5 10.5h.01M14.5 10.5h.01M9.5 14h.01M14.5 14h.01" />
              </svg>
              <div>
                <p className="micro via-nome">{sezioni.dove.strada.centro}</p>
                <p className="via-dato">{pv.dettaglio}</p>
              </div>
            </div>
            <div className="via-voce">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M4 21h16" />
                <path d="M14.5 12h.01" />
              </svg>
              <div>
                <p className="micro via-nome">{sezioni.dove.strada.ingresso}</p>
                <p className="via-dato">{pv.accesso}</p>
              </div>
            </div>
          </article>

          <div className="dove-colonna">
            {/* L'aiuto: il numero e' il protagonista — grande, in cifre
                d'aria, componibile con un tocco. L'email resta sotto,
                con peso minore: e' la strada lenta, non la prima. */}
            <article className="dove-carta dove-carta--aiuto">
              <h3>{sezioni.dove.aiuto.titolo}</h3>
              <p className="aiuto-testo">{sezioni.dove.aiuto.testo}</p>
              <a className="aiuto-numero" href={company.telefonoHref}>
                {company.telefono}
              </a>
              <div className="carta-azioni">
                <a className="bottone bottone--pieno" href={company.telefonoHref}>
                  {sezioni.dove.chiama}
                </a>
                <a
                  className="bottone"
                  href={`https://wa.me/${company.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {IconaWhatsApp}
                  WhatsApp
                </a>
              </div>
              <p className="aiuto-scrivi">
                {sezioni.dove.aiuto.scrivi}{' '}
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </p>
            </article>

            {/* Seguici: una riga, non i tre cerchi — la grammatica dei
                tondi social e' quella dei template. */}
            <article className="dove-carta dove-carta--seguici">
              <p className="micro carta-etichetta">{sezioni.dove.seguici}</p>
              <a
                className="seguici-riga"
                href={company.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label={`Instagram: ${company.instagramHandle}`}
              >
                {IconaInstagram}
                <span>Instagram</span>
                <svg className="seguici-freccia" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </a>
            </article>
          </div>
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
          loading="lazy"
          decoding="async"
        />
        <img
          className="wordmark"
          src={asset("/assets/brand-bufala/logo-wordmark-scuro.png")}
          alt={company.brand}
          width={2328}
          height={426}
          loading="lazy"
          decoding="async"
        />
      </section>

      <footer className="bufala-sezione bufala-piede">
        <p>
          {company.ragioneSociale}
          <br />
          Sede legale: {company.sedeLegale.via}, {company.sedeLegale.cap}{' '}
          {company.sedeLegale.comune}{' '}({company.sedeLegale.provincia})
        </p>
      </footer>
    </div>
    {/* /bufala-documento */}
    </div>
    </>
  );
}
