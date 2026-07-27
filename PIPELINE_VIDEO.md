# DAL 3D AL REALE — la pipeline di generazione

Come il modello 3D diventa il girato reale del sito. Tutto quello che sta qui è
stato **verificato sul campo**, non dedotto: modelli, costi e limiti vengono da
chiamate vere fatte il 27/07/2026.

## Il principio

Il visitatore **non vede mai il 3D**. Apre il sito, scorre, e vede la casa vera
che si costruisce. Il modello 3D è l'officina: decide le inquadrature, produce i
fotogrammi di riferimento, detta il ritmo — poi esce di scena.

## Perché il piano sequenza va spezzato

I modelli generano al massimo 15 secondi per clip. Il viaggio dura ~60 secondi,
quindi servono dodici clip. Se ognuna nascesse per conto suo si vedrebbero gli
stacchi.

La soluzione è che **la fine di un ciak e l'inizio del successivo siano lo stesso
identico file**. Non due immagini simili: lo stesso file. Così le clip si saldano
e il piano sequenza sopravvive.

## I tre passaggi

### 1. Il fotogramma di confine, dal 3D

`node tools/shot-frames.mjs` renderizza i tredici fotogrammi di giunzione a
1920x1080 in `previz/giunzioni/`. Sono render grigi: definiscono **geometria,
angolazione e campo**, non l'aspetto.

### 2. Il fotogramma diventa fotografia

`nano_banana_pro`, 2k, 16:9 — **2 credits l'una**. Il render grigio entra come
`medias[{role:'image'}]` e il prompt impone di conservare camera, prospettiva e
proporzioni, cambiando solo la materia.

Verificato: la casa resta la nostra — volume, sbalzo del tetto, posizione di
porta e finestre. La camera tende ad abbassarsi rispetto al 3D; va chiesto
esplicitamente il punto di vista alto ("elevated three-quarter viewpoint, roof
plane broadly visible").

Il contesto va detto, altrimenti esce un cantiere generico da qualunque parte del
mondo: campagna del nord Italia, pioppi, recinzione arancione, mattoni su
pallet.

### 3. Le due fotografie diventano video

`seedance_2_0` (o `_mini` per le prove) con `start_image` e `end_image`. Il
modello genera la trasformazione fra i due stati: la casa che si costruisce.

Se il prompt somiglia a un preset di Higgsfield, il server propone il preset
invece di generare. Va rifiutato passando `declined_preset_id` con l'id
proposto, altrimenti si genera una cosa diversa da quella chiesta.

## I costi, misurati (8 s, 720p, senza audio)

| configurazione | credits | al secondo |
| --- | --- | --- |
| `seedance_2_0` std 1080p | 72 | 9,0 |
| `seedance_2_0` std 720p | 36 | 4,5 |
| `seedance_2_0` fast 720p | 28 | 3,5 |
| `seedance_2_0_mini` 720p | 20 | 2,5 |
| `nano_banana_pro` 2k (immagine) | 2 | — |

Il viaggio intero, dodici clip per ~61 secondi: **~275 credits** a `std 720p`.

## Perché 720p e non 1080p

I due video già nel sito (`soggiorno-transizione`, `bagno-transizione`) sono
**1280x720**, misurati. 720p non è un risparmio: è la specifica su cui il
dispositivo è già tarato. Il video sta sotto una dissolvenza incrociata col
resto, non a schermo pieno.

## La rete: cosa passa e cosa no

L'ambiente blocca i domini Higgsfield in uscita. Conseguenze pratiche:

| operazione | stato |
| --- | --- |
| chiamate MCP (generare, prezzare) | funzionano — passano da claude.ai |
| caricare immagini a Higgsfield | **risolto**, vedi sotto |
| scaricare i risultati | **bloccato** — `*.cloudfront.net` non raggiungibile |

**Il caricamento è risolto senza aggirare niente.** Il repo è pubblico, quindi i
fotogrammi hanno gia un URL raggiungibile. `media_import_url` fa scaricare il
file **ai server di Higgsfield**:

    https://raw.githubusercontent.com/laicosweb0-afk/3d/<branch>/previz/giunzioni/<file>.jpg

Quindi: renderizzare, committare, pushare, importare per URL.

**Lo scaricamento no.** I risultati escono da `d8j0ntlcm91z4.cloudfront.net` e da
qui non si raggiunge. Finché la policy di rete dell'ambiente non consente quei
domini, i file generati vanno presi a mano dalla libreria Higgsfield.

Conseguenza da non sottovalutare: **chi genera non può vedere cosa ha generato**,
quindi non può correggere il prompt da solo. Ogni giro ha bisogno di occhi umani.
Sbloccare quei domini è la singola cosa che fa piu differenza sulla velocita del
lavoro.

## Difetti noti del servizio

- Chiedere piu immagini in una volta (`count: 2`) puo fallire con «ran out of
  credits» **anche con oltre mille credits disponibili**. Il saldo non viene
  intaccato per le richieste rifiutate. Rimedio: una alla volta.
