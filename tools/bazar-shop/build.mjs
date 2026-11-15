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
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEGOZIO, ORARI, SET, LEGALI, WEB3FORMS_KEY, WHATSAPP, WHATSAPP_MESSAGGIO } from './dati.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../public/bazar-shop');
/** Indirizzo pubblico attuale (anteprima). Da cambiare quando c'è il dominio. */
const BASE_URL = 'https://bazar-marrakech-anteprima.vercel.app/';

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

/** Prima i nuovi arrivi disponibili, in fondo gli ultimi pezzi. */
const ORDINE = (a, b) => ({ disponibile: 0, undefined: 1, ultimi: 2 }[a.stato] - { disponibile: 0, undefined: 1, ultimi: 2 }[b.stato]);
SET.sort(ORDINE);
const COLLEZIONI = [...new Map(SET.map((s) => [s.stile, { stile: s.stile, nome: s.collezione, pranzo: s.tipo === 'pranzo', complemento: s.tipo === 'complemento' }])).values()];
/** L'etichetta sopra il nome: «Collezione Capitonné», oppure «Sala da pranzo». */
const etichetta = (s) => (s.tipo === 'pranzo' ? 'Sala da pranzo' : s.tipo === 'complemento' ? 'Complemento d’arredo' : `Collezione ${s.collezione}`);

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
    <div class="promo-pop__copy">
      <p class="promo-pop__eyebrow">Nuovi arrivi</p>
      <h2 class="promo-pop__title" id="promo-titolo">È arrivata la nuova merce.</h2>
      <p class="promo-pop__sub">Cinque nuovi salotti e il mobile TV con il camino: scoprili online o vieni a vederli a Lugo.</p>
    </div>
    <ul class="promo-pop__list"><li><a href="${root}salotti/salotto-crema/"><span class="promo-pop__thumb"><img src="${root}img/${SET.find((x) => x.slug === 'salotto-crema').copertina.file}.webp" alt="" decoding="async"></span>Salotto Crema</a></li><li><a href="${root}salotti/salotto-grigio/"><span class="promo-pop__thumb"><img src="${root}img/${SET.find((x) => x.slug === 'salotto-grigio').copertina.file}.webp" alt="" decoding="async"></span>Salotto Grigio</a></li><li><a href="${root}salotti/salotto-antracite/"><span class="promo-pop__thumb"><img src="${root}img/${SET.find((x) => x.slug === 'salotto-antracite').copertina.file}.webp" alt="" decoding="async"></span>Salotto Antracite</a></li><li><a href="${root}salotti/mobile-tv-camino/"><span class="promo-pop__thumb"><img src="${root}img/${SET.find((x) => x.slug === 'mobile-tv-camino').copertina.file}.webp" alt="" decoding="async"></span>Mobile TV con camino</a></li></ul>
    <div class="promo-pop__copy promo-pop__copy--foot">
      <div class="pills"><a class="pill" href="${root}#salotti" data-promo-chiudi-link>Scopri i nuovi arrivi</a><button class="pill pill--line" type="button" data-promo-chiudi>Più tardi</button></div>
    </div>
  </div>
