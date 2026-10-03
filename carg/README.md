# Car.G Multiservice — la card NFC

Una card NFC sul bancone dell'officina. Si avvicina il telefono, si apre
questa pagina, e in novanta secondi il cliente risponde a una domanda, vince
un credito e lascia il contatto.

Online su **https://laicosweb0-afk.github.io/3d/carg/**

È lo stesso impianto della card di Woman Parfume Store (`../woman/`), con i
colori di Car.G. Font, struttura, animazioni e tempi sono gli stessi; a
cambiare sono la tavolozza, il marchio e tutto quello che si legge.

---

## Il percorso

| # | Schermata | Cosa fa |
|---|---|---|
| 0 | Apertura | «Hey.» · «Un minuto / **per la tua auto.**» e la firma. Tipografica, 4,4 s. |
| 1 | Ingresso | Il marchio e l'invito. Scuro. |
| 2 | Domanda | Una sola: da quanto non fa il tagliando. Quattro risposte, si tocca e si va. |
| 3 | Risposta | Cosa vuol dire quella risposta. **Senza il credito.** |
| 4 | Ruota | Otto spicchi, si gira una volta. Scuro. |
| 5 | Credito | La cifra sale da zero. Scuro. |
| 6 | Consigli | Tre lavori, scelti sulla risposta. |
| 7 | Dati | Nome e cognome, email **o** telefono, l'auto (facoltativa), consenso. |
| 8 | Chiusura | Codice, bottone che chiama, strada, servizio notturno. Scuro. |

## Le cinque regole

Stanno scritte in testa a `src/config/gioco.ts` e non si toccano senza
rimetterle in discussione:

1. **Una sola domanda.** Ogni domanda in più abbassa i completamenti.
2. **Nessun secondo tentativo.** Qui non esiste una risposta giusta: esistono
   quattro situazioni diverse.
3. **Il premio non dipende dalla risposta.** Chi è in pari e chi non fa il
   tagliando da tre anni ricevono lo stesso credito. Legarlo alla risposta
   insegnerebbe a mentire al modulo, e cambierebbe categoria di
   manifestazione a premio.
4. **Nessuno esce rimproverato.** Chi arriva qui ha già il sospetto di essere
   in ritardo. Se la pagina glielo conferma col tono del professore, chiude.
5. **La card non diagnostica.** Dice cosa si guarda di solito a quel punto e
   invita a portare l'auto. Non dice mai cos'ha l'auto di chi legge: non
   l'ha vista nessuno, e su freni e gomme una rassicurazione sbagliata è un
   problema di sicurezza, non di copy.

Le ultime due le controlla anche la passata automatica: `tools/carg-qa.mjs`
boccia la build se in quella schermata compaiono parole da rimprovero o una
diagnosi.

## Cosa si cambia, e dove

Tutto in **`src/config/gioco.ts`**. Nessun altro file va aperto.

| Cosa | Dove |
|---|---|
| Indirizzo, telefono, orari, Instagram | `OFFICINA` |
| Le quattro risposte | `FASCE` |
| Cosa si legge dopo ogni risposta | `ESITI` |
| Il listino dei lavori | `SERVIZI` |
| Quali tre lavori per quale risposta | `CONSIGLI` |
| Gli importi sulla ruota | `SPICCHI` |
| Quanto si vince e quanto spesso | `PESI` |
| Giorni di validità | `VALIDITA_GIORNI` |
| Chiedere o no l'auto | `CHIEDI_AUTO` |
| Numero WhatsApp | `WHATSAPP` |
| Il saluto e le due righe | `APERTURA.saluto` / `.riga1` / `.riga2` |

## La ruota

```
20 · 60 · 30 · 80 · 40 · 100 · 50 · 150
```

Ogni importo compare **una volta sola**, alternando i bassi e gli alti, come
su una ruota da premi vera. Si vince sempre, e sempre uno fra **20, 30 e
40 €**: il 55% delle volte 40, il 27% 30, il 18% 20. Credito medio per
cliente: **33,70 €**.

Le cifre sono tarate sull'officina: un tagliando sta fra i 150 e i 250 €,
quindi il credito vale fra il 10 e il 25% del lavoro. Su Woman erano 5/10/15
perché lì il prodotto era una fialetta.

> ⚠️ **Da sapere.** Mostrare premi che nessuno può vincere è una pratica
> commerciale ingannevole (artt. 20-23 del Codice del Consumo), e un premio
> estratto a sorte di importo variabile è un **concorso a premi** (DPR
> 430/2001): regolamento, cauzione e comunicazione al Ministero. La versione
> senza nessuno dei due problemi costa una riga ed è spiegata nel commento
> sopra `PESI`. Questa scelta è del cliente, informato.

## Il marchio

`public/logo.png` (512px) e `public/logo-piccolo.png` (192px) sono **ritagli
circolari di una foto del logo**. Il tondo è un badge, quindi il ritaglio
tondo su trasparenza è la forma giusta e sta pulito sia sul chiaro sia sullo
scuro — una versione sola basta, a differenza di Woman che ne aveva due.

Quando arriva il file originale (PNG trasparente o, meglio, vettoriale) si
sostituiscono quei due file e non si tocca nient'altro.

## I colori

Campionati dal logo, non scelti a occhio:

