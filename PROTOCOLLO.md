# Protocollo operativo — Quelli della bufala

Questo non è un brief. È il documento che rileggo **all'inizio di ogni task**,
prima di scrivere una riga. Il brief dice *cosa* costruiamo; questo dice *come
si lavora*, e vale identico dalla prima task all'ultima.

Se una decisione contraddice questo documento, la decisione è sbagliata — o il
documento va cambiato esplicitamente, discutendolo, non scavalcandolo.

---

## 1. Le tre regole non negoziabili

**Nessuna generazione senza permesso e senza prezzo.**
Mai lanciare una generazione — immagine, video, upscale, qualsiasi cosa costi
crediti — senza aver prima detto **il costo esatto** e aver ricevuto un sì.
Se un tool non espone il costo prima dell'esecuzione, va detto che non lo
espone e va chiesto comunque. Il cliente è dichiaratamente tirchio: la
modalità risparmio è il default, non l'eccezione.

**Nessun dato aziendale inventato.**
Ciò che il cliente non ha confermato non esiste. Non si riempie un buco con
qualcosa di plausibile: si lascia il buco e si segnala. Orari, indirizzi,
certificazioni, numeri, provenienze, anni di attività — tutto va da
`content/bufala/company.ts`, e lì entra solo ciò che è stato confermato.

**I recapiti superati non ricompaiono.**
`info@quellidellabufala.it` e `www.quellidellabufala.it` sono stati sostituiti
dal cliente. Restano in `company.ts` marcati come obsoleti solo perché nessuno
li rimetta per distrazione.

---

## 2. La regola delle quattro dimensioni

Ogni modifica viene valutata contemporaneamente su:

**estetica · prestazioni · responsive · accessibilità**

La formulazione «una modifica non deve mai peggiorare una dimensione» non è
applicabile: ogni decisione di design è uno scambio. Un'ombra larga dà
profondità e costa GPU. Un titolo più grande dà gerarchia e toglie spazio.
La regola vera è:

> **Ogni modifica dichiara il proprio costo sulle altre dimensioni.
> Nessun costo taciuto. Se il costo non è accettabile, la modifica non si fa.**

In consegna, accanto a ogni scelta non ovvia, una riga: *cosa è costata*.

---

## 3. La regola di fase

Se durante una task trovo un problema che appartiene a un'altra:
**lo documento, lo segnalo, propongo la soluzione, e non lo tocco.**

Vale anche al contrario: non anticipo lavoro di una task futura perché «tanto
ci sono già dentro». Il progetto resta ordinato solo se ogni decisione ha un
posto e uno solo.

L'eccezione unica: un difetto che rende il sito **rotto o illeggibile** si
ripara subito, e si dice che si è fatto fuori fase.

---

## 4. La disciplina della misura

**È la regola che in questo progetto ha trovato ogni difetto vero.**
Tutti i guasti peggiori erano invisibili a occhio e sono emersi solo misurando:
uno scalino da 33 livelli che sembrava una sfumatura riuscita, una fascia
chiara dietro un titolo, undici testi sotto la soglia di leggibilità, tre
titoli composti nello stesso colore del fondo, un carattere incorporato due
volte.

**Non si dichiara mai «funziona» o «è a posto» senza un numero.**

Cosa si misura, e con cosa:

| Cosa | Come | Soglia |
|---|---|---|
| Contrasto di ogni testo | `contrasto.mjs` — ogni testo contro il fondo che ha davvero dietro | 4,5:1 (3:1 se ≥24px) |
| Scalini di colore | campionamento di una colonna di pixel | ≤ 3 livelli fra righe adiacenti |
| Costo per fotogramma | `tablet.mjs` — rAF con CPU rallentata 4× | *definita dalla Task 01* |
| Ingrandimento dei video | `film.mjs` — sorgente contro pixel in pagina | *definita dalla Task 01* |
| Peso dello scroll | `peso.mjs` — schermate per sezione | *definita dalla Task 01* |
| Forma delle sezioni | `forma.mjs` — allineamento, larghezza, sequenza dei blocchi | mai due consecutive uguali |

Gli script vivono nella cartella di lavoro temporanea e vanno **riscritti se
persi**: sono corti, e il metodo conta più del file.

Due cose che questo contenitore **non** può misurare, e vanno dette invece che
aggirate:
- **la GPU** — qui il browser disegna via software, quindi la fluidità reale
  si misura solo sui dispositivi del cliente;
- **il sito pubblicato** — il proxy blocca `github.io`. Non dico mai «ho
  controllato il sito live»: controllo il build locale servito con supporto
  Range, che è un'altra cosa.

---

## 5. Contro il sapore di template

