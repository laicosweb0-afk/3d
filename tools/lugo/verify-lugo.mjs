// Smoke test headless del gioco: serve `out/`, apre /lugo/, aspetta il
// mondo pronto, esercita ciò che esiste (guida, discesa a piedi, missioni,
// NPC) e scatta screenshot. Le fasi si attivano da sole in base agli hook
// presenti su window.__LUGO__, così lo stesso script accompagna tutte le
// milestone.
//
// Uso: npm run build && npm run lugo:verify
//   BASE=/3d node tools/lugo/verify-lugo.mjs   (verifica sotto basePath)

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SHOTS = join(HERE, 'shots');
const PORT = 4517;
const BASE = process.env.BASE ?? '';
const URL = `http://localhost:${PORT}${BASE}/lugo/?qa=1`;

mkdirSync(SHOTS, { recursive: true });

// server statico (riusa il tool del repo); con BASE (es. /3d, come su GitHub
// Pages) si serve una cartella che contiene out/ sotto quel prefisso
let radice = join(ROOT, 'out');
if (BASE) {
  const dir = join(HERE, 'cache', 'serve-base');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  symlinkSync(join(ROOT, 'out'), join(dir, BASE.replace(/^\//, '')));
  radice = dir;
}
const server = spawn('node', [join(ROOT, 'tools', 'static-server.mjs'), radice, String(PORT)], {
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 700));

const esiti = [];
const fallimenti = [];
const ok = (nome, dettaglio = '') => {
  esiti.push(`✓ ${nome}${dettaglio ? ' — ' + dettaglio : ''}`);
};
const ko = (nome, dettaglio) => {
  esiti.push(`✗ ${nome} — ${dettaglio}`);
  fallimenti.push(nome);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errori = [];
  page.on('pageerror', (e) => errori.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errori.push(m.text());
  });

  await page.goto(URL, { waitUntil: 'networkidle' });

  const lugo = (expr) => page.evaluate(`(() => { const L = window.__LUGO__; return L ? (${expr}) : undefined })()`);

  // ── fase 1: mondo pronto ──────────────────────────────────────────────
  try {
    await page.waitForFunction(() => window.__LUGO__ && window.__LUGO__.pronto === true, null, { timeout: 30000 });
    const edifici = await lugo('L.edifici');
    const strade = await lugo('L.strade');
    ok('mondo pronto', `${edifici} edifici, ${strade} strade`);
    if (!(edifici > 0 && strade > 0)) ko('mappa non vuota', `edifici=${edifici} strade=${strade}`);
  } catch {
    ko('mondo pronto', 'timeout: __LUGO__.pronto mai true');
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SHOTS, '01-citta.png') });

  // eventuale start screen: si parte
  const gioca = page.locator('[data-hud="gioca"]');
  if (await gioca.count()) {
    await gioca.click();
    await page.waitForTimeout(800);
    ok('start screen', 'bottone GIOCA premuto');
  }

  // ── fase 2: guida ─────────────────────────────────────────────────────
  if ((await lugo('typeof L.pos')) === 'function') {
    const p0 = await lugo('L.pos()');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(3200);
    await page.keyboard.up('ArrowUp');
    const p1 = await lugo('L.pos()');
    const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (d > 3) ok('auto si muove', `${d.toFixed(1)} m in 3.2 s`);
    else ko('auto si muove', `spostamento ${d.toFixed(2)} m`);
    await page.screenshot({ path: join(SHOTS, '02-guida.png') });

    // collisione: teleport davanti a un edificio noto e prova ad attraversarlo
    if ((await lugo('typeof L.teleport')) === 'function' && (await lugo('typeof L.muro')) === 'function') {
      const dentro = await lugo('L.muro()');
      if (dentro === false) ok('edifici solidi');
      else ko('edifici solidi', 'il muro non ha fermato l’auto');
    }
  }

  // ── fase 3: a piedi ───────────────────────────────────────────────────
  if ((await lugo('typeof L.mode')) === 'function') {
    // si scende solo quasi da fermi: frenata prima di aprire la portiera
    await page.keyboard.down('Space');
    await page.waitForTimeout(1200);
    await page.keyboard.up('Space');
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(600);
    const m1 = await lugo('L.mode()');
    if (m1 === 'piedi') ok('discesa a piedi');
    else ko('discesa a piedi', `mode=${m1}`);
    const p0 = await lugo('L.pos()');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyW');
    const p1 = await lugo('L.pos()');
    const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (d > 1) ok('camminata', `${d.toFixed(1)} m`);
    else ko('camminata', `spostamento ${d.toFixed(2)} m`);
    await page.screenshot({ path: join(SHOTS, '03-piedi.png') });
    // torna verso l'auto (S = indietro, verso la camera che è rimasta lì)
    let m2 = 'piedi';
    for (let i = 0; i < 4 && m2 !== 'auto'; i++) {
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(400);
      m2 = await lugo('L.mode()');
      if (m2 !== 'auto') {
        await page.keyboard.down('KeyS');
        await page.waitForTimeout(500);
        await page.keyboard.up('KeyS');
      }
    }
    if (m2 === 'auto') ok('risalita in auto');
    else ko('risalita in auto', `mode=${m2}`);
  }

  // ── fase 4: missioni ──────────────────────────────────────────────────
  if ((await lugo('typeof L.avviaMissione')) === 'function') {
    const esito = await page.evaluate(async () => {
      const L = window.__LUGO__;
      const prima = L.punteggio();
      L.avviaMissione('m01');
      const t = L.tappaCorrente();
      L.teleport(t.x, t.z);
      await new Promise((r) => setTimeout(r, 1500));
      return { prima, dopo: L.punteggio(), stato: L.statoMissione() };
    });
    if (esito.dopo > esito.prima) ok('missione completabile', `+${esito.dopo - esito.prima} punti`);
    else ko('missione completabile', JSON.stringify(esito));
    const hud = await page.locator('[data-hud="missione"]').count();
    if (hud) ok('HUD missione presente');
    await page.screenshot({ path: join(SHOTS, '04-missione.png') });
  }

  // ── fase 5: NPC ───────────────────────────────────────────────────────
  const npc = await lugo('typeof L.npcCount === "function" ? L.npcCount() : undefined');
  if (npc !== undefined) {
    if (npc > 0) ok('NPC presenti', String(npc));
    else ko('NPC presenti', 'npcCount=0');
  }

  // ── fase 6: cartoline dai landmark ───────────────────────────────────
  const poiMap = await lugo('L.poi');
  if (poiMap && (await lugo('typeof L.teleport')) === 'function') {
    const inquadrature = {
      pavaglione: [90, 70, 70],
      rocca: [60, 45, 55],
      stazione: [45, 30, 40],
      baracca: [16, 9, 14],
    };
    for (const [id, [ox, oy, oz]] of Object.entries(inquadrature)) {
      const p = poiMap[id];
      if (!p) continue;
      // vista aerea in tre quarti puntata sul monumento
      await page.evaluate(
        ([x, z, dx, dy, dz]) => window.__LUGO__.fotocamera(x + dx, dy, z + dz, x, 4, z, 4000),
        [p.x, p.z, ox, oy, oz],
      );
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(SHOTS, `06-${id}.png`) });
    }
    ok('cartoline dai landmark');
  }

  // ── errori di pagina ──────────────────────────────────────────────────
  const gravi = errori.filter((e) => !e.includes('favicon'));
  if (gravi.length) ko('zero errori console', gravi.slice(0, 5).join(' | '));
  else ok('zero errori console');
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log('── verifica /lugo ─────────────────────────────');
for (const r of esiti) console.log('  ' + r);
console.log(`screenshot in ${SHOTS}`);
if (fallimenti.length) {
  console.error(`FALLITE: ${fallimenti.join(', ')}`);
  process.exit(1);
}
console.log('tutto verde');
