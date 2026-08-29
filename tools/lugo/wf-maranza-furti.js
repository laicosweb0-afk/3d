export const meta = {
  name: 'lugo-maranza-e-furti',
  description: 'Implementa i maranza con sigaretta fumo e pugni, poi bici e auto rubabili, e collauda',
  phases: [
    { title: 'Maranza', detail: 'sigaretta, fumo, fumetti, insistenza, pugno e fuga' },
    { title: 'Furti', detail: 'bici in sella, auto in sosta, auto del traffico che frena' },
    { title: 'Revisione', detail: 'lettura avversaria dei due diff e riparazioni' },
  ],
}

const REGOLE = [
  'PROGETTO: LUGO CITY, open world in browser sulla vera Lugo di Ravenna. Repo /home/user/3d, branch claude/gta6-lugo-ravenna-hzd00f.',
  'Next.js 15 static export, react-three-fiber 9, three 0.170, Zustand, TypeScript. Fisica arcade 2D scritta a mano.',
  '',
  'COME SI LAVORA QUI (non negoziabile):',
  '- Tutto il codice e TUTTI i commenti in ITALIANO. Lo stile dei commenti e quello del repo: discorsivo, denso, spiega il PERCHE e soprattutto QUALE BUG il codice evita. Leggi lib/lugo/botteghe.ts e lib/lugo/incarichi.ts prima di scrivere una riga: devi scrivere come sono scritti quelli.',
  '- Nessun pacchetto npm nuovo. Nessun asset binario nuovo (CanvasTexture si).',
  '- Niente Math.random() nella generazione: il mondo e deterministico. Nellanimazione a runtime e ammesso solo dove non cambia il mondo.',
  '- Non cancellare funzionalita esistenti.',
  '- Gli NPC maranza restano visivamente ed ETNICAMENTE DIVERSI fra loro. Nessun comportamento aggressivo associato a una specifica etnia. Le battute non devono mai essere volgari ne offensive.',
  '- Il furto di veicoli e una meccanica di gioco di finzione, tipo GTA. Nessuna istruzione tecnica reale: linterazione e "premi E".',
  '',
  'CANCELLI DA PASSARE PRIMA DI DIRE CHE HAI FINITO - eseguili tu, in questordine, e non fermarti finche non sono tutti verdi:',
  '  npx tsc --noEmit',
  '  npm run build',
  '  node tools/lugo/verify-lugo.mjs',
  'Il collaudo deve finire con "tutto verde". Se una fase esistente diventa rossa, lhai rotta tu: riparala, non abbassare la soglia.',
  '',
  'BUDGET PRESTAZIONI, ed e la parte che si rompe piu facilmente:',
  'il collaudo misura il costo di un fotogramma in QUATTRO punti e tiene il peggiore. Oggi siamo a 168 chiamate di disegno su un tetto di 170, e 434k triangoli su 700k. Il margine e di DUE chiamate. Quindi ogni cosa che aggiungi deve essere un InstancedMesh o una geometria fusa, e il suo count deve andare a ZERO quando non serve: in three la chiamata si salta solo con count uguale a zero. Se sfori, il collaudo te lo dice e ti dice anche dove si spende (hook window.__LUGO__.spesa() e window.__LUGO__.accendi(nome, acceso)).',
  '',
  'COLLAUDO: tools/lugo/verify-lugo.mjs, Playwright headless su ?qa=1 con hook su window.__LUGO__. Aggiungi le TUE fasi in coda, ognuna dentro un guardiano che controlla typeof del tuo hook, come fanno tutte le altre, cosi non rompi niente e la fase si accende da sola. Usa page.screenshot per lasciare una cartolina in tools/lugo/shots.',
  '',
  'Quando hai finito fai UN commit con un messaggio in prosa italiana che spiega cosa cambia per chi gioca e quali bug evita (guarda git log per lo stile: sono messaggi lunghi e discorsivi). NON fare push, NON fare merge: ci pensa il coordinatore.',
].join('\n')

phase('Maranza')

