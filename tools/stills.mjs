// Cattura le coppie progetto/consegna per la sezione "Le Opere":
// stesso p (stessa camera), due stati del mondo (clay / materiali reali).
// Uso: node tools/stills.mjs   (richiede `npm start` attivo su :3000)

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

// Tenere allineato con OPERE in content/company.ts
const OPERE = [
  { id: 'esterno', p: 0.40 },
  { id: 'soggiorno', p: 0.494 },
  { id: 'bagno', p: 0.8 },
];

const OUT = new URL('../public/assets/opere/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const { id, p } of OPERE) {
  for (const [state, extra] of [['progetto', '&clay=1'], ['consegna', '']]) {
    await page.goto('about:blank');
    await page.goto(`http://localhost:3000/?p=${p}&still=1&ui=0${extra}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    await page.screenshot({
      path: `${OUT}${id}-${state}.jpg`,
      type: 'jpeg',
      quality: 82,
    });
    console.log(`${id}-${state}.jpg  p=${p}`);
  }
}

await browser.close();
