export const meta = {
  name: 'lugo-movimento-mobile',
  description: 'Diagnosi misurata e cura del solo movimento del personaggio, mobile-first',
  phases: [
    { title: 'Diagnosi', detail: 'misure vere su viewport da telefono, requisito per requisito' },
    { title: 'Cura', detail: 'interventi chirurgici sui soli file del movimento' },
    { title: 'Verifica', detail: 'collaudo avversario su telefono con cartoline' },
  ],
}

const REGOLE = [
  'PROGETTO: LUGO CITY, open world browser sulla vera Lugo di Ravenna. Repo /home/user/3d, branch claude/gta6-lugo-ravenna-hzd00f.',
  'Next.js 15 static export, react-three-fiber, three 0.170, Zustand, TypeScript, fisica arcade scritta a mano.',
  '',
  'MANDATO DELL UTENTE, TESTUALE E NON NEGOZIABILE: intervenire ESCLUSIVAMENTE sul sistema di movimento e controllo del personaggio giocabile.',
  'VIETATO toccare: UI, HUD, missioni, edifici, mappa, NPC, economia, inventario, grafica generale, colori, layout, attivita, dialoghi.',
  'VIETATO aggiungere funzionalita nuove. VIETATO fare redesign. VIETATO riscrivere sistemi funzionanti senza motivo misurato.',
  '',
  'I FILE DEL MOVIMENTO, gli unici toccabili (oltre a tools/lugo/verify-lugo.mjs per le prove):',
  '- lib/lugo/character.ts (fisica a piedi: stepPersona, PERSONA)',
  '- lib/lugo/stick.ts (ponte joystick -> assi, conStick e fusione in lib/lugo/input.ts)',
  '- lib/lugo/input.ts (fusione tastiera+stick)',
  '- components/lugo/Joystick.tsx (il pad touch)',
  '- components/lugo/Player.tsx SOLO la funzione ChaseCamera e il ramo a piedi del useFrame (non il tasto E, non i furti, non i maranza)',
  '- components/lugo/Character.tsx SOLO la sincronizzazione velocita->animazione (non la geometria, non il guardaroba)',
  '- app/lugo/lugo.css SOLO le regole del joystick (per esempio touch-action), nessun cambiamento visivo',
  '',
  'COME SI LAVORA QUI: codice e commenti in ITALIANO, discorsivi, che spiegano il PERCHE e il bug evitato (leggi lib/lugo/character.ts per lo stile). Niente pacchetti nuovi. Niente Math.random nella logica. Il mondo e deterministico.',
  '',
  'CANCELLI (eseguili tu, tutti verdi prima di dichiarare finito):',
  '  npx tsc --noEmit',
  '  npm run build',
  '  node tools/lugo/verify-lugo.mjs   -> deve chiudere con "tutto verde"',
  'Il collaudo ha gia una matrice completa di prove di movimento (8 direzioni da tastiera, joystick nelle 5 direzioni, diagonale non piu veloce, rilascio che ferma): se una diventa rossa l hai rotta tu.',
  '',
  'BUDGET: 700k triangoli e 170 draw call, oggi ~161 nel punto peggiore. Il movimento non deve aggiungere NIENTE alla scena.',
  'NON fare push ne merge: ci pensa il coordinatore. Fai UN commit in prosa italiana quando i cancelli sono verdi.',
].join('\n')

phase('Diagnosi')

const DIAGNOSI = {
  type: 'object',
  additionalProperties: false,
  required: ['requisiti', 'difetti', 'nonDifetti'],
  properties: {
    requisiti: {
      type: 'array',
      description: 'Uno per ciascuno dei 10 requisiti del mandato: joystick, direzione, accelerazione, camminata, corsa, rotazione, animazione, camera, collisioni, mobile.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nome', 'stato', 'misura', 'giudizio'],
        properties: {
          nome: { type: 'string' },
          stato: { type: 'string', enum: ['ok', 'debole', 'rotto'] },
          misura: { type: 'string', description: 'Il NUMERO misurato, non un impressione: tempi, velocita, gradi, pixel.' },
          giudizio: { type: 'string', description: 'Perche e ok/debole/rotto, e cosa andrebbe cambiato con che valore.' },
        },
      },
    },
    difetti: { type: 'array', items: { type: 'string' }, description: 'I difetti concreti da riparare, in ordine di impatto su chi gioca da telefono.' },
    nonDifetti: { type: 'array', items: { type: 'string' }, description: 'Cose che sembrano difetti ma non lo sono, con la prova. Servono a evitare che la fase di cura riscriva il sano.' },
  },
}

