# Club Aurea — la card NFC del mondo Woman / Aurea

La stessa cosa di Club Rama, per l'altro mondo: una **card NFC** che il
cliente appoggia al telefono e che apre l'esperienza di `club-aurea/`.

«La stessa cosa» alla lettera: design, font e animazioni sono quelli della
pagina pubblicata su `/3d/rama/` — crema e oro, i font di sistema, le stesse
molle, la stessa apertura in due tempi. A cambiare sono il gioco e tre soli
dettagli visivi (il marchio, i due stati in più delle risposte, le onde NFC
nella tessera), ognuno spiegato nel README di `club-aurea/`.

Il cliente entra, sente il profumo, appoggia il telefono sulla card. Si apre
«Hey. **Hai sentito il profumo?**», poi tre note da indovinare sulla fragranza
che ha nel naso, la ruota che gli lascia 15 € di credito, e il modulo con nome
e cognome e un contatto. Alla fine ha una tessera con un codice, e la
profumeria ha un nome.

- **Sorgente**: `club-aurea/` — progetto Vite a sé, con il suo `README.md`
  che spiega come cambiare fragranze, domande e premi.
- **Build**: `npm run build` dentro `club-aurea/`, esce `dist/`.
- **Online per provarla**, accanto a quella di Rama:

      https://laicosweb0-afk.github.io/3d/aurea/

  Come `/3d/rama/`, è una scorciatoia: rimanda a `/3d/club-aurea/`, dove sta
  la build committata in `public/club-aurea/`. Serve per provarla dal telefono
  e per farla vedere, **non per le card**: è un indirizzo in prestito, e il
  giorno che si cambia hosting muore. Sulle card va un dominio nostro.

  La build in `public/` non si aggiorna da sé: dopo aver cambiato qualcosa in
  `club-aurea/`, `npm run build` e poi ricopiare `dist/` sopra
  `public/club-aurea/`, altrimenti l'indirizzo mostra la versione vecchia.
- **Tutto client-side**: il modulo finale **non salva niente e non manda
  nessuna email** finché non gli si dà un indirizzo a cui spedire. Il codice
  `AUREA-XXXX` è generato a caso nel browser.

## 1. La card al posto del QR

Sul coupon c'era un QR. Al suo posto va la card NFC, e non è un cambio di
grafica:

- **Il QR va inquadrato.** Serve la fotocamera, la luce giusta, la mano ferma
  e un codice stampato grande almeno un paio di centimetri. In profumeria,
  con le mani occupate e le luci puntate sui banchi, è un gesto che una
  persona su tre non porta a termine.
- **La card si appoggia e basta.** Il telefono apre la pagina da solo, senza
  che nessuno debba spiegare come si fa.
- **Il coupon si sgualcisce, la card no.** Un quadrato bianco piegato in
  tasca smette di funzionare; una tessera in PVC no.
- **La card resta.** Il coupon si butta dopo l'uso, la card torna sul banco e
  serve al cliente dopo.

Dove un coupon di carta avrebbe avuto il quadrato, nella tessera finale ci
sono le onde dell'NFC (`src/components/NfcWave.tsx`). Il codice resta scritto
in chiaro, perché è quello che la cassa digita.

**Il QR però non sparisce del tutto.** Serve ancora per due cose: provare la
pagina senza avvicinare il telefono, e la vetrina o un volantino, dove chi
passa inquadra da fuori. Si genera con lo stesso strumento di Club Rama:

```bash
pip install segno
python3 tools/qr.py https://club.<dominio> club-aurea-qr --neutro
```

Per la stampa vale la versione `--neutro`: il nero pieno su bianco è quello
che i lettori sbagliano meno.

## 2. Cosa va scritto sulla card

L'indirizzo sulla card è per sempre: il chip NFC si riscrive, ma le card già
in giro no. Vale quindi un **dominio nostro** — per esempio
`club.<dominio-della-profumeria>` — e mai l'indirizzo di prova dell'hosting,
che muore il giorno che si cambia fornitore.

## 3. Metterla online

Identico a Club Rama (vedi `CLUB-RAMA.md`, sezione 2), con due differenze:
la cartella da pubblicare è `club-aurea/dist` e il comando di build va
eseguito, perché qui non c'è un file HTML già pronto.

Su [vercel.com](https://vercel.com), **Add New → Project**, importa il repo e
imposta:

| Campo | Valore |
|---|---|
| Framework Preset | **Vite** |
| Root Directory | **`club-aurea`** |
| Build Command | `npm run build` |
| Output Directory | **`dist`** |
| Production Branch | `main` |

Con Root Directory su `club-aurea` Vercel ignora il resto del repo e non fa
la build di Next. Poi **Project → Settings → Domains**, si aggiunge il
sottodominio, e nel pannello DNS **un solo record CNAME** con il valore esatto
che Vercel mostra in quella schermata. Il sito principale non si tocca.

La pagina nasce con `noindex`: si raggiunge toccando la card, non cercandola.

## 4. Controllo su telefono

```bash
cd club-aurea && npm install && npm run build && cd ..
node tools/static-server.mjs club-aurea/dist 8934 &
node tools/club-aurea-qa.mjs <cartella-screenshot>
```

Ripercorre tutte le schermate su un viewport da iPhone, fotografa ognuna e
fallisce con codice 1 se il punteggio del quiz non torna, se il credito non è
15 €, se il modulo accetta un nome senza cognome o si lascia inviare senza
nessun contatto, se il codice finale è malformato, se c'è overflow
orizzontale, se la ruota non suona o se la pagina chiama qualcosa fuori dal
server locale.

Resta da fare un giro sulla card fisica vera, con un iPhone e un Android: il
tocco NFC e il browser in-app che si apre dal lettore di sistema sono l'unico
pezzo che non si simula da qui.

## 5. Due cose da decidere prima dei clienti veri

**I 15 € a tutti.** La ruota mostra anche un 100 € che, con l'esito fissato,
non può uscire. Mostrare un premio che nessuno può vincere è una pratica
commerciale ingannevole ai sensi del Codice del Consumo, e i concorsi a premi
hanno regole loro (DPR 430/2001). Si risolve con una riga — esito casuale, o
il 100 tolto dagli spicchi — ed è scritto per esteso nel README di
`club-aurea/`.

**La privacy.** Il link all'informativa nel modulo è un segnaposto. Da lì
passano nome, email e telefono di persone vere: va messo l'indirizzo giusto
prima che la card esca dal cassetto.
