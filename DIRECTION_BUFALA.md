# QUELLI DELLA BUFALA — DIREZIONE CREATIVA V1

Documento di riferimento fisso per il nuovo progetto scrollytelling 3D del cliente **Quelli della bufala** (caseificio produttore di mozzarella di bufala, punto vendita reale mostrato in foto — banco gastronomia, prevalentemente formaggi con una minoranza di salumi). Nasce dalla stessa metodologia di [ART_DIRECTION.md](./ART_DIRECTION.md) (Mondial Service): niente riferimenti copiati 1:1, ogni ispirazione si traduce in una decisione operativa. Vale la stessa regola non negoziabile del brief originale: **mai inventare dati reali dell'azienda** — dove mancano, restano segnaposto espliciti finché il cliente non li conferma.

---

## 1. Posizionamento

Non un racconto di filiera in stile documentario (mungitura → filatura, come proposto inizialmente): il cliente vende principalmente il prodotto finito nel proprio punto vendita, e vuole un registro **premium/product-hero**, ispirato al linguaggio delle pubblicità di orologeria di lusso (rif. citato dal cliente: Rolex) — il prodotto trattato come un pezzo di manifattura, non come cibo di paese.

Vincolo esplicito del cliente: **niente riferimenti geografici diretti** (es. non nominare la città di produzione) — l'estetica lavora per sottrazione (tempo, gesto, materia), non per localizzazione.

Correzione rispetto alla prima ipotesi puramente astratta: due riferimenti forniti dal cliente (un post Instagram Auricchio, e una foto still-life realizzata in proprio dal cliente stesso su un altro formaggio) spostano il registro da "oggetto di lusso isolato nel vuoto" a **still life artigianale premium**: il prodotto resta protagonista assoluto, ma la scena include pochi elementi reali coerenti (ardesia, legno, olio, erbe) che lo ancorano al mondo gastronomico. Premium senza perdere che è formaggio.

---

## 2. Il logo reale — confinamento

Il cliente ha fornito il logo storico: bufalo araldico in salto (tratto verde/rosso), claim "prodotti tipici italiani" tricolore, e un lockup su tavola di legno con scritta corsiva incisa "Quelli della bufala". È un logo dichiaratamente rustico/tradizionale — in tensione diretta con la direzione premium/minimale scelta per il sito (corsivo decorativo, legno chiaro, rosso pieno: tutti elementi che §3 e §4 di questo documento indicano esplicitamente da evitare nel resto del sito).

**Decisione del cliente, con lo stesso precedente già adottato su Mondial Service** (§2.1 di [ART_DIRECTION.md](./ART_DIRECTION.md), dove i colori navy/oro del logo restavano confinati al logo stesso): il **logo resta esattamente com'è**, mostrato integro solo nei punti in cui deve essere riconoscibile come marchio (apertura, footer, eventuale congedo). Non genera il sistema grafico del resto del sito.

- Il **verde** del logo è il riferimento reale che ha guidato `--verde-profondo` (§3) — non è un'invenzione, è calibrato (scurito/desaturato) su quel verde.
- Il **rosso** resta confinato al marchio: non genera token, non si ripete altrove nel sito.
- **La targhetta di legno esce dal progetto** (decisione del cliente, dopo averla vista a video): il marrone chiaro e la texture del legno inciso sono fuori contesto rispetto al resto. Il logo che il sito usa è quindi in due pezzi, entrambi estratti dal vettoriale ufficiale:
  - `logo-marchio` — il bufalo e il claim "prodotti tipici italiani", a colori originali;
  - `logo-wordmark` — la scritta "Quelli della bufala" **con le lettere originali del marchio**, senza la tavola, ripulita dai graffi che simulavano il legno e ricolorata nel latte della palette. Non è un font simile scelto a caso: sono esattamente quelle lettere.
- ~~Il sito adotta un marrone scuro da legno/noce come materiale secondario~~ — **rientrato**: senza la targhetta non c'è più niente da far "atterrare", e il cliente ha confermato di voler restare sul verde profondo. Il token `--noce-scuro` resta definito ma inutilizzato; da rimuovere se non trova un impiego reale.
- La rigenerazione dei due pezzi è automatica: `node tools/bufala-logo.mjs`. Lo strumento documenta quali tracciati del PDF sono cosa, e come vengono separati i graffi dalle lettere.
- ⚠️ **Da ricontrollare col cliente**: il posizionamento della firma nella pagina (marchio + scritta, in coda al documento) non è ancora confermato — segnalato "non è proprio così" senza specificare cosa cambiare. Non toccare finché non arriva l'indicazione precisa: rischio di rifare il lavoro due volte.
- ~~Il file ricevuto è un raster~~ — **risolto**: il cliente ha fornito il sorgente vettoriale ufficiale. In `public/assets/brand-bufala/`: `logo-vettoriale.pdf` (sorgente), `logo-full.png` (logo originale completo, per riferimento), e i due pezzi in uso — `logo-marchio` e `logo-wordmark`, in SVG (sorgente) e PNG a 4x. **Il sito carica i PNG**: le lettere sono un tracciato con migliaia di punti e l'SVG pesa quasi dieci volte tanto a parità di resa (303 KB contro 88 KB).