const maranza = await agent(
  REGOLE +
    '\n\nIL TUO LAVORO: dare vita ai maranza. E una richiesta esplicita dellutente, testuale:\n\n' +
    '«bisogna che inseriamo i nostri NPC Maranza dove comunque vengono a darti fastidio chiedendoti sigarette, ma vorrei che lo dicessero proprio. "Ce lhai una sigaretta?" e detto pure comunque nel gioco si vede il fumo e comunque ti ce scritto "dammi la sigaretta". Se gli dici di no loro ti dicono "dai o dai fai..." tutte ste cose, e io ho la possibilita di dare un pugno e scappare.»\n\n' +
    'LA SPECIFICA COMPLETA e in /home/user/3d/tools/lugo/specifiche/spec-maranza.json - leggila TUTTA con node (e un JSON: usa node -e per stampare i campi uno per uno, non cat). Contiene fileNuovi (col campo dettaglio, lungo e prezioso: algoritmi, costanti, e il repertorio completo delle battute gia scritto), fileModificati (con ancore testuali precise), condivisi, rischi e collaudo.\n\n' +
    'Leggi anche /home/user/3d/tools/lugo/specifiche/spec-piano.json, che unifica le modifiche ai file condivisi decise da un revisore che ha letto tutte le specifiche: le sezioni player, hud, css, input, conflitti e tagli ti riguardano. In particolare:\n' +
    '- la PRECEDENZA del tasto E e a gradini fissi, e il maranza e lULTIMO gradino;\n' +
    '- il ponte fra HUD e ciclo di gioco NON passa dallo store: si usa un modulo mutabile come lib/lugo/stick.ts;\n' +
    '- niente campi nuovi nello store per il maranza;\n' +
    '- niente tasti nuovi: F esiste gia;\n' +
    '- niente keyframes lampeggianti.\n\n' +
    'ATTENZIONE - il repo e cambiato da quando la specifica e stata scritta:\n' +
    '- components/lugo/Character.tsx ora fonde testa e busto in una mesh sola coi colori nei vertici (Pezzo/fondiPezzi/Fuso). Le braccia sono ancora fatte di Blocco separati, quindi il pugno si puo animare come prima. NON disfare la fusione di testa e busto: serve al budget.\n' +
    '- Il costo del fotogramma si misura ora in quattro punti col giocatore teleportato: leggi il blocco "costo di un fotogramma" in verify-lugo.mjs prima di aggiungere mesh.\n\n' +
    'Sei libero di semplificare la specifica dove e troppo ambiziosa per il margine che hai, ma le cinque cose che lutente ha chiesto devono esserci tutte e devono VEDERSI: il maranza che ti viene incontro, il FUMETTO sopra la testa con la frase, il FUMO della sigaretta, lINSISTENZA dopo il no, il PUGNO e la FUGA.\n\n' +
    'Alla fine scrivi nel tuo risultato: cosa hai fatto, cosa hai tagliato e perche, i numeri finali del collaudo (chiamate di disegno nel punto peggiore, triangoli, quante prove verdi), e i file che hai toccato.',
  { label: 'maranza', phase: 'Maranza', effort: 'high' },
)

log('maranza fatto')

phase('Furti')

const furti = await agent(
  REGOLE +
    '\n\nIL TUO LAVORO: bici e auto da rubare. E una richiesta esplicita dellutente, testuale:\n\n' +
    '«il nostro giocatore puo rubare le bici o puo comunque rubare una macchina, puo fermarla»\n\n' +
    'LA SPECIFICA COMPLETA e in /home/user/3d/tools/lugo/specifiche/spec-furto.json - leggila TUTTA con node (stampa i campi uno per uno, non cat). Contiene fileNuovi col campo dettaglio lungo (parametri di guida della bici, rimozione del collider dalla spatial hash, frenata del traffico, conseguenze sul livello di ricercato), fileModificati con ancore precise, rischi e collaudo.\n\n' +
    'Leggi anche /home/user/3d/tools/lugo/specifiche/spec-piano.json, la fusione decisa da un revisore che ha letto tutte le specifiche. Ti riguardano store, player, hud, css, input, conflitti, tagli. Queste sono decisioni gia prese che devi rispettare:\n' +
    '- Modalita diventa auto | piedi | bici: una parola in piu, da propagare in posGiocatore, Minimap, Hud, Joystick.\n' +
    '- veicoloRubato nello store e il VESTITO dellauto che guidi adesso: NON si sovrascrivono tintaAuto/modelloAuto, che sono la scelta salvata del giocatore.\n' +
    '- Si salva solo il contatore furti { bici, auto }. NON si salvano veicoloRubato ne wanted ne lo stato delle auto in giro.\n' +
    '- La PRECEDENZA del tasto E e a gradini FISSI e la distanza decide solo DENTRO un gradino: 1 chiudi pannello, 2 scendi, 3 la TUA auto, 4 il veicolo da rubare (e solo se piu vicino di bacheca e bottega), 5 bacheca/bottega, 6 maranza. La ragione e scritta nel piano: un pannello aperto per sbaglio si chiude con unaltra E, un reato per sbaglio no.\n' +
    '- Niente tasti nuovi.\n' +
    '- La tabella delle soglie del livello di ricercato e gia copiata tre volte in Player.tsx: estraila in una funzione sola.\n\n' +
    'ATTENZIONE - il repo e cambiato da quando la specifica e stata scritta, e due cose la contraddicono:\n' +
    '- components/lugo/Veicoli.tsx NON ha piu il componente AutoInGiro: le auto del traffico stanno ora dentro le STESSE InstancedMesh delle auto in sosta (indici da parcheggi.length in poi) piu una instanced per i fari. Se unauto del traffico viene rubata devi toglierla da li, non da un componente che non esiste piu.\n' +
    '- components/lugo/Character.tsx fonde testa e busto in una mesh sola (Pezzo/fondiPezzi/Fuso). Per la posa in sella ruota i gruppi come prima; NON disfare la fusione, serve al budget.\n' +
    '- Un altro agente ha appena implementato i maranza toccando npc.ts, Npcs.tsx, runtime.ts, Player.tsx, Hud.tsx e Character.tsx. LEGGI il loro codice prima di modificarli: git log -3 e git show --stat HEAD dicono cosa e cambiato. Non disfare il loro lavoro.\n\n' +
    'Il margine di prestazioni e strettissimo. La bici in sella e le rastrelliere devono stare dentro InstancedMesh col count che va a zero quando non servono.\n\n' +
    'Alla fine scrivi nel tuo risultato: cosa hai fatto, cosa hai tagliato e perche, i numeri finali del collaudo, e i file toccati.',
  { label: 'furti', phase: 'Furti', effort: 'high' },
)

