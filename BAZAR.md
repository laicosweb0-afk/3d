# Bazar Marrakech — Il tuo stile

La card NFC dello showroom **Bazar Marrakech** — showroom arredamento,
Via Fratelli Zucchini 5, 48022 Lugo (RA). Si appoggia il telefono sulla card, si apre la pagina, e in
novanta secondi: una domanda sullo stile, la ruota che estrae il credito, tre
pezzi da venire a vedere, il modulo, la tessera da mostrare al banco.

È la stessa meccanica della card Woman (`WOMAN.md`), portata in uno showroom
di arredo. Le quattro regole — una domanda sola, nessun secondo tentativo, un
premio che non dipende dalla risposta, nessuna risposta sbagliata — sono
scritte in cima a `bazar/src/config/gioco.ts`.

- **Sorgente**: `bazar/` — progetto Vite a sé, con il suo `README.md`.
- **Build**: `npm run build` dentro `bazar/`, esce `dist/`.
- **Online per provarla**:

      https://laicosweb0-afk.github.io/3d/bazar/

  È la build committata in `public/bazar/`, servita da GitHub Pages a ogni
  push su `main`. Serve per provarla dal telefono e farla vedere, **non per
  le card**: è un indirizzo in prestito. Dopo ogni modifica in `bazar/`:
  `npm run build` e ricopiare `dist/` sopra `public/bazar/`.

## Il percorso

| | Schermata | Cosa succede |
|---|---|---|
| — | Apertura | «Marhaba.» in oro con «Benvenuto» sotto; poi il marchio da solo, al centro, che si compone come sul biglietto: BAZAR, il filo d'oro, MARRAKECH, SHOWROOM ARREDAMENTO · LUGO |
| 0 | **La vetrina** | «Il tuo salotto ti aspetta.»: i riquadri *Divani* e *Poltrone*, con il carosello 3D; ogni articolo si apre con le sue foto, e col cuore va fra i preferiti |
| 1 | Ingresso | «Che casa sei?» — una domanda, poi la ruota |
| 2 | La domanda | Curve morbide · Classico elegante · Scuro e deciso · Bazar e colore. Il tocco sceglie e avanza |
| 3 | Lo stile | Velluto & Oro · Classico Senza Tempo · Notte a Marrakech · Spirito del Bazar. **Senza credito** |
| 4 | La ruota | fondo scuro, «Ora vincilo» |
| 5 | Il credito | la cifra che sale, su una spesa minima |
| 6 | I pezzi | tre pezzi scelti sullo stile, da reparti diversi del negozio |
| 7 | I dati | nome e cognome, email **oppure** telefono, consenso |
| 8 | La tessera | credito, stile, codice `BAZAR-XXXX`, scadenza, **i preferiti della vetrina**; sotto, i contatti del retro del biglietto |

## La direzione: Apple, con il calore di Marrakech

*«Apple, se progettasse l'esperienza digitale di uno showroom di
arredamento marocchino contemporaneo»* — non un sito Apple con un logo
Bazar, e nemmeno un sito luxury editoriale. Apple dà la UX, lo spazio, la
gerarchia, le superfici e le interazioni; Marrakech dà la tavolozza (oro
champagne, marrone, sabbia), il calore e le fotografie.

- **Superfici** appena differenziate: fondo `#15110F`, superficie `#211B17`,
  superficie sollevata `#29221D`. La profondità viene da lì; le ombre sono
  larghe e morbide, mai nere e pesanti.
- **Vetro** quasi impercettibile — `rgba(33,27,23,.72)`, sfocatura 20px,
  bordo `rgba(242,235,221,.08)` — solo su ciò che galleggia: la barra in
  basso, i bottoni sopra le foto, il silenziatore.
- **Raggi** 20 · 24 · 28 a seconda dell'elemento.
- **Tipografia**: titoli semibold con la crenatura stretta, testo regular,
  etichette piccole in maiuscolo spaziato. Sembra interfaccia, non
  pubblicità.
- **Pulsanti** compatti (44px, «SCOPRI →»), che si stringono un poco sotto
  il dito; il pieno in oro champagne è solo per la prossima cosa da fare.
- **Movimento** fra 200 e 400ms, in uscita morbida: ogni schermata entra con
  dissolvenza, un velo di sfocatura e dieci pixel di salita; il prodotto in
  centro rientra allo stesso modo quando cambia.
- **Niente ripetizioni**: il marchio intero, a tre righe, si vede una volta
  sola, nell'apertura. Dopo, in alto c'è una barra sottile con il marchio
  su una riga (BAZAR · filo · MARRAKECH) e il silenziatore sulla stessa
  linea. La vetrina apre con un titolo grande a sinistra, «Il tuo salotto
  ti aspetta.» — la frase delle locandine — e una riga che aggiunge invece
  di ripetere: showroom a Lugo, consegne in tutta Italia.