---

## 3. Design tokens v1 — bozza da validare su asset reali del cliente

**Principio.** Il colore fa il lavoro che in Mondial Service faceva la neutralità: qui il fondo scuro e saturo *è* il segnale di pregio, il prodotto (sempre il tono più chiaro della scena) resta l'unico punto luminoso. Nessun oro pieno, nessun gradiente decorativo — l'accento caldo è un filo, mai una superficie. Il verde profondo è il colore dominante del sito, confermato due volte dal cliente: nessun marrone, nessun legno.

**Palette UI**

| Token | Valore indicativo | Uso |
|---|---|---|
| `--verde-profondo` | #0E2018 (verde quasi nero) | fondo dominante di tutto il viaggio, calibrato sul verde reale del logo |
| `--nero` | #0A0A0A | momenti di massimo contrasto: apertura, congedo, stacchi tra scene |
| `--noce-scuro` | #2B1D14 (marrone legno/noce scuro) | **non più in uso**: serviva a far atterrare la targhetta di legno, uscita dal progetto (§2). Resta definito in attesa di un impiego reale, altrimenti va rimosso |
| `--ottone` | #B08D57 (bronzo/ottone caldo, desaturato — non oro lucido) | accento minimo: hairline, dettagli tipografici, stato attivo della timeline. Mai su superfici ampie |
| `--latte` | #F6F1E4 (bianco caldo "latte", mai #FFF puro) | tipografia primaria e — soprattutto — riflesso/superficie del prodotto: deve restare sempre il tono più chiaro in scena |
| `--terracotta` | #A34A34 | accento secondario opzionale, dose minima — da confermare su asset reali del brand, non da inventare |

**Regole d'uso**
- Il prodotto è sempre più chiaro dello sfondo: se una scena rischia di pareggiare i toni, si scurisce il fondo, mai si smorza il prodotto.
- `--verde-profondo` resta il colore che definisce il "mondo" del sito: nessun altro colore compete con lui su superfici ampie.
- `--ottone` non riempie mai forme: solo linee sottili, numerali, la tacca attiva di un'eventuale timeline.
- Sfondo mai nero piatto senza sfumatura: `--verde-profondo` → `--nero` in gradiente, come nei riferimenti forniti dal cliente.
- `--terracotta` resta in attesa di conferma sugli asset reali del brand (etichette, insegna) prima di essere promosso a token attivo.

**Palette materiali/scena** (dai riferimenti forniti dal cliente): ardesia nera opaca (piedistallo), legno scuro (tagliere), vetro/goccioline d'acqua sulla superficie del prodotto, verde di basilico/olio come unico tocco vegetale — set ricorrente, non improvvisato scena per scena.

---

## 4. Tipografia

**Font pairing definito** (sostituisce il precedente "input mancante" — restano al massimo due famiglie in tutto il sito, mai di più).

| Ruolo | Font | Fallback |
|---|---|---|
| Display/titoli | **Canela** | Fraunces |
| Corpo/UI | **Neue Haas Grotesk** | Inter |

Nota pratica: Canela e Neue Haas Grotesk sono font commerciali a licenza — da verificare se il cliente possiede già la licenza o va acquistata prima del build. Fraunces e Inter sono i fallback gratuiti (Google Fonts, self-hostabili) da usare in sviluppo finché la licenza non è confermata — **non si assume l'acquisto senza conferma**.

**Regole d'uso per elemento**

- **Hero (H1)**: Canela, peso medium, letter-spacing da −1% a −2%, line-height 90–95%, massimo 6–8 parole per riga — deve avere l'impatto di una copertina di rivista.
- **Titoli di sezione (H2)**: Canela, più piccolo dell'hero, mai bold, molto spazio intorno.
- **Sottotitoli (H3)**: Neue Haas Grotesk peso 500, pulito, minimale.
- **Corpo testo**: Neue Haas Grotesk peso 400, larghezza massima ~70 caratteri per riga, line-height generoso.
- **Bottoni**: Neue Haas Grotesk peso 500, niente maiuscolo automatico, molto discreti — un brand di lusso non urla mai.
- **Navigazione**: Neue Haas Grotesk peso 500, corpo piccolo, spaziatura ampia tra le voci.
- **Numerali**: Neue Haas Grotesk medium.
- Da evitare categoricamente: corsivi decorativi, font "rustici" a mano libera — rompono la percezione premium nello stesso modo in cui l'oro pieno la rompeva in Mondial Service. Il corsivo del logo (§2) è l'unica eccezione ammessa, e resta confinato al logo.
- **Wordmark/titoli ampi e tagliati ai bordi del frame** (rif. Loewe): coerente con la regola hero sopra — tecnica tipografica, non di palette, resta valida anche sul fondo scuro della nostra direzione.
- **Microtesto/nav in sans tracciato, maiuscolo, corpo piccolo** (rif. Bang & Olufsen): confermato dalla regola di navigazione sopra.

