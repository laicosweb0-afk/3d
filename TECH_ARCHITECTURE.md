# MONDIAL SERVICE — ARCHITETTURA TECNICA

Traduce il [Concept V2 approvato](./CONCEPT_V2.md) e l'[Art Direction](./ART_DIRECTION.md) in un sistema costruibile. Ogni scelta qui dentro esiste per servire le regole di regia del concept — in particolare: un solo piano sequenza, scroll nativo reversibile, 60 fps come vincolo e non come auspicio.

---

## 1. Principi architetturali

1. **Una sola timeline.** L'intero viaggio 3D è una funzione pura dello scroll: `stato = f(p)` con `p ∈ [0,1]`. Nessuna scena ha stato proprio, nessun evento è "one-shot": tutto è campionato dal progresso. È questo che rende la reversibilità (regola di regia n.4) un fatto strutturale e non una feature da mantenere.
2. **Il DOM è il documento, il canvas è il cinema.** Sotto il canvas vive un documento HTML semantico completo e indicizzabile. Il 3D è progressive enhancement: se non può girare (WebGL assente, reduced-motion, fallimento asset), il sito resta intero.
3. **La regia si scrive in Blender, non nel codice.** Camera path, ordine di costruzione, zone materiali e piani di sezione sono *dati* autorati nel file 3D ed esportati; il runtime li interpreta. Iterare sulla regia non richiede deploy di codice.
4. **Il budget di performance è un'API.** Ogni sistema (materiali, DPR, effetti) dichiara cosa spegne a ogni tier di qualità; il quality manager decide in base al frame time misurato, mai allo user agent.

---

## 2. Stack

| Livello | Scelta | Motivo |
|---|---|---|
| Framework | **Next.js 15 (App Router, output statico) + React 19 + TypeScript** | SSG per SEO/OG/schema.org del layer documentale; nessun server richiesto; ecosistema R3F maturo |
| 3D | **three.js + React Three Fiber v9 + drei** | Dichiaratività, Suspense per lo streaming asset |
| Scroll | **Lenis** (smoothing su scroll nativo) + **GSAP ScrollTrigger** (scrub, pin) | Scroll mai hijackato; ScrollTrigger è la sola sorgente di `p` |
| Regia/authoring | **Blender** (camera path, marker, proprietà custom) + editor dev in-app (leva) per rifiniture | Vedi principio 3 |
| Stato applicativo | **Zustand** (progress, capitolo, qualità, audio, preferenze) | Minimo, fuori dal render loop React |
| Audio | **WebAudio** nativo (bus + stem per scena) | Crossfade campionati da `p`, opt-in |
| Asset pipeline | **glTF + Draco/meshopt + KTX2** via `gltf-transform` (script in `tools/`) | Budget VRAM e caricamento progressivo |
| Lingua contenuti | Copy in file di contenuto tipizzati (`content/*.ts`), predisposto IT→multi-lingua | Il copy non vive nei componenti |

Esclusi deliberatamente: Theatre.js (la regia sta in Blender; due sistemi di authoring sono uno di troppo), librerie di smooth-scroll proprietarie, postprocessing pesante (bloom/SSR/DOF: il mondo è bianco e baked — non servono e costano).

---

## 3. Struttura del repository

```
app/                    # Next.js App Router (layout, page, meta, OG)
components/
  dom/                  # Hero, testi di scena, timeline-metro, CTA, sezioni S13
  canvas/
    World.tsx           # <Canvas> + orchestrazione Suspense/streaming
    rig/                # CameraRig, curve, damping, noise steadicam
    scenes/             # Un componente per atto (Atto1…Atto4): binding p→uniforms
    materials/          # Shader maquette/reale, lama di trasformazione, sezioni
lib/
  progress.ts           # ScrollTrigger→p, mappa scene (tabella §5), deep-link capitoli
  quality.ts            # Quality manager adattivo (tier, DPR, feature flags)
  audio.ts              # Bus WebAudio, stems, crossfade su p
  a11y.ts               # reduced-motion, focus management, aria-sync capitoli
content/                # Copy per scena/sezione, dati servizi (3 pilastri), meta
public/assets/
  models/               # glTF ottimizzati (villa.lod0/lod1, stratigrafie)
  textures/             # KTX2 (lightmap, materiali), env probes per ambiente
  audio/                # stems compressi (opus/aac)
  stills/               # render statici per fallback/reduced-motion/OG
tools/                  # Script pipeline: export Blender → gltf-transform → report budget
docs/                   # Questo documento + brief + concept + art direction
```

