# Club Rama

L'esperienza che si apre quando un cliente di Rama Ceramiche appoggia il
telefono sulla sua card NFC: due domande, un giro di ruota, un credito da
spendere sul preventivo. Serve a portarlo in showroom lasciando un contatto.

Prototipo di prova. Non va messo online pubblicamente.

## Avviarlo

```bash
npm install
npm run dev        # sviluppo, con accesso dalla rete locale
npm run build      # build di produzione nella cartella dist/
npm run preview    # serve la build
```

Progettato per iPhone in verticale. Su desktop resta una colonna centrata da
430px: per vederlo come va visto, usa la modalità telefono degli strumenti di
sviluppo a 390px.

## Cambiare il gioco

Tutto sta in `src/config/game.ts`, non serve aprire altro.

| Cosa | Dove | Nota |
|---|---|---|
| Spicchi della ruota | `SPICCHI` | In senso orario. Cambiarne il numero è lecito: la ruota si ridisegna da sé. |
| Esito | `OUTCOME` | `70` fa atterrare la ruota su uno spicchio da 70€, in un punto casuale al suo interno. Con `null` l'esito è davvero casuale. |
| Punto d'arresto | `ARRESTO` | Dove si posa la lancetta dentro lo spicchio vincente, misurato dal bordo appena superato. Valori bassi la lasciano a un soffio dal premio grosso appena sfilato. `null` la posa dove capita. |
| Validità del credito | `VALIDITA_GIORNI` | La scadenza è calcolata dal giorno del ritiro. |
| Durata e giri | `GIRO` | Millisecondi dell'unica decelerazione e numero di giri completi. |
| Domande e risposte | `AMBIENTI`, `STILI` | Testi delle due schermate iniziali. |

L'importo mostrato **è quello vinto sulla ruota**: non esiste un secondo
posto dove cambiarlo, così non possono divergere.

### L'ordine degli spicchi non è decorativo

La ruota gira in avanti, quindi gli spicchi arrivano sotto la lancetta in
ordine **decrescente** di indice: prima del bersaglio passa sempre quello che
nella lista viene **dopo**. Per questo il 200 sta all'indice 2 e il 70
all'indice 1. Se sposti uno dei due, la frenata in due tempi si ferma sullo
spicchio sbagliato e l'effetto sparisce.

### Il premio che non esce mai

Con `OUTCOME = 70` la ruota atterra sempre sul 70, e il 200 in rubino non può
uscire. È una scelta da fare con gli occhi aperti: mostrare un premio che
nessuno può vincere, in Italia, è una pratica commerciale ingannevole ai sensi
del Codice del Consumo, e i concorsi a premi hanno regole loro (DPR 430/2001).

La versione onesta costa una riga: si lascia `OUTCOME = 70` per le
dimostrazioni e si passa a `null` quando la card va in mano ai clienti — la
frenata in due tempi si spegne da sola, perché con l'esito davvero casuale
non avrebbe senso costruire la suspense.

## Dove finiscono i contatti

Al momento dell'invio nasce un oggetto con nome, email, ambiente, stile,
credito, codice, scadenza, modalità di ritiro, consenso, orario e sorgente.
Lo gestisce `submitLead()` in `src/lib/lead.ts`.

Senza configurazione è un invio simulato: aspetta 800ms e scrive in console.
Per mandarlo davvero, crea un file `.env.local`:

```
VITE_LEAD_WEBHOOK_URL=https://esempio.it/contatti
```

Da quel momento il contatto parte in POST JSON a quell'indirizzo. Se il
server risponde male, la schermata lo dice e lascia riprovare **senza
perdere quello che il cliente ha già scritto**.

## Scelte che vale la pena conoscere

La ruota non usa un'animazione dichiarativa ma un ciclo a fotogrammi con un
profilo di velocità scritto a mano: rampa breve in accelerazione e frenata
lunga, con velocità continua nel punto di raccordo. Serve perché la lancetta
scatti e la vibrazione parta esattamente quando uno spicchio passa sotto,
cosa impossibile se non si conosce l'angolo a ogni fotogramma.

La frenata è **una sola curva continua**. Una prima versione si fermava sullo
spicchio precedente, faceva una pausa e scattava avanti: si vedeva subito che
era finta, perché una ruota vera non si ferma e riparte. La tensione viene
invece dal punto d'arresto — la lancetta si posa a sei o sette gradi dal
bordo del premio grosso appena sfilato, e negli ultimi mille millesimi
striscia dentro lo spicchio vincente senza mai fermarsi. Misurato: gli ultimi
567 millesimi sono impercettibili, il resto si vede muovere.

`#root` ha una larghezza esplicita in `index.css`. Senza, il flex del body lo
stringe sulla larghezza del contenuto e le schermate con poco testo escono
più strette delle altre.

Chi ha attivato "riduci movimento" salta rotazione, coriandoli e conteggio:
la ruota si posiziona sul risultato e il credito appare già scritto.
