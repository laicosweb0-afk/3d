# Aurea — Convenzioni, codice sconto, regalo di Natale

Brief del cliente (messaggio del 14/08). Tre pezzi, uno dietro l'altro:

1. **Le convenzioni come nuovo tipo di lead** — un documento che proponga un
   accordo di convenzione ad aziende, enti e associazioni, sulla base
   dell'accordo commerciale già preparato, da veicolare sui social, con direct
   mailing e come link.
2. **L'attivazione per codice sconto**, e il post che la annuncia: da decidere
   se uno solo per tutti oppure uno diverso per asse o target.
3. **Il catalogo regalo di Natale** con un unico regalo — la gift card che
   ognuno carica come vuole — acquistabile online con lo stesso codice, su
   Amazon o sul sito.

---

## Stato

| | Pezzo | Stato |
|---|---|---|
| 1 | Documento di convenzione | **fatto in bozza** — `aurea/convenzioni/`, PDF di 7 pagine, campi economici da compilare |
| 2 | Post di lancio e codice sconto | **non iniziato** |
| 3 | Catalogo di Natale e gift card | **non iniziato** — bloccato sul canale d'acquisto |

---

## 1 · Il documento di convenzione

Sorgente `aurea/convenzioni/proposta.html`, stampa `node tools/aurea/pdf.mjs`,
consegna `aurea/convenzioni/AureaClub-Convenzione.pdf` (A4, 7 pagine, 228 kB).

Forma scelta dall'utente: **PDF pronto da mandare**, non pagina web. La landing
resta possibile più avanti — il testo è già HTML, quindi diventa pagina senza
riscrivere niente.

L'ossatura, e perché è questa:

| Pag. | Cosa | Ragione |
|---|---|---|
| 1 | Copertina | Nome, claim, destinatario. Il documento deve dire a chi è indirizzato prima di dire cosa vuole. |
| 2 | La proposta | La frase che decide tutto: **non costa nulla all'ente**. Sotto, cosa ci guadagna ciascuno dei tre — compreso Aurea, dichiarato apertamente. |
| 3 | Come funziona | Quattro passaggi. Un accordo che sembra complicato non si firma. |
| 4 | Condizioni riservate | Tabella. È la pagina che l'ufficio acquisti legge per prima e l'unica che conta davvero. |
| 5 | Impegni reciproci | Due colonne. Scritto prima cosa fa ciascuno, non dopo il primo malinteso. |
| 6 | Clausole | Durata, recesso, marchi, dati, foro. In una pagina sola, in italiano leggibile. |
| 7 | Modulo di adesione | Si compila e si firma. Il documento finisce con un gesto, non con un saluto. |

**Le scelte che non erano ovvie**

- *Nessun dato dei membri passa fra le parti.* Il partner non ci consegna
  elenchi, noi non gli restituiamo nominativi: solo numeri aggregati. Toglie
  l'obiezione che ferma più convenzioni di ogni altra (la privacy dei
  dipendenti) e ci evita un trattamento dati che non vogliamo gestire.
- *Il tornaconto di Aurea è scritto in chiaro* (pag. 2, terza colonna). Una
  proposta che finge di essere un regalo si legge come una fregatura.
- *«Ciò che non è elencato resta a listino pieno»* compare due volte. Il punto
  in cui una convenzione si rovina è la cassa, non la firma.
- *I campi vuoti si vedono.* Riga d'oro ed etichetta sopra: chi compila trova
  il posto, chi legge senza compilare si accorge subito che manca qualcosa.
  Nessun «XXX», nessun numero messo lì per far vedere come starebbe.

**Misure** (nessuna dichiarazione senza numero, `PROTOCOLLO.md` §4)

- 7 pagine, MediaBox 209,9 × 297,0 mm: A4 esatto, nessuna pagina in eccesso.
- Contrasto di ogni coppia testo/fondo, calcolato sui valori reali: minimo
  **4,76:1** (oro scuro sulla carta, corpo piccolo) contro una soglia di 4,5:1;
  la copertina va da 5,64:1 a 18,16:1. Tutte a norma.
- Caratteri incorporati nel PDF: nessuna richiesta di rete, si apre uguale su
  qualunque macchina.

**Difetti trovati e corretti in corso d'opera:** le righe di firma non
esistevano (regola CSS legata al genitore sbagliato, invisibile a leggere il
codice — l'ha trovata la rilettura del PDF stampato); la lemniscata disegnata a
mano non si incrociava ed era due cerchi affiancati, ora è generata
dall'equazione di Bernoulli come nella stanza 3D del portfolio; una riga doppia
a pag. 3; un campo che andava a capo staccandosi dalla frase a pag. 5.

---

## 2 · Il post e il codice sconto — impostazione, non ancora fatta

La domanda del cliente è «uno per tutti o uno per asse». La risposta che il
documento suggerisce: **uno solo non regge**, perché il post alle aziende
(«offri un vantaggio ai tuoi dipendenti, non ti costa niente») e il post alle
persone («hai una convenzione, ecco come si usa») parlano a due pubblici che
vogliono cose opposte. Servono almeno due impianti, con la stessa grafica:

- **verso l'ente** — direct mailing e LinkedIn, il PDF in allegato o come link;
- **verso i membri** — il codice già attivo, un gesto solo.

Da decidere prima di scrivere: quali assi (aziende / associazioni / enti
pubblici?), e se il codice è uno per partner — come dice il documento — oppure
uno pubblico per campagna, che è un'altra cosa e va scritta diversamente.

---

## 3 · La gift card di Natale — bloccata sul canale

Il regalo unico che ognuno carica come vuole è un'idea che funziona da sola.
Quello che manca non è creativo, è infrastrutturale: **dove si paga**.

| Strada | Cosa comporta |
|---|---|
| Amazon | L'inserzione la incassa Amazon; noi rimandiamo lì. Zero sviluppo, margine e dati del cliente restano ad Amazon. |
| Sito Aurea | Serve un incasso (Stripe o simile) e un generatore di codici: non è una pagina, è un pezzo di piattaforma. |
| Voucher via email | Si ordina online, si paga con bonifico o in sede, il codice arriva a mano. Zero infrastruttura, tutto lavoro umano. |

Finché questa non è decisa, il catalogo non si progetta: un catalogo con un
pulsante che non porta da nessuna parte è peggio di nessun catalogo.

---

## Blocchi aperti

| | Blocco | Chi lo scioglie |
|---|---|---|
| A1 | **Condizioni economiche** della convenzione: sconto, esclusioni, spesa minima, cumulabilità, validità, estensione ai familiari. Messe da parte per decisione dell'utente (14/08): il documento le aspetta come campi. | cliente |
| A2 | **Oggetto della convenzione** — quali servizi e prodotti Aurea comprende. Senza questo la pag. 4 resta vuota a metà. | cliente |
| A3 | **Dati societari AureaClub**: ragione sociale, P.IVA, sede, email, telefono. Nel PDF sono campi, non invenzioni. | cliente |
| A4 | **Il marchio ufficiale in SVG.** Sulla copertina c'è la lemniscata matematica e il nome in tipografia, non il segno del brand: ricavarlo da un JPG sarebbe una falsificazione (stessa regola di `components/mediapro/three/Aurea.tsx`). | cliente |
| A5 | **Canale d'acquisto della gift card** — vedi sopra. | cliente / utente |
| A6 | **Assi di comunicazione** per i post. | utente |
