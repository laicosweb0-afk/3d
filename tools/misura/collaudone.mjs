// Il collaudone: l'intero sito, quattro formati, gesti veri.
// Caccia ai bug: errori console, sezioni che non compaiono, scroll che
// scatta, ancore che sbagliano bersaglio, vetrina che non risponde.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';

const FORMATI = [
  { nome: 'desktop', width: 1440, height: 900, dpr: 2, tocco: false },
  { nome: 'desktop-largo', width: 1920, height: 1080, dpr: 1, tocco: false },
  { nome: 'tablet', width: 820, height: 1180, dpr: 2, tocco: true },
  { nome: 'telefono', width: 390, height: 844, dpr: 3, tocco: true },
];

const TAPPE = [
  ['.bufala-ingresso', 'ingresso'],
  ['.bufala-apertura', 'apertura'],
  ['#banco', 'per chi'],
  ['#prodotti', 'vetrina'],
  ['#ordina', 'ordine'],
  ['#oggi', 'oggi al banco'],
  ['#dove', 'mappa'],
  ['.bufala-firma', 'firma'],
  ['.bufala-piede', 'piede'],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let difetti = 0;

for (const f of FORMATI) {
  const p = await b.newPage({
    viewport: { width: f.width, height: f.height },
    deviceScaleFactor: f.dpr,
    hasTouch: f.tocco,
  });
  const errori = [];
  p.on('console', (m) => { if (m.type() === 'error') errori.push(m.text().slice(0, 120)); });
  p.on('pageerror', (e) => errori.push('PAGEERROR ' + String(e).slice(0, 120)));

  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
  await p.waitForTimeout(2200);

  // 1 — le ancore delle tre porte
  const porte = [];
  for (const href of ['#ordina', '#banco', '#prodotti', '#dove', '#oggi']) {
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await p.waitForTimeout(350);
    await p.click(`.porta[href="${href}"], .oggi-pilla[href="${href}"]`);
    await p.waitForTimeout(800);
    const ok = await p.evaluate((h) => {
      const r = document.querySelector(h).getBoundingClientRect();
      return r.top > -window.innerHeight * 0.5 && r.top < window.innerHeight * 0.9;
    }, href);
    porte.push(`${href}:${ok ? '✓' : '✗'}`);
    if (!ok) difetti++;
  }

  // 2 — la traversata completa a rotella, con misura dei fotogrammi
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    window.__t = []; window.__p = performance.now(); window.__g = true;
    const s = () => { const o = performance.now(); window.__t.push(o - window.__p); window.__p = o; if (window.__g) requestAnimationFrame(s); };
    requestAnimationFrame(s);
  });
  const inizio = Date.now();
  let fermo = 0, ultimaY = -1;
  while (Date.now() - inizio < 45000) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: f.width / 2, y: f.height / 2, deltaX: 0, deltaY: 140, pointerType: 'mouse',
    });
    await new Promise((r) => setTimeout(r, 16));
    if (Date.now() % 500 < 20) {
      const y = await p.evaluate(() => Math.round(window.scrollY));
      const fine = await p.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4);
      if (fine) break;
      if (y === ultimaY) { if (++fermo > 6) break; } else fermo = 0;
      ultimaY = y;
    }
  }
  const r = await p.evaluate(() => {
    window.__g = false;
    const t = window.__t.slice(3).sort((a, b) => a - b);
    const q = (n) => t[Math.floor(t.length * n)];
    const arrivato = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
    const v = document.querySelector('video');
    const k = v?.getVideoPlaybackQuality?.();
    return { mediana: q(0.5), p90: q(0.9), peggiore: t[t.length - 1], n: t.length,
             lunghi: t.filter((x) => x > 50).length, arrivato, caduti: k?.droppedVideoFrames ?? 0 };
  });
  if (!r.arrivato) difetti++;

  // 3 — ogni tappa esiste ed è visibile arrivandoci
  const mancanti = [];
  for (const [sel, nome] of TAPPE) {
    const ok = await p.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const st = getComputedStyle(el);
      const rr = el.getBoundingClientRect();
      return st.display !== 'none' && st.visibility !== 'hidden' && rr.height > 10;
    }, sel);
    if (!ok) { mancanti.push(nome); difetti++; }
    await p.waitForTimeout(120);
  }

  // 4 — desktop: tastiera e trascinamento della vetrina col mouse
  let extra = '';
  if (!f.tocco) {
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await p.waitForTimeout(400);
    const y0 = await p.evaluate(() => window.scrollY);
    for (let i = 0; i < 4; i++) { await p.keyboard.press('PageDown'); await p.waitForTimeout(250); }
    const y1 = await p.evaluate(() => window.scrollY);
    const tastiera = y1 > y0 + 100;
    if (!tastiera) difetti++;

    await p.evaluate(() => document.querySelector('.bufala-vetrina').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await p.waitForTimeout(1400);
    const t0v = await p.evaluate(() => document.querySelector('.vetrina-video')?.currentTime ?? -1);
    const box = await p.evaluate(() => {
      const rr = document.querySelector('.bufala-vetrina').getBoundingClientRect();
      return { x: rr.x + rr.width / 2, y: rr.y + rr.height / 2 };
    });
    await p.mouse.move(box.x + 200, box.y);
    await p.mouse.down();
    for (let s = 0; s < 12; s++) { await p.mouse.move(box.x + 200 - s * 40, box.y); await p.waitForTimeout(14); }
    await p.mouse.up();
    await p.waitForTimeout(900);
    const t1v = await p.evaluate(() => document.querySelector('.vetrina-video')?.currentTime ?? -1);
    const vetrina = t1v > t0v + 0.2;
    if (!vetrina) difetti++;
    extra = `  tastiera ${tastiera ? '✓' : '✗'}  vetrina-drag ${vetrina ? '✓' : '✗'} (${t0v.toFixed(1)}→${t1v.toFixed(1)}s)`;
  }

  console.log(
    `${f.nome.padEnd(14)} fps ${(1000 / r.mediana).toFixed(0)} (p90 ${r.p90.toFixed(1)}ms, peggiore ${r.peggiore.toFixed(0)}ms, >50ms ${r.lunghi})  ` +
    `fondo ${r.arrivato ? '✓' : '✗ NON RAGGIUNTO'}  video persi ${r.caduti}  porte ${porte.join(' ')}` +
    (mancanti.length ? `  TAPPE MANCANTI: ${mancanti.join(', ')}` : '') +
    (errori.length ? `\n   ⚠ CONSOLE: ${[...new Set(errori)].slice(0, 3).join(' | ')}` : '') +
    extra,
  );
  if (errori.length) difetti++;
  await p.close();
}

await b.close();
console.log(difetti === 0 ? '\n✓ NESSUN DIFETTO su quattro formati' : `\n✗ ${difetti} DIFETTI da sistemare`);
