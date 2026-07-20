import { chromium } from 'playwright-core';

const VH = [
  ['s01', 1.5], ['s02', 2.0], ['s03', 3.0], ['s04', 2.0], ['s05', 1.5],
  ['s06', 1.5], ['s07', 2.0], ['s08', 2.0], ['s09', 2.5], ['s10', 2.5],
  ['s11', 1.5], ['s12', 2.0],
];
const TOTAL = VH.reduce((a, [, v]) => a + v, 0);
const W = parseInt(process.env.WIDTH ?? '1440', 10);
const H = parseInt(process.env.HEIGHT ?? '900', 10);
const totalScroll = (TOTAL - 1) * H;

function pAt(id, t) {
  let acc = 0;
  for (const [sid, v] of VH) {
    if (sid === id) return ((acc + v * t) / TOTAL);
    acc += v;
  }
  throw new Error('scene ' + id);
}

const SHOTS = [
  ['01-hero', 0],
  ['02-cad', pAt('s02', 0.75)],
  ['03-costruzione-meta', pAt('s03', 0.55)],
  ['04-lama', pAt('s04', 0.5)],
  ['05-volo', pAt('s05', 0.55)],
  ['06-soglia', pAt('s06', 0.9)],
  ['07-soggiorno', pAt('s07', 0.55)],
  ['08-parete-aperta', pAt('s08', 0.45)],
  ['08b-attraversamento', pAt('s08', 0.88)],
  ['09-esploso', pAt('s09', 0.55)],
  ['10-bagno', pAt('s10', 0.6)],
  ['10b-accensione', pAt('s10', 0.95)],
  ['11-finestra', pAt('s11', 0.6)],
  ['12-ritorno', pAt('s12', 0.5)],
  ['13-fine', 1.02],
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

for (const [name, p] of SHOTS) {
  const targetY = Math.min(p * totalScroll, totalScroll + H);
  const currentY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.wheel(0, targetY - currentY);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${process.env.SHOTDIR}/${name}.png` });
  const y = await page.evaluate(() => window.scrollY);
  console.log(`${name}  p=${p.toFixed(3)} targetY=${Math.round(targetY)} actualY=${Math.round(y)}`);
}

console.log('PAGE ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