</div>
<a class="promo-fab" href="${root}#salotti" data-promo-fab aria-label="Nuovi arrivi"><img src="${root}img/studio/salotto-crema-camino-png.webp" width="1408" height="620" alt=""><span><small>Novità</small>Nuovi arrivi</span></a>`;
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
<meta property="og:image" content="${BASE_URL}img/${/\.(jpg|png|webp)$/.test(image) ? image : image + '.webp'}">
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
      ${navLink('collezioni/', 'Salotti', 'collezioni')}
      <a href="${root}collezioni/sale-da-pranzo/">Sale da pranzo</a>
      <a href="${root}collezioni/complementi/">Complementi</a>
      ${navLink('decorazioni/', 'Decorazioni', 'decorazioni')}
      ${navLink('profumi/', 'Profumi', 'profumi')}
      ${navLink('showroom/', 'Showroom', 'showroom')}
    </nav>
    <a class="wa-link" href="${waLink(WHATSAPP_MESSAGGIO)}" target="_blank" rel="noopener" aria-label="Scrivici su WhatsApp: informazioni o visita in showroom">${ICON_WA}<span class="wa-word">WhatsApp</span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Apri il menu" data-menu>${ICON_MENU}</button>
  </div>
</header>
<nav class="mobile-nav" id="mobile-nav" aria-label="Menu">
  <a href="${root}collezioni/">Salotti</a>
  <a href="${root}collezioni/sale-da-pranzo/">Sale da pranzo</a>
  <a href="${root}collezioni/complementi/">Complementi</a>
  <a href="${root}decorazioni/">Decorazioni</a>
  <a href="${root}profumi/">Profumi</a>
  <a href="${root}showroom/">Showroom</a>
  <a href="${root}contatti/">Contatti</a>
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
        <ul><li><a href="${root}collezioni/">Collezioni</a></li>${COLLEZIONI.map((c) => `<li><a href="${root}collezioni/${c.stile}/">${c.nome}</a></li>`).join('')}<li><a href="${root}decorazioni/">Decorazioni</a></li><li><a href="${root}profumi/">Profumi</a></li></ul>
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
      const dentro = `<p class="card__text"><strong>${forte}.</strong> ${resto.join('. ')}</p><div class="card__media">${c.img}</div>`;
      return `<li class="card${c.foto ? ' card--foto' : ''}" aria-roledescription="scheda" aria-label="${i + 1} di ${schede.length}">${c.href ? `<a class="card__a" href="${c.href}">${dentro}</a>` : dentro}</li>`;
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
      <span class="eyebrow">${s.stato === 'disponibile' ? '<b class="badge-nuovo">Nuovo arrivo · Disponibile</b>' : s.stato === 'ultimi' ? '<b class="badge-ultimi">Ultimi pezzi</b>' : esc(etichetta(s))}</span>
      <div class="set-card__title"><${heading} class="h3"><a href="${root}salotti/${s.slug}/">${esc(s.nome)}</a></${heading}>${prezzo(s.prezzo)}</div>
      <p>${esc(s.breve)}</p>
      <a class="link" href="${root}salotti/${s.slug}/" aria-label="Scopri: ${esc(s.nome)}">${s.tipo === 'pranzo' ? 'Scopri il tavolo' : s.tipo === 'complemento' ? 'Scopri' : 'Scopri il salotto'}</a>
    </div>
  </article>`;

const orariList = () => `<dl class="info-list" data-hours>
  ${ORARI.map((o) => `<div><dt>${o.etichetta}</dt><dd>${fasce(o)}</dd></div>`).join('')}
</dl>`;

/* ---- pagine ----------------------------------------------------------- */

/* ---- E-COMMERCE: schede prodotto, griglie, preventivo su WhatsApp -------- */
/** Le foto ritagliate strette sul prodotto (img/prodotto/): lo sfondo è alto
 *  quanto il pezzo. Per le foto ambientate resta la foto intera. */
const PRODOTTO = new Set(readdirSync(join(OUT, 'img/prodotto')).map((f) => f.replace(/\.webp$/, '')));
const prodImg = (f) => {
  const n = f.file.startsWith('studio/') ? f.file.slice(7) : f.file;
  return PRODOTTO.has(n) ? { ...f, file: `prodotto/${n}`, studio: true } : { ...f, studio: false };
};
const SALAH = NEGOZIO.telefoni.find((t) => t.nome === 'Salah') || NEGOZIO.telefoni[0];
/** Il messaggio per Salah: nome, colore e il link del prodotto. WhatsApp mostra
 *  da solo l'anteprima con la foto (og:image della scheda). */
const waPreventivo = (s) => waLink(`Ciao Salah! Vorrei un preventivo per: ${s.nome} (${s.colore.nome}), con la spedizione.\n${BASE_URL}salotti/${s.slug}/`);
const waArticolo = (nome, pagina) => waLink(`Ciao Salah! Vorrei informazioni e un preventivo per: ${nome}.\n${BASE_URL}${pagina}`);
// RIGA CATEGORIE in stile Apple Store: prodotti scontornati, una riga da scorrere
const CATEGORIE = [
  ['salotti', 'collezioni/', 'Salotti', (x) => !x.tipo],
  ['capitonne', 'collezioni/capitonne/', 'Capitonné', (x) => x.stile === 'capitonne'],
  ['chesterfield', 'collezioni/chesterfield/', 'Chesterfield', (x) => x.stile === 'chesterfield'],
  ['contemporanea', 'collezioni/contemporanea/', 'Contemporanei', (x) => x.stile === 'contemporanea'],
  ['sale-da-pranzo', 'collezioni/sale-da-pranzo/', 'Sale da pranzo', (x) => x.tipo === 'pranzo'],
  ['complementi', 'collezioni/complementi/', 'Complementi', (x) => x.tipo === 'complemento'],
  ['decorazioni', 'decorazioni/', 'Decorazioni', () => false],
  ['profumi', 'profumi/', 'Profumi', () => false],
];
function catRow(root, attivo) {
  return `<nav class="crow" aria-label="Categorie"><ul class="crow__list">${CATEGORIE.map(([k, h, n, f]) => {
    return `<li><a class="crow__item" href="${root}${h}"${k === attivo ? ' aria-current="page"' : ''}><span class="crow__img"><img src="${root}img/cat/${k}.webp" width="600" height="400" alt="" loading="lazy" decoding="async"></span><span class="crow__name">${n}</span></a></li>`;
  }).join('')}</ul></nav>`;
}


