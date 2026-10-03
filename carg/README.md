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
| 0 | Apertura | Il reveal del marchio (5 s) e, sopra, «Un minuto per la tua auto.» |
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
| La frase dell'apertura | `APERTURA.frase` |

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

Il reveal del marchio fornito dal cliente, tagliato a **5,0 secondi** — il
punto in cui il tondo è frontale e acceso; dopo si inclina e non serve più.

La frase entra a **3,9 s**, cioè *mentre il marchio è ancora a schermo*, non
dopo. Metterla in coda allungherebbe l'attesa di un secondo e mezzo: chi
avvicina il telefono al bancone non sta guardando un film, e ogni secondo
prima della prima schermata è un secondo in cui può rimettere il telefono in
tasca. Tutta l'apertura dura 6,8 s.

Due formati, e **l'MP4 per primo**: il browser prende il primo che sa
leggere e ne scarica uno solo. L'MP4 (H.264, 253 KB) serve a iOS, che è la
metà abbondante di chi userà la card; il WebM (VP9, 285 KB) copre i Chromium
compilati senza H.264 — fra cui quello del collaudo, che altrimenti non
riuscirebbe a verificare l'apertura.

Il video è **muto e `playsInline`**: su iOS un video con audio non parte da
solo, e senza `playsInline` Safari lo aprirebbe a tutto schermo nel suo
player mangiandosi la pagina. Se non parte — rete lenta, autoplay negato,
formato rifiutato — la frase entra lo stesso ai suoi 3,9 s: meglio
un'apertura senza filmato che una card che non si apre.

Per rifare il taglio da una nuova versione del filmato:

```bash
FF=node_modules/@ffmpeg-installer/linux-x64/ffmpeg
$FF -i sorgente.mp4 -t 5.0 -an -c:v libx264 -profile:v main -pix_fmt yuv420p \
   -crf 29 -preset slow -movflags +faststart -r 24 carg/public/apertura.mp4
$FF -i sorgente.mp4 -t 5.0 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 \
   -deadline good -cpu-used 2 -pix_fmt yuv420p -r 24 carg/public/apertura.webm
```

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
il filmato dell'apertura (presente, muto, inline, e che scorra davvero) con
la frase che entra sopra e non dopo, Inter caricato e usato, quattro
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
