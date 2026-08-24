# Portfolio istantaneo — @ossa.it

Pagina one-page da mandare come link in un DM: un solo file HTML con CSS e JS
dentro, più la cartella `assets/`. Niente framework, niente build.

Sta in `public/portfolio/`, quindi l'export di Next la copia così com'è: viene pubblicata
insieme al resto del sito, all'indirizzo

    https://laicosweb0-afk.github.io/3d/portfolio/

ed è anche trascinabile su qualunque altro hosting statico — basta copiare
`public/portfolio/`. `<meta name="robots" content="noindex">`: si raggiunge solo
con il link, non da Google.

## Come si cambia una cosa

| Cosa | Dove |
|---|---|
| I link dei due siti immersivi | le due righe `var LINK_MONDIAL` / `var LINK_BUFALA` in cima al `<body>` |
| Testi, titoli, etichette | direttamente nell'HTML: le schede sono cinque blocchi `<article class="card">` |
| Anteprima del link nel DM | `assets/og.jpg` (1200×630) e i `<meta property="og:…">` |
| Icona della scheda del browser | `favicon.svg` |

I due link non sono scritti a mano da nessun'altra parte: il bottone «Apri il
sito», la barra degli indirizzi disegnata dentro la scheda e il pulsante del
visualizzatore leggono tutti quelle due variabili. Se una torna a essere un
segnaposto (`INCOLLA…`), la scheda resta al suo posto e dice «Link in arrivo»
invece di portare a una pagina rotta.

## I video

| File | Cos'è | Audio |
|---|---|---|
| `hero.mp4` | coniglio 3D con l'orologio da taschino, fondo della testata | no |
| `01.mp4` | Yacht Club Monte Carlo | no |
| `02.mp4` | serie «Aurea» | **sì** |
| `03.mp4` | corto animato polpo/scontrini | **sì** |
| `04.mp4` | scroll del sito Mondial Service, ripreso dal sito vero | no |
| `05.mp4` | scroll del sito Quelli della Bufala, ripreso dal sito vero | no |

Chi ha l'audio lo dichiara nel markup con `data-audio="1"`, e solo lì il tasto
🔊 del visualizzatore si accende: rilevare da JavaScript se un file ha una
traccia audio è un terno al lotto che cambia da browser a browser, dichiararlo
no. La testata resta senza audio di proposito — è un fondo decorativo, non ha
comandi per accenderlo, ed è l'unico video che si scarica sempre.

`04` e `05` non sono montati a mano: si rigenerano dal sito pubblicato con lo
script `tools/capture-scroll.mjs` (vedi `DEPLOY.md`). Gli altri sono i file del
titolare: per sostituirne uno basta mantenere il nome — e, se il nuovo file ha
l'audio, aggiungere `data-audio="1"` al suo `<video>`.

Regole da non violare quando si sostituisce un video: **H.264 `yuv420p` con
`faststart`, mai HEVC** (i `.mov` dell'iPhone vanno transcodificati, altrimenti
su metà dei browser non si vedono), e sempre `muted loop playsinline
preload="none"` con la sorgente in `data-src` — l'autoplay funziona solo muto,
e il `data-src` è ciò che evita di scaricare sei video a chi apre la pagina.
