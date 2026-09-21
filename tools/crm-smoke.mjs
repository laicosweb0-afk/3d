// Collaudo del CRM di Rama (crm/): non guarda se le pagine sono belle, guarda
// se cliccare cambia davvero le cose.
//
// Gira contro un'istanza avviata. In modalità dimostrativa basta:
//   cd crm && npm run build && npm start &
//   node tools/crm-smoke.mjs <cartella-screenshot>
//
// Con Supabase collegato servono anche le credenziali:
//   CRM_URL=https://crm.ramastore.it CRM_EMAIL=… CRM_PASSWORD=… node tools/crm-smoke.mjs
//
// Esce 1 al primo scostamento.
import { chromium } from 'playwright-core';

const url = (process.env.CRM_URL || 'http://localhost:3100').replace(/\/$/, '');
const out = process.argv[2] || '.';
const problemi = [];
const segna = (m) => { problemi.push(m); console.log(`  ✗ ${m}`); };
const ok = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
p.on('pageerror', (e) => segna(`ERRORE PAGINA: ${e.message}`));
p.on('response', (r) => { if (r.status() >= 500) segna(`${r.status()} su ${r.url()}`); });

const vai = async (percorso) => {
  // Accetta sia "/contatti" sia un indirizzo intero: così chi scrive il
  // collaudo non deve ricordarsi quale dei due ha in mano.
  const destinazione = percorso.startsWith('http') ? percorso : `${url}${percorso}`;
  const risposta = await p.goto(destinazione, { waitUntil: 'networkidle' });
  if (risposta && risposta.status() >= 400) segna(`${risposta.status()} aprendo ${percorso}`);
  return risposta;
};

// Dopo un'azione del server la pagina si aggiorna da sé, ma non all'istante:
// "networkidle" arriva prima che il nuovo contenuto sia a schermo. Invece di
// aspettare a caso, si aspetta la condizione vera.
const attendi = async (descrizione, condizione, millisecondi = 8000) => {
  const scadenza = Date.now() + millisecondi;
  while (Date.now() < scadenza) {
    if (await condizione()) return true;
    await p.waitForTimeout(250);
  }
  segna(descrizione);
  return false;
};

