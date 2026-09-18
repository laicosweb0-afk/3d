# Club Aurea

L'esperienza che si apre quando qualcuno appoggia il telefono sulla card NFC
del mondo **Woman / Aurea**: una domanda in apertura, tre note da indovinare
sulla fragranza che ha nel naso, un giro di ruota, un credito da spendere in
profumeria. Serve a trasformare un profumo sentito per caso in un contatto.

È il gemello di `club-rama/` — quello pubblicato su `/3d/rama/` — e lo è per
scelta, non per comodità: **stesso design, stessi font, stesse animazioni**.
Crema e oro, i font di sistema con la scala tipografica di iOS, le stesse
molle, gli stessi raggi e le stesse ombre, l'apertura in due tempi con gli
stessi millesimi. Cambia il gioco dentro, non il vestito.

Le sole tre differenze visive, e il motivo di ognuna:

| Cosa | Perché |
|---|---|
| Il marchio è un flacone, non quattro piastrelle | Le piastrelle sono di Rama Ceramiche. Il gradiente d'oro, la molla e i ritardi a scalare sono gli stessi. |
| Le schede delle risposte hanno due stati in più, giusta e sbagliata | Là non c'era niente da indovinare. Il giusto è l'oro che già c'era, lo sbagliato è il rosso dei campi in errore del modulo. |
| Nella tessera ci sono le onde dell'NFC dove starebbe il QR | È il punto del brief: la card al posto del coupon. |

Il resto — crema `#F5F3EE`, superficie `#FBFAF7`, inchiostro `#1D1D1F`, oro
`#E8CD86`/`#C9A54E`/`#8C6E27`, il rubino del premio grosso — è copiato cifra
per cifra da `club-rama/tailwind.config.ts`.

Prototipo di prova. Non va messo online pubblicamente.

## Il percorso

| | Schermata | Cosa succede |
|---|---|---|
| — | Apertura | «Hey.» e poi **«Hai sentito il profumo?»**, col flacone che si compone sopra |
| 1 | Avvio | «Ora prova a indovinare le fragranze», e il patto: il credito arriva comunque |
| 1 | Quiz ×3 | testa, cuore, fondo della fragranza in diffusione |
| 1 | Esito | quante ne ha prese, e **com'era che si chiamava** |
| 2 | Ruota | un giro solo |
| 2 | Rivelazione | il credito che sale da zero |
| 3 | Dati | nome e cognome, email **oppure** telefono |
| 3 | Fine | la tessera con il codice |

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

Tutto sta in `src/config/gioco.ts`, non serve aprire altro.

| Cosa | Dove | Nota |
|---|---|---|
| Fragranza in diffusione | `IN_DIFFUSIONE` | L'unica riga legata al mondo vero. Con `null` ne esce una a caso: va bene per far vedere il giocattolo, non in negozio. |
| Fragranze e domande | `FRAGRANZE` | Ognuna ha nome, famiglia, un ritratto di una riga e le tre domande. Le domande possono essere più o meno di tre: i contatori si adeguano da soli. |
| La foto del flacone | `FRAGRANZE[].immagine` | Un file dentro `public/`, per esempio `/fragranze/notte-aurea.png`. Se manca, l'app disegna la sua boccetta e non si rompe niente. |
| Cosa si sente dicendo se la nota era un'altra | `FRAGRANZE[].domande[].vicine` | Una riga per ciascuna risposta. Quella generica, quando non c'è, è `CONSOLAZIONE`. |
| Spicchi della ruota | `SPICCHI` | In senso orario. Cambiarne il numero è lecito: la ruota si ridisegna da sé. |
| Esito | `ESITO` | `15` fa atterrare la ruota su uno spicchio da 15€, in un punto casuale al suo interno. Con `null` l'esito è davvero casuale. |
| Punto d'arresto | `ARRESTO` | Dove si posa la lancetta dentro lo spicchio vincente, misurato dal bordo appena superato. Valori bassi la lasciano a un soffio dal premio grosso appena sfilato. `null` la posa dove capita. |
| Cosa chiede il modulo | `CONTATTO_RICHIESTO` | `'uno'` accetta email **o** telefono, `'entrambi'` li vuole tutti e due. |
| Validità del credito | `VALIDITA_GIORNI` | La scadenza è calcolata dal giorno del ritiro. |
| Durata e giri | `GIRO` | Millisecondi dell'unica decelerazione e numero di giri completi. |

