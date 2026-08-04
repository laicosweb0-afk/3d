// LA MISURA GIUSTA.
// Le pagine scorrono a 60fps: l'ho misurato tre volte. Ma quello che si
// guarda non è la pagina, è il filmato — e il filmato ha un suo ritmo,
// che nessuna misura di fotogrammi della pagina può vedere.
// `requestVideoFrameCallback` scatta quando un fotogramma VIENE DAVVERO
// MOSTRATO. Se la pagina ne fa sessanta e il film dodici, lo scorrimento
// è liscio e l'immagine va a scatti: è esattamente quello che si vede.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const f of [
  { nome: 'telefono', width: 390, height: 844, dpr: 3, cpu: 4 },
  { nome: 'tablet', width: 820, height: 1180, dpr: 2, cpu: 4 },
  { nome: 'tablet (cpu ×6)', width: 820, height: 1180, dpr: 2, cpu: 6 },
]) {
  const p = await b.newPage({ viewport: { width: f.width, height: f.height }, deviceScaleFactor: f.dpr, hasTouch: true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: f.cpu });
  await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
  await p.waitForTimeout(700);

  await p.evaluate(() => {
    const v = document.querySelector('video');
    window.__vf = [];   // fotogrammi del film davvero mostrati
    window.__pf = [];   // fotogrammi della pagina
    window.__g = true;
    let prec = performance.now();
    const pag = () => { const o = performance.now(); window.__pf.push(o - prec); prec = o; if (window.__g) requestAnimationFrame(pag); };
    requestAnimationFrame(pag);
    if (v.requestVideoFrameCallback) {
      const vid = (ora, meta) => { window.__vf.push({ ora, media: meta.mediaTime }); if (window.__g) v.requestVideoFrameCallback(vid); };
      v.requestVideoFrameCallback(vid);
    }
  });

  // due secondi di scorrimento continuo, come un pollice che accompagna
  const t0 = Date.now();
  while (Date.now() - t0 < 2200) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: f.width / 2, y: f.height / 2, deltaX: 0, deltaY: 70, pointerType: 'mouse' });
    await new Promise((r) => setTimeout(r, 16));
  }

  const r = await p.evaluate(() => {
    window.__g = false;
    const vf = window.__vf, pf = window.__pf;
    const durata = vf.length > 1 ? (vf[vf.length - 1].ora - vf[0].ora) / 1000 : 0;
    // di quanto avanza il film fra un fotogramma mostrato e il successivo
    const passi = [];
    for (let i = 1; i < vf.length; i++) passi.push(vf[i].ora - vf[i - 1].ora);
    passi.sort((a, b) => a - b);
    return {
      fotogrammiPagina: pf.length,
      fotogrammiFilm: vf.length,
      durata,
      passoMediano: passi.length ? passi[Math.floor(passi.length / 2)] : 0,
      passoPeggiore: passi.length ? passi[passi.length - 1] : 0,
      supportato: 'requestVideoFrameCallback' in HTMLVideoElement.prototype,
    };
  });

  const fpsPagina = (r.fotogrammiPagina / 2.2).toFixed(0);
  const fpsFilm = (r.fotogrammiFilm / 2.2).toFixed(0);
  console.log(
    `${f.nome.padEnd(16)} pagina ${String(fpsPagina).padStart(2)} fps   ` +
    `FILM ${String(fpsFilm).padStart(2)} fps   ` +
    `un fotogramma nuovo ogni ${r.passoMediano.toFixed(0)}ms (peggio ${r.passoPeggiore.toFixed(0)}ms)`,
  );
  await p.close();
}
await b.close();