try {
  // Se c'è un login (modalità Supabase), si entra prima.
  await vai('/');
  if (p.url().includes('/login')) {
    if (!process.env.CRM_EMAIL || !process.env.CRM_PASSWORD) {
      console.log('Serve il login: passa CRM_EMAIL e CRM_PASSWORD. Collaudo saltato.');
      await browser.close();
      process.exit(0);
    }
    await p.fill('#email', process.env.CRM_EMAIL);
    await p.fill('#password', process.env.CRM_PASSWORD);
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
  }

  console.log('\n1. La home mette in fila il lavoro');
  const daFarePrima = await p.locator('button:has-text("Completato")').count();
  if (daFarePrima === 0) segna('nessuna azione da fare in home: la coda operativa è vuota');
  else ok(`${daFarePrima} azioni con i bottoni operativi`);
  await p.screenshot({ path: `${out}/crm-01-oggi.png`, fullPage: true });

  console.log('\n2. Completare un\'azione la toglie dalla coda e la lascia nella storia');
  const primaVoce = p.locator('.riga:has(button:has-text("Completato"))').first();
  const testoVoce = (await primaVoce.locator('.titolo').innerText()).trim();
  const schedaHref = await primaVoce.locator('a[href^="/contatti/"]').first().getAttribute('href');
  await primaVoce.locator('button:has-text("Completato")').click();
  const sparita = await attendi(
    `«${testoVoce}» è ancora nella coda dopo averla completata`,
    async () => (await p.locator(`.riga:has-text(${JSON.stringify(testoVoce)}) button:has-text("Completato")`).count()) === 0,
  );
  if (sparita) ok('sparita dalla coda');

  if (schedaHref) {
    await vai(schedaHref);
    const storia = await p.locator('.tempo').innerText();
    if (!storia.includes('Fatto:') && !storia.toLowerCase().includes(testoVoce.toLowerCase().slice(0, 18))) {
      segna('l’azione completata non compare nella storia del contatto');
    } else ok('rimasta nella storia del contatto');
  }

  console.log('\n3. Spostare una card nel kanban cambia davvero la fase');
  await vai('/pipeline');
  const carta = p.locator('.carta-kanban').first();
  const nomeCarta = (await carta.locator('.nome').innerText()).trim();
  const schedaCarta = await carta.locator('a.nome').getAttribute('href');
  const menu = carta.locator('select');
  const faseIniziale = await menu.inputValue();
  const opzioni = await menu.locator('option').evaluateAll((o) => o.map((x) => x.value));
  const destinazione = opzioni.find((v) => v !== faseIniziale && v !== 'perso' && v !== 'cliente');
  await menu.selectOption(destinazione);

  const spostata = await attendi(
    `«${nomeCarta}» non è finita nella colonna «${destinazione}»`,
    async () => {
      const colonna = p.locator(`.colonna:has(.carta-kanban:has-text(${JSON.stringify(nomeCarta)}))`).first();
      const dentro = await colonna.locator('select').first().inputValue().catch(() => null);
      return dentro === destinazione;
    },
  );
  if (spostata) ok(`«${nomeCarta}»: ${faseIniziale} → ${destinazione}`);
  await p.screenshot({ path: `${out}/crm-02-pipeline.png`, fullPage: true });

  // E il cambio deve risultare nella storia del contatto, non solo a schermo.
  if (schedaCarta) {
    await vai(schedaCarta);
    const storia = await p.locator('.tempo').first().innerText();
    if (!storia.includes('Cambio fase')) segna('il cambio di fase non è finito nella storia');
    else ok('cambio di fase registrato nella storia');
  }

  console.log('\n4. Un contatto nuovo nasce con la sua prossima azione');
  await vai('/contatti/nuovo');
  const marchio = `Collaudo ${Date.now().toString().slice(-5)}`;
  await p.fill('#nome', marchio);
  await p.fill('#cognome', 'Automatico');
  await p.fill('#citta', 'Lugo');
  await p.fill('#valore_stimato', '4200');
  await p.fill('#azione_descrizione', 'Prima chiamata di collaudo');
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/contatti\/(?!nuovo)[^/?]+$/, { timeout: 15000 });
  const prossima = await p.locator('.prossima-azione').innerText();
  if (!prossima.includes('Prima chiamata di collaudo')) segna('la prossima azione non compare nella scheda');
  else ok('prossima azione in evidenza nella scheda');
  const schedaNuovo = p.url();

  console.log('\n5. Registrare un preventivo apre da sé il follow-up');
  await p.locator('#ev-tipo').selectOption('preventivo_inviato');
  await p.fill('#ev-valore', '4200');
  await p.fill('#ev-descrizione', 'Preventivo di collaudo inviato');
  await p.locator('form:has(#ev-descrizione) button[type="submit"]').click();
  const registrato = await attendi(
    'il preventivo non è finito nella storia del contatto',
    async () => (await p.locator('.tempo').first().innerText()).includes('Preventivo inviato'),
  );
  if (registrato) ok('preventivo registrato nella storia');

  // La regola dice: dopo un preventivo si apre da sé il follow-up. Se il
  // contatto aveva già un'azione aperta non se ne crea un'altra — quindi si
  // controlla che una prossima azione ci sia, non che ne sia nata una nuova.
  const conAzione = await attendi(
    'dopo il preventivo il contatto è rimasto senza prossima azione',
    async () => !(await p.locator('.prossima-azione').innerText()).includes('Nessuna prossima azione'),
  );
  if (conAzione) ok('il contatto ha una prossima azione');

  console.log('\n6. Il contatto nuovo si trova cercandolo');
  await vai(`/contatti?q=${encodeURIComponent(marchio)}`);
  if (!(await p.getByText(marchio).count())) segna('la ricerca non trova il contatto appena creato');
  else ok('trovato dalla ricerca');

  console.log('\n7. Le attenzioni segnalano chi resta senza prossima azione');
  await vai('/attenzioni');
  const attenzioni = await p.locator('main').innerText();
  if (!/prossima azione|preventiv|fermo|campione/i.test(attenzioni)) {
    segna('la pagina attenzioni non segnala niente, nemmeno i casi previsti dai dati di esempio');
  } else ok('attenzioni calcolate');
  await p.screenshot({ path: `${out}/crm-03-attenzioni.png`, fullPage: true });

  console.log('\n8. Il contatto di collaudo si elimina davvero');
  await vai(schedaNuovo);
  await p.getByText('Elimina questo contatto').click();
  await p.locator('button:has-text("Sì, elimina tutto")').click();
  await p.waitForURL(/\/contatti(\?|$)/, { timeout: 15000 });
  const risposta = await p.goto(schedaNuovo, { waitUntil: 'networkidle' });
  if (risposta && risposta.status() !== 404) segna(`la scheda eliminata risponde ancora ${risposta.status()}`);
  else ok('eliminato con tutta la sua storia');

  // -------------------------------------------------------------------------
  // Da qui in poi: la parte campagne. Non si controlla che le pagine si
  // aprano, si controlla che un messaggio finto ma di forma vera entri dal
  // webhook, trovi la sua campagna e non sdoppi la persona.
  // -------------------------------------------------------------------------
  const timbro = Date.now().toString().slice(-6);

  console.log('\n9. Una campagna si crea a mano, senza nessuna API');
  await vai('/campagne/nuova');
  const nomeCampagna = `Collaudo ${timbro}`;
  const rif = `collaudo-${timbro}`;
  await p.fill('#nome', nomeCampagna);
  await p.selectOption('#canale_ingresso', 'messenger');
  await p.fill('#budget', '300');
  // La spesa si lascia vuota di proposito: deve restare N/D, non diventare 0.
  await p.fill('#parametro_ref', rif);
  await p.fill('#ad_id', `ad-${timbro}`);
  await p.click('button[type="submit"]');
  // Attenzione: «/campagne/nuova» combacia con «/campagne/<id>». Senza
  // escludere la pagina di partenza, l'attesa finisce prima ancora che il
  // modulo sia partito e il collaudo controlla la pagina sbagliata.
  await p.waitForURL(/\/campagne\/(?!nuova)[^/?]+$/, { timeout: 15000 });
  const urlCampagna = p.url();
  const testoCampagna = await p.locator('main').innerText();
  if (!testoCampagna.includes(nomeCampagna)) segna('la campagna creata non compare nella sua scheda');
  else if (!testoCampagna.includes('N/D')) segna('la spesa lasciata vuota non è mostrata come N/D');
  else ok('campagna creata, spesa sconosciuta = N/D');

  console.log('\n10. Un messaggio Messenger da quell\'annuncio entra e si attribuisce da sé');
  const psid = `psid-${timbro}`;
  // Forma documentata da Meta: entry[].messaging[] con sender.id (PSID) e
  // referral quando il filo nasce da un annuncio click-to-Messenger.
  const rispostaMessenger = await p.request.post(`${url}/api/webhooks/messenger`, {
    headers: { 'content-type': 'application/json' },
    data: {
      object: 'page',
      entry: [{
        id: 'PAGINA_RAMA',
        time: Date.now(),
        messaging: [{
          sender: { id: psid },
          recipient: { id: 'PAGINA_RAMA' },
          timestamp: Date.now(),
          message: { mid: `m_${timbro}`, text: 'Buongiorno, avete il gres effetto legno?' },
          referral: { ref: rif, ad_id: `ad-${timbro}`, source: 'ADS', type: 'OPEN_THREAD' },
        }],
      }],
    },
  });
  if (rispostaMessenger.status() !== 200) {
    segna(`il webhook Messenger risponde ${rispostaMessenger.status()} invece di 200`);
  } else ok('webhook Messenger: 200');

  // L'effetto vero: una persona nuova, attribuita a questa campagna.
  const attribuito = await attendi(
    'il messaggio Messenger non è stato attribuito alla campagna',
    async () => {
      await p.goto(urlCampagna, { waitUntil: 'networkidle' });
      const t = await p.locator('main').innerText();
      // Sulla scheda della campagna devono comparire tutte e due le cose: la
      // persona fra quelle portate, e il suo messaggio fra le conversazioni.
      return t.includes('Contatto Messenger') && t.includes('gres effetto legno');
    },
  );
  if (attribuito) ok('contatto creato e agganciato alla campagna giusta');
  await p.screenshot({ path: `${out}/crm-05-campagna.png`, fullPage: true });

  console.log('\n11. Il messaggio senza risposta finisce in cima alla home');
  await vai('/');
  const arrivatoInHome = await attendi(
    'il messaggio arrivato dal webhook non compare fra i «Messaggi senza risposta» della home',
    async () => {
      await p.goto(`${url}/`, { waitUntil: 'networkidle' });
      // I titoli di sezione sono in maiuscoletto per CSS, e innerText
      // restituisce quello che si vede: il confronto va fatto senza maiuscole.
      const t = (await p.locator('main').innerText()).toLowerCase();
      return t.includes('messaggi senza risposta') && t.includes('gres effetto legno');
    },
  );
  if (arrivatoInHome) ok('in cima alla home, con il testo del messaggio');

  console.log('\n12. La stessa persona su due canali resta una persona sola');
  const numero = `+3934${timbro}0`;
  // Prima entra dal modulo del sito, con email e telefono.
  const daSito = await p.request.post(`${url}/api/ingresso/sito`, {
    headers: { 'content-type': 'application/json' },
    data: {
      identita: { tipo: 'email', valore: `collaudo${timbro}@example.it` },
      identitaExtra: [{ tipo: 'telefono', valore: numero }],
      nome: 'Elisa', cognome: `Collaudo${timbro}`,
      testo: 'Vorrei un preventivo per il bagno',
    },
  });
  if (daSito.status() !== 200) segna(`/api/ingresso/sito risponde ${daSito.status()}`);
  const esitoSito = daSito.status() === 200 ? await daSito.json() : {};

  // Poi la stessa persona scrive su WhatsApp con quello stesso numero.
  const daWhatsApp = await p.request.post(`${url}/api/webhooks/whatsapp`, {
    headers: { 'content-type': 'application/json' },
    data: {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA_RAMA',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '39000000000', phone_number_id: 'PNID' },
            contacts: [{ profile: { name: `Elisa Collaudo${timbro}` }, wa_id: numero.replace('+', '') }],
            messages: [{
              from: numero.replace('+', ''),
              id: `wamid.${timbro}`,
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: 'text',
              text: { body: 'Sono passata ieri in negozio' },
            }],
          },
        }],
      }],
    },
  });
  if (daWhatsApp.status() !== 200) segna(`il webhook WhatsApp risponde ${daWhatsApp.status()}`);

  await vai(`/contatti?q=Collaudo${timbro}`);
  const trovati = await p.locator('a[href^="/contatti/"]').evaluateAll(
    (nodi) => [...new Set(nodi.map((n) => n.getAttribute('href')).filter((h) => h && !h.includes('nuovo')))],
  );
  if (trovati.length !== 1) {
    segna(`la stessa persona su due canali ha prodotto ${trovati.length} schede invece di 1`);
  } else {
    ok('una sola scheda per due canali');
    await vai(trovati[0]);
    const scheda = await p.locator('main').innerText();
    if (!scheda.includes('WhatsApp') || !scheda.includes('Sono passata ieri in negozio')) {
      segna('il messaggio WhatsApp non compare nella scheda della persona');
    } else ok('tutti e due i messaggi nella stessa storia');

    // Il numero era arrivato come identità in più, non come recapito: deve
    // finire lo stesso in rubrica, o il bottone «Chiama» non c'è.
    const inRubrica = await p.locator('#telefono').inputValue();
    if (inRubrica.replace(/[^\d]/g, '') !== numero.replace(/[^\d]/g, '')) {
      segna(`il telefono non è finito in rubrica: «${inRubrica}» invece di «${numero}»`);
    } else ok('il numero è in rubrica, con il bottone per chiamare');
    if (esitoSito.contattoId && !trovati[0].endsWith(esitoSito.contattoId)) {
      segna('il contatto trovato non è quello creato dal modulo del sito');
    }
    await p.screenshot({ path: `${out}/crm-06-una-persona.png`, fullPage: true });
  }

  console.log('\n13. Il Flusso conta le stesse persone della pipeline');
  await vai('/flusso?periodo=tutto');
  const flusso = await p.locator('main').innerText();
  // I riquadri non sono decorazione: si aprono su chi c'è dentro.
  const portaHref = await p.locator('a.tessera').first().getAttribute('href');
  if (!portaHref || !portaHref.startsWith('/contatti?')) {
    segna('le porte d\'ingresso del Flusso non portano a nessun elenco');
  } else ok('ogni riquadro si apre sull\'elenco delle persone');

  // Lo stesso numero, contato dalle due pagine: se non combaciano, una delle
  // due sta mentendo.
  const dentroFlusso = Number((flusso.match(/DENTRO IL CRM\s*\n\s*([\d.]+)/i) || [])[1]?.replace('.', ''));
  await vai('/contatti');
  const quanti = await p.locator('a[href^="/contatti/"]').evaluateAll(
    (nodi) => new Set(nodi.map((n) => n.getAttribute('href')).filter((h) => h && !h.includes('nuovo'))).size,
  );
  if (!Number.isFinite(dentroFlusso)) segna('il Flusso non mostra quante persone ci sono dentro');
  else if (dentroFlusso !== quanti) segna(`il Flusso dice ${dentroFlusso} persone, i Contatti ne elencano ${quanti}`);
  else ok(`${quanti} persone, contate uguali dalle due pagine`);

  console.log('\n14. Su telefono non deve esserci scorrimento orizzontale');
  const tel = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const percorso of ['/', '/flusso', '/pipeline', '/contatti', '/campagne', '/attenzioni', '/analisi']) {
    await tel.goto(`${url}${percorso}`, { waitUntil: 'networkidle' });
    const overflow = await tel.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) segna(`${percorso}: la pagina scorre di lato di ${overflow}px`);
  }
  await tel.screenshot({ path: `${out}/crm-04-telefono.png`, fullPage: true });
  await tel.close();
  ok('nessuno scorrimento laterale');
} catch (errore) {
  segna(`ECCEZIONE: ${errore.message}`);
}

console.log(problemi.length ? `\nPROBLEMI (${problemi.length}):\n- ${problemi.join('\n- ')}` : '\nCRM: tutto a posto');
await browser.close();
process.exit(problemi.length ? 1 : 0);
