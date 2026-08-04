// Ogni testo della pagina contro il fondo che ha davvero dietro.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
await p.waitForTimeout(1200);

const voci = await p.evaluate(() => {
  const num = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const opaco = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = num(getComputedStyle(n).backgroundColor);
      if (c.length < 4 || c[3] > 0.95) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const out = [];
  for (const el of document.querySelectorAll('h1,h2,h3,p,dt,dd,li,figcaption,span,a')) {
    const t = (el.textContent || '').trim();
    if (!t || el.querySelector('h1,h2,h3,p,dt,dd,li')) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: el.className || '',
      testo: t.slice(0, 34).replace(/\s+/g, ' '),
      colore: num(s.color).slice(0, 3),
      alfa: num(s.color)[3] ?? 1,
      fondo: opaco(el),
      px: parseFloat(s.fontSize),
      peso: s.fontWeight,
      dentroBuio: !!el.closest('.bufala-buio'),
    });
  }
  return out;
});

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = ([r, g, bl]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
const rapporto = (a, f) => { const x = L(a), y = L(f); const [h, s] = x > y ? [x, y] : [y, x]; return (h + 0.05) / (s + 0.05); };

let guasti = 0;
for (const v of voci) {
  const c = v.colore.map((x, i) => x * v.alfa + v.fondo[i] * (1 - v.alfa));
  const r = rapporto(c, v.fondo);
  // la soglia scende a 3 per il testo grande (24px, o 18.66px in grassetto)
  const grande = v.px >= 24 || (v.px >= 18.66 && Number(v.peso) >= 700);
  const soglia = grande ? 3 : 4.5;
  if (r < soglia) {
    guasti++;
    console.log(`✗ ${r.toFixed(2)} (serve ${soglia})  ${v.tag}.${String(v.cls).slice(0, 24)}  ${v.px}px  «${v.testo}»`);
  }
}
console.log(guasti ? `\n${guasti} testi sotto soglia` : '\n✓ tutti i testi sopra soglia');
await b.close();
