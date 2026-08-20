# Product Photography Premium — Divani Velluto & Oro

Direzione artistica e prompt operativi per trasformare le foto di showroom
in packshot da catalogo luxury (stile VUG / Ponterne Sofá) e in b-roll video.

## 1. Il problema delle foto sorgente

Le foto originali sono scatti da showroom: soffitti con pannelli, lampadari,
vetrine sulla strada, moquette, statue dorate, estintori, altri divani in
secondo piano. Il prodotto c'è, ma il valore percepito si disperde su
venti oggetti diversi.

Nota tecnica: gli scatti iPhone arrivano con EXIF orientation 6. Vanno
raddrizzati e ripuliti dell'EXIF **prima** di darli in pasto al modello,
altrimenti il prodotto viene interpretato ruotato di 90°.

```python
from PIL import Image, ImageOps
im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
im.thumbnail((2400, 2400), Image.LANCZOS)
im.save(dst, "JPEG", quality=94)
```

## 2. I quattro prodotti

| Cod. | Prodotto | Finitura |
|---|---|---|
| P1 | Divano curvo capitonné + 2 poltrone barrel + tavolini nesting | Velluto grigio-tortora, profilo e base oro |
| P2 | Divano grigio con braccioli rollati capitonné | Velluto grigio chiaro, cordonatura e slitta oro |
| P3 | Chesterfield nero | Velluto nero, filo oro alla base, piedini oro |
| P4 | Chesterfield blu navy + poltrona | Velluto blu royal, filo oro, piedini oro |

## 3. Lo stile: bianco crema, non bianco clinico

Il fondo non è bianco puro. È un **cyclorama avorio caldo**, luminoso dietro
al prodotto e leggermente più sabbia agli angoli. Motivo: il bianco puro
appiattisce il velluto e spegne l'oro; il crema caldo li fa cantare e legge
come "showroom di lusso", non come "e-commerce di massa".

Il pavimento è micro-cemento matt nello stesso tono, con ombra di contatto
morbida e un accenno di riflesso sotto le parti dorate — è quello che dà
peso all'oggetto invece di farlo levitare.

## 4. Struttura del prompt

Cinque blocchi, sempre nello stesso ordine. Il primo è quello che conta.

**PRODUCT FIDELITY** — il blocco più importante e va messo per primo, con
`absolute priority`. Elencare esplicitamente: silhouette identica,
proporzioni identiche, capitonné con **lo stesso numero e la stessa
spaziatura dei bottoni**, colore e lucentezza del velluto identici,
cordonatura oro e base identiche. Chiudere con `Do not restyle, do not
redesign`. Senza questo il modello "migliora" il divano e consegna un
prodotto che non esiste in magazzino.

**SET** — cyclorama avorio caldo infinito, gradiente verso sabbia,
pavimento micro-cemento crema, ombra di contatto, riflesso sotto l'oro.

**LIGHT** — softbox grande a 45° in alto a sinistra, pannello di rimbalzo
bianco a destra, **rim light radente da dietro**. Il rim light è ciò che
salva il nero (altrimenti diventa una macchia piatta) e ciò che fa brillare
l'oro come una linea continua.

**CAMERA** — 85mm f/8, tre quarti frontale, altezza occhi, orizzonte in
bolla, zero distorsione. Per l'hero verticale: leggermente dal basso, che
rende l'oggetto più imponente.

**EXCLUDE** — elencare per nome quello che c'è nella foto sorgente e non
deve sopravvivere: soffitto, pannelli, lampadari, vetrine, moquette,
pavimento in cotto, statue dorate, estintore, cellophane, altri divani,
persone, testo, loghi, watermark.

## 5. Set di scatti per prodotto

- **Hero 4:5** — tre quarti frontale. È lo scatto da catalogo e da feed.
- **Frontale 16:9** — prospetto simmetrico. Serve per la scheda tecnica.
- **Macro 1:1** — capitonné + cordonatura oro, 100mm f/2.8. Vende il materiale.
- **Verticale 9:16** — prodotto nel terzo inferiore, due terzi di crema
  vuoto in alto lasciati **deliberatamente liberi per l'headline**.
- **Composizione 16:9** — set completo (divano + poltrone + tavolini).

## 6. Video — Seedance 2.5

`mode: omni_reference`, `start_image` = il job_id del packshot già generato
(così il video parte da un frame già validato invece che dalla foto sporca).
1080p, 8 secondi, `generate_audio: false` per avere b-roll pulito da montare.

Il prompt video descrive **un solo movimento continuo**: orbita lenta su
carrello, oppure laterale su slider con push-in. Vanno ripetuti nel prompt
tre vincoli, altrimenti il modello inventa:

- il divano non si muove, non si deforma, non cambia in nessun frame;
- niente stacchi, niente cambio scena;
- la scena resta chiara e avorio, mai scura né moody.

Quest'ultimo serve davvero: alla prima passata il verticale ha ricevuto la
raccomandazione del preset "IN THE DARK", esattamente l'opposto della
direzione. Si rifiuta passando `declined_preset_id` e si esplicita
`never dark, never moody` nel prompt.

## 7. Costi (piano Ultra, ago 2026)

- Immagine Nano Banana Pro 2K: **2 crediti**
- Video Seedance 2.5, 8s 1080p: **72 crediti**

Un set completo da 12 immagini + 5 clip: circa 385 crediti.
