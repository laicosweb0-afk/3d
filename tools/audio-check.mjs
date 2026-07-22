// QA autonoma del sound design: registra l'uscita audio reale del sito
// durante uno scroll realistico (velocità variabile, pause nei punti
// chiave) e produce dati oggettivi da ispezionare — livelli, silenzi,
// forma d'onda, spettrogramma — senza bisogno di ascolto umano.
//
// Uso: npm run build && npm start (porta 3000), poi:
//   node tools/audio-check.mjs

import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUTDIR = process.env.OUTDIR || '/tmp/audio-check';
mkdirSync(OUTDIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));

await page.goto('http://localhost:3000/?audiotap=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// attiva il suono dal vero toggle dell'interfaccia
await page.click('.chrome-audio');
await page.waitForTimeout(300);

// avvia la registrazione dell'uscita audio reale (MediaRecorder sul tap)
await page.evaluate(async () => {
  await new Promise((resolve) => {
    const check = () => {
      const s = window.__audioTapStream;
      if (s) resolve(s);
      else setTimeout(check, 50);
    };
    check();
  });
  const stream = window.__audioTapStream;
  const rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  window.__chunks = [];
  rec.ondataavailable = (e) => window.__chunks.push(e.data);
  rec.start();
  window.__rec = rec;
});

console.log('Registrazione avviata. Eseguo lo scroll realistico...');

// scroll realistico su tutto il viaggio (23 vh utili), velocità variabile:
// burst rapidi (per testare il whoosh) alternati a pause nei beat chiave
// (per testare room tone, tick di costruzione, click porta/finestra).
const H = 900;
const total = 23 * H;
await page.mouse.move(720, 450);

const segments = [
  { px: total * 0.06, ms: 3500 },   // intro: vento
  { px: total * 0.10, ms: 5500 },   // rilievo -> inizio costruzione (tick)
  { px: total * 0.14, ms: 6000 },   // costruzione (tick multipli)
  { px: total * 0.06, ms: 900 },    // burst rapido (whoosh)
  { px: total * 0.08, ms: 4000 },   // materia + volo
  { px: total * 0.05, ms: 2500 },   // soglia (click porta)
  { px: total * 0.10, ms: 5000 },   // soggiorno (room tone)
  { px: total * 0.14, ms: 5500 },   // parete + stratigrafia
  { px: total * 0.10, ms: 5000 },   // bagno
  { px: total * 0.05, ms: 900 },    // burst rapido (whoosh)
  { px: total * 0.05, ms: 3000 },   // finestra (click)
  { px: total * 0.07, ms: 5000 },   // congedo (vento + sub swell)
];

for (const seg of segments) {
  const steps = 14;
  const stepPx = seg.px / steps;
  const stepMs = seg.ms / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepPx);
    await page.waitForTimeout(stepMs);
  }
}
await page.waitForTimeout(2500);

console.log('Scroll completato. Fermo la registrazione...');

const base64 = await page.evaluate(async () => {
  return new Promise((resolve) => {
    window.__rec.onstop = () => {
      const blob = new Blob(window.__chunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    };
    window.__rec.stop();
  });
});

const b64data = base64.split(',')[1];
const outPath = `${OUTDIR}/capture.webm`;
writeFileSync(outPath, Buffer.from(b64data, 'base64'));
console.log('Salvato:', outPath);

await browser.close();
