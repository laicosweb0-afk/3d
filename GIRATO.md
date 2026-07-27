# IL GIRATO — registro delle clip approvate

L'unica mappa tra il racconto e i file su Higgsfield. Gli identificativi dei
job vivono solo qui: persi questi, non si sa più quale versione era quella
buona e si rigenera a pagamento.

Le clip si scaricano dalla libreria Higgsfield (il container non raggiunge i
loro domini). Nomenclatura di destinazione: `public/assets/video/<nome>.mp4`
(+ `.webm` transcodificato, come i due video già nel repo).

## La catena degli interni (ricetta V2 — approvata il 27/07)

Il principio: ogni stanza parte DA CANTIERE e si costruisce mentre la camera
avanza senza mai fermarsi. Niente riferimento video 3D negli interni. Ogni
giunzione è lo stesso identico fotogramma tra una clip e la successiva.

| ordine | clip | job id | durata | stato |
| --- | --- | --- | --- | --- |
| 1 | soggiorno: porta sul cantiere → stanza che si costruisce → pavimento che si apre | `72c577d8-e13c-4607-a421-66a806e58e81` | 8 s | **approvata** |
| 2 | tuffo: giù nel buco → tra i tubi → bagno in cantiere | `59e4c52f-49f5-4ea5-917d-3978817f2ad2` | 4 s | **approvata** (PRIMA versione; la variante "emerge da sotto" `cd08e087` è SCARTATA — peggiore, non usare) |
| 3 | bagno: grezzo → si costruisce → fotografia reale | `3a8f5373-aa91-4ffe-8b45-5b4ab2d37c61` | 6 s | **approvata** |
| 4 | uscita: dal bagno reale → attraverso la finestra → fuori lungo il fianco, e basta (niente rientro, niente giro) | `5a7576ae-288f-4d0f-b1a6-9c9ede467cfb` | 4 s | in verifica |

## I fotogrammi di giunzione della catena

| fotogramma | job id | usato come |
| --- | --- | --- |
| porta aperta sul cantiere | `65890ee2-b525-4c35-9eba-877a0b09426f` | inizio soggiorno |
| soggiorno finito col pavimento aperto (foto reale editata) | `e0d48c0c-746d-43a5-8dfa-b3a3486c0f2f` | fine soggiorno = inizio tuffo |
| bagno al grezzo | `bfa1149d-20bb-4f3b-9854-2130b652697e` | fine tuffo = inizio bagno |
| foto reale del bagno | media `c1a2a6b3-f9fd-4187-a0cb-576796a6c92c` | fine bagno = inizio uscita |
| esterno sul fianco, finestrella aperta | `8851c871-8fc2-4e3e-89ed-0f99bc5e093d` | fine uscita → fondale su cui scorrono le sezioni |

## Dopo l'uscita: solo codice

L'ultimo fotogramma dell'uscita resta fermo come fondale e le sezioni del sito
scorrono sopra, continuando lo stesso gesto di scroll. Nessuna dissolvenza,
nessun bianco, nessun logo: la transizione l'ha già fatta la camera passando
dalla finestra. Il vecchio congedo (s12, whiteout) decade.

## L'Atto I (esterni — generati con la ricetta V1, approvati a inizio giornata)

Usavano il riferimento video 3D, che sugli ESTERNI non fa danno. Approvati dal
committente prima del cambio di direzione; da riverificare contro la V5 solo
se si rifà l'apertura.

| clip | job id | durata |
| --- | --- | --- |
| s01 terreno → tracciamento | `1550b466-e004-45c1-8e49-88cc8e6810ca` | 4 s |
| s02 tracciamento → platea | `98f26439-e931-4e40-9523-3360d4b69a89` | 5 s |
| s03 platea → guscio grezzo | `cb8a197b-49c6-4da5-a7d6-e8ba95877673` | 8 s |
| s04 guscio → materiali finiti | `31ffd18a-c3d8-48b2-a825-cc8a04362a17` | 5 s |
| s05 volo sulla casa finita | `9297e03a-079e-4cfb-a7f9-724dce5c073c` | 4 s |
| s06 soglia, la porta si apre | `44e8e25d-c7a1-4ceb-8dd9-48e70e47ea67` | 4 s |

Nota su s06: finisce sulla porta aperta con dentro un interno GIÀ FINITO
(fotogramma `bb886995`), mentre la catena interni parte dalla porta sul
CANTIERE (`65890ee2`). Quella giunzione va riallineata: o si rigenera la coda
di s06 verso il fotogramma nuovo, o si accetta il micro-salto. Da decidere.

## Scartate (non usare)

- Gli otto interni della prima tornata (s07-s12 V1): il riferimento video 3D
  li ha contaminati — il 3D rientrava nelle stanze — e s07 partiva da un
  interno già finito che si "smontava". Causa documentata in GIORNATA_27_07.md.
- `cd08e087-ad1d-415f-8d6e-fa6403ad4c35` (tuffo V2 "emerge da sotto").
