import { chromium } from 'playwright-core';
const out = process.argv[2] || '.';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
await p.goto('http://localhost:8931/mediapro/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/m1-hero.png` });
for (const [id, name] of [['portfolio','m2'],['servizi','m3'],['metodo','m4'],['contatti','m5']]) {
  await p.evaluate((i) => document.getElementById(i).scrollIntoView(), id);
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `${out}/${name}-${id}.png` });
}
// controllo overflow orizzontale
const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log('overflow orizzontale (px):', overflow);
await b.close();
