# Mondial Service — Scroll-Driven Cinematic Experience

Un unico piano sequenza: il visitatore assiste alla trasformazione di uno spazio reale — dal rilievo al bagno finito — guidando la camera con lo scroll.

## Documenti di progetto

| Documento | Contenuto |
|---|---|
| [CREATIVE_MASTER_BRIEF.md](./CREATIVE_MASTER_BRIEF.md) | Brief originale del cliente |
| [CONCEPT_V2.md](./CONCEPT_V2.md) | Analisi critica e concept approvato |
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Analisi dei riferimenti, palette quiet-luxury, token |
| [DIRECTION_V3.md](./DIRECTION_V3.md) | Riallineamento identità: impresa edile premium, tema = trasformazione |
| [DIRECTION_V4.md](./DIRECTION_V4.md) | Il reale come protagonista: le finestre di realtà nel viaggio |
| [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) | Architettura tecnica e milestone |
| [CARTONE-MEDIAPRO.md](./CARTONE-MEDIAPRO.md) | Il corto promozionale MediaPro: direzione, scaletta, rendering |

## Stato

- **M0 — scaffold**: fatto (Next 15 + React 19 + R3F 9 + GSAP/ScrollTrigger + Lenis + Zustand).
- **M1 — prototipo di regia**: fatto. Camera path completo e transizioni-firma: costruzione (S03), lama di trasformazione (S04), spaccato parete (S08), esploso stratigrafia con serpentina (S09), accensione (S10-bis).
- **M2 — passata materica**: fatto. Texture fotografiche dei materiali reali (calacatta, marquina, rovere, pietra a spacco) fornite dal cliente via Higgsfield, integrate nei materiali sweep.
- **M3 — realismo, suono, motion**: fatto. Ombre morbide reali (sole con shadow map), luce calda interna, micro-dettagli discreti (battiscopa, cornici, quadri, libri, pianta, lampada, asciugamani); sound design procedurale WebAudio opt-in (vento, sub, micro-impatti di cantiere, room tone, whoosh legati alla velocità) tutto `f(p)`; motion design con reveal delle sezioni e ingresso hero a easing cinematografico, rispettoso di `prefers-reduced-motion`.
- **M4 — sezioni finali**: fatto. Metodo, Opere (prima/dopo dal mondo 3D), Ambienti, Materiali, Servizi, Garanzie, Contatti con dati reali (telefono, WhatsApp, email, P.IVA, Maps).

## Sviluppo

```bash
npm install
npm run dev        # sviluppo
npm run build      # build di produzione
npm start          # serve la build
node tools/verify.mjs   # scroll-through Playwright con screenshot (richiede build avviata; SHOTDIR=<dir>)

node tools/cartone-render.mjs            # il corto MediaPro in mp4/webm (richiede `npm run build`)
node tools/cartone-render.mjs --provini  # nove fotogrammi, uno per battuta
```

Le pagine: `/` Mondial Service · `/bufala` Quelli della bufala · `/mediapro`
il sito dello studio · `/cartone` il corto promozionale (spazio = pausa,
frecce = un fotogramma).

## Architettura in una riga

Tutto è funzione pura del progresso di scroll `p ∈ [0,1]` (`lib/progress.ts`): la camera (`components/canvas/rig`), le tracce degli eventi (`content/direction.ts`), i testi (`components/dom/Overlays.tsx`) e il suono (M3) campionano la stessa timeline — reversibile per costruzione.
