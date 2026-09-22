# INTEGRATION GAP ANALYSIS — cosa manca, chi lo deve fare, in che ordine

`INTEGRATIONS.md` dice **com'è adesso**. Questo dice **cosa fare per arrivare
in fondo**, chi deve farlo e quanto costa aspettare.

Il criterio dell'ordine non è tecnico: è quanto lavoro sblocca ogni passo. Una
pratica che dura due settimane si apre subito anche se serve fra un mese, e
nel frattempo si lavora su quello che non dipende da nessuno.

---

## Il quadro in una riga

Il CRM è **finito come programma** e **non collegato come sistema**. Tutto
quello che dipende solo da noi è scritto, collaudato e verde. Tutto quello che
dipende da un account, una chiave o una pratica di Meta è fermo lì.

**Un solo blocco conta davvero: il database.** Senza Supabase il CRM non ha
dati veri, non ha login, non ha ruoli. Tutto il resto sono migliorie.

---

## Lo scarto, integrazione per integrazione

### 1. Supabase — **BLOCCANTE**

| | |
|---|---|
| **Manca** | Il progetto non esiste. Le migrazioni `0001`–`0004` non sono mai state eseguite. |
| **Chi** | Tu (o il titolare, se l'account va intestato a Rama). |
| **Quanto** | ~15 minuti. |
| **Dipende da** | Niente. Si può fare adesso. |
| **Sblocca** | Dati veri, login, i due ruoli, e la possibilità di mettere in mano il CRM al titolare. |
| **Rischio se si aspetta** | Ogni giorno che passa, i contatti veri restano su WhatsApp e nella testa di qualcuno. Quelli non si recuperano dopo. |

**Cosa fare:** `SETUP_GUIDE.md` §1.

### 2. Vercel — **BLOCCANTE per l'uso fuori dal negozio**

| | |
|---|---|
| **Manca** | L'app GitHub di Vercel non è installata sul repository. Il progetto è già configurato e aspetta solo quello. |
| **Chi** | Tu. È un clic. |
| **Quanto** | 30 secondi. |
| **Dipende da** | Niente. |
| **Sblocca** | Il CRM raggiungibile da un telefono, e ogni push che va online da solo. |
| **Da verificare** | Il piano Hobby di Vercel è per uso non commerciale. Per un CRM aziendale va chiarito con loro o si passa a Pro (20 $/mese). **Non ho verificato come si applica al caso di Rama.** |

### 3. Card NFC — non bloccante, alto ritorno

| | |
|---|---|
| **Manca** | Riprogrammare la card fisica con il nuovo indirizzo `/nfc/<codice>`. |
| **Chi** | Tu, con un telefono Android e *NFC Tools*. |
| **Quanto** | Due minuti a card. |
| **Dipende da** | Vercel (serve l'indirizzo definitivo del CRM). |
| **Sblocca** | La risposta a «quale card funziona», che oggi non esiste perché ce n'è una sola e non è tracciata. |

### 4. Modulo del sito — non bloccante

| | |
|---|---|
| **Manca** | Il collegamento dalla parte del sito, e la firma HMAC. |
| **Chi** | Chi mette le mani su ramastore.it. |
| **Quanto** | Un'ora, se chi ci mette le mani sa cosa sta facendo. |
| **Dipende da** | Vercel, e dal sapere **con che cosa è fatto il sito**. |
| **DA VERIFICARE** | **Da qui ramastore.it non risponde.** Non so che piattaforma sia, se è vivo, né chi lo gestisce. È la prima cosa da chiarire, prima di stimare qualunque cosa. |

### 5. Messenger — non bloccante, ma la pratica va aperta presto

| | |
|---|---|
| **Manca** | App Meta, permessi approvati, webhook iscritto. |
| **Chi** | Tu, con l'accesso al Business Manager di Rama. |
| **Quanto** | Un'ora di lavoro, **più i giorni dell'App Review** — e quelli non dipendono da noi. |
| **Dipende da** | Vercel (il webhook vuole un indirizzo pubblico stabile) e dall'accesso al Business Manager. |
| **Sblocca** | Messenger, Instagram e Lead Ads insieme: è la stessa app e la stessa pratica. |
| **Consiglio** | **Aprirla appena il CRM è online**, anche se poi la si usa fra un mese. L'attesa è l'unica parte che non si può comprimere. |

### 6. Instagram — segue Messenger

Stessa app, stessa pratica, permessi in più. Da verificare al primo messaggio
vero: la forma del payload non è identica a quella di Messenger.

**Limite che resta comunque, e non è un difetto nostro:** la stessa persona
che scrive su Instagram e poi su Messenger resta **due schede** finché non
lascia un'email o un telefono. Meta non ci dice che sono la stessa. Il CRM lo
segnala come possibile doppione e l'unione la decide una persona.

### 7. WhatsApp — da decidere prima di fare

| | |
|---|---|
| **Manca** | WABA, e la decisione su **numero dedicato o Coexistence**. |
| **Chi** | Il titolare deve dire come usa il numero oggi. |
| **DA VERIFICARE** | Il listino: si paga per messaggio consegnato da luglio 2025, e ci sono due cambi annunciati (1 agosto 2026 e 1 ottobre 2026). **Quello che so ha una data di scadenza: va ricontrollato prima di accendere.** |
| **Nota** | È l'unica integrazione con un costo ricorrente. Vale la pena solo se su WhatsApp arriva davvero traffico — cosa che oggi **non sappiamo misurare**, ed è un motivo in più per cominciare da Messenger. |

### 8. Lead Ads — segue Messenger

Stessa app. Serve in più il permesso `leads_retrieval` e un token della Pagina.

**Il punto che conta:** senza il token, il webhook **non crea contatti** —
conserva l'avviso e dice che manca il token. Meta tiene i lead 90 giorni,
quindi quando il token arriva la coda si rilavora e non si è perso niente.
Chi scarica i lead a mano, invece, prima o poi ne perde.

### 9. Spesa delle campagne — ultima

Serve solo `ads_read`. Finché non c'è, la spesa si scrive a mano nella scheda
della campagna e il costo per contatto si calcola da sé. Il CRM dice **N/D**
dove non sa, e questo è già il comportamento giusto.

---

## Cosa dipende da cosa

```
Supabase ──────► dati veri, login, ruoli
    │
    └──► Vercel ──┬──► card NFC riprogrammate
                  ├──► modulo del sito
                  └──► App Meta ──┬──► Messenger
                                  ├──► Instagram
                                  ├──► Lead Ads
                                  └──► spesa campagne
```

Due cose si possono fare in parallelo, e conviene:

1. **Aprire la pratica Meta** appena il CRM è online — l'attesa scorre da sé.
2. **Chiedere al titolare** come usa il numero WhatsApp oggi, perché quella
   risposta decide se WhatsApp costa poco o parecchio.

---

## Quello che non so, e non fingo di sapere

Queste cose non le ho verificate. Non sono stime prudenti: sono buchi.

- **Il sito ramastore.it.** Da qui non risponde. Non so che piattaforma sia,
  se sia vivo, chi lo gestisca. Tutto quello che riguarda il modulo del sito è
  sospeso a questa risposta.
- **Il piano Vercel.** Hobby è per uso non commerciale. Non ho verificato come
  si applica a un CRM aziendale.
- **I prezzi WhatsApp.** So che si paga per messaggio e che cambiano due volte
  nel 2026. Non ho il listino aggiornato.
- **I volumi veri.** Quanti contatti arrivano al mese da ciascun canale, oggi,
  non lo so. Senza quel numero, «conviene collegare WhatsApp?» non ha risposta.
  È la prima cosa che il CRM misurerà da solo, una volta acceso.
- **Le fasi della vendita da Rama.** Le dieci fasi sono ragionate, non
  confermate dal titolare. Mezz'ora con lui vale più di qualunque cosa scritta
  qui.

---

## In che ordine, in pratica

| # | Cosa | Chi | Quando |
|---|---|---|---|
| 1 | Creare Supabase ed eseguire le migrazioni | tu | adesso |
| 2 | Collegare GitHub a Vercel e pubblicare | tu | adesso, è un clic |
| 3 | Invitare i due account, uno admin | tu | subito dopo |
| 4 | Mezz'ora col titolare sulle fasi e sui canali veri | titolare | questa settimana |
| 5 | Aprire l'app Meta e la pratica dei permessi | tu | appena online |
| 6 | Riprogrammare le card NFC | tu | quando c'è l'indirizzo |
| 7 | Chiarire il sito e collegare il modulo | chi gestisce il sito | dopo la risposta |
| 8 | Accendere Messenger (test da 10 €) | tu | a pratica approvata |
| 9 | Instagram e Lead Ads | tu | dopo Messenger |
| 10 | WhatsApp, se i numeri lo giustificano | tu | quando si saprà |
| 11 | Spesa automatica delle campagne | tu | ultima |
