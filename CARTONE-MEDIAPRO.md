# Il cartone MediaPro — direzione e scaletta

Trenta secondi verticali che vendono i servizi dello studio. Non è un video
generato: è una scena tridimensionale scritta in codice, che sta in questo
repo accanto ai siti dei clienti e si renderizza con un comando.

> **Stato**: prima versione completa, guardabile e renderizzabile.
> Restano aperte le decisioni elencate in §9 — musica in testa.

---

## 1. Cosa vende, e a chi

Vende **MediaPro**, non un cliente: strategia, brand, contenuti e video,
campagne. Il pubblico è chi ha un'attività, un prodotto che regge, e una
comunicazione che non gli rende giustizia — la stessa persona che ha chiamato
per Quelli della Bufala, per MOU, per Mondial Service.

Formato: **1080×1920, 30 fotogrammi al secondo, 30 secondi, muto**. È il
taglio di Reel e TikTok, ed è anche il video che si allega a un'email o si
mette in testa alla home del sito.

**Muto per costruzione**, non per pigrizia: la stragrande maggioranza di chi
lo vedrà avrà l'audio spento. Nessuna riga del corto dipende da una voce
fuori campo. La musica, quando ci sarà, sarà un di più — mai il portante.

---

## 2. Perché non è generato con l'AI

Vale la pena scriverlo, perché è la prima domanda che farebbe chiunque
guardi questo repo — dove l'AI generativa è già in uso su altri progetti.

1. **Il budget.** Nel conto Higgsfield ci sono **8,93 crediti**. Un corto
   generato di trenta secondi sono otto o dieci spezzoni video, più le
   immagini di partenza, più i rifacimenti: fuori portata di un ordine di
   grandezza. Questo corto è costato **zero crediti**.
2. **La coerenza.** Un protagonista che deve restare identico per otto scene
   è esattamente ciò che i generatori video fanno peggio. Qui la mascotte è
   un oggetto: è identica perché è la stessa geometria.
3. **La riscrittura.** Cambiare una parola in un video generato significa
   rigenerare uno spezzone e pagare. Qui è una riga in
   `content/cartone/scaletta.ts`, e il rendering successivo la incorpora.
4. **La coerenza con il resto.** Il cubo del corto è lo stesso monolite che
   sta nella home di MediaPro (`components/mediapro/three/Monolith.tsx`).
   Chi vede il corto e poi apre il sito riconosce lo stesso oggetto.

Il costo di questa scelta, dichiarato: **niente fotorealismo**. Non ci sono
persone, pelle, cibo, luoghi. Se un giorno servisse un corto con un volto o
un piatto in campo, la strada giusta torna a essere la generazione — e questa
resta la strada per tutto ciò che è astratto, di marca, e va rifatto spesso.

---

## 3. Il protagonista: Pro

Un cubo nero con gli spigoli filettati d'oro, che a un certo punto apre un
occhio. L'occhio è un obiettivo fotografico: ghiera d'ottone, vetro scuro,
iride azzurra.

- **Non è una mascotte nuova**: è il marchio già esistente a cui si aggiunge
  un occhio. Una mascotte disegnata da zero sarebbe stata un secondo marchio
  da mantenere, con il rischio di litigare con il primo.
- **Non ha braccia né gambe**: galleggia, e due sferette d'ottone gli fanno
  da mani quando deve indicare. Bastano — in trenta secondi nessuno guarda le
  articolazioni, e ogni arto in più è animazione da mantenere.
- **Recita con l'obiettivo**: si apre, mette a fuoco stringendo l'iride,
  sbatte due volte in tutto il corto, si allunga quando si gira il video, si
  chiude sul congedo. È tutta la recitazione che serve.

Sta **sopra** il prodotto, mai di fianco: in un fotogramma alto e stretto due
oggetti affiancati escono entrambi dai bordi.

---

## 4. La scaletta

I tempi qui sotto sono quelli veri: stanno in `content/cartone/scaletta.ts` e
governano camera, oggetti e testi. Non esiste una seconda copia.

