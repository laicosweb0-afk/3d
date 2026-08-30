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

  /**
   * Quanto si tiene giù un tasto di GIOCO (E, R, F).
   *
   * Il gioco campiona la tastiera una volta per FOTOGRAMMA, dentro
   * useFrame, e riconosce la pressione sul FRONTE: `interagisci &&
   * !interagiscePrima`. Playwright invece preme e rilascia in una decina di
   * millisecondi. In headless, dove il rasterizzatore è software e in
   * piazza Baracca un fotogramma può durare un decimo di secondo abbondante,
   * il tasto nasceva e moriva tutto dentro lo stesso intervallo fra due
   * fotogrammi: per il gioco non era mai stato premuto.
   *
   * È la ragione, unica e sola, per cui questo collaudo falliva a
   * intermittenza in fasi diverse a ogni giro — la vetrina che non si apre,
   * la bici che non si lascia, l'auto che non si prende — sempre dando la
   * colpa al gioco, che intanto funzionava benissimo. Tenendolo giù due
   * decimi e mezzo, un fotogramma lo vede di sicuro; e siccome il gioco
   * legge il fronte e non il livello, tenerlo premuto non fa MAI partire
   * due azioni al posto di una.
   */
  const TENUTO = { delay: 250 };

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
    // L'auto parte da ferma e la scena, in headless, gira molto più piano
    // del tempo reale: la finestra è larga apposta, così il collaudo misura
    // se l'auto si muove e non quanto è veloce il computer che la simula.
    const p0 = await lugo('L.pos()');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(7000);
    await page.keyboard.up('ArrowUp');
    const p1 = await lugo('L.pos()');
    const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (d > 2) ok('auto si muove', `${d.toFixed(1)} m in 7 s`);
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
    await page.keyboard.press('KeyE', TENUTO);
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
      await page.keyboard.press('KeyE', TENUTO);
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
        await page.keyboard.press('KeyE', TENUTO);
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

      // Il rilascio deve fermare davvero. La frenata è a tempo di GIOCO
      // (2,3 m/s a 22 m/s² sono ~105 ms simulati), ma il banco headless va
      // a singhiozzo: mezzo secondo d'orologio a volte vale due fotogrammi
      // scarsi, e la fase dichiarava «non si ferma» un personaggio che
      // stava ancora frenando. Si aspetta la quiete vera, con un tetto
      // largo: quello che si misura è CHE si ferma, non quanto è veloce il
      // computer che lo simula.
      await page
        .waitForFunction(() => window.__LUGO__.direzione().v < 0.05, null, { timeout: 8000 })
        .catch(() => {});
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

        // ── fase 3a-bis: la banda analogica del pad, in metri al secondo ──
        // Tre cure sul movimento a piedi, ognuna col suo metro:
        //  1) UNA zona morta sola: la palla muove già a ~10 px (prima la
        //     seconda soglia in character.ts mangiava la corsa fino a 13);
        //  2) la camminata piena (2,3 m/s) si raggiunge col solo stick;
        //  3) fra camminata e corsa NIENTE gradino: il regime cresce di al
        //     massimo ~0,5 m/s per pixel di palla (prima saltava di +2,7
        //     attraversando un pixel), e a fondo corsa restano i 5,2.
        const cxPad = box2.x + box2.width / 2;
        const cyPad = box2.y + box2.height / 2;
        // porta la palla a `px` pixel verso l'alto e misura la velocità di
        // regime: il massimo su più letture, perché le prime sono rampa e
        // virata (chi gira rallenta di proposito, character.ts)
        const regime = async (px) => {
          await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [centro.x, centro.z]);
          await page.waitForTimeout(250);
          await page.mouse.move(cxPad, cyPad);
          await page.mouse.down();
          await page.mouse.move(cxPad, cyPad - px, { steps: 4 });
          let v = 0;
          for (let i = 0; i < 5; i++) {
            await page.waitForTimeout(500);
            v = Math.max(v, (await lugo('L.direzione()')).v);
          }
          await page.mouse.up();
          await page.waitForTimeout(350);
          return v;
        };

        const vPoco = await regime(10);
        if (vPoco > 0.04 && vPoco < 0.6) ok('il pad muove già a 10 px', `${vPoco.toFixed(2)} m/s`);
        else ko('il pad muove già a 10 px', `v=${vPoco.toFixed(2)} m/s (attesa piccola ma viva)`);

        const vCamm = await regime(40);
        if (vCamm > 2.05 && vCamm < 2.55) ok('camminata piena col solo stick', `${vCamm.toFixed(2)} m/s a 40 px`);
        else ko('camminata piena col solo stick', `${vCamm.toFixed(2)} m/s a 40 px (attesi ~2.3)`);

        // la scala per pixel: da 40 a 46 px il regime sale morbido fino a 5,2
        const scala = [vCamm];
        for (let px = 41; px <= 46; px++) scala.push(await regime(px));
        let salto = 0;
        for (let i = 1; i < scala.length; i++) salto = Math.max(salto, scala[i] - scala[i - 1]);
        const vPiena = scala[scala.length - 1];
        const traccia = scala.map((v) => v.toFixed(2)).join('/');
        if (salto <= 0.85) ok('niente gradino fra camminata e corsa', `salto max ${salto.toFixed(2)} m/s per px · ${traccia}`);
        else ko('niente gradino fra camminata e corsa', `salto ${salto.toFixed(2)} m/s per 1 px di palla · ${traccia}`);
        if (vPiena > 4.85 && vPiena < 5.5) ok('corsa piena a fondo corsa', `${vPiena.toFixed(2)} m/s a 46 px`);
        else ko('corsa piena a fondo corsa', `${vPiena.toFixed(2)} m/s (attesi 5.2)`);

        // ── fase 3a-quater: due dita vere, pad e CORRI insieme ──────────
        // Il mouse è UN puntatore: tutte le prove qui sopra, per quanto
        // strapazzino la palla, non possono dire niente sul caso che al
        // telefono è la norma — un pollice sul pad e l'altro sul bottone.
        // È il caso che mette alla prova la contabilità dei puntatori di
        // Joystick.tsx (capture sul pad per il dito 1, capture sul bottone
        // per il dito 2): se il rilascio del SECONDO dito azzerasse il pad,
        // si camminerebbe a strappi ad ogni colpo di CORRI. Qui i tocchi
        // sono veri, via CDP.
        //
        // Attenzione alle semantiche, verificate a banco: in touchEnd i
        // touchPoints elencano i punti RILASCIATI, non quelli che restano.
        // Elencare i superstiti rilascia il dito sbagliato — e la prova
        // accuserebbe il gioco di un difetto che sta nel collaudo.
        {
          const cdp = await page.context().newCDPSession(page);
          const tocco = (type, punti) =>
            cdp.send('Input.dispatchTouchEvent', {
              type,
              touchPoints: punti.map(([id, x, y]) => ({ x, y, id })),
            });
          await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [centro.x, centro.z]);
          await page.waitForTimeout(250);
          const bCorri = await page.locator('button[aria-label="Corri"]').boundingBox();
          const cx2 = box2.x + box2.width / 2;
          const cy2 = box2.y + box2.height / 2;
          const bx = bCorri.x + bCorri.width / 2;
          const by = bCorri.y + bCorri.height / 2;
          // il regime si campiona col massimo su più letture, come sopra:
          // le prime sono rampa, non regime
          const regime2 = async (letture = 4) => {
            let v = 0;
            for (let i = 0; i < letture; i++) {
              await page.waitForTimeout(450);
              v = Math.max(v, (await lugo('L.direzione()')).v);
            }
            return v;
          };
          // dito 1 sul pad, a 32 px: metà banda della camminata (~1,7 m/s)
          await tocco('touchStart', [[1, cx2, cy2]]);
          await tocco('touchMove', [[1, cx2, cy2 - 32]]);
          const vDito = await regime2();
          // dito 2 giù su CORRI: stessa spinta, bersaglio da sprint
          await tocco('touchStart', [[1, cx2, cy2 - 32], [2, bx, by]]);
          const vDue = await regime2();
          // si molla SOLO il dito 2: il pad deve guidare ancora, alla
          // stessa velocità di prima — zero vorrebbe dire stick morto.
          // Si ASPETTA che la frenata dallo sprint sia finita (il banco
          // headless va a singhiozzo, una finestra fissa misurava la
          // rampa), poi si legge DUE volte a distanza: uno stick morto
          // passa per ~1,7 mentre muore, ma alla seconda lettura è a zero.
          await tocco('touchEnd', [[2, bx, by]]);
          await page
            .waitForFunction(() => window.__LUGO__.direzione().v < 2.05, null, { timeout: 8000 })
            .catch(() => {});
          const vRitorno = (await lugo('L.direzione()')).v;
          await page.waitForTimeout(900);
          const vTiene = (await lugo('L.direzione()')).v;
          await tocco('touchEnd', [[1, cx2, cy2 - 32]]);
          await page
            .waitForFunction(() => window.__LUGO__.direzione().v < 0.05, null, { timeout: 8000 })
            .catch(() => {});
          const vFine = (await lugo('L.direzione()')).v;
          const traccia2 = `${vDito.toFixed(2)} → ${vDue.toFixed(2)} → ${vRitorno.toFixed(2)}/${vTiene.toFixed(2)} → ${vFine.toFixed(3)} m/s`;
          if (
            vDito > 1.4 && vDito < 2.0 &&
            vDue > vDito + 1.2 &&
            Math.abs(vRitorno - vDito) < 0.5 &&
            Math.abs(vTiene - vDito) < 0.5 &&
            vFine < 0.05
          ) {
            ok('due dita: pad e CORRI insieme', traccia2);
          } else {
            ko('due dita: pad e CORRI insieme', traccia2 + ' (attesi ~1.7 → ~3.9 → ~1.7 → 0)');
          }
        }
      }

      // ── fase 3a-ter: niente sprint sul posto negli angoli concavi ─────
      // Il difetto stava nella rientranza del bar Jolly (49.8, 77):
      // incastrato con l'input a fondo corsa, la POSIZIONE restava
      // congelata ma la velocità riportata saliva a ~4,7 m/s e ci restava
      // — e l'animazione, che la legge, mostrava lo sprint completo coi
      // piedi a frullare contro il muro. Qui ci si spinge nell'angolo di
      // corsa in otto direzioni (le diagonali sono quelle che puntano il
      // vertice e congelano davvero) e si misura su DUE soglie:
      //  • finestra CONGELATA (< 2 cm): la velocità riportata deve essere
      //    ~zero (< 0.5 m/s), che è il criterio della diagnosi;
      //  • finestra quasi ferma (< 6 cm): mai una velocità da corsa
      //    (< 2.2 m/s). Non si pretende zero qui perché è il caso vero e
      //    misurato dello ZIG-ZAG: fra due pareti oblique il personaggio
      //    scivola ~2,7 cm a fotogramma alternando parete, un moto REALE
      //    che a passo di banco (dt saturato a 0,05 s) vale ~0,5 m/s di
      //    equilibrio — a 60 fps sono ~0,2. Pretendere zero lì vorrebbe
      //    dire bollare come bugia una velocità che dice il vero.
      // Il caso «mai incastrato» è un fallimento della prova, non un
      // successo: l'angolo esiste, e la prova deve mordere.
      {
        let bloccati = 0;
        let congelati = 0;
        const bugiardi = [];
        const spinte = [
          ['KeyW'], ['KeyD'], ['KeyS'], ['KeyA'],
          ['KeyW', 'KeyD'], ['KeyW', 'KeyA'], ['KeyS', 'KeyD'], ['KeyS', 'KeyA'],
        ];
        for (const tasti of spinte) {
          const nome = tasti.join('+');
          await page.evaluate(() => window.__LUGO__.teleport(49.8, 77));
          await page.waitForTimeout(300);
          await page.keyboard.down('ShiftLeft');
          for (const t of tasti) await page.keyboard.down(t);
          // due secondi per arrivare al muro e assestarsi
          await page.waitForTimeout(2000);
          for (let finestra = 0; finestra < 3; finestra++) {
            const p0 = await lugo('L.pos()');
            await page.waitForTimeout(700);
            const p1 = await lugo('L.pos()');
            const v = (await lugo('L.direzione()')).v;
            const mosso = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
            if (mosso < 0.02) {
              congelati++;
              if (v > 0.5) bugiardi.push(`${nome}: congelato (${mosso.toFixed(3)} m) ma v=${v.toFixed(2)} m/s`);
            }
            if (mosso < 0.06) {
              bloccati++;
              if (v > 2.2) bugiardi.push(`${nome}: quasi fermo (${mosso.toFixed(3)} m) ma v da corsa ${v.toFixed(2)} m/s`);
            }
          }
          for (const t of tasti) await page.keyboard.up(t);
          await page.keyboard.up('ShiftLeft');
          await page.waitForTimeout(400);
        }
        if (bloccati >= 1 && bugiardi.length === 0) {
          ok(
            'contro il muro la velocità dice il vero',
            `${bloccati} finestre quasi ferme (${congelati} congelate), mai una v da corsa sul posto`,
          );
        } else if (bloccati === 0) {
          ko('contro il muro la velocità dice il vero', 'mai incastrato al bar Jolly: la prova non ha morso');
        } else {
          ko('contro il muro la velocità dice il vero', bugiardi.join(' · '));
        }
      }

      await page.evaluate(() => window.__LUGO__.tempoScorre(true));
      // ── fase 3c-bis: la catena d'ingresso ──────────────────────────────
      // Le cinque missioni dell'MVP devono chiudersi davvero e pagare i
      // valori dichiarati: una tappa che punta dentro un muro le blocca
      // per sempre, ed è successo con il bar e con il teatro.
      if ((await lugo('typeof L.avviaMissione')) === 'function') {
        const attesi = {
          mvp1: [100, 50],
          mvp2: [150, 50],
          mvp3: [350, 100],
          mvp4: [500, 250],
          mvp5: [1000, 500],
        };
        let chiuse = 0;
        for (const id of Object.keys(attesi)) {
          const e0 = await lugo('L.denaro()');
          if (!(await page.evaluate((m) => window.__LUGO__.avviaMissione(m), id))) continue;
          if (id === 'mvp4') {
            const att = await lugo('L.attivita()');
            for (const a of att.slice(0, 14)) {
              await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [a.x, a.z]);
              await page.waitForTimeout(600);
              if ((await lugo('L.statoMissione()')) !== 'attiva') break;
            }
          }
          for (let giro = 0; giro < 10; giro++) {
            if ((await lugo('L.statoMissione()')) !== 'attiva') break;
            const t = await lugo('L.tappaCorrente()');
            if (!t) break;
            await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [t.x, t.z]);
            await page.waitForTimeout(850);
          }
          const stato = await lugo('L.statoMissione()');
          const guadagno = (await lugo('L.denaro()')) - e0;
          if (stato === 'completata' && Math.round(guadagno) === attesi[id][0]) chiuse++;
          else ko(`missione ${id}`, `stato ${stato}, +€${Math.round(guadagno)} invece di ${attesi[id][0]}`);
        }
        if (chiuse === Object.keys(attesi).length) {
          ok('catena d\'ingresso', `${chiuse} missioni completate coi premi giusti`);
        }
      }

      // ── fase 3d: livello e guardaroba ──────────────────────────────────
      const liv = await page.locator('[data-hud="livello"]').count();
      if (liv) ok('livello nell\'HUD', (await page.textContent('[data-hud="livello"]')) ?? '');
      else ko('livello nell\'HUD', 'nessun indicatore di livello');

      if (await page.locator('[data-hud="guardaroba-apri"]').count()) {
        await page.click('[data-hud="guardaroba-apri"]');
        await page.waitForTimeout(500);
        const soldiPrima = await lugo('L.denaro()');
        const disponibili = page.locator('.lugo-gr-capo:not(.lugo-gr-capo-fuori):not(.lugo-gr-capo-addosso)');
        if ((await disponibili.count()) > 0) {
          const box = await disponibili.first().boundingBox();
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(500);
          const soldiDopo = await lugo('L.denaro()');
          if (soldiDopo < soldiPrima) ok('acquisto nel guardaroba', `${soldiPrima} → ${soldiDopo}`);
          else ko('acquisto nel guardaroba', `il denaro non è cambiato (${soldiDopo})`);
        } else {
          ok('guardaroba aperto', 'nessun capo alla portata');
        }
        await page.locator('[data-hud="guardaroba"] .lugo-vetrina-chiudi').click({ noWaitAfter: true }).catch(() => {});
        await page.waitForTimeout(300);
      }

      // si torna in auto per le fasi successive
      let mA = await lugo('L.mode()');
      for (let i = 0; i < 4 && mA !== 'auto'; i++) {
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(400);
        mA = await lugo('L.mode()');
      }
    }
  }

  // ── fase 3b: la vetrina di un'attività ────────────────────────────────
  // si parte a mani libere: un pannello rimasto aperto dalle fasi prima
  // renderebbe muta la E, e la vetrina non si aprirebbe mai
  await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
  await page.waitForTimeout(200);
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
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(500);
      }
      await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [n.x, n.z]);
      await page.waitForTimeout(700);
      // La E si ripete finché la vetrina non si apre, e si tiene premuta
      // un attimo. Non è per aiutare il gioco: è perché il gioco legge il
      // tasto una volta per FOTOGRAMMA, e in headless — rasterizzatore
      // software, mezzo centro di Lugo in campo — un fotogramma può durare
      // più della pressione, che di suo dura una decina di millisecondi.
      // Il tasto veniva allora premuto e rilasciato fra un fotogramma e
      // l'altro, il gioco non lo vedeva proprio, e la fase dichiarava che
      // la vetrina non si apre su un gioco in cui si apriva benissimo.
      let aperta = 0;
      for (let colpo = 0; colpo < 4 && !aperta; colpo++) {
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(600);
        aperta = await page.locator('[data-hud="vetrina"]').count();
      }
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
        // la stessa E che apre la vetrina la richiude: da tastiera non si
        // resta mai chiusi dentro un pannello
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(400);
        if ((await page.locator('[data-hud="vetrina"]').count()) === 0) {
          ok('la E richiude la vetrina');
        } else {
          ko('la E richiude la vetrina', 'il pannello è rimasto aperto');
          await page
            .locator('[data-hud="vetrina"] .lugo-vetrina-chiudi')
            .click({ noWaitAfter: true })
            .catch(() => {});
        }
        await page.waitForTimeout(300);
      } else {
        const diag = {
          negozio: n.nome,
          mode: await lugo('L.mode()'),
          pos: await lugo('L.pos()'),
          bacheca: await page.locator('[data-hud="bacheca"]').count(),
          dialogo: await page.locator('[data-hud="dialogo"]').count(),
        };
        ko('vetrina attività', 'la vetrina non si è aperta · ' + JSON.stringify(diag));
      }
      // ── fase 3c: esplorazione e distintivi ─────────────────────────────
      if ((await lugo('typeof L.esplorazione')) === 'function') {
        const prima = await lugo('L.esplorazione()');
        const monumenti = await lugo('L.poi');
        // Giro dei monumenti veri, a piedi: ogni tappa deve entrare nel
        // diario. A ogni fermata si ASPETTA che la scoperta arrivi, invece
        // di contare su nove decimi di secondo fissi.
        //
        // Il motivo è una corsa che questa fase perdeva a intermittenza. La
        // scansione di Player.tsx cerca un punto ogni 0,35 s, ma solo se a
        // schermo non c'è già una scheda di scoperta — e quella scheda resta
        // su da 1,9 a 5,2 secondi secondo il tipo di luogo. In headless il
        // rasterizzatore è software, i fotogrammi sono pochi e novecento
        // millisecondi di orologio possono essere molto meno di mondo:
        // capitava di attraversare tutta Lugo con la scheda della fermata
        // precedente ancora aperta, non scoprire niente da nessuna parte, e
        // leggere «nessun punto di interesse registrato» su un gioco che
        // funzionava benissimo. La soglia resta quella di prima — almeno un
        // punto nuovo — è l'attesa che smette di tirare a indovinare.
        for (const id of Object.keys(monumenti)) {
          const contaPrima = (await lugo('L.esplorazione()')).visitati;
          await page.evaluate((p) => window.__LUGO__.teleport(p.x, p.z), monumenti[id]);
          for (let giro = 0; giro < 12; giro++) {
            await page.waitForTimeout(300);
            if ((await lugo('L.esplorazione()')).visitati > contaPrima) break;
          }
        }
        const dopo = await lugo('L.esplorazione()');
        if (dopo.visitati > prima.visitati) {
          ok('esplorazione a piedi', `${dopo.visitati}/${dopo.totale} punti scoperti`);
        } else {
          ko('esplorazione a piedi', 'nessun punto di interesse registrato');
        }
        // Il diario si apre e mostra il conteggio. La scoperta però continua
        // mentre il pannello si apre: si legge lo stato PRIMA e DOPO il
        // numero a schermo, e il diario è giusto se sta fra i due — un punto
        // scoperto nel frattempo non è un errore del diario.
        await page.click('[data-hud="diario-apri"]');
        await page.waitForTimeout(500);
        const primaDelDiario = (await lugo('L.esplorazione()')).visitati;
        const conta = Number(await page.textContent('[data-hud="diario-poi"]'));
        const dopoIlDiario = (await lugo('L.esplorazione()')).visitati;
        const min = Math.min(primaDelDiario, dopoIlDiario);
        const max = Math.max(primaDelDiario, dopoIlDiario);
        if (conta >= min && conta <= max) ok('diario dell\'esplorazione', `${conta} luoghi`);
        else ko('diario dell\'esplorazione', `il diario dice ${conta}, lo stato ${min}–${max}`);
        // ── incarichi del giorno e della settimana ──────────────────────
        // Cinque traguardi che si riempiono giocando: qui se ne completa
        // uno di forza e si controlla che il premio si possa incassare una
        // volta sola.
        if ((await lugo('typeof L.incarichi')) === 'function') {
          const elencati = await page.locator('[data-hud="incarichi"] .lugo-incarico').count();
          if (elencati === 5) ok('incarichi del giorno e della settimana', '3 di oggi, 2 della settimana');
          else ko('incarichi del giorno e della settimana', `${elencati} incarichi a schermo`);

          // si sceglie un incarico ANCORA da fare: giocando fin qui qualcuno
          // potrebbe essersi già completato da solo (i luoghi scoperti, gli
          // euro delle missioni), e quello direbbe poco
          const stato0 = await lugo('L.incarichi()');
          const scelto = stato0.giorno.find((i) => !i.completo) ?? stato0.giorno[0];
          const prontiPrima = stato0.pronti;
          const bottoniPrima = await page.locator('[data-hud="incarico-riscuoti"]').count();
          await page.evaluate(
            ([m, q]) => window.__LUGO__.avanzaIncarico(m, q),
            [scelto.metrica, scelto.quanto],
          );
          await page.waitForTimeout(300);
          const pronti = await lugo('L.incarichi().pronti');
          if (pronti === prontiPrima + 1) ok('incarico completato', scelto.titolo);
          else ko('incarico completato', `pronti ${prontiPrima} → ${pronti} dopo +${scelto.quanto} ${scelto.metrica}`);

          const badge = await page.locator('[data-hud="incarichi-pronti"]').count();
          if (badge) ok('avviso sul diario', 'il premio da riscuotere si vede');
          else ko('avviso sul diario', 'nessun avviso sul tasto del diario');

          const prima = { rep: await lugo('L.punteggio()'), euro: await lugo('L.denaro()') };
          // si preme il tasto DI QUELL'incarico, non il primo che capita:
          // altri possono essere pronti, e il premio atteso sarebbe un altro
          const premuto = await page.evaluate((titolo) => {
            const gruppo = document.querySelector('[data-hud="incarichi"] .lugo-incarichi-gruppo');
            for (const riga of gruppo ? gruppo.querySelectorAll('.lugo-incarico') : []) {
              if (riga.querySelector('.lugo-incarico-nome')?.textContent !== titolo) continue;
              const b = riga.querySelector('[data-hud="incarico-riscuoti"]');
              if (!b) return false;
              b.click();
              return true;
            }
            return false;
          }, scelto.titolo);
          if (premuto) {
            await page.waitForTimeout(400);
            const dopoRep = await lugo('L.punteggio()');
            const dopoEuro = await lugo('L.denaro()');
            // gli euro arrivano solo dall'incarico, quindi devono tornare
            // esatti; la reputazione può crescere anche per un punto di
            // interesse scoperto proprio in quell'istante
            const dRep = dopoRep - prima.rep;
            if (dRep >= scelto.rep && dRep <= scelto.rep + 60 && Math.round(dopoEuro - prima.euro) === scelto.denaro) {
              ok('premio dell\'incarico', `+€${scelto.denaro} · +${scelto.rep} REP`);
            } else {
              ko(
                'premio dell\'incarico',
                `atteso +€${scelto.denaro}/+${scelto.rep} REP, arrivato +€${(dopoEuro - prima.euro).toFixed(2)}/+${dopoRep - prima.rep} REP`,
              );
            }
            // il premio si incassa una volta sola: quel tasto non c'è più,
            // e gli altri incarichi pronti restano da riscuotere
            const ancora = await page.locator('[data-hud="incarico-riscuoti"]').count();
            const riscosso = await page.evaluate(
              (titolo) =>
                window.__LUGO__
                  .incarichi()
                  .giorno.filter((i) => i.riscosso && i.titolo === titolo).length,
              scelto.titolo,
            );
            if (riscosso === 1 && ancora === bottoniPrima) ok('premio riscosso una volta sola');
            else
              ko(
                'premio riscosso una volta sola',
                `riscossi ${riscosso}, tasti ${bottoniPrima} → ${ancora} (atteso ${bottoniPrima})`,
              );
          } else {
            ko('premio dell\'incarico', 'nessun tasto RISCUOTI a schermo');
          }
        }

        // ── il calendario degli eventi ──────────────────────────────────
        // Gli eventi hanno una finestra nel calendario vero, non solo
        // nell'orologio del gioco: il mercato non c'è la domenica, il giro
        // in bici è domenicale, le luci d'inverno non stanno accese ad
        // agosto. Qui si interroga con date vere.
        if ((await lugo('typeof L.eventiAllOra')) === 'function') {
          const prove = [
            ['domenica: niente mercato', 9, '2026-08-30', 'mercato_pavaglione', false],
            ['domenica: c’è il raduno', 9, '2026-08-30', 'raduno_rocca', true],
            ['sabato: c’è il mercato', 9, '2026-08-29', 'mercato_pavaglione', true],
            ['venerdì d’agosto: si suona', 20, '2026-08-28', 'musica_baracca', true],
            ['venerdì di dicembre: non si suona', 20, '2026-12-25', 'musica_baracca', false],
            ['dicembre: luci accese', 18, '2026-12-25', 'luci_inverno', true],
            ['epifania: luci ancora accese', 18, '2027-01-05', 'luci_inverno', true],
            ['agosto: niente luci', 18, '2026-08-28', 'luci_inverno', false],
          ];
          const sbagliate = [];
          for (const [nome, ora, giorno, id, atteso] of prove) {
            const elenco = await page.evaluate(
              ([o, g]) => window.__LUGO__.eventiAllOra(o, g),
              [ora, giorno],
            );
            if (elenco.includes(id) !== atteso) sbagliate.push(nome);
          }
          if (sbagliate.length === 0) ok('calendario degli eventi', `${prove.length} prove`);
          else ko('calendario degli eventi', sbagliate.join('; '));

          const righe = await page.locator('[data-hud="programma"]').count();
          if (righe) ok('programma della giornata nel diario');
          else ko('programma della giornata nel diario', 'la sezione non c\'è');
        }

        await page.screenshot({ path: join(SHOTS, '06-diario.png') });
        await page
          .locator('[data-hud="diario"] .lugo-vetrina-chiudi')
          .click({ noWaitAfter: true })
          .catch(() => {});
        await page.waitForTimeout(300);
        // regola non negoziabile: nessuna attività risulta partner, e nessuna
        // promozione o logo compare senza autorizzazione dell'esercente
        const aut = await lugo('L.autorizzazioni()');
        const dichiarazioni = await page.evaluate(
          () => document.querySelectorAll('.lugo-vetrina-promo, .lugo-vetrina-partner').length,
        );
        const targhette = await page.evaluate(
          () => document.querySelectorAll('.lugo-vetrina-partner').length,
        );
        if (
          aut.partner === 0 &&
          aut.promo === 0 &&
          aut.logo === 0 &&
          (aut.livelli ?? 0) === 0 &&
          dichiarazioni === 0 &&
          targhette === 0
        ) {
          ok('nessuna partnership dichiarata', '0 partner, 0 promo, 0 loghi, 0 livelli');
        } else {
          ko(
            'nessuna partnership dichiarata',
            `partner ${aut.partner}, promo ${aut.promo}, loghi ${aut.logo}, livelli ${aut.livelli ?? 0}`,
          );
        }
      }

      // si torna in auto per le fasi successive
      let m3 = await lugo('L.mode()');
      for (let i = 0; i < 4 && m3 !== 'auto'; i++) {
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(400);
        m3 = await lugo('L.mode()');
      }
    }
  }

  // ── costo di un fotogramma ────────────────────────────────────────────
  // Si misura in QUATTRO punti e si tiene il peggiore. Con una misura sola
  // il numero dipendeva da dove il collaudo si era fermato per caso, e il
  // punto peggiore di Lugo — piazza Baracca, dove si vedono insieme il
  // Pavaglione, la stele, la giostra, i banchi e mezzo centro — non veniva
  // guardato mai. Un tetto che non si controlla dove serve non è un tetto.
  if ((await lugo('typeof L.render')) === 'function') {
    const poiCosto = (await lugo('L.poi')) ?? {};
    const punti = [
      ['dove sei', null],
      ['pavaglione', poiCosto.pavaglione],
      ['baracca', poiCosto.baracca],
      ['rocca', poiCosto.rocca],
    ].filter(([, p]) => p !== undefined);
    let peggio = { nome: '', triangoli: 0, chiamate: 0 };
    const misure = [];
    for (const [nome, p] of punti) {
      if (p) {
        // il giocatore va DOVE guarda la camera: la mappa delle ombre segue
        // lui, non l'inquadratura, e misurare la camera in piazza mentre il
        // giocatore è in campagna dava un numero che non capita mai
        await page.evaluate((q) => window.__LUGO__.teleport(q.x + 12, q.z + 12), p);
        await page.evaluate(
          (q) => window.__LUGO__.fotocamera(q.x + 26, 12, q.z + 26, q.x, 3, q.z, 2500),
          p,
        );
        await page.waitForTimeout(900);
      }
      const r = await lugo('L.render()');
      misure.push(`${nome} ${r.chiamate}`);
      if (r.chiamate > peggio.chiamate) peggio = { nome, triangoli: r.triangoli, chiamate: r.chiamate };
    }
    const dettagli = `${(peggio.triangoli / 1000).toFixed(0)}k triangoli, ${peggio.chiamate} draw call · ${misure.join(' | ')}`;
    if (peggio.triangoli > 0 && peggio.triangoli < 700_000 && peggio.chiamate < 170) {
      ok('costo del fotogramma', dettagli);
    } else {
      // quando sfora si dice anche DOVE si spende: senza, la volta dopo si
      // tira a indovinare
      const spesa = (await lugo('typeof L.spesa === "function" ? L.spesa() : []')) ?? [];
      const chi = spesa
        .slice(0, 6)
        .map((x) => `${x.nome}×${x.mesh}`)
        .join(', ');
      ko('costo del fotogramma', dettagli + ' — troppo per un telefono · ' + chi);
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

  // ── fase 3d: le insegne delle botteghe ────────────────────────────────
  // Una bottega deve riconoscersi da lontano: la fascia col nome sulla
  // cimasa vera del suo muro, il tendone, e il simbolo di mestiere sulla
  // bandiera perpendicolare. E nessun logo di nessuno senza autorizzazione.
  if ((await lugo('typeof L.insegne')) === 'function') {
    const ins = await lugo('L.insegne()');
    if (ins && ins.cartelli > 0) {
      ok('insegne delle botteghe', `${ins.cartelli} botteghe, ${Object.keys(ins.simboli).length} simboli diversi`);
    } else {
      ko('insegne delle botteghe', 'nessuna insegna costruita');
    }
    if (ins && ins.sovrapposte === 0) ok('insegne che non si accavallano');
    else ko('insegne che non si accavallano', `${ins?.sovrapposte} coppie sullo stesso muro`);
    // qualche bottega di OpenStreetMap è un nodo in mezzo a un piazzale, con
    // il palazzo più vicino a dieci metri buoni: quelle restano senza muro,
    // ed è un dato, non un difetto. Se diventano tante, invece, è un difetto.
    if (ins && ins.senzaMuro <= 3) ok('ogni insegna ha il suo muro', `${ins.senzaMuro} senza, su ${ins.cartelli}`);
    else ko('ogni insegna ha il suo muro', `${ins?.senzaMuro} botteghe senza edificio`);
    // la regola non negoziabile, misurata: nessun logo finché nessuno ha
    // autorizzato niente
    const aut = await lugo('L.autorizzazioni()');
    if (ins && ins.loghi === 0 && aut.partner === 0) ok('nessun logo senza autorizzazione', '0 loghi a schermo');
    else ko('nessun logo senza autorizzazione', `${ins?.loghi} loghi, ${aut.partner} partner`);

    // le cartoline: la stessa bottega da tre distanze
    const bot = await lugo('L.bottega(0)');
    if (bot) {
      await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
      for (const [nome, d, alt] of [['vicino', 9, 3.2], ['via', 24, 5], ['lontano', 55, 9]]) {
        await page.evaluate(
          ([b, dist, h]) =>
            window.__LUGO__.fotocamera(
              b.x + b.nx * dist,
              h,
              b.z + b.nz * dist,
              b.x,
              b.y + 0.3,
              b.z,
              4000,
            ),
          [bot, d, alt],
        );
        await page.waitForTimeout(800);
        await page.screenshot({ path: join(SHOTS, `03-insegna-${nome}.png`) });
      }
      ok('cartoline delle insegne', `${bot.nome} · ${bot.simbolo}`);
    }
  }

  // ── fase 4b: le missioni che nascono dalle attività vere ──────────────
  // Un'attività di Lugo non deve essere solo un cartello: deve poter essere
  // il posto dove una missione ti manda. Qui si controlla che il registro
  // arrivi alle missioni, che la missione si generi e che si possa chiudere.
  if ((await lugo('typeof L.missioneAttivita')) === 'function') {
    const quante = await lugo('L.attivitaConMissioni()');
    if (quante > 0) ok('attività che ospitano missioni', String(quante));
    else ko('attività che ospitano missioni', 'il registro non è mai arrivato alle missioni');

    const esito = await page.evaluate(async () => {
      const L = window.__LUGO__;
      const scheda = L.missioneAttivita(0);
      if (!scheda) return { scheda: null };
      const prima = { rep: L.punteggio(), euro: L.denaro() };
      L.avviaMissione(scheda.id);
      const t = L.tappaCorrente();
      if (!t) return { scheda, tappa: null };
      L.teleport(t.x, t.z);
      await new Promise((r) => setTimeout(r, 1600));
      return {
        scheda,
        tappa: t,
        prima,
        dopo: { rep: L.punteggio(), euro: L.denaro() },
        stato: L.statoMissione(),
      };
    });
    if (!esito.scheda) {
      ko('missione di attività', 'nessuna attività registrata');
    } else if (!esito.scheda.attivitaId) {
      ko('missione di attività', 'la missione non è legata a nessuna attività');
    } else if (esito.dopo && esito.dopo.rep > esito.prima.rep && esito.dopo.euro > esito.prima.euro) {
      ok(
        'missione di attività',
        `${esito.scheda.titolo} · +${esito.dopo.rep - esito.prima.rep} REP · +€${
          esito.dopo.euro - esito.prima.euro
        }`,
      );
    } else {
      ko('missione di attività', JSON.stringify(esito));
    }
  }

  // ── fase 4c: la bacheca dei lavori ────────────────────────────────────
  // Nei luoghi grandi di Lugo si sceglie cosa fare invece di aspettare che
  // una missione parta da sola. Qui si apre la bacheca, si accetta un
  // lavoro e si controlla che diventi la missione attiva.
  if ((await lugo('L.mode()')) === 'auto') {
    await page.keyboard.down('Space');
    await page.waitForTimeout(900);
    await page.keyboard.up('Space');
    await page.keyboard.press('KeyE', TENUTO);
    await page.waitForTimeout(500);
  }
  const luoghi = await lugo('L.poi');
  let bacheca = null;
  for (const id of ['pavaglione', 'rocca', 'baracca', 'stazione']) {
    const p = luoghi?.[id];
    if (!p) continue;
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
    await page.evaluate((q) => window.__LUGO__.teleport(q.x, q.z), p);
    await page.waitForTimeout(600);
    await page.keyboard.press('KeyE', TENUTO);
    await page.waitForTimeout(500);
    if (await page.locator('[data-hud="bacheca"]').count()) {
      bacheca = id;
      break;
    }
  }
  if (bacheca) {
    const offerte = await page.locator('[data-hud="bacheca"] .lugo-offerta').count();
    if (offerte >= 2) ok('bacheca dei lavori', `${bacheca}: ${offerte} proposte`);
    else ko('bacheca dei lavori', `${offerte} proposte`);
    await page.screenshot({ path: join(SHOTS, '04-bacheca.png') });

    const primo = page.locator('[data-hud="bacheca-accetta"]').first();
    await primo.click({ noWaitAfter: true }).catch(() => {});
    await page.waitForTimeout(600);
    const stato = await lugo('L.statoMissione()');
    const chiusa = (await page.locator('[data-hud="bacheca"]').count()) === 0;
    if (stato === 'attiva' && chiusa) ok('lavoro accettato dalla bacheca');
    else ko('lavoro accettato dalla bacheca', `stato ${stato}, pannello ${chiusa ? 'chiuso' : 'aperto'}`);

    // una missione a tempo accettata dalla bacheca deve avere il suo conto
    // alla rovescia: senza, fallirebbe al primo fotogramma
    const residuo = await lugo('L.tempoResiduo ? L.tempoResiduo() : null');
    if (residuo === null || residuo === undefined || residuo > 0) {
      ok('conto alla rovescia del lavoro accettato', residuo ? `${residuo} s` : 'senza tempo');
    } else {
      ko('conto alla rovescia del lavoro accettato', `${residuo} s`);
    }
  } else {
    ko('bacheca dei lavori', 'nessuna bacheca si è aperta');
  }

  // ── fase 4d: la tastiera sui comandi dello schermo ────────────────────
  // Lo Spazio è il freno a mano nel gioco, ma su un bottone col fuoco deve
  // premere il bottone; l'Invio è «interagisci», ma su un bottone col fuoco
  // deve fare solo quello che fa il bottone.
  await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
  await page.waitForTimeout(200);
  if (await page.locator('[data-hud="diario-apri"]').count()) {
    await page.focus('[data-hud="diario-apri"]');
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    if (await page.locator('[data-hud="diario"]').count()) {
      ok('lo Spazio preme il bottone col fuoco');
    } else {
      ko('lo Spazio preme il bottone col fuoco', 'il diario non si è aperto');
    }

    const modePrima = await lugo('L.mode()');
    await page.focus('[data-hud="diario-apri"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const modeDopo = await lugo('L.mode()');
    if (modeDopo === modePrima) {
      ok("l'Invio su un bottone non comanda il gioco");
    } else {
      ko("l'Invio su un bottone non comanda il gioco", `da ${modePrima} a ${modeDopo}`);
    }
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.waitForTimeout(200);
  }

  // ── fase 5: NPC ───────────────────────────────────────────────────────
  const npc = await lugo('typeof L.npcCount === "function" ? L.npcCount() : undefined');
  if (npc !== undefined) {
    if (npc > 0) ok('NPC presenti', String(npc));
    else ko('NPC presenti', 'npcCount=0');
  }

  // ── fase 5b: i maranza, la sigaretta, il fumo e il pugno ──────────────
  // La scena che l'utente ha chiesto: uno si stacca dal gruppetto, ti viene
  // incontro, ti chiede una sigaretta con un fumetto vero sopra la testa,
  // insiste se dici di no, e tu puoi dargliela, tirargli un pugno o
  // scappare. Qui si misura che tutte e cinque le cose succedano davvero.
  // In collaudo l'incontro non parte MAI da solo (vedi INCONTRO in
  // lib/lugo/maranza.ts): lo si provoca, se no un pannello a sorpresa
  // spaccherebbe le fasi che stanno misurando vetrine e bacheca.
  if ((await lugo('typeof L.provocaIncontro')) === 'function') {
    const aPiedi = async () => {
      if ((await lugo('L.mode()')) === 'auto') {
        await page.keyboard.down('Space');
        await page.waitForTimeout(1200);
        await page.keyboard.up('Space');
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(600);
      }
    };
    // normalizza apostrofi, virgolette e spazi: il pannello scrive la
    // battuta fra virgolette alte, il fumetto la disegna nuda
    const nudo = (t) => (t ?? '').replace(/[“”"«»]/g, '').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
    // Provoca un incontro e aspetta che il maranza sia ARRIVATO: è lui che
    // cammina fin qui, con la macchina a stati vera, non un teletrasporto.
    const provoca = async () => {
      await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
      await page.waitForTimeout(300);
      const i = await lugo('L.provocaIncontro()');
      if (i < 0) return null;
      const partenza = await lugo('L.incontro().distanza');
      try {
        await page.waitForFunction(() => window.__LUGO__.incontro().fase === 'chiede', null, { timeout: 30000 });
      } catch {
        return { i, partenza, arrivato: false };
      }
      return { i, partenza, arrivato: true };
    };

    await aPiedi();

    // i maranza restano diversi fra loro: è il controllo che impedisce a
    // una futura semplificazione di ricollassare l'incarnato sul vestito
    const mar = await lugo('L.maranza()');
    if (mar && mar.pelli >= 6 && mar.tute >= 5 && mar.senzaCappello > 0) {
      ok('i maranza sono diversi fra loro', `${mar.totali} in giro · ${mar.pelli} incarnati, ${mar.tute} tute, ${mar.senzaCappello} a testa nuda`);
    } else {
      ko('i maranza sono diversi fra loro', JSON.stringify(mar));
    }
    if (mar && mar.fumatori >= mar.totali * 0.25 && mar.fumatori <= mar.totali * 0.8) {
      ok('chi fuma e chi no', `${mar.fumatori} fumatori su ${mar.totali}`);
    } else {
      ko('chi fuma e chi no', JSON.stringify(mar));
    }

    // il costo del fotogramma prima dell'incontro, MISURATO QUI: il budget
    // va confrontato nello stesso punto della città, se no si mettono a
    // confronto piazza Baracca e un vicolo
    const renderPrima = (await lugo('typeof L.render === "function" ? L.render() : null')) ?? null;

    const primo = await provoca();
    if (!primo) {
      ko('il maranza ti viene incontro', 'nessun maranza in mappa');
    } else if (!primo.arrivato) {
      ko('il maranza ti viene incontro', `resta in fase ${await lugo('L.incontro().fase')}`);
    } else {
      const inc = await lugo('L.incontro()');
      if (primo.partenza >= 4.5 && inc.distanza < 3.4 && typeof inc.frase === 'string' && inc.frase.length) {
        ok('il maranza ti viene incontro', `da ${primo.partenza.toFixed(1)} m a ${inc.distanza.toFixed(1)} m · «${inc.frase}»`);
      } else {
        ko('il maranza ti viene incontro', `partenza ${primo.partenza}, arrivo ${inc.distanza}, frase ${inc.frase}`);
      }
      await page.screenshot({ path: join(SHOTS, '08-maranza-chiede.png') });

      // il fumetto sopra la testa dice la STESSA cosa del pannello
      const f = await lugo('L.fumetti()');
      const testoHud = await page.textContent('[data-hud="dialogo-testo"]').catch(() => null);
      const aggancio = await lugo('L.frasi("aggancio")');
      if (f && f.vivi >= 1 && nudo(f.testi[0]) === nudo(testoHud) && aggancio.includes(f.testi[0])) {
        ok('il fumetto dice quello che dice il pannello', `«${f.testi[0]}»`);
      } else {
        ko('il fumetto dice quello che dice il pannello', `fumetto «${f && f.testi[0]}» pannello «${testoHud}»`);
      }

      // il budget regge anche a incontro in corso (fumetto + fumo + sigarette)
      const renderDopo = (await lugo('typeof L.render === "function" ? L.render() : null')) ?? null;
      if (renderPrima && renderDopo) {
        const piu = renderDopo.chiamate - renderPrima.chiamate;
        const dettaglio = `${(renderDopo.triangoli / 1000).toFixed(0)}k triangoli, ${renderDopo.chiamate} draw call (a riposo ${renderPrima.chiamate}, +${piu})`;
        if (renderDopo.triangoli < 700_000 && renderDopo.chiamate < 170 && piu <= 2) {
          ok('il budget regge anche a incontro in corso', dettaglio);
        } else {
          ko('il budget regge anche a incontro in corso', dettaglio);
        }
      }

      // il fumo si vede: si campiona qualche volta, perché il filo esce
      // ogni mezzo secondo e la boccata ogni sette
      let fumoMax = 0;
      let fumoSforo = false;
      for (let i = 0; i < 5; i++) {
        const fu = await lugo('L.fumo()');
        fumoMax = Math.max(fumoMax, fu.vivi);
        if (fu.vivi > fu.max) fumoSforo = true;
        await page.waitForTimeout(700);
      }
      if (fumoMax > 0 && !fumoSforo) ok('il fumo della sigaretta si vede', `fino a ${fumoMax} particelle vive`);
      else ko('il fumo della sigaretta si vede', `massimo ${fumoMax} particelle`);

      // la cartolina ravvicinata: qui dentro si devono vedere il fumetto,
      // la sigaretta in mano e il filo di fumo
      // La cartolina si punta sul MARANZA e da DAVANTI, all'altezza della
      // mano: la sigaretta è lì, e dal punto di vista di chi gioca il
      // pannello del dialogo la copre per intero. Il pannello si toglie di
      // mezzo (l'incontro va avanti lo stesso), se no la cartolina
      // mostrerebbe soprattutto sé stessa.
      await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
      const lui = await lugo('L.incontro()');
      const io = await lugo('L.pos()');
      await page.evaluate(
        (q) => {
          const fx = (q.px - q.x) / (Math.hypot(q.px - q.x, q.pz - q.z) || 1);
          const fz = (q.pz - q.z) / (Math.hypot(q.px - q.x, q.pz - q.z) || 1);
          window.__LUGO__.fotocamera(
            q.x + fx * 2.4 - fz * 1.4,
            1.72,
            q.z + fz * 2.4 + fx * 1.4,
            q.x,
            1.26,
            q.z,
            4000,
          );
        },
        { x: lui.x, z: lui.z, px: io[0], pz: io[1] },
      );
      await page.waitForTimeout(1400);
      await page.screenshot({ path: join(SHOTS, '08-maranza-fumo.png') });

      // ── l'insistenza: se dici di no, non se ne va subito ──────────────
      const quarto = await provoca();
      if (!quarto || !quarto.arrivato) ko('insiste, dopo il no', 'nessun incontro da cui ripartire');
      const primaFrase = (await lugo('L.incontro()')).frase;
      const puntiPrima = await lugo('L.punteggio()');
      await page.click('[data-hud="dialogo-opzione-no"]', { noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(2200);
      const dopoNo = await lugo('L.incontro()');
      const insistenze = await lugo('L.frasi("insistenza")');
      if (dopoNo.fase === 'insiste' && dopoNo.frase !== primaFrase && insistenze.includes(dopoNo.frase)) {
        ok('insiste, dopo il no', `«${dopoNo.frase}»`);
      } else {
        ko('insiste, dopo il no', `fase ${dopoNo.fase}, frase «${dopoNo.frase}»`);
      }
      // altri due no: dopo i giri di insistenza si arrende da solo
      for (let i = 0; i < 2; i++) {
        await page.click('[data-hud="dialogo-opzione-no"]', { noWaitAfter: true }).catch(() => {});
        await page.waitForTimeout(2200);
      }
      const arreso = await lugo('L.incontro()');
      const puntiDopo = await lugo('L.punteggio()');
      const chiuso = await page.locator('[data-hud="dialogo"]').count();
      if ((arreso.fase === 'ritirata' || arreso.fase === 'nessuno') && puntiDopo - puntiPrima === 5 && chiuso === 0) {
        ok('tenere i nervi paga', `+${puntiDopo - puntiPrima} REP · «${arreso.ultimaFrase}»`);
      } else {
        ko('tenere i nervi paga', `fase ${arreso.fase}, REP +${puntiDopo - puntiPrima}, pannelli ${chiuso}`);
      }
      const cooldownUno = (await lugo('L.incontro()')).cooldown;

      // ── il pugno: parte, va a segno, e lo fa scappare ─────────────────
      const secondo = await provoca();
      if (secondo && secondo.arrivato) {
        const dPrima = (await lugo('L.incontro()')).distanza;
        // il tasto si tiene premuto: in headless la simulazione gira a
        // singhiozzo, e una pressione da dieci millisecondi può cadere
        // tutta in mezzo a due fotogrammi senza essere mai vista
        await page.keyboard.down('KeyF');
        await page.waitForTimeout(200);
        const colpoVivo = await lugo('L.pugno()');
        await page.keyboard.up('KeyF');
        await page.waitForTimeout(900);
        const colpo = await lugo('L.pugno()');
        if (colpoVivo.t > 0) ok("l'animazione del pugno parte davvero", `t=${colpoVivo.t.toFixed(2)} s`);
        else ko("l'animazione del pugno parte davvero", `t=${colpoVivo.t}`);
        if (colpo.bersaglio === 'maranza' && colpo.molesto === true) {
          ok('il pugno prende chi ti stava addosso', `${colpo.compagni} compagni si allontanano`);
        } else {
          ko('il pugno prende chi ti stava addosso', JSON.stringify(colpo));
        }
        await page.screenshot({ path: join(SHOTS, '08-maranza-pugno.png') });
        await page.waitForTimeout(2600);
        const dDopo = (await lugo('L.incontro()')).distanza;
        const restaAperto = await page.locator('[data-hud="dialogo"]').count();
        const faseDopo = (await lugo('L.incontro()')).fase;
        if (dDopo - dPrima > 1.2 && (faseDopo === 'ritirata' || faseDopo === 'nessuno') && restaAperto === 0) {
          ok('dopo il pugno scappa e il pannello sparisce', `da ${dPrima.toFixed(1)} a ${dDopo.toFixed(1)} m`);
        } else {
          ko('dopo il pugno scappa e il pannello sparisce', `da ${dPrima.toFixed(1)} a ${dDopo.toFixed(1)} m, fase ${faseDopo}, pannelli ${restaAperto}`);
        }
        // niente REP tolti a chi ti stava molestando, e il cooldown cresce
        const cooldownDue = (await lugo('L.incontro()')).cooldown;
        if (cooldownDue > cooldownUno && cooldownUno > 0) {
          ok('più ti è già capitato, più diventa raro', `${cooldownUno.toFixed(0)} s → ${cooldownDue.toFixed(0)} s`);
        } else {
          ko('più ti è già capitato, più diventa raro', `${cooldownUno} → ${cooldownDue}`);
        }
      } else {
        ko('il pugno prende chi ti stava addosso', 'il secondo incontro non è arrivato');
      }

      // ── la fuga: correndo lo si semina, e il pannello si chiude ───────
      //
      // Prima di provocare l'incontro ci si mette in carreggiata. Non è
      // pignoleria: a questo punto del collaudo il giocatore sta dove
      // l'hanno lasciato tre incontri e un pugno, e capitava che
      // cominciasse la corsa col muso contro una facciata. Con la W che
      // spinge in un muro la velocità non passa mai i 4 m/s della fuga,
      // nessuno si semina, e la fase falliva su un gioco che funzionava
      // benissimo — a intermittenza, che è il modo peggiore.
      const dovePartire = await lugo('L.pos()');
      const inStrada = await lugo(`L.suStrada(${dovePartire[0]}, ${dovePartire[1]})`);
      if (inStrada) {
        await page.evaluate((q) => window.__LUGO__.teleport(q[0], q[1]), inStrada);
        await page.waitForTimeout(700);
      }
      const terzo = await provoca();
      if (terzo && terzo.arrivato) {
        const partenza = await lugo('L.pos()');
        await page.keyboard.down('ShiftLeft');
        await page.keyboard.down('KeyW');
        // Si corre finché non lo si è seminato DAVVERO, non per un numero
        // fisso di millisecondi. La fuga si compie a tempo di gioco — 4 m/s
        // per 1,2 s — e in headless, col rasterizzatore software, sei
        // secondi d'orologio in piazza possono valere meno di quattro
        // secondi di mondo.
        await page
          .waitForFunction(
            () => {
              const f = window.__LUGO__.incontro().fase;
              return f === 'ritirata' || f === 'nessuno';
            },
            null,
            { timeout: 25000 },
          )
          .catch(() => {});
        await page.keyboard.up('KeyW');
        await page.keyboard.up('ShiftLeft');
        // la coda della ritirata dura qualche secondo DI GIOCO, e in
        // headless il gioco va più piano dell'orologio: si aspetta la fine
        // vera invece di contare i millisecondi del computer
        await page
          .waitForFunction(() => window.__LUGO__.incontro().fase === 'nessuno', null, { timeout: 20000 })
          .catch(() => {});
        const dopoFuga = await lugo('L.incontro()');
        const pannelli = await page.locator('[data-hud="dialogo"]').count();
        const addii = await lugo('L.frasi("fuga")');
        // Correre deve voler dire essere corsi. Senza questo controllo la
        // fase si sarebbe potuta accontentare della scadenza dei ventidue
        // secondi massimi dell'incontro — che chiude la scena con la stessa
        // identica battuta di commiato — e avrebbe dichiarato verde una
        // fuga fatta stando fermi.
        //
        // La soglia esce dalla regola, non da un'impressione: la fuga si
        // compie superando vFuga (4 m/s) per tempoFuga (1,2 s), e in quel
        // secondo e due decimi si è sempre sopra i quattro metri al secondo
        // per definizione. Meno di 4,8 metri non è quindi possibile, e ci si
        // ferma appena sotto per non litigare col dt di un fotogramma. Non
        // ha senso chiederne di più: seminarlo in una manciata di passi è
        // proprio quello che il sistema promette a chi gioca.
        const arrivo = await lugo('L.pos()');
        const corsi = Math.hypot(arrivo[0] - partenza[0], arrivo[1] - partenza[1]);
        if (dopoFuga.fase === 'nessuno' && pannelli === 0 && corsi > 4.5 && addii.includes(dopoFuga.ultimaFrase)) {
          ok('correndo lo semini, e il pannello si chiude', `${corsi.toFixed(0)} m di corsa · «${dopoFuga.ultimaFrase}»`);
        } else {
          ko('correndo lo semini, e il pannello si chiude', `fase ${dopoFuga.fase}, pannelli ${pannelli}, ${corsi.toFixed(1)} m di corsa, ultima «${dopoFuga.ultimaFrase}»`);
        }
      }

      // nessuna partnership, nemmeno parlando: sigarette e fumetti non
      // introducono nessun contenuto commerciale
      const autIncontro = await lugo('L.autorizzazioni()');
      const promo = await page.locator('.lugo-vetrina-promo, .lugo-vetrina-partner').count();
      if (autIncontro.partner === 0 && autIncontro.promo === 0 && autIncontro.logo === 0 && promo === 0) {
        ok('nessuna partnership, nemmeno parlando col maranza');
      } else {
        ko('nessuna partnership, nemmeno parlando col maranza', JSON.stringify(autIncontro));
      }
    }

    // ── colpire un passante costa reputazione ──────────────────────────
    // È il contrappeso del pugno: chi ti stava addosso è un conto, un
    // pedone che passava di lì è un altro.
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
    let esitoPassante = null;
    // Si riprova su tre passanti diversi perché il teletrasporto può far
    // scoprire un luogo nuovo, e una scoperta vale +5 REP: cadendo nello
    // stesso momento del pugno pareggerebbe il conto e il controllo
    // direbbe «non toglie niente» proprio mentre invece toglieva.
    for (let tentativo = 0; tentativo < 3 && !esitoPassante?.giusto; tentativo++) {
      const passante = await lugo('L.npcVicino()');
      if (!passante) break;
      // ci si mette a un metro e mezzo, guardandolo: il pugno ha un cono
      // frontale, e da dentro il suo stesso pixel non colpirebbe nessuno
      await page.evaluate((q) => window.__LUGO__.teleport(q.x - 1.4, q.z, 0), passante);
      await page.waitForTimeout(1500);
      const puntiPrima = await lugo('L.punteggio()');
      await page.keyboard.down('KeyF');
      await page.waitForTimeout(250);
      await page.keyboard.up('KeyF');
      await page.waitForTimeout(1200);
      const colpo = await lugo('L.pugno()');
      const puntiDopo = await lugo('L.punteggio()');
      esitoPassante = {
        colpo,
        puntiPrima,
        puntiDopo,
        giusto: Boolean(colpo.bersaglio) && colpo.molesto === false && puntiPrima - puntiDopo === 5,
      };
    }
    if (esitoPassante?.giusto) {
      ok('picchiare un passante costa reputazione', `−5 REP su ${esitoPassante.colpo.bersaglio}`);
    } else if (esitoPassante) {
      ko(
        'picchiare un passante costa reputazione',
        `bersaglio ${esitoPassante.colpo.bersaglio}, REP ${esitoPassante.puntiPrima} → ${esitoPassante.puntiDopo}`,
      );
    }
  }

  // ── fase 3e: la bici si prende, si pedala e si lascia ────────────────
  // Tre furti, tre fasi, e ognuna si accende da sola in base al proprio
  // hook: prima che il codice del furto esistesse questo blocco non c'era,
  // e quando c'è non tocca niente di quello che viene prima.
  if ((await lugo('typeof L.biciVicina')) === 'function') {
    // si scende, se si sta guidando: una bici si prende a piedi
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(1200);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
    const libere0 = (await lugo('L.bici()')).libere;
    const b = await lugo('L.biciVicina()');
    if (!b) {
      ko('la bici si prende', 'nessuna bici libera in tutta Lugo');
    } else {
      await page.evaluate((q) => window.__LUGO__.teleport(q.x, q.z), b);
      await page.waitForTimeout(900);
      // L'INQUADRATURA SI INCHIODA prima di misurare, e resta la stessa di
      // qua e di là della E.
      //
      // Senza, questa fase non misurava la bici: misurava la camera. La
      // camera che insegue sta a 4,2 m e 2,1 m di quota a piedi e a 6,0 m
      // e 2,7 m in sella, quindi salendo l'inquadratura si allarga da sola
      // e si tira dentro mezza via in più; e le due letture cadevano a un
      // secondo e mezzo da un teletrasporto, con la città ancora che si
      // montava. Il risultato era un numero che ballava di venti chiamate
      // in su e in giù a ogni giro — passava per fortuna, e quando falliva
      // dava la colpa a una bici che non c'entrava niente. Con la camera
      // ferma e il conto stabilizzato resta una sola differenza fra le due
      // misure, ed è esattamente quella che questa fase dice di pesare.
      await page.evaluate(
        (q) => window.__LUGO__.fotocamera(q.x + 4.5, 2.2, q.z + 4.5, q.x, 0.9, q.z, 14000),
        b,
      );
      // si aspetta che il numero smetta di muoversi: due letture uguali
      const stabile = async () => {
        let ultimo = -1;
        for (let giro = 0; giro < 14; giro++) {
          await page.waitForTimeout(300);
          const r = await lugo('L.render()');
          if (Math.abs(r.chiamate - ultimo) <= 1) return r;
          ultimo = r.chiamate;
        }
        return await lugo('L.render()');
      };
      // il costo del fotogramma A PIEDI, qui davanti alla bici: è il
      // termine di paragone dell'unica cosa che la bici aggiunge
      const rPiedi = await stabile();
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
      const modeBici = await lugo('L.mode()');
      if (modeBici === 'bici') ok('la bici si prende', `#${b.i} al muro`);
      else ko('la bici si prende', `mode=${modeBici}, qui c'è ${JSON.stringify(await lugo('L.furtoQui()'))}`);

      const dopoPresa = (await lugo('L.bici()')).libere;
      if (dopoPresa === libere0 - 1) ok('la bici sparisce dal muro', `${libere0} → ${dopoPresa}`);
      else ko('la bici sparisce dal muro', `${libere0} → ${dopoPresa}`);

      // Le due draw call della bici esistono solo in sella, quindi si
      // misura la DIFFERENZA nello stesso identico punto: il numero
      // assoluto dipende da dove è appoggiata la bici, e confrontare un
      // vicolo con piazza Baracca non direbbe niente di questa modifica.
      const rBici = await stabile();
      // e adesso si molla: una durata a zero fa scadere l'aggancio al
      // primo fotogramma e la camera torna a inseguire. Serve per la
      // cartolina qui sotto, che deve far vedere una pedalata vera e non
      // il cofano dell'auto dietro cui era rimasta inchiodata la macchina
      // fotografica.
      await lugo('L.fotocamera(0, 0, 0, 0, 0, 0, 0) ?? true');
      await page.waitForTimeout(400);
      if (rBici.triangoli < 700_000 && rBici.chiamate - rPiedi.chiamate <= 2) {
        ok('la bici in sella costa due chiamate', `${rPiedi.chiamate} → ${rBici.chiamate} draw call`);
      } else {
        ko('la bici in sella costa due chiamate', `${rPiedi.chiamate} → ${rBici.chiamate} draw call, ${(rBici.triangoli / 1000).toFixed(0)}k triangoli`);
      }

      // R raddrizza anche in bici, e qui serve davvero: la bici era
      // appoggiata a un muro, e chi ci sale si ritrova col manubrio contro
      // la facciata. Una pedalata misurata contro un muro non misura la
      // bici, misura il muro.
      await page.keyboard.press('KeyR', TENUTO);
      await page.waitForTimeout(900);

      // La finestra è a tempo di GIOCO, non di orologio: in headless il
      // rasterizzatore software fa pochi fotogrammi, e quattro secondi veri
      // possono essere mezzo secondo di mondo. Si aspetta che i metri
      // arrivino, con un tetto.
      const p0 = await lugo('L.pos()');
      await page.keyboard.down('ArrowUp');
      let metri = 0;
      for (let i = 0; i < 40 && metri <= 4; i++) {
        await page.waitForTimeout(500);
        const p1 = await lugo('L.pos()');
        metri = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      }
      await page.keyboard.up('ArrowUp');
      if (metri > 4) ok('si pedala', `${metri.toFixed(1)} m`);
      else ko('si pedala', `spostamento ${metri.toFixed(2)} m`);
      await page.screenshot({ path: join(SHOTS, '09-bici.png') });

      // Si scende quasi da fermi, come dall'auto — e si insiste finché non
      // si è davvero a terra. La E si perde solo se il gioco non la vede,
      // ma la discesa ha anche una condizione sua: sotto 1,5 m/s. Una bici
      // che molla i pedali da trenta all'ora ci mette tre secondi e dodici
      // metri a scendere sotto quella soglia, e un secondo e mezzo di
      // freno non sempre bastano quando il mondo gira più piano
      // dell'orologio. Frenare e riprovare è quello che farebbe chiunque
      // stia giocando.
      let modeGiu = await lugo('L.mode()');
      for (let colpo = 0; colpo < 5 && modeGiu !== 'piedi'; colpo++) {
        await page.keyboard.down('Space');
        await page.waitForTimeout(1500);
        await page.keyboard.up('Space');
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(700);
        modeGiu = await lugo('L.mode()');
      }
      const libereDopo = (await lugo('L.bici()')).libere;
      const qui = await lugo('L.pos()');
      const laBici = await lugo('L.biciVicina()');
      const vicina = laBici ? Math.hypot(laBici.x - qui[0], laBici.z - qui[1]) : Infinity;
      if (modeGiu === 'piedi' && libereDopo === libere0 && vicina < 3) {
        ok('la bici resta dove l’hai lasciata', `a ${vicina.toFixed(1)} m`);
      } else {
        ko('la bici resta dove l’hai lasciata', `mode=${modeGiu}, libere ${libereDopo}/${libere0}, a ${vicina.toFixed(1)} m`);
      }

      // un furto si vede, e poi passa
      const caldo = await lugo('L.ricercato()');
      if (caldo.wanted >= 1) ok('un furto si vede', `${caldo.wanted} stella/e, calore ${caldo.calore}`);
      else ko('un furto si vede', JSON.stringify(caldo));
      for (let i = 0; i < 4 && (await lugo('L.ricercato()')).wanted > 0; i++) {
        await page.evaluate(() => window.__LUGO__.invecchia(25));
        await page.waitForTimeout(600);
      }
      const freddo = await lugo('L.ricercato()');
      if (freddo.wanted === 0) ok('e passa', `calore sceso a ${freddo.calore}`);
      else ko('e passa', JSON.stringify(freddo));
    }
  }

  // ── fase 3f: l'auto in sosta, e il suo ingombro che sparisce ─────────
  if ((await lugo('typeof L.postoAuto')) === 'function') {
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }
    const presenti0 = (await lugo('L.parcheggi()')).presenti;
    const p = await lugo('L.postoAuto()');
    if (!p) {
      ko('l’auto in sosta si prende', 'nessuna auto in sosta in mappa');
    } else {
      const solida = await lugo(`L.libero(${p.x}, ${p.z}, 1.2)`);
      if (solida === false) ok('le auto in sosta sono solide');
      else ko('le auto in sosta sono solide', 'ci si passa attraverso');

      await page.evaluate((q) => window.__LUGO__.teleport(q.lato[0], q.lato[1]), p);
      await page.waitForTimeout(700);
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(700);
      const modeAuto = await lugo('L.mode()');
      if (modeAuto === 'auto') ok('l’auto in sosta si prende', `stallo #${p.i}`);
      else ko('l’auto in sosta si prende', `mode=${modeAuto}, qui c'è ${JSON.stringify(await lugo('L.furtoQui()'))}`);

      // la prova che la spatial hash è stata MODIFICATA e non ricostruita:
      // dove c'era l'auto adesso si passa
      const vuoto = await lugo(`L.libero(${p.x}, ${p.z}, 1.2)`);
      if (vuoto === true) ok('l’ingombro dell’auto rubata sparisce dalla fisica');
      else ko('l’ingombro dell’auto rubata sparisce dalla fisica', 'il collider è rimasto lì');

      const presenti1 = (await lugo('L.parcheggi()')).presenti;
      if (presenti1 === presenti0 - 1) ok('lo stallo resta, l’auto no', `${presenti0} → ${presenti1}`);
      else ko('lo stallo resta, l’auto no', `${presenti0} → ${presenti1}`);

      const tinta = await lugo('L.tintaViva()');
      if (tinta === p.tinta) ok('si guida quella, col suo colore', tinta);
      else ko('si guida quella, col suo colore', `${tinta} invece di ${p.tinta}`);

      const caldo = await lugo('L.ricercato()');
      if (caldo.wanted >= 2) ok('due stelle per un’auto', `${caldo.wanted} stelle`);
      else ko('due stelle per un’auto', JSON.stringify(caldo));

      const q0 = await lugo('L.pos()');
      await page.keyboard.down('ArrowUp');
      let metri = 0;
      for (let i = 0; i < 40 && metri <= 3; i++) {
        await page.waitForTimeout(500);
        const q1 = await lugo('L.pos()');
        metri = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
      }
      await page.keyboard.up('ArrowUp');
      if (metri > 3) ok('e parte davvero', `${metri.toFixed(1)} m`);
      else ko('e parte davvero', `spostamento ${metri.toFixed(2)} m`);
      await page.screenshot({ path: join(SHOTS, '09-auto-sosta.png') });
    }
  }

  // ── fase 3g: il traffico frena, e poi te la porti via ────────────────
  if ((await lugo('typeof L.davantiATraffico')) === 'function') {
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(1200);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }
    const t = await lugo('L.davantiATraffico()');
    if (!t) {
      ko('l’auto frena se ti pari davanti', 'nessuna auto del traffico disponibile');
    } else {
      const presentiPrima = (await lugo('L.parcheggi()')).presenti;
      const furtiPrima = await lugo('L.furti()');
      // `false`: l'auto che si stava guidando RESTA dov'era invece di
      // seguire il teletrasporto. Serve perché è esattamente quello che
      // capita giocando — la lasci in strada e vai — ed è l'unico modo di
      // vedere se, portandone via un'altra, quella vecchia resta lì
      await page.evaluate((q) => window.__LUGO__.teleport(q.x, q.z, undefined, false), t);
      // si aspetta che la frenata FINISCA: nove metri di vista e 9 m/s² di
      // decelerazione sono meno di un secondo di gioco, ma in headless un
      // secondo di gioco può volerne dieci d'orologio
      await page
        .waitForFunction((k) => window.__LUGO__.traffico()[k].v < 0.8, t.i, { timeout: 30000 })
        .catch(() => {});
      const a = (await lugo('L.traffico()'))[t.i];
      if (a.v < 0.8) ok('l’auto frena se ti pari davanti', `v=${a.v.toFixed(2)} m/s`);
      else ko('l’auto frena se ti pari davanti', `v=${a.v.toFixed(2)} m/s`);

      await page.waitForTimeout(1600);
      const a2 = (await lugo('L.traffico()'))[t.i];
      const scivolata = Math.hypot(a2.x - a.x, a2.z - a.z);
      if (scivolata < 1.2) ok('e resta ferma finché non ti sposti', `${scivolata.toFixed(2)} m in 1,6 s`);
      else ko('e resta ferma finché non ti sposti', `si è mossa di ${scivolata.toFixed(2)} m`);

      // Ci si avvicina DAVANTI, non di fianco: il corridoio della frenata è
      // largo 1,6 m per lato, e mettersi al fianco vorrebbe dire uscirne —
      // l'auto ripartirebbe proprio mentre stai per salirci.
      await page.evaluate(
        (q) =>
          window.__LUGO__.teleport(
            q.x + Math.cos(q.yaw) * 2.2,
            q.z + Math.sin(q.yaw) * 2.2,
            undefined,
            false,
          ),
        a2,
      );
      await page.waitForTimeout(800);
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(700);
      const modeDopo = await lugo('L.mode()');
      const rubata = (await lugo('L.traffico()'))[t.i].rubata;
      if (modeDopo === 'auto' && rubata === true) {
        ok('l’auto del traffico si porta via', `auto #${t.i}`);
      } else {
        ko('l’auto del traffico si porta via', `mode=${modeDopo}, rubata=${rubata}, qui c'è ${JSON.stringify(await lugo('L.furtoQui()'))}`);
      }

      const furtiDopo = await lugo('L.furti()');
      if (furtiDopo.auto === furtiPrima.auto + 1 && furtiDopo.bici >= 1) {
        ok('i furti si contano', `${furtiDopo.bici} bici, ${furtiDopo.auto} auto`);
      } else {
        ko('i furti si contano', JSON.stringify(furtiDopo));
      }

      // quella che stavi guidando non svanisce: resta in sosta dove l'hai
      // lasciata, con il suo collider, e chi passa di lì la ritrova
      const presentiDopo = (await lugo('L.parcheggi()')).presenti;
      if (presentiDopo === presentiPrima + 1) {
        ok('l’auto che lasci resta parcheggiata', `${presentiPrima} → ${presentiDopo}`);
      } else {
        ko('l’auto che lasci resta parcheggiata', `${presentiPrima} → ${presentiDopo}`);
      }

      const caldo = await lugo('L.ricercato()');
      if (caldo.wanted >= 2) ok('e i Carabinieri si muovono', `${caldo.wanted} stelle`);
      else ko('e i Carabinieri si muovono', JSON.stringify(caldo));
      await page.screenshot({ path: join(SHOTS, '09-furto-traffico.png') });
      // il mondo è tornato coerente? due righe che lo dicono a colpo d'occhio
      ok('il mondo dopo i furti', `${JSON.stringify(await lugo('L.bici()'))} · ${JSON.stringify(await lugo('L.parcheggi()'))}`);
    }
    // si torna in auto per le fasi successive, come fanno già tutte le altre
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'auto'; i++) {
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
  }

  // ── fase 6: cartoline dai landmark ───────────────────────────────────
  // niente pannelli davanti alla città: le cartoline devono mostrare Lugo
  await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
  await page.waitForTimeout(200);

  // i luoghi che hanno una forma propria e non sono una casa come le altre
  if ((await lugo('typeof L.landmark3d')) === 'function') {
    const l3 = await lugo('L.landmark3d()');
    const mancanti = Object.entries(l3)
      .filter(([, c]) => !c)
      .map(([k]) => k);
    if (mancanti.length === 0) ok('landmark con forma propria', Object.keys(l3).join(', '));
    else ko('landmark con forma propria', `disegnati come case qualunque: ${mancanti.join(', ')}`);
  }

  const poiMap = await lugo('L.poi');
  if (poiMap && (await lugo('typeof L.teleport')) === 'function') {
    const inquadrature = {
      pavaglione: [90, 70, 70],
      rocca: [60, 45, 55],
      stazione: [45, 30, 40],
      baracca: [16, 9, 14],
      teatro: [26, 15, 24],
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

    // la facciata del teatro, vista da dove la vede chi passa in strada
    const fronte = await lugo('typeof L.frontTeatro === "function" ? L.frontTeatro() : null');
    if (fronte) {
      await page.evaluate(
        (f) =>
          window.__LUGO__.fotocamera(
            f.x + f.nx * 26,
            13,
            f.z + f.nz * 26,
            f.x,
            7,
            f.z,
            4000,
          ),
        fronte,
      );
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(SHOTS, '06-teatro-facciata.png') });
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
      // Il filmato d'apertura può ancora star caricando quando la scena è
      // già pronta: si aspetta il tasto SALTA per qualche secondo, e se non
      // arriva si tira dritto (l'intro si chiude comunque da sola).
      const s2 = tel.locator('[data-hud="salta-intro"]');
      await s2.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      if (await s2.count()) {
        await s2.click({ noWaitAfter: true }).catch(() => {});
        await tel.waitForTimeout(300);
      }
      const g2 = tel.locator('[data-hud="gioca"]');
      await g2.waitFor({ state: 'visible', timeout: 25000 });
      await g2.click({ noWaitAfter: true }).catch(() => {});
      await tel.waitForTimeout(900);
      // si scende e ci si mette davanti a una bottega
      await tel.keyboard.press('KeyE', TENUTO);
      await tel.waitForTimeout(600);
      const negozi = await tel.evaluate(() => window.__LUGO__.attivita());
      if (negozi && negozi.length) {
        const n = negozi[0];
        await tel.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [n.x, n.z]);
        await tel.waitForTimeout(600);
        await tel.keyboard.press('KeyE', TENUTO);
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

  // ── fase 10: la revisione avversaria ──────────────────────────────────
  // Quattro prove nate leggendo il lavoro dei due fronti precedenti uno
  // contro l'altro, non scrivendolo. Ognuna guarda un punto in cui i due
  // si toccano e nessuno dei due misurava.

  // 10a: il pannello del dialogo chiama i maranza per quello che HANNO
  // addosso. Il cappellino e il colore della tuta escono da due mazzi
  // diversi, e la descrizione li deduceva tutti e due dalla tuta: il
  // pannello prometteva cappellini a gente a testa nuda, cioè falliva
  // proprio nell'unica cosa per cui esiste — farti riconoscere chi parla.
  if ((await lugo('typeof L.descrizioni')) === 'function') {
    const righe = (await lugo('L.descrizioni()')) ?? [];
    const bugie = righe.filter((r) => !r.cappello && /cappellino/i.test(r.testo));
    const diverse = new Set(righe.map((r) => r.testo)).size;
    if (righe.length > 0 && bugie.length === 0 && diverse >= 3) {
      ok(
        'il pannello descrive quello che si vede',
        `${righe.length} maranza, ${diverse} descrizioni diverse, 0 cappellini promessi a vuoto`,
      );
    } else {
      ko(
        'il pannello descrive quello che si vede',
        `${bugie.length} col cappellino a testa nuda su ${righe.length} · ${diverse} descrizioni diverse`,
      );
    }
  }

  // 10b: il budget nel punto peggiore MENTRE si pedala.
  // Il costo del fotogramma si misurava a piedi nei quattro punti, e la
  // bici si misurava dov'era appoggiata: nessuno aveva mai messo insieme
  // le due cose, cioè il caso che capita davvero appena uno si prende una
  // bici e va a farsi un giro in piazza Baracca.
  if (
    (await lugo('typeof L.biciVicina')) === 'function' &&
    (await lugo('typeof L.render')) === 'function'
  ) {
    const p = (await lugo('L.poi')) ?? {};
    const baracca = p.baracca;
    // si arriva a piedi: la bici la si prende dove capita e ci si torna
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(900);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }
    const inquadra = async (q) => {
      await page.evaluate((r) => window.__LUGO__.teleport(r.x + 12, r.z + 12), q);
      await page.evaluate(
        (r) => window.__LUGO__.fotocamera(r.x + 26, 12, r.z + 26, r.x, 3, r.z, 4000),
        q,
      );
      await page.waitForTimeout(1400);
    };
    if (baracca) {
      await inquadra(baracca);
      const aPiedi = await lugo('L.render()');
      const b = await lugo('L.biciVicina()');
      if (b) {
        await page.evaluate((q) => window.__LUGO__.teleport(q.x, q.z), b);
        await page.waitForTimeout(600);
        for (let colpo = 0; colpo < 4 && (await lugo('L.mode()')) !== 'bici'; colpo++) {
          await page.keyboard.press('KeyE', TENUTO);
          await page.waitForTimeout(700);
        }
      }
      const inSella = (await lugo('L.mode()')) === 'bici';
      await inquadra(baracca);
      const conBici = await lugo('L.render()');
      const piu = conBici.chiamate - aPiedi.chiamate;
      const dettaglio = `${conBici.chiamate} draw call in sella (a piedi ${aPiedi.chiamate}, ${piu >= 0 ? '+' : ''}${piu}) · ${(conBici.triangoli / 1000).toFixed(0)}k triangoli`;
      // Il verdetto sta sul TETTO, non sulla differenza: fra le due misure
      // passano un paio di secondi di città viva — un'auto che entra in
      // campo, un gruppetto che gira l'angolo — e la differenza balla da
      // sola. Che la bici costi esattamente due chiamate lo pesa già la
      // fase 3e, dove le due misure sono a un fotogramma di distanza; qui
      // si chiede l'unica cosa che qui si può chiedere davvero, cioè che
      // il punto peggiore di Lugo regga anche con un ciclista dentro. La
      // soglia larga sulla differenza serve solo a far scattare un
      // allarme se un giorno la bici diventasse cinque mesh.
      if (inSella && conBici.chiamate < 170 && conBici.triangoli < 700_000 && piu <= 6) {
        ok('il budget regge anche in sella nel punto peggiore', dettaglio);
      } else if (!inSella) {
        ko('il budget regge anche in sella nel punto peggiore', 'la bici non si è presa');
      } else {
        const spesa = (await lugo('typeof L.spesa === "function" ? L.spesa() : []')) ?? [];
        ko(
          'il budget regge anche in sella nel punto peggiore',
          `${dettaglio} · ${spesa.slice(0, 4).map((s) => `${s.nome}:${s.mesh}`).join(' ')}`,
        );
      }
      await page.screenshot({ path: join(SHOTS, '30-baracca-in-sella.png') });

      // 10c: scendendo, la bici si posa DI FIANCO e non addosso.
      // Prima la ricerca del posto partiva dal punto del ciclista, che è
      // sempre libero perché ci sei sopra tu: la bici finiva sotto i piedi
      // e si restava in piedi dentro il telaio, ruote a cavallo degli
      // stinchi. La prova chiede tutte e due le cose insieme — abbastanza
      // lontano da non stare addosso, abbastanza vicino da ritrovarla.
      if (inSella) {
        // Prima ci si porta in carreggiata, e non è vezzo da cartolina: la
        // misura del budget lascia il giocatore a dodici metri in diagonale
        // dal centro della piazza, che a Lugo vuol dire spesso dentro un
        // portico. Da lì la macchina fotografica finiva nel muro e la
        // cartolina veniva un rettangolo nero — inutile proprio per la cosa
        // che deve far vedere, cioè dove finisce la bici rispetto ai piedi.
        const dove = await lugo(`L.suStrada(${baracca.x}, ${baracca.z})`);
        if (dove) {
          await page.evaluate((q) => window.__LUGO__.teleport(q[0], q[1]), dove);
          await page.waitForTimeout(600);
        }
        await page.keyboard.down('Space');
        await page.waitForTimeout(1500);
        await page.keyboard.up('Space');
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(800);
        const giu = (await lugo('L.mode()')) === 'piedi';
        const qui = await lugo('L.pos()');
        const laBici = await lugo('L.biciVicina()');
        const d = laBici ? Math.hypot(laBici.x - qui[0], laBici.z - qui[1]) : Infinity;
        if (giu && d > 0.5 && d < 3) {
          ok('la bici si posa di fianco, non addosso', `a ${d.toFixed(2)} m da chi è sceso`);
        } else {
          ko('la bici si posa di fianco, non addosso', `mode=${await lugo('L.mode()')}, a ${d.toFixed(2)} m`);
        }
        // dall'alto di tre metri e mezzo: da quassù si vede se la bici sta
        // di fianco o sotto i piedi, che è tutto quello che questa
        // cartolina deve raccontare
        await page.evaluate((q) => {
          window.__LUGO__.fotocamera(q[0] + 2.6, 3.5, q[1] + 2.6, q[0], 0.5, q[1], 6000);
        }, qui);
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(SHOTS, '31-bici-posata.png') });
      }
    }
  }

  // 10d: in sella il pugno non parte.
  // La F è condizionata a mode === 'piedi', ma la finestra del colpo dura
  // 0,42 s e l'impatto cade a metà: fra il tasto e il colpo c'è tutto il
  // tempo di premere E e saltare in sella, e il pedone si vedeva volare
  // via colpito da un ciclista con le mani sul manubrio. Qui si chiede
  // l'invariante più forte e più stabile da misurare: mentre si pedala,
  // premere F non arma proprio niente.
  if ((await lugo('typeof L.pugno')) === 'function' && (await lugo('typeof L.biciVicina')) === 'function') {
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(900);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }
    const b = await lugo('L.biciVicina()');
    if (b) {
      await page.evaluate((q) => window.__LUGO__.teleport(q.x, q.z), b);
      await page.waitForTimeout(600);
      for (let colpo = 0; colpo < 4 && (await lugo('L.mode()')) !== 'bici'; colpo++) {
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(700);
      }
    }
    if ((await lugo('L.mode()')) === 'bici') {
      // Si guarda MENTRE la F è giù, non dopo: la finestra del colpo dura
      // 0,42 s, e chiedere «è partito?» mezzo secondo dopo aver premuto
      // vuol dire trovare zero anche quando era partito eccome. Qui la si
      // tiene premuta e si sorveglia a raffica finché non si molla.
      let armato = 0;
      for (let i = 0; i < 3; i++) {
        await page.keyboard.down('KeyF');
        for (let occhiata = 0; occhiata < 6; occhiata++) {
          await page.waitForTimeout(60);
          if ((await lugo('L.pugno()')).t > 0) armato++;
        }
        await page.keyboard.up('KeyF');
        await page.waitForTimeout(300);
      }
      if (armato === 0) ok('in sella il pugno non parte', '3 F premute, 0 colpi armati');
      else ko('in sella il pugno non parte', `${armato} colpi armati su 3`);
      // si scende, che le fasi dopo trovano il mondo come lo si aspettano
      await page.keyboard.down('Space');
      await page.waitForTimeout(1500);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(700);
    }
  }

  // 10e: l'Invio su un bottone non fa scendere dall'auto.
  // La guardia sul fuoco della tastiera stava sul ramo a piedi e su quello
  // in sella, ma non su quello dell'auto — proprio dove il commento la
  // descriveva. I tre bottoni in alto a destra restano a schermo anche in
  // guida: bastava cliccare l'altoparlante e poi premere Invio per
  // ritrovarsi fuori dall'abitacolo in mezzo alla carreggiata.
  if ((await lugo('typeof L.mode')) === 'function' && (await lugo('typeof L.postoAuto')) === 'function') {
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
    await page.waitForTimeout(300);
    // Si risale in macchina, e ci si arriva col teleport a due tempi: il
    // primo porta il giocatore e appoggia l'auto a tre metri in diagonale
    // (4,24 m, cioè fuori dai 2,6 della salita), il secondo — con
    // `insieme` a false — sposta solo il giocatore sopra l'auto. Senza il
    // secondo la E non avrebbe mai preso e la fase si sarebbe spenta da
    // sola facendo finta di niente.
    const qui = await lugo('L.pos()');
    await page.evaluate((q) => window.__LUGO__.teleport(q[0], q[1]), qui);
    await page.waitForTimeout(300);
    await page.evaluate((q) => window.__LUGO__.teleport(q[0] + 3, q[1] + 3, undefined, false), qui);
    await page.waitForTimeout(400);
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'auto'; i++) {
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(500);
    }
    if ((await lugo('L.mode()')) === 'auto' && (await page.locator('[data-hud="audio"]').count())) {
      await page.focus('[data-hud="audio"]');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      const dopo = await lugo('L.mode()');
      if (dopo === 'auto') ok("l'Invio su un bottone non fa scendere dall'auto");
      else ko("l'Invio su un bottone non fa scendere dall'auto", `da auto a ${dopo}`);
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
