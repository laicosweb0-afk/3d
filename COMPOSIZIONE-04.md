# Task 04 — Composizione

Il difetto misurato (`forma.mjs`): nove sezioni, tutte larghe 1088 px, tre
consecutive con la stessa sequenza `occhiello + titolo + paragrafo`. **Una
sola idea di pagina, ripetuta** — è questo, non i colori o i font, il sapore
di «generato». Questa task assegna a ogni movimento dell'architettura una
**forma** diversa da quella del movimento prima e di quello dopo.

Qui si progetta soltanto: l'implementazione è la Fase 2 (Task 05–09), e ogni
forma è già pensata dentro il budget — nessuna chiede layer, blur o
animazioni oltre i limiti.

## Le tre misure

Al posto dell'unica colonna da 1088 px, tre larghezze con un ruolo:

| | | ruolo |
|---|---|---|
| `--misura-dichiarazione` | ~22 ch | frasi che stanno da sole |
| `--misura-testo` | 46 ch | paragrafi che si leggono |
| `--misura-campo` | 62 rem | pannelli, mappa, vetrina |

Regola ereditata dal protocollo §5: il centrato **si guadagna** (una frase
sola, una firma); mai due sezioni consecutive con la stessa sequenza di
blocchi; **una sola rottura di griglia in tutto il sito**.

## La sequenza delle forme

| # | movimento | forma | perché è diversa dalla precedente |
|---|---|---|---|
| 1 | **Il film** | il palco: pieno schermo, tipografia centrata sopra il filmato | è il cinema; il documento non è ancora cominciato |
| 2 | **Chi siamo** | *dichiarazione*: occhiello + frase + una riga, centrata, misura stretta | dal pieno schermo a una pagina quasi vuota — il primo silenzio |
| 3 | **Per chi** | *aggiornata dal brief dell'utente (04/08)*: la fotografia vera del banco come tavola d'apertura, titolo centrato, poi **due carte gemelle a peso identico** — icona, titolo, testo, stessa altezza, stesse ancore | dal testo alla scelta: in meno di un secondo si percepiscono due percorsi, e nessuno dei due è la nota dell'altro *(la versione asimmetrica a gerarchia è stata superata da una decisione esplicita dell'utente)* |
| — | il passaggio | la fascia che scorre (esiste) | non è una sezione: è luce che cambia |
| 4 | **Il banco** | *campo*: micro-etichetta + titolo a sinistra su misura larga, poi la vetrina a tutta larghezza; le ragioni vivono nelle didascalie dei prodotti, non in un paragrafo | dal testo al pannello; per la prima volta l'immagine comanda e il testo serve |
| 5 | **La visita** | **la rottura — unica nel sito**: `04:30` composto enorme in Playfair, da margine a margine, l'ottone usato una volta sola come colore di un testo grande; sotto, tre righe numerate (01 uscita · 02 padiglione · 03 si entra) con filo di capello, etichetta a sinistra e dato a destra | l'unico momento in cui la griglia si spezza: un numero come immagine. È il fatto più raro dell'azienda e riceve la composizione più rara del sito |
| 6 | **Come arrivare** | la mappa a campo pieno; sotto, *colophon a due colonne* (indirizzo | telefono); poi il congedo «Vi aspettiamo al banco.» **sopra** i due bottoni | dal numero-immagine a uno strumento; il congedo sopra i bottoni è la ragione per premerli, non un saluto dopo |
| 7 | **La firma** | firma centrata sulla carta di latte (esiste) | il centrato qui è guadagnato: è una firma |

Verifica con `forma.mjs` a fine Fase 2: **nessuna coppia di sezioni adiacenti
con la stessa sequenza di blocchi, almeno due larghezze diverse in campo,
una sola rottura.**

## Le regole che la sequenza impone alla Fase 2

1. Il blocco `occhiello + h2 + p` può apparire **una volta sola** (movimento
   2). Ovunque ricompaia, la composizione è da rifare.
2. L'ottone come colore di testo appare **solo** nel `04:30`. Altrove resta
   filo e dettaglio: un accento usato due volte non è più un accento.
3. Le tre righe della visita e il colophon dei contatti usano lo stesso
   disegno di riga (etichetta | dato, filo sotto) — è **una** famiglia di
   elenco, non due: la varietà sta fra le sezioni, la coerenza dentro i
   componenti.
4. Il movimento 3 si impagina con la colonna minore **sfalsata**, non
   affiancata in griglia pari: su telefono lo sfalsamento resta (la minore
   scende sotto, rientrata), così la gerarchia sopravvive al breakpoint.
5. Le superfici rialzate della metà scura restano due (vetrina, mappa).
   Nella metà chiara vivono le due carte gemelle del Per chi — volute
   dall'utente, in crema su latte, senza ombra: sono carta su carta, non
   pannelli. Tutto il resto è impaginato **sulla** pagina.

## Cosa serve dal cliente (non blocca la progettazione, blocca il testo)

- Il movimento 3 afferma che i privati possono comprare al dettaglio senza
  appuntamento: è in `company.ts` (`accesso`), già confermato.
- Il `04:30` usa gli orari della scheda Google, decisione utente 04/08 —
  riconferma del cliente consigliata prima del lancio.