const diagnosi = await agent(
  REGOLE +
    '\n\nIL TUO LAVORO: DIAGNOSI, senza toccare una riga di codice del gioco. Misura il movimento vero contro i 10 requisiti del mandato, su un VIEWPORT DA TELEFONO (390x844, hasTouch), e produci numeri.\n\n' +
    'Come si misura: npm run build se serve, poi servi out/ con node tools/static-server.mjs /home/user/3d/out 4519 e apri http://localhost:4519/lugo/?qa=1 con playwright-core (chromium a /opt/pw-browsers/chromium). Gli hook su window.__LUGO__ che ti servono esistono gia: pos(), direzione() (camYaw, yaw, vx, vz, v), mode(), teleport(x,z). Leggi tools/lugo/verify-lugo.mjs per vedere come si preme il joystick virtuale via touchscreen (ci sono gia prove che lo trascinano).\n\n' +
    'MISURE MINIME RICHIESTE, requisito per requisito:\n' +
    '1. JOYSTICK: trascina la palla nelle 8 direzioni via touch e leggi gli assi risultanti; trascina FUORI dal pad (dito che scivola oltre il bordo) e verifica che il controllo non si perda; tocca con un SECONDO dito il bottone CORRI mentre il primo tiene il pad e verifica che gli assi non saltino; rilascia di colpo a piena corsa e misura in quanti ms la velocita scende sotto 0.1.\n' +
    '2. DIREZIONE: per le 8 direzioni misura l angolo di marcia effettivo contro l atteso (gia fatto dal collaudo per la tastiera: rifallo col TOUCH e annota gli scarti).\n' +
    '3. ACCELERAZIONE: da fermo, spinta massima avanti: campiona v ogni 50 ms e riporta la curva (tempo a 1 m/s, a 2 m/s, alla velocita di camminata). Deve esserci una rampa, non un gradino.\n' +
    '4. CAMMINATA: la velocita di regime a mezza corsa del pad e a piena corsa (analogico vero? o esce sempre il massimo?).\n' +
    '5. CORSA: premi CORRI mentre cammini e campiona v: quanto dura la transizione 2.3 -> 5.2? C e un salto visivo? Rilascia CORRI e misura il ritorno.\n' +
    '6. ROTAZIONE: da fermo verso un bersaglio a 180 gradi: campiona yaw e riporta il tempo di rotazione completa; poi inversione secca durante la corsa (avanti poi subito indietro) e di se il personaggio scatta o gira.\n' +
    '7. ANIMAZIONE: leggi components/lugo/Character.tsx e di come viene calcolata l intensita della corsa (corsa/v): e continua con la velocita o scatta a soglia? Riporta la formula esatta.\n' +
    '8. CAMERA: campiona la posizione della camera per 3 secondi mentre cammini dritto e mentre curvi: ci sono salti fra un frame e l altro sopra i 0.5 m? La camera oltrepassa mai il personaggio? Riporta anche cosa succede alla camera quando ti fermi di colpo.\n' +
    '9. COLLISIONI: cammina contro un muro frontalmente e in obliquo: si scivola lungo il muro o ci si incolla? Si riesce a incastrarsi in un angolo fra due edifici? Prova almeno 3 angoli veri del centro.\n' +
    '10. MOBILE: verifica che il pad abbia touch-action:none (o equivalente) nel CSS, che il tocco sul pad non faccia scrollare o zoomare la pagina, e che i pulsanti E/CORRI/pugno rispondano al primo tocco anche mentre il pad e attivo.\n\n' +
    'Leggi anche il codice (lib/lugo/character.ts, lib/lugo/stick.ts, lib/lugo/input.ts, components/lugo/Joystick.tsx, ChaseCamera in components/lugo/Player.tsx) e collega ogni misura alla riga che la produce.\n\n' +
    'IMPORTANTE: annota anche cio che funziona GIA bene (nonDifetti), con la prova: la fase dopo non deve riscrivere il sano. Non modificare nessun file.',
  { label: 'diagnosi-movimento', phase: 'Diagnosi', schema: DIAGNOSI, effort: 'high' },
)

log('diagnosi: ' + diagnosi.difetti.length + ' difetti, ' + diagnosi.nonDifetti.length + ' non-difetti')

phase('Cura')

