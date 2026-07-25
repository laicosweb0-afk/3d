import { chromium } from 'playwright-core';
const out = process.argv[2] || '.';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// 1) FOUC: che si vede nei primissimi istanti, prima che parta GSAP?
const p1 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p1.goto('http://localhost:8931/mediapro/', { waitUntil: 'commit' });
await p1.waitForTimeout(180);
await p1.screenshot({ path: `${out}/qa-fouc.png` });

// 2) prefers-reduced-motion: il contenuto deve restare tutto leggibile
const p2 = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await p2.goto('http://localhost:8931/mediapro/', { waitUntil: 'networkidle' });
await p2.waitForTimeout(1200);
await p2.screenshot({ path: `${out}/qa-reduced-hero.png` });
await p2.evaluate(() => document.getElementById('portfolio').scrollIntoView());
await p2.waitForTimeout(800);
await p2.screenshot({ path: `${out}/qa-reduced-portfolio.png` });
// quanti elementi restano invisibili?
const hidden = await p2.evaluate(() =>
  [...document.querySelectorAll('.mp-reveal, .mp-stat, .mp-step, .mp-split .mp-word > span')]
    .filter((e) => getComputedStyle(e).opacity === '0').length
);
console.log('elementi invisibili con reduced-motion:', hidden);

// 3) senza JavaScript: il contenuto deve comunque esserci
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
const p3 = await ctx.newPage();
await p3.goto('http://localhost:8931/mediapro/', { waitUntil: 'load' });
await p3.waitForTimeout(500);
await p3.screenshot({ path: `${out}/qa-nojs.png` });
const hiddenNoJs = await p3.evaluate(() =>
  [...document.querySelectorAll('.mp-reveal, .mp-stat, .mp-step')]
    .filter((e) => getComputedStyle(e).opacity === '0').length
);
console.log('elementi invisibili senza JS:', hiddenNoJs);

await b.close();
