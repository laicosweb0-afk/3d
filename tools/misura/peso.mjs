// Quanto scroll costa oggi ogni pezzo del sito, in schermate.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const vp of [{ width: 390, height: 844, nome: 'telefono' }, { width: 1440, height: 900, nome: 'desktop' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const h = window.innerHeight;
    const q = (s) => document.querySelector(s);
    const misura = (el) => el ? +(el.getBoundingClientRect().height / h).toFixed(2) : null;
    const out = [];
    out.push(['viaggio (spacer)', misura(q('.bufala-spacer'))]);
    out.push(['— apertura', misura(q('.bufala-apertura'))]);
    const sez = [...document.querySelectorAll('.bufala-sezioni > section, .bufala-sezioni > footer, .bufala-vetrina')];
    for (const s of sez) {
      const t = (s.querySelector('h2, .micro')?.textContent || s.className).trim().slice(0, 30);
      out.push([`${s.closest('.bufala-buio') ? 'scuro' : 'chiaro'} · ${t}`, misura(s)]);
    }
    out.push(['fascia di passaggio', misura(q('.bufala-passaggio'))]);
    out.push(['TOTALE', +(document.documentElement.scrollHeight / h).toFixed(2)]);
    return out;
  });
  console.log(`\n${vp.nome} (${vp.width}×${vp.height}) — in schermate`);
  for (const [n, v] of r) console.log(`  ${String(v).padStart(6)}  ${n}`);
  await p.close();
}
await b.close();