const categoriaDi = (s) => (s.tipo === 'pranzo' ? ['collezioni/sale-da-pranzo/', 'Sale da pranzo'] : s.tipo === 'complemento' ? ['collezioni/complementi/', 'Complementi'] : ['collezioni/', 'Salotti']);

/** Scheda prodotto della griglia: foto, etichetta, nome, colore, prezzo, «Chiedi preventivo». */
function pcard(p, root) {
  const media = `<img src="${root}img/${p.img.file}.webp" alt="${esc(p.img.alt || p.nome)}" loading="lazy" decoding="async">`;
  const cls = `pcard__media${p.img.studio ? '' : ' pcard__media--foto'}`;
  return `<article class="pcard" data-tags="${p.tags || ''}">
  ${p.href ? `<a class="${cls}" href="${p.href}" tabindex="-1" aria-hidden="true">${media}</a>` : `<div class="${cls}">${media}</div>`}
  <div class="pcard__body">
    ${p.badge ? `<p class="pcard__badge pcard__badge--${p.badgeTipo}">${p.badge}</p>` : ''}
    <h3 class="pcard__name">${p.href ? `<a href="${p.href}">${esc(p.nome)}</a>` : esc(p.nome)}</h3>
    <p class="pcard__meta">${p.meta}</p>
    <p class="pcard__price">${p.prezzo ? eur(p.prezzo) : 'Prezzo su richiesta'}</p>
    <a class="pcard__cta" href="${p.wa}" target="_blank" rel="noopener">${ICON_WA}<span>Chiedi preventivo</span></a>
  </div>
</article>`;
}
const setP = (s, root) => ({
  nome: s.nome, href: `${root}salotti/${s.slug}/`, img: prodImg(s.copertina || s.foto[0]),
  badge: s.stato === 'disponibile' ? 'Nuovo arrivo' : s.stato === 'ultimi' ? 'Ultimi pezzi' : '', badgeTipo: s.stato,
  meta: `<i class="swatch" style="background:${s.colore.hex}"></i>${esc(s.colore.nome)} · ${esc(s.tipo === 'pranzo' ? 'Sala da pranzo' : s.tipo === 'complemento' ? 'Complemento' : s.collezione)}`,
  tags: `${s.colore.id} ${s.stato || ''}`, wa: waPreventivo(s), prezzo: s.prezzo,
});
/** Gli articoli che non hanno una scheda propria (decorazioni, profumi, poltrone singole). */
const artP = (a, root, pagina) => ({
  nome: a.nome, img: prodImg({ file: a.file, alt: a.nome }), meta: esc(a.riga), tags: a.tag || '',
  wa: waArticolo(a.nome, pagina), prezzo: a.prezzo,
});
const ARTICOLI = {
  decorazioni: [
    { nome: 'Leopardo dorato', riga: 'Color oro, tempestato di strass', file: 'studio/leopardo' },
    { nome: 'Cavallo dorato', riga: 'Ceramica oro lucida e satinata', file: 'studio/cavallo' },
    { nome: 'Pesci dorati', riga: 'Ceramica oro lucida e satinata', file: 'studio/pesci' },
    { nome: 'Lampada da tavolo', riga: 'Cristalli e paralume ricamato', file: 'studio/lampada' },
    { nome: 'Vaso a foglia', riga: 'Oro, con il bouquet avorio', file: 'studio/vaso-foglia' },
    { nome: 'Vaso oro', riga: 'Scanalato, con il bouquet avorio', file: 'studio/vaso-oro' },
    { nome: 'Vaso bianco', riga: 'Rose cipria e rami dorati', file: 'studio/vaso-rose' },
  ],
  profumi: [
    { nome: 'Khamrah Qahwa', riga: 'Lattafa · eau de parfum 100 ml', file: 'studio/khamrah-qahwa' },
    { nome: 'Khamrah Waha', riga: 'Lattafa · eau de parfum 100 ml', file: 'studio/khamrah-waha' },
    { nome: 'Asad', riga: 'Lattafa · eau de parfum 100 ml', file: 'studio/asad' },
    { nome: 'Leen', riga: 'Lattafa Pride · eau de parfum 100 ml', file: 'studio/leen', prezzo: 30 },
    { nome: 'Safwaan', riga: 'Lattafa · L’Autre Oud 100 ml', file: 'studio/safwaan' },
    { nome: 'Mythical Gryphon', riga: 'French Avenue', file: 'studio/mythical-gryphon' },
    { nome: 'Cocoa Morado', riga: 'Flacone viola e oro', file: 'studio/cocoa-morado' },
    { nome: 'Gemini', riga: 'Genesis · flacone ottagonale', file: 'gemini' },
    { nome: 'Anfar Odyssée', riga: 'Extrait de parfum 100 ml', file: 'studio/anfar-odyssee' },
    { nome: 'Afnan 9am', riga: 'Pour femme · eau de parfum 100 ml', file: 'studio/afnan-9am' },
    { nome: 'Afnan 9pm', riga: 'Pour femme · eau de parfum 100 ml', file: 'studio/afnan-9pm' },
  ],
  complementi: [
    { nome: 'Tavolino ovale', riga: 'Piano effetto marmo, base color oro', file: 'studio/tavolino-ovale' },
    { nome: 'Chesterfield Nero', riga: 'Velluto nero, capitonné, base oro', file: 'studio/chesterfield-nero' },
    { nome: 'Bergère Blu', riga: 'Velluto blu, gambe color oro', file: 'studio/poltrona-blu' },
    { nome: 'Poltrona Tonda', riga: 'Girevole, velluto tortora', file: 'studio/poltrona-tonda' },
    { nome: 'Poltrona Nera', riga: 'Velluto nero, base girevole', file: 'poltrona-nera' },
  ],
};

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
<!-- HERO, alla maniera di Apple: il marchio, un titolo, due pillole e il
     salotto nuovo in scena sul nero caldo, con una luce calda dall'alto. -->
