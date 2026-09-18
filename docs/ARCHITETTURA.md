# Mondial Service — Architettura Ibrida
### Design System · Information Architecture · UX · Struttura tecnica · Roadmap

> Stato: **in attesa di approvazione**. Nessuna implementazione Next.js parte prima dell'ok.
> Fonte di verità: briefing PDF + riferimenti OAKHAUS / PolidoriDev. Il documento verrà
> aggiornato a ogni nuovo riferimento caricato (immagini, Figma, link).

---

## 1. Analisi dei riferimenti

Dal briefing e dai riferimenti dichiarati (OAKHAUS, PolidoriDev) estraggo questo
linguaggio visivo:

| Dimensione | Estrazione |
|---|---|
| Atmosfera | Chiaro architettonico, materico, caldo. Mai dark, mai "tech". |
| Composizione | Grandi campi vuoti, contenuto ancorato ai bordi, asimmetria controllata |
| Spaziatura | Generosa: le sezioni respirano (8–10 rem verticali), il vuoto è parte del design |
| Luce | Calda, laterale, da cantiere→casa: la luce è la metafora del "finito" |
| Colore | Fondo porcellana/beige, UN solo accento ambra/oro. Niente palette multicolore |
| Tipografia | Serif display di carattere per i titoli, sans neutra per il corpo |
| Motion | Lenta, legata allo scroll, mai decorativa: ogni animazione racconta l'avanzamento del cantiere |
| Interazione | Scroll = tempo. L'utente "costruisce" la casa scrollando |

**Principio guida:** *lo scroll è il cantiere*. Tutta l'esperienza è la trasformazione
grezzo → finito; ogni scelta (colore, luce, motion) deve servire questa narrazione.

---

## 2. Design System

### 2.1 Colore (design tokens)

| Token | Valore | Uso |
|---|---|---|
| `--bg` | `#F4EFE7` | Fondo porcellana calda |
| `--bg-deep` | `#ECE5D8` | Sezioni alternate |
| `--ink` | `#2E2A24` | Testo primario (bruno, mai nero puro) |
| `--ink-soft` | `#6D655A` | Testo secondario |
| `--accent` | `#B98A3A` | Ambra/oro — unico accento |
| `--accent-deep` | `#9A7028` | Accent su hover / testo piccolo |
| `--line` | `#D9D0C0` | Hairline, bordi |

Regola: l'accento compare solo dove guida l'occhio (CTA, kicker, filo attivo).
Mai due accenti nella stessa vista.

### 2.2 Tipografia

| Ruolo | Font | Pesi | Scala |
|---|---|---|---|
| Display / titoli | **Cormorant Garamond** (self-hosted, GDPR-safe) | 400/500/600 + italic | `clamp(2.4rem, 5.5vw, 3.8rem)` sezioni · `clamp(2.8rem, 8vw, 5.6rem)` hero |
| Corpo / UI | **Inter** (self-hosted) | 300/400/500/600 | 1rem corpo · 0.78rem nav (uppercase, ls 0.14em) · 0.72rem kicker (ls 0.32em) |

Pattern ricorrenti: *kicker* con lineetta ambra sopra ogni titolo; parola chiave del
titolo in corsivo ambra (`<em>`).

### 2.3 Spaziatura, forme, elevazione

- Scala spazi: 0.5 / 1 / 2 / 4 / 8 rem; padding sezione `8rem` vert, `clamp(1.5rem, 7vw, 6rem)` orizz.
- Radius: `6px` card e media, `999px` pill (bottoni, CTA). Mai radius intermedi misti.
- Ombre: una sola, morbida e calda (`0 24px 48px -24px rgba(80,65,40,.28)`), solo su hover.

### 2.4 Motion (token di animazione)

| Token | Valore | Uso |
|---|---|---|
| `ease-premium` | `cubic-bezier(0.22, 1, 0.36, 1)` | Tutte le micro-interazioni |
| `dur-micro` | 0.35–0.5 s | Hover, underline |
| `dur-reveal` | 0.8–1 s | Comparse su scroll |
| `scrub-smoothing` | lerp 0.12 | Inseguimento video/scroll |
| Lenis | duration 1.15, easing exp-out | Smooth scroll globale |

Regole: niente animazioni autonome in loop (salvo hint di scroll); tutto è guidato da
scroll o da intento dell'utente; `prefers-reduced-motion` → esperienza statica completa.

### 2.5 Componenti (libreria riusabile)

`Button` (primary/ghost) · `Kicker` · `SectionHeading` · `NavBar` (glass, burger mobile) ·
`ChapterScrub` (sezione video-scrubbata riusabile: video, captions con `at`, progress bar) ·
`ServiceCard` · `PortfolioGrid` + `PortfolioItem` · `ReviewCard` · `WhatsAppForm` ·
`Footer` · `Hero3D` (porta R3F con fallback video).

---

## 3. Information Architecture

Una pagina, un arco narrativo. Ordine e funzione di ogni sezione:

