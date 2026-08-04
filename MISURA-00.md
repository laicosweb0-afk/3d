# Task 00 — Misura

La linea di partenza. Nessuna riga di sito è stata modificata: qui si misura
soltanto. Il budget che nasce da questi numeri è la Task 01.

Condizioni: build reale servito con supporto Range, CPU rallentata 4×,
telefono 390×844 @3x e tablet 820×1180 @2x. Rete 4 Mbit con 40 ms di latenza
per l'ingresso.

---

## 1. Il difetto principale: il filmato va a 4 fotogrammi al secondo

**Ogni misura di fluidità che avevo fatto diceva 60 fps.** Erano tutte vere e
tutte inutili, perché misuravano la pagina — e la pagina non è mai stata il
problema. Quello che si guarda è il filmato, e il filmato ha un suo ritmo che
nessuna misura di fotogrammi della pagina può vedere.

```
                    pagina        FILMATO
telefono            61 fps        12 fps      un'immagine nuova ogni 67 ms
tablet              61 fps        15 fps      un'immagine nuova ogni 50 ms
tablet (cpu ×6)     61 fps        13 fps      un'immagine nuova ogni 67 ms
```

E non è un difetto del codice. È aritmetica:

```
il filmato dura 12,04 s a 24 fps  →  289 immagini diverse in tutto
la sua corsa di scorrimento       →  13.082 px  (15,5 schermate)
                                     ─────────────────────────────
                                     45 px di scroll per ogni immagine diversa
```

Quindi la fluidità del filmato **dipende da quanto veloce si scorre**:

| velocità di scorrimento | il film avanza di | immagini diverse al secondo | |
|---|---|---|---|
| 171 px/s | 0,16 s | **4** | scatti evidenti |
| 300 px/s | 0,28 s | **7** | scatti evidenti |
| 508 px/s | 0,47 s | **12** | scatti |
| 844 px/s | 0,78 s | **19** | accettabile |
| **1.087 px/s** | 1,00 s | **24** | fluido |

**Per vedere il filmato fluido bisogna scorrere a più di mille pixel al
secondo**, cioè con una scrollata decisa. Ma 170–500 px/s è esattamente la
velocità con cui si scorre **quando si sta guardando qualcosa con
attenzione.**

> Il difetto ha una crudeltà precisa: **più lentamente si guarda, peggio si
> vede.** Chi scorre veloce non se ne accorge. Chi si ferma ad ammirare
> ottiene una diapositiva.

Questo spiega tutto ciò che sembrava incoerente: perché succede su tre
dispositivi diversi (è aritmetica, non hardware), perché ogni misura di fps
diceva che andava tutto bene, e perché dà più fastidio proprio nei momenti
buoni.

### Non è il decodificatore

Verificato separando le cause:

```
riproduzione normale       25 fps   ← il tetto della sorgente
ricerca a ogni fotogramma  59 fps   ← il decodificatore regge benissimo
ricerca ogni 2 fotogrammi  31 fps
```

Il decodificatore non è mai stato il collo di bottiglia. Costo di un
singolo spostamento nel filmato: 9–22 ms, e zero fotogrammi persi in ogni
prova di scorrimento.

### Cosa lo risolve

| | soglia per 24 fps | guadagno | costo |
|---|---|---|---|
| oggi | 1.087 px/s | — | — |
| filmato compresso a 8 schermate | **561 px/s** | ×1,9 | zero crediti |
| + interpolazione a 48 fps | **280 px/s** | ×3,9 | zero crediti |

**Nessuna delle due costa un credito**, e la prima è la stessa compressione
che l'architettura chiedeva per ragioni narrative: le due argomentazioni
arrivano allo stesso numero da due strade diverse.