log('furti fatti')

phase('Revisione')

const REVISIONE = {
  type: 'object',
  additionalProperties: false,
  required: ['esito', 'riparati', 'restano', 'numeri'],
  properties: {
    esito: { type: 'string', description: 'Come e andata, in prosa italiana, 4-8 frasi.' },
    riparati: { type: 'array', items: { type: 'string' }, description: 'I difetti che hai trovato E riparato.' },
    restano: { type: 'array', items: { type: 'string' }, description: 'I difetti trovati e NON riparati, col perche.' },
    numeri: { type: 'string', description: 'Chiamate di disegno nel punto peggiore, triangoli, prove verdi su totale.' },
  },
}

const revisione = await agent(
  REGOLE +
    '\n\nIL TUO LAVORO: leggere in modo AVVERSARIO tutto quello che due agenti hanno appena scritto, trovare i difetti veri, e ripararli.\n\n' +
    'Guarda cosa e cambiato: git log --oneline -6, git show --stat sui commit nuovi, poi il diff completo dei due lavori (i maranza e i furti).\n\n' +
    'Cerca in particolare, perche e dove questo genere di lavoro si rompe:\n' +
    '1. LE DUE MODIFICHE CHE SI PESTANO I PIEDI. I due agenti hanno toccato gli stessi file (Player.tsx, Hud.tsx, npc.ts, Npcs.tsx, runtime.ts, Character.tsx). Il secondo ha davvero letto il primo, o ha sovrascritto? Il tasto E fa ancora tutte e sei le cose nellordine giusto? Il pugno funziona ancora dopo che e arrivata la bici?\n' +
    '2. LE PRESTAZIONI. Esegui il collaudo e leggi il numero delle chiamate di disegno nel punto peggiore. Sopra 170 e rosso e va riparato. A 169 il margine e finito e va detto. Usa gli hook spesa() e accendi(nome, acceso) per capire dove si spende: lo strumento ce gia, non tirare a indovinare.\n' +
    '3. LE COSE CHE NON SI VEDONO. Il collaudo puo essere verde e il gioco brutto. Fai le cartoline: metti il giocatore davanti a un maranza durante lincontro e fotografa; mettilo in sella a una bici e fotografa; poi GUARDA le immagini con Read su tools/lugo/shots/*.png e giudica se un giocatore capirebbe cosa sta succedendo. Il fumetto si legge? Il fumo si vede? Il ciclista e seduto sulla bici o ci galleggia sopra?\n' +
    '4. IL DETERMINISMO. Math.random() nella generazione del mondo e un difetto: cerca le occorrenze in lib/ e components/ e giudica ognuna.\n' +
    '5. LE REGOLE NON NEGOZIABILI. Le battute dei maranza sono mai volgari o offensive? Il comportamento e associato a unetnia? (Non deve esserlo.) Il collaudo conta ancora zero partner, zero promo, zero loghi?\n' +
    '6. I CASI LIMITE. Cosa succede se rubi una bici e poi sali in auto? Se il maranza ti insegue mentre pedali? Se scendi dalla bici dentro un muro? Se il pugno parte mentre sei in sella?\n\n' +
    'RIPARA quello che trovi, con la stessa cura del resto del repo, e rimetti tutti e tre i cancelli verdi. Fai UN commit tuo con le riparazioni, in prosa italiana. Se un difetto e troppo grosso per essere riparato adesso, NON lasciarlo silenzioso: scrivilo in restano.\n\n' +
    'Sii onesto nel giudizio: se qualcosa e stato fatto male, dillo.',
  { label: 'revisione-avversaria', phase: 'Revisione', schema: REVISIONE, effort: 'high' },
)

return { maranza, furti, revisione }
