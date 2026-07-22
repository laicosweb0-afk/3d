# MONDIAL SERVICE — DIREZIONE V3 (riallineamento identità)

Recepisce l'aggiornamento di direzione del cliente (2026-07-19), arrivato durante la milestone M1. Integra e in parte sostituisce le sezioni narrative di [CONCEPT_V2](./CONCEPT_V2.md) e [ART_DIRECTION](./ART_DIRECTION.md); l'architettura tecnica non cambia.

## 1. L'identità corretta

**Mondial Service è un'impresa edile premium**, non uno studio di architettura né una startup di design. Comunica: esperienza, precisione, qualità costruttiva, trasformazione degli spazi, fiducia, artigianalità contemporanea. Non comunica: "concept", visioni astratte, architettura da foglio bianco.

Conseguenza narrativa: **il tema centrale è la trasformazione, non il disegno.** Il visitatore non guarda nascere un progetto: assiste alla trasformazione di uno spazio reale, eseguita a regola d'arte.

Cosa cambia e cosa resta:
- **Resta** la sequenza visiva (punto 6 del cliente): foglio bianco → griglia CAD → volumi → maquette → materiali → villa reale → interni reali → portfolio reale. Ma ora la si legge col lessico del **cantiere**: la griglia è il *rilievo e progetto esecutivo* (ciò che un'impresa seria fa prima di toccare un muro), non lo sketch di un architetto. La scena S02 si rinomina "Il rilievo".
- **Cambia il copy**: eliminati "Prima di ogni casa c'è un foglio bianco" e "La tua, iniziamo a disegnarla". Nuovo asse: *trasformare / eseguire / consegnare*.
- **Resta** tutta la meccanica di regia (piano sequenza, transizioni-firma, reversibilità): sono proprio le scene "anatomiche" (parete, stratigrafia) a raccontare la qualità esecutiva — il cuore del nuovo posizionamento.

## 2. Il nuovo copy (applicato in `content/copy.ts`)

| Momento | Copy |
|---|---|
| Hero | **"Trasformiamo spazi in case da vivere."** · sub: Ristrutturazioni · Impianti · Servizi |
| S03 costruzione | "Ogni trasformazione ha un metodo." — *Cantiere, tempi e qualità esecutiva, sotto un'unica regia.* |
| S05 volo | "Dal primo sopralluogo alla consegna delle chiavi." |
| S07 soggiorno | "Ristrutturazioni complete." — *Il tuo spazio, trasformato e consegnato finito. Un unico interlocutore, dall'inizio alla fine.* |
| S08 parete | "La qualità che non vedrai mai. Noi sì." — *Isolamento, struttura, impianti: il lavoro a regola d'arte è quello che non si vede.* |
| S09 stratigrafia | "Sotto ogni pavimento, un lavoro fatto per durare." |
| S10 bagno | "Bagni chiavi in mano." — *Tu scegli i materiali, noi consegniamo finito.* |
| S12 congedo | "Hai visto una trasformazione." — *La prossima può essere casa tua.* |

Regole: nessun numero o claim inventato (anni di esperienza, cantieri: si aggiungono solo con dati reali del cliente); tono essenziale, mai enfatico; il "tu" resta.

## 3. I capitoli narrativi (applicati in `lib/scenes.ts`)

I quattro atti diventano i capitoli indicati dal cliente; gli ultimi due capitoli vivono nelle sezioni dopo il viaggio:

| Capitolo | Dove |
|---|---|
| 1 · La Visione | S01–S02 (silenzio, rilievo) |
| 2 · Trasformare gli Spazi | S03–S07 (costruzione, materia, volo, soglia, soggiorno) |
| 3 · La Qualità Invisibile | S08–S09 (parete, stratigrafia) |
| 4 · Il Benessere Quotidiano | S10–S12 (bagno, finestra, congedo) |
| 5 · Materiali Selezionati | Sezione post-viaggio (M4) |
| 6 · Le Opere Realizzate | Sezione post-viaggio (M4), con slider prima/dopo ridisegnato |

Sono capitoli narrativi, non un catalogo: nel viaggio si raccontano solo i servizi che definiscono il brand; il resto confluisce in una sezione finale **"Tutti i servizi"**, minimale (una lista tipografica, stile indice).

## 4. Portfolio — prima/dopo come principio

Lo slider prima/dopo si mantiene come **principio di interazione** (il gesto che rivela la trasformazione), completamente ridisegnato nel linguaggio del sito: hairline verticale antracite su fotografia a piena larghezza, maniglia minimale, etichette tipografiche discrete, trascinamento con la stessa fisica morbida dello scroll. Nessun elemento del design originale (bottoni verdi, pill, badge) sopravvive. Specifica di dettaglio in M4.

## 5. Direzione artistica — confermata

Palette neutra quiet-luxury già in vigore (nessun oro, nessun metallico): bianco caldo, antracite, grigi, accento minerale `--pietra`. Il lusso nasce da proporzioni, ritmo, materiali, luce, tipografia, animazioni. Il 3D grigio attuale è dichiaratamente placeholder (M1): l'evoluzione verso ambienti realistici ispirati alle foto reali è la milestone M2, come da architettura.

## 6. L'obiettivo identitario

Il sito non deve somigliare ad Apple, a Cula o a un template Awwwards: i riferimenti si studiano per i principi. I tratti che rendono il sito *inconfondibilmente Mondial Service*:
1. **La trasformazione come regia** — la lama prima/dopo (S04) e le scene anatomiche: nessun altro le ha, perché sono il mestiere del cliente reso visibile.
2. **Il metro** — la timeline dei capitoli nel linguaggio del logo.
3. **Gli interni veri** — gli ambienti 3D ricostruiti dalle fotografie dei lavori realizzati, con il portfolio ad accostarli.
4. **Il lessico del cantiere** nel copy, dove i competitor premium usano quello del design.
