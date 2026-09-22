# DATA FLOW — che strada fa un dato dentro il CRM

Dal momento in cui una persona bussa a Rama al momento in cui diventa un
ordine attribuito alla campagna che l'ha portata.

Serve a due cose: capire dove guardare quando qualcosa non torna, e sapere
dove mettere le mani quando si aggiunge un canale nuovo.

---

## Il principio, prima della mappa

Tutto il CRM è costruito attorno a tre regole. Se si capiscono queste, il
resto si deduce.

**1. Un portone solo.** Qualunque cosa arrivi da fuori — un messaggio
Messenger, un modulo del sito, una card toccata in negozio — entra da
`registraIngresso()`. Ogni canale ha un traduttore che trasforma il suo
payload in un `Ingresso`, e poi tace. Nessun traduttore decide niente su
identità, campagne o promemoria: quel ragionamento sta scritto **una volta
sola**. Aggiungere un canale è un file, non una riscrittura.

**2. Un'istantanea sola.** Tutte le pagine leggono la stessa fotografia dei
dati (`Istantanea`) e tutti i conti sono funzioni pure su quella fotografia.
Per questo la versione dimostrativa e quella su Postgres **non possono** dare
numeri diversi: non ci sono due implementazioni da tenere allineate. È anche
il motivo per cui il collaudo può controllare che Flusso e Contatti contino le
stesse persone — se divergessero, il collaudo diventa rosso.

**3. Prima si conserva, poi si capisce.** Ogni payload che arriva da fuori
viene salvato grezzo in `ingressi_grezzi` **prima** di essere tradotto. Se la
traduzione sbaglia una chiave — e prima o poi succede, perché Meta cambia i
dettagli senza avvisare — il messaggio del cliente non è perso: si rilavora la
coda.

---

## La mappa

```
   Messenger ─┐
   Instagram ─┤  /api/webhooks/[canale] ─┐
   WhatsApp ──┘                          │
                                         │
   Lead Ads ───  /api/webhooks/leads ────┤
                                         │
   Modulo sito ─ /api/webhooks/forms ────┼──► registraIngresso()
                                         │         │
   Card NFC ──── /nfc/<codice> ──► Club ─┤         │
                 (conta il tocco)        │         │
                                         │         │
   Altro ─────── /api/ingresso/[canale] ─┘         │
                                                   │
   A mano ────── /contatti/nuovo ──────────────────┘
                                                   │
                                                   ▼
                        ┌──────────────────────────────────────┐
                        │ 1. chi è          (identità)         │
                        │ 2. da dove viene  (campagna)         │
                        │ 3. su che filo    (conversazione)    │
                        │ 4. cos'è successo (evento)           │
                        │ 5. cosa si fa ora (azione)           │
                        └──────────────────────────────────────┘
                                                   │
                                                   ▼
                              contatto ──► opportunità ──► preventivo ──► ordine
                                   │
                                   └──► fase (una delle dieci)
```

---

## I cinque passi del portone

Sono in `crm/lib/dati/ingresso.ts`, nell'ordine in cui girano.

### 1. Chi è — il riconoscimento

È il passo che decide se una persona resta una persona o diventa due schede.

Ogni canale porta una **chiave**: il PSID per Messenger, l'IGSID per
Instagram, il numero per WhatsApp, l'email per un modulo. Si cerca prima sotto
quella chiave; se non si trova nessuno, si prova con le chiavi **trasversali**
— email, telefono — che valgono fuori dal canale che le ha portate.

Due accorgimenti che sembrano dettagli e non lo sono:

- **Lo stesso numero cercato sotto tutte le sue forme.** Un numero può stare
  in rubrica come `telefono` e arrivare da WhatsApp come `whatsapp_telefono`.
  Sono la stessa persona. Cercarla sotto un tipo solo è precisamente il modo
  in cui un cliente diventa due schede.
- **I recapiti scritti a mano sono identità.** Se il telefono salvato nella
  scheda non finisce nella tabella delle identità, la stessa persona che poi
  scrive su WhatsApp torna indietro come doppione. È il doppione che si scopre
  tre settimane dopo, al telefono, facendo brutta figura.

**Il limite che resta.** PSID e IGSID sono legati alla Pagina: Meta dà
identificativi diversi alla stessa persona su Messenger e su Instagram, e non
ci dice che sono la stessa. Finché quella persona non lascia un'email o un
telefono, restano due schede. Il CRM le segnala come possibile doppione;
unirle è una decisione di una persona, perché **unire è irreversibile**.

### 2. Da dove viene — la campagna

Se il canale ha detto qualcosa sull'annuncio, si cerca la campagna per
`ad_id`, per identificativo, o per il `ref=` che abbiamo messo noi
nell'annuncio click-to-Messenger. Il primo che combacia vince.

Su una persona che **esisteva già**, la campagna si scrive solo se non ne ha
una: il primo annuncio che l'ha portata è quello che conta, non l'ultimo.

Per WhatsApp la campagna si riconosce da `source_id`, che è l'inserzione. Il
`ctwa_clid` identifica **quel clic**, non la campagna: resta salvato per
quando si faranno i conti con le statistiche di Meta, ma non serve a cercare.

### 3. Su che filo — la conversazione

Si riprende quella aperta invece di aprirne una nuova, così una chat che dura
tre settimane resta una chat sola. Se non c'è, se ne apre una.

### 4. Cos'è successo — l'evento

