# Spicchio d'Oro — la card NFC

La pagina che si apre avvicinando il telefono alla card del locale
**Spicchio d'Oro — Pizza · Pub · Cucina**, Via San Savino 50, Fusignano (RA).
Intro «CIAO!» → «Benvenuto da» → il logo del locale su fondo oro e nero, poi la home con menù, serate,
dove siamo e la prenotazione su WhatsApp con il messaggio già scritto.

- **File**: `public/spicchiodoro/index.html` (HTML + CSS + JS in un file solo)
  e `public/spicchiodoro/img/`. Nessuna build, nessuna libreria: Google
  Fonts (Playfair Display per i titoli, Inter come riserva) e **Gaglio** per
  i testi, servito da `public/spicchiodoro/fonts/` (vedi `fonts/LEGGIMI.txt`).
- **Online** dopo un push su `main`:

      https://laicosweb0-afk.github.io/3d/spicchiodoro/

  È l'indirizzo da scrivere sulla card NFC. Si può aprire un foglio diretto
  aggiungendo `#prenota`, `#menu`, `#serate` o `#dove`.

## Aggiornare le serate

In cima allo script, l'array `SERATE`:

```js
{ data: '2026-10-22', titolo: 'Paella e sangria', dettagli: '23€ a persona, …' },
```

`foto` è facoltativa: il riquadro della serata ritagliato dalla locandina
(`img/serate/`), mostrato a sinistra nella card; la locandina della serata
più vicina diventa anche la foto della box «Serate» in home. Le serate passate
spariscono da sole il giorno dopo. Senza serate future
compare «Nuove serate in arrivo: le date escono su Instagram.»

## Il menù

L'array `MENU` nello script, trascritto dal menù del locale (il PDF con pizze,
impasti, cucina, dolci, cocktail, birre, bevande e bar, coperto e nota
allergeni). Ogni scheda ha la foto di copertina e una o più sezioni; ogni
piatto è `[nome, descrizione, prezzo, { q, c, t }]` (`c: true` è il cuore
del locale, `t` i formati delle bevande). Per nascondere tutti i prezzi:
`MOSTRA_PREZZI = false`.

Quando cambia il menù del locale (o le specialità fuori menù del mese), si
aggiorna qui.

## Le foto

In `img/`, larghe al massimo 1200 px, JPG qualità 70, con i nomi della
tabella qui sotto. Finché una foto manca la pagina non mostra segnaposti: la
box del menù e le copertine delle schede usano una foto vera del locale di
riserva (forno, fuoco, sala, bancone), le gallerie nascondono le foto
assenti. Con `?foto` in fondo all'indirizzo si vede quale file manca.
Per aggiungerne una basta copiarla in `img/` con il nome giusto:

```bash
convert originale.jpg -auto-orient -strip -interlace Plane -quality 70 -resize '1200x>' img/nome.jpg
```

