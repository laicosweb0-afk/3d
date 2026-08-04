// Ogni testo della pagina contro il fondo che ha davvero dietro.
//
// Dal 04/08 il fondo del documento è VIVO: cambia colore con lo
// scorrimento (fondale del passaggio). Quindi il fondo dietro un testo
// non è più una proprietà dell'albero, è una proprietà del MOMENTO in
// cui il lettore lo vede: lo strumento scorre fino a ogni testo, aspetta
// due fotogrammi perché l'animazione legata allo scroll si assesti, e
// solo allora compone gli strati — dal basso verso l'alto, compresi i
// traslucidi, come ha sempre fatto.
import { chromium } from '/home/user/3d/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.goto('http://127.0.0.1:8100/3d/bufala/', { waitUntil: 'load' });
await p.waitForTimeout(1200);

// Primo giro: si etichettano i candidati, senza ancora misurarli.
const totale = await p.evaluate(() => {
  let i = 0;
  for (const el of document.querySelectorAll('h1,h2,h3,p,dt,dd,li,figcaption,span,a')) {
    const t = (el.textContent || '').trim();
    if (!t || el.querySelector('h1,h2,h3,p,dt,dd,li')) continue;
    el.dataset.contrastoI = String(i++);
  }
  return i;
});

// Secondo giro: ogni testo si misura DOV'È — al centro dello schermo.
const voci = [];
for (let i = 0; i < totale; i++) {
  const v = await p.evaluate(async (indice) => {
    const el = document.querySelector(`[data-contrasto-i="${indice}"]`);
    if (!el) return null;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise((fine) => requestAnimationFrame(() => requestAnimationFrame(fine)));

    const num = (x) => (x.match(/[\d.]+/g) || []).map(Number);
    // Il fondo VERO dietro un testo: si sale fino al primo colore opaco e
    // poi si ricompongono, dal basso verso l'alto, tutti gli strati
    // traslucidi incontrati per strada — compreso quello dell'elemento
    // stesso. Senza questa composizione, un bottone chiaro al 94% su
    // fondo scuro veniva misurato contro lo scuro: il falso positivo che
    // ha accompagnato ogni audit di questo progetto.
    const opaco = (nodo) => {
      const strati = [];
      let base = [255, 255, 255];
      for (let n = nodo; n; n = n.parentElement) {
        const c = num(getComputedStyle(n).backgroundColor);
        if (c.length === 0) continue;
        if (c.length < 4 || c[3] > 0.95) { base = c.slice(0, 3); break; }
        if (c[3] > 0) strati.push(c);
      }
      let f = base;
      for (let k = strati.length - 1; k >= 0; k--) {
        const [rr, gg, bb, a] = strati[k];
        f = [rr * a + f[0] * (1 - a), gg * a + f[1] * (1 - a), bb * a + f[2] * (1 - a)];
      }
      return f;
    };

    return {
      tag: el.tagName.toLowerCase(),
      cls: el.className || '',
      testo: (el.textContent || '').trim().slice(0, 34).replace(/\s+/g, ' '),
      colore: num(s.color).slice(0, 3),
      alfa: num(s.color)[3] ?? 1,
      fondo: opaco(el),
      px: parseFloat(s.fontSize),
      peso: s.fontWeight,
    };
  }, i);
  if (v) voci.push(v);
}

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