- **Come un'app**: una barra traslucida in fondo alla vetrina con i
  preferiti e l'azione, il foglio della scheda che sale dal basso, le foto
  da scorrere, il feedback al tocco.

## La vetrina

La prima schermata dopo l'apertura, come la vetrina di Rama: prima di
chiedere qualcosa si fa vedere cosa c'è in showroom. È quasi un negozio:

- **Un riquadro per collezione**, alla maniera di Apple — angoli larghi, un
  nero appena più chiaro del fondo, titolo grande a sinistra: *Divani* e
  *Poltrone*.
- **Dentro, un carosello in 3D.** È uno scorrimento vero, agganciato al
  centro, quindi segue il dito e l'inerzia del telefono. Le copertine si
  sovrappongono come in un coverflow: quella in centro è dritta e piena, le
  vicine girate, più indietro e più scure, con il riflesso sul pavimento
  lucido. Il 3D è una funzione pura della posizione, ricalcolata a ogni
  fotogramma, come la processione dei prodotti della Bufala — ma con le foto
  vere e senza un filmato da scaricare. Sotto, come in una scheda di
  prodotto Apple: il nome, le finiture in una riga, il contatore «01 / 04»
  e un solo pulsante, «Scopri →».
- **Si tocca e si apre la scheda**, un foglio che sale dal basso come su
  iOS: le foto si scorrono di lato con i puntini e il contatore, poi il
  nome, i dettagli e il cuore **«Aggiungi ai preferiti»**.
- **I preferiti viaggiano con il contatto** e compaiono sulla tessera
  finale: in negozio si sa già cosa mostrare.

Il catalogo sta in `bazar/src/config/catalogo.ts`: collezioni, articoli,
foto (la prima è la copertina), dettagli, «Novità». Le foto in
`bazar/public/foto/catalogo/`. Per aggiungere un divano basta un elemento
in più nella lista.

## Da dove vengono i dati

**Tutto dal biglietto da visita del negozio**, e solo da lì:

- **Il marchio**: BAZAR in crema molto spaziato, il filo d'oro che sfuma ai
  capi, MARRAKECH in oro e, nell'apertura, SHOWROOM ARREDAMENTO · LUGO. È
  ricostruito in tipografia (`bazar/src/components/BazarLogo.tsx`) con le
  proporzioni del fronte: se arriva il file vettoriale, si cambia solo quello.
- **Il carattere**: Poppins, lo stesso del biglietto, in quattro pesi da
  circa 8 KB, servito da noi (licenza OFL accanto ai file). Nessuna chiamata
  esterna al caricamento.
- **I colori**, campionati dai pixel: nero `#16120F` che scende a
  `#0D0A08`, crema `#EDE7DD`, oro `#D8BC86`, grigi `#AAA59E` e `#98948D`.
  Come il biglietto, la card è tutta scura.
- **I reparti**: Salotti e poltrone · Tappeti · Lampadari · Profumi e
  casalinghi. I pezzi consigliati sono presi da qui, tre per stile da reparti
  diversi, ciascuno con il suo reparto scritto sopra.
- **I contatti**, sulla tessera finale: Fatima Zahra 328 785 3098, Salah
  389 012 7054 (si toccano e chiamano), Via Fratelli Zucchini 5, 48022 Lugo
  (RA) (apre la mappa), @bazar.marrakech9 (apre Instagram). L'email
  bazarmarrakech.snc@hotmail.com è in configurazione.

- **Dalle locandine**: il sito bazar-marrakech.com, le consegne in tutta
  Italia (tutti e due sulla tessera finale) e la nuova collezione
  «Profondo come la notte — velluto blu e oro», che diventa lo stile
  *Notte a Marrakech* e porta l'etichetta «Novità» sul divano blu.
- **Le foto**, in `bazar/public/foto/`, ritagliate senza testo né luci da
  studio, in WebP:
  - *ingresso*: il velluto da vicino con il profilo d'oro, a tutto schermo
    dietro «Che casa sei?»;
  - *Velluto & Oro*: il salotto tortora completo (poltrone tonde, tavolini
    nesting, divani);
  - *Classico Senza Tempo*: il divano capitonné ambientato, col marmo;
  - *Notte a Marrakech*: il divano chesterfield blu della nuova collezione;
  - *miniature dei pezzi*: poltrona tonda, tavolini nesting oro, divano
    tortora, chesterfield beige con il tavolino in marmo, divano blu,
    poltrona bergère blu, chesterfield nero.

  *Spirito del Bazar* resta senza foto finché non arrivano tappeti e
  lampadari: al posto della miniatura c'è l'iniziale del reparto.

