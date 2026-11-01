# Bazar Marrakech — il negozio online

Il sito e-commerce di **Bazar Marrakech**: direzione *Apple × luxury
editorial*. Avorio dominante, nero caldo per la barra in alto e le sezioni
scelte, champagne solo nei filetti; Cormorant Garamond per i titoli, Inter
per testi e prezzi. Le foto sono solo quelle originali del negozio.

- **Sorgente dei contenuti**: `tools/bazar-shop/dati.mjs` — negozio, orari,
  set, chiave Web3Forms, WhatsApp, documenti legali.
- **Generatore**: `node tools/bazar-shop/build.mjs` riscrive le pagine in
  `public/bazar-shop/` (HTML statico, un indirizzo leggibile per pagina).
  Dopo ogni modifica a `dati.mjs` va rilanciato.
- **Stile e comportamento** (scritti a mano, condivisi da tutte le pagine):
  `public/bazar-shop/assets/style.css` e `assets/app.js`.
  `assets/catalogo.js` è generato: non si tocca.
- **Caratteri** in `public/bazar-shop/fonts/` (licenza OFL accanto).
  Nessuna richiesta esterna al caricamento.
- **Anteprima** dopo il merge su `main`:
  `https://laicosweb0-afk.github.io/3d/bazar-shop/`

## Le pagine

| Indirizzo | Pagina |
|---|---|
| `/` | Home: hero col Salotto Tortora, «Il piacere di sentirsi a casa», nuova collezione «Profondo come la notte», le collezioni, i materiali, lo showroom |
| `/collezioni/` | Catalogo dei set |
| `/collezioni/capitonne/`, `/collezioni/chesterfield/` | Pagine categoria (una per collezione presente nei dati) |
| `/salotti/<slug>/` | Pagina prodotto |
| `/borsa/` | Borsa → I tuoi dati → Riepilogo → Richiesta inviata |
| `/showroom/`, `/contatti/` | Showroom e contatti |
| `/privacy/`, `/cookie/`, `/condizioni/` | Segnaposto onesti, `noindex` finché il testo non c'è |

I vecchi indirizzi della prima versione (`#/p/…`, `#/negozio`, `#/borsa`)
vengono reindirizzati.

## La hero della home: scroll-driven

La porta del Bazar si apre, la camera entra nello showroom e si posa su un
salotto, guidata dallo scroll: niente click.

- **Come funziona**: una sequenza di fotogrammi WebP disegnata su `<canvas>`
  (`assets/hero.js`), legata allo scroll con GSAP ScrollTrigger (pin + scrub)
  e Lenis per la rotella. Su iPhone lo scroll a dito resta quello nativo di
  Safari. GSAP, ScrollTrigger e Lenis sono serviti dal sito
  (`assets/vendor/`), senza CDN.
- **Fotogrammi**: `assets/hero/mobile/` (720×1280) e `assets/hero/desktop/`
  (1600×900), più `hero-poster-*.webp` (immagine fissa) e `manifest.json`.
  Si caricano prima l'immagine fissa e i primi 8 fotogrammi, poi il resto a
  priorità bassa.
- **Riduci movimento**: nessuna sequenza, nessun pin, solo l'immagine fissa
  con il titolo.
- **Header**: trasparente sopra la hero, nero caldo dopo. Al posto della
  borsa c'è l'icona WhatsApp (la borsa resta raggiungibile dal menu e dal piè
  di pagina).

### Caricare il video vero

```bash
bash tools/bazar-shop/hero-frames.sh video-orizzontale.mp4 120 [video-verticale.mp4]
node tools/bazar-shop/build.mjs
```

Con un solo video orizzontale la versione mobile è il ritaglio centrale: per
restare nitida serve un sorgente almeno 4K. `QUALITA=72` (default) regola la
compressione.

**Oggi i fotogrammi sono un segnaposto** (`"segnaposto": true` nel
manifest): una sequenza costruita con le foto vere dell'ingresso e dello
showroom (`tools/bazar-shop/hero-segnaposto.py`), solo per provare la
meccanica.

### WhatsApp

`WHATSAPP` in `dati.mjs` è vuoto: **[NUMERO WHATSAPP DA CONFERMARE]**. Finché
manca, il pulsante apre WhatsApp col messaggio già scritto e il destinatario
da scegliere. Il messaggio è in `WHATSAPP_MESSAGGIO` **[TESTO DA CONFERMARE]**.

## Il catalogo: solo set

Ci sono solo le composizioni **fotografate insieme**: Salotto Tortora e
Salotto Beige. Le foto dei pezzi singoli restano nella cartella del progetto
NFC (`bazar/public/foto/`) e non sono in vendita.

Per aggiungere un set: un elemento in `SET` dentro `dati.mjs`, foto in
`public/bazar-shop/img/`, poi `node tools/bazar-shop/build.mjs`. I campi
vuoti non compaiono:

- `prezzo: null` → «Prezzo su richiesta»; con un numero compare ovunque e la
  borsa calcola il totale indicativo.
- `configurazioni: [{ nome, prezzo }]` → scelta della composizione in pagina
  prodotto e in borsa.
- `misure: [['Divano', 'L 240 × P 95 × H 80 cm'], …]` → blocco Dimensioni.
- `composizioneFoto` è ciò che si vede nella foto, dichiarato come tale.

Filtri (colore) e ordinamento (prezzo) compaiono da soli quando i set sono
almeno quattro e, per l'ordinamento, quando c'è almeno un prezzo.

## Lo studio Bazar: come vengono trattate le foto prodotto