| # | Battuta | Da | A | Cosa si vede | Cosa dice |
|---|---|---|---|---|---|
| 1 | **Il prodotto al buio** | 0,0 | 3,0 | Una scatola grigia su un piedistallo, quasi al buio | «Il tuo prodotto è buono.» |
| 2 | **L'indifferenza** | 3,0 | 6,0 | Due colonne di schede scorrono dietro, veloci, senza fermarsi | «Nessuno si ferma a guardarlo.» |
| 3 | **L'arrivo** | 6,0 | 9,0 | Il cubo cade dall'alto, rimbalza, si posa, apre l'occhio | — |
| 4 | **La misura** | 9,0 | 12,5 | Una lama di luce scende sul prodotto, si chiude un riquadro, arrivano le quote | 01 — Strategia · «Prima si capisce dove andare.» |
| 5 | **L'identità** | 12,5 | 16,0 | La scatola si scurisce, prende il filo d'oro sugli spigoli e un sigillo | 02 — Brand · «Poi si costruisce un'identità.» |
| 6 | **Le luci** | 16,0 | 20,0 | Due lame di luce si accendono ai bordi, il prodotto gira, scatta il lampo | 03 — Contenuti e video · «Si accendono le luci.» |
| 7 | **La distribuzione** | 20,0 | 23,5 | Nove schede volano dal prodotto verso tre riquadri; a sinistra sale una fila di punti | 04 — Campagne · «E si porta davanti a chi conta.» |
| 8 | **L'attenzione** | 23,5 | 26,5 | Le schede della battuta 2 tornano, rallentano, si fermano e si girano verso il prodotto | «Adesso si fermano.» |
| 9 | **La firma** | 26,5 | 30,0 | Le luci si spengono, resta l'occhio acceso, compare il marchio | MediaPro · Content & Creative Studio · +39 328 591 3683 |

### Perché quest'ordine

**Il problema prima del servizio.** I primi sei secondi non parlano di noi:
parlano di un prodotto buono che nessuno guarda. È la situazione in cui si
trova chi ci chiama, e riconoscerla è ciò che tiene sullo schermo chi
altrimenti scorrerebbe oltre.

**Quattro servizi, non sette.** Il sito ne elenca sette
(`SERVICES` in `components/mediapro/content.ts`). In trenta secondi ce ne
stanno quattro detti bene, e sono i quattro nell'ordine in cui si lavora
davvero — lo stesso di `STEPS`. Social, web e ottimizzazione vivono nel sito,
che è dove va chi si è fermato a guardare.

**Le due comparse del pubblico** (battute 2 e 8) sono la stessa inquadratura
con esito opposto. È l'unica figura retorica del corto e non ha bisogno di
essere spiegata: il gesto di scorrere un feed lo fa chiunque duecento volte
al giorno.

---

## 5. Regole di regia

- **Non si taglia mai.** Nessuna dissolvenza, nessun cambio scena. Un'unica
  inquadratura continua che si sposta di poco, come nel resto dei lavori
  dello studio.
- **La camera respira, non vola.** Sono nove pose, vicine tra loro. Su un
  fotogramma verticale un movimento ampio si legge subito come camera da
  videogioco.
- **Un solo intruso.** L'unica cosa che entra in scena dall'esterno è il cubo
  che cade. Tutto il resto è il soggetto, la luce e ciò che il soggetto
  produce. Proprio perché è l'unica intrusione, pesa.
- **Il buio è metà del messaggio.** La prima battuta è sottoesposta di
  proposito: la differenza fra il prima e il dopo si vede perché il prima è
  davvero buio.
- **Nessun numero.** La fila di punti che sale nella battuta 7 non ha una
  scala e non ha una percentuale accanto. Le statistiche gonfiate sono già
  state tolte dal sito una volta (vedi la nota su `SECTORS`): non rientrano
  dalla porta del video.
- **Nessun marchio altrui.** I tre riquadri della distribuzione non portano
  i loghi di Meta, Google o TikTok. Chi lavora nel settore capisce quali
  sono; chi non lo capisce non stava comprando quella riga.

---

## 6. Tipografia, colore, suono

**Colore** — gli stessi token del sito MediaPro (`app/mediapro/mediapro.css`):
fondo `#060606`, oro `#d6b37a`, testo bianco, grigio di servizio `#b5b5b5`.
L'unico colore che non viene dal sito è l'azzurro dell'occhio e della lama di
scansione: serve un freddo, perché in una scena tutta calda l'unico segnale
tecnico deve staccare.

**Tipografia** — Hanken Grotesk, già incorporata nel repo
(`app/brand-font.css`, base64: nessuna richiesta di rete, nessun rischio che
il rendering peschi un font diverso e cambi la composizione a metà video).
Le misure dei testi sono in unità di *contenitore*: l'anteprima in una
finestra qualunque e il rendering a 1080×1920 producono la stessa
composizione, non una simile.

**Sicurezza in basso** — i testi stanno sopra il 19% inferiore del fotogramma:
sotto ci sono i comandi dell'app, non il video.

**Suono** — non c'è. Vedi §9.

---

## 7. Come si guarda e come si rende

