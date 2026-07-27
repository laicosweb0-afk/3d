// UN FOTOGRAMMA QUALSIASI.
//
// Renderizza dal 3D un singolo fotogramma a un dato progresso, potendo forzare
// lo stato di avanzamento della costruzione. Serve perché il racconto e la curva
// di costruzione del 3D non coincidono: la camera di un confine va spesso
// abbinata a uno stato di cantiere diverso da quello che il 3D avrebbe lì.
//
// Uso:  node tools/frame.mjs <p> <nome> [bp]
//       node tools/frame.mjs 0.145833 s02-fine-fondazioni 0.10
//
// Esce in previz/giunzioni/<nome>.jpg

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [p, nome, bp] = process.argv.slice(2);
if (!p || !nome) {
  console.error('uso: node tools/frame.mjs <p> <nome> [bp]');
  process.exit(1);
}

const ORIGIN = process.env.ORIGIN ?? 'http://127.0.0.1:3000';
const W = parseInt(process.env.WIDTH ?? '1920', 10);
const H = parseInt(process.env.HEIGHT ?? '1080', 10);

const OUT = new URL('../previz/giunzioni/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const q = new URLSearchParams({ p: parseFloat(p).toFixed(6), still: '1', ui: '0' });
if (bp !== undefined) q.set('bp', parseFloat(bp).toFixed(4));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errori = [];
page.on('pageerror', (e) => errori.push(String(e)));

await page.goto(`${ORIGIN}/?${q}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}${nome}.jpg`, type: 'jpeg', quality: 92 });
await browser.close();

console.log(`previz/giunzioni/${nome}.jpg  p=${p}${bp !== undefined ? ` bp=${bp}` : ''}  ${W}x${H}`);
console.log('ERRORI DI PAGINA:', errori.length ? errori.join('\n') : 'nessuno');