| Token | Valore | Cos'è |
|---|---|---|
| `--magenta` | `#2b5cf0` | Il blu del marchio (`#183CE4` nel file, schiarito perché sul fondo scuro il blu puro si spegne). Tiene il nome di Woman perché è lo stesso ruolo: il colore dell'azione. |
| `--ink` | `#0d1014` | Il nero della ghiera. |
| `--base` | `#f3f5f8` | Bianco freddo. Il crema di Woman qui sarebbe fuori posto. |
| `--acciaio` | `#c2c9d2` | Il cromo delle lettere. |

Il testo sulla pill piena è **bianco e non inchiostro**: su `#2b5cf0`
l'inchiostro fa 3,5:1 e non si legge, il bianco fa 5,4:1.

## L'apertura

**Solo tipografia, zero byte, 4,4 secondi, in due tempi:**

1. **«Hey.»** — grande, al centro, da solo.
2. **«Un minuto / per la tua auto.»**, con la firma sotto.

Il saluto è la cadenza di Woman e di Club Rama, e non è un vezzo: senza, le
due righe entrano su uno schermo nero e vuoto, e nel mezzo secondo prima che
arrivino la card sembra ancora da caricare. Esce **prima** che entri la
frase, non insieme: due testi che si dissolvono uno nell'altro al centro
dello schermo si leggono male tutti e due.

Prima c'era il reveal del marchio in video. Era bello e non funzionava come
apertura di una card NFC: cinque secondi di film prima di poter toccare
qualcosa, mezzo megabyte da scaricare, e il sospetto — in chi ha appena
avvicinato il telefono al bancone — di essere finito dentro una pubblicità
invece che in uno strumento.

Al suo posto l'impianto della creative di riferimento: titolo enorme e nero
al centro, la seconda riga nel blu del marchio, la firma in basso in
maiuscoletto spaziato. Le due righe entrano sfalsate di 140 ms — sfalsate si
leggono nell'ordine giusto, insieme si leggono come un blocco e la seconda,
che è quella colorata e quella che deve restare, si perde.

Il testo si cambia in `APERTURA.riga1` e `APERTURA.riga2`.

## La tipografia

L'impianto è quello delle creative social: **peso 800, crenatura -0.04em,
interlinea 1.0**. A colpo d'occhio si legge come un titolo e non come testo.

Il **corpo non si tocca**: i titoli più lunghi («Quando l'hai fatto») stanno
già al limite dei 342 px utili su un telefono da 390, e il peso 800 allarga
di suo — la crenatura più stretta ricompra esattamente quello che il
grassetto si prende. Chi alza il `font-size` deve rifare il giro completo
degli screenshot, perché il collaudo vede l'overflow della pagina ma non un
titolo che va a capo male.

I titoli si spezzano **sempre a mano** con `\n`, anche quelli degli esiti.

## Le dipendenze

Solo React. **Niente framer-motion**: su Woman serviva un
`MotionConfig reducedMotion="user"` che spegneva in un colpo solo le molle
della libreria, ma qui tutto il movimento è CSS e `prefers-reduced-motion`
lo gestiscono la regola globale in fondo a `index.css` e i tre componenti
con un comportamento proprio (apertura, ruota, conteggio del credito).
Tenerla solo per un contenitore che non configura più niente voleva dire
spedire un pacchetto a ogni cliente per nulla.

## Il font

Inter, servito da `public/fonts/inter.woff2` — un file solo da 47 KB, con
l'asse dei pesi da 300 a 600 dentro. Non da Google Fonts, per tre motivi:
parte senza una connessione a un terzo dominio, non manda l'IP di ogni
cliente a Google (che in Italia è una grana GDPR nota), e il file non cambia
sotto i piedi.

## Sviluppo

```bash
cd carg
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
```

La passata di controllo, sulla build vera e su un iPhone simulato:

```bash
node tools/static-server.mjs carg/dist 8937 &
node tools/carg-qa.mjs /tmp/scatti
```

Controlla: ogni importo una volta sola, i vincibili presenti, i pesi a 100,
l'apertura (il saluto per primo e da solo, poi le due righe con la seconda
colorata e la firma, e nessun video rimasto), il font di sistema in testa alla pila con Inter come
ripiego, quattro
risposte, nessun credito sulla schermata della risposta, nessun rimprovero,
nessuna diagnosi, nessuna percentuale inventata, gli importi a schermo uguali
a `SPICCHI`, il credito vinto fra i vincibili, tre lavori consigliati, il
modulo che rifiuta un nome senza cognome e pretende il consenso ma **non**
l'auto, il codice `CARG-XXXX`, il bottone che chiama il numero giusto, il
link alla mappa, la riga del notturno, gli scatti sonori, zero overflow e
**zero chiamate di rete esterne**.

## Pubblicazione

La build va copiata in `public/carg/` del sito, e va online con il merge su
`main` (GitHub Pages). Da rifare a ogni build:

```bash
cd carg && npm run build && cd ..
rm -rf public/carg && mkdir -p public/carg && cp -r carg/dist/. public/carg/
```

## Cosa manca

- **Il logo vero.** Adesso è ritagliato da una foto.
- **I prezzi.** `SERVIZI` non ne ha nessuno: non ce li hanno dati, e
  inventarli sarebbe scrivere un preventivo a nome loro.
- **Il webhook dei contatti.** Senza `VITE_LEAD_WEBHOOK_URL` l'invio è
  simulato: aspetta 800ms e scrive in console. I contatti non si salvano da
  nessuna parte finché non c'è.
- **La privacy policy.** Il link nel modulo è un segnaposto.
- **WhatsApp.** Non sappiamo se quel numero è anche WhatsApp.
- **Le percentuali di risposta.** `PERCENTUALI` resta `null` finché non c'è
  un conteggio vero.
