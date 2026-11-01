/* =========================================================================
   BAZAR MARRAKECH — hero scroll-driven della home

   La porta si apre, la camera entra nello showroom e si posa su un salotto:
   è una sequenza di fotogrammi WebP disegnata su <canvas>, legata allo
   scroll con GSAP ScrollTrigger (pin + scrub). Lenis ammorbidisce la rotella
   sul computer; sul telefono lo scroll a dito resta quello nativo di Safari,
   che è il più fluido su iOS.

   Niente <video> mandato avanti e indietro: su iOS Safari scatta.
   Con «riduci movimento», o se qualcosa manca, resta l'immagine fissa
   (il poster) con titolo e sottotitolo: la pagina funziona comunque.
   ========================================================================= */
(() => {
  'use strict';
  const hero = document.querySelector('[data-hero]');
  const header = document.querySelector('[data-header]');
  if (!hero) return;

  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { gsap, ScrollTrigger, Lenis } = window;

  // Senza animazioni (o senza librerie): poster fisso, header scuro dopo la hero.
  if (fermo || !gsap || !ScrollTrigger) {
    if (header) {
      const io = new IntersectionObserver(([e]) => header.classList.toggle('is-solid', !e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' });
      io.observe(hero);
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  // Su iPhone la barra di Safari che entra ed esce non deve ricalcolare tutto.
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---- quale set di fotogrammi ----------------------------------------- */
  // Verticale per telefono e tablet in verticale, orizzontale per il resto.
  const orizzontale = matchMedia('(min-width: 768px) and (min-aspect-ratio: 1/1)').matches;
  const set = orizzontale ? 'desktop' : 'mobile';
  const N = parseInt(hero.dataset[orizzontale ? 'heroDesktop' : 'heroMobile'], 10) || 0;
  const nome = hero.dataset.heroNome || 'porta-showroom';
  if (!N) return;
  const url = (i) => `assets/hero/${set}/${nome}-${String(i + 1).padStart(4, '0')}.webp`;

  /* ---- canvas nitido sugli schermi Retina (fino a 2×) ------------------- */
  const canvas = hero.querySelector('.hero-seq__canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const stage = hero.querySelector('.hero-seq__stage');
  function dimensiona() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(stage.clientWidth * dpr);
    canvas.height = Math.round(stage.clientHeight * dpr);
    disegna(attuale, true);
  }

  /* ---- caricamento: subito i primi, il resto in sottofondo ------------- */
  const frames = new Array(N);
  const pronti = new Array(N).fill(false);
  function carica(i, priorita) {
    if (frames[i]) return frames[i];
    const img = new Image();
    img.decoding = 'async';
    if ('fetchPriority' in img) img.fetchPriority = priorita;
    img.onload = () => {
      pronti[i] = true;
      if (i === 0) hero.classList.add('is-ready');
      // se stavamo mostrando un fotogramma di ripiego, ora forse c'è quello giusto
      if (attuale !== bersaglio) disegna(bersaglio, true);
    };
    img.src = url(i);
    frames[i] = img;
    return img;
  }
  const PRIMI = Math.min(8, N);
  for (let i = 0; i < PRIMI; i++) carica(i, 'high');
  // Il resto a ondate, quando il browser è libero: non ruba banda al resto della pagina.
  let prossimo = PRIMI;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 120));
  (function ondata() {
    const fine = Math.min(prossimo + 12, N);
    for (; prossimo < fine; prossimo++) carica(prossimo, 'low');
    if (prossimo < N) idle(ondata, { timeout: 600 });
  })();

  /* ---- disegno: copre lo schermo come object-fit: cover ---------------- */
  let attuale = -1, bersaglio = 0;
  function vicinoPronto(i) {
    // Se lo scroll corre più del caricamento, mostra il fotogramma pronto più vicino.
    for (let d = 0; d < N; d++) {
      if (i - d >= 0 && pronti[i - d]) return i - d;
      if (i + d < N && pronti[i + d]) return i + d;
    }
    return -1;
  }
  function disegna(i, forza) {
    bersaglio = i;
    const k = vicinoPronto(i);
    if (k < 0 || (k === attuale && !forza)) return;
    const img = frames[k];
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    attuale = k;
  }

  /* ---- il racconto legato allo scroll ---------------------------------- */
  hero.classList.add('is-scrub');
  const copy = hero.querySelector('[data-hero-copy]');
  const hint = hero.querySelector('[data-hero-hint]');
  const stato = { f: 0 };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      // più lunga sul computer, dove la rotella percorre meno strada per scatto
      end: () => '+=' + Math.round(innerHeight * (orizzontale ? 3.2 : 2.6)),
      pin: stage,
      scrub: 0.8,             // un filo di inerzia: morbido, mai a scatti
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onLeave: () => header && header.classList.add('is-solid'),
      onEnterBack: () => header && header.classList.remove('is-solid'),
    },
  });
  // 0 → 0.78: i fotogrammi; poi la camera è ferma sul salotto ed entra il titolo.
  tl.to(stato, { f: N - 1, duration: 0.78, onUpdate: () => disegna(Math.round(stato.f)) }, 0)
    .fromTo(copy, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.16, ease: 'power2.out' }, 0.8)
    .to({}, { duration: 0.06 }); // un attimo di sosta sul titolo prima di lasciare la hero

  // «Scorri» sparisce appena si comincia.
  const nascondiHint = () => { if (scrollY > 8) { hint && hint.classList.add('is-hidden'); removeEventListener('scroll', nascondiHint); } };
  addEventListener('scroll', nascondiHint, { passive: true });

  /* ---- Lenis: solo la rotella, il dito resta nativo -------------------- */
  if (Lenis) {
    const lenis = new Lenis({ duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 3), smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // il menu mobile blocca lo scroll: Lenis si ferma con lui
    const menu = document.getElementById('mobile-nav');
    if (menu) new MutationObserver(() => (menu.classList.contains('is-open') ? lenis.stop() : lenis.start())).observe(menu, { attributes: true, attributeFilter: ['class'] });
  }

  dimensiona();
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(dimensiona, 150); });
})();