---

## 4. Il sistema di scroll e progresso

- **Layout**: il canvas è `position: fixed`; un elemento spacer alto **~2250 svh** (22,5 viewport, da Concept §3) genera lo scroll del viaggio; le sezioni S13 seguono nel flusso normale del documento.
- **`p` master**: un unico ScrollTrigger sullo spacer produce `p ∈ [0,1]`. Lenis smussa lo scroll nativo (lerp ~0.08–0.12, tarato su mobile); in aggiunta il rig applica il proprio damping (sotto), così anche un salto di capitolo resta un *percorso*.
- **Mappa scene**: tabella statica `SCENES` in `lib/progress.ts` — nome, intervallo `[p0,p1]`, capitolo, copy id, stem audio. È la traduzione diretta della tabella del Concept §3 (S01 1.5vh, S02 2vh, S03 3vh, … S12 2vh) normalizzata su 22,5.
- **Capitoli / deep-link**: la timeline-metro e gli URL `#capitolo` non teletrasportano: animano lo scroll verso il target (durata proporzionale alla distanza, max ~2.5s). La regola "il salto percorre il piano sequenza" diventa un vincolo del router interno.
- **Reduced-motion**: con `prefers-reduced-motion`, lo spacer collassa e il documento serve la versione still (render statici + copy completo). Nessun pin, nessuna animazione scroll-driven.

## 5. Il camera rig

- **Authoring in Blender**: due curve (`MS_CAM_path`, `MS_CAM_target`) più marker di scena e track del FOV, esportati come extras glTF. Il runtime le campiona come CatmullRom con parametrizzazione a lunghezza d'arco (velocità percepita costante, salvo easing per segmento dichiarati nei marker).
- **Doppio inseguimento**: `p` → target; la camera insegue con smorzamento critico (`smoothdamp`, tempo ~0.35s desktop, ~0.5s mobile). Scroll violento = la camera accelera ma non strappa mai (regola "mai movimenti robotici").
- **Steadicam**: rumore procedurale (simplex 2D a bassissima frequenza) su posizione e rotazione, ampiezza scalata sulla velocità: fermo = respiro impercettibile, in movimento = leggera vita da operatore. Disattivato in reduced-motion.
- **Eventi ancorati** (porta, finestra, lama, sezione parete): non sono "trigger" ma tracce `f(p)` definite negli extras dei marker — coerenti col principio 1.

## 6. Modello, stati e transizioni-firma

**Convenzioni Blender** (contratto tra 3D artist e runtime):
- Naming: `MS_<atto>_<gruppo>_<nome>` (es. `MS_A1_struttura_pilastro03`).
- Proprietà custom per mesh: `buildOrder` (int, ordine di costruzione S03), `matZone` (zona di materializzazione S04), `layer` (stratigrafia S08/S09), `hinge` (assi porta/finestra/ante).
- Il file contiene entrambi gli stati d'aspetto per zona: **maquette** (clay bianco + AO baked) e **reale** (PBR + lightmap baked). Un solo set di geometrie, due set di materiali.

