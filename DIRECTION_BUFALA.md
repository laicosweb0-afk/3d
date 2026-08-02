# QUELLI DELLA BUFALA — DIREZIONE CREATIVA V1

Documento di riferimento fisso per il nuovo progetto scrollytelling 3D del cliente **Quelli della bufala** (caseificio produttore di mozzarella di bufala, punto vendita reale mostrato in foto — banco gastronomia, prevalentemente formaggi con una minoranza di salumi). Nasce dalla stessa metodologia di [ART_DIRECTION.md](./ART_DIRECTION.md) (Mondial Service): niente riferimenti copiati 1:1, ogni ispirazione si traduce in una decisione operativa. Vale la stessa regola non negoziabile del brief originale: **mai inventare dati reali dell'azienda** — dove mancano, restano segnaposto espliciti finché il cliente non li conferma.

---

## 1. Posizionamento

Non un racconto di filiera in stile documentario (mungitura → filatura, come proposto inizialmente): il cliente vende principalmente il prodotto finito nel proprio punto vendita, e vuole un registro **premium/product-hero**, ispirato al linguaggio delle pubblicità di orologeria di lusso (rif. citato dal cliente: Rolex) — il prodotto trattato come un pezzo di manifattura, non come cibo di paese.

Vincolo esplicito del cliente: **niente riferimenti geografici diretti** (es. non nominare la città di produzione) — l'estetica lavora per sottrazione (tempo, gesto, materia), non per localizzazione.

Correzione rispetto alla prima ipotesi puramente astratta: due riferimenti forniti dal cliente (un post Instagram Auricchio, e una foto still-life realizzata in proprio dal cliente stesso su un altro formaggio) spostano il registro da "oggetto di lusso isolato nel vuoto" a **still life artigianale premium**: il prodotto resta protagonista assoluto, ma la scena include pochi elementi reali coerenti (ardesia, legno, olio, erbe) che lo ancorano al mondo gastronomico. Premium senza perdere che è formaggio.

---

## 2. Design tokens v1 — bozza da validare su asset reali del cliente

**Principio.** Il colore fa il lavoro che in Mondial Service faceva la neutralità: qui il fondo scuro e saturo *è* il segnale di pregio, il prodotto (sempre il tono più chiaro della scena) resta l'unico punto luminoso. Nessun oro pieno, nessun gradiente decorativo — l'accento caldo è un filo, mai una superficie.

**Palette UI**

| Token | Valore indicativo | Uso |
|---|---|---|
| `--verde-profondo` | #0E2018 (verde quasi nero) | fondo dominante di tutto il viaggio, coerente col verde già presente nel logo reale del cliente |
| `--nero` | #0A0A0A | momenti di massimo contrasto: apertura, congedo, stacchi tra scene |
| `--ottone` | #B08D57 (bronzo/ottone caldo, desaturato — non oro lucido) | accento minimo: hairline, dettagli tipografici, stato attivo della timeline. Mai su superfici ampie |
| `--latte` | #F6F1E4 (bianco caldo "latte", mai #FFF puro) | tipografia primaria e — soprattutto — riflesso/superficie del prodotto: deve restare sempre il tono più chiaro in scena |
| `--terracotta` | #A34A34 | accento secondario opzionale, dose minima, da un elemento reale del brand del cliente (packaging/etichetta) se pertinente — da confermare su asset reali, non da inventare |

**Regole d'uso**
- Il prodotto è sempre più chiaro dello sfondo: se una scena rischia di pareggiare i toni, si scurisce il fondo, mai si smorza il prodotto.
- `--ottone` non riempie mai forme: solo linee sottili, numerali, la tacca attiva di un'eventuale timeline.
- Sfondo mai nero piatto senza sfumatura: `--verde-profondo` → `--nero` in gradiente, come nei riferimenti forniti dal cliente.
- `--terracotta` resta in attesa di conferma sugli asset reali del brand (etichette, insegna) prima di essere promosso a token attivo.

**Palette materiali/scena** (dai riferimenti forniti dal cliente): ardesia nera opaca (piedistallo), legno scuro (tagliere), vetro/goccioline d'acqua sulla superficie del prodotto, verde di basilico/olio come unico tocco vegetale — set ricorrente, non improvvisato scena per scena.

---

## 3. Tipografia

- **Serif classico** per i titoli — pedigree, tradizione, coerente col registro "manifattura di pregio".
- **Sans-serif neutro** per corpo testo e UI — leggibilità, contemporaneità, evita l'effetto "menù da trattoria".
- Da evitare categoricamente: corsivi decorativi, font "rustici" a mano libera — rompono la percezione premium nello stesso modo in cui l'oro pieno la rompeva in Mondial Service.
- Font ufficiale: **input mancante** (vedi §6) — i requisiti restano gli stessi impostati per Mondial Service (buona resa numerali, variable font per peso animabile).

---

## 4. Fotografia e materia

- Luce singola drammatica, laterale, non frontale piatta.
- Sfondo scuro saturo con leggera sfumatura, mai nero uniforme.
- Set fisso e ricorrente: ardesia + legno scuro + un solo accento vegetale (basilico/olio) — la coerenza tra scene conta più della varietà.
- Prodotto sempre senza involucro plastico a vista: la mozzarella si vende fresca, superficie bagnata/lucida, non incartata.
- Mani in scena solo con abbigliamento scuro a manica lunga, gesto di presentazione (mai di lavorazione grezza — quello apparterrebbe al registro documentario scartato in §1).
- Da evitare: tovaglie a quadretti, props decorativi da sagra di paese — il legame col territorio resta sottotesto nella storia, non diventa arredo scenico.

---

## 5. Movimento

Stessa architettura tecnica già validata su Mondial Service — tutto funzione pura del progresso di scroll `p ∈ [0,1]`, camera/testi/eventi che campionano la stessa timeline, reversibile per costruzione. Calibrazione diversa nel ritmo: **più lento e cerimonioso**, un solo elemento in movimento per volta, dissolvenze minime — meno "cantiere in accelerazione", più "presentazione di un pezzo unico".

---

## 6. Input ancora mancanti (da NON inventare)

- Font ufficiale del brand, o mandato a proporne uno.
- Logo vettoriale ufficiale (quello visto in foto sul punto vendita è un cartello fisico, non un file sorgente).
- Conferma se `--terracotta` ha un riferimento reale nel brand (etichetta, insegna) o va escluso.
- Materiale fotografico/video definitivo del prodotto e del banco da usare come base per le generazioni (le foto finora condivise sono riferimenti di stile, non ancora asset finali).
- Dati aziendali reali (ragione sociale, indirizzo, contatti, eventuale certificazione) per le sezioni finali del sito.
- Decisione sulla collocazione tecnica del progetto (repo dedicata vs. nuova route in questo stesso repository) — ancora aperta.
