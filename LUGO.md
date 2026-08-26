# LUGO — un open world romagnolo

Un mini open-world giocabile nel browser, ambientato nella **vera Lugo di
Ravenna**: si guida un'utilitaria per le strade scaricate da OpenStreetMap,
si scende a piedi, si completano missioni tra il Pavaglione, la Rocca
Estense, la stazione e il monumento a Francesco Baracca. Route: **`/lugo`**.

## Come si gioca

| Tasto | Azione |
|---|---|
| W A S D / Frecce | guida e cammina |
| E / Invio | scendi e sali dall'auto |
| Shift | corri |
| Spazio | freno a mano (derapata) |
| R | raddrizza l'auto sulla strada |

Sette missioni in italiano si concatenano da sole (consegne, checkpoint,
tempo e punteggio). Solo tastiera: da computer, non da telefono.

## Com'è fatto

- **Dati veri**: `.github/workflows/lugo-dati.yml` scarica Lugo da Overpass
  (bbox ~1.8×1.8 km sul centro) e `tools/lugo/build-map.mjs` la distilla in
  `public/lugo/map.json` (~440 KB): 921 strade, ~2.000 edifici coi cortili
  veri (fori nei footprint), aree, ferrovia e POI riconosciuti per nome.
  Rilancio: tab Actions → "Dati di Lugo", o un push che tocca gli script.
- **Città**: edifici estrusi e fusi in due draw call con vertex colors
  (`lib/lugo/citygen.ts`); landmark bespoke sui footprint reali
  (`components/lugo/Landmarks.tsx`) — il quadriportico del Pavaglione ha
  logge percorribili e quattro varchi, la Rocca la merlatura e il mastio.
- **Fisica**: motore arcade 2D senza librerie (`lib/lugo/{physics,car,character}.ts`),
  collisioni cerchio-vs-OBB/segmenti su spatial hash. Lugo è in pianura.
- **NPC**: cento pedoni in undici draw call instanziati (`components/lugo/Npcs.tsx`)
  — maranza, anziani, carabinieri in coppia — più la gazzella di pattuglia.
- **Audio**: WebAudio procedurale, zero asset (`lib/lugo/audio.ts`).
- **Qualità adattiva**: DPR a gradini dal frame time (pattern del sito).

## Collaudo

```bash
npm run build && npm run lugo:verify          # smoke test headless completo
NEXT_PUBLIC_BASE_PATH=/3d npm run build && BASE=/3d npm run lugo:verify
```

Il test guida davvero: accelera, sbatte, scende, cammina, completa una
missione, conta gli NPC e scatta cartoline aeree dei landmark in
`tools/lugo/shots/`. La modalità `?qa=1` (solo per il collaudo) spegne le
ombre e riduce DPR e NPC per il rendering software headless.

Il resto del repo (Mondial, Bufala, Mediapro) non è toccato: il gioco vive
tutto in `app/lugo/`, `components/lugo/`, `lib/lugo/`, `tools/lugo/`.