L'importo mostrato **è quello vinto sulla ruota**: non esiste un secondo
posto dove cambiarlo, così non possono divergere.

### La fragranza in diffusione è una promessa

Il quiz non chiede nozioni: chiede di riconoscere quello che si sta sentendo
in quel momento. Se il diffusore in negozio cambia e `IN_DIFFUSIONE` resta
indietro, la pagina segna come giusta una nota che nell'aria non c'è — ed è il
modo più veloce di rovinare tutto il giocattolo. Chi cambia l'essenza cambia
anche quella riga, o il gioco è meglio spegnerlo.

### Le domande sono facili di proposito

Si sceglie fra **famiglie** olfattive, non fra ingredienti: «agrumi» e non «bergamotto di
Calabria», «bucato pulito» e non «muschio bianco». E ogni opzione porta con sé
il paragone che la rende riconoscibile — la scorza d'arancia, il talco, la
crema solare, la matita temperata.

La regola per aggiungerne una: **se l'opzione non si può spiegare con una cosa
che sta in una cucina o in un bagno, è troppo difficile per questa card.** Chi
tocca la card non è un naso: è una persona con trenta secondi di pazienza, e
una domanda da esperti la fa smettere alla prima schermata.

### Da qui non si esce bocciati

Chi sceglie un'altra nota **non vede un rosso, non vede una croce e non legge
la parola «sbagliato»**. Vede accendersi la nota giusta, la sua segnata con un
punto tenue, e una riga che spiega perché quelle due si somigliano: «rosa e
gelsomino sono due fiori, e da vicino si confondono sempre». Sono righe scritte
una per una in `vicine`, dentro ogni domanda.

Contano due cose, e vanno tenute insieme:

- **Nessuno si sente stupido.** È il punto: uno che si sente stupido non
  lascia il numero di telefono.
- **Nessuna di quelle righe dice il falso.** Sarebbe stato più corto scrivere
  «quasi tutti rispondono così, non ti preoccupare», ma è una statistica che
  non abbiamo mai misurato, e messa in bocca a un negozio diventa una cosa che
  il negozio non può dimostrare. Le note che si somigliano invece si
  somigliano per davvero: la rassicurazione arriva uguale e non c'è niente da
  difendere. Se si vuole comunque quella frase, è una riga in `gioco.ts` —
  `CONSOLAZIONE`.

Lo stesso vale per il riepilogo: non è una pagella. Anche a zero note prese il
titolo parla del naso di chi gioca («Il tuo naso ha idee sue») e non dei suoi
errori, e il punteggio è la riga piccola sotto. Lo controlla anche la passata
automatica: se una schermata del quiz dicesse «sbagliato», `club-aurea-qa.mjs`
fallisce.

### L'ordine degli spicchi non è decorativo

La ruota gira in avanti, quindi gli spicchi arrivano sotto la lancetta in
ordine **decrescente** di indice: prima del bersaglio passa sempre quello che
nella lista viene **dopo**. Per questo il 100 sta all'indice 2 e il 15
all'indice 1. Se sposti uno dei due, la frenata in due tempi si ferma sullo
spicchio sbagliato e l'effetto sparisce.

### Il premio che non esce mai

Con `ESITO = 15` la ruota atterra sempre sul 15, e il 100 in oro non può
uscire. È una scelta da fare con gli occhi aperti: mostrare un premio che
nessuno può vincere, in Italia, è una pratica commerciale ingannevole ai sensi
del Codice del Consumo, e i concorsi a premi hanno regole loro (DPR 430/2001).

