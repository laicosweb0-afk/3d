# LA STRUTTURA — come è fatto il viaggio

Dettata dal committente il 28/07/2026. È la specifica corrente: se una scelta
tecnica la contraddice, è la scelta tecnica a essere sbagliata.

Sostituisce le ipotesi precedenti su ordine e montaggio del viaggio.

## Il principio che regge tutto

**L'utente non si deve mai accorgere che sta scorrendo dei video.** Deve essere
un'unica cosa: nessun distacco, nessun cambio d'angolazione fra un pezzo e il
successivo, nessuna camera che si ferma e riparte da un'altra parte.

Ogni giunzione è un rischio. La regola operativa che ne discende: **meno pezzi,
più lunghi**, e mai due riprese dove ne basta una.

## La sequenza

### 1. L'apertura — bianco

Logo, informazioni, la frase. Bianco premium, tipografia sicura, spazi larghi.

### 2. La casa che si costruisce — 3D, sempre bianco

Scorrendo si resta **dentro lo stesso bianco**: è questo il motivo per cui qui
serve il 3D e non il girato. Un video fotografico attaccato al bianco dell'hero
è uno strappo — una foto appoggiata su una pagina. Il modello invece nasce dal
foglio.

La camera gira attorno alla casa mentre sale. Solo l'esterno, solo modello,
niente contesto: il terreno resta bianco.

Nel modello attuale questo tratto vive fra `p 0` e circa `p 0.27`: bianco
assoluto, poi la platea, poi la casa che si chiude. Da `p 0.354` comparirebbe
il contesto reale — e lì il 3D ha già finito il suo compito.

### 3. Il passaggio: da modello a cantiere vero

Un video prende la casa in 3D e la fa diventare **casa in costruzione reale**.
È l'unico momento in cui i due linguaggi si toccano, ed è voluto: si vede che
il progetto diventa cantiere.

**Da qui in poi il 3D non compare più.**

### 4. La porta

Si arriva all'ingresso, la porta si apre, si entra. Senza stacchi.

### 5. Il soggiorno

Lo spazio si costruisce attorno alla camera fino a diventare il soggiorno
consegnato — che è **una fotografia vera** di Mondial Service.

### 6. Il tuffo — dentro il buco, in avanti

Il pavimento si apre sul radiante. **La camera deve andare avanti e giù ed
entrare nell'apertura**: il buco cresce fino a riempire lo schermo e ci si
passa attraverso. Poi si segue la tubazione e si riemerge nel bagno.

Funziona come l'uscita dalla finestra, che riesce proprio per questo: si vede
l'apertura crescere e la si attraversa.

**Difetto della clip attuale** (`08-tuffo`): il buco resta fermo in basso nel
quadro per un secondo, la camera non gli si avvicina mai, e poi c'è uno stacco
secco su un tunnel buio. L'ingresso non si vede — e se non si entra dal buco,
quel buco non serviva aprirlo.

### 7. Il bagno e l'uscita — un video solo

**Una sola ripresa, fino a quindici secondi, una sola angolazione.** Il bagno si
costruisce fino alla fotografia vera e, senza che la camera si fermi mai, la
stessa inquadratura prosegue verso la finestra, la attraversa ed esce.

Oggi sono due clip con un cambio d'angolo in mezzo: si sente, ed è il difetto
più evidente rimasto.

### 8. Fuori, e le sezioni

Usciti dalla finestra si sale verso il cielo coperto: il fotogramma diventa
quasi bianco. Su quel bianco vivono le sezioni del sito — preventivo, servizi,
opere. La transizione l'ha già fatta la camera: non serve dissolvere niente.

## Il materiale, censito

### Da tenere

| pezzo | stato |
| --- | --- |
| il 3D dal bianco alla casa costruita | **già pronto**, continuo, non costa niente |
| `07-soggiorno` | il soggiorno che si costruisce fino alla foto vera |
| `09-bagno` | il bagno che si costruisce fino alla foto vera |
| `soggiorno-transizione`, `bagno-transizione` | i due morph 3D→fotografia già nel repo |

### Da buttare

`01-terreno`, `02-fondazioni`, `03-costruzione`, `04-materia`, `05-volo`,
`06-soglia`. Sei clip: angolazioni diverse fra loro, doppioni, e la casa che
tornava indietro di stato. Il 3D fa lo stesso lavoro meglio e in un movimento
solo.

### Da rifare

| pezzo | perché |
| --- | --- |
| il passaggio 3D → cantiere reale | non esiste |
| il tuffo nel buco del pavimento | `08-tuffo` non ci entra affatto: il buco resta fermo in basso e poi c'è uno stacco secco sul tunnel. Va rifatto con la camera che avanza, scende e attraversa l'apertura |
| bagno + uscita | vanno fusi in una ripresa sola di ~15 s, angolazione unica |

## Cosa NON si fa più

- Non si generano clip a blocchi: una per volta, verificata prima della
  successiva.
- Non si aggiungono passaggi non richiesti. Le tre clip che finivano la casa
  prima dell'ingresso erano un'aggiunta arbitraria, e hanno rotto la coerenza.
- Non si verifica su un server senza supporto alle richieste parziali: senza
  Range il video non si può cercare e si finisce per diagnosticare il banco di
  prova invece del sito.
