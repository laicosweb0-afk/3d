// Dentro la pagina vera: cosa CHIEDIAMO al filmato, fotogramma per
// fotogramma, e cosa il filmato MOSTRA davvero. Se la richiesta avanza
// liscia e l'immagine no, il collo di bottiglia è fra le due.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.evaluate(() => window.scrollTo({ top: 2000, behavior: 'instant' }));
await p.waitForTimeout(900);

// intercetto le scritture di currentTime senza toccare il codice del sito
await p.evaluate(() => {
  const v = document.querySelector('video');
  window.__ric = [];   // richieste
  window.__most = [];  // mostrati
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(v, 'currentTime', {
    get() { return d.get.call(this); },
    set(x) { window.__ric.push({ t: performance.now(), v: x }); d.set.call(this, x); },
    configurable: true,
  });
  window.__g = true;
  const cb = (ora, m) => { window.__most.push({ t: ora, v: m.mediaTime }); if (window.__g) v.requestVideoFrameCallback(cb); };
  v.requestVideoFrameCallback(cb);
});

const t0 = Date.now();
while (Date.now() - t0 < 2200) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 195, y: 420, deltaX: 0, deltaY: 70, pointerType: 'mouse' });
  await new Promise((r) => setTimeout(r, 16));
}

const r = await p.evaluate(() => {
  window.__g = false;
  const ric = window.__ric, most = window.__most;
  const passi = [];
  for (let i = 1; i < ric.length; i++) passi.push(Math.abs(ric[i].v - ric[i - 1].v));
  passi.sort((a, b) => a - b);
  const arcoRic = ric.length > 1 ? ric[ric.length - 1].v - ric[0].v : 0;
  const arcoMost = most.length > 1 ? most[most.length - 1].v - most[0].v : 0;
  return {
    richieste: ric.length,
    mostrati: most.length,
    passoMediano: passi.length ? passi[Math.floor(passi.length / 2)] : 0,
    arcoRic: +arcoRic.toFixed(2),
    arcoMost: +arcoMost.toFixed(2),
  };
});

console.log(`richieste di spostamento inviate al filmato : ${r.richieste}  (${(r.richieste / 2.2).toFixed(0)} al secondo)`);
console.log(`fotogrammi effettivamente mostrati          : ${r.mostrati}  (${(r.mostrati / 2.2).toFixed(0)} al secondo)`);
console.log(`avanzamento richiesto per fotogramma        : ${r.passoMediano.toFixed(4)} s`);
console.log(`arco di filmato percorso: richiesto ${r.arcoRic}s · mostrato ${r.arcoMost}s`);
console.log(`\nun fotogramma sorgente dura 0.0400 s (25 fps).`);
console.log(r.passoMediano < 0.04
  ? `→ chiediamo passi PIÙ PICCOLI di un fotogramma: ${(0.04 / r.passoMediano).toFixed(1)} richieste per ogni fotogramma esistente.`
  : `→ i passi sono più grandi di un fotogramma.`);
await b.close();
