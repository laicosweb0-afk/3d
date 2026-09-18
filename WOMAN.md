# Woman — The Fragrance Experience

La pagina che si apre quando qualcuno annusa la fialetta senza nome e cerca di
capire cos'è. Il progetto sta in `woman/`; questo file dice come si mette
online e come si arriva alla pagina dal mondo fisico.

> **Smell · Guess · Share** — annusa, indovina, condividi.
> Woman Parfume Store · Via San Martino 1, Sant'Agata sul Santerno (RA)

Tutto quello che c'è dentro viene dal documento strategico *The Fragrance
Experience* (settembre 2026). Le quattro regole che l'hanno disegnata — una
domanda sola, nessun secondo tentativo, un premio che non dipende mai dalle
risposte, e un risultato che non è mai una sconfitta — sono scritte in cima a
`woman/src/config/gioco.ts`, dove chi tocca il codice le trova prima di
cambiare qualcosa.

- **Sorgente**: `woman/` — progetto Vite a sé, con il suo `README.md` che
  spiega come cambiare la fragranza ospite, i testi, i premi e le fialette
  consigliate.
- **Build**: `npm run build` dentro `woman/`, esce `dist/`.
- **Online per provarla**:

      https://laicosweb0-afk.github.io/3d/woman/

  È la build committata in `public/woman/`. Serve per provarla dal telefono e
  per farla vedere, **non per la produzione**: è un indirizzo in prestito, e
  il giorno che si cambia hosting muore.

  La build in `public/` non si aggiorna da sé: dopo aver cambiato qualcosa in
  `woman/`, `npm run build` e poi ricopiare `dist/` sopra `public/woman/`.

## 1. Come ci si arriva: QR e NFC, ognuno dove conviene

Il documento parla di QR, e per il cartoncino dentro il pacco ha ragione lui.
Ma le due strade non si escludono, e la scelta è una questione di conti:

| | Dove | Perché lì |
|---|---|---|
| **QR** | sul cartoncino della fialetta e su quello della busta | Va in **ogni pacco**: stampato costa zero, un tag NFC costa 15–50 centesimi più la scrittura uno per uno. Su mille ordini sono 150–500 €. |
| **NFC** | sulla card che resta sul banco del negozio | Si appoggia il telefono e si apre: niente fotocamera, niente luce giusta, niente mano ferma. Una card sola, riusata da tutti, scritta una volta. |

Portano alla stessa pagina. Il QR si genera con lo strumento che c'è già:

```bash
pip install segno
python3 tools/qr.py https://<dominio-della-pagina> woman-qr --neutro
```

Per la stampa vale la versione `--neutro`: il nero pieno su bianco è quello
che i lettori sbagliano meno.

**Un solo codice alla volta**, dice il documento: cartoncino e busta non si
incontrano mai, perché due codici insieme creano esitazione.

## 2. Cosa va scritto sul cartoncino

L'indirizzo è per sempre: i cartoncini già stampati non si riscrivono. Vale
quindi un **dominio della profumeria**, e mai l'indirizzo di prova
dell'hosting.

## 3. Metterla online

Su [vercel.com](https://vercel.com), **Add New → Project**, importa il repo e
imposta:

| Campo | Valore |
|---|---|
| Framework Preset | **Vite** |
| Root Directory | **`woman`** |
| Build Command | `npm run build` |
| Output Directory | **`dist`** |
| Production Branch | `main` |

Con Root Directory su `woman` Vercel ignora il resto del repo e non fa la
build di Next. Poi **Project → Settings → Domains**, si aggiunge il
sottodominio, e nel pannello DNS **un solo record CNAME** con il valore esatto
che Vercel mostra in quella schermata. Il sito principale non si tocca.

La pagina nasce con `noindex`: si raggiunge annusando, non cercando.

## 4. Controllo su telefono

```bash
cd woman && npm install && npm run build && cd ..
node tools/static-server.mjs woman/dist 8934 &
node tools/woman-qa.mjs <cartella-screenshot>
```

Ripercorre tutte le schermate su un viewport da iPhone, fotografa ognuna e
fallisce se una delle regole è stata rotta: se le famiglie non sono quattro,
se torna la freccia per rispondere di nuovo, se le percentuali della ruota non
tornano con quelle attese, se compare uno spicchio non previsto, se il credito
compare già nella rivelazione, se le fialette non tornano con il credito, se
la rivelazione tratta la risposta come un errore, se compare una percentuale
senza conteggio, se i consigli non sono tre, se sparisce il livello, se il
font non è Inter o non si carica, o se la pagina chiama un indirizzo esterno.

Resta da fare un giro sul cartoncino vero, con un iPhone e un Android: la
scansione e il browser in-app sono l'unico pezzo che non si simula da qui.

## 5. Cosa manca per essere completi

La pagina copre il **percorso della fialetta**: il cliente che annusa,
risponde, scopre e ritira. Del documento restano fuori, e vanno costruiti con
un pezzo di server:

- **Il percorso della busta.** La seconda pagina — «Ciao Giulia, Marco ha
  annusato questa fragranza e ha pensato che dovessi sentirla anche tu» — con
  il nome indicato alla scansione, il codice univoco per busta e l'avviso di
  trasparenza: chi ha regalato saprà che è stata aperta, e va detto prima.
  *Detto prima è complicità; scoperto dopo è sorveglianza.*
- **La percentuale «il 62% ha risposto come te».** Serve un endpoint che
  conti le risposte per famiglia. Finché non c'è, in `gioco.ts` resta
  `PERCENTUALI = null` e la riga non compare: un numero inventato sarebbe
  l'unica bugia di tutta l'esperienza, per giunta dentro la schermata che
  deve dare fiducia.
- **La sequenza email al mittente**: apertura, scelta, ordine. Al mittente
  torna solo il nome che ha scritto lui e l'evento — **mai** l'email di chi
  riceve.
- **I livelli nel profilo.** Naso curioso → allenato → esperto: la pagina sa
  com'è andata oggi, ma il livello cresce a ogni edizione e quella memoria
  vive altrove.

## 6. Due cose da decidere prima dei clienti veri

**La ruota è un concorso a premi.** Gli spicchi sono tutti premi veri — sei da
15 €, tre da 10, due da 5, nessun 100 € che non può uscire — e le percentuali
vengono dalla geometria, non da un peso nascosto nel codice. Ma un premio
estratto a sorte, di importo variabile, **è un concorso a premi ai sensi del
DPR 430/2001**: regolamento, cauzione, comunicazione al Ministero. Un premio
uguale per tutti e garantito no, è una semplice operazione a sconto. Per
tornare lì basta riempire `SPICCHI` di soli 15 in `gioco.ts`: la ruota gira
uguale e non c'è niente da dichiarare. È una scelta commerciale, e va fatta
sapendo cosa costa.

**La privacy.** Il link all'informativa nel modulo è un segnaposto. Da lì
passano nome, email e telefono di persone vere: va messo l'indirizzo giusto
prima che il primo cartoncino esca dal negozio.