```bash
npm run dev                       # poi: http://localhost:3000/cartone
                                  # spazio = pausa, frecce = un fotogramma
npm run build                     # necessario prima di renderizzare

node tools/cartone-render.mjs                  # il video completo
node tools/cartone-render.mjs --provini        # nove fotogrammi, uno per battuta
node tools/cartone-render.mjs --da 16 --a 20   # solo una battuta, per rivederla
node tools/cartone-render.mjs --scala 0.5      # metà risoluzione, prova rapida
```

Escono in `public/assets/cartone/`: `mediapro-30.mp4` (master H.264),
`mediapro-30.webm` (ripiego più leggero) e `mediapro-30-poster.webp`.

### Come funziona il rendering

Non è una registrazione dello schermo. Per ogni fotogramma il tempo viene
**posizionato** (`window.__cartone.seek(t)`), si chiede un disegno, si
fotografa. Il risultato è esattamente a 30 fotogrammi al secondo anche su una
macchina che ne disegna uno al secondo, e non c'è modo che un rallentamento
finisca dentro al file.

Questo impone una regola a tutta la scena, ed è la ragione per cui è scritta
com'è: **niente si accumula**. Nessuna animazione che avanza di un pezzetto a
ogni fotogramma, nessun `Date.now()`, nessun numero casuale non seminato.
Tutto è funzione pura del tempo `t` — la stessa disciplina che negli altri
progetti del repo rende il viaggio reversibile con lo scroll.

Costo macchina misurato, senza scheda grafica (grafica via software):
**circa 1,1 s per fotogramma, cioè una ventina di minuti** per i trenta
secondi. Prima era nove volte tanto: il rendering disegnava la scena tre
volte per ogni fotogramma consegnato, per essere sicuro che fosse pronta.
Ora la disegna una volta e glielo chiede esplicitamente.

---

## 8. Le quattro dimensioni

Come da [PROTOCOLLO.md](./PROTOCOLLO.md) §2, ogni scelta non ovvia dichiara
cosa è costata.

| Scelta | Cosa dà | Cosa costa |
|---|---|---|
| Scena in codice invece che generata | Zero crediti, coerenza perfetta, testi riscrivibili | Niente fotorealismo: nessun volto, nessun cibo, nessun luogo |
| Cubo a spigolo vivo invece che stondato | Il filo d'oro ha dove appoggiarsi: senza, un cubo nero sparisce nel fondo nero | Meno morbidezza, meno «mascotte simpatica» |
| Testi nel DOM invece che nella scena 3D | Lettere nitide anche dopo la ricompressione di Instagram | Non possono passare dietro agli oggetti |
| Ombre reali e riflessi procedurali | Il metallo esiste, l'oro brilla | ~1,1 s per fotogramma in rendering; in anteprima nel browser è fluido |
| Quattro servizi invece di sette | Ogni battuta ha il tempo di essere capita | Tre servizi restano fuori dal video |

Accessibilità: il corto è muto e i suoi testi sono nel DOM, quindi leggibili
da uno screen reader nell'anteprima. Il file video consegnato, come ogni
video, resta da sottotitolare a monte della pubblicazione — vedi §9.

---

## 9. Decisioni aperte

Nessuna di queste è un dettaglio tecnico: sono scelte da fare, non problemi
da risolvere.

1. **Musica.** Non c'è, e non si inventa: serve una traccia con licenza
   commerciale verificata. Finché non c'è, il corto funziona muto — è stato
   scritto per farlo.
2. **Il claim finale.** Adesso la firma dice nome, tagline e numero. Se lo
   studio ha una frase sua, va lì e vale più del numero.
3. **Recapiti.** Compare solo il telefono, perché è l'unico recapito reale in
   `components/mediapro/content.ts`. Email, Instagram e LinkedIn entrano nel
   corto lo stesso giorno in cui entrano nel sito, non prima.
4. **La versione 16:9.** Si progetta bene ora, si paga cara dopo: la
   composizione è verticale per costruzione (la mascotte sta *sopra* il
   prodotto). Se serve l'orizzontale, si aggiunge un secondo insieme di pose
   della camera — non si riquadra il verticale.
5. **Sottotitoli aperti.** I testi sono già in campo, ma non sono
   sottotitoli: se il corto avrà una voce, servirà una passata di sottotitoli
   veri.
6. **I lavori veri.** Il corto non mostra un solo lavoro reale dello studio.
   Una decima battuta con tre fermi immagine dei progetti — Bufala, Mondial,
   AureaClub — porterebbe la prova dentro al video, al prezzo di cinque
   secondi in più e del permesso dei clienti.
