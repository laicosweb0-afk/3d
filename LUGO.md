# LUGO — un open world romagnolo

Un piccolo open world giocabile nel browser, ambientato nella **vera Lugo di
Ravenna**: si guida un'utilitaria per le strade scaricate da OpenStreetMap,
si scende a piedi, si cerca un amico scomparso tra il Pavaglione, la Rocca
Estense, la stazione e il monumento a Francesco Baracca — e poi si vive di
consegne, soldi e guai coi Carabinieri. Route: **`/lugo`**.

## Come si gioca

| Comando | Azione |
|---|---|
| W A S D / Frecce | guida e cammina |
| E / Invio | scendi, sali, parla, **entra in bottega** |
| Shift | corri |
| Spazio | freno a mano (derapata) |
| F | tira un pugno (a piedi) |
| R | raddrizza l'auto sulla strada |
| Palla in basso a destra | guida col mouse o col dito (mobile) |

**La storia**: *Trova il tuo amico*. Giacomo non risponde da stamattina;
ogni missione è un indizio sui luoghi veri, fino al colpo di scena in
caserma. Finita la storia la città continua a vivere di **consegne** stile
rider: più corri, più guadagni (bonus velocità + mancia).

**Soldi e reputazione** (€ e REP) si accumulano e si **salvano da soli** in
localStorage: alla riapertura c'è CONTINUA. La guida spericolata alza il
**livello ricercato** (★ fino a 3): la gazzella insegue, e se ti fermano
paghi la multa. A piedi i maranza ti fermano per una sigaretta: **dialogo a
scelte** con conseguenze.

**Il tempo passa**: una giornata dura un quarto d'ora. All'imbrunire si
accendono lampioni, luminarie e fari; al mattino cantano gli uccelli, la
sera i grilli. All'ora giusta compaiono gli **eventi**: il mercato nella
corte del Pavaglione, la musica in Piazza Baracca, il raduno di bici alla
Rocca.

**Le attività**: le 65 botteghe vere della mappa si visitano a piedi con E —
caffè al bar, piadina in trattoria, gratta e vinci dal tabaccaio, vestiti
nei negozi (e il vestito comprato si vede addosso).

## Com'è fatto

- **Dati veri**: `.github/workflows/lugo-dati.yml` scarica Lugo da Overpass
  (bbox ~1.8×1.8 km sul centro) e `tools/lugo/build-map.mjs` la distilla in
  `public/lugo/map.json` (~440 KB): 921 strade, ~2.000 edifici coi cortili
  veri (fori nei footprint), aree, ferrovia e POI riconosciuti per nome.
  Rilancio: tab Actions → "Dati di Lugo", o un push che tocca gli script.
- **Città**: edifici estrusi e fusi in due draw call con vertex colors
  (`lib/lugo/citygen.ts`); landmark bespoke sui footprint reali
  (`components/lugo/Landmarks.tsx`) — il Pavaglione ha il tetto a padiglione,
  i portali col timpano, la corte con palco e giostra; la Rocca la
  merlatura e il mastio.
- **Fisica**: motore arcade 2D senza librerie (`lib/lugo/{physics,car,character}.ts`),
  collisioni cerchio-vs-OBB/segmenti su spatial hash. Lugo è in pianura.
- **Missioni**: architettura data-driven in `lib/lugo/missions.ts` — storia
  a catena + consegne generate al volo dai negozi veri della mappa. Per
  aggiungerne basta una voce nell'array (o un generatore come `creaConsegna`).
- **Attività ed eventi**: `lib/lugo/attivita.ts` e `lib/lugo/eventi.ts` sono
  **sistemi dati separati dal motore**: si aggiunge una riga e il mondo la
  mette in scena. I campi `partner`, `promo` e `logo` restano vuoti per
  costruzione — un'attività reale compare solo con nome e categoria, come
  già pubblici su OpenStreetMap, finché l'esercente non autorizza.
- **Tempo**: `lib/lugo/tempo.ts` interpola sei momenti della giornata e
  guida sole, cielo, nebbia e luci artificiali.
- **Veicoli**: `lib/lugo/carrozzerie.ts` descrive cinque sagome italiane per
  proporzioni, senza marchi né modelli protetti.
- **Stato**: Zustand per ciò che vede la UI (`lib/lugo/store.ts`), oggetti
  mutabili fuori da React per ciò che cambia ogni frame (`lib/lugo/runtime.ts`).
- **NPC**: cento pedoni in undici draw call instanziati (`components/lugo/Npcs.tsx`)
  — maranza, anziani, carabinieri in coppia — più la gazzella, che passa da
  pattuglia a inseguimento quando sei ricercato.
- **UI**: design system unico in `app/lugo/lugo.css` (vetro scuro, accento
  caldo, microanimazioni), HUD con schede cinematografiche di inizio e fine
  missione, minimappa con zoom dinamico, controlli touch contestuali.
- **Audio**: WebAudio procedurale, zero asset (`lib/lugo/audio.ts`): mixer a
  quattro bus (effetti, voci, ambiente, musica) regolabile dalle
  impostazioni, brusio di città, uccelli, grilli, campanelli e voci di
  strada. `VOCI_FILE` è il gancio pronto per i campioni registrati.
- **Qualità adattiva**: DPR a gradini dal frame time (pattern del sito).

## Collaudo

```bash
npm run build && npm run lugo:verify          # smoke test headless completo
NEXT_PUBLIC_BASE_PATH=/3d npm run build && BASE=/3d npm run lugo:verify
```

Il test guida davvero: accelera, sbatte, guida col joystick, scende,
cammina, completa una missione, conta gli NPC e scatta cartoline aeree dei
landmark in `tools/lugo/shots/`. La modalità `?qa=1` (solo per il collaudo)
spegne le ombre e riduce DPR e NPC per il rendering software headless.

Il resto del repo (Mondial, Bufala, Mediapro) non è toccato: il gioco vive
tutto in `app/lugo/`, `components/lugo/`, `lib/lugo/`, `tools/lugo/`.
