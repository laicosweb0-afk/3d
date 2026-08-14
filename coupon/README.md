# Coupon Regalo 17 x 10 — WO•MAN Parfume Store

Ricomposizione del coupon dal formato originale **21 x 9 cm** al formato
richiesto **17 x 10 cm**, fronte e retro.

## File da mandare in stampa

| File | Pagina | Quando usarlo |
| --- | --- | --- |
| `stampa/COUPON_REGALO_17x10.pdf` | 170,000 x 100,000 mm | formato netto, senza abbondanza |
| `stampa/COUPON_REGALO_17x10_abbondanza3mm.pdf` | 176,076 x 106,076 mm, TrimBox 170 x 100 mm | **è quello da dare alla tipografia** se il taglio è a ghigliottina o fustella |

Pagina 1 = fronte (nero), pagina 2 = retro (carta). Anteprime in
`stampa/anteprima-fronte.jpg` e `stampa/anteprima-retro.jpg`.

Il fondo arriva al taglio su tutti e quattro i lati (le fasce rosa, il nero, le
orecchie): senza abbondanza basta mezzo millimetro di scarto della taglierina
per lasciare un filo bianco sul bordo. Il file con abbondanza ha 3,038 mm di
disegno in più per lato e il TrimBox che dice alla macchina dove tagliare.

## Misure verificate

Controllate rileggendo i PDF con una libreria diversa da quella che li ha
scritti (`pikepdf`), su entrambe le pagine:

- MediaBox del netto: **170,0000 x 100,0000 mm** (481,8898 x 283,4646 pt)
- TrimBox del file con abbondanza: **170,0000 x 100,0000 mm**, margini 3,0380 mm sui quattro lati
- matrice di posizionamento uguale al box, con scarto 0,0000: l'immagine riempie la pagina, non è centrata dentro a un vuoto
- nessuna rotazione di pagina (`/Rotate` assente), nessun `/UserUnit`
- QR riletto dal PDF finale: `https://www.womanparfume.com`

I pixel della tela stanno in rapporto 17:10 esatto (2686 x 1580 a 401 dpi):
serve a evitare che il PDF centri l'immagine lasciando micron di vuoto ai lati.

## Note per la tipografia

- **Colore**: i file sono in RGB, come l'originale. Se la stampa richiede CMYK,
  la conversione va fatta con il profilo della macchina: senza profilo il rosa
  si sposta. Non è stata fatta qui per non indovinare.
- **Risoluzione**: 401 dpi. Nessun elemento è stato ingrandito oltre
  l'originale: il fronte nasce a 464 dpi e viene ridotto, il retro nasce a
  766 dpi e resta a grandezza naturale.
- **Rosa diverso fra i due lati**: nel file originale il fronte ha `#C43D6E` e
  il retro `#D55082`, probabilmente perché il retro era un mockup renderizzato.
  I file rispettano l'originale. Per uniformarli al rosa del fronte:
  `python3 coupon/build.py --unify-pink`.
- **Cornice porta-fiala**: lasciata a grandezza naturale (1:1), fustelle
  comprese. Rimpicciolirla avrebbe cambiato la presa sulla fiala.

## Come è stata fatta

Le due pagine dell'originale sono immagini raster appiattite: niente testo
vettoriale, niente livelli. Il rapporto passa da 2,33 a 1,70, quindi
ridimensionare avrebbe deformato e tagliare avrebbe perso l'orologio o il
pacco. Gli elementi sono stati ritagliati alla risoluzione originale e
riposizionati; il retro è stato prima estratto dal mockup su cui era appoggiato.

Le giunzioni spariscono perché di ogni ritaglio non si incolla il pixel ma lo
scarto rispetto al fondo che aveva nell'originale: dove c'era solo fondo lo
scarto è zero, e il rettangolo del ritaglio non si vede. Le ombre portate degli
oggetti sopravvivono. Il dettaglio è nei commenti di `build.py`.

## Rigenerare

```bash
pip install opencv-python-headless numpy pillow pypdf img2pdf pikepdf
python3 coupon/build.py
```

Al primo giro estrae le pagine dal PDF in `source/` e le tiene in `assets/`
(non versionata). Opzioni: `--dpi`, `--bleed`, `--unify-pink`.

Il formato si cambia da `W_MM` / `H_MM` in testa allo script: le posizioni
centrate e quelle ancorate a destra seguono da sole, quelle ancorate a sinistra
vanno ricontrollate a occhio sull'anteprima.