La versione onesta costa una riga: si lascia `ESITO = 15` per le dimostrazioni
e si passa a `null` quando la card va in mano ai clienti — la frenata in due
tempi si spegne da sola, perché con l'esito davvero casuale non avrebbe senso
costruire la suspense. In alternativa si toglie il 100 dagli spicchi: una
ruota dove tutti i premi sono veri regge anche a esito fisso.

### Perché il credito non dipende dal punteggio

Lo dice la prima schermata, prima ancora che il quiz cominci: «il credito
arriva comunque». Un quiz che decide quanto si vince smette di essere un
gioco e diventa un esame, e chi non è sicuro del proprio naso — cioè quasi
tutti — preferisce non giocare affatto. Il punteggio serve a farsi raccontare
la fragranza, non a meritarsi lo sconto.

## Il modulo: perché uno dei due contatti

Il brief chiedeva «Email / Numero di telefono». Quella barra si legge in due
modi e la differenza non è di dettaglio: chiederne uno solo fa arrivare in
fondo più gente, chiederli entrambi lascia due strade per ritrovarla.

Adesso è impostato su `'uno'` — l'email **oppure** il telefono, con un
«oppure» scritto fra i due campi perché nessuno resti a chiedersi se può
saltarne uno. Il nome e cognome è sempre obbligatorio, e vuole due parole:
«Giulia» da sola non basta a intestare un credito.

Per volerli tutti e due basta cambiare `CONTATTO_RICHIESTO` in `'entrambi'`:
cambiano le convalide e il testo della schermata, niente altro da toccare.

## Dove finiscono i contatti

Al momento dell'invio nasce un oggetto con nome, email, telefono, fragranza,
note indovinate su quante erano, credito, codice, scadenza, consenso, orario e
sorgente. Lo gestisce `submitLead()` in `src/lib/lead.ts`.

Senza configurazione è un invio simulato: aspetta 800ms e scrive in console.
Per mandarlo davvero, crea un file `.env.local`:

```
VITE_LEAD_WEBHOOK_URL=/api/lead
```

Da quel momento il contatto parte in POST JSON a quell'indirizzo. Se il
server risponde male, la schermata lo dice e lascia riprovare **senza
perdere quello che il cliente ha già scritto**.

La funzione che riceve non è in questa cartella: `club-rama/api/lead.ts` fa
esattamente quel mestiere (gira il contatto su WhatsApp, con la chiave tenuta
fuori dalla pagina) e il suo README spiega il muro delle 24 ore di WhatsApp,
il sandbox di Twilio e la Cloud API di Meta. Per usarla qui va copiata e
riscritto il riepilogo, che oggi nomina ambiente e stile invece di fragranza
e note. Finché non esiste, `submitLead()` resta in prova e non perde niente
perché non promette niente.

**Dati di clienti veri**: da qui passano nome, email e telefono di persone
vere. Serve un'informativa privacy raggiungibile dal modulo — oggi il link è
un segnaposto — prima che la card vada in mano a qualcuno.

## Controllo su telefono

Lo script ripercorre tutte le schermate su un viewport da iPhone e salva uno
screenshot per ciascuna:

```bash
npm run build
node ../tools/static-server.mjs club-aurea/dist 8934 &   # dalla radice del repo
node ../tools/club-aurea-qa.mjs <cartella-screenshot>
```

Fallisce con codice 1 se il punteggio non torna, se il credito non è 15 €, se
il modulo accetta un nome senza cognome o si lascia inviare senza nessun
contatto, se il codice finale è malformato, se c'è overflow orizzontale, se la
ruota non suona o se la pagina prova a chiamare qualcosa fuori dal server
locale.

Le risposte giuste dentro lo script sono quelle di `Notte Aurea`: se cambi
`IN_DIFFUSIONE`, cambia anche `RISPOSTE` lassù.

Resta comunque da fare un giro sulla card fisica vera, con un iPhone e un
Android: il tocco NFC e il browser in-app (quello che si apre dal lettore NFC
di sistema) sono l'unico pezzo che non si può simulare da qui.

