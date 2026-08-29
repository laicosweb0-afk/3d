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
  // l'intro copre tutto finché non la si salta: la prova entra nel gioco,
  // il filmato lo si guarda da giocatori
  const salta = page.locator('[data-hud="salta-intro"]');
  if (await salta.count()) {
    await salta.click();
    await page.waitForTimeout(400);
    ok('intro di apertura', 'filmato mostrato e saltabile');
  }

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
    await page.waitForTimeout(4200);
    await page.keyboard.up('ArrowUp');
    const p1 = await lugo('L.pos()');
    const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (d > 2) ok('auto si muove', `${d.toFixed(1)} m in 4.2 s`);
    else ko('auto si muove', `spostamento ${d.toFixed(2)} m`);
    await page.screenshot({ path: join(SHOTS, '02-guida.png') });

    // collisione: teleport davanti a un edificio noto e prova ad attraversarlo
    if ((await lugo('typeof L.teleport')) === 'function' && (await lugo('typeof L.muro')) === 'function') {
      const dentro = await lugo('L.muro()');
      if (dentro === false) ok('edifici solidi');
      else ko('edifici solidi', 'il muro non ha fermato l’auto');
    }
  }

  // ── fase 2b: joystick virtuale ────────────────────────────────────────
  const pad = page.locator('[data-hud="joystick-pad"]');
  if (await pad.count()) {
    const box = await pad.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const p0 = await lugo('L.pos()');
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx, cy - 40, { steps: 6 });
      await page.waitForTimeout(2400);
      await page.mouse.up();
      const p1 = await lugo('L.pos()');
      const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (d > 2) ok('joystick guida', `${d.toFixed(1)} m trascinando la palla`);
      else ko('joystick guida', `spostamento ${d.toFixed(2)} m`);
      // al rilascio la palla torna al centro e i comandi si azzerano
      await page.waitForTimeout(300);
      const trasf = await page.evaluate(
        () => document.querySelector('[data-hud="joystick-palla"]')?.style.transform ?? '',
      );
      if (trasf === '' || trasf === 'translate(0px, 0px)') ok('joystick si azzera al rilascio');
      else ko('joystick si azzera al rilascio', `transform=${trasf}`);
      // si frena subito, così la discesa a piedi della fase dopo resta valida
      await page.keyboard.down('Space');
      await page.waitForTimeout(1400);
      await page.keyboard.up('Space');
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
    await page.waitForTimeout(2400);
    await page.keyboard.up('KeyW');
    const p1 = await lugo('L.pos()');
    const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (d > 0.6) ok('camminata', `${d.toFixed(1)} m`);
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

  // ── fase 3a: matrice delle otto direzioni ─────────────────────────────
  // Si misura lo spostamento REALE e lo si confronta con la direzione
  // attesa nel riferimento della camera: 0° = avanti, 180° = indietro,
  // +90° = destra. Copre tastiera, WASD e joystick.
  if ((await lugo('typeof L.direzione')) === 'function' && (await lugo('typeof L.teleport')) === 'function') {
    const centro = await lugo('L.poi.pavaglione');
    if (centro) {
      await page.evaluate(() => window.__LUGO__.tempoScorre(false));
      await page.evaluate(() => window.__LUGO__.ora(14)); // niente mercato in corte
      // si prova a piedi, nella corte del Pavaglione: spazio libero
      if ((await lugo('L.mode()')) === 'auto') {
        await page.keyboard.down('Space');
        await page.waitForTimeout(1000);
        await page.keyboard.up('Space');
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(500);
      }

      const prova = async (nome, tasti, attesoGradi) => {
        await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [centro.x, centro.z]);
        await page.waitForTimeout(300);
        const camYaw = (await lugo('L.direzione()')).camYaw;
        for (const t of tasti) await page.keyboard.down(t);
        // mezzo secondo per girarsi, poi si misura il tratto a regime.
        // Il tempo è lungo apposta: in headless il rasterizzatore software
        // fa pochi fotogrammi e il clamp del dt rallenta la simulazione.
        await page.waitForTimeout(900);
        const p0 = await lugo('L.pos()');
        await page.waitForTimeout(2000);
        const p1 = await lugo('L.pos()');
        for (const t of tasti) await page.keyboard.up(t);
        await page.waitForTimeout(250);

        const dx = p1[0] - p0[0];
        const dz = p1[1] - p0[1];
        const dist = Math.hypot(dx, dz);
        if (dist < 0.18) {
          ko(`direzione ${nome}`, `direzione morta: ${dist.toFixed(2)} m`);
          return;
        }
        // angolo del moto rispetto all'avanti della camera, in gradi
        let rel = ((Math.atan2(dz, dx) - camYaw) * 180) / Math.PI;
        while (rel > 180) rel -= 360;
        while (rel < -180) rel += 360;
        let err = Math.abs(rel - attesoGradi);
        if (err > 180) err = 360 - err;
        if (err < 32) ok(`direzione ${nome}`, `${rel.toFixed(0)}° (atteso ${attesoGradi}°), ${dist.toFixed(1)} m`);
        else ko(`direzione ${nome}`, `va a ${rel.toFixed(0)}° invece di ${attesoGradi}°`);
      };

      await prova('SU', ['ArrowUp'], 0);
      await prova('GIÙ', ['ArrowDown'], 180);
      await prova('DESTRA', ['ArrowRight'], 90);
      await prova('SINISTRA', ['ArrowLeft'], -90);
      await prova('SU+DESTRA', ['ArrowUp', 'ArrowRight'], 45);
      await prova('SU+SINISTRA', ['ArrowUp', 'ArrowLeft'], -45);
      await prova('GIÙ+DESTRA', ['ArrowDown', 'ArrowRight'], 135);
      await prova('GIÙ+SINISTRA', ['ArrowDown', 'ArrowLeft'], -135);
      await prova('W', ['KeyW'], 0);
      await prova('S', ['KeyS'], 180);
      await prova('D', ['KeyD'], 90);
      await prova('A', ['KeyA'], -90);

      // il rilascio deve fermare davvero
      await page.waitForTimeout(500);
      const fermo = await lugo('L.direzione().v');
      if (fermo < 0.05) ok('rilascio ferma il movimento', `v=${fermo.toFixed(3)} m/s`);
      else ko('rilascio ferma il movimento', `resta v=${fermo.toFixed(2)} m/s`);

      // le diagonali non devono essere più veloci del dritto
      const misuraVel = async (tasti) => {
        await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [centro.x, centro.z]);
        await page.waitForTimeout(300);
        for (const t of tasti) await page.keyboard.down(t);
        // si campiona il MASSIMO su più letture: alla prima il personaggio
        // sta ancora girando verso la direzione chiesta, e chi gira rallenta
        // di proposito (character.ts:92). Una lettura sola misurava la curva,
        // non la velocità di regime.
        let v = 0;
        for (let i = 0; i < 5; i++) {
          await page.waitForTimeout(500);
          v = Math.max(v, await lugo('L.direzione().v'));
        }
        for (const t of tasti) await page.keyboard.up(t);
        await page.waitForTimeout(250);
        return v;
      };
      const vDritto = await misuraVel(['ArrowUp']);
      const vDiag = await misuraVel(['ArrowUp', 'ArrowRight']);
      if (vDiag <= vDritto * 1.08) ok('diagonale non più veloce', `${vDiag.toFixed(2)} ≤ ${vDritto.toFixed(2)} m/s`);
      else ko('diagonale non più veloce', `${vDiag.toFixed(2)} > ${vDritto.toFixed(2)} m/s`);

      // il joystick deve comportarsi come la tastiera
      const pad2 = page.locator('[data-hud="joystick-pad"]');
      if (await pad2.count()) {
        const box2 = await pad2.boundingBox();
        const provaStick = async (nome, dx, dy, attesoGradi) => {
          await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [centro.x, centro.z]);
          await page.waitForTimeout(300);
          const camYaw = (await lugo('L.direzione()')).camYaw;
          const cx = box2.x + box2.width / 2;
          const cy = box2.y + box2.height / 2;
          await page.mouse.move(cx, cy);
          await page.mouse.down();
          await page.mouse.move(cx + dx, cy + dy, { steps: 5 });
          await page.waitForTimeout(900);
          const p0 = await lugo('L.pos()');
          await page.waitForTimeout(1800);
          const p1 = await lugo('L.pos()');
          await page.mouse.up();
          await page.waitForTimeout(250);
          const ddx = p1[0] - p0[0];
          const ddz = p1[1] - p0[1];
          if (Math.hypot(ddx, ddz) < 0.18) {
            ko(`joystick ${nome}`, 'direzione morta');
            return;
          }
          let rel = ((Math.atan2(ddz, ddx) - camYaw) * 180) / Math.PI;
          while (rel > 180) rel -= 360;
          while (rel < -180) rel += 360;
          let err = Math.abs(rel - attesoGradi);
          if (err > 180) err = 360 - err;
          if (err < 32) ok(`joystick ${nome}`, `${rel.toFixed(0)}° (atteso ${attesoGradi}°)`);
          else ko(`joystick ${nome}`, `va a ${rel.toFixed(0)}° invece di ${attesoGradi}°`);
        };
        await provaStick('su', 0, -42, 0);
        await provaStick('giù', 0, 42, 180);
        await provaStick('destra', 42, 0, 90);
        await provaStick('sinistra', -42, 0, -90);
        await provaStick('diagonale', 30, -30, 45);
      }

      await page.evaluate(() => window.__LUGO__.tempoScorre(true));
      // si torna in auto per le fasi successive
      let mA = await lugo('L.mode()');
      for (let i = 0; i < 4 && mA !== 'auto'; i++) {
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(400);
        mA = await lugo('L.mode()');
      }
    }
  }

  // ── fase 3b: la vetrina di un'attività ────────────────────────────────
  if ((await lugo('typeof L.attivita')) === 'function') {
    const negozi = await lugo('L.attivita()');
    if (negozi && negozi.length) {
      const n = negozi[0];
      // la bottega si visita a piedi: prima si scende, POI ci si sposta
      // (così l'auto resta lontana e la E non fa risalire in macchina)
      if ((await lugo('L.mode()')) === 'auto') {
        await page.keyboard.down('Space');
        await page.waitForTimeout(1000);
        await page.keyboard.up('Space');
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(500);
      }
      await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [n.x, n.z]);
      await page.waitForTimeout(700);
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(600);
      const aperta = await page.locator('[data-hud="vetrina"]').count();
      if (aperta) {
        ok('vetrina attività', n.nome);
        await page.screenshot({ path: join(SHOTS, '05-negozio.png') });
        // si compra il primo articolo alla portata, se ce n'è
        const soldiPrima = await lugo('typeof L.denaro === "function" ? L.denaro() : 0');
        const art = page.locator('[data-hud="vetrina"] .lugo-vetrina-art:not([disabled])').first();
        if (await art.count()) {
          await art.click();
          await page.waitForTimeout(400);
          const soldiDopo = await lugo('L.denaro()');
          if (soldiDopo !== soldiPrima) ok('acquisto in bottega', `${soldiPrima} → ${soldiDopo}`);
        }
        await page.locator('[data-hud="vetrina"] .lugo-vetrina-chiudi').click();
        await page.waitForTimeout(300);
      } else {
        ko('vetrina attività', 'la vetrina non si è aperta');
      }
      // ── fase 3c: esplorazione e distintivi ─────────────────────────────
      if ((await lugo('typeof L.esplorazione')) === 'function') {
        const prima = await lugo('L.esplorazione()');
        const monumenti = await lugo('L.poi');
        // giro dei monumenti veri, a piedi: ogni tappa deve entrare nel diario
        for (const id of Object.keys(monumenti)) {
          await page.evaluate((p) => window.__LUGO__.teleport(p.x, p.z), monumenti[id]);
          await page.waitForTimeout(900);
        }
        const dopo = await lugo('L.esplorazione()');
        if (dopo.visitati > prima.visitati) {
          ok('esplorazione a piedi', `${dopo.visitati}/${dopo.totale} punti scoperti`);
        } else {
          ko('esplorazione a piedi', 'nessun punto di interesse registrato');
        }
        // il diario si apre e mostra il conteggio
        await page.click('[data-hud="diario-apri"]');
        await page.waitForTimeout(500);
        const conta = Number(await page.textContent('[data-hud="diario-poi"]'));
        if (conta === dopo.visitati) ok('diario dell\'esplorazione', `${conta} luoghi`);
        else ko('diario dell\'esplorazione', `il diario dice ${conta}, lo stato ${dopo.visitati}`);
        await page.screenshot({ path: join(SHOTS, '06-diario.png') });
        await page.locator('[data-hud="diario"] .lugo-vetrina-chiudi').click();
        await page.waitForTimeout(300);
        // regola non negoziabile: nessuna attività risulta partner, e nessuna
        // promozione o logo compare senza autorizzazione dell'esercente
        const aut = await lugo('L.autorizzazioni()');
        const dichiarazioni = await page.evaluate(
          () => document.querySelectorAll('.lugo-vetrina-promo, .lugo-vetrina-partner').length,
        );
        if (aut.partner === 0 && aut.promo === 0 && aut.logo === 0 && dichiarazioni === 0) {
          ok('nessuna partnership dichiarata', '0 partner, 0 promo, 0 loghi');
        } else {
          ko(
            'nessuna partnership dichiarata',
            `partner ${aut.partner}, promo ${aut.promo}, loghi ${aut.logo}`,
          );
        }
      }

      // si torna in auto per le fasi successive
      let m3 = await lugo('L.mode()');
      for (let i = 0; i < 4 && m3 !== 'auto'; i++) {
        await page.keyboard.press('KeyE');
        await page.waitForTimeout(400);
        m3 = await lugo('L.mode()');
      }
    }
  }

  // ── costo di un fotogramma ────────────────────────────────────────────
  if ((await lugo('typeof L.render')) === 'function') {
    const r = await lugo('L.render()');
    const dettagli = `${(r.triangoli / 1000).toFixed(0)}k triangoli, ${r.chiamate} draw call`;
    if (r.triangoli > 0 && r.triangoli < 700_000 && r.chiamate < 170) {
      ok('costo del fotogramma', dettagli);
    } else {
      ko('costo del fotogramma', dettagli + ' — troppo per un telefono');
    }
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

  // ── fase 6: telefono ──────────────────────────────────────────────────
  // Il difetto peggiore trovato dall'audit: su telefono il pannello di una
  // bottega finiva SOTTO il joystick e non si poteva né usare né chiudere,
  // e il gioco restava bloccato per sempre. Qui si riproduce su uno schermo
  // vero da telefono, in verticale e in orizzontale.
  for (const [nome, w, h] of [['verticale', 390, 844], ['orizzontale', 844, 390]]) {
    const tel = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
    try {
      await tel.goto(URL, { waitUntil: 'load' });
      await tel.waitForFunction(() => window.__LUGO__ && window.__LUGO__.pronto === true, null, { timeout: 60000 });
      const s2 = tel.locator('[data-hud="salta-intro"]');
      if (await s2.count()) {
        await s2.click();
        await tel.waitForTimeout(300);
      }
      const g2 = tel.locator('[data-hud="gioca"]');
      if (await g2.count()) {
        await g2.click();
        await tel.waitForTimeout(900);
      }
      // si scende e ci si mette davanti a una bottega
      await tel.keyboard.press('KeyE');
      await tel.waitForTimeout(600);
      const negozi = await tel.evaluate(() => window.__LUGO__.attivita());
      if (negozi && negozi.length) {
        const n = negozi[0];
        await tel.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [n.x, n.z]);
        await tel.waitForTimeout(600);
        await tel.keyboard.press('KeyE');
        await tel.waitForTimeout(700);
      }
      const aperta = await tel.locator('[data-hud="vetrina"]').count();
      if (aperta) {
        // il click deve arrivare al tasto, non essere intercettato dal
        // joystick: si usa un click vero, senza forzature
        // Due controlli distinti, perché il difetto era di impilamento:
        // 1) sopra il tasto non c'è nient'altro (era il joystick a coprirlo);
        // 2) un click del mouse vero, alle coordinate del tasto, chiude.
        // Si usa mouse.click e non locator.click perché quest'ultimo resta
        // appeso ad aspettare una navigazione che in un gioco non arriva.
        const sopra = await tel.evaluate(() => {
          const b = document.querySelector('[data-hud="vetrina"] .lugo-vetrina-chiudi');
          if (!b) return null;
          const r = b.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const e = document.elementFromPoint(cx, cy);
          return { libero: Boolean(e && b.contains(e)), copertoDa: e ? e.className || e.tagName : null, cx, cy };
        });
        if (sopra && sopra.libero) ok(`telefono ${nome}: il tasto di chiusura è cliccabile`);
        else ko(`telefono ${nome}: il tasto di chiusura è cliccabile`, `coperto da ${sopra ? sopra.copertoDa : '?'}`);
        if (sopra) await tel.mouse.click(sopra.cx, sopra.cy);
        await tel.waitForTimeout(500);
        const ancora = await tel.locator('[data-hud="vetrina"]').count();
        if (ancora === 0) ok(`telefono ${nome}: la vetrina si chiude`);
        else ko(`telefono ${nome}: la vetrina si chiude`, 'il pannello resta a schermo');
      } else {
        ok(`telefono ${nome}: nessuna vetrina da chiudere`);
      }
      // nessun comando deve uscire dallo schermo
      const fuori = await tel.evaluate(() => {
        const nomi = ['.lugo-comandi', '.lugo-status', '.lugo-tachimetro', '.lugo-minimappa-box'];
        const male = [];
        for (const sel of nomi) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.top < -1 || r.left < -1 || r.bottom > innerHeight + 1 || r.right > innerWidth + 1) {
            male.push(`${sel} ${Math.round(r.top)},${Math.round(r.left)},${Math.round(r.bottom)},${Math.round(r.right)}`);
          }
        }
        return male;
      });
      if (!fuori.length) ok(`telefono ${nome}: comandi dentro lo schermo`);
      else ko(`telefono ${nome}: comandi dentro lo schermo`, fuori.join(' | '));
      await tel.screenshot({ path: join(SHOTS, `07-telefono-${nome}.png`) });
    } finally {
      await tel.close();
    }
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
