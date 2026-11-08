/* =========================================================================
   BAZAR MARRAKECH — «35 kg», la scatola sulla bilancia (PROTOTIPO)

   Il cliente riempie una scatola da 35 kg: ogni prodotto vola dentro, la
   bilancia sale e si assesta, il prezzo si aggiorna. Spedizione fissa 7 €.
   Prodotti, pesi e prezzi qui sotto sono DI ESEMPIO, tranne il set di
   bicchieri a 7 € della promozione: vanno sostituiti con quelli veri.
   ========================================================================= */
(() => {
  'use strict';
  const root = document.querySelector('[data-pacco]');
  if (!root) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MAX = 35;          // kg per scatola
  const SPEDIZIONE = 7;    // € a scatola
  const IMG = (n) => `../img/pacco/${n}.webp`;
  // [ESEMPIO] pesi e quantità da sostituire con quelli misurati in negozio
  const PRODOTTI = window.PACCO || [
    { id: 'set-rosso-oro', cat: 'bicchieri', nome: 'Set bicchieri Rosso e Oro', pezzi: 12, kg: 1.8, prezzo: 7, foto: IMG('set-rosso-oro') },
    { id: 'set-verde-oro', cat: 'bicchieri', nome: 'Set bicchieri Verde e Oro', pezzi: 12, kg: 1.8, prezzo: 7, foto: IMG('set-verde-oro') },
    { id: 'set-mosaico', cat: 'bicchieri', nome: 'Set bicchieri Mosaico', pezzi: 12, kg: 1.8, prezzo: 7, foto: IMG('set-mosaico') },
    { id: 'set-nero-greca', cat: 'bicchieri', nome: 'Set bicchieri Nero e Oro', pezzi: 12, kg: 1.8, prezzo: 7, foto: IMG('set-nero-greca') },
    { id: 'set-multicolore', cat: 'bicchieri', nome: 'Set bicchieri Multicolore', pezzi: 12, kg: 1.8, prezzo: 7, foto: IMG('set-multicolore') },
    { id: 'set-calligrafia', cat: 'bicchieri', nome: 'Set bicchieri Calligrafia', pezzi: 12, kg: 1.8, prezzo: 7, foto: IMG('set-calligrafia') },
    { id: 'set-fascia-oro', cat: 'bicchieri', nome: 'Set bicchieri Fascia Oro', pezzi: 12, kg: 1.8, prezzo: 7, foto: IMG('set-fascia-oro') },
    { id: 'teiera', cat: 'teiere', nome: 'Teiera', pezzi: 1, kg: 1.2, prezzo: null, foto: null },
    { id: 'posate', cat: 'posate', nome: 'Set posate', pezzi: 24, kg: 2.6, prezzo: null, foto: null },
  ];
  const byId = (id) => PRODOTTI.find((p) => p.id === id);
  const eur = (n) => '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const kgTxt = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* ---- la scatola, ricordata sul telefono ------------------------------ */
  const KEY = 'bm.pacco.prototipo';
  let scatola = {};
  try { scatola = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { scatola = {}; }
  const salva = () => { try { localStorage.setItem(KEY, JSON.stringify(scatola)); } catch { /* niente */ } };
  const peso = () => Object.entries(scatola).reduce((s, [id, q]) => s + byId(id).kg * q, 0);
  const prodottiEuro = () => Object.entries(scatola).reduce((s, [id, q]) => s + (byId(id).prezzo || 0) * q, 0);
  const pezzi = () => Object.values(scatola).reduce((s, q) => s + q, 0);

  /* ---- il display della bilancia: sale e si assesta -------------------- */
  const numeri = $$('[data-kg]');
  let mostrato = 0, anim = 0;
  function bilancia(da, a) {
    cancelAnimationFrame(anim);
    if (reduce) { numeri.forEach((n) => { n.textContent = kgTxt(a); }); mostrato = a; return; }
    const t0 = performance.now(), durata = 1100, salto = a - da;
    (function frame(t) {
      const x = Math.min(1, (t - t0) / durata);
      // come una bilancia vera: arriva un filo oltre e torna indietro
      const v = a - salto * Math.exp(-5.2 * x) * Math.cos(7.5 * x);
      mostrato = x === 1 ? a : v;
      numeri.forEach((n) => { n.textContent = kgTxt(Math.max(0, mostrato)); });
      if (x < 1) anim = requestAnimationFrame(frame);
    })(t0);
  }

  /* ---- disegno ---------------------------------------------------------- */
  const items = $('[data-items]'), box = $('[data-box]');
  function riempiScatola() {
    // dentro la scatola: una confezione per pezzo, impilate dal fondo;
    // più sono, più piccole, così si vede la scatola che si riempie
    const n = pezzi();
    items.style.setProperty('--w', n > 12 ? '17%' : n > 6 ? '22%' : '30%');
    items.innerHTML =Object.entries(scatola).flatMap(([id, q]) => Array.from({ length: q }, () => id))
      .map((id) => { const p = byId(id); return p.box ? `<img src="${p.box}" alt="" class="kg-studio">` : p.foto ? `<img src="${p.foto}" alt="">` : `<span class="kg-pezzo">${p.nome}</span>`; }).join('');
  }
  function aggiorna(precedente) {
    const kg = peso(), quota = kg / MAX;
    bilancia(precedente ?? mostrato, kg);
    root.style.setProperty('--quota', Math.min(1, quota).toFixed(4));
    root.dataset.stato = kg === 0 ? 'vuota' : quota >= 0.999 ? 'piena' : quota >= 0.8 ? 'quasi' : 'riempimento';
    $$('[data-sub]').forEach((e) => { e.textContent = eur(prodottiEuro()); });
    // con prodotti «su richiesta» nella scatola il totale è indicativo
    const daConfermare = Object.keys(scatola).some((id) => byId(id).prezzo == null);
    $$('[data-tot]').forEach((e) => { e.innerHTML = eur(prodottiEuro() + (kg ? SPEDIZIONE : 0)) + (daConfermare ? '<span class="tot-extra"> + su richiesta</span><span class="tot-plus"> +</span>' : ''); });
    $$('[data-pezzi]').forEach((e) => { e.textContent = pezzi(); });
    const resta = MAX - kg;
    const stato = $('[data-stato-testo]');
    stato.textContent = kg === 0 ? 'La scatola è vuota. Comincia dai bicchieri.'
      : quota >= 0.999 ? '35 kg. Perfetta.'
      : `Ti restano ${kgTxt(resta)} kg.`;
    // il consiglio «smart»: cosa entra ancora
    const entra = PRODOTTI.filter((p) => p.cat === 'bicchieri' && p.kg <= resta + 1e-9).sort((x, y) => y.kg - x.kg)[0];
    $('[data-hint]').textContent = kg > 0 && entra ? `Entrano ancora ${Math.floor((resta + 1e-9) / entra.kg)} set come il ${entra.nome.replace('Set bicchieri ', '')}.` : '';
    // schede: quantità e pulsanti
    $$('[data-prodotto]').forEach((c) => {
      const p = byId(c.dataset.prodotto), q = scatola[p.id] || 0;
      $('[data-q]', c).textContent = q;
      c.classList.toggle('is-in', q > 0);
      $('[data-piu]', c).disabled = p.kg > resta + 1e-9;
      $('[data-meno]', c).disabled = q === 0;
    });
    riempiScatola();
    elenco();
    salva();
  }

  /* ---- il prodotto vola nella scatola ---------------------------------- */
  function vola(da) {
    if (reduce || !da) return Promise.resolve();
    const a = da.getBoundingClientRect(), b = items.getBoundingClientRect();
    if (b.bottom < 0 || b.top > innerHeight) return Promise.resolve(); // scatola fuori vista: niente volo
    const c = da.cloneNode(); c.className = 'kg-volo';
    Object.assign(c.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    document.body.appendChild(c);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height * 0.55 - (a.top + a.height / 2);
    const s = Math.min(0.32, (b.width * 0.3) / a.width);
    return c.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 80}px) scale(${(1 + s) / 2})`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.2 },
    ], { duration: 720, easing: 'cubic-bezier(.45,.05,.25,1)' }).finished.then(() => c.remove());
  }

  function cambia(id, d, el) {
    const prima = peso(), p = byId(id);
    const q = Math.max(0, (scatola[id] || 0) + d);
    if (d > 0 && prima + p.kg > MAX + 1e-9) return;
    if (q) scatola[id] = q; else delete scatola[id];
    const finito = d > 0 ? vola(el) : Promise.resolve();
    finito.then(() => {
      aggiorna(prima);
      // la scatola affonda appena sulla bilancia
      if (!reduce && d > 0) box.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(4px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' });
      if (d > 0 && navigator.vibrate) navigator.vibrate(8);
    });
  }

  /* ---- elenco della scatola (foglio dal basso) + WhatsApp -------------- */
  const sheet = $('[data-sheet]');
  function elenco() {
    const righe = Object.entries(scatola);
    $('[data-elenco]').innerHTML = righe.length ? righe.map(([id, q]) => {
      const p = byId(id);
      return `<li><span>${q} × ${p.nome}</span><span>${kgTxt(p.kg * q)} kg</span><button type="button" data-togli="${id}" aria-label="Togli ${p.nome}">Togli</button></li>`;
    }).join('') : '<li class="vuoto">La scatola è vuota.</li>';
    $$('[data-togli]').forEach((b) => b.addEventListener('click', () => cambia(b.dataset.togli, -(scatola[b.dataset.togli] || 0))));
    const wa = root.dataset.wa || '';
    const testo = `Buongiorno! La mia scatola 35 kg:\n${righe.map(([id, q]) => `• ${q} × ${byId(id).nome}${byId(id).prezzo == null ? ' (prezzo su richiesta)' : ''}`).join('\n')}\nPeso: ${kgTxt(peso())} kg · Prodotti ${eur(prodottiEuro())} + spedizione ${eur(SPEDIZIONE)}`;
    $$('[data-wa]').forEach((a) => { a.href = `https://wa.me/${wa}?text=${encodeURIComponent(testo)}`; a.toggleAttribute('aria-disabled', !righe.length); });
  }
  const apri = () => { sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('is-open')); document.body.style.overflow = 'hidden'; };
  const chiudi = () => { sheet.classList.remove('is-open'); document.body.style.overflow = ''; setTimeout(() => { sheet.hidden = true; }, reduce ? 0 : 350); };
  $$('[data-apri-scatola]').forEach((b) => b.addEventListener('click', apri));
  $$('[data-chiudi-scatola]').forEach((b) => b.addEventListener('click', chiudi));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) chiudi(); });

  /* ---- prodotti e categorie -------------------------------------------- */
  $$('[data-prodotto]').forEach((c) => {
    const id = c.dataset.prodotto;
    $('[data-piu]', c).addEventListener('click', () => cambia(id, 1, $('img', c)));
    $('[data-meno]', c).addEventListener('click', () => cambia(id, -1));
  });
  $$('[data-cat]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-cat]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $$('[data-prodotto]').forEach((c) => { c.hidden = b.dataset.cat !== 'tutto' && byId(c.dataset.prodotto).cat !== b.dataset.cat; });
  }));
  $('[data-svuota]')?.addEventListener('click', () => { const prima = peso(); scatola = {}; aggiorna(prima); });

  /* ---- su iPhone: la bilancia diventa una barra in basso quando sparisce */
  // (su ogni schermo: quando la scatola esce di vista resta la barra in basso)
  const barra = $('[data-barra]');
  if (barra && $('[data-scena]') && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      const on = !e.isIntersecting && e.boundingClientRect.top < 0;
      barra.classList.toggle('is-on', on); barra.setAttribute('aria-hidden', String(!on));
    }, { threshold: 0.05 }).observe($('[data-scena]'));
  }

  aggiorna(peso());
})();
