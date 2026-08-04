# Gli strumenti di misura

Ogni difetto vero di questo progetto l'ha trovato un numero, non un occhio.
Questi sono gli strumenti che li hanno trovati. Vanno rieseguiti alla consegna
di ogni task, non solo quando qualcosa sembra rotto — la maggior parte dei
guasti peggiori **sembrava a posto**.

## Come si eseguono

Serve il sito costruito col percorso di base e servito con supporto Range
(senza Range il video non è cercabile e lo scrub non parte — non è un difetto
del sito, è un difetto del server):

```
NEXT_PUBLIC_BASE_PATH=/3d npm run build
cp -r out <cartella-servita>/3d
node <server-con-range>          # porta 8100
node tools/misura/<strumento>.mjs
```

## Gli strumenti

| file | cosa misura | perché esiste |
|---|---|---|
| `ingresso.mjs` | dal primo byte alla prima pittura, lavori lunghi, risorse pesanti | lo scatto all'ingresso non si vede aspettando due secondi prima di misurare |
| `velocita.mjs` | **quante immagini diverse del filmato si vedono al secondo** | è la misura che ha spiegato tutto: la pagina va a 60, il film a 4 |
| `fotogrammi.mjs` | fotogrammi della pagina contro fotogrammi del filmato | separa «la pagina scorre» da «l'immagine si muove» |
| `dentro.mjs` | cosa chiediamo al filmato e cosa mostra | intercetta `currentTime` senza toccare il codice del sito |
| `scorrimento.mjs` | costo per fotogramma con **eventi di input veri** | `window.scrollTo` salta la catena di scorrimento e misura un mondo che non esiste |
| `contrasto.mjs` | ogni testo contro il fondo che ha davvero dietro | ha trovato undici testi illeggibili, tre invisibili del tutto |
| `forma.mjs` | allineamento, larghezza e sequenza dei blocchi di ogni sezione | ha trovato il sapore di template: nove sezioni, una sola forma |
| `peso.mjs` | schermate di scorrimento per sezione | ha trovato che il filmato era il 77% del sito |
| `film.mjs` | risoluzione sorgente contro pixel in pagina | ha trovato l'ingrandimento ×3,73 |
| `ordine.mjs` | il compositore dell'ordine: ricerca, stepper, messaggio | ha trovato che «olio» non trovava «all'olio»: l'apostrofo tipografico teneva la parola incollata |

## Due cose che qui non si possono misurare

- **La GPU.** In questo contenitore il browser disegna via software. La
  fluidità reale si misura solo sui dispositivi del cliente.
- **Il sito pubblicato.** Il proxy blocca `github.io`. Si misura il build
  locale servito con Range, che è un'altra cosa — e va detto, invece di
  scrivere «ho controllato il sito live».