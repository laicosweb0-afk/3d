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
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEGOZIO, ORARI, SET, LEGALI, WEB3FORMS_KEY, WHATSAPP } from './dati.mjs';

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
];

const COLLEZIONI = [...new Map(SET.map((s) => [s.stile, { stile: s.stile, nome: s.collezione }])).values()];

const img = (root, f, { cls = '', eager = false, sizes = '' } = {}) =>
  `<img src="${root}img/${f.file}.webp" width="${f.w}" height="${f.h}" alt="${esc(f.alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}${cls ? ` class="${cls}"` : ''}${sizes}>`;

const ICON_BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5.5 8.5h13l-1 12h-11z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/></svg>';
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
function layout({ path, title, description, body, root, nav = '', image = 'salotto-completo', jsonLd = null, noindex = false, bodyClass = '' }) {
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
<link rel="preload" href="${root}fonts/cormorant-garamond-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ''}<script>document.documentElement.classList.remove('no-js')</script>
</head>
<body data-root="${root}"${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#main">Vai al contenuto</a>
<header class="header">
  <div class="wrap">
    <a class="brand" href="${root}" aria-label="Bazar Marrakech, home"><img src="${root}img/logo.webp" alt="Bazar Marrakech" width="884" height="258"></a>
    <nav class="nav" aria-label="Principale">
      ${navLink('collezioni/', 'Collezioni', 'collezioni')}
      ${navLink('showroom/', 'Showroom', 'showroom')}
      ${navLink('contatti/', 'Contatti', 'contatti')}
    </nav>
    <a class="bag-link" href="${root}borsa/" aria-label="Borsa, 0 set" data-bag-link>${ICON_BAG}<span class="bag-word">Borsa</span><span class="bag-count" data-bag-count aria-hidden="true"></span></a>
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
<script src="${root}assets/catalogo.js"></script>
<script src="${root}assets/app.js" defer></script>
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

const setCard = (s, root, { heading = 'h3' } = {}) => `
  <article class="set-card reveal">
    <a class="set-card__media" href="${root}salotti/${s.slug}/" tabindex="-1" aria-hidden="true">${img(root, s.copertina || s.foto[0])}</a>
    <div class="set-card__body">
      <span class="eyebrow">Collezione ${esc(s.collezione)}</span>
      <div class="set-card__title"><${heading} class="h3"><a href="${root}salotti/${s.slug}/">${esc(s.nome)}</a></${heading}>${prezzo(s.prezzo)}</div>
      <p>${esc(s.breve)}</p>
      <a class="link" href="${root}salotti/${s.slug}/" aria-label="Scopri il ${esc(s.nome)}">Scopri il salotto</a>
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
    path: '', root,
    title: 'Bazar Marrakech — Salotti in velluto e oro · Showroom a Lugo',
    description: 'Salotti completi in velluto, capitonné e dettagli in oro. Scegli la tua composizione online o nello showroom di Lugo (RA). Consegne in tutta Italia.',
    jsonLd: jsonLdNegozio(root),
    body: `
<script>(function(){var h=location.hash,m=h.match(/^#\\/(p|negozio|borsa|showroom)(?:\\/([\\w-]+))?/);if(!m)return;var t={borsa:'borsa/',showroom:'showroom/',negozio:'collezioni/'}[m[1]];if(m[1]==='p')t=/^salotto-(tortora|beige)$/.test(m[2])?'salotti/'+m[2]+'/':'collezioni/';location.replace(t)})()</script>
<section class="hero">
  <div class="wrap">
    <div class="hero__content">
      <h1 class="hero__title">Il tuo salotto ti aspetta.</h1>
      <p class="hero__lead">Comfort, carattere e dettagli che trasformano ogni ambiente.</p>
      <a class="hero__cta" href="collezioni/">Scopri la collezione</a>
    </div>
    <figure class="hero-figure">
      ${img(root, tortora.foto.find((f) => f.file === 'salotto-completo'), { eager: true })}
      <figcaption class="caption">${esc(tortora.nome)} — collezione ${esc(tortora.collezione)}</figcaption>
    </figure>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <div class="split__media split__media--portrait reveal">${img(root, tortora.foto.find((f) => f.file === 'divano-ambientato'))}</div>
    <div class="split__text reveal">
      <span class="eyebrow">Bazar Marrakech</span>
      <h2 class="h2">Il piacere di sentirsi a casa.</h2>
      <div class="prose muted">
        <p>Il salotto è il posto in cui si torna ogni sera. Per questo va scelto con calma: la forma che accoglie, il colore che accompagna la luce, il velluto sotto la mano.</p>
        <p>Nello showroom di Lugo puoi vedere da vicino ogni composizione, sederti e decidere insieme a noi.</p>
      </div>
      <div class="actions"><a class="link" href="showroom/">Scopri lo showroom</a></div>
    </div>
  </div>
</section>

<section class="section section--ink">
  <div class="wrap split split--rev">
    <div class="split__media stage-dark reveal"><img src="img/studio/divano-blu-png.webp" width="1216" height="654" alt="Divano chesterfield in velluto blu con gambe color oro, dalla nuova collezione" loading="lazy" decoding="async"></div>
    <div class="split__text reveal">
      <span class="eyebrow">Nuova collezione</span>
      <h2 class="h2">Profondo come la notte.</h2>
      <p class="lead">Una nuova interpretazione dell’eleganza, tra carattere e raffinatezza.</p>
      <div class="actions"><a class="btn btn--line" href="contatti/">Chiedi informazioni</a></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="head-row reveal">
      <div><span class="eyebrow">Le collezioni</span><h2 class="h2" style="margin-top:var(--s-2)">Salotti completi, pensati come un insieme.</h2></div>
      <a class="link" href="collezioni/">Tutte le collezioni</a>
    </div>
    <div class="sets">${SET.map((s) => setCard(s, root)).join('')}</div>
  </div>
</section>

<section class="section section--beige">
  <div class="wrap">
    <div class="head-row reveal"><div><span class="eyebrow">I materiali</span><h2 class="h2" style="margin-top:var(--s-2)">Velluto. Capitonné. Oro.</h2></div></div>
    <div class="materials">
      <figure class="material reveal"><img src="img/velluto-dettaglio.webp" width="720" height="900" alt="Il velluto tortora da vicino, con il profilo color oro" loading="lazy" decoding="async"><figcaption><h3>Velluto</h3><p>Morbido sotto la mano, profondo alla luce.</p></figcaption></figure>
      <figure class="material reveal"><img src="img/studio/poltrona-tonda.webp" width="1600" height="2000" alt="La lavorazione capitonné di una poltrona tonda" loading="lazy" decoding="async"><figcaption><h3>Capitonné</h3><p>Ogni bottone disegna la forma.</p></figcaption></figure>
      <figure class="material reveal"><img src="img/tavolini-oro.webp" width="490" height="612" alt="Le strutture color oro dei tavolini nesting" loading="lazy" decoding="async"><figcaption><h3>Oro</h3><p>Un filo sottile che segue ogni curva.</p></figcaption></figure>
    </div>
  </div>
</section>

<section class="section section--ink">
  <div class="wrap showroom-band">
    <div class="showroom-band__head reveal">
      <span class="eyebrow">Showroom · Lugo</span>
      <h2 class="h2">Il tuo prossimo salotto ti aspetta.</h2>
      <p class="lead">Scopri le collezioni Bazar Marrakech anche nel nostro showroom.</p>
      <div class="actions" style="margin-top:var(--s-4)"><a class="btn btn--light" href="showroom/">Scopri lo showroom</a></div>
    </div>
    <div class="showroom-band__info reveal">
      <p class="status" data-status data-open="true" hidden></p>
      <dl class="info-list" style="margin-top:var(--s-2)">
        <div><dt>Indirizzo</dt><dd>${esc(indirizzo)}</dd></div>
        ${ORARI.map((o) => `<div><dt>${o.etichetta}</dt><dd>${fasce(o)}</dd></div>`).join('')}
      </dl>
    </div>
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
  h1: 'Collezioni', lead: 'Salotti completi in velluto, capitonné e dettagli in oro: ogni composizione pensata come un insieme.',
  lista: SET, crumbs: '<li><a href="../">Home</a></li><li aria-current="page">Collezioni</li>',
}));
for (const c of COLLEZIONI) {
  page(`collezioni/${c.stile}/`, catalogo({
    root: '../../', path: `collezioni/${c.stile}/`, nav: 'collezioni',
    title: `Collezione ${c.nome} — Salotti | Bazar Marrakech`,
    h1: `Collezione ${c.nome}`, lead: `I salotti della collezione ${c.nome}.`,
    lista: SET.filter((s) => s.stile === c.stile),
    crumbs: `<li><a href="../../">Home</a></li><li><a href="../">Collezioni</a></li><li aria-current="page">${c.nome}</li>`,
  }));
}

// PRODOTTI
for (const s of SET) {
  const root = '../../';
  const altri = SET.filter((x) => x.slug !== s.slug);
  const dettaglio = s.foto.find((f) => f.file === 'velluto-dettaglio') || s.foto[s.foto.length - 1];
  // Desktop: le foto orizzontali a tutta larghezza, le verticali a coppie;
  // una verticale rimasta sola va a tutta larghezza (ritaglio 4:3).
  const classi = [];
  for (let i = 0, sole = []; i < s.foto.length; i++) {
    const f = s.foto[i];
    if (i === 0 || f.w > f.h) { classi[i] = 'wide'; continue; }
    sole.push(i);
    const prossimaVerticale = s.foto.slice(i + 1).some((x) => x.h >= x.w);
    if (sole.length === 2) { classi[sole[0]] = classi[sole[1]] = ''; sole = []; }
    else if (!prossimaVerticale) { classi[i] = 'wide'; sole = []; }
  }
  const galleria = s.foto.map((f, i) => `<li class="${i === 0 ? '' : classi[i] || ''}">${img(root, f, { eager: i === 0 })}</li>`).join('');
  page(`salotti/${s.slug}/`, layout({
    path: `salotti/${s.slug}/`, root, nav: 'collezioni', image: s.foto[0].file, bodyClass: 'has-sticky-buy',
    title: `${s.nome} — Collezione ${s.collezione} | Bazar Marrakech`,
    description: `${s.nome}: ${s.breve} Richiedi il salotto online o vedilo nello showroom di Lugo.`,
    body: `
<div class="wrap">
  <nav class="page-head" style="padding-bottom:var(--s-4)" aria-label="Percorso">
    <ol class="crumbs"><li><a href="${root}">Home</a></li><li><a href="${root}collezioni/">Collezioni</a></li><li><a href="${root}collezioni/${s.stile}/">${esc(s.collezione)}</a></li><li aria-current="page">${esc(s.nome)}</li></ol>
  </nav>
  <div class="pdp">
    <div>
      <ul class="gallery" data-gallery aria-label="Foto del ${esc(s.nome)}">${galleria}</ul>
      ${s.foto.length > 1 ? `<p class="gallery-count" data-gallery-count aria-hidden="true">1 / ${s.foto.length}</p>` : ''}
    </div>
    <div class="buy" data-product="${s.slug}">
      <span class="eyebrow">Collezione ${esc(s.collezione)}</span>
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
      <div class="buy__block" data-buy-main>
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
    <div class="head-row reveal"><h2 class="h2">Altri salotti</h2><a class="link" href="${root}collezioni/">Tutte le collezioni</a></div>
    <div class="sets">${altri.map((x) => setCard(x, root)).join('')}</div>
  </div>
</section>` : ''}

<div class="sticky-buy" data-sticky-buy aria-hidden="true">
  <span class="sticky-buy__name">${esc(s.nome)}</span>
  <button class="btn" type="button" data-add-sticky tabindex="-1">Aggiungi alla borsa</button>
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
      ${REPARTI.map((r) => `<figure class="reparto reveal"><img src="../img/${r.foto}.webp" width="700" height="875" alt="${esc(r.alt)}" loading="lazy" decoding="async"><figcaption><h3>${r.nome}</h3><p>${r.riga}</p></figcaption></figure>`).join('')}
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