const cura = await agent(
  REGOLE +
    '\n\nIL TUO LAVORO: CURA. Ripara i difetti elencati dalla diagnosi qui sotto, e SOLO quelli. Ogni difetto riparato deve avere la sua prova nel collaudo (tools/lugo/verify-lugo.mjs, fasi nuove in coda o rafforzamento di quelle esistenti), cosi non torna.\n\n' +
    'LA DIAGNOSI (misure vere, requisito per requisito):\n' +
    JSON.stringify(diagnosi, null, 1) +
    '\n\nREGOLE DELLA CURA:\n' +
    '- I nonDifetti NON si toccano: sono sani e provati sani.\n' +
    '- Ogni modifica minima e mirata: cambi un valore o una formula, non l architettura. La struttura input -> assi -> stepPersona -> camera e giusta e resta.\n' +
    '- Se un difetto richiede di toccare un file fuori dall elenco dei toccabili, NON farlo: segnalalo nel risultato.\n' +
    '- Transizioni: qualunque cambiamento di velocita bersaglio (camminata<->corsa, rilascio, inversione) deve passare dalla rampa, mai assegnato secco.\n' +
    '- La camera non deve MAI oltrepassare il personaggio ne saltare: se la diagnosi ha trovato salti, la cura e nello smorzamento (lerp esponenziale con costante di tempo), non in soglie che scattano.\n' +
    '- Su telefono il pad deve reggere: dito oltre il bordo (pointer capture), secondo dito sui bottoni, rilascio improvviso, cambio direzione in corsa.\n' +
    '- Alla fine: tsc, build, collaudo TUTTO VERDE, un commit in prosa italiana.\n\n' +
    'Nel risultato scrivi: cosa hai trovato (in breve), cosa hai modificato e perche, file per file; i numeri prima/dopo per ogni difetto; cosa NON hai toccato di proposito; le prove nuove aggiunte al collaudo.',
  { label: 'cura-movimento', phase: 'Cura', effort: 'high' },
)

log('cura fatta')

phase('Verifica')

const VERDETTO = {
  type: 'object',
  additionalProperties: false,
  required: ['checklist', 'riparatiInExtremis', 'restano', 'numeri'],
  properties: {
    checklist: {
      type: 'array',
      description: 'I 10 punti del criterio di successo del mandato, ciascuno provato DAVVERO su viewport telefono.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['punto', 'esito', 'come'],
        properties: {
          punto: { type: 'string' },
          esito: { type: 'string', enum: ['passa', 'fallisce'] },
          come: { type: 'string', description: 'Come e stato provato e con che numeri.' },
        },
      },
    },
    riparatiInExtremis: { type: 'array', items: { type: 'string' } },
    restano: { type: 'array', items: { type: 'string' }, description: 'Problemi rimasti, onesti, col perche.' },
    numeri: { type: 'string' },
  },
}

const verifica = await agent(
  REGOLE +
    '\n\nIL TUO LAVORO: VERIFICA AVVERSARIA del movimento appena curato. Non fidarti del lavoro precedente: prova a romperlo.\n\n' +
    'Guarda il diff (git log -2, git diff HEAD~1) e poi, su viewport telefono 390x844 con hasTouch, prova UNO PER UNO i 10 punti del criterio di successo del mandato:\n' +
    '1 camminare avanti; 2 indietro; 3 destra; 4 sinistra; 5 diagonali; 6 ruotare; 7 iniziare a correre; 8 smettere di correre; 9 fermarsi; 10 cambiare direzione durante la corsa.\n' +
    'Ognuno via TOUCH sul joystick virtuale, con misure (angoli, velocita, tempi), non a occhio.\n\n' +
    'Poi i casi cattivi: dito che scivola fuori dal pad e torna; rilascio a meta curva; doppio tocco rapidissimo; secondo dito su CORRI e PUGNO mentre il primo guida; rotazione della camera mentre si cammina contro un muro; angolo stretto fra due edifici del centro.\n\n' +
    'Se trovi un difetto RIPARALO (stessi vincoli di file della cura), rimetti i cancelli verdi e committa. Se e fuori mandato, scrivilo in restano senza toccarlo.\n' +
    'Lascia almeno 2 cartoline in tools/lugo/shots (una camminata, una corsa) e GUARDALE con Read per confermare che il personaggio e in posa coerente con la velocita.\n' +
    'Chiudi con: tre cancelli verdi e stato del working tree pulito.',
  { label: 'verifica-avversaria', phase: 'Verifica', schema: VERDETTO, effort: 'high' },
)

return { diagnosi, cura, verifica }