## Scelte che vale la pena conoscere

**La risposta si conferma in due tempi.** Prima si sceglie, poi si preme
«Conferma». Sul telefono un tocco parte anche per sbaglio, e qui il tocco
sbagliato costa una nota. Dopo la conferma la schermata resta lì, con la
risposta giusta accesa e le altre spente: è il momento in cui si impara
qualcosa, e vale più del punto.

**La fragranza si sceglie una volta sola**, al montaggio dell'app. Se la
rileggessimo a ogni render, con `IN_DIFFUSIONE` a `null` cambierebbe fra una
domanda e l'altra e il quiz diventerebbe impossibile.

**La ruota** non usa un'animazione dichiarativa ma un ciclo a fotogrammi con
un profilo di velocità scritto a mano: rampa breve in accelerazione e frenata
lunga, con velocità continua nel punto di raccordo. Serve perché la lancetta
scatti e la vibrazione parta esattamente quando uno spicchio passa sotto,
cosa impossibile se non si conosce l'angolo a ogni fotogramma. La tensione
viene dal punto d'arresto — la lancetta si posa a sei o sette gradi dal bordo
del 100 appena sfilato — non da una pausa costruita: una ruota vera non si
ferma e riparte.

**La boccetta disegnata è una rete, non l'obiettivo.** `Boccetta.tsx` disegna
un flacone in SVG — vetro, liquido, tappo, un riflesso che passa — e regge la
schermata finché non ci sono foto. Ma un vettoriale disegnato a mano non
arriva dove arriva una fotografia: appena la profumeria manda gli scatti dei
suoi flaconi, si mette il file in `public/fragranze/` e si aggiunge
`immagine:` alla fragranza in `gioco.ts`. Il disegno si fa da parte da solo.
Meglio ancora: il cliente riconosce sullo schermo il flacone che ha appena
visto sullo scaffale, e quello nessun disegno lo può fare.

Serve un PNG con lo **sfondo trasparente** e il vetro già scontornato: su
fondo crema un rettangolo bianco attorno al flacone si vede, e rovina più di
quanto aggiunge.

**`AureaLogo` e `Boccetta` sono due mestieri diversi.** Il primo è il marchio:
una sagoma che deve reggere a 20px nell'intestazione, dentro la moneta e al
centro della ruota. Il secondo è l'illustrazione grande, con i riflessi. A
20px i riflessi diventano una macchia, e a 170px la sagoma sembra un'emoji:
per questo sono due file e non un componente con una scala.

**I valori del design non si toccano a occhio.** Tinte, tempi, molle, ombre e
dimensioni vengono da `club-rama/` e lì si controllano: la build pubblicata su
`/3d/rama/` ha gli stessi hash di quella che esce da `club-rama/npm run build`,
quindi quel sorgente *è* il riferimento, non una copia che gli assomiglia. Chi
cambia un colore qui lo sta cambiando in un mondo solo dei due: se la modifica
riguarda il sistema e non il gioco, va fatta in entrambi.

**`#root` ha una larghezza esplicita** in `index.css`. Senza, il flex del body
lo stringe sulla larghezza del contenuto e le schermate con poco testo escono
più strette delle altre.

**Chi ha attivato «riduci movimento»** salta apertura, rotazione, coriandoli e
conteggio: la ruota si posiziona sul risultato e il credito appare già
scritto. Il resto lo spegne una riga sola in `main.tsx` —
`<MotionConfig reducedMotion="user">` — che toglie a tutti i componenti
animati le trasformazioni e lascia passare solo le dissolvenze: senza quella,
le molle minori (la tessera che sale, la moneta che si gira, le scritte che
scivolano) restavano, e sono proprio quelle che in tanti non vogliono. Le due
righe sotto il credito perdono anche l'attesa: erano in coda al conteggio, e
senza conteggio sarebbero solo due secondi di schermata mezza vuota.
