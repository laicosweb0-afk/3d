import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const f of [
  { nome: 'telefono', width: 390, height: 844, dpr: 3 },
  { nome: 'tablet vert.', width: 820, height: 1180, dpr: 2 },
  { nome: 'tablet oriz.', width: 1180, height: 820, dpr: 2 },
  { nome: 'desktop', width: 1440, height: 900, dpr: 2 },
]) {
  const p = await b.newPage({ viewport: { width: f.width, height: f.height }, deviceScaleFactor: f.dpr });
  await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const r = await p.evaluate((dpr) => {
    const v = document.querySelector('video');
    if (!v) return null;
    const b = v.getBoundingClientRect();
    return {
      sorgente: `${v.videoWidth}×${v.videoHeight}`,
      inPagina: `${Math.round(b.width * dpr)}×${Math.round(b.height * dpr)}`,
      ingrandimento: +(b.width * dpr / v.videoWidth).toFixed(2),
      pxDecodificati: v.videoWidth * v.videoHeight,
      qualita: v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null,
    };
  }, f.dpr);
  console.log(`${f.nome.padEnd(13)} sorgente ${r.sorgente}  in pagina ${r.inPagina}  ingrandimento ×${r.ingrandimento}`);
  await p.close();
}
await b.close();