<section class="hero-logo" data-hero aria-labelledby="hero-titolo">
  <img class="hero-logo__mark" src="img/logo.webp" width="884" height="258" alt="Bazar Marrakech" fetchpriority="high">
  <p class="hero-logo__eyebrow">Nuovi arrivi · Disponibili ora</p>
  <h1 class="hero-logo__title" id="hero-titolo">Il tuo salotto ti aspetta.</h1>
  <p class="hero-logo__sub">Salotti, sale da pranzo e complementi in velluto e oro. Showroom a Lugo, consegne in tutta Italia.</p>
  <div class="pills hero-logo__pills"><a class="pill" href="#salotti">Vedi i disponibili</a><a class="pill pill--line" href="showroom/">Vieni in showroom</a></div>
  <div class="hero-logo__stage" data-hero-slides>
    <a class="hero-slide is-on" href="salotti/salotto-crema/" aria-label="Scopri il Salotto Crema"><img src="img/studio/salotto-crema-camino-png.webp" alt="Salotto Crema" fetchpriority="high" decoding="async"><span class="hero-slide__name">Salotto Crema</span></a>
    <a class="hero-slide" href="salotti/salotto-grigio/" aria-label="Scopri il Salotto Grigio"><img src="img/studio/salotto-grigio-png.webp" alt="Salotto Grigio" loading="lazy" decoding="async"><span class="hero-slide__name">Salotto Grigio</span></a>
    <a class="hero-slide" href="salotti/salotto-antracite/" aria-label="Scopri il Salotto Antracite"><img src="img/studio/salotto-antracite-png.webp" alt="Salotto Antracite" loading="lazy" decoding="async"><span class="hero-slide__name">Salotto Antracite</span></a>
    <a class="hero-slide" href="salotti/salotto-grafite/" aria-label="Scopri il Salotto Grafite"><img src="img/studio/salotto-grafite-png.webp" alt="Salotto Grafite" loading="lazy" decoding="async"><span class="hero-slide__name">Salotto Grafite</span></a>
    <a class="hero-slide" href="salotti/salotto-sabbia/" aria-label="Scopri il Salotto Sabbia"><img src="img/studio/salotto-sabbia-png.webp" alt="Salotto Sabbia" loading="lazy" decoding="async"><span class="hero-slide__name">Salotto Sabbia</span></a>
  </div>
