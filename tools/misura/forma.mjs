// La forma di ogni sezione: allineamento, larghezza, sequenza dei blocchi.
// Se sono tutte uguali, il sito ha una sola idea di pagina ripetuta.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const righe = [];
  for (const s of document.querySelectorAll('.bufala-sezioni section, .bufala-sezioni footer')) {
    const c = getComputedStyle(s);
    const forma = [...s.children].map((e) => {
      const t = e.tagName.toLowerCase();
      return t === 'p' ? (e.className.includes('micro') ? 'occhiello' : 'testo') : t;
    }).join(' + ');
    const r = s.getBoundingClientRect();
    const nome = (s.querySelector('h2, .micro')?.textContent || s.className).trim().slice(0, 26);
    righe.push(`${c.textAlign.padEnd(7)} ${String(Math.round(r.width)).padStart(4)}px  ${forma.padEnd(34)} ${nome}`);
  }
  return 'allinea larghezza  forma' + '\n' + righe.join('\n');
}));
await b.close();
