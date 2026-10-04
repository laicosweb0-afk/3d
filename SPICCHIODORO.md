# Spicchio d'Oro — la card NFC

La pagina che si apre avvicinando il telefono alla card del locale
**Spicchio d'Oro — Pizza · Pub · Cucina**, Via San Savino 50, Fusignano (RA).
Intro «Hey.» → «Benvenuto da Spicchio d'Oro», poi la home con menù, serate,
dove siamo e la prenotazione su WhatsApp con il messaggio già scritto.

- **File**: `public/spicchiodoro/index.html` (HTML + CSS + JS in un file solo)
  e `public/spicchiodoro/img/`. Nessuna build, nessuna libreria: solo Google
  Fonts (Playfair Display, Inter).
- **Online** dopo un push su `main`:

      https://laicosweb0-afk.github.io/3d/spicchiodoro/

  È l'indirizzo da scrivere sulla card NFC. Si può aprire un foglio diretto
  aggiungendo `#prenota`, `#menu`, `#serate` o `#dove`.

## Aggiornare le serate

In cima allo script, l'array `SERATE`:

```js
{ data: '2026-10-22', titolo: 'Paella e sangria', dettagli: '23€ a persona, …' },
```

Le serate passate spariscono da sole il giorno dopo. Senza serate future
compare «Nuove serate in arrivo: le date escono su Instagram.»

## Il menù

L'array `MENU` nello script: una voce per scheda (foto di copertina, piatti
`[nome, descrizione, quantità]`, gallerie, link). Solo i piatti forniti dal
locale, senza prezzi.

## Le foto

In `img/`, larghe al massimo 1200 px, JPG qualità 70. Se una foto manca la
pagina non si rompe: al suo posto resta un fondo caldo con la scritta
«Foto in arrivo · nome.jpg». Per aggiungerne una basta copiarla in `img/` con
il nome giusto:

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

## Da completare

- Nomi e prezzi delle pizze: per ora la scheda Pizze rimanda al sito.
- Il link al PDF del menù: per ora va alla home di spicchiodoro.it.
- Le serate del 7 e 16 ottobre e del 27 novembre non hanno orario né descrizione.

## Controllo

Provata su viewport iPhone 13 (Playwright): intro, home, i quattro fogli,
chiusura con la X, col tasto indietro e trascinando giù, `prefers-reduced-motion`
(salta l'intro), nessuno scroll orizzontale, nessun errore in console.
Il messaggio WhatsApp esce così:

    Ciao Spicchio d'Oro! Vorrei prenotare un tavolo per 4 persone, giovedì 8 ottobre alle 21:00. Grazie!
    Ciao Spicchio d'Oro! Vorrei prenotare un tavolo per 2 persone, venerdì 16 ottobre alle 20:30, per la serata "Spettacolo brasiliano". Grazie!

Resta da fare il giro con la card vera su iPhone e Android, su rete mobile.