1. **Hero / Intro** — la porta si apre: soglia d'ingresso all'esperienza. CTA soft "Scopri come lavoriamo" + "Salta intro".
2. **Cap. 1 — Spazi grezzi** — empatia: "ogni casa parte da uno spazio vuoto".
3. **Cap. 2 — I lavori** (bagni, interni) — prova di competenza, ambienti che si completano.
4. **Cap. 3 — Dettagli / Impianti** — fiducia tecnica (impianti, fotovoltaico), tono portfolio.
5. **Cap. 4 — Consegna** — pay-off emotivo: luce calda, chiavi in mano.
6. **Servizi** — sintesi commerciale in 3 card.
7. **Portfolio** — prova sociale visiva.
8. **Recensioni** — prova sociale verbale.
9. **Contatti** — conversione: form → WhatsApp precompilato, tel, zona Bologna. CTA "Prenota un sopralluogo".

Navigazione: menu fisso con ancore; la CTA "Prenota un sopralluogo" è sempre visibile.
Il visitatore non è mai a più di un click dalla conversione.

---

## 4. UI/UX Architecture

- **Scroll journey:** capitoli = sezioni alte 300vh (220vh mobile) con contenuto pinnato;
  il progresso ScrollTrigger governa `currentTime` del video (lerp in rAF).
- **Match cut:** ultimo frame di ogni capitolo ≈ primo frame del successivo
  (prospettiva/luce condivise) → un unico movimento continuo.
- **Testo sul video:** caption con kicker + headline + sub, dissolvenza sincronizzata
  (finestre `at`/`hold` sul progresso), alternate sinistra/destra.
- **3D dove crea valore (R3F):** solo la **porta dell'hero** — parallasse leggera al mouse,
  apertura legata a scroll/CTA, luci HDRI calde, materiali PBR legno/ottone.
  Lazy-load, `<Suspense>` con poster; su mobile low-end e reduced-motion → video/poster.
- **Performance mobile-first:** video 720p H.264 all-keyframe + WebM; preload via blob
  solo del capitolo corrente + prefetch del successivo; fonts self-hosted preloaded;
  R3F code-split; immagini `next/image` AVIF/WebP; target Lighthouse mobile ≥ 90.
- **Accessibilità:** `prefers-reduced-motion` → layout statico con poster "finito";
  contrasto AA su fondo porcellana; navigazione da tastiera; focus visibili.
- **SEO:** metadata App Router, Open Graph, JSON-LD `LocalBusiness` (Bologna),
  contenuto testuale reale nel DOM (non solo nei video), sitemap.

---

## 5. Struttura cartelle (Next.js App Router)

```
mondial-service/
├─ app/
│  ├─ layout.tsx              # font, metadata, JSON-LD, providers
│  ├─ page.tsx                # composizione delle sezioni
│  ├─ sitemap.ts / robots.ts
│  └─ globals.css             # design tokens (custom properties) + reset
├─ components/
│  ├─ ui/                     # Button, Kicker, SectionHeading, NavBar, Footer
│  ├─ sections/               # Hero, ChapterScrub, Services, Portfolio, Reviews, Contact
│  └─ canvas/                 # Hero3D (R3F): Door.tsx, Lights.tsx, fallback
├─ lib/
│  ├─ lenis.ts                # provider smooth scroll
│  ├─ gsap.ts                 # registrazione plugin, context helper
│  ├─ useVideoScrub.ts        # motore scrubbing riusabile (hook)
│  └─ device.ts               # reduced-motion, low-power, canPlayType
├─ public/
│  └─ assets/
│     ├─ videos/              # cap1-grezzo-finito.mp4/.webm, intro-porta.…
│     ├─ images/              # poster, portfolio
│     └─ fonts/               # woff2 self-hosted
├─ content/
│  └─ site.ts                 # TUTTI i testi in un file: il copy lo ritocchi qui
└─ docs/ARCHITETTURA.md
```

Principio: **i testi vivono in `content/site.ts`** (un solo file da modificare per il copy),
i componenti sono muti e riusabili → la stessa architettura si riusa per i prossimi clienti
cambiando tokens + content + assets.

---

## 6. Roadmap tecnica

| Fase | Contenuto | Criterio di accettazione |
|---|---|---|
| **F0** | Setup Next.js, tokens, font, Lenis+GSAP providers | Pagina vuota con smooth scroll, LH ≥ 95 |
| **F1** | `ChapterScrub` riusabile + Capitolo 1 | Scrub fluido desktop+mobile, reduced-motion ok |
| **F2** | Hero (video porta) + nav + skip intro | Intro < 3 s, contrasto AA |
| **F3** | Capitoli 2–4 con match cut | Transizioni continue tra capitoli |
| **F4** | Servizi, Portfolio, Recensioni, Contatti | Form WhatsApp funzionante |
| **F5** | `Hero3D` R3F (porta interattiva, lazy) | Nessun impatto su LCP; fallback video |
| **F6** | SEO, JSON-LD, OG, a11y pass, Lighthouse | LH mobile ≥ 90 su tutte le metriche |
| **F7** | Deploy Vercel + guida caricamento asset | URL pubblico |

Ogni fase si chiude con verifica visiva (screenshot desktop+mobile) prima della successiva.

---

## 7. Decisioni aperte (mi servono da te)

1. **Approvazione di questo documento** (o correzioni).
2. Numero WhatsApp/telefono reale e indirizzo.
3. Riferimenti visivi aggiuntivi (screenshot OAKHAUS/PolidoriDev o altro) per raffinare il design system.
4. Logo esistente? (ora: wordmark tipografico "Mondial *Service*").
5. Dominio/hosting: Vercel confermato?
