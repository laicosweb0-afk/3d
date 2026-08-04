// Il passaggio vivo alla prova: il colore del documento deve essere
// panna prima della fascia, salvia (mai grigio) a metà corsa, verde
// profondo quando la metà scura riempie lo schermo. Due strade da
// misurare: CSS scroll-driven, e il ripiego JavaScript — che si forza
// facendo mentire CSS.supports prima del caricamento.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let difetti = 0;
const esito = (nome, ok, dettaglio = '') => {
  console.log(`${ok ? '✓' : '✗'} ${nome}${dettaglio ? '  — ' + dettaglio : ''}`);
  if (!ok) difetti++;
};

const leggi = (p) => p.evaluate(() => {
  const el = document.querySelector('.bufala-documento');
  const m = getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number);
  return { r: m[0], g: m[1], b: m[2], classe: el.className };
});

for (const modo of ['css', 'js']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  if (modo === 'js') {
    await ctx.addInitScript(() => {
      const vero = CSS.supports.bind(CSS);
      CSS.supports = (...a) =>
        String(a[0]).includes('animation-timeline') ? false : vero(...a);
    });
  }
  const p = await ctx.newPage();
  const errori = [];
  p.on('console', (m) => { if (m.type() === 'error') errori.push(m.text().slice(0, 100)); });
  p.on('pageerror', (e) => errori.push(String(e).slice(0, 100)));
  await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);

  const attivo = (await leggi(p)).classe.includes(`--${modo}`);
  esito(`[${modo}] la strada giusta si è accesa`, attivo);

  // Le tre fermate: prima, a metà della corsa «cover», dopo.
  const vai = (dove) => p.evaluate((d) => {
    const f = document.querySelector('.bufala-passaggio');
    const vh = innerHeight;
    // Coordinate di PAGINA, non offsetTop: il contenitore del documento è
    // posizionato, quindi offsetTop risponderebbe a lui e non alla pagina.
    const r = f.getBoundingClientRect();
    const cima = r.top + scrollY;
    const h = r.height;
    const top =
      d === 'prima' ? cima - vh * 1.6 :
      d === 'meta' ? cima - (vh - (vh + h) * 0.5) :
      cima + h + vh * 0.5;
    window.scrollTo({ top, behavior: 'instant' });
  }, dove);

  await vai('prima'); await p.waitForTimeout(400);
  let c = await leggi(p);
  esito(`[${modo}] prima della fascia: panna`, c.r === 247 && c.g === 243 && c.b === 234,
    `rgb(${c.r} ${c.g} ${c.b})`);

  await vai('meta'); await p.waitForTimeout(400);
  c = await leggi(p);
  const verdeggia = c.g - (c.r + c.b) / 2;
  esito(`[${modo}] a metà corsa: salvia, non grigio`, verdeggia >= 12 && c.g > 100 && c.g < 210,
    `rgb(${c.r} ${c.g} ${c.b}), scarto verde +${verdeggia.toFixed(0)}`);

  await vai('dopo'); await p.waitForTimeout(400);
  c = await leggi(p);
  esito(`[${modo}] a schermo pieno scuro: verde profondo`, c.r === 17 && c.g === 40 && c.b === 29,
    `rgb(${c.r} ${c.g} ${c.b})`);

  esito(`[${modo}] zero errori console`, errori.length === 0, errori.join(' | '));
  await ctx.close();
}

console.log(difetti === 0 ? '\n✓ IL PASSAGGIO NON HA DIFETTI' : `\n✗ ${difetti} DIFETTI`);
await b.close();
process.exit(difetti === 0 ? 0 : 1);
