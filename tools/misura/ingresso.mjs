// L'INGRESSO. Dal primo byte al momento in cui si può scorrere senza scatti.
// La misura di prima aspettava 2,5 secondi: saltava esattamente questo.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 40, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8,
});

// Registro i lavori lunghi PRIMA che la pagina esista
await p.addInitScript(() => {
  window.__lunghi = [];
  new PerformanceObserver((l) => {
    for (const v of l.getEntries()) window.__lunghi.push({ inizio: Math.round(v.startTime), durata: Math.round(v.duration) });
  }).observe({ entryTypes: ['longtask'] });
  window.__spostamenti = 0;
  new PerformanceObserver((l) => {
    for (const v of l.getEntries()) if (!v.hadRecentInput) window.__spostamenti += v.value;
  }).observe({ type: 'layout-shift', buffered: true });
});

const t0 = Date.now();
await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'commit' });
await p.waitForTimeout(9000);

const r = await p.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const pittura = Object.fromEntries(performance.getEntriesByType('paint').map((e) => [e.name, Math.round(e.startTime)]));
  const risorse = performance.getEntriesByType('resource')
    .map((e) => ({
      nome: e.name.split('/').pop().split('?')[0].slice(0, 34),
      tipo: e.initiatorType,
      inizio: Math.round(e.startTime),
      fine: Math.round(e.responseEnd),
      kb: Math.round((e.transferSize || e.encodedBodySize) / 1024),
    }))
    .filter((e) => e.kb > 8)
    .sort((a, b) => b.kb - a.kb);
  const v = document.querySelector('video');
  return {
    html: Math.round(nav.responseEnd),
    domInteractive: Math.round(nav.domInteractive),
    caricato: Math.round(nav.loadEventEnd),
    pittura,
    lunghi: window.__lunghi,
    tempoBloccato: window.__lunghi.reduce((s, t) => s + Math.max(0, t.durata - 50), 0),
    spostamenti: +window.__spostamenti.toFixed(4),
    risorse: risorse.slice(0, 10),
    video: v ? { pronto: v.readyState, cercabile: v.seekable.length > 0, durata: +v.duration?.toFixed(2) } : null,
  };
});

console.log(`HTML servito         ${r.html} ms`);
console.log(`prima pittura        ${r.pittura['first-paint'] ?? '—'} ms`);
console.log(`primo contenuto      ${r.pittura['first-contentful-paint'] ?? '—'} ms`);
console.log(`DOM interattivo      ${r.domInteractive} ms`);
console.log(`load completo        ${r.caricato} ms`);
console.log(`spostamenti layout   ${r.spostamenti}   (soglia 0.1)`);
console.log(`\nvideo: pronto=${r.video?.pronto}/4  cercabile=${r.video?.cercabile}  durata=${r.video?.durata}s`);

console.log(`\nLAVORI LUNGHI (il thread principale bloccato — è questo che si vede come scatto)`);
for (const t of r.lunghi) console.log(`  a ${String(t.inizio).padStart(5)} ms  bloccato ${t.durata} ms`);
console.log(`  → tempo totale bloccato oltre i 50ms: ${r.tempoBloccato} ms   (soglia buona: 200ms)`);

console.log(`\nRISORSE PIÙ PESANTI`);
for (const e of r.risorse) console.log(`  ${String(e.kb).padStart(4)} kB  ${String(e.inizio).padStart(5)}→${String(e.fine).padStart(5)} ms  ${e.tipo.padEnd(9)} ${e.nome}`);
await b.close();