</section>

<!-- Fascia sotto la hero -->
<p class="promo">Showroom a Lugo, consegne in tutta Italia. <a href="showroom/">Orari e indicazioni ›</a></p>

<section class="shop-sec shop-sec--cats" id="categorie" aria-labelledby="h-cat"><div class="wrap">
  <h2 class="shop-sec__title" id="h-cat">Acquista per categoria.</h2>
  ${catRow('', '')}
</div></section>

<section class="shop-sec" id="salotti" aria-labelledby="h-nuovi"><div class="wrap">
  <div class="shop-sec__head"><h2 class="shop-sec__title" id="h-nuovi">Nuovi arrivi. <span>Disponibili ora.</span></h2><a class="shop-sec__link" href="collezioni/">Tutti i salotti ›</a></div>
  <div class="pgrid">${SET.filter((s) => s.stato === 'disponibile').map((s) => pcard(setP(s, root), root)).join('')}</div>
</div></section>

<section class="shop-sec shop-sec--grey" aria-labelledby="h-ultimi"><div class="wrap">
  <div class="shop-sec__head"><h2 class="shop-sec__title" id="h-ultimi">Ultimi pezzi. <span>Fino a esaurimento.</span></h2></div>
  <div class="pgrid">${SET.filter((s) => s.stato === 'ultimi').map((s) => pcard(setP(s, root), root)).join('')}</div>
</div></section>

<section class="tile tile--dark tile--info" id="showroom">
  <div class="tile__copy">
    <p class="tile__name">Showroom · Lugo</p>
    <h2 class="tile__title">Vieni a vederli dal vivo.</h2>
    <p class="tile__sub">${esc(indirizzo)}</p>
    <p class="status" data-status data-open="true" hidden></p>
    <div class="pills"><a class="pill" href="${NEGOZIO.mappa}" target="_blank" rel="noopener">Indicazioni</a><a class="pill pill--line" href="${tel(SALAH.numero)}">Chiama ${SALAH.nome}</a></div>
  </div>
</section>`,
  }));
}


// COLLEZIONI + CATEGORIE: la griglia di un negozio, con i filtri a pillola
function catalogo({ root, path, title, h1, lead, lista, crumbs, nav, extra = [], pagina, filtri = true, cat = '' }) {
  const schede = [...lista.map((s) => setP(s, root)), ...extra.map((a) => artP(a, root, pagina || path))];
  const colori = [...new Map(lista.map((s) => [s.colore.id, s.colore])).values()];
  const stati = [['disponibile', 'Nuovi arrivi'], ['ultimi', 'Ultimi pezzi']].filter(([k]) => lista.some((s) => s.stato === k));
  const bar = filtri && (colori.length > 1 || stati.length) ? `
  <div class="pfilters" role="group" aria-label="Filtra">
    <button class="pfilter" type="button" aria-pressed="true" data-filter="">Tutti <span>${schede.length}</span></button>
    ${stati.map(([k, n]) => `<button class="pfilter" type="button" aria-pressed="false" data-filter="${k}">${n}</button>`).join('')}
    ${colori.length > 1 ? colori.map((c) => `<button class="pfilter" type="button" aria-pressed="false" data-filter="${c.id}"><i class="swatch" style="background:${c.hex}"></i>${c.nome}</button>`).join('') : ''}
  </div>` : '';
  return layout({
    path, root, title, nav, description: lead,
    body: `
<div class="wrap shop-page">
  <header class="shop-head">
    <ol class="crumbs">${crumbs}</ol>
    <h1 class="shop-head__title">${h1}</h1>
    <p class="shop-head__lead">${lead}</p>
  </header>
  ${catRow(root, cat)}
  ${bar}
  <div class="pgrid" data-catalog>${schede.map((p) => pcard(p, root)).join('')}</div>
  <p class="shop-note">Non trovi quello che cerchi? <a href="${waLink('Ciao Salah! Cerco un salotto: mi aiuti a scegliere?')}" target="_blank" rel="noopener">Scrivi a Salah su WhatsApp ›</a></p>
