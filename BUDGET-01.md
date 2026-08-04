# Task 01 — Performance Budget

Le regole nascono dai numeri di [MISURA-00.md](./MISURA-00.md), non da
convenzioni. Da qui in poi valgono come legge di consegna (PROTOCOLLO §7):
**nessuna task consegna se sfonda una soglia**, e se una soglia si rivela
sbagliata sui dispositivi veri si cambia il documento — esplicitamente,
discutendolo — non la si scavalca.

Condizioni standard di misura, identiche per tutti: build col percorso di
base, servito con supporto Range; CPU rallentata 4×; telefono 390×844 @3x e
tablet 820×1180 @2x; rete 4 Mbit / 40 ms per le misure d'ingresso. Strumenti
in `tools/misura/`.

---

## 0. Le violazioni già note, e in quale task si pagano

Il budget non ripara niente: assegna. Regola di fase (PROTOCOLLO §3).

| violazione | misurata | si risolve in |
|---|---|---|
| filmato a 4–12 immagini/s alla velocità di lettura | Task 00 §1 | **Task 06** — compressione a 8 schermate + interpolazione 48 fps |
| pagina bianca 2,8 s (caratteri in base64 nel CSS) | Task 00 §2 | **Task 03** — insieme alla scelta dei caratteri, per non farlo due volte |
| 113 kB di font duplicati | Task 00 §2 | **Task 03** |
| preload di 127 kB di loghi fuori dalla prima schermata | Task 00 §2 | **Task 12** |
| ingrandimento del filmato ×3,73 su telefono | Task 00 §4 | **Task 06** — inquadratura, non upscale |

---

## 1. Il filmato — la regola delle immagini

La scoperta della Task 00: la fluidità percepita non è i fps della pagina,
è **quante immagini diverse del filmato si vedono al secondo**, e dipende
solo dal rapporto fra corsa di scorrimento e numero di fotogrammi.

> **B1 — Al massimo 12 px di scorrimento per ogni immagine diversa**
> (riferimento: telefono 390×844).

Oggi siamo a **45 px**. Con la corsa a 8 schermate e il filmato interpolato
a 48 fps si arriva a **11,7 px**: chi legge a 300 px/s vede ≥24 immagini al
secondo — fluido anche guardando piano, che è il caso che oggi punisce di
più.

- **B2** — Filmati interpolati a 48 fps, fotogramma chiave ogni 4 (`-g 4`),
  doppia codifica WebM/VP9 + MP4/H.264. Verificato: `minterpolate` con
  compensazione di movimento non produce artefatti su mozzarella e gocce.
- **B3** — Ingrandimento in pagina ≤ **×2,5** su ogni formato, ottenuto
  ricomponendo l'inquadratura (costo zero). Sotto ×2 solo rigenerando a
  1080p: è a pagamento, quindi è una decisione dell'utente, non del budget.
- **B4** — Zero fotogrammi video persi (`droppedVideoFrames`) in ogni prova.
- **B5** — Mai `autoplay`; poster sempre presente; lo sblocco iOS resta.

Verifica: `velocita.mjs`, `fotogrammi.mjs`, `dentro.mjs`.

## 2. L'ingresso

Oggi: prima pittura a 2.812 ms, thread bloccato 339 ms. Le soglie:

- **B6** — Prima pittura ≤ **1.000 ms** nelle condizioni standard.
- **B7** — CSS bloccante totale ≤ **80 kB** (oggi 382). **Mai font in
  base64 dentro un CSS**: è l'errore che ha comprato 2,8 s di bianco.
- **B8** — Caratteri: **≤ 2 famiglie**, file variabili (un file per
  famiglia, mai un file per peso), **≤ 130 kB totali**, `preload` dei file,
  `font-display: swap` con fallback a metrica compatibile.
- **B9** — Thread principale: nessun lavoro singolo > **120 ms**, somma dei
  blocchi oltre 50 ms ≤ **200 ms** (oggi 339).
- **B10** — `preload` solo per risorse della prima schermata.
- **B11** — Spostamento di layout ≤ **0,05** (oggi 0,0042 — non si regala
  il margine guadagnato).

