# Woman — The Fragrance Experience

La pagina che si apre quando qualcuno annusa la **fialetta senza nome** che ha
trovato nel pacco e prova a capire cos'è. Una domanda, una scoperta, un
credito: serve a trasformare un acquisto in un secondo ordine, e un cliente in
due persone.

> Smell · Guess · Share — Woman Parfume Store, Sant'Agata sul Santerno (RA)

Prototipo di prova. Non va messo online pubblicamente.

## Le quattro regole che non si toccano

Vengono dal documento strategico, non dai gusti di chi scrive il codice. Sono
in cima a `src/config/gioco.ts`, dove le trova chi sta per cambiare qualcosa:

1. **Una sola domanda.** Ogni domanda in più abbassa i completamenti.
2. **Nessun secondo tentativo.** Il gioco perderebbe peso e la risposta
   perderebbe valore come dato — ed è il dato che stiamo raccogliendo.
3. **Il premio non dipende mai dalle risposte.** Il documento lo voleva
   uguale per tutti; adesso lo estrae una ruota fra 5, 10 e 15 €. Il punto
   vero resta intatto: si vince sempre, e si vince lo stesso sia che si
   indovini sia che no — altrimenti cambierebbe categoria di manifestazione a
   premio.
4. **Il risultato non è mai una sconfitta.** Chi non indovina riceve una
   spiegazione e una consulenza, che per una profumeria è il servizio più
   prezioso che ci sia.

Se una di queste salta, non è più questa esperienza: è un'altra, e va
ridiscussa con chi ha scritto il documento.

## Il percorso

| | Schermata | Cosa succede |
|---|---|---|
| — | Apertura | «Hey.» e poi «Hai sentito il profumo?», sul fondo scuro |
| 1 | Ingresso | «Riconosci la fragranza?» — si annusa e si comincia |
| 2 | La domanda | «Prima di scoprirlo: cosa hai sentito?» — Agrumato · Floreale · Legnoso · Ambrato. Il tocco sceglie e avanza |
| 3 | La rivelazione | nome, maison, note. **Senza il credito**: è un altro momento |
| 4 | La ruota | fondo scuro, «Ora vincilo» |
| 5 | Il credito | la cifra che sale da zero, e quante fialette copre |
| 6 | Le fragranze | tre consigliate, con quante il credito ne copre |
| 7 | I dati | nome e cognome, email **oppure** telefono, consenso |
| 8 | La chiusura | SMELL. GUESS. SHARE. — livello e codice |

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

## Cambiare le cose

Tutto sta in `src/config/gioco.ts`.

| Cosa | Dove | Nota |
|---|---|---|
| **La fragranza ospite** | `OSPITE` | Nome, maison, famiglia giusta, note, ritratto. **Cambia a ogni edizione**, insieme alla fialetta che entra nei pacchi. |
| La nota che inganna | `OSPITE.accordoIngannevole` | Finisce dentro «sotto c'è un accordo di ___ che confonde quasi tutti». Va scelta guardando la fragranza vera: è quella che rende la frase credibile invece che di circostanza. |
| La foto del flacone | `OSPITE.immagine` | Un file in `public/fragranze/`. Compare nella rivelazione; se manca, la schermata resta tipografica e non si rompe niente. |
| Le quattro famiglie | `FAMIGLIE` | Etichetta, il paragone che la rende rispondibile, e il plurale femminile per «tre fialette ___». |
| Le fialette consigliate | `CONSIGLI` | Tre per famiglia: è il pezzo di consulenza. Vanno sostituite con fragranze che la profumeria ha davvero. |
| **Gli spicchi della ruota** | `SPICCHI` | La lista dei premi, uno per spicchio. **Le probabilità stanno qui**: vedi sotto. |
| Il taglio delle fialette | `TAGLIO` | 5 €. Il credito diventa fialette dividendo per questo. |
| Cosa chiede il modulo | `CONTATTO_RICHIESTO` | `'uno'` accetta email **o** telefono, `'entrambi'` li vuole tutti e due. |
| Le percentuali | `PERCENTUALI` | `null` finché non c'è il conteggio vero. Vedi sotto. |

### La fragranza ospite è una promessa

È l'unica riga legata al mondo vero. Se la profumeria cambia la fialetta
sorpresa e questa resta indietro, la pagina dà il nome sbagliato a chi ha
appena annusato: non c'è modo più veloce di bruciare il giocattolo. Chi cambia
la fialetta cambia anche quella riga, o il gioco è meglio spegnerlo.

### Perché la percentuale non compare

«Il 62% ha risposto come te» è nel documento, ed è una delle cose migliori
della schermata. Ma è un **dato**, non una frase: sono le risposte di chi ha
giocato prima, e finché nessuno ha giocato quel numero non esiste.

Scriverne uno inventato sarebbe l'unica bugia di tutta l'esperienza, per
giunta in bocca al negozio e dentro la schermata che deve dare fiducia — e
basterebbe un cliente che ne parla con un altro perché si veda. Quando ci sarà
l'endpoint che conta le risposte per famiglia, in `PERCENTUALI` arriva la
mappa e la riga si accende da sola. La passata automatica controlla anche
questo: se una percentuale comparisse senza conteggio, fallisce.

### La ruota: le probabilità stanno nella geometria

Undici spicchi: **sei da 15 €, tre da 10 €, due da 5 €.** Fanno 54,5% · 27,3%
· 18,2%, cioè i 55/27/18 chiesti, a meno di mezzo punto. Il credito medio è
**11,82 €** contro i 15 € fissi di prima.