Interpolazione verificata: `ffmpeg` con `minterpolate` in modalità
compensazione di movimento, 12,5 s di elaborazione ogni 2 s di filmato
(≈75 s per l'intero film). I fotogrammi inventati sono stati ispezionati —
nessun trascinamento sulla mozzarella, nessun alone sulle goccioline, che
erano il caso peggiore.

---

## 2. L'ingresso: 2,8 secondi di pagina bianca

```
HTML servito           104 ms
prima pittura        2.812 ms   ← la pagina è bianca fino a qui
DOM interattivo      2.963 ms
load completo        2.969 ms
spostamenti layout   0,0042     ✔ ottimo (soglia 0,1)
```

Il colpevole è uno solo e si legge nella lista delle risorse:

```
 302 kB    78 → 2.531 ms   link     f77ddc435a033462.css   ← i caratteri
 170 kB    79 → 2.179 ms   script   255-....js
 169 kB    79 → 2.174 ms   script   4bd1b696-....js
  85 kB    77 → 1.095 ms   link     logo-marchio.png
  42 kB    78 →   620 ms   link     logo-wordmark-scuro.png
```

**I caratteri sono incorporati in base64 dentro un CSS da 302 kB che blocca
il rendering.** Finché non arriva, non si dipinge niente. E metà di quel peso
è sprecato:

```
Fraunces 400   65,7 kB
Fraunces 500   65,7 kB   ← byte per byte identico al 400
Inter    400   47,1 kB
Inter    500   47,1 kB   ← byte per byte identico al 400
```

Lo stesso file variabile incorporato due volte per dichiarare due pesi che
contiene già: **113 kB buttati**. Per confronto, tutto il JavaScript di
questa pagina pesa 18 kB — **i caratteri pesano sedici volte il codice.**

Subito dopo, il thread principale resta bloccato:

```
a 2.187 ms   bloccato 195 ms
a 2.549 ms   bloccato 230 ms
a 2.829 ms   bloccato  64 ms
             ─────────────────
             339 ms totali oltre la soglia   (buono: sotto 200 ms)
```

Chi tocca lo schermo in quel momento — cioè appena la pagina compare — trova
un sito che non risponde, e poi recupera di scatto. **È il secondo scatto
che si sente, ed è diverso dal primo.**

Nota: `logo-marchio.png` (85 kB) e `logo-wordmark-scuro.png` (42 kB) sono
precaricati e nessuno dei due serve alla prima schermata — il primo è nella
navigazione che compare dopo il filmato, il secondo è in fondo alla pagina.

---

## 3. Cosa invece sta bene

Perché il budget non deve stringere dove non serve.

```
scorrimento continuo, eventi di input veri
  telefono / filmato      60 fps   0% oltre 24 ms   0 fotogrammi video persi
  telefono / documento    60 fps   0% oltre 24 ms   0 fotogrammi video persi
  tablet   / filmato      60 fps   0% oltre 24 ms   0 fotogrammi video persi
  tablet   / documento    60 fps   0% oltre 24 ms   0 fotogrammi video persi

strappi (il pollice che tira forte)
  400 px    60 fps   peggiore 23 ms   0 persi
  900 px    60 fps   peggiore 25 ms   0 persi
 1800 px    60 fps   peggiore 25 ms   0 persi
```

- **Il JavaScript della pagina pesa 18 kB.** Non è il problema e non va toccato.
- **Lo spostamento di layout è 0,0042**, venticinque volte sotto la soglia.
- **Zero fotogrammi video persi** in ogni condizione.

---

## 4. La nitidezza

Il filmato è nato a 1280×720 (`resolution: "720p"`, `mode: "std"`), quindi la
copia nel repository è già la risoluzione originale: **non c'è nessun file
migliore da recuperare.** L'ingrandimento in pagina:

```
telefono            ×3,73
tablet verticale    ×3,48
tablet orizzontale  ×2,41
desktop             ×2,65
```

Il ×3,73 sul telefono non dipende dal file ma dall'inquadratura: un 16:9
ritagliato dentro uno schermo 9:19,5 mostra il 26% della larghezza,
ingrandito fino a riempire l'altezza. **Ricomporre l'inquadratura sul
telefono costa zero crediti e vale più di qualunque upscale a pagamento.**

---

## 5. Riepilogo per la Task 01

| | misurato | stato |
|---|---|---|
| fotogrammi diversi del filmato al secondo | 4–12 | ⛔ il difetto principale |
| prima pittura | 2.812 ms | ⛔ |
| thread bloccato all'ingresso | 339 ms | ⛔ |
| peso dei caratteri | 302 kB, di cui 113 duplicati | ⛔ |
| ingrandimento del filmato | fino a ×3,73 | ⚠️ |
| fotogrammi della pagina | 60 fps ovunque | ✔ |
| fotogrammi video persi | 0 | ✔ |
| spostamento di layout | 0,0042 | ✔ |
| peso del JavaScript | 18 kB | ✔ |

Non misurabile in questo contenitore, da verificare sui dispositivi del
cliente: **la GPU** (qui il browser disegna via software) e **il sito
pubblicato** (il proxy blocca `github.io`).
