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
  // Il click sul SALTA è col paracadute: l'intro può finire DA SOLA proprio
  // mentre Playwright clicca, il bottone si smonta a metà click e un click
  // senza timeout resta appeso 30 secondi su un elemento morto per poi
  // ammazzare tutto il collaudo — è successo. L'esito è comunque lo stesso:
  // intro chiusa, con o senza il nostro aiuto.
  const salta = page.locator('[data-hud="salta-intro"]');
  if (await salta.count()) {
    await salta.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    ok('intro di apertura', 'filmato mostrato e saltabile');
  }

  const gioca = page.locator('[data-hud="gioca"]');
  if (await gioca.count()) {
    await gioca.click();
    await page.waitForTimeout(800);
    ok('start screen', 'bottone GIOCA premuto');
  }

  // ── il camminatore guidato, in comune ─────────────────────────────────
  // Ogni ~300 ms si rilegge posizione e camYaw e si sceglie fra le otto
  // direzioni della tastiera quella che punta il bersaglio: lo stesso
  // movimento della fase delle otto direzioni, solo in retroazione. Nato
  // dentro la fase 11, è salito quassù quando anche la missione 01 ha
  // avuto bisogno di camminare davvero: due copie sarebbero due verità.
  const FRECCE = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  let tastiGiu = new Set();
  const premi = async (nuovi) => {
    for (const t of FRECCE) {
      const voglio = nuovi.has(t);
      if (voglio && !tastiGiu.has(t)) await page.keyboard.down(t);
      if (!voglio && tastiGiu.has(t)) await page.keyboard.up(t);
    }
    tastiGiu = nuovi;
  };
  const tastiPer = (relDeg) => {
    const combos = [
      [0, ['ArrowUp']], [45, ['ArrowUp', 'ArrowRight']], [90, ['ArrowRight']],
      [135, ['ArrowDown', 'ArrowRight']], [180, ['ArrowDown']], [-135, ['ArrowDown', 'ArrowLeft']],
      [-90, ['ArrowLeft']], [-45, ['ArrowUp', 'ArrowLeft']],
    ];
    let best = combos[0];
    let errMin = 1e9;
    for (const c of combos) {
      let e = Math.abs(relDeg - c[0]);
      if (e > 180) e = 360 - e;
      if (e < errMin) {
        errMin = e;
        best = c;
      }
    }
    return new Set(best[1]);
  };
  // Di corsa, perché in headless il tempo di gioco scorre a una frazione
  // dell'orologio; «incastrato» dopo 25 finestre ferme è il modo in cui
  // un muro si racconta invece di mangiarsi tutto il timeout.
  const camminaVerso = async (tx, tz, arrivo = 1.3, timeoutMs = 180000) => {
    const t0 = Date.now();
    let prev = await lugo('L.pos()');
    let metri = 0;
    let fermi = 0;
    await page.keyboard.down('ShiftLeft');
    try {
      while (Date.now() - t0 < timeoutMs) {
        const p = await lugo('L.pos()');
        const mosso = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        metri += mosso;
        prev = p;
        const d = Math.hypot(tx - p[0], tz - p[1]);
        if (d < arrivo) return { ok: true, metri, pos: p };
        if (mosso < 0.03 && tastiGiu.size) fermi++;
        else fermi = 0;
        if (fermi > 25) return { ok: false, metri, pos: p, perche: 'incastrato' };
        const dir = await lugo('L.direzione()');
        let rel = ((Math.atan2(tz - p[1], tx - p[0]) - dir.camYaw) * 180) / Math.PI;
        while (rel > 180) rel -= 360;
        while (rel < -180) rel += 360;
        await premi(tastiPer(rel));
        await page.waitForTimeout(300);
      }
      return { ok: false, metri, pos: prev, perche: 'timeout' };
    } finally {
      await premi(new Set());
      await page.keyboard.up('ShiftLeft');
    }
  };

  // ── fase 1b: la missione 01 «Sei nuovo?» ──────────────────────────────
  // La prima scena del gioco, collaudata nell'ordine in cui un giocatore
  // vero la incontra: il cancello tiene ferma la vecchia catena, l'anziano
  // col pacchetto aspetta nel parcheggio, «Magari dopo» non incastra
  // nessuno, la consegna si cammina fino al bar vero, il premio arriva
  // UNA volta sola — anche ricaricando la pagina — e a missione fatta la
  // catena di sempre riparte da sola.
  if ((await lugo('typeof L.primoIncontro')) === 'object') {
    // il cancello: per mezzo minuto NESSUNA missione deve partire da sola
    // (prima mvp1 arrivava dopo 3 secondi di gioco, e avrebbe parlato
    // sopra all'anziano)
    let scappata = null;
    for (let i = 0; i < 12 && !scappata; i++) {
      await page.waitForTimeout(2500);
      const st = await lugo('L.statoMissione()');
      if (st === 'attiva' || st === 'completata') scappata = st;
    }
    const pi0 = await lugo('L.primoIncontro.stato()');
    if (!scappata) ok('il cancello tiene ferma la catena', `30 s senza missioni auto-avviate`);
    else ko('il cancello tiene ferma la catena', `una missione è partita da sola: ${scappata}`);
    if (pi0 && pi0.disponibile) ok("l'anziano col pacchetto è al suo posto", `(${pi0.x.toFixed(1)};${pi0.z.toFixed(1)}), fase ${pi0.fase}`);
    else ko("l'anziano col pacchetto è al suo posto", JSON.stringify(pi0));

    // si scende dall'auto: fuoco via da qualunque bottone, o la E è muta
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(900);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }

    // primo giro: si rifiuta, e si deve poter riprovare senza incastri
    await page.evaluate(() => window.__LUGO__.primoIncontro.forzaDialogo());
    await page.waitForFunction(() => document.querySelector('[data-hud="dialogo-opzione-dopo"]'), null, { timeout: 20000 }).catch(() => {});
    if (await page.locator('[data-hud="dialogo-opzione-dopo"]').count()) {
      await page.click('[data-hud="dialogo-opzione-dopo"]');
      await page.waitForTimeout(700);
      const dopoRifiuto = await lugo('L.primoIncontro.stato()');
      const chiuso = (await page.locator('[data-hud="dialogo"]').count()) === 0;
      if (chiuso && dopoRifiuto && dopoRifiuto.rifiutato) ok('«Magari dopo» chiude senza incastrare', 'pannello chiuso, anziano riprovabile');
      else ko('«Magari dopo» chiude senza incastrare', `chiuso=${chiuso} rifiutato=${dopoRifiuto && dopoRifiuto.rifiutato}`);
    } else {
      ko('«Magari dopo» chiude senza incastrare', 'il dialogo non si è aperto');
    }

    // secondo giro: si accetta — «Sì» e poi «Volentieri»
    const soldi0 = await lugo('L.denaro()');
    const rep0 = await lugo('L.punteggio()');
    await page.evaluate(() => window.__LUGO__.primoIncontro.forzaDialogo());
    await page.waitForFunction(() => document.querySelector('[data-hud="dialogo-opzione-si"]'), null, { timeout: 20000 }).catch(() => {});
    await page.click('[data-hud="dialogo-opzione-si"]').catch(() => {});
    await page.waitForFunction(() => document.querySelector('[data-hud="dialogo-opzione-volentieri"]'), null, { timeout: 15000 }).catch(() => {});
    await page.click('[data-hud="dialogo-opzione-volentieri"]').catch(() => {});
    await page.waitForTimeout(900);
    const st1 = await lugo('L.statoMissione()');
    const pi1 = await lugo('L.primoIncontro.stato()');
    const obiettivo = (await page.textContent('[data-hud="obiettivo"]').catch(() => '')) ?? '';
    if (st1 === 'attiva' && pi1 && pi1.paccoGiocatore && /consegna/i.test(obiettivo)) {
      ok('la commissione parte col pacco in mano', `«${obiettivo.trim()}» verso ${pi1.nomeBar}`);
    } else {
      ko('la commissione parte col pacco in mano', `stato=${st1} pacco=${pi1 && pi1.paccoGiocatore} obiettivo «${obiettivo}»`);
    }
    await page.screenshot({ path: join(SHOTS, '00-sei-nuovo.png') });

    // la consegna: teletrasporto VICINO al bar, l'ultimo tratto è cammino
    // vero; quattro accostamenti provati, il primo che non si incastra vince
    const t = await lugo('L.tappaCorrente()');
    let arrivo = { ok: false, metri: 0 };
    if (t) {
      for (const [dx, dz] of [[11, 0], [0, 11], [-11, 0], [0, -11]]) {
        await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [t.x + dx, t.z + dz]);
        await page.waitForTimeout(400);
        arrivo = await camminaVerso(t.x, t.z, 1.5, 60000);
        if (arrivo.ok) break;
      }
    }
    await page.waitForTimeout(1300);
    const stFine = await lugo('L.statoMissione()');
    const guadagno = (await lugo('L.denaro()')) - soldi0;
    const repDelta = (await lugo('L.punteggio()')) - rep0;
    if (await page.locator('[data-hud="dialogo-opzione-sivede"]').count()) {
      ok('il barista piazza la battuta', (await page.textContent('[data-hud="dialogo-testo"]').catch(() => '')) ?? '');
      await page.click('[data-hud="dialogo-opzione-sivede"]').catch(() => {});
      await page.waitForTimeout(400);
    } else {
      ko('il barista piazza la battuta', 'nessun dialogo di arrivo a schermo');
    }
    if (arrivo.ok && stFine === 'completata' && Math.round(guadagno) === 20 && repDelta >= 5) {
      ok('consegna a piedi pagata: +€20 e +5 REP', `${arrivo.metri.toFixed(1)} m camminati, +€${Math.round(guadagno)}, +${repDelta} REP`);
    } else {
      ko('consegna a piedi pagata: +€20 e +5 REP', `arrivo=${arrivo.ok} stato=${stFine} +€${guadagno} +${repDelta} REP`);
    }

    // il premio non si ripete nella stessa partita: rigiocarla paga zero
    const soldiPieni = await lugo('L.denaro()');
    const bis = await page.evaluate(() => window.__LUGO__.avviaMissione('m00'));
    if (bis && t) {
      await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [t.x, t.z]);
      await page.waitForTimeout(1300);
    }
    const dopoBis = await lugo('L.denaro()');
    if (Math.round(dopoBis) === Math.round(soldiPieni)) ok('il premio si paga una volta sola', `€${dopoBis} invariati rigiocandola`);
    else ko('il premio si paga una volta sola', `€${soldiPieni} → €${dopoBis} al secondo giro`);
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());

    // la prova del reload: il salvataggio ricorda, il premio non raddoppia,
    // l'anziano resta a riposo e la catena di sempre riparte da sola
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__LUGO__ && window.__LUGO__.pronto === true, null, { timeout: 30000 }).catch(() => {});
    // stesso paracadute della fase 1: l'intro può smontarsi a metà click
    if (await page.locator('[data-hud="salta-intro"]').count()) await page.click('[data-hud="salta-intro"]', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    if (await page.locator('[data-hud="gioca"]').count()) await page.click('[data-hud="gioca"]', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const soldiReload = await lugo('L.denaro()');
    const piR = await lugo('L.primoIncontro.stato()');
    if (Math.round(soldiReload) === Math.round(dopoBis) && piR && piR.fase === 'finita') {
      ok('ricaricando non si ripaga niente', `€${soldiReload} come prima, anziano a riposo`);
    } else {
      ko('ricaricando non si ripaga niente', `€${dopoBis} → €${soldiReload}, fase anziano=${piR && piR.fase}`);
    }
    let ripartita = false;
    for (let i = 0; i < 30 && !ripartita; i++) {
      await page.waitForTimeout(2000);
      if ((await lugo('L.statoMissione()')) === 'attiva') ripartita = true;
    }
    if (ripartita) ok('a missione fatta la catena riparte', 'la proposta arriva da sola dopo il reload');
    else ko('a missione fatta la catena riparte', '60 s senza proposte a cancello aperto');
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
    await page.waitForTimeout(300);
  } else {
    ko('missione 01 «Sei nuovo?»', 'hook primoIncontro assente');
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
        let rigiocate = 0;
        for (const id of Object.keys(attesi)) {
          const e0 = await lugo('L.denaro()');
          // La guardia del premio unico cambia l'aspettativa: una missione
          // che risulta GIÀ fatta (capita: la catena la propone da sola e
          // la si chiude per caso guidando nelle fasi prima) rigiocata
          // paga ZERO per progetto — pretendere il premio pieno qui
          // scambierebbe la regola per un bug. Prima della guardia il
          // doppio pagamento passava inosservato, ed era quello il bug.
          const giaFatta = ((await lugo('L.missioniFatte()')) ?? []).includes(id);
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
          const attesa = giaFatta ? 0 : attesi[id][0];
          if (stato === 'completata' && Math.round(guadagno) === attesa) {
            chiuse++;
            if (giaFatta) rigiocate++;
          } else {
            ko(`missione ${id}`, `stato ${stato}, +€${Math.round(guadagno)} invece di ${attesa}${giaFatta ? ' (già fatta: rigiocata)' : ''}`);
          }
        }
        if (chiuse === Object.keys(attesi).length) {
          ok(
            'catena d\'ingresso',
            `${chiuse} missioni completate coi premi giusti${rigiocate ? ` (${rigiocate} rigiocate a €0, come da premio unico)` : ''}`,
          );
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
    // anche qui vale il premio unico: se la catena ha già fatto chiudere
    // m01 per caso nelle fasi prima, rigiocarla deve pagare ZERO — la
    // prova che i punti fluiscono davvero la danno la fase 1b (+5 REP) e
    // la catena d'ingresso, non questa
    const m01Fatta = ((await lugo('L.missioniFatte()')) ?? []).includes('m01');
    const esito = await page.evaluate(async () => {
      const L = window.__LUGO__;
      const prima = L.punteggio();
      L.avviaMissione('m01');
      const t = L.tappaCorrente();
      L.teleport(t.x, t.z);
      await new Promise((r) => setTimeout(r, 1500));
      return { prima, dopo: L.punteggio(), stato: L.statoMissione() };
    });
    if (!m01Fatta && esito.dopo > esito.prima) ok('missione completabile', `+${esito.dopo - esito.prima} punti`);
    else if (m01Fatta && esito.stato === 'completata' && esito.dopo === esito.prima) ok('missione completabile', 'm01 già chiusa prima: rigiocata senza doppio premio');
    else ko('missione completabile', JSON.stringify({ ...esito, m01Fatta }));
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

  // ── fase 5c: i maranza in monopattino ─────────────────────────────────
  // Metà del branco gira su due ruote. Qui si misura che i monopattini
  // esistano davvero (e siano la metà promessa, non «circa»), che tengano
  // l'andatura dichiarata — 3,4 m/s: più della camminata (2,3), meno della
  // corsa (5,2), così da lontano si legge a colpo d'occhio chi è — e che il
  // pannello del dialogo nomini il mezzo: la riga «chi ti parla» è l'unico
  // appiglio che il giocatore ha per riconoscere la persona giusta.
  if ((await lugo('typeof L.monopattini')) === 'function') {
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(1000);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());

    const statMar = await lugo('L.maranza()');
    const mono = await lugo('L.monopattini()');
    if (
      mono.length > 0 &&
      mono.length === statMar.monopattini &&
      Math.abs(mono.length * 2 - statMar.totali) <= 1
    ) {
      ok('metà dei maranza gira in monopattino', `${mono.length} su ${statMar.totali} maranza`);
    } else {
      ko(
        'metà dei maranza gira in monopattino',
        `monopattini() ne elenca ${mono.length}, maranza() ne dichiara ${statMar.monopattini} su ${statMar.totali}`,
      );
    }

    if (mono.length > 0) {
      // L'andatura di crociera si misura dallo SPOSTAMENTO in tempo di
      // SIMULAZIONE: in headless il rasterizzatore software fa 2-3
      // fotogrammi al secondo col dt tagliato a 0,05 s, quindi il mondo
      // scorre a una frazione del tempo vero e i metri al secondo
      // d'orologio direbbero una bugia (~1/8 del reale). Si campiona la
      // posizione a ogni fotogramma via requestAnimationFrame e si divide
      // il passo per il dt tagliato: quello È ciò che vede chi gioca a 60
      // fps. E il bersaglio dev'essere in MARCIA: quasi metà dei pedoni
      // nasce in posa col telefono, e misurare un fermo direbbe zero su un
      // monopattino che funziona benissimo.
      let andatura = null;
      for (let giro = 0; giro < 6 && !andatura; giro++) {
        // Il candidato deve MUOVERSI davvero, non solo dichiararsi in
        // marcia: lo stato 'cammina' e la v di stato restano su anche per
        // uno inchiodato contro uno spigolo dalla fisica (è successo: 15
        // passi campionati, tutti da 0,00 m). Due letture a distanza e si
        // pretende dello spostamento vero prima di sprecarci la misura.
        let corsa = null;
        for (let k = 0; k < 50 && !corsa; k++) {
          const vivi = await lugo('L.monopattini()');
          const inMarcia = vivi.filter((q) => q.stato === 'cammina' && q.v > 2);
          if (inMarcia.length) {
            await page.waitForTimeout(600);
            const dopo = await lugo('L.monopattini()');
            corsa =
              inMarcia.find((q) => {
                const d = dopo.find((w) => w.i === q.i);
                return d && d.stato === 'cammina' && Math.hypot(d.x - q.x, d.z - q.z) > 0.05;
              }) ?? null;
          }
          if (!corsa) await page.waitForTimeout(400);
        }
        if (!corsa) break;
        const misura = await page.evaluate(async (idx) => {
          const L = window.__LUGO__;
          const righe = [];
          await new Promise((fine) => {
            const t0 = performance.now();
            const giro2 = () => {
              const p = L.pedoni()[idx];
              righe.push([p.x, p.z, p.stato]);
              if (performance.now() - t0 < 4000) requestAnimationFrame(giro2);
              else fine();
            };
            requestAnimationFrame(giro2);
          });
          const passi = [];
          for (let i = 1; i < righe.length; i++) {
            if (righe[i][2] !== 'cammina' || righe[i - 1][2] !== 'cammina') continue;
            passi.push(Math.hypot(righe[i][0] - righe[i - 1][0], righe[i][1] - righe[i - 1][1]) / 0.05);
          }
          return {
            passi: passi.length,
            vMedia: passi.length ? passi.reduce((a, b) => a + b, 0) / passi.length : 0,
          };
        }, corsa.i);
        // una media quasi ferma è un candidato pinzato a metà misura, non
        // un'andatura: si scarta e si riprova con un altro, il verdetto
        // sull'intervallo 3,0–3,75 resta quello vero là sotto
        if (misura.passi >= 3 && misura.vMedia > 1) andatura = misura;
      }
      // oltre allo spostamento misurato, il passo ASSEGNATO: 3,4 ±4% per
      // tutti, così un futuro refactor che riportasse i monopattini al
      // passo dei pedoni si vedrebbe anche coi maranza tutti in posa
      const passiTarget = mono.map((m) => m.passo);
      const targetGiusto = passiTarget.every((p) => p > 3.2 && p < 3.6);
      if (andatura && andatura.vMedia > 3.0 && andatura.vMedia < 3.75 && targetGiusto) {
        ok(
          'il monopattino tiene i 3,4 al secondo',
          `${andatura.vMedia.toFixed(2)} m/s da spostamento (${andatura.passi} passi) · passi assegnati ${Math.min(...passiTarget).toFixed(2)}–${Math.max(...passiTarget).toFixed(2)}`,
        );
      } else if (!andatura) {
        ko('il monopattino tiene i 3,4 al secondo', 'nessun monopattino in marcia da misurare');
      } else {
        ko(
          'il monopattino tiene i 3,4 al secondo',
          `misurati ${andatura.vMedia.toFixed(2)} m/s su ${andatura.passi} passi, passi assegnati ${passiTarget.map((p) => p.toFixed(2)).join('/')}`,
        );
      }

      // ── l'incontro con uno in monopattino: il pannello nomina il mezzo ─
      // Con i tentativi, non con un colpo secco: a questo punto del
      // collaudo il giocatore sta dove l'hanno lasciato le prove
      // dell'andatura, e un incontro provocato col muso contro una
      // facciata (o col ciclo maranza ancora in coda dalla fase prima)
      // muore in «nessuno» — è lo stesso vizio già curato per la fuga,
      // e falliva allo stesso modo: a intermittenza.
      let idxInc = -1;
      let arrivato = false;
      for (let tentativo = 0; tentativo < 3 && !arrivato; tentativo++) {
        await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
        await page
          .waitForFunction(() => window.__LUGO__.incontro().fase === 'nessuno', null, { timeout: 12000 })
          .catch(() => {});
        const quiInc = await lugo('L.pos()');
        const stradaInc = await lugo(`L.suStrada(${quiInc[0]}, ${quiInc[1]})`);
        if (stradaInc) {
          await page.evaluate((q) => window.__LUGO__.teleport(q[0], q[1]), stradaInc);
          await page.waitForTimeout(500);
        }
        idxInc = await lugo('L.provocaIncontro(true)');
        if (idxInc < 0) {
          await page.waitForTimeout(2500);
          continue;
        }
        try {
          await page.waitForFunction(() => window.__LUGO__.incontro().fase === 'chiede', null, { timeout: 45000 });
          arrivato = true;
        } catch {
          arrivato = false;
        }
      }
      if (!arrivato) {
        ko('il pannello nomina il monopattino', `l'incontro resta in fase ${await lugo('L.incontro().fase')}`);
      } else {
        const scelto = await lugo(`L.pedoni()[${idxInc}]`);
        const chiStore = (await lugo('L.dialogo()'))?.chi ?? '';
        const chiDom = (await page.textContent('.lugo-dialogo-chi').catch(() => '')) ?? '';
        // e la descrizione non deve mentire in NESSUN verso: chi va a piedi
        // non ha «, in monopattino» in coda, chi è sul mezzo ce l'ha
        const righeDescr = (await lugo('L.descrizioni()')) ?? [];
        const bugie = righeDescr.filter((r) => r.monopattino !== /monopattino/i.test(r.testo)).length;
        if (scelto.monopattino === true && /monopattino/i.test(chiStore) && /monopattino/i.test(chiDom) && bugie === 0) {
          ok('il pannello nomina il monopattino', `«${chiStore}» (store e schermo concordi, 0 descrizioni bugiarde)`);
        } else {
          ko(
            'il pannello nomina il monopattino',
            `npc.monopattino=${scelto.monopattino}, store «${chiStore}», schermo «${chiDom}», ${bugie} descrizioni bugiarde`,
          );
        }
        await page.screenshot({ path: join(SHOTS, '11-monopattino-chiede.png') });

        // «Tieni, prendi» → la ritirata riparte SUL MEZZO: 5,8 m/s, che
        // nessuno a piedi tocca (la ritirata a piedi è 4,6). La soglia a 5
        // sta nel mezzo apposta: sotto vorrebbe dire che il monopattino
        // scappa a piedi, e la scena perderebbe il suo senso.
        await page.click('[data-hud="dialogo-opzione-si"]', { noWaitAfter: true }).catch(() => {});
        let vRitirata = 0;
        for (let k = 0; k < 20; k++) {
          await page.waitForTimeout(200);
          const p = await lugo(`L.pedoni()[${idxInc}]`);
          if (p.stato === 'ritirata') vRitirata = Math.max(vRitirata, p.v);
          if (vRitirata > 5) break;
        }
        if (vRitirata > 5.0 && vRitirata < 6.1) {
          ok('data la sigaretta, la ritirata riparte sul mezzo', `${vRitirata.toFixed(2)} m/s (a piedi sarebbero 4,6)`);
        } else {
          ko('data la sigaretta, la ritirata riparte sul mezzo', `v massima campionata ${vRitirata.toFixed(2)} m/s`);
        }
        await page.waitForTimeout(1200);
        await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
      }
    }
  }

  // ── fase 5d: i pedoni fanno ostacolo ──────────────────────────────────
  // Due contatti, due contrappesi. In auto: toccare un pedone non lo
  // stende MAI (balza in salvo), ma l'auto paga — la velocità crolla nel
  // fotogramma del contatto. A piedi: camminare addosso a un passante lo
  // fa scartare di lato e borbottare, senza che il giocatore venga
  // spostato di un centimetro dalla propria rotta.
  if ((await lugo('typeof L.ostacoli')) === 'function' && (await lugo('typeof L.pedoni')) === 'function') {
    // in auto, col teleport a due tempi (come fase 10e): il primo porta
    // giocatore e auto, il secondo mette il giocatore sopra l'auto
    const quiOst = await lugo('L.pos()');
    await page.evaluate((q) => window.__LUGO__.teleport(q[0], q[1]), quiOst);
    await page.waitForTimeout(300);
    await page.evaluate((q) => window.__LUGO__.teleport(q[0] + 3, q[1] + 3, undefined, false), quiOst);
    await page.waitForTimeout(400);
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'auto'; i++) {
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(500);
    }
    if ((await lugo('L.mode()')) !== 'auto') {
      ko("l'auto paga il pedone toccato", 'non si è risaliti in auto per la prova');
    } else {
      // Si cerca un pedone DAVVERO in carreggiata e ci si piazza 3 m più
      // indietro lungo la strada: così il contatto arriva sotto i 4 m/s
      // del balzo d'allarme dei 6,5 m, che altrimenti lo salverebbe prima
      // del tocco — ed è giusto così, ma qui si vuole misurare il tocco.
      // La retata dei candidati si ripete nel tempo: chi sta in carreggiata
      // in un dato istante è questione di fortuna (gli attraversamenti sono
      // il 18% dei cambi di meta), e un colpo secco ha già trovato ZERO
      // pedoni sulla strada in un giro intero. Aspettarli è la cosa vera:
      // nel gioco attraversano davvero, basta dare loro un minuto.
      const candidati = [];
      for (let retata = 0; retata < 8 && candidati.length === 0; retata++) {
        if (retata > 0) await page.waitForTimeout(6000);
        const tuttiPed = await lugo('L.pedoni()');
        for (const n of tuttiPed) {
          if (n.stato !== 'fermo' && n.stato !== 'cammina') continue;
          const su = await lugo(`L.suStrada(${n.x}, ${n.z})`);
          if (!su) continue;
          if (Math.hypot(su[0] - n.x, su[1] - n.z) < 1.2) candidati.push(n);
          if (candidati.length >= 6) break;
        }
      }
      let urto = null;
      for (const cand of candidati) {
        const rA = await lugo(`L.suStrada(${cand.x - 2}, ${cand.z})`);
        const rB = await lugo(`L.suStrada(${cand.x + 2}, ${cand.z})`);
        if (!rA || !rB) continue;
        let sdx = rB[0] - rA[0];
        let sdz = rB[1] - rA[1];
        const sl = Math.hypot(sdx, sdz);
        if (sl < 1) continue;
        sdx /= sl;
        sdz /= sl;
        const p0 = await lugo(`L.pedoni()[${cand.i}]`);
        if (p0.stato !== 'fermo' && p0.stato !== 'cammina') continue;
        const ax = p0.x - sdx * 3.0;
        const az = p0.z - sdz * 3.0;
        await page.evaluate(
          ([x, z, y]) => window.__LUGO__.teleport(x, z, y),
          [ax, az, Math.atan2(p0.z - az, p0.x - ax)],
        );
        await page.waitForTimeout(300);
        // Il filmino del contatto si gira DENTRO la pagina, un campione per
        // fotogramma via requestAnimationFrame: le velocità si ricavano dal
        // passo diviso il dt tagliato (0,05 s — su questo banco ogni
        // fotogramma dura ben oltre il clamp), perché una lettura ogni
        // tanto da fuori mancherebbe il fotogramma del contatto e
        // misurerebbe la ripresa, non la frenata.
        await page.keyboard.down('KeyW');
        const film = await page.evaluate(async (idx) => {
          const L = window.__LUGO__;
          const base = L.ostacoli().frenate;
          const righe = [];
          let colpo = -1;
          await new Promise((fine) => {
            const t0 = performance.now();
            const giro = () => {
              const p = L.pos();
              righe.push([p[0], p[1], L.ostacoli().frenate, L.pedoni()[idx].stato]);
              if (colpo < 0 && righe[righe.length - 1][2] > base) colpo = righe.length - 1;
              if ((colpo >= 0 && righe.length >= colpo + 3) || performance.now() - t0 > 25000) fine();
              else requestAnimationFrame(giro);
            };
            requestAnimationFrame(giro);
          });
          return { righe, colpo, registro: L.ostacoli() };
        }, cand.i);
        await page.keyboard.up('KeyW');
        await page.waitForTimeout(500);

        const k = film.colpo;
        if (k < 2 || film.righe.length <= k + 1) continue; // contatto mai visto: un altro candidato
        const vAl = (i) =>
          Math.hypot(film.righe[i][0] - film.righe[i - 1][0], film.righe[i][1] - film.righe[i - 1][1]) / 0.05;
        // Col gas a tavoletta i contatti possono essere PIÙ D'UNO nella
        // stessa finestra (tocco, frenata, ripresa, ritocco): il registro
        // fotografa sempre l'ULTIMO, quindi la sua coerenza va misurata
        // sull'ultimo scatto del contatore, non sul primo — confrontarla
        // col primo contatto ha bocciato una frenata perfettamente vera
        // (3,07 misurati al primo tocco contro l'1,99 registrato al
        // secondo). La frenata-nonostante-il-gas, invece, si giudica al
        // PRIMO contatto, l'unico col rincorso pulito alle spalle.
        let kU = k;
        for (let i = k + 1; i < film.righe.length; i++) {
          if (film.righe[i][2] > film.righe[i - 1][2]) kU = i;
        }
        const vPre = Math.max(vAl(k - 1), vAl(k));
        const vPost = vAl(k + 1);
        const vAllUltimo = Math.max(vAl(kU - 1), vAl(kU));
        const balzo =
          film.righe[k][3] === 'balzo' || film.righe[Math.min(k + 1, film.righe.length - 1)][3] === 'balzo';
        urto = {
          vPre,
          vPost,
          balzo,
          registro: film.registro,
          // Il registro scrive vDopo = vPrima·0,45 per costruzione: fidarsi
          // di quel rapporto sarebbe un controllo che passa da solo. Qui si
          // pretende che (1) il registro dica il VERO sulla velocità
          // d'impatto (torna con quella misurata dallo spostamento
          // all'ULTIMO contatto, quello che il registro fotografa) e (2) la
          // velocità misurata CALI nel fotogramma del PRIMO contatto
          // NONOSTANTE il gas a tavoletta: senza frenata, con 13 m/s² di
          // spinta, il fotogramma dopo sarebbe PIÙ veloce di +0,65, non
          // più lento.
          giusto:
            balzo &&
            film.registro.vPrima > 1.5 &&
            Math.abs(film.registro.vPrima - vAllUltimo) < 0.9 &&
            vPost < vPre - 0.1,
        };
        if (urto.giusto) break;
      }
      if (urto && urto.giusto) {
        ok(
          "l'auto paga il pedone toccato",
          `v ${urto.vPre.toFixed(2)} → ${urto.vPost.toFixed(2)} m/s col gas giù · registro vPrima ${urto.registro.vPrima.toFixed(2)} · NPC in balzo, frenate ${urto.registro.frenate}`,
        );
      } else if (urto) {
        ko(
          "l'auto paga il pedone toccato",
          `v ${urto.vPre.toFixed(2)} → ${urto.vPost.toFixed(2)} m/s, balzo=${urto.balzo}, registro ${JSON.stringify(urto.registro)}`,
        );
      } else {
        ko("l'auto paga il pedone toccato", `nessun contatto ottenuto su ${candidati.length} pedoni in carreggiata`);
      }
    }

    // ── a piedi: il pedone cede il passo, il giocatore tira dritto ──────
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(1000);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }
    // Fino a quattro tentativi: il «fermo» scelto ogni tanto riparte
    // proprio mentre la camera si assesta, e allora si prova col prossimo.
    let cessione = null;
    // si riprova anche se manca solo il fumetto: protestaOstacolo tace se
    // l'NPC stava GIÀ dicendo una battuta sua, e un altro pedone non ha
    // questo vincolo
    for (let tentativo = 0; tentativo < 4 && !(cessione?.giusto && cessione?.borbotta); tentativo++) {
      const ped2 = await lugo('L.pedoni()');
      const me0 = await lugo('L.pos()');
      const fermi = ped2
        .filter((n) => n.stato === 'fermo')
        .sort((a, b) => Math.hypot(a.x - me0[0], a.z - me0[1]) - Math.hypot(b.x - me0[0], b.z - me0[1]));
      const n0 = fermi[tentativo % Math.max(1, fermi.length)];
      if (!n0) break;
      await page.evaluate(([x, z]) => window.__LUGO__.teleport(x - 2, z), [n0.x, n0.z]);
      await page.waitForTimeout(1000);
      const cam = (await lugo('L.direzione()')).camYaw;
      const ancora = await lugo(`L.pedoni()[${n0.i}]`);
      if (ancora.stato !== 'fermo') continue;
      // ci si mette a 1,6 m ESATTI dietro di lui rispetto alla camera, già
      // girati verso di lui: senza lo yaw giusto il primo tratto sarebbe
      // una virata, e la retta di marcia da misurare non sarebbe una retta
      const sx = ancora.x - Math.cos(cam) * 1.6;
      const sz = ancora.z - Math.sin(cam) * 1.6;
      await page.evaluate(([x, z, y]) => window.__LUGO__.teleport(x, z, y), [sx, sz, cam]);
      await page.waitForTimeout(400);
      const cedPrima = (await lugo('L.ostacoli()')).cedute;
      const npcPrima = await lugo(`L.pedoni()[${n0.i}]`);
      if (npcPrima.stato !== 'fermo') continue;
      const rotta = [];
      let fumettoCaldo = null;
      await page.keyboard.down('KeyW');
      let ceduto = false;
      for (let k = 0; k < 40; k++) {
        await page.waitForTimeout(150);
        rotta.push(await lugo('L.pos()'));
        if ((await lugo('L.ostacoli()')).cedute > cedPrima) {
          ceduto = true;
          fumettoCaldo = await lugo('L.fumetti()');
          break;
        }
      }
      await page.keyboard.up('KeyW');
      await page.waitForTimeout(600);
      const npcDopo = await lugo(`L.pedoni()[${n0.i}]`);
      // la deviazione laterale del GIOCATORE dalla propria retta di
      // marcia: l'NPC scarta, chi cammina no — rt.persona non si tocca
      let latMax = 0;
      if (rotta.length >= 2) {
        const a = rotta[0];
        const b = rotta[rotta.length - 1];
        const ux = b[0] - a[0];
        const uz = b[1] - a[1];
        const ul = Math.hypot(ux, uz) || 1;
        for (const p of rotta) {
          latMax = Math.max(latMax, Math.abs((-(p[0] - a[0]) * uz + (p[1] - a[1]) * ux) / ul));
        }
      }
      const fumetti2 = fumettoCaldo ?? (await lugo('L.fumetti()'));
      const proteste = await lugo('L.frasi("ostacolo")');
      const borbotta = (fumetti2?.testi ?? []).some((t) => proteste.includes(t));
      cessione = {
        ceduto,
        spostamento: Math.hypot(npcDopo.x - npcPrima.x, npcDopo.z - npcPrima.z),
        statoDopo: npcDopo.stato,
        latMax,
        borbotta,
        giusto: false,
      };
      cessione.giusto = ceduto && cessione.spostamento > 0.4 && latMax < 0.2;
    }
    if (cessione && cessione.giusto) {
      ok(
        'a piedi il pedone cede il passo',
        `scarta di ${cessione.spostamento.toFixed(2)} m (stato ${cessione.statoDopo}) e il giocatore devia di ${cessione.latMax.toFixed(3)} m`,
      );
    } else if (cessione) {
      ko(
        'a piedi il pedone cede il passo',
        `ceduto=${cessione.ceduto}, NPC spostato ${cessione.spostamento.toFixed(2)} m, deviazione giocatore ${cessione.latMax.toFixed(3)} m`,
      );
    } else {
      ko('a piedi il pedone cede il passo', 'nessun pedone fermo su cui provare');
    }
    // il borbottio è del gruppo nuovo dell'atlante, non una frase a caso
    if (cessione && cessione.borbotta) {
      ok('il pedone scansato borbotta la sua', 'fumetto dal gruppo «ostacolo»');
    } else if (cessione && cessione.giusto) {
      ko('il pedone scansato borbotta la sua', 'nessun fumetto del gruppo «ostacolo» a schermo dopo la cessione');
    } else if (cessione) {
      ko('il pedone scansato borbotta la sua', 'la cessione stessa non è riuscita (vedi sopra)');
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
      // Le due pesate si fanno con la CAMERA FISSA A PIOMBO sul giocatore:
      // la chase camera cambia orientamento montando in sella, e il
      // segnalino di missione (anello + fascio, due chiamate) entrava nel
      // frustum in una misura sola — 133 → 137 con la bici che ne costa
      // due, a intermittenza, secondo dove guardava la camera e quando la
      // catena proponeva. Da 16 metri dritti in giù il cono copre ~8 metri
      // di raggio: la tappa di qualunque missione resta fuori inquadratura
      // in ENTRAMBE le misure, accesa o spenta che sia.
      const quiBici = await lugo('L.pos()');
      await page.evaluate(
        ([x, z]) => window.__LUGO__.fotocamera(x, 16, z + 0.1, x, 0, z, 40000),
        quiBici,
      );
      await page.waitForTimeout(400);
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
    // Lo stallo si sceglie in modo che la E non abbia rivali. La E prende
    // il bersaglio più vicino fra bici e auto, e il punto «a fianco» di un
    // posteggio può capitare a un passo da una bici appoggiata a un muro:
    // è successo — il collaudo saltava in sella alla bici e cinque
    // controlli su un furto d'auto mai tentato andavano rossi. Qui ci si
    // mette sul punto a fianco e si chiede al GIOCO chi prenderebbe la E
    // (furtoQui): se non è proprio quel posteggio, ci si sposta in un'altra
    // zona e si riprova — postoAuto dà sempre l'auto più vicina a dove sei.
    let p = await lugo('L.postoAuto()');
    for (let giro = 0; giro < 6 && p; giro++) {
      await page.evaluate((q) => window.__LUGO__.teleport(q.lato[0], q.lato[1]), p);
      await page.waitForTimeout(600);
      const bersaglio = await lugo('L.furtoQui()');
      if (bersaglio && bersaglio.tipo === 'posteggio' && bersaglio.i === p.i) break;
      await page.evaluate(
        ([x, z]) => window.__LUGO__.teleport(x, z),
        [p.x + 90 + giro * 60, p.z + 45 - giro * 30],
      );
      await page.waitForTimeout(500);
      p = await lugo('L.postoAuto()');
    }
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
      // Il fuoco si toglie dal bottone, come fa già la fase 4d. Senza
      // questa riga la guardia appena collaudata restava ARMATA per tutto
      // il resto del collaudo: ogni E successiva era muta (fuocoSuComando),
      // le fasi dopo non scendevano più dall'auto, e si sono viste
      // «camminate» nel Pavaglione fatte in macchina e drag a piedi
      // giudicati col metro dei mezzi. Il fuoco è stato di pagina: le fasi
      // se lo passano come qualunque altro residuo.
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.waitForTimeout(200);
    }
  }

  // ── fase 11: dentro il Pavaglione a piedi ─────────────────────────────
  // I quattro portali del quadriportico sono corridoi APERTI nel collider,
  // e la corte non è più sigillata. Qui non ci si teletrasporta dentro:
  // il teletrasporto porta solo DAVANTI al portale, 6 m fuori dalla
  // facciata, e da lì si cammina con la tastiera vera fino a 4 m oltre il
  // muro interno della corte — se il varco è murato, la camminata si
  // incastra e la fase lo dice. Le coordinate sono i punti-varco della
  // mappa vera (centro dei lati del rettangolo minimo del footprint, la
  // stessa costruzione di gates.ts): la mappa è generata in CI e non
  // cambia, come le altre coordinate cablate di questo collaudo.
  if ((await lugo('typeof L.teleport')) === 'function' && (await lugo('typeof L.avviaMissione')) === 'function') {
    // orologio fermo sulle 14: niente mercato in corte, come nella fase
    // delle otto direzioni — un banco di piadine in mezzo al passaggio
    // farebbe fallire una camminata su un varco che funziona benissimo
    await page.evaluate(() => window.__LUGO__.tempoScorre(false));
    await page.evaluate(() => window.__LUGO__.ora(14));
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
    // il fuoco della tastiera si toglie da qualunque bottone PRIMA della E:
    // con il fuoco su un comando la E è muta per progetto (fuocoSuComando)
    // e questa fase «camminerebbe» restando al volante
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(1000);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }

    // i due varchi OPPOSTI dell'asse lungo, più quello sud per la missione
    const varchi = [
      { nome: 'sud-ovest', fuori: [-87.09, 33.82], corte: [-61.25, 51.8], yaw: Math.atan2(0.5712, 0.8208) },
      { nome: 'nord-est', fuori: [40.87, 122.86], corte: [13.06, 103.51], yaw: Math.atan2(-0.5712, -0.8208) },
      { nome: 'sud', fuori: [6.62, 35.61], corte: [-7.86, 56.42], yaw: Math.atan2(0.8208, -0.5712) },
    ];

    // La camminata guidata è il camminatore in comune definito in testa al
    // collaudo (nato qui, promosso quando anche la missione 01 ha avuto
    // bisogno di camminare): nessun teletrasporto, nessuna spinta esterna.
    for (const v of varchi.slice(0, 2)) {
      await page.evaluate(([x, z, y]) => window.__LUGO__.teleport(x, z, y), [v.fuori[0], v.fuori[1], v.yaw]);
      await page.waitForTimeout(500);
      const beeline = Math.hypot(v.corte[0] - v.fuori[0], v.corte[1] - v.fuori[1]);
      const esito = await camminaVerso(v.corte[0], v.corte[1]);
      // Il verdetto pretende anche mode=piedi: la prima stesura non lo
      // chiedeva, e un giro col fuoco rimasto su un bottone (E muta, mai
      // scesi) ha attraversato i varchi IN AUTO passando la prova — il
      // corridoio è più largo dell'auto, ma la promessa è la camminata.
      // E il tetto sui metri non è pignoleria: senza, una camminata che
      // aggira l'isolato ed entra da un ALTRO varco passerebbe la prova.
      const modoFine = await lugo('L.mode()');
      if (esito.ok && modoFine === 'piedi' && esito.metri < beeline * 1.8 + 6) {
        ok(`varco ${v.nome}: in corte camminando`, `${esito.metri.toFixed(1)} m a piedi (retta ${beeline.toFixed(1)} m)`);
      } else {
        ko(
          `varco ${v.nome}: in corte camminando`,
          `mode=${modoFine} · ${esito.ok ? 'arrivato ma con ' + esito.metri.toFixed(1) + ' m di giro' : (esito.perche ?? '?') + ' a (' + esito.pos[0].toFixed(1) + ';' + esito.pos[1].toFixed(1) + '), ' + esito.metri.toFixed(1) + ' m'}`,
        );
      }
    }
    await page.screenshot({ path: join(SHOTS, '32-pavaglione-corte.png') });

    // ── la missione della corte, completata camminando ──────────────────
    // m05 «Entra nella corte a piedi»: la tappa sta nel POI dentro la
    // corte, quindi si chiude solo se i varchi si attraversano davvero.
    // Si parte da FUORI il varco sud e si arriva a piedi, senza teleport
    // oltre quello iniziale; il premio in denaro deve tornare esatto.
    const e0 = await lugo('L.denaro()');
    const avviata = await page.evaluate(() => window.__LUGO__.avviaMissione('m05'));
    await page.waitForTimeout(300);
    const tappa = await lugo('L.tappaCorrente()');
    if (!avviata || !tappa) {
      ko('la missione della corte si completa a piedi', `avviata=${avviata}, tappa=${JSON.stringify(tappa)}`);
    } else {
      const vSud = varchi[2];
      await page.evaluate(([x, z, y]) => window.__LUGO__.teleport(x, z, y), [vSud.fuori[0], vSud.fuori[1], vSud.yaw]);
      await page.waitForTimeout(400);
      const legA = await camminaVerso(vSud.corte[0], vSud.corte[1]);
      const legB = legA.ok ? await camminaVerso(tappa.x, tappa.z, 1.2) : { ok: false, metri: 0 };
      await page.waitForTimeout(900);
      const statoFine = await lugo('L.statoMissione()');
      const guadagno = (await lugo('L.denaro()')) - e0;
      if (statoFine === 'completata' && legA.ok && legB.ok && Math.round(guadagno) === 15) {
        ok(
          'la missione della corte si completa a piedi',
          `${(legA.metri + legB.metri).toFixed(1)} m camminati dal fuori del varco sud · +€${Math.round(guadagno)}`,
        );
      } else {
        ko(
          'la missione della corte si completa a piedi',
          `stato ${statoFine}, tratte ${legA.ok}/${legB.ok} (${(legA.metri + legB.metri).toFixed(1)} m), +€${guadagno}`,
        );
      }
    }
    // ── l'arcata non-portale, e il fondale che resta muro ───────────────
    // La verità nuova del porticato: fra pilastro e pilastro si passa
    // OVUNQUE l'arco è aperto, non solo nei 4 corridoi; e dove il disegno
    // mostra muro (il fondale delle botteghe, la facciata cieca) non si
    // passa. I punti si derivano dal varco sud: 18 m di scarto lungo il
    // lato mettono l'ingresso in piena arcata, ben lontano dal corridoio,
    // e restano dentro il lato (che è lungo più di 80 m).
    {
      const vS = varchi[2];
      const perp = [0.8208, 0.5712]; // il lato, perpendicolare all'asse del passaggio
      const mid = [(vS.fuori[0] + vS.corte[0]) / 2, (vS.fuori[1] + vS.corte[1]) / 2];
      const yawInCorte = Math.atan2(vS.corte[1] - vS.fuori[1], vS.corte[0] - vS.fuori[0]);
      let arcata = { ok: false, metri: 0 };
      for (const s of [18, 21]) {
        const sotto = [mid[0] + s * perp[0], mid[1] + s * perp[1]];
        const inCorte = [vS.corte[0] + s * perp[0], vS.corte[1] + s * perp[1]];
        await page.evaluate(([x, z, y]) => window.__LUGO__.teleport(x, z, y), [sotto[0], sotto[1], yawInCorte]);
        await page.waitForTimeout(400);
        arcata = await camminaVerso(inCorte[0], inCorte[1], 1.3, 60000);
        if (arcata.ok) break; // un pilastro preso in pieno merita un secondo scarto, non un rosso
      }
      const modoArc = await lugo('L.mode()');
      if (arcata.ok && modoArc === 'piedi') ok("in corte da un'arcata non-portale", `${arcata.metri.toFixed(1)} m fra i pilastri`);
      else ko("in corte da un'arcata non-portale", `mode=${modoArc} · ${arcata.perche ?? 'giro largo'} a (${arcata.pos?.[0]?.toFixed(1)};${arcata.pos?.[1]?.toFixed(1)}), ${arcata.metri.toFixed(1)} m`);

      // anti-fantasma: dal portico verso FUORI, dove la facciata è
      // disegnata piena, la camminata deve incastrarsi — non passare
      const sotto = [mid[0] + 18 * perp[0], mid[1] + 18 * perp[1]];
      const oltreIlMuro = [vS.fuori[0] + 18 * perp[0], vS.fuori[1] + 18 * perp[1]];
      await page.evaluate(([x, z]) => window.__LUGO__.teleport(x, z), [sotto[0], sotto[1]]);
      await page.waitForTimeout(400);
      const muro = await camminaVerso(oltreIlMuro[0], oltreIlMuro[1], 1.3, 45000);
      if (!muro.ok && muro.perche === 'incastrato') ok('il fondale resta solido', `fermato dopo ${muro.metri.toFixed(1)} m, come dev'essere`);
      else ko('il fondale resta solido', muro.ok ? `passato ATTRAVERSO la facciata cieca (${muro.metri.toFixed(1)} m)` : `esito strano: ${muro.perche}`);
    }
    await page.evaluate(() => window.__LUGO__.tempoScorre(true));
  }

  // ── fase 12: la visuale a 360° col dito e col mouse ───────────────────
  // Il drag sul canvas converte pixel in radianti (0,006 rad/px in
  // orizzontale): a piedi gira DIRETTAMENTE il riferimento dei comandi, in
  // auto è solo uno sguardo che decade al rilascio. Qui si misura tutto in
  // radianti attesi, non «si è mosso qualcosa»: la conversione è esatta e
  // il collaudo la pretende esatta.
  if ((await lugo('typeof L.orbita')) === 'function') {
    const normAng = (a) => {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    };
    // niente override della fotocamera e niente pannelli: il drag sotto
    // override viene scartato apposta, e qui non lo si sta provando
    await lugo('L.fotocamera(0, 0, 0, 0, 0, 0, 0) ?? true');
    await page.evaluate(() => window.__LUGO__.chiudiPannelli?.());
    // via il fuoco da eventuali bottoni: con fuocoSuComando la E è muta e
    // le prove «a piedi» qui sotto si ritroverebbero a giudicare l'auto
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    for (let i = 0; i < 4 && (await lugo('L.mode()')) !== 'piedi'; i++) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(1000);
      await page.keyboard.up('Space');
      await page.keyboard.press('KeyE', TENUTO);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(400);

    // ── drag orizzontale a piedi: 300 px = 1,800 rad, e yaw è l'unica
    // verità (niente offset residuo) ──────────────────────────────────
    {
      const modeDrag = await lugo('L.mode()');
      const y0 = (await lugo('L.orbita()')).yaw;
      await page.mouse.move(480, 350);
      await page.mouse.down();
      await page.mouse.move(780, 350, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      const o = await lugo('L.orbita()');
      const delta = o.yaw - y0;
      // il metro vale solo a piedi (nei mezzi il drag va nell'offset): il
      // mode sta nel verdetto perché una volta questa prova è stata fatta
      // per sbaglio al volante e diceva Δyaw=0 su un'orbita sanissima
      if (modeDrag === 'piedi' && Math.abs(delta - 1.8) < 0.06 && Math.abs(o.offset) < 1e-6) {
        ok('drag orizzontale: 300 px → 1,8 rad di visuale', `Δyaw=${delta.toFixed(3)} rad, offset=${o.offset}`);
      } else {
        ko('drag orizzontale: 300 px → 1,8 rad di visuale', `mode=${modeDrag}, Δyaw=${delta.toFixed(3)} rad, offset=${o.offset}`);
      }
    }

    // ── drag verticale: il pitch si ferma esattamente ai clamp ─────────
    {
      await page.mouse.move(640, 200);
      await page.mouse.down();
      await page.mouse.move(640, 700, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(250);
      const giu = (await lugo('L.orbita()')).pitch;
      for (let k = 0; k < 2; k++) {
        await page.mouse.move(640, 700);
        await page.mouse.down();
        await page.mouse.move(640, 100, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(250);
      }
      const su = (await lugo('L.orbita()')).pitch;
      if (Math.abs(giu - 0.55) < 1e-6 && Math.abs(su + 0.12) < 1e-6) {
        ok('il pitch si ferma ai suoi clamp', `in giù ${giu}, in su ${su}`);
      } else {
        ko('il pitch si ferma ai suoi clamp', `in giù ${giu} (atteso 0.55), in su ${su} (atteso −0.12)`);
      }
      // si riporta lo sguardo in piano per le prove dopo (−0,12 + 27·0,0045)
      await page.mouse.move(640, 400);
      await page.mouse.down();
      await page.mouse.move(640, 427, { steps: 3 });
      await page.mouse.up();
      await page.waitForTimeout(250);
    }

    // ── mezzo giro e W: si cammina verso il NUOVO avanti ───────────────
    // È la prova che il drag gira davvero il riferimento dei comandi e
    // non solo l'inquadratura: dopo ~π di trascinamento, W deve portare
    // dove ADESSO si guarda. In headless si aspetta il regime (giravolta
    // finita) prima di misurare, o si misurerebbe la virata.
    {
      const dove = await lugo('L.pos()');
      const inStrada2 = await lugo(`L.suStrada(${dove[0]}, ${dove[1]})`);
      if (inStrada2) {
        await page.evaluate((q) => window.__LUGO__.teleport(q[0], q[1]), inStrada2);
        await page.waitForTimeout(400);
      }
      const y0 = (await lugo('L.direzione()')).camYaw;
      for (let k = 0; k < 2; k++) {
        await page.mouse.move(480, 350);
        await page.mouse.down();
        await page.mouse.move(742, 350, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(200);
      }
      const y1 = (await lugo('L.direzione()')).camYaw;
      const mezzo = normAng(y1 - y0);
      await page.keyboard.down('KeyW');
      await page
        .waitForFunction(
          () => {
            const d = window.__LUGO__.direzione();
            let s = d.yaw - d.camYaw;
            while (s > Math.PI) s -= Math.PI * 2;
            while (s < -Math.PI) s += Math.PI * 2;
            return d.v > 2.1 && Math.abs(s) < 0.08;
          },
          null,
          { timeout: 25000 },
        )
        .catch(() => {});
      const p0 = await lugo('L.pos()');
      await page.waitForTimeout(1500);
      const p1 = await lugo('L.pos()');
      const dir = await lugo('L.direzione()');
      await page.keyboard.up('KeyW');
      const mosso = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const scarto = Math.abs(normAng(Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) - dir.camYaw));
      // 524 px · 0,006 = 3,144 ≈ π: il drag deve valere il mezzo giro, e
      // il moto deve seguire il nuovo avanti (con la tolleranza della
      // finestra corta: a passo di banco 1,5 s sono pochi fotogrammi)
      if (Math.abs(Math.abs(mezzo) - 3.144) < 0.08 && mosso > 0.3 && scarto < 0.3) {
        ok('dopo mezzo giro la W va verso il nuovo avanti', `drag=${mezzo.toFixed(3)} rad, ${mosso.toFixed(2)} m con scarto ${scarto.toFixed(3)} rad`);
      } else {
        ko('dopo mezzo giro la W va verso il nuovo avanti', `drag=${mezzo.toFixed(3)} rad, mosso=${mosso.toFixed(2)} m, scarto=${scarto.toFixed(3)} rad`);
      }
      await page.waitForTimeout(400);
    }

    // ── in auto: il drag è uno sguardo che non tocca la guida e decade ──
    {
      const qui2 = await lugo('L.pos()');
      await page.evaluate((q) => window.__LUGO__.teleport(q[0], q[1]), qui2);
      await page.waitForTimeout(300);
      await page.evaluate((q) => window.__LUGO__.teleport(q[0] + 3, q[1] + 3, undefined, false), qui2);
      await page.waitForTimeout(400);
      let modeA = await lugo('L.mode()');
      for (let i = 0; i < 4 && modeA !== 'auto'; i++) {
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(500);
        modeA = await lugo('L.mode()');
      }
      if (modeA !== 'auto') {
        ko('in auto il drag è solo uno sguardo', 'non si è risaliti in auto per la prova');
      } else {
        await page.waitForTimeout(300);
        const camPrima = (await lugo('L.direzione()')).camYaw;
        await page.mouse.move(480, 350);
        await page.mouse.down();
        await page.mouse.move(720, 350, { steps: 8 });
        await page.waitForTimeout(300);
        const oGiu = await lugo('L.orbita()');
        const camDurante = (await lugo('L.direzione()')).camYaw;
        await page.mouse.up();
        if (Math.abs(oGiu.offset - 1.44) < 0.08 && Math.abs(normAng(camDurante - camPrima)) < 0.02) {
          ok('in auto il drag è solo uno sguardo', `offset=${oGiu.offset.toFixed(3)} rad col dito giù, riferimento di guida fermo`);
        } else {
          ko('in auto il drag è solo uno sguardo', `offset=${oGiu.offset.toFixed(3)} (atteso 1.44), Δguida=${normAng(camDurante - camPrima).toFixed(4)}`);
        }
        // Il rientro decade con dtRaw VERO (non clampato): ~2,5 s a
        // orologio anche su questo banco in slow-motion — è il punto
        // della cura, e si misura proprio così.
        await page.waitForTimeout(3200);
        const oSu = await lugo('L.orbita()');
        if (Math.abs(oSu.offset) < 0.02) {
          ok('al rilascio lo sguardo rientra dietro al mezzo', `offset=${oSu.offset.toFixed(4)} dopo 3,2 s`);
        } else {
          ko('al rilascio lo sguardo rientra dietro al mezzo', `offset=${oSu.offset.toFixed(4)} dopo 3,2 s`);
        }
        // si scende per le prove col tocco
        await page.keyboard.press('KeyE', TENUTO);
        await page.waitForTimeout(600);
      }
    }

    // ── pinch a due dita e rotellina: lo zoom vive nei clamp ───────────
    // Semantica CDP verificata a banco (vedi fase 3a-quater): in touchEnd
    // si elencano i punti RILASCIATI, non i superstiti.
    {
      const cdpO = await page.context().newCDPSession(page);
      const toccoO = (type, punti) =>
        cdpO.send('Input.dispatchTouchEvent', { type, touchPoints: punti.map(([id, x, y]) => ({ x, y, id })) });
      const z0 = (await lugo('L.orbita()')).zoom;
      await toccoO('touchStart', [[1, 600, 400], [2, 680, 400]]);
      for (let i = 1; i <= 8; i++) await toccoO('touchMove', [[1, 600 - i * 19, 400], [2, 680 + i * 19, 400]]);
      await page.waitForTimeout(200);
      const zIn = (await lugo('L.orbita()')).zoom;
      await toccoO('touchEnd', [[1, 448, 400], [2, 832, 400]]);
      await page.waitForTimeout(150);
      await toccoO('touchStart', [[1, 448, 400], [2, 832, 400]]);
      for (let i = 1; i <= 8; i++) await toccoO('touchMove', [[1, 448 + i * 21, 400], [2, 832 - i * 21, 400]]);
      await page.waitForTimeout(200);
      const zOut = (await lugo('L.orbita()')).zoom;
      await toccoO('touchEnd', [[1, 616, 400], [2, 664, 400]]);
      await page.waitForTimeout(150);
      if (zIn < z0 && Math.abs(zIn - 0.6) < 1e-6 && Math.abs(zOut - 1.6) < 1e-6) {
        ok('il pinch zooma dentro i clamp', `allargando ${z0.toFixed(2)} → ${zIn}, stringendo → ${zOut}`);
      } else {
        ko('il pinch zooma dentro i clamp', `da ${z0.toFixed(3)}: allargando ${zIn} (atteso 0.6), stringendo ${zOut} (atteso 1.6)`);
      }
      // la rotellina segue la stessa legge esponenziale del pinch: da 1,6
      // uno scroll di −600 px deve dare esattamente 1,6·e^(−0,66)
      await page.mouse.move(640, 400);
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(250);
      const zW = (await lugo('L.orbita()')).zoom;
      const attesoW = 1.6 * Math.exp(-600 * 0.0011);
      if (Math.abs(zW - attesoW) < 0.02) {
        ok('la rotellina segue la stessa legge', `zoom=${zW.toFixed(3)} = 1,6·e^(−0,66)`);
      } else {
        ko('la rotellina segue la stessa legge', `zoom=${zW.toFixed(3)}, atteso ${attesoW.toFixed(3)}`);
      }
      // si torna a zoom ~1 per non falsare le inquadrature che seguono
      await page.mouse.wheel(0, Math.round(Math.log(1 / zW) / 0.0011));
      await page.waitForTimeout(200);

      // ── due dita insieme: il pad cammina, il canvas orbita ────────────
      // È il gesto da telefono: pollice sinistro sul pad, destro che gira
      // la visuale. Se la contabilità dei puntatori facesse confusione, il
      // rilascio del dito del canvas azzererebbe il pad (o viceversa).
      const padO = await page.locator('[data-hud="joystick-pad"]').boundingBox();
      if (padO) {
        const pcx = padO.x + padO.width / 2;
        const pcy = padO.y + padO.height / 2;
        await toccoO('touchStart', [[1, pcx, pcy]]);
        await toccoO('touchMove', [[1, pcx, pcy - 30]]);
        await page
          .waitForFunction(() => window.__LUGO__.direzione().v > 1.2, null, { timeout: 10000 })
          .catch(() => {});
        const vSolo = (await lugo('L.direzione()')).v;
        const yaw0 = (await lugo('L.orbita()')).yaw;
        await toccoO('touchStart', [[1, pcx, pcy - 30], [2, 480, 350]]);
        let vMin = 99;
        for (let i = 1; i <= 10; i++) {
          await toccoO('touchMove', [[1, pcx, pcy - 30], [2, 480 + i * 30, 350]]);
          if (i % 3 === 0) {
            const v = (await lugo('L.direzione()')).v;
            if (v < vMin) vMin = v;
          }
        }
        await page.waitForTimeout(200);
        const oDue = await lugo('L.orbita()');
        await toccoO('touchEnd', [[2, 780, 350]]); // si molla SOLO il dito del canvas
        await page.waitForTimeout(700);
        const vResta = (await lugo('L.direzione()')).v;
        const oResta = await lugo('L.orbita()');
        await toccoO('touchEnd', [[1, pcx, pcy - 30]]);
        await page
          .waitForFunction(() => window.__LUGO__.direzione().v < 0.05, null, { timeout: 10000 })
          .catch(() => {});
        const vFine = (await lugo('L.direzione()')).v;
        const dettaglioDita = `v ${vSolo.toFixed(2)} (min ${vMin.toFixed(2)}) → canvas Δyaw=${(oDue.yaw - yaw0).toFixed(3)} → mollato il canvas v=${vResta.toFixed(2)} → mollato il pad v=${vFine.toFixed(3)}`;
        if (
          vSolo > 1.2 &&
          vMin > 1.0 &&
          Math.abs(oDue.yaw - yaw0 - 1.8) < 0.35 &&
          vResta > 1.0 &&
          oResta.attiva === false &&
          vFine < 0.05
        ) {
          ok('pad e orbita insieme, due dita vere', dettaglioDita);
        } else {
          ko('pad e orbita insieme, due dita vere', dettaglioDita + ' (attesi pad vivo, 300 px → ~1,8 rad, stop solo al rilascio del pad)');
        }
      }
    }
  }

  // ── fase 13: i capitoli e il salto, su una partita nuova ──────────────
  // Le due milestone chiedono un salvataggio VERGINE: il capitolo 1 coi
  // suoi «0 di 4» esiste solo a missioni zero, e la scheda CAPITOLO
  // COMPLETATO deve scattare all'AVANZAMENTO, mai al load. La pagina
  // principale ha alle spalle furti, stelle e missioni fatte: riazzerarla
  // a mano vorrebbe dire fidarsi di una pulizia che nessuno collauda. Si
  // apre invece una pagina nuova di zecca — contesto nuovo, localStorage
  // nuovo — e la partita ricomincia dall'auto, che è anche il posto giusto
  // per la prova più delicata del salto: lo Spazio al volante deve restare
  // il FRENO. Gli errori console di questa partita si raccolgono a parte,
  // così il controllo storico «zero errori console» conserva il suo
  // significato di sempre sulla pagina di sempre.
  {
    const errori2 = [];
    const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page2.on('pageerror', (e) => errori2.push(String(e)));
    page2.on('console', (m) => {
      if (m.type() === 'error') errori2.push(m.text());
    });
    const lugo2 = (expr) => page2.evaluate(`(() => { const L = window.__LUGO__; return L ? (${expr}) : undefined })()`);

    await page2.goto(URL, { waitUntil: 'networkidle' });
    await page2.waitForFunction(() => window.__LUGO__ && window.__LUGO__.pronto === true, null, { timeout: 40000 });
    const salta2 = page2.locator('[data-hud="salta-intro"]');
    if (await salta2.count()) await salta2.click({ timeout: 5000 }).catch(() => {});
    await page2.waitForTimeout(400);
    const gioca2 = page2.locator('[data-hud="gioca"]');
    if (await gioca2.count()) await gioca2.click();
    await page2.waitForTimeout(800);
    // il fuoco resta sul bottone GIOCA appena cliccato: senza blur lo
    // Spazio riattiverebbe il bottone invece di frenare — lezione già
    // pagata dalla fase 2
    await page2.evaluate(() => document.activeElement && document.activeElement.blur());

    const haCapitoli = await lugo2("typeof L.capitolo === 'function'");
    const haSalto = await lugo2("typeof L.scavalcabili === 'function' && typeof L.direzione().y === 'number'");

    // completa una missione registrata: avvio da hook e teletrasporto di
    // tappa in tappa — stessa retroazione della fase 4, ma sulla pagina
    // nuova (il camminatore guidato è legato a `page`, qui non serve)
    const completa2 = async (id) => {
      const via = await lugo2(`L.avviaMissione(${JSON.stringify(id)})`);
      if (!via) return `avviaMissione(${id}) rifiutata`;
      for (let giri = 0; giri < 12; giri++) {
        const stato = await lugo2('L.statoMissione()');
        if (stato === 'completata') return null;
        if (stato !== 'attiva') return `stato inatteso «${stato}»`;
        const t = await lugo2('L.tappaCorrente()');
        if (!t) {
          await page2.waitForTimeout(400);
          continue;
        }
        await lugo2(`L.teleport(${t.x}, ${t.z})`);
        await page2
          .waitForFunction(
            (prima) => {
              const w = window.__LUGO__;
              return w.statoMissione() === 'completata' || JSON.stringify(w.tappaCorrente()) !== prima;
            },
            JSON.stringify(t),
            { timeout: 30000 },
          )
          .catch(() => {});
      }
      return 'tappe non finite in 12 giri';
    };

    // ── capitoli: la partita vergine ────────────────────────────────────
    if (haCapitoli) {
      const c0 = await lugo2('L.capitolo()');
      if (c0 && c0.n === 1 && c0.nome === "L'arrivo" && c0.traguardo === 'Prime missioni: 0 di 4' && Array.isArray(c0.completi) && c0.completi.length === 0)
        ok('capitolo 1 a salvataggio vuoto', `${c0.nome} — ${c0.traguardo}`);
      else ko('capitolo 1 a salvataggio vuoto', JSON.stringify(c0));

      const chip0 = await page2.textContent('[data-hud="capitolo"]').catch(() => null);
      if (chip0 && chip0.includes('Cap. 1') && chip0.includes("L'arrivo") && chip0.includes('0 di 4'))
        ok('il chip dei capitoli dice il vero', chip0.trim());
      else ko('il chip dei capitoli dice il vero', String(chip0));

      if ((await page2.locator('[data-hud="capitolo-scheda"]').count()) === 0) ok('nessuna scheda capitolo al via');
      else ko('nessuna scheda capitolo al via', 'già a schermo a partita appena nata');
    }

    // ── salto, prova al volante: lo Spazio resta il freno ───────────────
    // Prima di scendere: si prende velocità con la W, poi Spazio tenuto.
    // Due finestre uguali di 4 s: nella prima l'auto sta ancora smaltendo
    // l'abbrivio, nella seconda deve essere praticamente ferma — e la
    // quota della persona deve restare zero, mai un accenno di salto.
    if (haSalto) {
      const m0 = await lugo2('L.mode()');
      await page2.keyboard.down('KeyW');
      await page2.waitForTimeout(6000);
      await page2.keyboard.up('KeyW');
      const p0 = await lugo2('L.pos()');
      await page2.keyboard.down('Space');
      await page2.waitForTimeout(4000);
      const p1 = await lugo2('L.pos()');
      await page2.waitForTimeout(4000);
      const p2 = await lugo2('L.pos()');
      await page2.keyboard.up('Space');
      const m1 = await lugo2('L.mode()');
      const yFreno = (await lugo2('L.direzione()')).y;
      const s1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const s2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      if (m0 === 'auto' && m1 === 'auto' && s2 < Math.max(0.25, s1 * 0.5) && yFreno === 0)
        ok('in auto lo Spazio è ancora il freno', `tratti per finestra ${s1.toFixed(2)} → ${s2.toFixed(2)} m, quota 0, si resta al volante`);
      else ko('in auto lo Spazio è ancora il freno', `mode ${m0}→${m1}, tratti ${s1.toFixed(2)}→${s2.toFixed(2)} m, y=${yFreno}`);
    }

    // si scende: freno e poi E tenuta (il fronte del tasto vive un
    // fotogramma, vedi TENUTO); un secondo giro copre l'auto ancora in moto
    for (let giro = 0; giro < 2 && (await lugo2('L.mode()')) !== 'piedi'; giro++) {
      await page2.keyboard.down('Space');
      await page2.waitForTimeout(2500);
      await page2.keyboard.up('Space');
      await page2.keyboard.press('KeyE', TENUTO);
      await page2.waitForTimeout(700);
    }

    // ── capitoli: la catena che chiude «L'arrivo» ───────────────────────
    if (haCapitoli) {
      let inciampo = null;
      for (const id of ['m00', 'mvp1', 'mvp2']) {
        const e = await completa2(id);
        if (e && !inciampo) inciampo = `${id}: ${e}`;
        await lugo2('L.chiudiPannelli()');
      }
      const c1 = await lugo2('L.capitolo()');
      if (!inciampo && c1.n === 1 && c1.traguardo === 'Prime missioni: 3 di 4')
        ok('i numeri del capitolo 1 sono vivi', c1.traguardo);
      else ko('i numeri del capitolo 1 sono vivi', inciampo ?? JSON.stringify(c1));

      // mvp3 chiude il capitolo: la scheda deve comparire ADESSO, e non
      // deve né coprire né ritardare l'esito della missione
      const e3 = await completa2('mvp3');
      const schedaViva = await page2
        .waitForFunction(() => document.querySelector('[data-hud="capitolo-scheda"]'), null, { timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      if (!e3 && schedaViva) {
        const testo = ((await page2.textContent('[data-hud="capitolo-scheda"]')) ?? '').trim();
        if (testo.includes('CAPITOLO COMPLETATO') && testo.includes("L'arrivo")) ok('la scheda CAPITOLO COMPLETATO compare', testo);
        else ko('la scheda CAPITOLO COMPLETATO compare', `testo strano: ${testo}`);
        const boxE = await page2.locator('[data-hud="esito"]').boundingBox().catch(() => null);
        const boxC = await page2.locator('[data-hud="capitolo-scheda"]').boundingBox().catch(() => null);
        if (boxE && boxC && boxC.y >= boxE.y + boxE.height - 1)
          ok("la scheda non copre l'esito", `esito y+h=${(boxE.y + boxE.height).toFixed(0)}, scheda y=${boxC.y.toFixed(0)}, insieme a schermo`);
        else if (!boxE) ok("la scheda non copre l'esito", 'esito già dissolto per conto suo');
        else ko("la scheda non copre l'esito", JSON.stringify({ boxE, boxC }));
        await page2.screenshot({ path: join(SHOTS, '13-capitolo-completato.png') });
      } else ko('la scheda CAPITOLO COMPLETATO compare', e3 ?? 'mai comparsa in 8 s');

      const c2 = await lugo2('L.capitolo()');
      if (c2 && c2.n === 2 && c2.nome === 'Il lavoro' && c2.traguardo === 'Prove in bottega: 0 di 2 · Consegne fatte: 0 di 3')
        ok('capitolo 2 coi numeri vivi', c2.traguardo);
      else ko('capitolo 2 coi numeri vivi', JSON.stringify(c2));

      await page2
        .waitForFunction(() => !document.querySelector('[data-hud="capitolo-scheda"]'), null, { timeout: 12000 })
        .then(() => ok('la scheda si dissolve da sola'))
        .catch(() => ko('la scheda si dissolve da sola', 'ancora a schermo dopo 12 s'));

      // una consegna vera muove il contatore del capitolo 2, chip compreso
      await lugo2('L.chiudiPannelli()');
      const att = await lugo2('L.missioneAttivita(0)');
      const eA = att ? await completa2(att.id) : 'missioneAttivita(0) nulla';
      const c3 = await lugo2('L.capitolo()');
      const chip3 = (await page2.textContent('[data-hud="capitolo"]').catch(() => '')) ?? '';
      if (!eA && c3.n === 2 && c3.traguardo.includes('Consegne fatte: 1 di 3') && chip3.includes('Consegne fatte: 1 di 3'))
        ok('il contatore delle consegne è vivo', c3.traguardo);
      else ko('il contatore delle consegne è vivo', eA ?? JSON.stringify({ c3, chip: chip3 }));

      // reload: il capitolo si RICALCOLA dal salvataggio (nessun campo
      // nuovo), identico a prima — e la scheda non deve festeggiare il
      // passato: al load niente CAPITOLO COMPLETATO, mai
      await page2.waitForTimeout(1500); // il salvataggio ha il suo debounce
      await page2.reload({ waitUntil: 'load' });
      const salta3 = page2.locator('[data-hud="salta-intro"]');
      try {
        await salta3.waitFor({ timeout: 5000 });
        await salta3.click();
      } catch {}
      const gioca3 = page2.locator('[data-hud="gioca"]');
      await gioca3.waitFor({ timeout: 40000 }).catch(() => {});
      if (await gioca3.count()) await gioca3.click();
      await page2.waitForFunction(() => window.__LUGO__ && typeof window.__LUGO__.capitolo === 'function', null, { timeout: 40000 });
      await page2.evaluate(() => document.activeElement && document.activeElement.blur());
      const c5 = await lugo2('L.capitolo()');
      if (c5 && c5.n === c3.n && c5.nome === c3.nome && c5.traguardo === c3.traguardo)
        ok('dopo il reload il capitolo si ricalcola uguale', c5.traguardo);
      else ko('dopo il reload il capitolo si ricalcola uguale', JSON.stringify({ prima: c3, dopo: c5 }));
      await page2.waitForTimeout(4000);
      if ((await page2.locator('[data-hud="capitolo-scheda"]').count()) === 0) ok('nessuna scheda parte da sola al load');
      else ko('nessuna scheda parte da sola al load', 'CAPITOLO COMPLETATO festeggiato a freddo');
      const chipR = (await page2.textContent('[data-hud="capitolo"]').catch(() => '')) ?? '';
      if (chipR.includes('Cap. 2') && chipR.includes('Il lavoro')) ok('il chip dopo il reload dice il vero', chipR.trim());
      else ko('il chip dopo il reload dice il vero', String(chipR));
    }

    // ── salto, a piedi ──────────────────────────────────────────────────
    if (haSalto) {
      // dopo il reload si deve essere ancora a piedi; se no si scende
      for (let giro = 0; giro < 2 && (await lugo2('L.mode()')) !== 'piedi'; giro++) {
        await page2.keyboard.down('Space');
        await page2.waitForTimeout(2500);
        await page2.keyboard.up('Space');
        await page2.keyboard.press('KeyE', TENUTO);
        await page2.waitForTimeout(700);
      }
      const aPiedi = (await lugo2('L.mode()')) === 'piedi';
      if (!aPiedi) ko('salto a piedi', `mode=${await lugo2('L.mode()')}: impossibile scendere per provare il salto`);
      else {
        const centro = await lugo2('L.poi.pavaglione');

        // salto da fermo: la quota si campiona a OGNI fotogramma con un
        // registratore rAF dentro la pagina — da fuori, a 2,5 fps, si
        // perderebbe l'apice e si scambierebbe un rimbalzo per un arco
        await lugo2(`L.teleport(${centro.x}, ${centro.z})`);
        await page2.waitForTimeout(400);
        await page2.evaluate(() => {
          window.__TRACCIA = [];
          const giro = () => {
            window.__TRACCIA.push(window.__LUGO__.direzione().y);
            if (window.__TRACCIA.length < 800) requestAnimationFrame(giro);
          };
          requestAnimationFrame(giro);
        });
        await page2.keyboard.down('Space');
        await page2.waitForTimeout(300);
        await page2.keyboard.up('Space');
        // appena in quota si ripreme Spazio: il tentativo di doppio salto
        // deve morire sul fronte già consumato
        let inVolo = false;
        for (let i = 0; i < 120; i++) {
          await page2.waitForTimeout(60);
          const y = (await lugo2('L.direzione()')).y;
          if (!inVolo && y > 0.25) {
            inVolo = true;
            await page2.keyboard.press('Space', { delay: 600 });
          }
          if (inVolo && y === 0) break;
        }
        await page2.waitForTimeout(300);
        const traccia = await page2.evaluate(() => window.__TRACCIA);
        const apice = Math.max(...traccia);
        const su = traccia.findIndex((y) => y > 0);
        const giu = traccia.findIndex((y, i) => i > su && su >= 0 && y === 0);
        let archi = 0;
        for (let i = 1; i < traccia.length; i++) if (traccia[i] > 0 && traccia[i - 1] === 0) archi++;
        const yDopo = (await lugo2('L.direzione()')).y;
        if (apice > 0.42 && apice < 0.68 && giu > su && su >= 0 && yDopo === 0)
          ok('il salto ha apice e atterraggio', `apice ${apice.toFixed(3)} m, ${giu - su} fotogrammi in aria, y finale 0`);
        else ko('il salto ha apice e atterraggio', `apice ${apice.toFixed(3)}, su=${su}, giù=${giu}, y finale ${yDopo}`);
        if (archi === 1) ok('doppio salto impossibile', 'Spazio ripremuto in aria: un solo arco nel tracciato');
        else ko('doppio salto impossibile', `${archi} archi nel tracciato`);

        // la panchina: camminandoci contro si resta di qua, di corsa col
        // salto si atterra di là (y tornata a 0). Si prova più di una
        // candidata perché attorno a una panchina può esserci di tutto —
        // un muro, un'aiuola, il disordine seminato
        const lista = (await lugo2('L.scavalcabili()')) ?? [];
        const panche = lista.filter((o) => o.t === 'panchina');
        const provaSu = async (b) => {
          const dir = b.rot + Math.PI / 2;
          for (const segno of [1, -1]) {
            const ux = Math.cos(dir) * segno;
            const uz = Math.sin(dir) * segno;
            const px = b.x - ux * 3.2;
            const pz = b.z - uz * 3.2;
            await lugo2(`L.teleport(${px}, ${pz}, ${Math.atan2(uz, ux)})`);
            await page2.waitForTimeout(500);
            const dopoTp = await lugo2('L.pos()');
            if (Math.hypot(dopoTp[0] - px, dopoTp[1] - pz) > 0.4) continue; // punto non libero
            // 1) camminando: fermati dalla panchina, quota sempre zero
            await page2.keyboard.down('KeyW');
            let bloccato = true;
            for (let i = 0; i < 24; i++) {
              await page2.waitForTimeout(500);
              const p = await lugo2('L.pos()');
              const proj = (p[0] - b.x) * ux + (p[1] - b.z) * uz; // <0 di qua, >0 di là
              if (proj > -0.2) {
                bloccato = false;
                break;
              }
              if (proj > -0.75) break; // a ridosso: la panchina tiene
            }
            await page2.keyboard.up('KeyW');
            await page2.waitForTimeout(400);
            if (!bloccato || (await lugo2('L.direzione()')).y !== 0) continue;
            // 2) di corsa col salto: oltre la panchina e di nuovo a terra
            await lugo2(`L.teleport(${px}, ${pz}, ${Math.atan2(uz, ux)})`);
            await page2.waitForTimeout(400);
            await page2.keyboard.down('ShiftLeft');
            await page2.keyboard.down('KeyW');
            let saltato = false;
            let maxY = 0;
            let oltre = false;
            for (let i = 0; i < 90; i++) {
              await page2.waitForTimeout(90);
              const p = await lugo2('L.pos()');
              const d = await lugo2('L.direzione()');
              maxY = Math.max(maxY, d.y);
              const pr = (p[0] - b.x) * ux + (p[1] - b.z) * uz;
              if (!saltato && pr > -2.1) {
                saltato = true;
                await page2.keyboard.press('Space', { delay: 180 });
              }
              if (saltato && pr > 0.75 && d.y === 0) {
                oltre = true;
                break;
              }
              if (saltato && i > 70) break;
            }
            await page2.keyboard.up('KeyW');
            await page2.keyboard.up('ShiftLeft');
            await page2.waitForTimeout(400);
            if (oltre && (await lugo2('L.direzione()')).y === 0) return { maxY, b };
          }
          return null;
        };
        let scavalcata = null;
        for (const b of panche.slice(0, 8)) {
          scavalcata = await provaSu(b);
          if (scavalcata) break;
        }
        if (scavalcata)
          ok('la panchina blocca a terra e si scavalca in volo', `apice ${scavalcata.maxY.toFixed(2)} m, panchina a (${scavalcata.b.x.toFixed(1)}, ${scavalcata.b.z.toFixed(1)}), y tornata a 0`);
        else ko('la panchina blocca a terra e si scavalca in volo', panche.length ? 'nessuna candidata bloccante+scavalcabile' : 'lista scavalcabili vuota');

        // il muro di un edificio invece non si scavalca MAI: ci si
        // incastra nella rientranza del bar Jolly (stessa tana della fase
        // del fondale) e si salta tre volte contro la facciata
        let esitoMuro = null;
        const spinte = [['KeyW'], ['KeyD'], ['KeyS'], ['KeyA'], ['KeyW', 'KeyD'], ['KeyW', 'KeyA'], ['KeyS', 'KeyD'], ['KeyS', 'KeyA']];
        for (const tasti of spinte) {
          await lugo2('L.teleport(49.8, 77)');
          await page2.waitForTimeout(300);
          await page2.keyboard.down('ShiftLeft');
          for (const t of tasti) await page2.keyboard.down(t);
          await page2.waitForTimeout(2500);
          const q0 = await lugo2('L.pos()');
          await page2.waitForTimeout(800);
          const q1 = await lugo2('L.pos()');
          if (Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) < 0.05) {
            let maxY = 0;
            const pA = await lugo2('L.pos()');
            for (let g = 0; g < 3; g++) {
              await page2.keyboard.press('Space', { delay: 300 });
              for (let i = 0; i < 14; i++) {
                await page2.waitForTimeout(150);
                const y = (await lugo2('L.direzione()')).y;
                maxY = Math.max(maxY, y);
                if (maxY > 0.4 && y === 0) break;
              }
            }
            const pB = await lugo2('L.pos()');
            esitoMuro = { tasti: tasti.join('+'), maxY, mosso: Math.hypot(pB[0] - pA[0], pB[1] - pA[1]) };
            for (const t of tasti) await page2.keyboard.up(t);
            await page2.keyboard.up('ShiftLeft');
            break;
          }
          for (const t of tasti) await page2.keyboard.up(t);
          await page2.keyboard.up('ShiftLeft');
        }
        if (!esitoMuro) ko('il muro non si scavalca', 'mai incastrato nella rientranza: prova da rivedere');
        else if (esitoMuro.maxY > 0.4 && esitoMuro.mosso < 0.35)
          ok('il muro non si scavalca', `${esitoMuro.tasti}: tre salti (apice ${esitoMuro.maxY.toFixed(2)} m), spostamento ${esitoMuro.mosso.toFixed(2)} m`);
        else ko('il muro non si scavalca', `${esitoMuro.tasti}: apice ${esitoMuro.maxY.toFixed(2)}, spostamento ${esitoMuro.mosso.toFixed(2)} m`);

        // il bottone SALTA dello schermo: tocco VERO via CDP, come per il
        // joystick — un click del mouse non passa dal codice dei pointer
        const btn = await page2.locator('button[aria-label="Salta"]').boundingBox();
        if (!btn) ko('il bottone SALTA risponde al tocco', 'bottone non trovato a schermo');
        else {
          await lugo2(`L.teleport(${centro.x}, ${centro.z})`);
          await page2.waitForTimeout(400);
          const cdp2 = await page2.context().newCDPSession(page2);
          const bx = btn.x + btn.width / 2;
          const by = btn.y + btn.height / 2;
          await cdp2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bx, y: by, id: 1 }] });
          await page2.waitForTimeout(500);
          await cdp2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: bx, y: by, id: 1 }] });
          let maxY = 0;
          for (let i = 0; i < 40; i++) {
            await page2.waitForTimeout(120);
            const d = await lugo2('L.direzione()');
            maxY = Math.max(maxY, d.y);
            if (maxY > 0.3 && d.y === 0) break;
          }
          if (maxY > 0.4) ok('il bottone SALTA risponde al tocco', `tocco CDP → apice ${maxY.toFixed(2)} m`);
          else ko('il bottone SALTA risponde al tocco', `apice ${maxY.toFixed(2)}`);
        }
      }
    }

    const gravi2 = errori2.filter((e) => !e.includes('favicon'));
    if (gravi2.length) ko('zero errori console nella partita nuova', gravi2.slice(0, 5).join(' | '));
    else ok('zero errori console nella partita nuova');
    await page2.close();
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