Verifica: `ingresso.mjs`.

## 3. I pesi

- **B12** — JavaScript della route ≤ **30 kB** (oggi 18: il codice non è il
  problema e non deve diventarlo). Primo caricamento totale ≤ **130 kB**
  (oggi 115).
- **B13** — Ogni filmato ≤ **4,5 MB per formato**; poster ≤ 40 kB; ogni
  immagine ≤ 120 kB.
- **B14** — Prima schermata completa (senza filmati) ≤ **600 kB** trasferiti.

## 4. Il movimento — i limiti che entrano nel Design System

Questi numeri diventano il capitolo «movimento» della Task 03: ogni
componente nasce già dentro questi limiti, non viene ottimizzato dopo.

- **B15** — Si animano solo `transform` e `opacity`. Mai layout, mai
  `filter`, mai ombre.
- **B16** — **Un solo ciclo rAF per pagina.** Ogni animazione legata allo
  scroll vive lì dentro; le scritture DOM si saltano quando lo scarto è
  sotto soglia (già in `Journey.tsx`).
- **B17** — Elementi animati contemporaneamente ≤ **4**.
- **B18** — `will-change` su ≤ **6** elementi, solo gli strati permanenti
  del palco (oggi: esattamente 6).
- **B19** — `backdrop-filter` su **1 solo elemento** (la navigazione),
  blur ≤ **16 px**. Ombre: ≤ 2 strati per elemento, mai animate.
- **B20** — Listener di scroll/touch/wheel **passivi**; chi deve
  intercettare (la vetrina) decide prima di farlo, come già fa.
- **B21** — Durate: solo i gradini della scala del sistema (definita in
  Task 03): **tocco 85 ms · micro 350 ms · comparsa 500 ms · scena 1.000 ms
  · cicli ≥ 7 s**, due curve sole. Nessun valore fuori scala.
  *(Riformulata in Task 03: la prima versione dava intervalli, e un
  intervallo permette esattamente la deriva di valori che una scala vieta —
  il CSS ne aveva accumulati tredici.)*
- **B22** — La pagina regge **60 fps a CPU ×6** (oggi ✔ — resta condizione).

Verifica: `scorrimento.mjs` + ispezione del CSS.

## 5. Il degrado

- **B23** — `prefers-reduced-motion`: il sito si legge come documento
  statico, completo. Già vero; resta condizione di consegna.
- **B24** — Nessun rilevamento del dispositivo a runtime. Il budget
  garantisce il minimo a CPU ×6: se un effetto non ci sta, **l'effetto non
  si fa** — non si fa «solo sui dispositivi buoni».

## 6. La tabella di consegna

Da ricompilare a ogni task, con gli strumenti indicati.

| metrica | oggi | soglia | strumento |
|---|---|---|---|
| px di scorrimento per immagine del filmato | 45 | **≤ 12** | `velocita.mjs` |
| immagini del filmato al secondo @300 px/s | 7 | **≥ 24** | `velocita.mjs` |
| ingrandimento filmato (telefono) | ×3,73 | **≤ ×2,5** | `film.mjs` |
| prima pittura | 2.812 ms | **≤ 1.000 ms** | `ingresso.mjs` |
| CSS bloccante | 382 kB | **≤ 80 kB** | `ingresso.mjs` |
| caratteri totali | 302 kB | **≤ 130 kB** | `ingresso.mjs` |
| thread bloccato (somma) | 339 ms | **≤ 200 ms** | `ingresso.mjs` |
| spostamento di layout | 0,0042 | **≤ 0,05** | `ingresso.mjs` |
| JS della route | 18 kB | **≤ 30 kB** | build |
| fps pagina (CPU ×4, input veri) | 60 | **60** | `scorrimento.mjs` |
| fotogrammi video persi | 0 | **0** | `scorrimento.mjs` |
| contrasto testi | tutti ≥ 4,5 | **≥ 4,5 / 3** | `contrasto.mjs` |

Fuori misura in questo contenitore, da collaudare sui dispositivi veri alla
fine di ogni fase: la GPU (qui si disegna via software) e il sito pubblicato
(il proxy blocca `github.io`).
