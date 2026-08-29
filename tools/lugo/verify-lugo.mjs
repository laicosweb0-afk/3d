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
        await page.keyboard.press('KeyE');
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
        // la stessa E che apre la vetrina la richiude: da tastiera non si
        // resta mai chiusi dentro un pannello
        await page.keyboard.press('KeyE');
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
        await page.keyboard.press('KeyE');
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
    await page.keyboard.press('KeyE');
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
    await page.keyboard.press('KeyE');
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
        await page.keyboard.press('KeyE');
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
      const terzo = await provoca();
      if (terzo && terzo.arrivato) {
        await page.keyboard.down('ShiftLeft');
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(6000);
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
        if (dopoFuga.fase === 'nessuno' && pannelli === 0 && addii.includes(dopoFuga.ultimaFrase)) {
          ok('correndo lo semini, e il pannello si chiude', `«${dopoFuga.ultimaFrase}»`);
        } else {
          ko('correndo lo semini, e il pannello si chiude', `fase ${dopoFuga.fase}, pannelli ${pannelli}, ultima «${dopoFuga.ultimaFrase}»`);
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
