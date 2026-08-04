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
| 1 | ~~Licenza Canela / Neue Haas Grotesk~~ | **chiuso** — scelta dell'utente sul provino (04/08): Playfair Display + Hanken Grotesk, liberi anche per uso commerciale | — |
| 2 | ~~File dei caratteri (Fontshare)~~ | **chiuso** — non serve più: la scelta è caduta su caratteri che next/font scarica da solo al build | — |
| 3 | ~~Conferma indirizzo punto vendita~~ | **chiuso** — decisione utente 04/08: fa fede la scheda Google; `company.ts` aggiornato | — |
| 4 | ~~Conferma orari~~ | **chiuso** — decisione utente 04/08: valgono quelli della scheda Google, già in `company.ts`. Riconferma dal cliente consigliata, non bloccante | — |
| 5 | Approvazione del copy definitivo | **aperto** — ferma la Task 10 | cliente |
| 6 | Dominio definitivo | **aperto** | cliente |
| 9 | Le «ragioni» delle didascalie prodotti (una riga per prodotto: perché è al banco) | **aperto** — ferma il completamento della Task 07; parole sue, non nostre | cliente |
| 7 | ~~Modello del tablet~~ | **chiuso** — succede su tre dispositivi diversi, quindi non è il dispositivo. Misurato: è aritmetica, non hardware (Task 00) | — |
| 8 | ~~File originale del filmato~~ | **chiuso** — è a 1280×720, cioè la stessa risoluzione della copia in repo: non c'è niente da recuperare | — |

---

## 9. Le fasi

**Fase 0 — Fondamenta** ✅
`00` Misura ✓ · `01` Performance budget ✓ · `02` Blocchi ✓

**Fase 1 — Le regole** ✅
`03` Design system completo ✓ · `04` Composizione ✓

**Fase 2 — La regia** — in corso
`05` Struttura ✓ · `06` Il film ✓ · `07` La vetrina ◐ *(didascalie coi dati
confermati fatte; le «ragioni» aspettano il cliente — blocco 9)* ·
`08` I movimenti nuovi ✓ *(Per chi e La visita, dentro la 05; Per chi
ridisegnata a carte gemelle su brief dell'utente)* · `09` Contatto ✓ ·
`10` Contenuti ⛔ *(blocco 5: approvazione del cliente)* ·
**collaudo #1 ✓ (04/08)**: 60 fps con input veri su telefono e tablet, zero
fotogrammi video persi, 26 immagini/s alla velocità di lettura, CLS 0,
prima pittura 1.056 ms (56 sopra B6 → Task 12), contrasti a posto, nessuna
coppia di sezioni adiacenti con la stessa forma, 14 schermate totali.

**Fase 3 — La rifinitura** — in corso
`11` Animazioni ◐ *(banco-che-si-compone montato; il puntino della i resta
da discutere con l'utente prima di farlo)* ·
`12` Ottimizzazione ◐ *(fatto: CSS per rotta 84→26 kB, prima pittura
728–760 ms, preload dei loghi spenti, CLS 0. Residuo dichiarato: ~300 ms
di thread all'avvio su CPU×4 — ~75 ms reali — è l'idratazione di React coi
componenti vivi; ridurlo vorrebbe dire rinunciare a componenti, costo non
accettato)* ·
`13` Premium polish ◐ *(primo giro fatto: mappa con fondale d'attesa,
orfani di riga, targa della firma, respiro del 04:30)*

**Collaudo completo del 04/08 (sera), quattro formati** — desktop 1440,
desktop 1920, tablet, telefono, CPU ×4, gesti veri: 60 fps ovunque, zero
errori console, zero fotogrammi video persi, traversata completa fino al
piede, tutte le ancore a segno (tre porte + pilla), tastiera ok, vetrina
che risponde al trascinamento del mouse. Strumento: `tools/misura/collaudone.mjs`.
L'audit dei contrasti è tutto verde per la prima volta — e onestamente:
lo strumento ora compone i fondi semitrasparenti invece di ignorarli, e il
falso positivo storico del bottone mappa è morto di morte naturale.

Responsive e accessibilità **non sono task**: sono condizioni di consegna di
ognuna, con un collaudo sui dispositivi veri alla fine di ogni fase.

## 9-bis. Il programma vivo (aggiornato 04/08, sera tardi)

**Fatte oggi, oltre il piano:** l'ingresso a tre porte col sipario ·
«Oggi al banco» (grafica del titolare → ridisegno Apple: carta unica con
stato, chip, orari, azioni) · il sacchetto D.O.P. vero · il sottotitolo
dell'ingresso rimosso (riferimento utente) · i passi sotto la mappa ·
anteprima di condivisione · collaudone a quattro formati (due volte,
sempre zero difetti) · audit contrasti verde con lo strumento onesto.

**Uniche task ferme, e su chi aspettano:**
| task | aspetta |
|---|---|
| Il puntino della i (Task 11) | la discussione che l'utente stesso ha chiesto («capire prima di farla») |
| Ragioni dei prodotti (Task 07) | una riga per prodotto dal cliente |
| Copy definitivo (Task 10) | approvazione del cliente |
| Semaforo vivo | il foglio Google dell'utente (5 minuti) |
| Verifica mappa e giudizio sipario | gli occhi dell'utente sul link |
| Dominio | cliente |

## 10. Registro delle idee (si valutano nella task giusta, non prima)

- **Il puntino della i che cade e diventa la mozzarella** — idea dell'utente,
  esplicitamente rimandata («questa qui rimane come task da fare»). → Task 11.
- **Il banco che si compone scorrendo** — idea dell'utente (04/08).
  **Prototipata a costo zero** (04/08, sera): tre veli del colore della
  pagina coprono la fotografia vera in terzi e si alzano a battute
  scaglionate quando la sezione entra — si anima la carta, mai la foto,
  solo transform e opacity (B15). Senza JavaScript o con meno movimento i
  veli non esistono. **In attesa del giudizio dell'utente sul sito
  pubblicato**; la strada a pagamento (video generato) resta possibile ma
  sconsigliata — l'IA su un luogo vero produce l'effetto sintetico appena
  bocciato — e comunque: prima il costo esatto, poi il permesso.