</div>`,
  });
}
page('collezioni/', catalogo({
  root: '../', path: 'collezioni/', nav: 'collezioni',
  title: 'Salotti — Divani e composizioni | Bazar Marrakech',
  h1: 'Salotti', lead: 'Divani, poltrone e composizioni complete. Prezzo e spedizione su richiesta: chiedi il preventivo a Salah su WhatsApp.',
  lista: SET.filter((s) => !s.tipo), cat: 'salotti', crumbs: '<li><a href="../">Home</a></li><li aria-current="page">Salotti</li>',
}));
for (const c of COLLEZIONI) {
  page(`collezioni/${c.stile}/`, catalogo({
    root: '../../', path: `collezioni/${c.stile}/`, nav: 'collezioni',
    title: c.pranzo ? 'Sale da pranzo — Tavoli e sedie | Bazar Marrakech' : c.complemento ? 'Complementi d’arredo | Bazar Marrakech' : `Collezione ${c.nome} — Salotti | Bazar Marrakech`,
    h1: c.pranzo ? 'Sale da pranzo' : c.complemento ? 'Complementi' : `Collezione ${c.nome}`,
    lead: c.pranzo ? 'Tavoli effetto marmo e sedie in velluto, con i dettagli color oro.' : c.complemento ? 'Mobili TV, tavolini e poltrone che completano il salotto.' : `I salotti della collezione ${c.nome}.`,
    lista: SET.filter((s) => s.stile === c.stile), cat: c.stile, extra: c.complemento ? ARTICOLI.complementi : [],
    crumbs: `<li><a href="../../">Home</a></li><li><a href="../">Salotti</a></li><li aria-current="page">${c.pranzo ? 'Sale da pranzo' : c.complemento ? 'Complementi' : c.nome}</li>`,
  }));
}
for (const [slug, h1, lead] of [['decorazioni', 'Decorazioni', 'Sculture, vasi e lampade color oro che danno carattere al salotto.'], ['profumi', 'Profumi', 'Fragranze arabe e orientali, da scoprire anche in showroom.']]) {
  page(`${slug}/`, catalogo({
    root: '../', path: `${slug}/`, nav: slug, title: `${h1} | Bazar Marrakech`, h1, lead,
    lista: [], extra: ARTICOLI[slug], filtri: false, cat: slug, crumbs: `<li><a href="../">Home</a></li><li aria-current="page">${h1}</li>`,
  }));
}

// PRODOTTI: la scheda di un e-commerce, con il preventivo su WhatsApp
for (const s of SET) {
  const root = '../../';
  const altri = [...SET.filter((x) => x.slug !== s.slug && x.tipo === s.tipo), ...SET.filter((x) => x.slug !== s.slug && x.tipo !== s.tipo)].slice(0, 4);
  const foto = s.foto.map(prodImg);
  const wa = waPreventivo(s);
  const [catHref, catNome] = categoriaDi(s);
  const badge = s.stato === 'disponibile' ? '<p class="pcard__badge pcard__badge--disponibile">Nuovo arrivo · Disponibile</p>' : s.stato === 'ultimi' ? '<p class="pcard__badge pcard__badge--ultimi">Ultimi pezzi</p>' : '';
  page(`salotti/${s.slug}/`, layout({
    path: `salotti/${s.slug}/`, root, nav: 'collezioni', image: `og/${s.slug}.jpg`, bodyClass: 'has-sticky-buy',
    title: `${s.nome} — ${catNome} | Bazar Marrakech`,
    description: `${s.nome}: ${s.breve} Prezzo e spedizione su richiesta.`,
    body: `
