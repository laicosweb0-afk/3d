# 27 luglio 2026 — cosa è stato deciso, cosa è stato sbagliato

Riepilogo della giornata, richiesto dal committente. Serve perché domani questa
conversazione non c'è più e senza questo foglio si ripaga in credits.

## La direzione, in una riga

Il visitatore non vede mai il 3D. Apre il sito, scorre, e vede la **casa vera
che si costruisce**. Il 3D è l'officina: decide inquadrature, produce i
fotogrammi di riferimento, detta il ritmo. Poi esce di scena.

Documenti di riferimento: `DIREZIONE_V5.md` (gli otto punti del committente),
`COERENZA_CASA.md` (la casa ricavata dal modello), `PIPELINE_VIDEO.md` (come si
genera, costi misurati, difetti del servizio).

## Cosa è stato costruito oggi

- **Il piano dei dodici ciak** (`content/shots.ts`), con i prompt composti da
  mattoni condivisi invece che riscritti dodici volte.
- **Gli strumenti di previz**: `tools/shot-frames.mjs` (fotogrammi di
  giunzione), `tools/frame.mjs` (un fotogramma qualsiasi, con stato di cantiere
  forzabile), `tools/shot-motion.mjs` (il video della traiettoria di camera).
- **Dodici traiettorie di camera** estratte dal 3D.
- **L'uscita dalla finestra del bagno**, rimessa dopo che una sessione
  precedente l'aveva annullata lasciandone metà (la finestra si apriva ancora
  per un'uscita che non avveniva più).

## Gli errori, e cosa li ha causati

**Il salotto che si smontava.** Il fotogramma con cui la clip cominciava
mostrava già un interno finito — rovere posato, pareti a posto. La clip partiva
da una stanza completa e non aveva niente da costruire: qualsiasi cosa
succedesse in mezzo poteva solo sembrare che si disfacesse. Correzione: **la
porta si apre su un cantiere**, non su un salotto.

**Il 3D che rientrava negli interni.** Ho passato il video della traiettoria —
un render grigio — nel campo `video_references` di Seedance, credendo servisse
a trasferire il movimento. Su Seedance quel campo è un riferimento di
**aspetto**, non di moto: gli ho detto «somigliami a questo» e lui ha
ubbidito. Fuori faceva poco danno (la casa è un volume semplice che il modello
ricopre di materia), dentro lo faceva tutto (la stanza 3D è una scatola grigia
che riempie il fotogramma). Correzione: **niente riferimento video sugli
interni**, solo i due fotogrammi e il prompt.

**La camera che si fermava.** Nei prompt avevo scritto *settles*, «si assesta».
Sbagliato: il movimento della camera È lo scroll dell'utente. Se si ferma,
l'utente sente che la pagina è finita.

**Otto clip generate insieme, alla cieca.** Il blocco di rete impedisce di
scaricare i risultati, quindi non posso vedere cosa genero. Averne prodotte
otto in blocco ha significato produrre otto errori invece di uno. **Regola
nuova: una clip per volta, con gli occhi del committente in mezzo.**

## La scoperta importante sulla struttura

Le scene «dentro la parete» e «sotto il pavimento» **non possono esistere come
ripresa continua reale**. Nel 3D funzionavano perché erano astrazioni — un
esploso assonometrico, una parete che si apre. Ma una telecamera fotografica
non attraversa un solido: quel passaggio o diventa un effetto finto, o è uno
stacco mascherato.

Non era solo un prompt sbagliato: era una scena impossibile.

## La soluzione concordata

La qualità invisibile non è una scena a parte: è **una fase della costruzione
delle stanze**, che è anche più vero — il radiante lo vedi quando il bagno è in
cantiere, prima del massetto.

E il passaggio fra soggiorno e bagno diventa un **gesto dichiarato**, idea del
committente: alla fine del soggiorno si apre un riquadro di pavimento, si
vedono le tubazioni, la camera **entra nel buco** ed esce nel bagno. Non è uno
stacco nascosto — è un movimento evidente e voluto, e l'occhio lo perdona
proprio perché è evidente.

## Come si collegano le clip senza stacco

Due condizioni, non una:

1. **L'immagine**: l'ultimo fotogramma di una clip è lo *stesso identico file*
   del primo della successiva. Nel punto di giunzione lo schermo non cambia di
   un pixel.
2. **Il movimento**: se una clip finisce in movimento e la successiva riparte
   da ferma, l'immagine combacia ma il moto no, e l'occhio legge un singhiozzo
   anche senza vedere un taglio. La camera deve muoversi sempre, nella stessa
   direzione ai due lati della giunzione.

Nel sito non c'è nessun «play»: il fotogramma è funzione dello scroll.

## I conti

| | credits |
| --- | --- |
| stima iniziale per l'intero viaggio | ~153 |
| speso nella prima tornata (dodici ciak) | 194,5 |
| di cui sprecati su `s03` generato due volte | 40 |
| tetto concordato per finire | 100 |
| speso dentro il tetto (soggiorno + fotogramma bagno) | 17 |

Lo sforamento della prima stima non è stato un imprevisto: non avevo contato i
fotogrammi di confine nel preventivo, ed è un errore di preventivo.

## Cosa resta

- Il soggiorno più lungo, che finisce con il pavimento che si apre.
- La transizione dentro il buco fino al bagno.
- Il bagno che si costruisce fino alla fotografia reale.
- **Il sito che mostra tutto questo**: oggi non esiste niente che scrubbi il
  girato a schermo intero. Il meccanismo c'è ma vive in due finestrelle dentro
  il 3D. Non costa credits ed è il lavoro più grosso che rimane.
