#!/usr/bin/env node
/**
 * Genera le pagine statiche del negozio Bazar Marrakech in public/bazar-shop/.
 *
 *   node tools/bazar-shop/build.mjs
 *
 * Tutto il contenuto viene da ./dati.mjs. Le pagine sono HTML puro con un
 * solo foglio di stile (assets/style.css) e un solo script (assets/app.js):
 * nessuna libreria, nessuna build lato client. Ogni pagina ha un indirizzo
 * leggibile (/salotti/salotto-tortora/) che funziona anche senza JavaScript.
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEGOZIO, ORARI, SET, LEGALI, WEB3FORMS_KEY, WHATSAPP, WHATSAPP_MESSAGGIO } from './dati.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../public/bazar-shop');
/** Indirizzo pubblico attuale (anteprima). Da cambiare quando c'è il dominio. */
const BASE_URL = 'https://laicosweb0-afk.github.io/3d/bazar-shop/';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tel = (n) => 'tel:+39' + n.replace(/\D/g, '');
const eur = (n) => '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const prezzo = (p) => (p == null ? '<span class="price price--req">Prezzo su richiesta</span>' : `<span class="price">${eur(p)}</span>`);
const indirizzo = `${NEGOZIO.via}, ${NEGOZIO.cap} ${NEGOZIO.citta} (${NEGOZIO.provincia})`;
const fasce = (o) => o.fasce.map(([a, b]) => `${a} – ${b}`).join(' · ');

/** I reparti dello showroom (dal biglietto da visita) con le foto del negozio. Solo editoriale: non sono in vendita online. */
const REPARTI = [
  { nome: 'Tappeti', riga: 'Disegni geometrici, effetto marmo, fili d’oro: da srotolare e scegliere.', foto: 'reparto-tappeti', alt: 'Tappeti arrotolati in esposizione, con disegni geometrici e dettagli oro' },
  { nome: 'Profumi e casalinghi', riga: 'Fragranze e oggetti per la casa, sugli scaffali dello showroom.', foto: 'reparto-profumi', alt: 'Profumi Volaré in esposizione con le loro scatole' },
  { nome: 'Complementi', riga: 'Gli oggetti che danno carattere a un ambiente.', foto: 'reparto-complementi', alt: 'Pavone decorativo dorato con pietre blu' },
  { nome: 'Bicchieri da tè', riga: 'Set decorati in oro e colori, nelle loro confezioni.', foto: 'bicchieri-te', alt: 'Set di bicchieri da tè decorati in oro e colori', w: 800, h: 1000 },
];

const COLLEZIONI = [...new Map(SET.map((s) => [s.stile, { stile: s.stile, nome: s.collezione, pranzo: s.tipo === 'pranzo' }])).values()];
/** L'etichetta sopra il nome: «Collezione Capitonné», oppure «Sala da pranzo». */
const etichetta = (s) => (s.tipo === 'pranzo' ? 'Sala da pranzo' : `Collezione ${s.collezione}`);

const img = (root, f, { cls = '', eager = false, sizes = '' } = {}) =>
  `<img src="${root}img/${f.file}.webp" width="${f.w}" height="${f.h}" alt="${esc(f.alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}${cls ? ` class="${cls}"` : ''}${sizes}>`;

// Il fumetto di WhatsApp, disegnato a filo come le altre icone (nessun logo colorato).
const ICON_WA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 19.8l1.1-3.9A8.2 8.2 0 1 1 8.4 19z"/><path d="M9.2 8.6c.3-.6.9-.6 1.1 0l.5 1.2c.1.3 0 .6-.2.8l-.4.4c.5 1 1.3 1.8 2.3 2.3l.4-.4c.2-.2.5-.3.8-.2l1.2.5c.6.2.6.8 0 1.1-.6.4-1.3.6-2 .4a7 7 0 0 1-4.1-4.1c-.2-.7 0-1.4.4-2z"/></svg>';
/** Link WhatsApp: con il numero apre la chat col negozio; senza numero apre
 *  WhatsApp col messaggio già scritto e il destinatario da scegliere. */
const waLink = (testo) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(testo)}`;

const ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 9h16M4 15h16"/></svg>';

/* ---- dati strutturati: solo dati reali -------------------------------- */
const giorniSchema = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const jsonLdNegozio = (root) => ({
  '@context': 'https://schema.org',
  '@type': 'FurnitureStore',
  name: NEGOZIO.nome,
  image: BASE_URL + 'img/logo.webp',
  email: NEGOZIO.email,
  telephone: '+39 ' + NEGOZIO.telefoni[0].numero,
  address: { '@type': 'PostalAddress', streetAddress: NEGOZIO.via, postalCode: NEGOZIO.cap, addressLocality: NEGOZIO.citta, addressRegion: NEGOZIO.provincia, addressCountry: 'IT' },
  openingHoursSpecification: ORARI.flatMap((o) => o.fasce.map(([a, b]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: o.giorni.map((g) => giorniSchema[g]), opens: a, closes: b }))),
  sameAs: ['https://instagram.com/' + NEGOZIO.instagram],
});

/* ---- layout ----------------------------------------------------------- */
/** La novità «35 kg»: popup all'ingresso (una volta per visita) e pillola
 *  fissa in basso, così resta raggiungibile anche dopo averlo chiuso. */
function promo(root) {
  return `<div class="promo-pop" data-promo hidden>
  <div class="promo-pop__bg" data-promo-chiudi></div>
  <div class="promo-pop__card" role="dialog" aria-modal="true" aria-labelledby="promo-titolo">
    <button class="promo-pop__x" type="button" data-promo-chiudi aria-label="Chiudi">×</button>
    <img class="promo-pop__img" src="${root}img/pacco/scatola-chiusa.webp" width="900" height="1200" alt="" loading="lazy" decoding="async">
    <div class="promo-pop__copy">
      <p class="promo-pop__eyebrow">Novità · 35 kg</p>
      <h2 class="promo-pop__title" id="promo-titolo">Set bicchieri <span>7 €.</span><br>Spedizione <span>7 €.</span></h2>
      <p class="promo-pop__sub">Un pacco fino a 35 kg: riempilo con quello che vuoi.</p>
      <div class="pills"><a class="pill" href="${root}35kg/">Riempi il pacco</a><button class="pill pill--line" type="button" data-promo-chiudi>Più tardi</button></div>
    </div>
  </div>
