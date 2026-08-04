# Task 03 — Il sistema

Il design system vive **nel codice** (`app/bufala/bufala.css`, variabili in
testa; caratteri in `app/bufala/layout.tsx`): questo documento è la mappa, non
una copia. Se mappa e codice divergono, fa fede il codice e la mappa va
corretta. I limiti tecnici di ogni capitolo vengono dal budget (BUDGET-01,
citato per sigla).

## 1. Colore

La tavolozza è quella del documento di direzione, §6 — sette colori, mai nero
puro, mai bianco puro:

`--verde-profondo #11281d` fondo scuro · `--verde-alto #183328` superfici ·
`--latte #f7f3ea` carta e testo su scuro · `--crema` / `--pietra` riserva del
marchio · `--carbone #20231f` · `--ottone #b89b5e` unico accento.

Tre gradini di testo sul chiaro (`--testo-titolo/-corpo/-nota`) e i veli di
latte (`--latte-70/-55/-45/-20`) sul scuro. **Il gradino minimo leggibile è
misurato, non stimato**: nota ≥ 4,5:1 (`contrasto.mjs`), e il 45% resta solo
dove è decorazione.

## 2. Tipografia

**Playfair Display** per i titoli (peso 500 — quello del provino approvato) e
**Hanken Grotesk** per il testo. Scelta chiusa il 04/08 su provino a nove
candidati; liberi anche per uso commerciale; serviti self-hosted da
`next/font` come file variabili (~73 kB totali, B8).

Ruoli, non taglie: display (`--font-display`) solo per h1/h2, l'insegna e i
nomi dei prodotti; tutto il resto è testo (`--font-testo`) a 400, con il 500
riservato a microtesti e bottoni. Il maiuscolo pieno appartiene **solo** ai
microtesti (0,62–0,76 rem, tracking 0,2 em): un titolo tutto maiuscolo è
fuori sistema.

## 3. Spazio

Tre gradini (`--spazio-respiro/-sezione/-blocco`), tutti `clamp()` sul
viewport, e la misura del testo `--misura-testo: 46ch`. Regola: **lo spazio si
sceglie fra i tre gradini, mai a mano** — se un posto sembra chiederne un
quarto, il problema è la composizione, non la scala.

## 4. Superfici

Raggi: 12 / 20 / 28 (`--raggio-piccolo/-medio/-grande`).

La ricetta di un oggetto appoggiato sul verde (la «scheda») ha tre strati e
nessuno si deve notare: filo di luce sul bordo alto (`inset`), interno appena
più chiaro del fondo, ombra larga e morbida sotto (`--alza-su-scuro`). Sul
fondo scuro la grana di carta al 2,5% in `overlay`. **Le ombre sono di due
strati al massimo e non si animano mai** (B19): al passaggio si muove
l'oggetto (−2 px), non la sua ombra.

## 5. Movimento

La scala — cinque durate, due curve, **nessun valore fuori dai gradini**:

| gradino | valore | uso |
|---|---|---|
| `--durata-tocco` | 85 ms | la pressione di un bottone |
| `--durata-micro` | 350 ms | colori al passaggio |
| `--durata-comparsa` | 500 ms | elementi che entrano o cambiano stato |
| `--durata-scena` | 1 s | le rivelazioni legate alla lettura |
| `--durata-ciclo` | 7 s | l'unica animazione continua: la guida |

`--curva-entrata` (0.16, 1, 0.3, 1) per tutto ciò che entra o cambia — il
movimento si vede finire, mai partire. `--curva-ciclo` per i cicli.
`--passo-coda` (90 ms) è lo scarto della cascata quando una sezione entra.

I vincoli duri restano nel budget e valgono qui come leggi di composizione:
solo `transform`/`opacity` (B15), un ciclo rAF (B16), ≤ 4 elementi animati
insieme (B17), `will-change` ≤ 6 (B18), un solo `backdrop-filter` ≤ 16 px
(B19), 60 fps fino a CPU ×6 (B22), documento statico completo con
`prefers-reduced-motion` (B23).

Prima di questa task il CSS conteneva **tredici durate diverse** fra 0,3 e
1,2 s: tutte ricondotte ai gradini. La deriva dei valori è il modo in cui un
sito perde il ritmo senza che nessuna singola decisione sia sbagliata.

## 6. Igiene dei token

Un token tecnico che nessuno usa si elimina (è già successo: `--noce-scuro`,
`--filo-su-chiaro`). I colori del marchio non ancora usati (`--crema`,
`--pietra`) restano perché sono la tavolozza ufficiale, e si riesaminano a
fine progetto. Verifica: l'estrattore in `tools/misura` (definiti vs usati).
