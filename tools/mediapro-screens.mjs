import { chromium } from 'playwright-core';

const outDir = process.argv[2] || '.';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));

await page.goto('http://localhost:8931/mediapro/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
await page.screenshot({ path: `${outDir}/01-hero.png` });

// metà della sequenza pinnata del hero
await page.mouse.wheel(0, 1600);
await page.waitForTimeout(1800);
await page.screenshot({ path: `${outDir}/02-hero-mid.png` });

// fine hero / ponte verso il portfolio
await page.mouse.wheel(0, 1400);
await page.waitForTimeout(1800);
await page.screenshot({ path: `${outDir}/03-bridge.png` });

// portfolio
await page.evaluate(() => document.getElementById('portfolio').scrollIntoView());
await page.waitForTimeout(2200);
await page.screenshot({ path: `${outDir}/04-portfolio.png` });

// portfolio, parte bassa della griglia
await page.mouse.wheel(0, 900);
await page.waitForTimeout(1600);
await page.screenshot({ path: `${outDir}/04b-portfolio-bottom.png` });

// servizi
await page.evaluate(() => document.getElementById('servizi').scrollIntoView());
await page.waitForTimeout(2600);
await page.screenshot({ path: `${outDir}/05-servizi.png` });

// risultati
await page.evaluate(() => document.getElementById('risultati').scrollIntoView());
await page.waitForTimeout(2400);
await page.screenshot({ path: `${outDir}/06-risultati.png` });

// metodo
await page.evaluate(() => document.getElementById('metodo').scrollIntoView());
await page.waitForTimeout(1200);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(1600);
await page.screenshot({ path: `${outDir}/07-metodo.png` });

// contatti
await page.evaluate(() => document.getElementById('contatti').scrollIntoView());
await page.waitForTimeout(2200);
await page.screenshot({ path: `${outDir}/08-contatti.png` });

await browser.close();
console.log('done');
