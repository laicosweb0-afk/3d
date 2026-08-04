// Lo scroll VERO: eventi di input veri, non window.scrollTo. scrollTo salta
// la catena di scorrimento del browser e misura un mondo che non esiste —
// era il difetto della mia misura di ieri.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const f of [
  { nome: 'telefono', width: 390, height: 844, dpr: 3 },
  { nome: 'tablet', width: 820, height: 1180, dpr: 2 },
]) {
  const p = await b.newPage({ viewport: { width: f.width, height: f.height }, deviceScaleFactor: f.dpr });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);

  for (const zona of ['film', 'documento']) {
    if (zona === 'documento') {
      await p.evaluate(() => document.querySelector('.bufala-sezioni').scrollIntoView({ block: 'start' }));
      await p.waitForTimeout(1200);
    }

    await p.evaluate(() => {
      window.__t = [];
      window.__prec = performance.now();
      window.__gira = true;
      const passo = () => {
        const o = performance.now();
        window.__t.push(o - window.__prec);
        window.__prec = o;
        if (window.__gira) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });

    // rotelle vere, una ogni 16 ms, per due secondi
    const x = f.width / 2, y = f.height / 2;
    for (let i = 0; i < 110; i++) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel', x, y, deltaX: 0, deltaY: 60, pointerType: 'mouse',
      });
      await new Promise((r) => setTimeout(r, 16));
    }

    const r = await p.evaluate(() => {
      window.__gira = false;
      const t = window.__t.slice(3).sort((a, b) => a - b);
      const q = (n) => t[Math.floor(t.length * n)];
      const v = document.querySelector('video');
      const qual = v?.getVideoPlaybackQuality?.();
      return {
        n: t.length,
        mediana: q(0.5), p90: q(0.9), p99: q(0.99), peggiore: t[t.length - 1],
        persi: t.filter((x) => x > 24).length,
        lunghi: t.filter((x) => x > 50).length,
        video: qual ? { totali: qual.totalVideoFrames, caduti: qual.droppedVideoFrames } : null,
      };
    });

    const fps = (1000 / r.mediana).toFixed(0);
    console.log(
      `${f.nome.padEnd(9)} ${zona.padEnd(10)} mediana ${r.mediana.toFixed(1)}ms (${fps}fps)  ` +
      `p90 ${r.p90.toFixed(1)}  p99 ${r.p99.toFixed(0)}  peggiore ${r.peggiore.toFixed(0)}ms  ` +
      `oltre 24ms ${(100 * r.persi / r.n).toFixed(0)}%  oltre 50ms ${(100 * r.lunghi / r.n).toFixed(0)}%` +
      (r.video ? `  fotogrammi video caduti ${r.video.caduti}/${r.video.totali}` : ''),
    );
  }
  await p.close();
}
await b.close();
