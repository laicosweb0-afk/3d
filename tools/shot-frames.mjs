// I FOTOGRAMMI DI GIUNZIONE.
//
// Estrae dal 3D il fotogramma esatto in cui ogni ciak finisce e il successivo
// comincia. Sono le immagini da passare ai modelli come `end_image` della clip
// che chiude e `start_image` di quella che apre: le due clip si saldano sullo
// stesso fotogramma e il piano sequenza sopravvive all'essere spezzato in
// dodici pezzi generati separatamente.
//
// Uso:  node tools/shot-frames.mjs        (richiede il sito servito su :3000)
//       WIDTH=1920 HEIGHT=1080 node tools/shot-frames.mjs
//
// Esce in previz/giunzioni/, fuori da public/: sono materiale di lavorazione
// per la generazione, non asset che il sito deve spedire al visitatore.

import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';

const ORIGIN = process.env.ORIGIN ?? 'http://127.0.0.1:3000';
// 16:9 perché è il formato in cui generiamo: il fotogramma di riferimento deve
// avere già l'inquadratura finale, non una da ritagliare dopo.
const W = parseInt(process.env.WIDTH ?? '1920', 10);
const H = parseInt(process.env.HEIGHT ?? '1080', 10);

// La tabella delle scene si legge da lib/scenes.ts invece di ricopiarla qui.
// Una seconda copia prima o poi diverge da quella vera senza che nessuno se ne
// accorga, e i fotogrammi di giunzione finirebbero nel punto sbagliato.
const sorgente = new URL('../lib/scenes.ts', import.meta.url);
const scene = [...readFileSync(sorgente, 'utf8').matchAll(/\{\s*id:\s*'(s\d+)',\s*vh:\s*([\d.]+)/g)]
  .map(([, id, vh]) => ({ id, vh: parseFloat(vh) }));

if (scene.length !== 12) {
  throw new Error(
    `lette ${scene.length} scene da lib/scenes.ts, ne servono 12 — ` +
      'la tabella SCENES è cambiata di forma e va riletto il modo di estrarla'
  );
}

const TOTALE_VH = scene.reduce((somma, s) => somma + s.vh, 0);

// Il p globale alla fine di ogni scena. Il primo punto è l'inizio del viaggio.
const giunzioni = [{ id: 'inizio', p: 0 }];
{
  let acc = 0;
  for (const s of scene) {
    acc += s.vh;
    giunzioni.push({ id: `${s.id}-fine`, p: acc / TOTALE_VH });
  }
}

const OUT = new URL('../previz/giunzioni/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errori = [];
page.on('pageerror', (e) => errori.push(String(e)));

for (const { id, p } of giunzioni) {
  // about:blank fra un fotogramma e l'altro: ogni scatto riparte da un canvas
  // pulito, senza stati residui della posa precedente.
  await page.goto('about:blank');
  await page.goto(`${ORIGIN}/?p=${p.toFixed(6)}&still=1&ui=0`, { waitUntil: 'networkidle' });
  // Il tempo che servono le ombre morbide e l'environment ad assestarsi.
  await page.waitForTimeout(3500);
  const file = `${OUT}${id}.jpg`;
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
  console.log(`${id.padEnd(12)} p=${p.toFixed(4)}  ${W}x${H}`);
}

await browser.close();
console.log(`\n${giunzioni.length} fotogrammi in previz/giunzioni/`);
console.log('ERRORI DI PAGINA:', errori.length ? errori.join('\n') : 'nessuno');
