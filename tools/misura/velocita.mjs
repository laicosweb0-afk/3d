// Quanto scroll chiedo e quanto ne arriva. E soprattutto: a quale velocità
// di scorrimento il filmato riesce a mostrare 25 fotogrammi diversi al
// secondo, che è il suo massimo.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
await p.waitForTimeout(2500);

const geo = await p.evaluate(() => {
  const sp = document.querySelector('.bufala-spacer');
  return { corsa: sp.getBoundingClientRect().height, schermo: window.innerHeight };
});
const DURATA = 12.04, FPS = 48;
console.log(`corsa del filmato: ${Math.round(geo.corsa)} px = ${(geo.corsa / geo.schermo).toFixed(1)} schermate`);
console.log(`il filmato ha ${Math.round(DURATA * FPS)} fotogrammi diversi in tutto`);
console.log(`→ ${(geo.corsa / (DURATA * FPS)).toFixed(0)} px di scroll per ogni fotogramma diverso\n`);

for (const delta of [40, 70, 120, 200]) {
  await p.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
  await p.waitForTimeout(900);
  const y0 = await p.evaluate(() => window.scrollY);
  const t0 = Date.now();
  while (Date.now() - t0 < 1600) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 195, y: 420, deltaX: 0, deltaY: delta, pointerType: 'mouse' });
    await new Promise((r) => setTimeout(r, 16));
  }
  await p.waitForTimeout(120);
  const y1 = await p.evaluate(() => window.scrollY);
  const secondi = (Date.now() - t0) / 1000;
  const px = (y1 - y0) / secondi;
  const filmAlSecondo = px * (DURATA / geo.corsa);
  const fpsVisti = Math.min(FPS, filmAlSecondo * FPS);
  console.log(
    `rotella ${String(delta).padStart(3)}  →  ${String(Math.round(px)).padStart(4)} px/s  ` +
    `→ il film avanza di ${filmAlSecondo.toFixed(2)} s ogni secondo  ` +
    `→ ${fpsVisti.toFixed(0)} immagini diverse al secondo` + (fpsVisti < 18 ? '  ⚠️ scatti' : ''),
  );
}

console.log(`\nsoglia: per vedere 24 immagini diverse al secondo servono ${Math.round(24 / FPS / (DURATA / geo.corsa))} px/s di scorrimento.`);
console.log(`con il filmato compresso a 8 schermate (${Math.round(8 * geo.schermo)} px) ne basterebbero ${Math.round(24 / FPS / (DURATA / (8 * geo.schermo)))} px/s.`);
await b.close();
