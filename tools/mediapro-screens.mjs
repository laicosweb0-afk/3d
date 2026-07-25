import { chromium } from 'playwright-core';

const outDir = process.argv[2] || '.';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  // in headless il WebGL passa da SwiftShader: senza questi flag il canvas resta nero
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));

await page.goto('http://localhost:8931/mediapro/', { waitUntil: 'networkidle' });
await page.mouse.move(760, 430);
// la scena 3D si monta dopo l'idratazione: va attesa
await page.waitForTimeout(4000);

const webgl = await page.evaluate(() => {
  const c = document.querySelector('.mp-canvas canvas');
  if (!c) return 'nessun canvas';
  return `canvas ${c.width}x${c.height}`;
});
console.log('scena 3D:', webgl);

// Lenis attenua la rotella: una wheel di N px non produce N px di scroll.
// Si insiste fino a raggiungere davvero la posizione voluta.
async function scrollTo(target) {
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y >= target - 12) break;
    await page.mouse.wheel(0, Math.min(600, (target - y) * 1.3 + 60));
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(1700);
  return page.evaluate(() => Math.round(window.scrollY));
}

// La sequenza dell'hero: 320vh totali, 220vh (1980px) di tratto bloccato.
const beats = [
  [0, '01-scena-sola'],
  [430, '02-marchio'],
  [760, '03-bagliore'],
  [1180, '04-titolo'],
  [1720, '05-completa'],
];
for (const [pos, name] of beats) {
  const y = await scrollTo(pos);
  console.log(`${name}: scroll ${y}px (progresso hero ${(y / 1980).toFixed(2)})`);
  await page.screenshot({ path: `${outDir}/${name}.png` });
}

for (const id of ['portfolio', 'servizi', 'risultati', 'metodo', 'contatti']) {
  await page.evaluate((i) => document.getElementById(i).scrollIntoView(), id);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${outDir}/s-${id}.png` });
}

await browser.close();
console.log('done');