Il difetto che il cliente chiama «AI generated» non è grafico. Misurato: nove
sezioni, tutte larghe 1088px, tre consecutive con la stessa identica forma
`occhiello + titolo + paragrafo`. **Una sola idea di pagina, ripetuta.**

Regole operative:

1. **Mai due sezioni consecutive con la stessa forma.** Se la seconda ha la
   stessa sequenza di blocchi della prima, una delle due va ricomposta.
2. **Mai una sola larghezza.** La misura del testo cambia con la funzione: una
   dichiarazione non è larga quanto un paragrafo esplicativo.
3. **Il centrato si guadagna.** È il default sicuro, ed è per questo che sa di
   template. Va usato quando c'è una ragione — una frase sola, una firma — non
   quando non se ne è trovata una migliore.
4. **Una rottura, una sola, in tutto il sito.** Un momento in cui la griglia si
   spezza davvero. Se sono due, non è più una rottura: è uno stile.
5. **Ritmo e silenzio sono composizione, non spaziatura.** Uno spazio più
   grande fra due blocchi identici resta uno spazio fra due blocchi identici.

---

## 6. Cosa vuol dire premium, qui

Non è un aggettivo: sono comportamenti verificabili.

- **Non si autoproclama.** Niente «il migliore», «da sempre», «eccellenza»
  come aggettivo. Un marchio premium mostra e tace. Se una frase potrebbe
  stare sul sito di qualunque altro caseificio, è sbagliata.
- **Il dettaglio raro vale più della promessa generica.** «Apriamo alle 4:30»
  vale dieci frasi sulla qualità.
- **Niente esiste per convenzione.** Se un elemento c'è solo perché «nei siti
  si usa», va tolto. Vale per widget, carousel dots, badge, contatori, frecce.
- **Il vincolo si dichiara, non si nasconde.** Chiuso il sabato è un fatto: si
  scrive grande, non in corpo otto in fondo.
- **La fotografia comanda.** Le foto del cliente sono l'asset migliore che
  abbiamo. Il testo le accompagna, non le spiega.
- **Un premium reale ha un ritmo.** Momenti forti e respiri, non densità
  costante. Il documentario, non la brochure.

---

## 7. Come si consegna una task

Una task è finita quando:

1. il build passa;
2. le misure della sezione 4 sono state **rifatte** e riportate coi numeri;
3. le quattro dimensioni sono dichiarate, coi costi;
4. quello che ho trovato e **non** ho toccato è scritto, con la task a cui
   appartiene;
5. il lavoro è **commesso e spinto** — il contenitore si è già riavviato due
   volte in questo progetto perdendo lavoro locale, il remoto è l'unica verità;
6. il resoconto dice cosa **non** funziona ancora, non solo cosa funziona.

Il commit racconta *perché*, non *cosa*: il diff dice già cosa.

---

## 8. Registro dei blocchi

Aggiornato a ogni task. Un blocco aperto non si aggira in silenzio.

| | Blocco | Stato | Chi lo scioglie |
|---|---|---|---|
| 1 | Licenza Canela / Neue Haas Grotesk | **aperto** — ferma la Task 03 | cliente |
| 2 | File dei caratteri scelti (Fontshare è irraggiungibile dal contenitore) | **aperto** | utente, se si sceglie Fontshare |
| 3 | Conferma indirizzo punto vendita (biglietto ≠ scheda Google) | **aperto** — ferma la mappa | cliente |
| 4 | Conferma orari | **aperto** — dato acquisito, da riconfermare | cliente |
| 5 | Approvazione del copy definitivo | **aperto** — ferma la Task 10 | cliente |
| 6 | Dominio definitivo | **aperto** | cliente |
| 7 | Modello del tablet | **aperto** — ferma la Task 00 | utente |
| 8 | ~~File originale del filmato~~ | **chiuso** — è a 1280×720, cioè la stessa risoluzione della copia in repo: non c'è niente da recuperare | — |

---

## 9. Le fasi

**Fase 0 — Fondamenta** · niente di visibile cambia
`00` Misura · `01` Performance budget · `02` Blocchi

**Fase 1 — Le regole** · niente di visibile cambia
`03` Design system completo (colore, tipografia, spazio, superfici, movimento)
`04` Composizione

**Fase 2 — La regia** · qui il sito cambia
`05` Struttura · `06` Il film · `07` La vetrina · `08` I movimenti nuovi
`09` Contatto · `10` Contenuti · **collaudo + polish #1**

**Fase 3 — La rifinitura**
`11` Animazioni · `12` Ottimizzazione · `13` Premium polish

Responsive e accessibilità **non sono task**: sono condizioni di consegna di
ognuna, con un collaudo sui dispositivi veri alla fine di ogni fase.
