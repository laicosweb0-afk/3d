/* =========================================================================
   BAZAR MARRAKECH — hero della home
   Solo due cose: l'header diventa nero caldo (e mostra il logo piccolo)
   quando la hero col marchio è passata, e «Scorri» sparisce al primo scroll.
   ========================================================================= */
(() => {
  'use strict';
  const hero = document.querySelector('[data-hero]');
  const header = document.querySelector('[data-header]');
  if (!hero || !header) return;
  const io = new IntersectionObserver(([e]) => header.classList.toggle('is-solid', !e.isIntersecting), { rootMargin: '-72px 0px 0px 0px' });
  io.observe(hero);
  const hint = hero.querySelector('.hero-logo__hint');
  const via = () => { if (scrollY > 8) { hint && hint.classList.add('is-hidden'); removeEventListener('scroll', via); } };
  addEventListener('scroll', via, { passive: true });
  // i salotti nuovi si alternano nell'apertura (fermi con «riduci movimento»)
  const slides = [...document.querySelectorAll('.hero-slide')];
  if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let i = 0;
    setInterval(() => { slides[i].classList.remove('is-on'); i = (i + 1) % slides.length; slides[i].classList.add('is-on'); }, 4000);
  }
})();