Per questo l'estrazione è una riga sola — `Math.floor(Math.random() * N)` —
senza pesi e senza bersagli imposti: **la ruota non bara perché non ha bisogno
di barare.** Il 15 esce più spesso perché occupa più ruota, e si vede
guardandola. Se servono percentuali diverse si cambia la composizione della
lista, e le probabilità seguono da sole; `probabilita()` le ricalcola e la
passata automatica le controlla contro quelle attese.

**Non c'è nessuno spicchio da 50, 100 o 150 €.** Mostrare un premio che
nessuno può vincere è una pratica commerciale ingannevole (Codice del Consumo,
artt. 20-23), e sarebbe l'unica cosa disonesta di un'esperienza costruita
tutta sull'onestà. Il colore fa già il lavoro che farebbe un premio civetta:
magenta il 15, viola il 10, crema il 5 — la ruota è piena e si capisce a
colpo d'occhio dove sta il premio grosso.

Da sapere con gli occhi aperti, e va detto a chi decide: **una ruota che
assegna importi diversi a sorte è un concorso a premi** (DPR 430/2001) —
regolamento, cauzione, comunicazione al Ministero. Un premio uguale per tutti
e garantito no: è una semplice operazione a sconto. Per tornare lì basta
riempire `SPICCHI` di soli 15: la ruota gira uguale e non c'è niente da
dichiarare.

### Le tre fragranze restano tre

Chi vince 5 € si porta a casa una fialetta, non tre. Ma i **consigli restano
sempre tre**: sono una consulenza, non il premio. Il credito dice quante se ne
prendono adesso, e le altre restano lì, scritte, per la prossima volta — le
righe oltre il credito si spengono, non spariscono. È il motivo per cui chi
vince 5 € non esce con l'impressione di aver ricevuto un terzo di qualcosa.

## Dove finiscono i contatti

Al momento dell'invio nasce un oggetto con nome, contatti, fragranza ospite,
maison, **la famiglia che ha sentito**, se ha centrato, il livello, credito,
codice, scadenza, consenso, orario e sorgente. Lo gestisce `submitLead()` in
`src/lib/lead.ts`.

Senza configurazione è un invio simulato: aspetta 800ms e scrive in console.
Per mandarlo davvero, un file `.env.local`:

```
VITE_LEAD_WEBHOOK_URL=/api/lead
```

La famiglia sentita è il dato che vale più dell'email: dice cosa comprerà
quella persona, e a Woman serve per scegliere le tre fialette.

**Dati di clienti veri**: serve un'informativa privacy raggiungibile dal
modulo — oggi il link è un segnaposto — prima che il primo cartoncino esca dal
negozio.

## Controllo su telefono

```bash
npm run build
node ../tools/static-server.mjs woman/dist 8934 &   # dalla radice del repo
node ../tools/woman-qa.mjs <cartella-screenshot>
```

Non controlla solo che la pagina funzioni: controlla che **le regole siano
ancora rispettate**. Fallisce se le famiglie non sono quattro, se torna la
freccia per rispondere di nuovo, se **le percentuali della ruota non tornano**
con quelle attese, se compare uno spicchio non previsto, se qualcuno mette un
sorteggio pesato nel codice invece che negli spicchi, se **il credito compare
già nella rivelazione** (quiz e premio sono due momenti diversi), se le
fialette non tornano con il credito vinto, se la rivelazione tratta la
risposta come un errore, se compare una percentuale senza conteggio, se i
consigli non sono tre, se sparisce il livello, **se il font non è Inter o non
si carica**, o se la pagina chiama un solo indirizzo fuori dal server locale.

## Scelte che vale la pena conoscere

**Il design viene dal prototipo approvato, non dall'occhio.** Tavolozza, mesh
di sfondo, curva del movimento (`cubic-bezier(.32,.72,0,1)`, 520ms), misure
della tipografia: sono i valori del prototipo, copiati. Lo sfondo non è un
colore ma una luce — tre aloni che salgono dal basso, magenta, viola e pesca —
e cambia in scuro sulle schermate che devono pesare: l'apertura, la ruota, il
credito, la chiusura.

**Inter è servito da noi**, non da Google Fonts: un file solo da 47 KB in
`public/fonts/`. Inter è un font variabile e Google manda lo stesso woff2 per
tutti i pesi, quindi scaricarne quattro voleva dire scaricare quattro volte la
stessa cosa. Il perché del self-hosting sta in cima a `src/font.css`: velocità
in negozio, e soprattutto privacy — chiamare `fonts.gstatic.com` manda a
Google l'IP di chi apre la pagina, e qui dentro passano dati di clienti veri.

**Niente intestazione fissa, niente barra dei passi.** L'esperienza dura
novanta secondi e si guarda una schermata alla volta: un contatore «2 di 5»
darebbe la sensazione di un modulo da compilare, che è l'opposto di quello che
stiamo facendo.

**Il titolo si spezza a mano**, con un `\n` dentro il testo. Una riga che va a
capo da sola non ha lo stesso ritmo, e su schermi diversi si spezza in punti
diversi.

**Il tocco sulla risposta sceglie e avanza**, senza bottone di conferma: la
risposta è di pancia, e un secondo passaggio la farebbe diventare un
ragionamento.

**Il marchio è tipografico.** `WomanLogo` ricostruisce WO•MAN con il punto
magenta: nel documento il logo sta dentro un'immagine, e da un PNG non si
ricava un vettoriale. **Appena arriva il file vettoriale va sostituito quel
componente** — è l'unico posto da toccare.

**Chi ha attivato «riduci movimento»** non vede girare la ruota (si posiziona
sul risultato), non vede salire il credito e non vede le particelle.