Una riga nella storia della persona. Una timeline sola per quattro canali: chi
apre la scheda vede il messaggio Instagram e la telefonata di ieri nello
stesso posto, in ordine di tempo.

### 5. Cosa si fa adesso — l'azione

**La regola centrale di tutto il CRM: nessun contatto vivo resta senza
prossima azione.** Un messaggio arrivato da un annuncio pagato si risponde
oggi, non domani, quindi nasce urgente. Se la persona esisteva già e non ha
niente di aperto, gliene si apre una.

---

## Dopo: come si muove un contatto

### Le fasi

Dieci, ognuna con un trigger d'entrata e uno d'uscita scritti nel codice
(`crm/lib/dominio/fasi.ts`). Una fase senza trigger è solo un'etichetta.

```
nuovo → da_contattare → contattato → qualificato → appuntamento
  → preventivo → follow_up → ordine → consegnato → cliente
                                                 └─► perso (col motivo)
```

Cambiando fase, il CRM: scrive l'evento, e se il contatto è rimasto senza
prossima azione **gliene propone una da sé**.

### L'opportunità e il preventivo

L'opportunità è **il lavoro** di cui si sta parlando. Un contatto può averne
più di una: il bagno adesso, la taverna fra un anno.

Il preventivo **non è un'entità a parte**, e la ragione è che un lavoro ha
un'offerta corrente: se la si rifà, la nuova sostituisce la vecchia, e il
passaggio resta comunque negli eventi. Tenere gli importi in due tabelle
avrebbe significato due verità sullo stesso numero, e prima o poi due numeri
diversi.

**«Scaduto» non si salva, si calcola** dalla data confrontata con oggi. Uno
stato salvato invecchia da solo e servirebbe qualcosa che lo aggiorni ogni
notte; una data domattina è già giusta.

### Le automazioni

Tutte in `crm/lib/dominio/automazioni.ts`, tutte pure: decidono **cosa
proporre**, non lo scrivono da nessuna parte. È il deposito ad applicarle
quando salva.

| Quando succede | Il CRM propone | Dopo quanto |
|---|---|---|
| arriva un lead | rispondere | oggi |
| parte un preventivo | sentire se convince | configurabile (4 giorni) |
| si consegna un campione | chiedere com'è andata e farlo rientrare | configurabile (10 giorni) |
| c'è stato un appuntamento | preparare il preventivo | configurabile (1 giorno) |
| si chiude un ordine | confermare misure e consegna | 2 giorni |

**Nessuna di queste manda niente a nessuno.** Aprono promemoria a voi. Il
giorno che servirà un invio automatico, si aggancia qui senza toccare le
pagine.

I numeri fra parentesi si cambiano in Impostazioni, e valgono da subito
ovunque — perché entrano nell'istantanea insieme a tutto il resto.

---

## Dove finiscono i dati

| Tabella | Cosa tiene |
|---|---|
| `contatti` | la persona |
| `identita` | le chiavi per riconoscerla (chiave unica su tipo+valore) |
| `campagne` | da dove nascono i contatti |
| `conversazioni` | i fili di messaggi |
| `opportunita` | il lavoro, e il suo preventivo |
| `azioni` | cosa va fatto |
| `eventi` | cos'è successo |
| `card_nfc` | le card, con i tocchi contati |
| `impostazioni` | le soglie decise dal titolare (una riga, jsonb) |
| `ingressi_grezzi` | tutto quello che è arrivato da fuori, com'era |
| `profili` | chi può entrare, e con che ruolo |

Tutto quello che pende da un contatto lo fa con `on delete cascade`:
cancellata la persona, se ne va anche la sua storia. Nessun orfano, e la
cancellazione richiesta da un cliente è davvero una cancellazione.

---

## Dove guardare quando qualcosa non torna

| Sintomo | Dove |
|---|---|
| Un messaggio non è arrivato nel CRM | `ingressi_grezzi`: c'è ed è `errore`? La traduzione ha sbagliato una chiave. Non c'è? Non è mai arrivato: guarda il webhook su Meta. |
| La stessa persona è due schede | La scheda lo segnala. Se sono PSID e IGSID, è un limite di Meta: si uniscono a mano. |
| Un contatto non ha attribuzione | Normale se è entrato in negozio o per passaparola. Da un annuncio: controlla che il `ref` dell'annuncio combaci con quello scritto nella campagna. |
| La spesa dice N/D | Ads Insights non è collegato. Si scrive a mano nella scheda della campagna. |
| Due pagine dicono numeri diversi | Non dovrebbe potere succedere: i conti sono funzioni pure sulla stessa istantanea. Se succede, è un bug vero — il collaudo (prova nº 13) esiste apposta per accorgersene. |
| Un lead Meta risulta «in attesa» | Manca `META_PAGE_TOKEN`. Il lead è su Meta e ci resta 90 giorni: quando il token c'è, si rilavora la coda. |

---

## Aggiungere un canale nuovo

Tre cose, in quest'ordine:

1. Un traduttore in `crm/lib/canali/` che trasformi il payload in `Ingresso`.
2. Una rotta che verifichi la firma, salvi il grezzo e chiami
   `registraIngresso`.
3. Se serve, un tipo di identità nuovo in `crm/lib/dominio/campagne.ts` — e
   la decisione se vale **fra canali diversi** o no (`IDENTITA_TRASVERSALI`).

Non si tocca nient'altro: né le pagine, né i conti, né il riconoscimento. È
tutto il senso del portone unico.
