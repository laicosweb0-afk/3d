# Prototipo vanilla — Mondial Service

Prova funzionante dell'effetto **scroll-scrubbing video** (Lenis + GSAP ScrollTrigger)
con ossatura completa della pagina: hero con porta, Capitolo 1 scrubbato, servizi,
portfolio, recensioni, contatti WhatsApp.

**Non è il sito finale.** Il progetto definitivo sarà costruito in Next.js (architettura
Ibrida) secondo `docs/ARCHITETTURA.md`. Questo prototipo resta come:

- riferimento visivo (palette, tipografia, ritmo dello scroll)
- prova tecnica dello scrubbing (mp4 H.264 all-keyframe + fallback WebM)
- sorgente dei placeholder video generati

## Per vederlo in locale

```bash
cd prototype
python3 -m http.server 8123
# poi apri http://localhost:8123
```

## Dove vanno i file reali (Higgsfield)

- `assets/videos/intro-porta.mp4` — video porta 3D che si apre (hero)
- `assets/videos/cap1-grezzo-finito.mp4` — stanza da grezzo a finito (Capitolo 1)
- Requisiti scrubbing: H.264, tutti keyframe (`ffmpeg -g 1`), 1280×720, 4–8 s,
  primo frame = grezzo, ultimo frame = finito. Della stessa clip va generata anche
  la versione `.webm` (VP9, `-g 1`) per i browser senza H.264.