Tutto sta in `NEGOZIO`, `REPARTI`, `STILI` e `PEZZI` dentro
`bazar/src/config/gioco.ts`.

## Prima dei clienti veri

1. **I nomi del catalogo** (`catalogo.ts`) sono descrittivi — Capitonné
   Tortora, Chesterfield Blu Notte… — e vanno sostituiti con quelli dei
   modelli del negozio. Se servono i prezzi, il posto è lì.
1. **I pezzi consigliati** (`PEZZI` in `gioco.ts`): i salotti sono quelli
   fotografati, ma con nomi descrittivi (Poltrona tonda capitonné,
   Divano chesterfield blu…) da sostituire con quelli del negozio; tappeti,
   lampadari e profumi sono descritti per genere, e le loro foto mancano. Vanno confermati con il negozio: un
   pezzo consigliato che in showroom non c'è è la delusione più facile da
   evitare.
2. **Gli importi della ruota** (`SPICCHI`): proposti 30/50/70 € — cinque
   spicchi da 30, tre da 50, due da 70, cioè 50% · 30% · 20%, credito medio
   44 € — su una spesa minima di 300 € (`SPESA_MINIMA`). Sono una proposta,
   da decidere con il negozio.
3. **La ruota è onesta**: le probabilità stanno nella geometria, l'estrazione
   sceglie uno spicchio a caso senza pesi, e nessuno spicchio mostra un premio
   che non può uscire. Ma un premio variabile estratto a sorte **è un concorso
   a premi** (DPR 430/2001): regolamento, cauzione, comunicazione al
   Ministero. Con lo stesso importo in tutti gli spicchi diventa una semplice
   operazione a sconto, e non c'è niente da dichiarare.
4. **La privacy**: il link nel modulo è un segnaposto. Va messo quello vero.
5. **I contatti**: senza `VITE_LEAD_WEBHOOK_URL` l'invio è simulato e non
   salva niente. Si collega come quelli di Club Rama.
6. **WhatsApp**: `WHATSAPP_NEGOZIO` è vuoto, quindi il bottone non compare.
   I due numeri sono cellulari ma il biglietto non dice che siano WhatsApp:
   se lo sono, si scrive per esempio `393890127054` (Salah).

## Il dominio

Sulle card va un indirizzo del negozio, mai quello di prova. Il negozio ha
già bazar-marrakech.com (è sulle locandine): il posto naturale è un
sottodominio, per esempio `club.bazar-marrakech.com`, con un solo CNAME e il
sito principale intatto. Su Vercel: **Add New →
Project**, Root Directory **`bazar`**, Framework **Vite**, Output **`dist`**;
poi in Domains il sottodominio e nel DNS **un solo CNAME** col valore che
mostra Vercel. Il sito principale non si tocca. Dettagli identici a
`WOMAN.md` §3.

Il QR, per la vetrina o per provarla senza card:

```bash
python3 tools/qr.py https://club.bazar-marrakech.com bazar-qr --neutro
```

## Controllo su telefono

```bash
cd bazar && npm install && npm run build && cd ..
node tools/static-server.mjs bazar/dist 8935 &
node tools/bazar-qa.mjs <cartella-screenshot>
# un percorso per stile:
RISPOSTA="Curve morbide" node tools/bazar-qa.mjs <cartella>
```

Fotografa ogni schermata su un viewport da iPhone e fallisce se la vetrina
non ha il riquadro *Divani*, se le copertine ai lati non sono girate in 3D o
quella in centro sì, se scorrendo non cambia l'articolo in centro, se la
scheda non ha foto da scorrere o il contatore non le segue, se il cuore non
resta acceso o il preferito non arriva sulla tessera, se le
percentuali della ruota non sono quelle attese, se compare uno spicchio non
previsto o un sorteggio pesato, se due spicchi uguali stanno vicini, se
il saluto non è «Marhaba.» con «Benvenuto» sotto, se il marchio compare insieme al saluto o non è al centro dello schermo, se gli stili non sono quattro, se il credito compare già nello stile, se c'è un modo
per rispondere di nuovo, se la foto dello stile o una miniatura non si
carica, se i pezzi non sono tre o vengono da un reparto
che non è sul biglietto, se sulla tessera manca un contatto del biglietto, se il modulo si invia
vuoto, se il codice è malformato o la tessera non torna con la ruota, se
Poppins non si carica, se c'è overflow orizzontale o se la pagina chiama un
indirizzo esterno.

Resta da fare un giro con la card vera, iPhone e Android: il tocco NFC e il
browser in-app non si simulano da qui.
