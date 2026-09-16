# Club Rama — la landing della card NFC

Pagina dedicata alla card NFC fisica di **Rama Ceramiche** (showroom di
piastrelle a Lugo, RA). Il cliente appoggia il telefono sulla card, si apre
questo link, parte l'animazione di apertura e poi il mini-quiz di quattro
domande che si chiude con un codice sconto da mostrare in negozio o ricevere
via email.

- **File**: `public/club/index.html` — un solo file, 165 KB, invariato
  rispetto alla versione approvata.
- **Zero dipendenze esterne**: nessun font da Google, nessuna immagine
  separata, nessuno script di terze parti. La foto dello showroom è dentro il
  CSS in base64 e i caratteri sono quelli di sistema (SF Pro su iPhone). La
  pagina funziona anche senza rete dopo il primo caricamento.
- **Tutto client-side**: il form finale **non salva niente e non manda
  nessuna email**. Il codice `RAMA70-XXXX` è generato a caso nel browser.
  Collegare un CRM o l'invio email è un passo successivo, da decidere a parte.

Sta in `public/` come il portfolio (`PORTFOLIO.md`): è una cartella statica
che viaggia insieme al repo senza entrare nel sito di Mondial Service.
L'export di Next la copia così com'è.

## 1. Anteprima gratuita, senza account (già pronta)

Appena questo branch è unito su `main`, il workflow `deploy.yml` pubblica la
pagina su GitHub Pages:

    https://laicosweb0-afk.github.io/3d/club/

Serve per provarla dal telefono vero prima di comprare o puntare il dominio.
Non è l'indirizzo definitivo: la card deve puntare al sottodominio.

## 2. Il sottodominio su Vercel

Questi passi richiedono il tuo account Vercel e il pannello DNS del dominio:
non sono automatizzabili da qui.

### 2.1 Il progetto Vercel

Su [vercel.com](https://vercel.com) (registrazione con l'account GitHub, il
piano Hobby basta e costa zero), **Add New → Project**, importa
`laicosweb0-afk/3d` e imposta:

| Campo | Valore |
|---|---|
| Framework Preset | **Other** |
| Root Directory | **`public/club`** |
| Build Command | vuoto (spunta "Override" e lascialo vuoto) |
| Output Directory | **`.`** |
| Install Command | vuoto (Override) |
| Production Branch | `main` |

Con Root Directory su `public/club` Vercel ignora tutto il resto del repo:
non fa la build di Next, pubblica solo quel file. `public/club/vercel.json`
è già nel repo e fissa queste impostazioni insieme agli header della
risposta (la pagina non viene messa in cache dai browser, così se un giorno
la aggiorni la card mostra subito la versione nuova). Accanto c'è anche un
`robots.txt` che tiene la pagina fuori da Google: si raggiunge toccando la
card, non cercandola, e una pagina orfana a nome Rama Ceramiche in giro per
l'indice non serve. Se la vuoi indicizzabile, cancella quel file.

Al primo deploy Vercel dà un indirizzo tipo `club-rama.vercel.app`: da lì la
pagina è già online e provabile.

### 2.2 Il dominio

In **Project → Settings → Domains** aggiungi `club.ramaceramiche.it`
(da confermare: il dominio esatto e il sottodominio li scegli tu — questo è
solo la proposta). Vercel risponde con il record da creare.

Nel pannello DNS del dominio aggiungi **un solo record**:

    Tipo    CNAME
    Nome    club
    Valore  cname.vercel-dns.com

Copia il valore **esatto** che ti mostra Vercel in quella schermata: negli
ultimi anni ha cambiato più volte l'host di destinazione, quindi vale quello
a schermo, non quello scritto qui.

Il sito principale non si tocca: i record del dominio nudo
(`ramaceramiche.it`) e di `www` restano dove sono e continuano a puntare
dove puntano adesso. Un CNAME su `club` riguarda solo `club`.

Dopo la propagazione (di solito pochi minuti, fino a un'ora) Vercel emette
da sé il certificato HTTPS. Quando la spunta verde compare in Domains, il
link è quello da scrivere sulla card.

### Se invece preferisci Netlify

Stessa logica: **Add new site → Import an existing project**, base directory
`public/club`, nessun comando di build, publish directory `public/club`.
Poi **Domain management → Add a domain**, e nel DNS un CNAME `club` →
`<nome-sito>.netlify.app`. Vale lo stesso discorso: il sito principale
resta intatto.

## 3. Controllo su telefono

Lo script ripercorre tutte e sette le schermate su un viewport da iPhone e
salva uno screenshot per ciascuna:

```bash
node tools/static-server.mjs public 8932 &
node tools/club-mobile.mjs <cartella-screenshot>
```

Fallisce con codice 1 se una schermata non è quella attesa, se il credito non
arriva a 70 €, se il codice finale è malformato, se c'è overflow orizzontale
o se la pagina prova a chiamare qualcosa fuori dal server locale.

Resta comunque da fare un giro sulla card fisica vera, con un iPhone e un
Android: il tocco NFC e il browser in-app (quello che si apre dal lettore
NFC di sistema) sono l'unico pezzo che non si può simulare da qui.

## 4. Due dettagli grafici, da decidere

Trovati durante il controllo, **non corretti** perché il file va tenuto com'è
finché non dici il contrario:

- Nella schermata di benvenuto il marchio a tessere dorate accanto a "Rama
  Ceramiche" non si vede: le regole delle tessere sono scritte per
  `.rama-mark .tiles`, ma lì il contenitore è `.welcome-mark`, quindi non le
  prende. Nelle intestazioni delle schermate successive e nell'apertura il
  marchio si vede correttamente.
- Per lo stesso motivo la moneta dorata della schermata del credito esce
  piena: il marchio scuro che dovrebbe starci dentro non viene disegnato.

Si sistemano aggiungendo `rama-mark` alle due `class` nell'HTML, senza
toccare colori, testi né logica. Dimmi se lo faccio.

- La pagina non dichiara nessuna icona, quindi il browser chiede
  `/favicon.ico` e prende un 404: in Safari resta l'iconcina generica e,
  se qualcuno aggiunge il link alla schermata Home, l'icona è vuota. Su una
  card che si tocca e si chiude subito conta poco, ma si risolve con un
  `apple-touch-icon.png` accanto al file.