<div class="wrap">
  <nav class="pdp-crumbs" aria-label="Percorso"><ol class="crumbs"><li><a href="${root}">Home</a></li><li><a href="${root}${catHref}">${catNome}</a></li><li aria-current="page">${esc(s.nome)}</li></ol></nav>
  <div class="pdp2">
    <div class="gal">
      <div class="gal__main">
        <ul class="gal__track" data-viewer aria-label="Foto del ${esc(s.nome)}">${foto.map((f, i) => `<li class="${f.studio ? 'is-studio' : 'is-foto'}"><img src="${root}img/${f.file}.webp" alt="${esc(f.alt)}"${i ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"></li>`).join('')}</ul>
        ${foto.length > 1 ? `<button class="gal__arrow gal__arrow--prev" type="button" data-freccia="-1" aria-label="Foto precedente">‹</button><button class="gal__arrow gal__arrow--next" type="button" data-freccia="1" aria-label="Foto successiva">›</button><span class="gal__count" data-count>1 / ${foto.length}</span>` : ''}
      </div>
      ${foto.length > 1 ? `<div class="gal__thumbs">${foto.map((f, i) => `<button type="button" class="${f.studio ? 'is-studio' : 'is-foto'}" data-dot-foto="${i}" aria-current="${i === 0}" aria-label="Foto ${i + 1}"><img src="${root}img/${f.file}.webp" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>` : ''}
    </div>
    <div class="pinfo" data-pdp>
      ${badge}
      <h1 class="pinfo__name">${esc(s.nome)}</h1>
      <p class="pinfo__price">${s.prezzo ? eur(s.prezzo) : 'Prezzo su richiesta'}</p>
      <p class="pinfo__intro">${esc(s.breve)}</p>
      <p class="pinfo__color"><span>Colore</span><i class="swatch" style="background:${s.colore.hex}"></i>${esc(s.colore.nome)}</p>
      <div class="pinfo__cta" data-buy-main>
        <a class="btn-wa" href="${wa}" target="_blank" rel="noopener">${ICON_WA}<span>Chiedi preventivo</span></a>
        <a class="btn-sec" href="${tel(SALAH.numero)}">Chiama ${SALAH.nome} · ${SALAH.numero}</a>
        <p class="pinfo__hint">Si apre WhatsApp con il messaggio già pronto per ${SALAH.nome}: ti risponde con prezzo, disponibilità e costo della spedizione in tutta Italia.</p>
      </div>
      <details class="acc" open><summary>Composizione in foto</summary><div class="acc-body"><ul class="ticks">${s.composizioneFoto.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div></details>
      <details class="acc"><summary>Finiture</summary><div class="acc-body"><ul class="ticks">${s.finiture.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div></details>
      <details class="acc"><summary>Descrizione</summary><div class="acc-body">${s.descrizione.map((p) => `<p>${esc(p)}</p>`).join('')}</div></details>
      <details class="acc"><summary>Spedizione</summary><div class="acc-body">Consegniamo in tutta Italia. Il costo dipende dalla destinazione: chiedilo nel preventivo.</div></details>
      <details class="acc"><summary>Vedilo in showroom</summary><div class="acc-body">${esc(indirizzo)}. ${ORARI.map((o) => `${o.etichetta}: ${fasce(o)}`).join('. ')}. <a class="textlink" href="${NEGOZIO.mappa}" target="_blank" rel="noopener">Indicazioni</a></div></details>
    </div>
  </div>
</div>
<section class="shop-sec shop-sec--grey"><div class="wrap">
  <div class="shop-sec__head"><h2 class="shop-sec__title">Potrebbe piacerti anche.</h2><a class="shop-sec__link" href="${root}${catHref}">Vedi tutti ›</a></div>
  <div class="pgrid">${altri.map((x) => pcard(setP(x, root), root)).join('')}</div>
</div></section>
<div class="sticky-buy" data-sticky-buy aria-hidden="true">
  <div class="sticky-buy__info"><strong>${esc(s.nome)}</strong><span>${s.prezzo ? eur(s.prezzo) : 'Prezzo su richiesta'}</span></div>
  <a class="pill pill--wa" href="${wa}" target="_blank" rel="noopener" tabindex="-1">Chiedi preventivo</a>
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
    { id: 'barattoli-rose', nome: 'Barattoli Rose, set da 7', cat: 'barattoli', meta: 'Ceramica bianca e oro, con supporto', kg: 4.5, prezzo: null, foto: '../img/studio/barattoli-rose.webp', box: '../img/pacco/barattoli-rose-png.webp' },
    { id: 'barattoli-rosa', nome: 'Barattoli Zucca Rosa, set da 7', cat: 'barattoli', meta: 'Ceramica rosa e oro, con supporto', kg: 4.2, prezzo: null, foto: '../img/studio/barattoli-rosa.webp', box: '../img/pacco/barattoli-rosa-png.webp' },
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
        <button type="button" role="tab" aria-selected="false" data-cat="barattoli">Barattoli</button>
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
const vecchie = ['collezioni', 'salotti', 'borsa', 'decorazioni', 'profumi', 'showroom', 'contatti', ...LEGALI.map((l) => l.slug)];
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
