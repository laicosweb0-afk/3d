// Collaudo del CRM di Rama (crm/): entra, crea un contatto, gli attacca una
// nota e un promemoria, controlla che compaia in "Oggi", poi lo cancella e
// verifica che sia sparito davvero. Serve un'istanza vera con Supabase
// collegato — in locale `npm run dev` dentro crm/, oppure il sito pubblicato.
//
//   CRM_URL=http://localhost:3100 \
//   CRM_EMAIL=titolare@ramastore.it CRM_PASSWORD=... \
//   node tools/crm-smoke.mjs <cartella-screenshot>
//
// Esce 1 al primo scostamento. Senza le variabili non fallisce: dice cosa
// manca e si ferma, così può stare dentro uno script più grande.
import { chromium } from 'playwright-core';

const url = (process.env.CRM_URL || '').replace(/\/$/, '');
const email = process.env.CRM_EMAIL;
const password = process.env.CRM_PASSWORD;
const out = process.argv[2] || '.';

if (!url || !email || !password) {
  console.log('Saltato: servono CRM_URL, CRM_EMAIL e CRM_PASSWORD (vedi CRM-RAMA.md).');
  process.exit(0);
}

const problemi = [];
const segno = `Collaudo ${new Date().toISOString().slice(0, 16)}`;
const emailProva = `collaudo+${Date.now()}@example.invalid`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
p.on('pageerror', (e) => problemi.push(`PAGE ERROR: ${e.message}`));
p.on('response', (r) => { if (r.status() >= 500) problemi.push(`${r.status()} su ${r.url()}`); });

try {
  // 1 — senza sessione si finisce al login, non dentro.
  await p.goto(`${url}/contatti`, { waitUntil: 'networkidle' });
  if (!p.url().includes('/login')) problemi.push('ACCESSO: /contatti è raggiungibile senza login');

  await p.fill('#email', email);
  await p.fill('#password', password);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
  await p.screenshot({ path: `${out}/crm-01-oggi.png` });

  // 2 — un contatto nuovo.
  await p.goto(`${url}/contatti/nuovo`, { waitUntil: 'networkidle' });
  await p.fill('#nome', segno);
  await p.fill('#email', emailProva);
  await p.fill('#telefono', '+39 000 0000000');
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/contatti\/[0-9a-f-]{36}/, { timeout: 15000 });
  const scheda = p.url();

  // 3 — una nota e un promemoria per oggi.
  await p.fill('#testo', 'Nota scritta dal collaudo automatico.');
  await p.click('form:has(#testo) button[type="submit"]');
  await p.waitForLoadState('networkidle');
  if (!(await p.getByText('Nota scritta dal collaudo automatico.').count())) {
    problemi.push('NOTA: non compare nella scheda dopo il salvataggio');
  }

  await p.fill('#titolo', `Richiamare ${segno}`);
  await p.click('form:has(#titolo) button[type="submit"]');
  await p.waitForLoadState('networkidle');
  await p.screenshot({ path: `${out}/crm-02-scheda.png` });

  // 4 — il promemoria deve affacciarsi in "Oggi".
  await p.goto(`${url}/`, { waitUntil: 'networkidle' });
  if (!(await p.getByText(`Richiamare ${segno}`).count())) {
    problemi.push('OGGI: il promemoria appena creato non compare');
  }

  // 5 — la ricerca lo trova.
  await p.goto(`${url}/contatti?q=${encodeURIComponent(segno)}`, { waitUntil: 'networkidle' });
  if (!(await p.getByText(segno).count())) problemi.push('RICERCA: il contatto non viene trovato per nome');

  // 6 — cancellazione: deve sparire davvero (diritto all'oblio).
  await p.goto(scheda, { waitUntil: 'networkidle' });
  await p.click('details summary');
  await p.click('.bottone-pericolo');
  await p.waitForURL(/\/contatti/, { timeout: 15000 });
  const risposta = await p.goto(scheda, { waitUntil: 'networkidle' });
  if (risposta && risposta.status() !== 404) {
    problemi.push(`CANCELLAZIONE: la scheda risponde ancora ${risposta.status()}`);
  }
  await p.screenshot({ path: `${out}/crm-03-dopo-cancellazione.png` });
} catch (errore) {
  problemi.push(`ECCEZIONE: ${errore.message}`);
}

console.log(problemi.length ? `PROBLEMI:\n- ${problemi.join('\n- ')}` : 'CRM: tutto a posto');
await browser.close();
process.exit(problemi.length ? 1 : 0);