**Filosofia**: la tipografia è parte della narrazione, non un'etichetta — titoli editoriali larghi, spazio bianco generoso, mai sezioni compresse. Ogni sezione deve leggersi come una pagina di rivista di lusso stampata. La gerarchia si costruisce con dimensione, peso, spaziatura e layout — mai cambiando famiglia di font a ogni elemento.

---

## 5. Fotografia e materia

- Luce singola drammatica, laterale, non frontale piatta.
- Sfondo scuro saturo con leggera sfumatura, mai nero uniforme.
- Set fisso e ricorrente: ardesia + legno scuro + un solo accento vegetale (basilico/olio) — la coerenza tra scene conta più della varietà.
- Prodotto sempre senza involucro plastico a vista: la mozzarella si vende fresca, superficie bagnata/lucida, non incartata.
- Mani in scena solo con abbigliamento scuro a manica lunga, gesto di presentazione (mai di lavorazione grezza — quello apparterrebbe al registro documentario scartato in §1).
- Da evitare: tovaglie a quadretti, props decorativi da sagra di paese — il legame col territorio resta sottotesto nella storia, non diventa arredo scenico.

---

## 6. Movimento

Stessa architettura tecnica già validata su Mondial Service — tutto funzione pura del progresso di scroll `p ∈ [0,1]`, camera/testi/eventi che campionano la stessa timeline, reversibile per costruzione. Calibrazione diversa nel ritmo: **più lento e cerimonioso**, un solo elemento in movimento per volta, dissolvenze minime — meno "cantiere in accelerazione", più "presentazione di un pezzo unico".

---

## 7. Input ancora mancanti (da NON inventare)

- ~~Font ufficiale del brand~~ — **definito** (§4): Canela (display) + Neue Haas Grotesk (corpo/UI), fallback gratuiti Fraunces + Inter. Da verificare: possesso della licenza commerciale dei font primari prima del build finale.
- ~~Versione vettoriale del logo~~ — **ricevuta** (§2): PDF sorgente + PNG + SVG salvati in `public/assets/brand-bufala/`.
- Conferma se `--terracotta` ha un riferimento reale nel brand (etichetta, insegna) o va escluso.
- Materiale fotografico/video definitivo del prodotto e del banco da usare come base per le generazioni (le foto finora condivise sono riferimenti di stile, non ancora asset finali).
- ~~Dati aziendali reali (ragione sociale, indirizzo, contatti)~~ — **ricevuti** (biglietto da visita): ragione sociale FOOD SERVICE S.A.S. di Marra Salvatore & C., sede legale Via Fondovalle Rubicone 11, 47030 Borghi (FC); sede operativa/vendita ingrosso e dettaglio presso C.A.R.R. di Rimini, Via Emilia Vecchia 75, 47923 Rimini (RN); tel. +39 392 0220924; email info@quellidellabufala.it; sito www.quellidellabufala.it. **Confermato**: è lo stesso posto del punto vendita al banco già mostrato in foto — quell'indirizzo è l'unico da usare nella sezione contatti del sito. La foto del banco però resta esclusa dagli asset (§5, decisione già presa: inquadratura troppo larga/statica per lo scrollytelling) — servirà materiale più ravvicinato dello stesso punto vendita se si vuole un reality-window sul negozio reale.
- ~~Orari di apertura~~ — **ricevuti** (scheda Google Business del cliente, 04/08): **lunedì e martedì 04:30–09:00, mercoledì e venerdì 05:00–09:00, giovedì / sabato / domenica chiuso.** Non è un dettaglio di servizio: apre prima dell'alba e chiude alle nove, chiuso nel fine settimana. È un orario da mercato all'ingrosso, e cambia a chi si rivolge il sito (§ architettura, movimenti «Per chi» e «La visita»). Da riconfermare col cliente: la scheda Google mostra «Suggerisci nuovi orari», quindi Google stesso non li dà per certi.
- ⚠️ **Discrepanza sull'indirizzo del punto vendita, da sciogliere prima di toccare la mappa.** Biglietto da visita: *Via Emilia Vecchia 75, 47923 Rimini (RN)*. Scheda Google del cliente: *Via Vecchia Emilia 75, 47922 Santa Giustina RN*. Cambiano l'ordine delle parole, il CAP e la località (Santa Giustina è una frazione di Rimini). La query della mappa nel sito è costruita sulle nostre stringhe: se non coincidono con quelle della scheda Google, il segnaposto può cadere altrove. Va usata la forma della scheda Google, che è quella che Maps risolve con certezza — ma prima il cliente deve confermarla.
- Pagina Facebook attiva («Quelli della Bufala», oltre 590 follower) — da decidere se collegarla dal sito.
- La scheda Google ha un pulsante «Sito web» già collegato: quando il dominio nuovo sarà pronto, va aggiornato lì. Oggi punta con ogni probabilità al vecchio indirizzo che il cliente ha dichiarato superato.
- Eventuale certificazione di prodotto (es. DOP) — ancora da confermare, non presente sul materiale ricevuto finora.
- Decisione sulla collocazione tecnica del progetto (repo dedicata vs. nuova route in questo stesso repository) — ancora aperta.
