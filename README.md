# Mondial Service — Scroll-Driven Cinematic Experience

Un unico piano sequenza: il visitatore assiste alla trasformazione di uno spazio reale — dal rilievo al bagno finito — guidando la camera con lo scroll.

## Documenti di progetto

| Documento | Contenuto |
|---|---|
| [CREATIVE_MASTER_BRIEF.md](./CREATIVE_MASTER_BRIEF.md) | Brief originale del cliente |
| [CONCEPT_V2.md](./CONCEPT_V2.md) | Analisi critica e concept approvato |
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Analisi dei riferimenti, palette quiet-luxury, token |
| [DIRECTION_V3.md](./DIRECTION_V3.md) | Riallineamento identità: impresa edile premium, tema = trasformazione |
| [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) | Architettura tecnica e milestone |

## Stato

- **M0 — scaffold**: fatto (Next 15 + React 19 + R3F 9 + GSAP/ScrollTrigger + Lenis + Zustand).
- **M1 — prototipo di regia**: fatto. Camera path completo e transizioni-firma: costruzione (S03), lama di trasformazione (S04), spaccato parete (S08), esploso stratigrafia con serpentina (S09), accensione (S10-bis).
- **M2 — passata materica (in-engine)**: fatto. Materiali dalle foto reali (calacatta, marquina, rovere, pietra a spacco) come texture procedurali a runtime (`components/canvas/materials/procedural.ts`); serramenti scuri con vetro, vasca tornita, environment softbox + ombre di contatto. Le versioni fotografiche delle texture sono state generate con Higgsfield (nella libreria del progetto) ma la policy di rete della sessione ne blocca il download: si integrano in produzione sostituendo le mappe, senza toccare i materiali. La geometria resta low-poly ma con proporzioni e dettagli credibili; l'eventuale passata DCC (Blender) può sostituire il modello senza cambiare i contratti di regia.

## Sviluppo

```bash
npm install
npm run dev        # sviluppo
npm run build      # build di produzione
npm start          # serve la build
node tools/verify.mjs   # scroll-through Playwright con screenshot (richiede build avviata; SHOTDIR=<dir>)
```

## Architettura in una riga

Tutto è funzione pura del progresso di scroll `p ∈ [0,1]` (`lib/progress.ts`): la camera (`components/canvas/rig`), le tracce degli eventi (`content/direction.ts`), i testi (`components/dom/Overlays.tsx`) e il suono (M3) campionano la stessa timeline — reversibile per costruzione.