</div>
<a class="promo-fab" href="${root}35kg/" data-promo-fab aria-label="Novità: il pacco da 35 kg con spedizione a 7 euro"><img src="${root}img/pacco/scatola-icona.webp" width="256" height="171" alt=""><span><small>Novità</small>35 kg</span></a>`;
}

function layout({ path, title, description, body, root, nav = '', image = 'salotto-completo', jsonLd = null, noindex = false, bodyClass = '', heroOver = false, scripts = '' }) {
  const navLink = (href, label, key) => `<a href="${root}${href}"${nav === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<!doctype html>
<html lang="it" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta name="theme-color" content="#171614">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bazar Marrakech">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${BASE_URL}${path}">
<meta property="og:image" content="${BASE_URL}img/${image}.webp">
<meta property="og:locale" content="it_IT">
<link rel="icon" href="${root}img/icon.png">
<link rel="apple-touch-icon" href="${root}img/icon.png">
<link rel="preload" href="${root}fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ''}<script>document.documentElement.classList.remove('no-js')</script>
</head>
<body data-root="${root}"${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#main">Vai al contenuto</a>
<header class="header${heroOver ? ' header--over' : ''}" data-header>
  <div class="wrap">
    <a class="brand" href="${root}" aria-label="Bazar Marrakech, home"><img src="${root}img/logo.webp" alt="Bazar Marrakech" width="884" height="258"></a>
    <nav class="nav" aria-label="Principale">
      ${navLink('collezioni/', 'Collezioni', 'collezioni')}
      ${navLink('showroom/', 'Showroom', 'showroom')}
      ${navLink('contatti/', 'Contatti', 'contatti')}
    </nav>
    <a class="wa-link" href="${waLink(WHATSAPP_MESSAGGIO)}" target="_blank" rel="noopener" aria-label="Scrivici su WhatsApp: informazioni o visita in showroom">${ICON_WA}<span class="wa-word">WhatsApp</span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Apri il menu" data-menu>${ICON_MENU}</button>
  </div>
</header>
<nav class="mobile-nav" id="mobile-nav" aria-label="Menu">
  <a href="${root}collezioni/">Collezioni</a>
  <a href="${root}showroom/">Showroom</a>
  <a href="${root}contatti/">Contatti</a>
  <a href="${root}borsa/">Borsa</a>
  <p>${esc(indirizzo)}</p>
</nav>
<main id="main">
${body}
</main>
${footer(root)}
${path === '35kg/' || path === 'borsa/' ? '' : promo(root)}
<script src="${root}assets/catalogo.js"></script>
<script src="${root}assets/app.js" defer></script>
${scripts}
</body>
</html>
`;
}

function footer(root) {
  const legali = LEGALI.map((l) => `<a href="${root}${l.slug}/">${l.titolo}</a>`).join('');
  return `<footer class="footer">
  <div class="wrap">
    <div class="footer__top">
      <div class="footer__brand">
        <img src="${root}img/logo.webp" alt="Bazar Marrakech" width="884" height="258" loading="lazy">
        <p>Salotti in velluto e oro. Showroom a Lugo, consegne in tutta Italia.</p>
      </div>
      <div>
        <h2>Esplora</h2>
        <ul><li><a href="${root}collezioni/">Collezioni</a></li>${COLLEZIONI.map((c) => `<li><a href="${root}collezioni/${c.stile}/">${c.nome}</a></li>`).join('')}<li><a href="${root}borsa/">Borsa</a></li></ul>
      </div>
      <div>
        <h2>Showroom</h2>
        <ul>
          <li><a href="${NEGOZIO.mappa}" target="_blank" rel="noopener">${esc(NEGOZIO.via)}<br>${NEGOZIO.cap} ${NEGOZIO.citta} (${NEGOZIO.provincia})</a></li>
          ${ORARI.map((o) => `<li>${o.etichetta}<br>${fasce(o)}</li>`).join('')}
        </ul>
      </div>
      <div>
        <h2>Contatti</h2>
        <ul>
          ${NEGOZIO.telefoni.map((t) => `<li><a href="${tel(t.numero)}">${t.nome} · ${t.numero}</a></li>`).join('')}
          <li><a href="mailto:${NEGOZIO.email}">${NEGOZIO.email}</a></li>
          <li><a href="https://instagram.com/${NEGOZIO.instagram}" target="_blank" rel="noopener">Instagram @${NEGOZIO.instagram}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© ${new Date().getFullYear()} ${NEGOZIO.ragioneSociale}${NEGOZIO.piva ? ` · P.IVA ${NEGOZIO.piva}` : ''}</span>
      <nav aria-label="Informazioni legali">${legali}</nav>
    </div>
  </div>
</footer>`;
}


/* ---- Componenti alla maniera di apple.com -------------------------------- */
/** Riquadro prodotto: nome, titolo grande, sottotitolo, due pillole, foto grande. */
function tile({ tema = 'light', nome, titolo, sotto, href, wa, label1 = 'Scopri di più', href2, label2 = 'Chiedi info', media, foto = false }) {
  const secondo = href2
    ? `<a class="pill pill--line" href="${href2}">${label2}</a>`
    : `<a class="pill pill--line" href="${waLink(`Buongiorno, vorrei informazioni su ${wa}.`)}" target="_blank" rel="noopener">${label2}</a>`;
  return `<section class="tile tile--${tema}${foto ? ' tile--foto' : ''} reveal">
  <div class="tile__copy">
    <p class="tile__name">${nome}</p>
    <h2 class="tile__title">${titolo}</h2>
    <p class="tile__sub">${sotto}</p>
    <div class="pills"><a class="pill" href="${href}">${label1}</a>${secondo}</div>
  </div>
  <div class="tile__media">${media}</div>
</section>`;
}

/** Carosello di schede: testo in alto, immagine sotto; puntini e play/pausa. */
function carosello({ id, titolo, link, schede, grigio = false }) {
  return `<section class="carousel${grigio ? ' carousel--grey' : ''}" data-carousel aria-roledescription="carosello" aria-label="${esc(titolo)}">
  <div class="carousel__head wrap"><h2 class="carousel__title">${titolo}</h2>${link ? `<a class="carousel__link" href="${link.href}">${link.label}</a>` : ''}</div>
  <ul class="carousel__track" data-track id="car-${id}">
    ${schede.map((c, i) => {
      const [forte, ...resto] = c.testo.split('. ');
      return `<li class="card${c.foto ? ' card--foto' : ''}" aria-roledescription="scheda" aria-label="${i + 1} di ${schede.length}"><p class="card__text"><strong>${forte}.</strong> ${resto.join('. ')}</p><div class="card__media">${c.img}</div></li>`;
    }).join('\n    ')}
  </ul>
  <div class="carousel__controls">
    <div class="carousel__dots" role="tablist" aria-label="Schede">${schede.map((_, i) => `<button type="button" role="tab" aria-label="Scheda ${i + 1}" aria-selected="${i === 0}" data-dot="${i}"></button>`).join('')}</div>
    <button class="carousel__play" type="button" data-play aria-label="Metti in pausa" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pause" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/><path class="i-play" d="M8 5l11 7-11 7z"/></svg></button>
  </div>
</section>`;
}

const setCard = (s, root, { heading = 'h3' } = {}) => `
  <article class="set-card reveal">
    <a class="set-card__media" href="${root}salotti/${s.slug}/" tabindex="-1" aria-hidden="true">${img(root, s.copertina || s.foto[0])}</a>
    <div class="set-card__body">
      <span class="eyebrow">${esc(etichetta(s))}</span>
      <div class="set-card__title"><${heading} class="h3"><a href="${root}salotti/${s.slug}/">${esc(s.nome)}</a></${heading}>${prezzo(s.prezzo)}</div>
      <p>${esc(s.breve)}</p>
      <a class="link" href="${root}salotti/${s.slug}/" aria-label="Scopri: ${esc(s.nome)}">${s.tipo === 'pranzo' ? 'Scopri il tavolo' : 'Scopri il salotto'}</a>
    </div>
  </article>`;

const orariList = () => `<dl class="info-list" data-hours>
  ${ORARI.map((o) => `<div><dt>${o.etichetta}</dt><dd>${fasce(o)}</dd></div>`).join('')}
</dl>`;

/* ---- pagine ----------------------------------------------------------- */
const pages = [];
const page = (path, html) => pages.push({ path, html });

// HOME
{
  const root = '';
  const tortora = SET.find((s) => s.slug === 'salotto-tortora');
  page('', layout({
    path: '', root, heroOver: true, bodyClass: 'page-home',
    scripts: '<script src="assets/hero.js" defer></script>',
    title: 'Bazar Marrakech — Salotti in velluto e oro · Showroom a Lugo',
    description: 'Salotti completi in velluto, capitonné e dettagli in oro. Scegli la tua composizione online o nello showroom di Lugo (RA). Consegne in tutta Italia.',
    jsonLd: jsonLdNegozio(root),
    body: `
<script>(function(){var h=location.hash,m=h.match(/^#\\/(p|negozio|borsa|showroom)(?:\\/([\\w-]+))?/);if(!m)return;var t={borsa:'borsa/',showroom:'showroom/',negozio:'collezioni/'}[m[1]];if(m[1]==='p')t=/^salotto-(tortora|beige)$/.test(m[2])?'salotti/'+m[2]+'/':'collezioni/';location.replace(t)})()</script>
<!-- HERO: calma, alla maniera di Apple. Prima di tutto il marchio, grande e
     nitido sul nero caldo; scorrendo arrivano subito i salotti. -->
<section class="hero-logo" data-hero aria-labelledby="hero-titolo">
  <h1 id="hero-titolo" class="sr-only">Bazar Marrakech — salotti e divani, showroom a Lugo</h1>
  <img class="hero-logo__mark" src="img/logo.webp" width="884" height="258" alt="Bazar Marrakech" fetchpriority="high">
  <p class="hero-logo__line">Il tuo salotto ti aspetta.</p>
  <a class="hero-logo__hint" href="#salotti" aria-label="Scorri ai salotti"><span>Scorri</span><i aria-hidden="true"></i></a>
</section>

<!-- Fascia sotto la hero, come la striscia promozionale di apple.com -->
<p class="promo" id="salotti">Showroom a Lugo, consegne in tutta Italia. <a href="showroom/">Orari e indicazioni ›</a></p>

<div class="tiles">
${tile({ tema: 'light', nome: 'Salotto Tortora', titolo: 'Le curve che abbracciano.', sotto: 'Velluto tortora, capitonné e profili in oro.', href: 'salotti/salotto-tortora/', wa: 'Salotto Tortora', media: '<img src="img/studio/salotto-tortora.webp" width="1600" height="1200" alt="Salotto Tortora: divano capitonné, due poltrone tonde e tavolini nesting" loading="lazy" decoding="async">' })}
${tile({ tema: 'dark', nome: 'Nuova collezione', titolo: 'Profondo come la notte.', sotto: 'Velluto blu e oro.', href: 'contatti/', label1: 'Chiedi info', href2: 'showroom/', label2: 'Vieni a vederlo', media: '<img class="tile__png" src="img/studio/divano-blu-png.webp" width="1216" height="654" alt="Divano chesterfield in velluto blu con gambe color oro" loading="lazy" decoding="async">' })}
${tile({ tema: 'light', nome: 'Salotto Nero', titolo: 'Il nero, pieno.', sotto: 'Velluto nero, capitonné e profili argento.', href: 'salotti/salotto-nero/', wa: 'Salotto Nero', media: '<img src="img/studio/salotto-nero-poltrone.webp" width="1600" height="1200" alt="Le poltrone in velluto nero del Salotto Nero" loading="lazy" decoding="async">' })}
${tile({ tema: 'light', nome: 'Salotto Avorio', titolo: 'Luce, a canne.', sotto: 'Tessuto avorio lavorato, inserti a specchio, piedi color oro.', href: 'salotti/salotto-avorio/', wa: 'Salotto Avorio', media: '<img src="img/studio/salotto-avorio-poltrone.webp" width="1600" height="1200" alt="Le poltrone del Salotto Avorio" loading="lazy" decoding="async">' })}
  <div class="tiles__pair">
${tile({ tema: 'white', nome: 'Salotto Beige', titolo: 'Tutta la luce del salotto.', sotto: 'Due chesterfield affacciati.', href: 'salotti/salotto-beige/', wa: 'Salotto Beige', foto: true, media: '<img src="img/divano-beige.webp" width="1000" height="749" alt="Salotto Beige: due divani chesterfield con tavolino in marmo" loading="lazy" decoding="async">' })}
${tile({ tema: 'light', nome: 'Sale da pranzo', titolo: 'A tavola, in velluto.', sotto: 'Tavoli effetto marmo, sedie in velluto.', href: 'collezioni/sale-da-pranzo/', wa: 'le sale da pranzo', media: '<img src="img/studio/pranzo-ovale-blu.webp" width="1600" height="1200" alt="Sala da pranzo Ovale Blu: tavolo ovale effetto marmo nero e sedie in velluto blu" loading="lazy" decoding="async">' })}
  </div>
</div>

${carosello({ id: 'divani', titolo: 'Divani e poltrone.', link: { href: 'collezioni/', label: 'Tutte le collezioni ›' }, schede: [
  { testo: 'Chesterfield Nero. Velluto nero, capitonné, base color oro.', img: '<img src="img/studio/chesterfield-nero.webp" width="1600" height="1200" alt="Divano chesterfield in velluto nero" loading="lazy" decoding="async">' },
  { testo: 'Bergère Blu. Lo schienale alto, le gambe sottili color oro.', img: '<img src="img/studio/poltrona-blu.webp" width="1600" height="2000" alt="Poltrona bergère in velluto blu" loading="lazy" decoding="async">' },
  { testo: 'Poltrona Tonda. Girevole, capitonné tutto intorno.', img: '<img src="img/studio/poltrona-tonda.webp" width="1600" height="2000" alt="Poltrona tonda girevole in velluto tortora" loading="lazy" decoding="async">' },
  { testo: 'Poltrona Nera. Velluto nero, schienale a righe, base girevole.', foto: true, img: '<img src="img/poltrona-nera.webp" width="900" height="1340" alt="Poltrona girevole in velluto nero con schienale a righe" loading="lazy" decoding="async">' },
  { testo: 'Il dettaglio. Velluto, capitonné e un filo color oro.', foto: true, img: '<img src="img/velluto-dettaglio.webp" width="720" height="900" alt="Il velluto tortora da vicino con il profilo color oro" loading="lazy" decoding="async">' },
] })}

${carosello({ id: 'complementi', titolo: 'Complementi.', link: { href: 'showroom/', label: 'Vedili in showroom ›' }, schede: [
  { testo: 'Leopardo. Color oro, tempestato di strass.', img: '<img src="img/studio/leopardo.webp" width="1600" height="1200" alt="Statua di leopardo color oro con strass" loading="lazy" decoding="async">' },
  { testo: 'Pesci dorati. Ceramica oro lucida e satinata.', img: '<img src="img/studio/pesci.webp" width="1600" height="2000" alt="Scultura di pesci in ceramica color oro" loading="lazy" decoding="async">' },
  { testo: 'Lampada da tavolo. Cristalli e paralume ricamato.', img: '<img src="img/studio/lampada.webp" width="1600" height="2000" alt="Lampada da tavolo con base in cristalli e paralume ricamato" loading="lazy" decoding="async">' },
  { testo: 'Vaso oro. Con il bouquet avorio e oro.', img: '<img src="img/studio/vaso-oro.webp" width="1600" height="2000" alt="Vaso color oro scanalato con bouquet di fiori avorio" loading="lazy" decoding="async">' },
  { testo: 'Vaso bianco. Rose cipria e rami dorati.', img: '<img src="img/studio/vaso-rose.webp" width="1600" height="2000" alt="Vaso bianco a coste con rose color cipria" loading="lazy" decoding="async">' },
] })}

${carosello({ id: 'profumi', titolo: 'Profumi.', link: { href: 'showroom/', label: 'Scoprili in showroom ›' }, grigio: true, schede: [
  { testo: 'Anfar Odyssée. Extrait de parfum, 100 ml.', img: '<img src="img/studio/anfar-odyssee.webp" width="1600" height="2000" alt="Profumo Anfar Odyssée, flacone oro e rosso" loading="lazy" decoding="async">' },
  { testo: 'Afnan 9am. Pour femme, eau de parfum 100 ml.', img: '<img src="img/studio/afnan-9am.webp" width="1600" height="2000" alt="Profumo Afnan 9am pour femme, flacone rosa" loading="lazy" decoding="async">' },
  { testo: 'Afnan 9pm. Pour femme, eau de parfum 100 ml.', img: '<img src="img/studio/afnan-9pm.webp" width="1600" height="2000" alt="Profumo Afnan 9pm pour femme, flacone viola" loading="lazy" decoding="async">' },
] })}

${carosello({ id: 'showroom', titolo: 'Dallo showroom.', link: { href: 'showroom/', label: 'Scopri lo showroom ›' }, grigio: true, schede: [
  { testo: 'Lo showroom di Lugo. Salotti da vedere, toccare, provare.', foto: true, img: '<img src="img/showroom-salotto-bianco.webp" width="1100" height="1303" alt="Lo showroom: salotto bianco con profili oro e mobile con camino" loading="lazy" decoding="async">' },
  { testo: 'Tappeti. Disegni geometrici, effetto marmo, fili d’oro.', foto: true, img: '<img src="img/reparto-tappeti.webp" width="700" height="875" alt="Tappeti arrotolati con disegni geometrici e dettagli oro" loading="lazy" decoding="async">' },
  { testo: 'Profumi e casalinghi. Fragranze e oggetti per la casa.', foto: true, img: '<img src="img/reparto-profumi.webp" width="700" height="874" alt="Profumi in esposizione" loading="lazy" decoding="async">' },
  { testo: 'Bicchieri da tè. Set decorati in oro e colori.', foto: true, img: '<img src="img/bicchieri-te.webp" width="800" height="1000" alt="Set di bicchieri da tè decorati" loading="lazy" decoding="async">' },
  { testo: 'Complementi. Gli oggetti che danno carattere.', foto: true, img: '<img src="img/reparto-complementi.webp" width="700" height="875" alt="Pavone decorativo dorato" loading="lazy" decoding="async">' },
] })}

<section class="tile tile--dark tile--info">
  <div class="tile__copy">
    <p class="tile__name">Showroom · Lugo</p>
    <h2 class="tile__title">Il tuo prossimo salotto ti aspetta.</h2>
    <p class="tile__sub">${esc(indirizzo)}</p>
    <p class="status" data-status data-open="true" hidden></p>
    <div class="pills"><a class="pill" href="${NEGOZIO.mappa}" target="_blank" rel="noopener">Indicazioni</a><a class="pill pill--line" href="showroom/">Orari e contatti</a></div>
  </div>
</section>`,
  }));
}

// COLLEZIONI + CATEGORIE
function catalogo({ root, path, title, h1, lead, lista, crumbs, nav }) {
  const filtri = SET.length >= 4; // con pochi set i filtri non servono: compaiono da soli
  const toolbar = filtri ? `
    <div class="toolbar" data-catalog-tools>
      <div class="filters" role="group" aria-label="Filtra per colore">
        <button class="filter" type="button" aria-pressed="true" data-filter="">Tutti i colori</button>
        ${[...new Map(lista.map((s) => [s.colore.id, s.colore])).values()].map((c) => `<button class="filter" type="button" aria-pressed="false" data-filter="${c.id}">${c.nome}</button>`).join('')}
      </div>
      <label class="sort">Ordina <select data-sort>
        <option value="">Consigliati</option>
        ${lista.some((s) => s.prezzo != null) ? '<option value="asc">Prezzo crescente</option><option value="desc">Prezzo decrescente</option>' : ''}
      </select></label>
    </div>` : '';
  return layout({
    path, root, title, nav,
    description: lead,
    body: `
<div class="wrap">
  <header class="page-head">
    <ol class="crumbs">${crumbs}</ol>
    <h1 class="h1">${h1}</h1>
    <p class="lead">${lead}</p>
  </header>
  ${toolbar}
  <div class="sets" data-catalog>${lista.map((s) => setCard(s, root, { heading: 'h2' }).replace('<article class="set-card reveal"', `<article class="set-card reveal" data-colore="${s.colore.id}" data-prezzo="${s.prezzo ?? ''}"`)).join('')}</div>
  <div class="note reveal">
    <p class="muted">Il catalogo online si sta ampliando. Per conoscere tutte le composizioni disponibili, contattaci o vieni a trovarci nello showroom di Lugo.</p>
    <a class="link" href="${root}contatti/">Contattaci</a>
  </div>
</div>
<div style="height:var(--section)"></div>`,
  });
}
page('collezioni/', catalogo({
  root: '../', path: 'collezioni/', nav: 'collezioni',
  title: 'Collezioni — Salotti completi | Bazar Marrakech',
  h1: 'Collezioni', lead: 'Salotti completi e sale da pranzo in velluto, capitonné e dettagli in oro: ogni composizione pensata come un insieme.',
  lista: SET, crumbs: '<li><a href="../">Home</a></li><li aria-current="page">Collezioni</li>',
}));
for (const c of COLLEZIONI) {
  page(`collezioni/${c.stile}/`, catalogo({
    root: '../../', path: `collezioni/${c.stile}/`, nav: 'collezioni',
    title: c.pranzo ? 'Sale da pranzo — Tavoli e sedie | Bazar Marrakech' : `Collezione ${c.nome} — Salotti | Bazar Marrakech`,
    h1: c.pranzo ? 'Sale da pranzo' : `Collezione ${c.nome}`,
    lead: c.pranzo ? 'Tavoli e sedie in velluto, con i dettagli color oro.' : `I salotti della collezione ${c.nome}.`,
    lista: SET.filter((s) => s.stile === c.stile),
    crumbs: `<li><a href="../../">Home</a></li><li><a href="../">Collezioni</a></li><li aria-current="page">${c.nome}</li>`,
  }));
}

// PRODOTTI
for (const s of SET) {
  const root = '../../';
  const altri = SET.filter((x) => x.slug !== s.slug);
  const dettaglio = s.foto.find((f) => f.file === 'velluto-dettaglio') || s.foto[s.foto.length - 1];
  // Visore alla maniera di apple.com: una foto grande alla volta (si scorre di
  // lato col dito) e sotto le pillole per sceglierla.
  const nomi = s.foto.map((f) => (f.file.startsWith('studio/') ? 'In studio' : /dettaglio/.test(f.file) ? 'Dettaglio' : 'Nello showroom'));
  const etichette = nomi.map((n, i) => { const k = nomi.slice(0, i + 1).filter((x) => x === n).length; return k > 1 ? `${n} ${k}` : n; });
  const galleria = s.foto.map((f, i) => `<li${i ? ' aria-hidden="true"' : ''}>${img(root, f, { eager: i === 0 })}</li>`).join('');
  const pillole = s.foto.length > 1 ? `<div class="chips" role="tablist" aria-label="Scegli la foto">${etichette.map((l, i) => `<button type="button" role="tab" class="chip" aria-selected="${i === 0}" data-chip="${i}"><span class="chip__plus" aria-hidden="true">+</span>${l}</button>`).join('')}</div>` : '';
  const waProdotto = waLink(`Buongiorno, vorrei informazioni su ${s.nome}.`);
  page(`salotti/${s.slug}/`, layout({
    path: `salotti/${s.slug}/`, root, nav: 'collezioni', image: s.foto[0].file, bodyClass: 'has-sticky-buy',
    title: `${s.nome} — ${etichetta(s)} | Bazar Marrakech`,
    description: `${s.nome}: ${s.breve} Richiedi il salotto online o vedilo nello showroom di Lugo.`,
    body: `
<div class="wrap">
  <nav class="page-head" style="padding-bottom:var(--s-4)" aria-label="Percorso">
    <ol class="crumbs"><li><a href="${root}">Home</a></li><li><a href="${root}collezioni/">Collezioni</a></li><li><a href="${root}collezioni/${s.stile}/">${esc(s.collezione)}</a></li><li aria-current="page">${esc(s.nome)}</li></ol>
  </nav>
  <div class="prodbar" data-prodbar aria-hidden="true">
    <span class="prodbar__name">${esc(s.nome)}</span>
    <a class="pill pill--line pill--sm" href="${waProdotto}" target="_blank" rel="noopener" tabindex="-1">Chiedi</a>
    <a class="pill pill--sm" href="#acquista" data-prodbar-buy tabindex="-1">Richiedi</a>
  </div>
  <div class="pdp">
    <div class="viewer-wrap">
      <div class="viewer"><ul class="viewer__track" data-viewer aria-label="Foto del ${esc(s.nome)}">${galleria}</ul></div>
      ${pillole}
    </div>
    <div class="buy" data-product="${s.slug}">
      <span class="eyebrow">${esc(etichetta(s))}</span>
      <h1 class="h1">${esc(s.nome)}</h1>
      <p class="buy__price">${prezzo(s.prezzo)}</p>
      <p class="buy__intro">${esc(s.breve)}</p>

      <div class="buy__block">
        <p class="buy__label">Composizione in foto</p>
        <ul class="ticks">${s.composizioneFoto.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        ${s.configurazioni.length ? '' : '<p class="buy__hint">La composizione definitiva e gli elementi inclusi si confermano con il negozio.</p>'}
      </div>
      ${s.configurazioni.length ? `
      <fieldset class="buy__block" style="border:0;border-top:1px solid var(--line)">
        <legend class="buy__label">Configurazione</legend>
        <div class="options">${s.configurazioni.map((c, i) => `<label class="option"><input type="radio" name="config" value="${esc(c.nome)}"${i ? '' : ' checked'}> <span>${esc(c.nome)}</span>${c.prezzo != null ? `<span class="price" style="margin-left:auto">${eur(c.prezzo)}</span>` : ''}</label>`).join('')}</div>
      </fieldset>` : ''}
      ${s.misure.length ? `<div class="buy__block"><p class="buy__label">Dimensioni</p><dl class="info-list">${s.misure.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>` : ''}
      <div class="buy__block">
        <p class="buy__label">Finiture</p>
        <ul class="ticks">${s.finiture.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>
      <div class="buy__block" data-buy-main id="acquista">
        <div class="qty-row">
          <div class="qty" role="group" aria-label="Quantità"><button type="button" data-qty="-1" aria-label="Diminuisci">−</button><output data-qty-value aria-live="polite">1</output><button type="button" data-qty="1" aria-label="Aumenta">+</button></div>
          <button class="btn" type="button" data-add>Aggiungi alla borsa</button>
        </div>
        <p class="buy__hint" data-add-status role="status"></p>
        <p class="buy__hint">Nessun pagamento online. Dopo la richiesta ti contattiamo per confermare disponibilità, prezzo definitivo e consegna.</p>
      </div>
      <details class="acc"><summary>Come funziona la richiesta d’ordine</summary><div class="acc-body">Aggiungi il salotto alla borsa e lasciaci i tuoi recapiti. Ricevi un codice di richiesta: il nostro team verifica i dettagli e ti ricontatta. La richiesta non è un acquisto e non comporta alcun pagamento.</div></details>
      <details class="acc"><summary>Consegna</summary><div class="acc-body">Consegniamo in tutta Italia. Tempi e costi vengono comunicati dal negozio insieme alla conferma.</div></details>
      <details class="acc"><summary>Vedilo dal vivo</summary><div class="acc-body">${esc(indirizzo)}. ${ORARI.map((o) => `${o.etichetta}: ${fasce(o)}`).join('. ')}. <a class="textlink" href="${NEGOZIO.mappa}" target="_blank" rel="noopener">Indicazioni</a></div></details>
    </div>
  </div>
</div>

<section class="section section--beige">
  <div class="wrap story">
    <div class="story__text reveal">
      <span class="eyebrow">Da vicino</span>
      <h2 class="h2">${esc(s.nome)}</h2>
      <div class="prose muted">${s.descrizione.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    </div>
    <div class="story__media reveal">${img(root, dettaglio)}</div>
  </div>
</section>

${altri.length ? `<section class="section">
  <div class="wrap">
    <div class="head-row reveal"><h2 class="h2">Scopri anche</h2><a class="link" href="${root}collezioni/">Tutte le collezioni</a></div>
    <div class="sets">${altri.map((x) => setCard(x, root)).join('')}</div>
  </div>
</section>` : ''}

<div class="sticky-buy" data-sticky-buy aria-hidden="true">
  <div class="sticky-buy__info"><strong>${esc(s.nome)}</strong><span>${s.prezzo == null ? 'Prezzo su richiesta' : eur(s.prezzo)}</span></div>
  <button class="pill" type="button" data-add-sticky tabindex="-1">Aggiungi</button>
</div>`,
  }));
}

// «35 KG» — PROTOTIPO della scatola sulla bilancia (non indicizzato, non nel menu)
{
  // Prodotti di esempio: devono combaciare con PRODOTTI in assets/pacco.js
  const DEMO = [
    ['set-rosso-oro', 'Set bicchieri Rosso e Oro', 'bicchieri'], ['set-verde-oro', 'Set bicchieri Verde e Oro', 'bicchieri'],
    ['set-mosaico', 'Set bicchieri Mosaico', 'bicchieri'], ['set-nero-greca', 'Set bicchieri Nero e Oro', 'bicchieri'],
    ['set-multicolore', 'Set bicchieri Multicolore', 'bicchieri'], ['set-calligrafia', 'Set bicchieri Calligrafia', 'bicchieri'],
    ['set-fascia-oro', 'Set bicchieri Fascia Oro', 'bicchieri'],
  ];
  /** I prodotti della scatola: un'unica lista, passata anche a pacco.js.
   *  [ESEMPIO] i pesi vanno sostituiti con quelli misurati in negozio.
   *  prezzo null = «Su richiesta» (si può comunque mettere nella scatola). */
  const PACCO = [
    ...DEMO.map(([id, nome, cat]) => ({ id, nome, cat, meta: '12 pezzi', kg: 1.8, prezzo: 7, foto: `../img/pacco/${id}.webp`, cover: true })),
    { id: 'tazzine-bianco-oro', nome: 'Set tazzine Bianco e Oro', cat: 'tazzine', meta: '6 tazzine e piattini', kg: 1.6, prezzo: null, foto: '../img/studio/tazzine-bianco-oro.webp', box: '../img/pacco/tazzine-bianco-oro-png.webp' },
    { id: 'tazzine-nero-greca', nome: 'Set tazzine Nero Greca', cat: 'tazzine', meta: '6 tazzine e piattini', kg: 1.6, prezzo: 35, foto: '../img/studio/tazzine-nero-greca.webp', box: '../img/pacco/tazzine-nero-greca-png.webp' },
    { id: 'vassoio-tondo', nome: 'Vassoio tondo traforato', cat: 'vassoi', meta: 'Color oro, con manici', kg: 2.2, prezzo: null, foto: '../img/studio/vassoio-tondo.webp', box: '../img/pacco/vassoio-tondo-png.webp' },
    { id: 'vassoio-martellato', nome: 'Vassoi martellati, set da 2', cat: 'vassoi', meta: 'Color oro, con manici', kg: 1.6, prezzo: null, foto: '../img/studio/vassoio-martellato.webp', box: '../img/pacco/vassoio-martellato-png.webp' },
    { id: 'vassoio-perline', nome: 'Vassoi con perline, set da 2', cat: 'vassoi', meta: 'Color oro, con manici', kg: 1.8, prezzo: null, foto: '../img/studio/vassoio-perline.webp', box: '../img/pacco/vassoio-perline-png.webp' },
    { id: 'cloche', nome: 'Piatto con cloche', cat: 'vassoi', meta: 'Acciaio con decori oro', kg: 1.5, prezzo: null, foto: '../img/studio/cloche.webp', box: '../img/pacco/cloche-png.webp' },
  ];
  // La scena: scatola aperta sulla bilancia. In apertura è un'illustrazione
  // fissa (scatola già piena); nel riquadro della bilancia è quella vera.
  // Tre strati: l'immagine della scatola sulla bilancia; i prodotti; sopra,
  // la stessa immagine tagliata dal bordo in giù (lembo anteriore + bilancia),
  // così i set finiscono DENTRO la scatola. Etichetta e display sono testo vero.
  const scena = (illustrazione = false) => `<div class="kg-scene-wrap"${illustrazione ? ' style="--quota:.36" aria-hidden="true"' : ''}><div class="kg-scene"${illustrazione ? '' : ' data-scena data-box'}>
      <img class="kg-img" src="../img/pacco/scatola-bilancia.webp" width="1200" height="923" alt="${illustrazione ? '' : 'Scatola di cartone aperta su una bilancia digitale'}"${illustrazione ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}>
      <div class="kg-box__items"${illustrazione ? ' style="--w:22%"' : ' data-items'}>${illustrazione ? DEMO.map(([id]) => `<img src="../img/pacco/${id}.webp" alt="">`).join('') : ''}</div>
      <img class="kg-img kg-img--front" src="../img/pacco/scatola-bilancia.webp" width="1200" height="923" alt="" aria-hidden="true">
      <span class="kg-label" aria-hidden="true">MAX 35 KG</span>
      <div class="kg-display"${illustrazione ? '' : ' role="status" aria-live="polite"'}><span class="kg-num"${illustrazione ? '' : ' data-kg'}>${illustrazione ? '12,6' : '0,0'}</span><span class="kg-unit">kg</span><span class="kg-of">/ 35</span></div>
    </div>
    <div class="kg-meter" aria-hidden="true"><i></i></div></div>`;
  const kgIt = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 1 });
  const card = (p) => `<article class="kg-card" data-prodotto="${p.id}">
      <div class="kg-card__media${p.cover ? '' : ' kg-card__media--studio'}"><img src="${p.foto}" alt="${esc(p.nome)}" loading="lazy" decoding="async"></div>
      <div class="kg-card__body">
        <h3 class="kg-card__name">${esc(p.nome)}</h3>
        <p class="kg-card__meta">${esc(p.meta)} · ${kgIt(p.kg)} kg</p>
        <div class="kg-card__foot">
          <span class="kg-card__price${p.prezzo == null ? ' kg-card__price--req' : ''}">${p.prezzo == null ? 'Su richiesta' : '€ ' + p.prezzo}</span>
          <div class="kg-step"><button type="button" data-meno aria-label="Togli uno">−</button><output data-q>0</output><button type="button" data-piu aria-label="Aggiungi alla scatola">+</button></div>
        </div>
      </div>
    </article>`;
  page('35kg/', layout({
    path: '35kg/', root: '../', noindex: true,
    title: '35 kg — Riempi la scatola | Bazar Marrakech',
    description: 'Set bicchieri 7 €, spedizione 7 €: un pacco fino a 35 kg da riempire con quello che vuoi.',
    scripts: `<script>window.PACCO = ${JSON.stringify(PACCO.map(({ cover, meta, ...p }) => p))};</script>\n<script src="../assets/pacco.js" defer></script>`,
    body: `
<div data-pacco data-wa="${WHATSAPP}">
<!-- Una sola scena, alla maniera di apple.com: titolo, la scatola sulla
     bilancia (quella vera, che si riempie), una riga di stato. -->
<section class="kg-hero">
  <p class="kg-hero__eyebrow">Novità · 35 kg</p>
  <h1 class="kg-hero__title">Set bicchieri <span class="oro">7 €.</span><br>Spedizione <span class="oro">7 €.</span></h1>
  <p class="kg-hero__sub">Un pacco fino a 35 kg: riempilo con quello che vuoi.</p>
  <div class="kg-hero__visual">${scena()}</div>
  <p class="kg-status" data-stato-testo>La scatola è vuota. Comincia dai bicchieri.</p>
  <p class="kg-hint" data-hint></p>
  <p class="kg-sum">Totale <b data-tot>€ 0</b> <span>· spedizione inclusa</span></p>
  <div class="pills"><a class="pill" data-wa target="_blank" rel="noopener">Invia su WhatsApp</a><button class="pill pill--line" type="button" data-apri-scatola>Vedi la scatola</button></div>
</section>

<section class="kg-shop-wrap" id="riempi">
  <div class="wrap">
    <div class="kg-shop">
      <h2 class="kg-shop__title">Scegli cosa metterci.</h2>
      <div class="kg-cats" role="tablist" aria-label="Categorie">
        <button type="button" role="tab" aria-selected="true" data-cat="tutto">Tutto</button>
        <button type="button" role="tab" aria-selected="false" data-cat="bicchieri">Bicchieri</button>
        <button type="button" role="tab" aria-selected="false" data-cat="tazzine">Tazzine</button>
        <button type="button" role="tab" aria-selected="false" data-cat="vassoi">Vassoi</button>
      </div>
      <div class="kg-grid">
        ${PACCO.map(card).join('\n        ')}
      </div>
      <p class="kg-note">Prototipo: prodotti, pesi e foto sono di esempio.</p>
    </div>
  </div>
</section>

<section class="kg-how" id="come">
  <div class="wrap">
    <h2 class="kg-shop__title">Come funziona.</h2>
    <ol class="kg-steps">
      <li><h3>Scegli.</h3><p>Bicchieri, teiere, posate: tutto quello che serve in cucina.</p></li>
      <li><h3>Riempi fino a 35 kg.</h3><p>La bilancia ti dice quanto pesa la scatola e quanto spazio resta.</p></li>
      <li class="kg-step--img"><h3>Ricevi a casa.</h3><p>La spedizione è sempre 7 €, qualunque cosa ci sia dentro.</p><img src="../img/pacco/scatola-chiusa.webp" width="900" height="1200" alt="La scatola chiusa e sigillata, pronta per la spedizione" loading="lazy" decoding="async"></li>
    </ol>
  </div>
</section>

<div class="kg-sheet" data-sheet hidden>
  <div class="kg-sheet__bg" data-chiudi-scatola></div>
  <div class="kg-sheet__panel" role="dialog" aria-modal="true" aria-label="Contenuto della scatola">
    <h2>La tua scatola</h2>
    <ul data-elenco></ul>
    <div class="kg-total" style="max-width:none"><div class="sum"><span><span data-kg>0,0</span> kg / 35</span><b data-tot>€ 0</b></div></div>
    <div class="pills"><button class="pill pill--line" type="button" data-svuota>Svuota</button><a class="pill" data-wa target="_blank" rel="noopener">Invia su WhatsApp</a><button class="pill pill--line" type="button" data-chiudi-scatola>Chiudi</button></div>
  </div>
</div>

<div class="kg-bar" data-barra aria-hidden="true">
  <span class="kg-bar__ring" aria-hidden="true"><img src="../img/pacco/scatola-icona.webp" width="256" height="171" alt=""></span>
  <span class="kg-bar__kg"><span data-kg>0,0</span> <small>/ 35 kg</small></span>
  <span class="kg-bar__tot" data-tot>€ 0</span>
  <button class="pill" type="button" data-apri-scatola>Scatola</button>
</div>
</div>`,
  }));
}

// BORSA
page('borsa/', layout({
  path: 'borsa/', root: '../', noindex: true,
  title: 'Borsa — Richiesta d’ordine | Bazar Marrakech',
  description: 'La tua selezione di salotti Bazar Marrakech e la richiesta d’ordine.',
  body: `
<div class="wrap">
  <header class="page-head" style="padding-bottom:var(--s-4)">
    <h1 class="h1" data-bag-title>La tua borsa</h1>
    <ol class="steps" data-steps><li aria-current="step">Borsa</li><li>I tuoi dati</li><li>Riepilogo</li></ol>
  </header>
  <div data-bag-root>
    <noscript><p class="lead">Per comporre una richiesta d’ordine serve JavaScript. In alternativa scrivici a <a class="textlink" href="mailto:${NEGOZIO.email}">${NEGOZIO.email}</a>.</p></noscript>
  </div>
</div>`,
}));

// SHOWROOM
page('showroom/', layout({
  path: 'showroom/', root: '../', nav: 'showroom', image: 'showroom-salotto-bianco',
  title: 'Showroom a Lugo — Bazar Marrakech',
  description: `Lo showroom Bazar Marrakech: ${indirizzo}. Orari, indicazioni e contatti.`,
  jsonLd: jsonLdNegozio('../'),
  body: `
<div class="wrap">
  <header class="page-head">
    <span class="eyebrow">Showroom</span>
    <h1 class="h1">Il tuo prossimo salotto ti aspetta.</h1>
    <p class="lead">Scopri le collezioni Bazar Marrakech anche nel nostro showroom: vedi da vicino le composizioni, i velluti e le finiture.</p>
  </header>
  <div class="contact-grid">
    <div class="contact-grid__media reveal"><img src="../img/showroom-salotto-bianco.webp" width="1100" height="1303" alt="Lo showroom Bazar Marrakech: salotto bianco con profili oro e mobile con camino" fetchpriority="high"></div>
    <div class="contact-grid__info">
      <div class="reveal">
        <h2>Dove siamo</h2>
        <dl class="info-list"><div><dt>Indirizzo</dt><dd>${esc(indirizzo)}</dd></div></dl>
        <figure class="entrance"><img src="../img/showroom-ingresso.webp" width="760" height="1204" alt="L’ingresso del negozio Bazar Marrakech" loading="lazy" decoding="async"><figcaption class="small muted">L’ingresso, in Via Fratelli Zucchini.</figcaption></figure>
        <p style="margin-top:var(--s-3)"><a class="btn btn--line" href="${NEGOZIO.mappa}" target="_blank" rel="noopener">Indicazioni stradali</a></p>
      </div>
      <div class="reveal">
        <h2>Orari</h2>
        <p class="status" data-status hidden></p>
        <div style="margin-top:var(--s-2)">${orariList()}</div>
      </div>
      <div class="reveal">
        <h2>Prima di venire</h2>
        <p class="muted" style="max-width:var(--measure)">Se cerchi una composizione in particolare, chiamaci prima di venire.</p>
        <div class="info-list" style="margin-top:var(--s-3)">${NEGOZIO.telefoni.map((t) => `<a href="${tel(t.numero)}"><span class="k">${t.nome}</span><span class="v">${t.numero}</span></a>`).join('')}</div>
      </div>
    </div>
  </div>
</div>

<section class="section section--ink">
  <div class="wrap">
    <div class="head-row reveal"><div><span class="eyebrow">Nello showroom</span><h2 class="h2" style="margin-top:var(--s-2)">Non solo salotti.</h2><p class="lead">I reparti del negozio, da scoprire dal vivo.</p></div></div>
    <div class="reparti">
      ${REPARTI.map((r) => `<figure class="reparto reveal"><img src="../img/${r.foto}.webp" width="${r.w || 700}" height="${r.h || 875}" alt="${esc(r.alt)}" loading="lazy" decoding="async"><figcaption><h3>${r.nome}</h3><p>${r.riga}</p></figcaption></figure>`).join('')}
    </div>
  </div>
</section>`,
}));

// CONTATTI
page('contatti/', layout({
  path: 'contatti/', root: '../', nav: 'contatti',
  title: 'Contatti — Bazar Marrakech',
  description: `Contatta Bazar Marrakech: telefono, email, Instagram. Showroom in ${indirizzo}.`,
  jsonLd: jsonLdNegozio('../'),
  body: `
<div class="wrap">
  <header class="page-head">
    <span class="eyebrow">Contatti</span>
    <h1 class="h1">Parliamo del tuo salotto.</h1>
    <p class="lead">Per informazioni su composizioni, prezzi e consegne puoi chiamarci, scriverci o passare in showroom.</p>
  </header>
  <div class="contact-grid" style="align-items:start">
    <div class="contact-grid__media reveal"><img src="../img/divano-ambientato.webp" width="640" height="800" alt="Divano capitonné tortora in un soggiorno con vista sulla città" loading="lazy" decoding="async"></div>
    <div class="contact-grid__info">
      <div class="reveal">
        <h2>Telefono</h2>
        <div class="info-list">${NEGOZIO.telefoni.map((t) => `<a href="${tel(t.numero)}"><span class="k">${t.nome}</span><span class="v">${t.numero}</span></a>`).join('')}</div>
      </div>
      <div class="reveal">
        <h2>Scrivici</h2>
        <div class="info-list">
          <a href="mailto:${NEGOZIO.email}"><span class="k">Email</span><span class="v">${NEGOZIO.email}</span></a>
          <a href="https://instagram.com/${NEGOZIO.instagram}" target="_blank" rel="noopener"><span class="k">Instagram</span><span class="v">@${NEGOZIO.instagram}</span></a>
          ${WHATSAPP ? `<a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener"><span class="k">WhatsApp</span><span class="v">Scrivici</span></a>` : ''}
        </div>
      </div>
      <div class="reveal">
        <h2>Showroom</h2>
        <dl class="info-list"><div><dt>Indirizzo</dt><dd>${esc(indirizzo)}</dd></div>${ORARI.map((o) => `<div><dt>${o.etichetta}</dt><dd>${fasce(o)}</dd></div>`).join('')}</dl>
        <p style="margin-top:var(--s-3)"><a class="link" href="../showroom/">Scopri lo showroom</a></p>
      </div>
    </div>
  </div>
</div>`,
}));

// LEGALI — segnaposto onesti, non indicizzati finché il testo non è pronto
for (const l of LEGALI) {
  page(`${l.slug}/`, layout({
    path: `${l.slug}/`, root: '../', noindex: !l.pronto,
    title: `${l.titolo} — Bazar Marrakech`,
    description: `${l.titolo} di Bazar Marrakech.`,
    body: `
<div class="wrap">
  <header class="page-head"><span class="eyebrow">Informazioni</span><h1 class="h1">${l.titolo}</h1></header>
  <div class="legal prose">
    <p class="notice">Questo documento è in preparazione e sarà pubblicato a breve.</p>
    <p class="muted">Per qualsiasi domanda sul trattamento dei tuoi dati o sulle richieste d’ordine puoi scriverci a <a class="textlink" href="mailto:${NEGOZIO.email}">${NEGOZIO.email}</a>. Una richiesta d’ordine inviata da questo sito non costituisce un contratto di vendita: il contratto si conclude solo dopo la conferma del negozio.</p>
  </div>
</div>`,
  }));
}

/* ---- scrittura -------------------------------------------------------- */
const vecchie = ['collezioni', 'salotti', 'borsa', 'showroom', 'contatti', ...LEGALI.map((l) => l.slug)];
for (const d of vecchie) if (existsSync(join(OUT, d))) rmSync(join(OUT, d), { recursive: true });
for (const p of pages) {
  const file = join(OUT, p.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, p.html);
}

// Il catalogo per lo script delle pagine (borsa, richiesta d'ordine).
const perClient = {
  negozio: { nome: NEGOZIO.nome, email: NEGOZIO.email, telefoni: NEGOZIO.telefoni, indirizzo },
  orari: ORARI,
  web3formsKey: WEB3FORMS_KEY,
  whatsapp: WHATSAPP,
  set: SET.map((s) => ({ slug: s.slug, nome: s.nome, collezione: s.collezione, prezzo: s.prezzo, foto: s.copertina || s.foto[0], composizione: s.composizioneFoto, configurazioni: s.configurazioni })),
};
writeFileSync(join(OUT, 'assets/catalogo.js'), `/* Generato da tools/bazar-shop/build.mjs — non modificare a mano. */\nwindow.BM = ${JSON.stringify(perClient, null, 2)};\n`);

// Sitemap della sezione (solo pagine indicizzabili).
const indicizzabili = pages.filter((p) => !/noindex/.test(p.html));
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indicizzabili.map((p) => `  <url><loc>${BASE_URL}${p.path}</loc></url>`).join('\n')}\n</urlset>\n`);

console.log(`${pages.length} pagine scritte in ${OUT}`);