`tools/bazar-shop/studio.py` scontorna il prodotto dalla foto originale (in
locale, con rembg) e lo rimette in scena sempre allo stesso modo:

- un fondale avorio-sabbia che sfuma dal muro al pavimento;
- un'ombra di contatto morbida;
- la stessa linea di terra e gli stessi margini per ogni prodotto.

Il prodotto non viene ritoccato: forma, colori e tessuti restano quelli della
foto. Le immagini escono in `public/bazar-shop/img/studio/`.

```bash
pip install "rembg[cpu]"
python tools/bazar-shop/studio.py <foto> <nome> --formato 4:3   # o 4:5 per poltrone e sedie
```

Uso nel sito:
- **copertine** (card, borsa) e **prime foto della galleria**: la versione in studio;
- **foto ambientate**: restano come sono, per raccontare l'ambiente (hero,
  «Il piacere di sentirsi a casa», galleria);
- **«Profondo come la notte»**: il divano blu scontornato su fondo scuro, con
  una luce calda e l'ombra sotto (`.stage-dark`).

Cosa funziona e cosa no:
- **Funziona** con le foto da studio, su fondo uniforme e con il prodotto
  intero: divano Tortora (entrambe le viste), poltrona tonda, salotto Tortora
  completo, divano blu.
- **Non funziona** con le foto scattate in negozio con altro arredo intorno:
  il Salotto Beige (sul marmo, il secondo divano si perde) e le due sale da
  pranzo, che hanno sedie tagliate dall'inquadratura, la bandiera e il leone
  sul tavolo e altri mobili dietro. Queste restano come foto ambientate,
  finché non arrivano scatti adatti.

### Come fotografare un prodotto per lo studio

1. Il prodotto **intero** nell'inquadratura, con un po' d'aria attorno:
   gambe e piedi compresi.
2. **Niente sul prodotto**: niente bandiere, statue, centrotavola o
   cartellini del prezzo.
3. Dietro, il più possibile **una parete o un telo uniforme**; niente altri
   mobili che si sovrappongono.
4. Luce **morbida e uniforme** (finestra laterale o giornata coperta), senza
   flash diretto.
5. Tre scatti per prodotto: **tre quarti**, **frontale**, **un dettaglio**
   (velluto, cuciture, gambe). Per i set, uno scatto con **tutti i pezzi
   insieme**.
6. La foto **originale** dal telefono, non uno screenshot o una foto
   inoltrata su WhatsApp (perde risoluzione).

## La richiesta d'ordine

Nessun pagamento online. La borsa resta salvata sul dispositivo. Il cliente
inserisce nome, cognome, email, telefono e note, controlla il riepilogo e
invia. Il codice `BM-XXXX` è casuale crittografico (32 simboli, circa un
milione di combinazioni). Data e ora sono nel testo della richiesta.

- **Con `WEB3FORMS_KEY`** compilata: la richiesta arriva per email a
  bazarmarrakech.snc@hotmail.com, con codice, data, salotti, composizione,
  prezzi, totale indicativo, dati del cliente e note; rispondendo all'email
  si risponde al cliente. Sullo schermo compare «Abbiamo ricevuto la tua
  richiesta…». Se l'invio fallisce lo dice e propone email o telefono.
  - Chiave: su web3forms.com, inserendo **bazarmarrakech.snc@hotmail.com**
    (la chiave arriva lì), poi incollarla in `dati.mjs` e rigenerare.
- **Senza chiave** (com'è ora): il pulsante dice «Invia via email», apre il
  programma di posta del cliente con la richiesta già scritta e la pagina
  finale dice che manca l'ultimo passaggio. Il sito non dichiara mai una
  ricezione che non è avvenuta.

Limiti dichiarati:

- **Email di conferma al cliente**: sul piano gratuito di Web3Forms la
  risposta automatica non c'è. Il cliente vede la conferma a schermo e può
  salvarne una copia; per l'email automatica serve il piano a pagamento o un
  piccolo server.
- **Codice senza doppioni garantiti**: nel browser la collisione è
  improbabile ma non impossibile. La garanzia assoluta richiede un registro
  lato server.

## Da completare (informazioni commerciali)

1. Prezzi, composizioni vendibili e misure dei set.
2. Gli altri set: elenco e foto delle composizioni complete.
3. Foto in alta risoluzione: le attuali sono larghe al massimo 1200 px (la
   hero su schermi da 1920 px viene ingrandita). Il Salotto Beige ha una
   sola foto.
4. Numeri ufficiali e WhatsApp. Il biglietto riporta 328 785 3098 e
   389 012 7054 (in uso); il cartello sulla porta 347 570 5464 e
   327 652 6025 (non inseriti).
5. P.IVA e dati societari per il piè di pagina (`NEGOZIO.piva`).
6. Testi di privacy, cookie e condizioni di vendita / recesso, da far
   redigere: poi `pronto: true` in `LEGALI`.
7. Dominio: con `bazar-marrakech.com` si aggiornano `BASE_URL` in
   `build.mjs`, canonical, sitemap e un `robots.txt` proprio (quello del repo
   appartiene a un altro sito).

## Controlli

Con il server statico avviato (`node tools/static-server.mjs public 8941`),
gli script di verifica Playwright usati per questa versione controllano:

- tutte le pagine a 390, 430, 768, 1024, 1440 e 1920 px: errori JS,
  richieste fallite, overflow, immagini rotte, un solo H1, target piccoli;
- i link interni;
- il percorso completo borsa → dati → riepilogo → invio, nei tre casi:
  senza chiave, invio riuscito e invio fallito, con Web3Forms simulato e
  nessuna email reale inviata.