**Le transizioni-firma come shader/uniform, tutte guidate da `p`:**
| Transizione | Implementazione |
|---|---|
| S02 linee CAD che si disegnano | Geometria di linee con `dashOffset`/estensione parametrica; quote come istanze tipografiche (SDF) |
| S03 costruzione | Per `buildOrder`: scala/estrusione da terra con overshoot minimo; ombre = AO baked della maquette |
| S04 lama di trasformazione | Piano in clip-space come uniform globale; i materiali zona mescolano maquette↔reale attraverso la lama (patch `onBeforeCompile`, un solo shader condiviso) |
| S08 spaccato parete | `clippingPlanes` locali + cap geometry autorata (gli strati etichettati sono mesh reali, non trucchi di shader) |
| S09 esploso stratigrafia | Offset per `layer` lungo la normale, curve di apertura/chiusura campionate da `p`; la serpentina è una mesh tubo con la camera che ne segue la spline a mezza distanza |
| S10-bis accensione | Lightmap "acceso" precotta, crossfade per zone in sequenza |
| S12 nastro→globo→logo | Morph della geometria linee verso la spline del nastro; il logo finale è DOM/SVG che subentra in registrazione ottica esatta (l'unico istante in cui DOM e canvas si scambiano il testimone, misurato a pixel) |

## 7. Performance e qualità adattiva

**Budget (vincolanti, verificati dal report di `tools/` a ogni export):**
- ≤ 100 draw call in ogni istante del viaggio; ≤ 350k triangoli residenti; ≤ 120 MB texture VRAM (KTX2); niente luci dinamiche (tutto baked), niente ombre real-time.
- Target: 60 fps su desktop medio, ≥ 40 fps stabili su mobile di fascia media (device di riferimento da fissare in M1).

**Quality manager** (`lib/quality.ts`): EMA del frame time → tre tier. Regola le sole manopole dichiarate: DPR (1.75 / 1.5 / 1.1), risoluzione env probe, densità del rumore steadicam, anti-aliasing (MSAA→FXAA). Mai cambi visibili a scatto: le manopole interpolano.

**Streaming**: coda a priorità — (1) linee CAD + maquette LOD1, (2) materiali/lightmap Atto II, (3) interni Atto III, (4) audio. La Hero è il loader (Concept §2.3.E): S01–S02 sono garantite entro il primo secondo; se lo scroll raggiunge un asset non pronto, la scena corrente "prende tempo" rallentando la progressione della successiva (mai spinner).

## 8. Layer documentale, accessibilità, SEO

- Ogni scena ha il suo blocco semantico nel documento (`<section aria-labelledby>`) con il copy completo; il canvas è `aria-hidden`. Lo stato del capitolo è sincronizzato via `aria-current` sulla timeline-metro, navigabile da tastiera (frecce = capitolo prec/succ).
- SSG: meta, OG image (still S05), schema.org `LocalBusiness` + `Service` per i tre pilastri.
- Fallback: no-WebGL o errore asset → versione still identica al percorso reduced-motion. Un solo fallback da mantenere.

## 9. Audio

Bus master (opt-in, stato persistito) → stem per ambiente con crossfade campionati da `p` (coerenza col principio 1: anche il suono è `f(p)`). Eventi puntuali (serratura, interruttori) come one-shot idempotenti con soglia di isteresi su `p` per evitare retrigger nello scroll avanti/indietro. Formati: opus + fallback aac; peso totale ≤ 3 MB, caricato per ultimo.

## 10. Verifica

- **Dev**: overlay stats (frame time, draw call, VRAM stimata) attivabile; scrub manuale di `p` da editor leva.
- **CI/pre-release**: Playwright — scroll-through completo headless (nessun errore, nessun frame > 100ms su baseline), test reversibilità (avanti-indietro su ogni confine di scena, confronto screenshot), Lighthouse ≥ 90 su Performance/SEO/A11y per il documento.
- **Test di accettazione del Concept §5** (continuità, ancora, pronome, servizio, fluidità): checklist manuale per scena, tracciata in `docs/`.

## 11. Milestone

| # | Deliverable | Contenuto |
|---|---|---|
| M0 | Scaffold | Repo Next+R3F, scroll system, quality manager, CI |
| M1 | **Prototipo di regia** | Camera path completo su modello placeholder grigio + le 3 transizioni-firma (lama S04, spaccato S08, esploso S09). È il momento "go/no-go" sulla sensazione di piano sequenza |
| M2 | Modello definitivo | Villa autorata in Blender secondo le convenzioni §6, pipeline asset completa |
| M3 | Viaggio completo | 13 scene integrate, copy reale, audio |
| M4 | S13 + documento | Sezioni Apple, portfolio, layer semantico, SEO |
| M5 | Polish | Perf su device matrix, accessibilità, test di accettazione |

Dopo M1 il prototipo va mostrato al cliente: è lì che si giudica la regia, quando cambiarla costa poco.
