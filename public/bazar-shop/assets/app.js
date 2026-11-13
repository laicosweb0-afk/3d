/* =========================================================================
   BAZAR MARRAKECH — comportamento delle pagine
   Borsa (persistente sul dispositivo), richiesta d'ordine, galleria,
   comparsa dei contenuti, menu. Nessuna libreria.
   I dati arrivano da assets/catalogo.js (generato da tools/bazar-shop).
   ========================================================================= */
(() => {
  'use strict';
  const BM = window.BM;
  const ROOT = document.body.dataset.root || '';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const setDi = (slug) => BM.set.find((s) => s.slug === slug);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- archivio locale (può non esserci: navigazione privata) ---------- */
  const store = {
    get(area, k, d) { try { const v = window[area].getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(area, k, v) { try { window[area].setItem(k, JSON.stringify(v)); } catch { /* niente */ } },
    del(area, k) { try { window[area].removeItem(k); } catch { /* niente */ } },
  };

  /* ---- borsa ----------------------------------------------------------- */
  const KEY = 'bm.borsa.v2';
  const leggiBorsa = () => store.get('localStorage', KEY, []).filter((r) => setDi(r.slug) && r.q > 0);
  let borsa = leggiBorsa();
  const salva = () => { store.set('localStorage', KEY, borsa); aggiornaConteggio(); };
  const pezzi = () => borsa.reduce((n, r) => n + r.q, 0);
  const prezzoRiga = (r) => {
    const s = setDi(r.slug);
    const c = r.config && s.configurazioni.find((x) => x.nome === r.config);
    return c && c.prezzo != null ? c.prezzo : s.prezzo;
  };
  function aggiungi(slug, q, config) {
    const r = borsa.find((x) => x.slug === slug && (x.config || '') === (config || ''));
    if (r) r.q = Math.min(20, r.q + q); else borsa.push({ slug, q, config: config || '' });
    salva();
  }
  function aggiornaConteggio() {
    const n = pezzi();
    $$('[data-bag-count]').forEach((el) => { el.textContent = n ? String(n) : ''; });
    $$('[data-bag-link]').forEach((el) => el.setAttribute('aria-label', `Borsa, ${n} set`));
  }
  addEventListener('storage', (e) => { if (e.key === KEY) { borsa = leggiBorsa(); aggiornaConteggio(); if ($('[data-bag-root]')) vista('borsa'); } });
  aggiornaConteggio();

  /* ---- menu mobile ----------------------------------------------------- */
  const toggle = $('[data-menu]'), menu = $('#mobile-nav');
  if (toggle && menu) {
    const chiudi = () => { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Apri il menu'); document.body.style.overflow = ''; };
    toggle.addEventListener('click', () => {
      const aperto = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(aperto));
      toggle.setAttribute('aria-label', aperto ? 'Chiudi il menu' : 'Apri il menu');
      document.body.style.overflow = aperto ? 'hidden' : '';
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudi(); });
    matchMedia('(min-width: 761px)').addEventListener('change', chiudi);
  }

  /* ---- comparsa e immagini -------------------------------------------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  } else $$('.reveal').forEach((el) => el.classList.add('is-in'));

  /* ---- caroselli alla maniera di apple.com ---------------------------- */
  // Avanzano da soli ogni 5 secondi; si fermano al tocco o con il pulsante.
  // Con «riduci movimento» partono in pausa.
  $$('[data-carousel]').forEach((c) => {
    const track = $('[data-track]', c), cards = [...track.children], dots = $$('[data-dot]', c), play = $('[data-play]', c);
    let attiva = 0, timer = null;
    const passo = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth);
    const vai = (i) => { track.scrollTo({ left: i * passo(), behavior: reduce ? 'auto' : 'smooth' }); };
    const segna = (i) => { attiva = i; dots.forEach((d, j) => d.setAttribute('aria-selected', String(i === j))); };
    track.addEventListener('scroll', () => {
      const fine = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      segna(fine ? cards.length - 1 : Math.round(track.scrollLeft / passo()));
    }, { passive: true });
    const ferma = () => { clearInterval(timer); timer = null; play.setAttribute('aria-pressed', 'false'); play.setAttribute('aria-label', 'Riproduci'); };
    const avvia = () => {
      clearInterval(timer);
      timer = setInterval(() => vai((attiva + 1) % cards.length), 5000);
      play.setAttribute('aria-pressed', 'true'); play.setAttribute('aria-label', 'Metti in pausa');
    };
    play.addEventListener('click', () => (timer ? ferma() : avvia()));
    dots.forEach((d) => d.addEventListener('click', () => { ferma(); vai(+d.dataset.dot); }));
    ['pointerdown', 'wheel', 'touchstart'].forEach((ev) => track.addEventListener(ev, ferma, { passive: true }));
    // parte solo quando il carosello si vede
    if (reduce || !('IntersectionObserver' in window)) { ferma(); return; }
    let visto = false;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !visto) { visto = true; avvia(); }
      else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; visto = false; }
    }, { threshold: 0.4 }).observe(c);
  });

  /* ---- la novità «35 kg»: popup all'ingresso + pillola fissa ---------- */
  // Il popup compare una volta per visita (sessionStorage); dopo, la
  // pillola in basso resta su tutte le pagine per tornare alla novità.
  const pop = $('[data-promo]'), fab = $('[data-promo-fab]');
  if (pop && fab) {
    const VISTO = 'bm.promo.nuovi';
    let visto = false;
    try { visto = sessionStorage.getItem(VISTO) === '1'; } catch { /* niente */ }
    const mostraFab = () => fab.classList.add('is-on');
    let prima = null;
    const chiudi = () => {
      pop.classList.remove('is-open');
      document.body.style.overflow = '';
      try { sessionStorage.setItem(VISTO, '1'); } catch { /* niente */ }
      setTimeout(() => { pop.hidden = true; mostraFab(); }, reduce ? 0 : 350);
      if (prima) prima.focus({ preventScroll: true });
    };
    const apri = () => {
      prima = document.activeElement;
      pop.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => { pop.classList.add('is-open'); $('.pill', pop).focus({ preventScroll: true }); });
    };
    $$('[data-promo-chiudi]', pop).forEach((b) => b.addEventListener('click', chiudi));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) chiudi(); });
    // chi va alla novità dal popup non lo rivede in questa visita
    $$('a', pop).forEach((l) => l.addEventListener('click', () => { try { sessionStorage.setItem(VISTO, '1'); } catch { /* niente */ } if (l.hasAttribute('data-promo-chiudi-link')) chiudi(); }));
    if (visto) mostraFab();
    else setTimeout(apri, 900);
  }

  /* ---- aperto / chiuso (ora di Roma) ---------------------------------- */
  function statoNegozio() {
    let g, m;
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
      g = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday); m = +p.hour * 60 + +p.minute;
    } catch { const d = new Date(); g = d.getDay(); m = d.getHours() * 60 + d.getMinutes(); }
    const min = (s) => +s.slice(0, 2) * 60 + +s.slice(3);
    const oggi = BM.orari.find((o) => o.giorni.includes(g));
    const fascia = oggi && oggi.fasce.find(([a, b]) => m >= min(a) && m < min(b));
    if (fascia) return { aperto: true, testo: `Aperto ora · fino alle ${fascia[1]}` };
    const prossima = oggi && oggi.fasce.find(([a]) => m < min(a));
    return { aperto: false, testo: prossima ? `Chiuso ora · apre alle ${prossima[0]}` : 'Chiuso ora' };
  }
  $$('[data-status]').forEach((el) => { const s = statoNegozio(); el.textContent = s.testo; el.dataset.open = String(s.aperto); el.hidden = false; });

  /* ---- catalogo: filtri e ordinamento (solo se presenti) --------------- */
  const cat = $('[data-catalog]');
  if (cat && $('[data-catalog-tools]')) {
    const originale = $$('.set-card', cat);
    let colore = '', ordine = '';
    const applica = () => {
      let l = originale.filter((c) => !colore || c.dataset.colore === colore);
      if (ordine) l = [...l].sort((a, b) => { const pa = a.dataset.prezzo === '' ? Infinity : +a.dataset.prezzo, pb = b.dataset.prezzo === '' ? Infinity : +b.dataset.prezzo; return ordine === 'asc' ? pa - pb : (pb === Infinity ? -Infinity : pb) - (pa === Infinity ? -Infinity : pa); });
      originale.forEach((c) => { c.hidden = !l.includes(c); });
      l.forEach((c) => cat.appendChild(c));
    };
    $$('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      colore = b.dataset.filter; $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); applica();
    }));
    $('[data-sort]')?.addEventListener('change', (e) => { ordine = e.target.value; applica(); });
  }

  /* ---- pagina prodotto ------------------------------------------------- */
  const buy = $('[data-product]');
  if (buy) {
    const slug = buy.dataset.product;
    const out = $('[data-qty-value]', buy);
    let q = 1;
    $$('[data-qty]', buy).forEach((b) => b.addEventListener('click', () => { q = Math.max(1, Math.min(20, q + +b.dataset.qty)); out.textContent = q; }));
    const stato = $('[data-add-status]', buy);
    const add = () => {
      const config = $('input[name="config"]:checked', buy)?.value || '';
      aggiungi(slug, q, config);
      stato.innerHTML = `Aggiunto alla borsa. <a class="textlink" href="${ROOT}borsa/">Vai alla borsa</a>`;
    };
    $('[data-add]', buy).addEventListener('click', add);
    const sticky = $('[data-sticky-buy]');
    if (sticky) {
      $('[data-add-sticky]', sticky).addEventListener('click', () => { add(); stato.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
      const main = $('[data-buy-main]', buy);
      const io = new IntersectionObserver(([e]) => {
        const on = !e.isIntersecting && e.boundingClientRect.top < 0;
        sticky.classList.toggle('is-on', on);
        sticky.setAttribute('aria-hidden', String(!on));
        $('[data-add-sticky]', sticky).tabIndex = on ? 0 : -1;
      });
      io.observe(main);
    }
    /* visore delle foto: le pillole sotto scelgono la foto, il dito la scorre */
    const viewer = $('[data-viewer]'), chips = $$('[data-chip]');
    if (viewer && chips.length) {
      const items = [...viewer.children];
      const scegli = (i) => {
        chips.forEach((c, j) => c.setAttribute('aria-selected', String(i === j)));
        items.forEach((li, j) => li.setAttribute('aria-hidden', String(i !== j)));
        chips[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
      };
      chips.forEach((c) => c.addEventListener('click', () => {
        viewer.scrollTo({ left: +c.dataset.chip * viewer.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
      }));
      let t;
      viewer.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => scegli(Math.round(viewer.scrollLeft / viewer.clientWidth)), 80); }, { passive: true });
    }
    /* barra prodotto a pillola: compare quando il titolo esce dallo schermo */
    const bar = $('[data-prodbar]'), titoloProdotto = $('h1', buy);
    if (bar && titoloProdotto) {
      new IntersectionObserver(([e]) => {
        const on = !e.isIntersecting && e.boundingClientRect.top < 0;
        bar.classList.toggle('is-on', on);
        bar.setAttribute('aria-hidden', String(!on));
        $$('a', bar).forEach((a) => { a.tabIndex = on ? 0 : -1; });
      }).observe(titoloProdotto);
      $('[data-prodbar-buy]', bar).addEventListener('click', (e) => {
        e.preventDefault();
        $('#acquista').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      });
    }
  }

  /* ---- borsa e richiesta d'ordine ------------------------------------- */
  const bagRoot = $('[data-bag-root]');
  if (!bagRoot) return;
  const DATI = 'bm.dati';
  const steps = $$('[data-steps] li');
  const titolo = $('[data-bag-title]');
  const passo = (i) => steps.forEach((li, j) => { if (i === j) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });

  const righe = () => borsa.map((r) => { const s = setDi(r.slug); const p = prezzoRiga(r); return { ...r, s, unit: p, tot: p == null ? null : p * r.q }; });
  const totale = () => {
    const l = righe(); const noti = l.filter((r) => r.tot != null);
    return { somma: noti.reduce((n, r) => n + r.tot, 0), completo: noti.length === l.length, qualcuno: noti.length > 0 };
  };
  const totaleTxt = () => { const t = totale(); return t.completo ? eur(t.somma) : t.qualcuno ? `${eur(t.somma)} + prezzi su richiesta` : 'Da definire con il negozio'; };
  const prezzoTxt = (n) => (n == null ? 'Prezzo su richiesta' : eur(n));

  function riepilogoBox(extra = '') {
    return `<aside class="summary" aria-labelledby="sum-h">
      <h2 id="sum-h">Riepilogo</h2>
      <dl class="info-list">
        <div><dt>Set</dt><dd>${pezzi()}</dd></div>
        <div><dt>Consegna</dt><dd>Comunicata dal negozio</dd></div>
        <div class="total"><dt>Totale indicativo</dt><dd>${totaleTxt()}</dd></div>
      </dl>
      ${extra}
      <p class="small">Prezzo definitivo, disponibilità e consegna vengono confermati dal negozio. Nessun pagamento online.</p>
    </aside>`;
  }

  function vistaBorsa() {
    passo(0); titolo.textContent = 'La tua borsa';
    if (!borsa.length) {
      bagRoot.innerHTML = `<div class="empty"><p class="h2">La borsa è vuota.</p><p class="lead">Il tuo salotto ti aspetta.</p><a class="btn" href="${ROOT}collezioni/">Scopri le collezioni</a></div>`;
      return;
    }
    bagRoot.innerHTML = `<div class="bag">
      <div>
        <ul class="bag-items">${righe().map((r, i) => `
          <li class="bag-item">
            <a href="${ROOT}salotti/${r.slug}/"><img src="${ROOT}img/${r.s.foto.file}.webp" width="${r.s.foto.w}" height="${r.s.foto.h}" alt="${esc(r.s.foto.alt)}" loading="lazy"></a>
            <div>
              <h2><a href="${ROOT}salotti/${r.slug}/">${esc(r.s.nome)}</a></h2>
              <p class="meta">Collezione ${esc(r.s.collezione)}${r.config ? ` · ${esc(r.config)}` : ''}</p>
              <p class="meta">${esc(r.s.composizione.join(' · '))}</p>
              <div class="controls">
                <div class="qty" role="group" aria-label="Quantità di ${esc(r.s.nome)}"><button type="button" data-i="${i}" data-d="-1" aria-label="Diminuisci">−</button><output aria-live="polite">${r.q}</output><button type="button" data-i="${i}" data-d="1" aria-label="Aumenta">+</button></div>
                <button class="remove" type="button" data-rm="${i}">Rimuovi</button>
              </div>
            </div>
            <div class="amounts">
              <span class="price${r.tot == null ? ' price--req' : ''}">${prezzoTxt(r.tot)}</span>
              ${r.unit != null && r.q > 1 ? `<span class="small muted">${eur(r.unit)} cad.</span>` : ''}
            </div>
          </li>`).join('')}
        </ul>
        <p style="margin-top:var(--s-4)"><a class="link" href="${ROOT}collezioni/">Continua a guardare</a></p>
      </div>
      ${riepilogoBox(`<button class="btn btn--block" type="button" data-next>Procedi con la richiesta</button>`)}
    </div>`;
    $$('[data-d]', bagRoot).forEach((b) => b.addEventListener('click', () => { const r = borsa[+b.dataset.i]; r.q = Math.max(1, Math.min(20, r.q + +b.dataset.d)); salva(); vistaBorsa(); $(`[data-i="${b.dataset.i}"][data-d="${b.dataset.d}"]`, bagRoot)?.focus(); }));
    $$('[data-rm]', bagRoot).forEach((b) => b.addEventListener('click', () => { borsa.splice(+b.dataset.rm, 1); salva(); vistaBorsa(); titolo.focus(); }));
    $('[data-next]', bagRoot).addEventListener('click', () => vista('dati'));
  }

  const CAMPI = [
    { n: 'nome', l: 'Nome', a: 'given-name', req: true },
    { n: 'cognome', l: 'Cognome', a: 'family-name', req: true },
    { n: 'email', l: 'Email', a: 'email', t: 'email', req: true },
    { n: 'telefono', l: 'Telefono', a: 'tel', t: 'tel', req: true },
    { n: 'note', l: 'Note', hint: 'facoltative: misure, colori, piano, orari in cui chiamarti', wide: true, area: true },
  ];
  const valida = {
    nome: (v) => v.trim().length >= 2 || 'Inserisci il nome.',
    cognome: (v) => v.trim().length >= 2 || 'Inserisci il cognome.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Inserisci un indirizzo email valido.',
    telefono: (v) => v.replace(/\D/g, '').length >= 8 || 'Inserisci un numero di telefono valido.',
  };

  function vistaDati() {
    if (!borsa.length) return vista('borsa');
    passo(1); titolo.textContent = 'I tuoi dati';
    const d = store.get('sessionStorage', DATI, {});
    bagRoot.innerHTML = `<div class="bag">
      <form class="form" novalidate data-form>
        ${CAMPI.map((c) => `<div class="field${c.wide ? ' field--wide' : ''}">
          <label for="f-${c.n}">${c.l}${c.hint ? ` <span>(${c.hint})</span>` : ''}</label>
          ${c.area ? `<textarea id="f-${c.n}" name="${c.n}" maxlength="1500">${esc(d[c.n])}</textarea>` : `<input id="f-${c.n}" name="${c.n}" type="${c.t || 'text'}" autocomplete="${c.a}" value="${esc(d[c.n])}"${c.req ? ' required aria-required="true"' : ''} aria-describedby="e-${c.n}">`}
          ${c.req ? `<span class="error" id="e-${c.n}" aria-live="polite"></span>` : ''}
        </div>`).join('')}
        <label class="consent" data-consent><input type="checkbox" name="consenso" required${d.consenso ? ' checked' : ''}> <span>Ho letto l’<a class="textlink" href="${ROOT}privacy/" target="_blank">informativa privacy</a> e acconsento al trattamento dei miei dati per essere ricontattato su questa richiesta.</span></label>
        <div class="form-actions">
          <button class="btn" type="submit">Controlla la richiesta</button>
          <button class="remove" type="button" data-back>Torna alla borsa</button>
        </div>
      </form>
      ${riepilogoBox()}
    </div>`;
    const f = $('[data-form]', bagRoot);
    const salvaDati = () => store.set('sessionStorage', DATI, { ...Object.fromEntries(new FormData(f)), consenso: f.consenso.checked });
    f.addEventListener('input', salvaDati);
    $('[data-back]', f).addEventListener('click', () => vista('borsa'));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      let primo = null;
      for (const [n, fn] of Object.entries(valida)) {
        const el = f[n], r = fn(el.value), field = el.closest('.field');
        const msg = r === true ? '' : r;
        $(`#e-${n}`, f).textContent = msg;
        field.toggleAttribute('data-invalid', !!msg);
        el.setAttribute('aria-invalid', String(!!msg));
        if (msg && !primo) primo = el;
      }
      const cons = $('[data-consent]', f);
      cons.toggleAttribute('data-invalid', !f.consenso.checked);
      if (!f.consenso.checked && !primo) primo = f.consenso;
      if (primo) { primo.focus(); return; }
      salvaDati();
      vista('riepilogo');
    });
  }

  /** Codice BM-XXXX: casuale crittografico, 32 simboli senza ambigui (≈1 milione di combinazioni).
   *  L'unicità assoluta richiede un registro lato server: vedi BAZAR-SHOP.md. */
  function nuovoCodice() {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const usati = store.get('localStorage', 'bm.codici', []);
    let c;
    do { const b = new Uint8Array(4); crypto.getRandomValues(b); c = 'BM-' + [...b].map((x) => a[x % 32]).join(''); } while (usati.includes(c));
    store.set('localStorage', 'bm.codici', [...usati, c].slice(-50));
    return c;
  }

  function testoRichiesta(cod, d, quando) {
    const l = righe().map((r) => `• ${r.q} × ${r.s.nome}${r.config ? ` (${r.config})` : ''}\n   Composizione in foto: ${r.s.composizione.join(', ')}\n   Prezzo unitario: ${prezzoTxt(r.unit)} · Totale riga: ${prezzoTxt(r.tot)}`).join('\n');
    return `RICHIESTA D'ORDINE ${cod}\nRicevuta il ${quando}\n\nSALOTTI\n${l}\n\nTotale indicativo: ${totaleTxt()}\n\nCLIENTE\nNome: ${d.nome} ${d.cognome}\nEmail: ${d.email}\nTelefono: ${d.telefono}\n\nNOTE\n${d.note?.trim() || '—'}\n\nConsenso privacy: sì\nInviata dal sito Bazar Marrakech. Non è un ordine confermato: va verificata e confermata dal negozio.`;
  }

  function vistaRiepilogo() {
    const d = store.get('sessionStorage', DATI, null);
    if (!borsa.length) return vista('borsa');
    if (!d || !d.consenso) return vista('dati');
    passo(2); titolo.textContent = 'Controlla la richiesta';
    const attivo = !!BM.web3formsKey;
    bagRoot.innerHTML = `<div class="bag">
      <div class="review">
        <section>
          <h2>Salotti</h2>
          <ul class="bag-items" style="margin-top:var(--s-2)">${righe().map((r) => `
            <li class="bag-item">
              <img src="${ROOT}img/${r.s.foto.file}.webp" width="${r.s.foto.w}" height="${r.s.foto.h}" alt="" loading="lazy">
              <div><h3 class="h3" style="font-size:1.5rem">${esc(r.s.nome)}</h3><p class="meta">Quantità ${r.q}${r.config ? ` · ${esc(r.config)}` : ''}${r.unit != null ? ` · ${eur(r.unit)} cad.` : ''}</p><p class="meta">${esc(r.s.composizione.join(' · '))}</p></div>
              <div class="amounts"><span class="price${r.tot == null ? ' price--req' : ''}">${prezzoTxt(r.tot)}</span></div>
            </li>`).join('')}
          </ul>
        </section>
        <section>
          <h2>I tuoi dati</h2>
          <dl class="info-list" style="margin-top:var(--s-2)">
            <div><dt>Nome</dt><dd>${esc(d.nome)} ${esc(d.cognome)}</dd></div>
            <div><dt>Email</dt><dd>${esc(d.email)}</dd></div>
            <div><dt>Telefono</dt><dd>${esc(d.telefono)}</dd></div>
            <div><dt>Note</dt><dd>${esc(d.note?.trim() || '—')}</dd></div>
          </dl>
          <p style="margin-top:var(--s-3)"><button class="remove" type="button" data-edit>Modifica i dati</button></p>
        </section>
        <p class="notice">Questa è una <strong>richiesta d’ordine</strong>, non un acquisto: non comporta pagamenti né impegni. Il contratto di vendita si conclude solo dopo la conferma del negozio.</p>
        ${attivo ? '' : `<p class="notice">L’invio automatico non è ancora attivo. Premendo il pulsante si apre il tuo programma di posta con la richiesta già scritta, indirizzata a ${esc(BM.negozio.email)}: la richiesta parte quando premi Invia.</p>`}
        <p class="error" data-send-error role="alert" style="color:#9B3B2F"></p>
      </div>
      ${riepilogoBox(`<button class="btn btn--block" type="button" data-send>${attivo ? 'Invia la richiesta' : 'Invia via email'}</button>`)}
    </div>`;
    $('[data-edit]', bagRoot).addEventListener('click', () => vista('dati'));
    const btn = $('[data-send]', bagRoot);
    btn.addEventListener('click', async () => {
      const cod = nuovoCodice();
      const quando = new Date().toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Rome' });
      const testo = testoRichiesta(cod, d, quando);
      const oggetto = `Richiesta d'ordine ${cod} — ${d.nome} ${d.cognome}`;
      if (!attivo) {
        location.href = `mailto:${BM.negozio.email}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo)}`;
        return vistaFinale({ cod, d, quando, testo, inviata: false });
      }
      btn.disabled = true; btn.textContent = 'Invio in corso…';
      try {
        const r = await fetch('https://api.web3forms.com/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: BM.web3formsKey, subject: oggetto, from_name: 'Sito Bazar Marrakech', name: `${d.nome} ${d.cognome}`, email: d.email, telefono: d.telefono, codice: cod, message: testo, botcheck: '' }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.success) throw new Error(j.message || 'invio non riuscito');
        borsa = []; salva(); store.del('sessionStorage', DATI);
        vistaFinale({ cod, d, quando, testo, inviata: true });
      } catch {
        btn.disabled = false; btn.textContent = 'Riprova';
        $('[data-send-error]', bagRoot).innerHTML = `Non siamo riusciti a inviare la richiesta. Riprova, oppure <a class="textlink" href="mailto:${BM.negozio.email}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo)}">inviala via email</a> o chiamaci al ${esc(BM.negozio.telefoni[0].numero)}.`;
      }
    });
  }

  function vistaFinale({ cod, d, quando, testo, inviata }) {
    $('[data-steps]').hidden = true;
    titolo.textContent = inviata ? 'Richiesta ricevuta' : 'Completa l’invio';
    const mail = `mailto:${BM.negozio.email}?subject=${encodeURIComponent(`Richiesta d'ordine ${cod}`)}&body=${encodeURIComponent(testo)}`;
    bagRoot.innerHTML = `<div class="done">
      ${inviata ? `
        <p class="h2">Abbiamo ricevuto la tua richiesta.</p>
        <span class="code">${cod}</span>
        <div class="prose muted"><p>Il nostro team verificherà i dettagli dell’ordine e ti contatterà per confermare disponibilità, prezzo definitivo e modalità di consegna.</p><p>Grazie per aver scelto Bazar Marrakech.</p></div>
        <p class="small muted" style="margin-top:var(--s-3)">Inviata il ${esc(quando)}. Conserva il codice: ti servirà se ci contatti.</p>`
      : `
        <p class="h2">Manca un ultimo passaggio.</p>
        <span class="code">${cod}</span>
        <div class="prose muted"><p>Si è aperto il tuo programma di posta con la richiesta già compilata. La riceviamo quando premi <strong>Invia</strong>.</p><p>Se non si è aperto, <a class="textlink" href="${mail}">riprova</a> oppure chiamaci al ${esc(BM.negozio.telefoni[0].numero)} indicando il codice.</p></div>`}
      <div class="actions">
        <button class="btn btn--line" type="button" onclick="print()">Salva una copia</button>
        ${BM.whatsapp ? `<a class="btn btn--line" href="https://wa.me/${BM.whatsapp}?text=${encodeURIComponent(testo)}" target="_blank" rel="noopener">Invia anche su WhatsApp</a>` : ''}
        <a class="btn" href="${ROOT}">Torna alla home</a>
      </div>
    </div>`;
    scrollTo(0, 0); titolo.focus();
  }

  titolo.tabIndex = -1;
  function vista(v) {
    $('[data-steps]').hidden = false;
    ({ borsa: vistaBorsa, dati: vistaDati, riepilogo: vistaRiepilogo })[v]();
    if (location.hash.slice(1) !== v) history.replaceState(null, '', v === 'borsa' ? location.pathname : '#' + v);
    if (v !== 'borsa') { scrollTo(0, 0); titolo.focus({ preventScroll: true }); }
  }
  vista(['dati', 'riepilogo'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'borsa');
})();
