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
3. **Un solo premio, uguale per tutti**: 15 € in tre fialette da 5 €. Se il
   premio dipendesse dall'abilità cambierebbe categoria di manifestazione a
   premio, con gli adempimenti che ne seguono.
4. **Il risultato non è mai una sconfitta.** Chi non indovina riceve una
   spiegazione e una consulenza, che per una profumeria è il servizio più
   prezioso che ci sia.

Se una di queste salta, non è più questa esperienza: è un'altra, e va
ridiscussa con chi ha scritto il documento.

## Il percorso

| | Schermata | Cosa succede |
|---|---|---|
| — | Apertura | «Hey.» e poi «Hai sentito il profumo?» |
| 1 | La domanda | «Prima di scoprirlo: cosa hai sentito?» — Agrumato · Floreale · Legnoso · Ambrato |
| 1 | La risposta | nome, maison, note. Chi ha centrato riceve il riconoscimento; chi ha sentito altro, la spiegazione e **tre fialette scelte su quello che ha sentito** |
| 2 | La ruota | un giro solo: ogni spicchio vale 15 € |
| 2 | Il credito | il numero che sale, «in tre fialette da 5 €, col prossimo ordine» |
| 3 | I dati | nome e cognome, email **oppure** telefono |
| 3 | La tessera | codice, scadenza e **livello** — la cosa che non si consuma |

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
| La foto del flacone | `OSPITE.immagine` | Un file in `public/fragranze/`. Se manca, l'app disegna la sua boccetta. |
| Le quattro famiglie | `FAMIGLIE` | Etichetta, il paragone che la rende rispondibile, e il plurale femminile per «tre fialette ___». |
| Le fialette consigliate | `CONSIGLI` | Tre per famiglia: è il pezzo di consulenza. Vanno sostituite con fragranze che la profumeria ha davvero. |
| Il premio | `PREMIO` | Valore, quante fialette, che taglio. |
| Gli spicchi | `SPICCHI` | Valgono tutti `PREMIO.valore`. Cambia solo l'`extra`. |
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

### La ruota, e cosa c'è da sapere

Ogni spicchio vale 15 €: nessun premio irraggiungibile, quindi nessuna delle
pratiche che il documento evita. Quello che cambia è l'omaggio in più.

Con gli occhi aperti: **il credito garantito a tutti non è un concorso a
premi, l'omaggio estratto a sorte sì.** Per restare nella sobrietà del
documento senza toccare la scenografia basta svuotare tutti gli `extra` in
`SPICCHI`: la ruota gira lo stesso, il premio resta uno solo, e non c'è niente
da dichiarare.

Siccome non c'è un premio grosso da sfiorare, la ruota **si ferma dove
capita** — sparisce anche il punto d'arresto calcolato che serviva sull'altra
card, e con lui un pezzo di codice che qui non avrebbe più senso.

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
ancora rispettate**. Fallisce se le famiglie non sono quattro, se compare una
freccia per tornare a rispondere, se gli spicchi non valgono tutti 15 €, se la
rivelazione tratta la risposta come un errore, se compare una percentuale
senza conteggio, se manca la consulenza a chi ha sentito altro, se il livello
sparisce dalla tessera, o se la pagina chiama qualcosa fuori dal server
locale.

## Scelte che vale la pena conoscere

**Il marchio è tipografico.** `WomanLogo` ricostruisce WO•MAN con il punto
magenta: nel documento il logo sta dentro un'immagine, e da un PNG non si
ricava un vettoriale. **Appena arriva il file vettoriale va sostituito quel
componente** — è l'unico posto da toccare.

**La perla** (`Perla.tsx`) è il punto del marchio disegnato in grande: sta al
centro della ruota e dentro la moneta, dove un wordmark non ci starebbe.

**I colori vengono dal PDF, non dall'occhio.** Crema `#FAF3E9`, magenta
`#BD3A66`, inchiostro `#1A171C`, i tre grigi dei testi secondari: campionati
dal documento. L'impianto — scala tipografica iOS, raggi, ombre, la fisica
della ruota — resta quello di `club-rama/`, già approvato su un'altra card e
provato sul telefono.

**I titoli sono in serif di sistema**: New York su iPhone, Noto Serif su
Android. Nessun font da scaricare — la pagina si apre in negozio, spesso con
una riga di rete, e un carattere che tarda è un titolo che balla.

**Dalla risposta non si torna indietro**, e non è una dimenticanza: il secondo
tentativo non esiste, e una freccia che lo aggira smonterebbe la regola senza
dirlo a nessuno.

**`#root` ha una larghezza esplicita** in `index.css`. Senza, il flex del body
lo stringe sul contenuto e le schermate con poco testo escono più strette
delle altre.

**Chi ha attivato «riduci movimento»** salta apertura, rotazione, coriandoli e
conteggio; `<MotionConfig reducedMotion="user">` in `main.tsx` spegne anche le
molle minori.
