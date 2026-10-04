// Collaudo del CRM di Rama (crm/): non guarda se le pagine sono belle, guarda
// se cliccare cambia davvero le cose.
//
// Gira contro un'istanza avviata. In modalità dimostrativa basta:
//   cd crm && npm run build && npm start &
//   node tools/crm-smoke.mjs <cartella-screenshot>
//
// Non serve nessuna variabile d'ambiente: in demo i webhook accettano il
// payload senza firma perché dietro non c'è nessun database vero. Con
// Supabase collegato la firma è obbligatoria e non c'è interruttore che la
// spenga — è il motivo per cui questo collaudo non ne passa nessuno.
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
  // Le sezioni secondarie ora stanno piegate dentro <details>: chiuse, per
  // chi guarda la pagina, sono un tocco di distanza; per il collaudo sono
  // invisibili. Si aprono tutte, così si verifica il contenuto e non il
  // fatto che sia piegato. Che si aprano davvero è il punto 20.
  await apriPieghe();
  return risposta;
};

// Si usa anche dopo gli arrivi che non passano da vai(): dopo un invio di
// modulo, per esempio, la pagina nuova ha le pieghe chiuse.
async function apriPieghe() {
  await p.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => { d.open = true; });
  });
}

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
  const daFarePrima = await p.locator('.carta-azione button:has-text("Fatto")').count();
  if (daFarePrima === 0) segna('nessuna azione da fare in home: la coda operativa è vuota');
  else ok(`${daFarePrima} azioni con il pulsante «Fatto»`);
  await p.screenshot({ path: `${out}/crm-01-oggi.png`, fullPage: true });

  console.log('\n2. Completare un\'azione la toglie dalla coda e la lascia nella storia');
  const primaVoce = p.locator('.carta-azione:has(button:has-text("Fatto"))').first();
  const testoVoce = (await primaVoce.locator('.cosa').innerText()).trim();
  const schedaHref = await primaVoce.locator('a[href^="/contatti/"]').first().getAttribute('href');
  await primaVoce.locator('button:has-text("Fatto")').click();
  const sparita = await attendi(
    `«${testoVoce}» è ancora nella coda dopo averla completata`,
    async () => (await p.locator(`.carta-azione:has-text(${JSON.stringify(testoVoce)}) button:has-text("Fatto")`).count()) === 0,
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
    if (!storia.includes('Spostato di fase')) segna('il cambio di fase non è finito nella storia');
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
  await apriPieghe();
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
  // vai() ha già aperto tutte le pieghe, «Elimina questo contatto» compresa:
  // toccarla adesso la richiuderebbe.
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
  // La spesa si lascia vuota di proposito: deve restare «non lo so», non diventare 0.
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
  else if (!testoCampagna.includes('non lo so')) segna('la spesa lasciata vuota non è mostrata come «non lo so»');
  else ok('campagna creata, spesa sconosciuta = «non lo so»');

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

  console.log('\n14. Un preventivo si fa dalla scheda e compare fra i Preventivi');
  // Serve un contatto che abbia già un lavoro aperto: il preventivo sta
  // sopra l'opportunità, e chi non ne ha non può averne uno. Il più caro ce
  // l'ha per forza.
  await vai('/contatti?ordine=valore');
  const conLavoro = await p.locator('a[href^="/contatti/"]').evaluateAll(
    (nodi) => nodi.map((n) => n.getAttribute('href')).find((h) => h && !h.includes('nuovo')),
  );
  await vai(conLavoro);
  const apriPreventivo = p.locator('summary:has-text("preventivo")').first();
  if (await apriPreventivo.count()) {
    // Già aperta da vai(): toccarla la richiuderebbe.
    const modulo = p.locator('form:has(select[name="stato_preventivo"])').first();
    await modulo.locator('select[name="stato_preventivo"]').selectOption('inviato');
    await modulo.locator('input[name="valore_preventivo"]').fill('7250');
    const numeroPrev = `PREV-COLLAUDO-${timbro}`;
    await modulo.locator('input[name="numero_preventivo"]').fill(numeroPrev);
    await modulo.locator('button[type="submit"]').click();

    // Tre effetti, non uno: la storia, il promemoria e la sezione Preventivi.
    const inStoria = await attendi(
      'il preventivo non è finito nella storia del contatto',
      async () => (await p.locator('.tempo').first().innerText()).includes('Preventivo inviato'),
    );
    if (inStoria) ok('registrato nella storia del contatto');

    await vai('/preventivi?periodo=tutto');
    const testoPrev = await p.locator('main').innerText();
    if (!testoPrev.includes(numeroPrev)) segna(`«${numeroPrev}» non compare nei Preventivi`);
    else ok('compare nella sezione Preventivi, con il suo numero');
    // La scadenza la mette il CRM da sé quando non la si scrive.
    if (!/scade|Scade/i.test(testoPrev)) segna('la colonna della scadenza non c\'è');
  } else segna('nessun modulo del preventivo nella scheda del contatto');

  console.log('\n15. Le Attività raccolgono eventi e promemoria insieme');
  await vai('/attivita?periodo=tutto');
  const attivitaTesto = await p.locator('main').innerText();
  if (!/cos.è successo/i.test(attivitaTesto)) segna('mancano i filtri delle attività');
  else {
    await p.locator('a.scorciatoia:has-text("Cosa è stato deciso")').click();
    const soloAzioni = await attendi(
      'il filtro «cosa è stato deciso» non cambia la lista',
      async () => (await p.locator('main').innerText()).includes('da fare')
        || (await p.locator('main').innerText()).includes('fatta'),
    );
    if (soloAzioni) ok('eventi e promemoria, filtrabili');
  }

  console.log('\n16. Toccare una card NFC conta un tocco e porta avanti la persona');
  // I tocchi si leggono dal riquadro in cima alla pagina, non con una regex
  // sull'HTML: il numero a schermo è quello che conta e non si rompe se
  // cambia il markup.
  const contaTocchi = async () => {
    await vai('/card');
    const testo = await p.locator('main').innerText();
    return Number(testo.match(/TOCCHI\s*\n\s*([\d.]+)/i)?.[1]?.replace('.', '') ?? '-1');
  };
  const primaTocchi = await contaTocchi();
  const rispostaNfc = await p.request.get(`${url}/nfc/bancone-01`, { maxRedirects: 0 });
  if (rispostaNfc.status() !== 307) segna(`/nfc/bancone-01 risponde ${rispostaNfc.status()} invece di 307`);
  else {
    const dove = rispostaNfc.headers()['location'] ?? '';
    // L'attribuzione deve viaggiare nel link, o il tocco non serve a niente.
    if (!dove.includes('card=bancone-01') || !dove.includes('utm_source=nfc')) {
      segna(`il rinvio della card non porta l'attribuzione: ${dove}`);
    } else ok('rinvio con l\'attribuzione attaccata al link');
  }
  const dopoTocchi = await contaTocchi();
  if (dopoTocchi <= primaTocchi) segna(`il tocco non è stato contato (${primaTocchi} → ${dopoTocchi})`);
  else ok(`tocco contato: ${primaTocchi} → ${dopoTocchi}`);

  // Una card che non esiste non deve mai lasciare il cliente su un errore.
  const nfcIgnota = await p.request.get(`${url}/nfc/non-esiste-${timbro}`, { maxRedirects: 0 });
  if (nfcIgnota.status() !== 307) segna('una card sconosciuta non rimanda da nessuna parte');
  else ok('card sconosciuta: rimanda comunque, senza attribuzione');

  console.log('\n17. Un modulo del sito entra dal webhook e non sdoppia la persona');
  const emailModulo = `modulo${timbro}@example.it`;
  const daModulo = await p.request.post(`${url}/api/webhooks/forms`, {
    headers: { 'content-type': 'application/json' },
    // Nomi di campo come li manda un modulo WordPress, non come piacerebbe a noi.
    data: {
      'your-name': `Paolo Modulo${timbro}`,
      'your-email': emailModulo,
      'your-phone': `+3933${timbro}0`,
      'your-message': 'Vorrei rifare il terrazzo',
      utm_source: 'google', utm_medium: 'cpc',
    },
  });
  if (daModulo.status() !== 200) segna(`/api/webhooks/forms risponde ${daModulo.status()}`);
  else ok('modulo del sito: 200');

  // Lo stesso modulo mandato due volte — succede, la gente clicca due volte —
  // non deve produrre due schede.
  await p.request.post(`${url}/api/webhooks/forms`, {
    headers: { 'content-type': 'application/json' },
    data: { 'your-name': `Paolo Modulo${timbro}`, 'your-email': emailModulo, 'your-message': 'Di nuovo' },
  });
  await vai(`/contatti?q=Modulo${timbro}`);
  const schedeModulo = await p.locator('a[href^="/contatti/"]').evaluateAll(
    (nodi) => [...new Set(nodi.map((n) => n.getAttribute('href')).filter((h) => h && !h.includes('nuovo')))],
  );
  if (schedeModulo.length !== 1) segna(`due invii dello stesso modulo hanno fatto ${schedeModulo.length} schede`);
  else ok('due invii, una scheda sola');

  console.log('\n18. Le impostazioni salvate cambiano davvero il comportamento');
  await vai('/impostazioni');
  const campoSilenzio = p.locator('#soglie_silenzioGrave');
  const primaSoglia = await campoSilenzio.inputValue();
  const nuovaSoglia = primaSoglia === '21' ? '18' : '21';
  await campoSilenzio.fill(nuovaSoglia);
  await p.locator('button:has-text("Salva le impostazioni")').click();
  const salvate = await attendi(
    'le impostazioni non risultano salvate',
    async () => (await p.locator('main').innerText()).includes('Impostazioni salvate'),
  );
  if (salvate) {
    // La prova vera: il numero deve comparire nel testo dell'avviso in
    // Attenzioni, che lo legge dalle impostazioni e non da una costante.
    await vai('/attenzioni');
    const testoAttenzioni = await p.locator('main').innerText();
    if (testoAttenzioni.includes('fermi da più di') && !testoAttenzioni.includes(`${nuovaSoglia} giorni`)) {
      segna(`Attenzioni non usa la soglia salvata (${nuovaSoglia})`);
    } else ok(`la soglia salvata (${nuovaSoglia}) vale anche in Attenzioni`);
    // Si rimette com'era: il collaudo non deve lasciare il CRM diverso.
    await vai('/impostazioni');
    await p.locator('#soglie_silenzioGrave').fill(primaSoglia);
    await p.locator('button:has-text("Salva le impostazioni")').click();
    await p.waitForTimeout(600);
  }

  console.log('\n19. Un «Fatto» si può annullare entro cinque secondi');
  await vai('/');
  const daAnnullare = p.locator('.carta-azione:has(button:has-text("Fatto"))').first();
  if (await daAnnullare.count() === 0) segna('niente in coda: non si può provare l\u2019annulla');
  else {
    const testoAnnulla = (await daAnnullare.locator('.cosa').innerText()).trim();
    await daAnnullare.locator('button:has-text("Fatto")').click();
    const comparsa = await attendi(
      'dopo il «Fatto» non compare la barra con l\u2019«Annulla»',
      async () => (await p.locator('.annulla-barra button:has-text("Annulla")').count()) > 0,
    );
    if (comparsa) {
      await p.locator('.annulla-barra button:has-text("Annulla")').click();
      const tornata = await attendi(
        `«${testoAnnulla}» non è tornata in coda dopo l\u2019annulla`,
        async () => (await p.locator(`.carta-azione:has-text(${JSON.stringify(testoAnnulla)})`).count()) > 0,
      );
      if (tornata) ok('annullata: l\u2019azione è tornata in coda');

      // E la storia del contatto non deve restare con un «Fatto» mai
      // successo: annullare vuol dire tornare come prima anche lì.
      const dentro = await p.locator(`.carta-azione:has-text(${JSON.stringify(testoAnnulla)}) a[href^="/contatti/"]`).first().getAttribute('href');
      if (dentro) {
        await vai(dentro);
        const storiaDopo = await p.locator('.tempo').innerText();
        if (storiaDopo.includes(`Fatto: ${testoAnnulla}`)) {
          segna('annullando resta nella storia un «Fatto» che non è mai successo');
        } else ok('la storia del contatto è tornata com\u2019era');
      }
    }
  }

  console.log('\n20. Le sezioni piegate si aprono con un tocco');
  await vai('/attenzioni');
  const piegate = p.locator('details.fisarmonica');
  if (await piegate.count() === 0) segna('nessuna sezione apribile in Attenzioni');
  else {
    // vai() le ha aperte tutte: si richiude la prima e la si riapre col dito.
    const una = piegate.first();
    await una.evaluate((d) => { d.open = false; });
    await una.locator('summary').click();
    if (await una.evaluate((d) => d.open)) ok('si apre e si chiude con un tocco');
    else segna('la sezione non si apre toccandola');
  }

  console.log('\n21. Su telefono non deve esserci scorrimento orizzontale');
  const tel = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const percorso of ['/', '/flusso', '/pipeline', '/contatti', '/preventivi', '/attivita', '/campagne', '/card', '/impostazioni', '/attenzioni', '/analisi']) {
    await tel.goto(`${url}${percorso}`, { waitUntil: 'networkidle' });
    const overflow = await tel.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) segna(`${percorso}: la pagina scorre di lato di ${overflow}px`);
  }
  await tel.screenshot({ path: `${out}/crm-04-telefono.png`, fullPage: true });
  await tel.close();
  ok('nessuno scorrimento laterale');

  // La vetrina gira su un indirizzo suo, con CRM_SOLA_LETTURA=1. Se non c'è
  // si salta: il collaudo normale non deve dipenderne.
  if (process.env.CRM_VETRINA_URL) {
    console.log('\n22. La vetrina si guarda e non si tocca');
    const v = process.env.CRM_VETRINA_URL.replace(/\/$/, '');
    const vp = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await vp.goto(v, { waitUntil: 'networkidle' });

    if (!(await vp.locator('.pillola-vetrina').count())) segna('la vetrina non si dichiara');
    else ok('si presenta come «Solo da guardare»');

    const spento = await vp.locator('.carta-azione button:has-text("Fatto")').first()
      .evaluate((b) => getComputedStyle(b).pointerEvents === 'none').catch(() => null);
    if (spento === false) segna('in vetrina il pulsante «Fatto» si può ancora premere');
    else if (spento === true) ok('i comandi che scrivono sono spenti');

    // La prova vera: forzare il clic saltando il CSS. Deve fermarlo il server.
    const prima = (await vp.locator('.carta-azione .cosa').first().innerText()).trim();
    await vp.locator('.carta-azione button:has-text("Fatto")').first().dispatchEvent('click');
    await vp.waitForTimeout(2500);
    await vp.goto(v, { waitUntil: 'networkidle' });
    const dopo = (await vp.locator('.carta-azione .cosa').first().innerText()).trim();
    if (prima !== dopo) segna('la vetrina ha scritto davvero: il blocco sul server non tiene');
    else ok('clic forzato: il server non ha scritto niente');

    const rispostaWebhook = await vp.request.post(`${v}/api/webhooks/forms`, { data: {} });
    if (rispostaWebhook.status() !== 503) segna(`il webhook della vetrina risponde ${rispostaWebhook.status()}, doveva essere 503`);
    else ok('anche i webhook sono chiusi');

    await vp.close();
  }
} catch (errore) {
  segna(`ECCEZIONE: ${errore.message}`);
}

console.log(problemi.length ? `\nPROBLEMI (${problemi.length}):\n- ${problemi.join('\n- ')}` : '\nCRM: tutto a posto');
await browser.close();
process.exit(problemi.length ? 1 : 0);
