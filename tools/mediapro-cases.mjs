import { chromium } from 'playwright-core';
const out = process.argv[2] || '.';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE ERROR:', m.text()); });
await p.goto('http://localhost:8931/mediapro/', { waitUntil: 'networkidle' });
await p.mouse.move(700, 450);
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/f1-caduta.png` });   // entrata del cubo
await p.waitForTimeout(3200);
await p.screenshot({ path: `${out}/f2-riposo.png` });

async function to(y) {
  for (let i=0;i<70;i++){ const c=await p.evaluate(()=>window.scrollY); if(c>=y-14) break;
    await p.mouse.wheel(0, Math.min(700,(y-c)*1.25+70)); await p.waitForTimeout(180); }
  await p.waitForTimeout(1700);
  return p.evaluate(()=>Math.round(window.scrollY));
}
const sec = await p.evaluate(() => {
  const e = document.getElementById('portfolio');
  return { top: e.offsetTop, h: e.offsetHeight };
});
const H = sec.top;
// tratto bloccato = altezza sezione - una viewport; i centri delle stanze
// tengono conto dei margini di testa e coda (PAD = 0.09)
const TRAVEL = sec.h - 900;
const PAD = 0.09;
console.log('portfolio inizia a', H, 'tratto', TRAVEL);
for (let i=0;i<5;i++){
  const y = H + Math.round((PAD + (i/4) * (1 - PAD*2)) * TRAVEL);
  const at = await to(y);
  const st = await p.evaluate(()=>({w:+(window.__w??-1)}));
  console.log(`progetto ${i+1}: scroll ${at}`);
  await p.screenshot({ path: `${out}/f3-progetto-${i+1}.png` });
}
await b.close();
console.log('done');