| File | Soggetto | Stato |
|---|---|---|
| forno.jpg | pizza davanti alla bocca del forno a legna | ✅ |
| fuoco.jpg | fuoco esterno sotto la cappa | ✅ |
| sala.jpg | parete verde, neon «Let your light shine» | ✅ |
| veranda.jpg | veranda, marmo nero e oro | ✅ |
| bancone.jpg | **solo la parte alta**: scritta luminosa e lampadario, nessun volto | ✅ |
| burrata.jpg | pizza crudo e burrata dall'alto (box del menù, Pizze) | da avere |
| crudo.jpg | pizza crudo, grana, rucola | da avere |
| tagliere.jpg | tagliere e gnocco fritto | da avere |
| spatzle.jpg | spätzle verdi | da avere |
| arrosticini.jpg | arrosticini e patate | da avere |
| burger.jpg | burger con bollino | da avere |
| gnocchi.jpg | gnocchi panna e noci | da avere (non ancora usata: il piatto non è nel menù fornito) |
| nutella.jpg · crema.jpg · tiramisu.jpg · bigne.jpg · bigne-sera.jpg | dolci | da avere |
| cocktail.jpg | cocktail in coppa | da avere |
| logo.jpg · icona.jpg | il logo circolare (intro, testata, chiusura) e l'icona della pagina | ✅ |
| intro.jpg | lo sfondo a onde oro dell'intro | ✅ |
| serate/*.jpg | i cinque riquadri della locandina «Eventi da non perdere» | ✅ |

## I tavoli

La pagina dello staff per prenotazioni e sala, separata dalla card (non è
linkata da nessuna parte e non è indicizzata):

    https://laicosweb0-afk.github.io/3d/spicchiodoro/tavoli/

Da aprire sul tablet o sul telefono del locale e aggiungere alla schermata
Home. File unico: `public/spicchiodoro/tavoli/index.html`.

- **La piantina**: una scheda per sala (Sala, Veranda, Esterno). Ogni tavolo ha
  il colore del suo stato all'ora scelta: verde libero, tratteggio oro
  prenotato entro un'ora, oro prenotato ora, arancio in ritardo (15 minuti
  dopo l'orario), rosso al tavolo. «Adesso» segue l'orologio; il cursore
  serve a guardare come sarà la sala alle 21:30. Dopo mezzanotte, fino alle 5,
  conta ancora come la serata prima.
- **Tocco su un tavolo**: chi c'è e chi arriva, «Sono arrivati», «Tavolo
  libero», «Prenota questo tavolo», e «Siedi ora» con il numero di persone per
  chi entra senza prenotazione.
- **+ Prenotazione**: nome, telefono, persone, giorno, ora, quanto si ferma
  (2 ore di default), note. «Incolla il messaggio WhatsApp» compila da solo
  persone, giorno, ora e serata dal messaggio della card (e il nome, se si
  copia la riga di WhatsApp con il mittente). «Trova un tavolo libero» sceglie
  il più piccolo che basta, libero per tutta la durata; «Scegli in piantina»
  permette di unire più tavoli per i gruppi. Se un tavolo è già preso lo dice.
- **Dalla lista** si apre ogni prenotazione: arrivati, non venuti, disdetta,
  chiama, «Conferma su WhatsApp» (messaggio già scritto al cliente).
- **Modifica piantina**: trascina i tavoli, tocca per cambiare nome, posti,
  forma, misure, sala; aggiungi tondi, quadrati, lunghi e arredi (bancone,
  forno, ingresso…). La piantina iniziale è **di esempio**: va ridisegnata una
  volta come il locale vero.
- **⚙︎**: nomi delle sale, durata di default, backup.

**Dove stanno i dati**: sul dispositivo (localStorage del browser), niente
server e niente account. Quindi un dispositivo = un registro: meglio usarne
uno solo (il tablet alla cassa). «Scarica backup» / «Carica backup» spostano
piantina e prenotazioni su un altro dispositivo. Se servirà vedere le stesse
prenotazioni da più telefoni insieme, il passo dopo è un piccolo database
condiviso (es. Supabase) al posto del localStorage: il resto della pagina non
cambia.

## Da completare

- I file del font Gaglio (licenza web, WOFF2) in `fonts/`: finché mancano si vede Inter.

- Facebook: il menù dice «@Spicchio d’Oro», manca l'indirizzo della pagina.
- Le serate non hanno un orario d'inizio: la locandina non lo dice.

## Controllo

Provata su viewport iPhone 13 (Playwright): intro, home, i quattro fogli,
chiusura con la X, col tasto indietro e trascinando giù, `prefers-reduced-motion`
(salta l'intro), nessuno scroll orizzontale, nessun errore in console.
Il messaggio WhatsApp esce così:

    Ciao Spicchio d'Oro! Vorrei prenotare un tavolo per 4 persone, giovedì 8 ottobre alle 21:00. Grazie!
    Ciao Spicchio d'Oro! Vorrei prenotare un tavolo per 2 persone, venerdì 16 ottobre alle 20:30, per la serata "Spettacolo brasiliano". Grazie!

Resta da fare il giro con la card vera su iPhone e Android, su rete mobile.
