# SETUP GUIDE — accendere il CRM, passo per passo

Scritto per essere seguito dall'inizio alla fine senza sapere niente prima.
Dove serve una tua decisione, c'è scritto. Dove un valore non lo posso sapere,
c'è scritto **cosa cercare e dove**, non un valore inventato.

**Regola che vale ovunque qui dentro:** le chiavi non si scrivono mai nel
codice e non si mandano mai per chat. Si mettono nelle variabili d'ambiente.
Se una chiave finisce in un messaggio, va considerata bruciata e rigenerata.

Ordine consigliato: §1 → §2 → §3 sono il minimo per lavorare. Dal §4 in poi
sono miglioramenti, e ognuno sta in piedi da solo.

---

## §1 — Il database (Supabase) · ~15 minuti · **serve per forza**

Senza questo, il CRM gira sui dati di esempio e non conserva niente.

### 1.1 Creare il progetto

1. Vai su **supabase.com**, crea un account.
   **Intestalo a Rama, non all'agenzia:** i dati sono di Rama, e il giorno che
   cambiate fornitore quell'account deve restare a loro.
2. *New project*. Nome: `rama-crm`. Regione: **Frankfurt (eu-central-1)** — i
   dati di clienti italiani stanno in Europa, ed è la scelta giusta anche sul
   piano della privacy.
3. Scegli una password del database e **salvala nel gestore di password**, non
   in un file di testo. Serve raramente, ma quando serve non si può recuperare.

### 1.2 Eseguire le quattro migrazioni

Nel pannello Supabase: **SQL Editor** → *New query*.

Copia e incolla il contenuto di questi file, **uno alla volta e in
quest'ordine**, premendo *Run* dopo ciascuno:

1. `crm/supabase/migrazioni/0001_schema.sql` — le tabelle di base
2. `crm/supabase/migrazioni/0002_crm.sql` — fasi, azioni, eventi, opportunità
3. `crm/supabase/migrazioni/0003_campagne.sql` — campagne, conversazioni, identità
4. `crm/supabase/migrazioni/0004_operativo.sql` — ruoli, impostazioni, preventivi, card

L'ordine conta: ognuna costruisce su quella prima. Se una dà errore, **fermati
e leggi l'errore** invece di andare avanti: quasi sempre è perché ne è stata
saltata una.

### 1.3 Prendere le chiavi

**Project Settings → API**. Servono tre valori:

| Dove si chiama lì | Come si chiama da noi |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ La terza **scavalca tutte le regole di sicurezza del database**. Sta solo
sul server, non va mai nel browser, non va mai in un messaggio. Se ti sfugge,
rigenerala subito da quella stessa pagina.

### 1.4 Invitare i due account

**Authentication → Users → Invite user.** Uno per te, uno per il titolare.

Poi **Authentication → Providers → Email**: togli *Enable sign-ups*. A questo
CRM entrate in due, e nessun cliente deve sapere che esiste.

### 1.5 Fare di uno dei due il titolare

La migrazione `0004` rende titolare il primo profilo creato. Per
controllarlo o cambiarlo, in **SQL Editor**:

```sql
-- chi c'è e con che ruolo
select id, nome, ruolo from profili order by creato_il;

-- promuovere qualcuno (metti la sua email)
update profili set ruolo = 'titolare'
 where id = (select id from auth.users where email = 'tua@email.it');
```

**Cosa cambia fra i due ruoli:** il titolare può eliminare un contatto, unire
due schede, cambiare le soglie e gestire le card. Tutto il resto — rispondere,
spostare di fase, scrivere un'attività, fare un preventivo — lo fanno tutti e
due. Il lavoro non si ingessa.

Il ruolo si cambia **solo da qui, dal pannello Supabase**. Dall'applicazione
non si può, e non è una dimenticanza: se ciascuno potesse modificare la
propria riga per intero, un collaboratore si promuoverebbe titolare da solo.
La migrazione `0004` restringe il permesso di scrittura alla sola colonna del
nome proprio per questo.

---

## §2 — La pubblicazione (Vercel) · ~10 minuti · **serve per usarlo fuori**

Il progetto `rama-crm` **è già creato e configurato**: framework Next.js, Root
Directory `crm`, protezione d'accesso disattivata perché il link si apra
davvero.

### 2.1 Collegare GitHub — è il passo che manca

Apri **vercel.com/laicosweb0-5609/rama-crm/settings/git** → *Connect Git
Repository* → scegli `laicosweb0-afk/3d`. Vercel chiederà di installare la sua
app su GitHub: accetta.

Finché questo non è fatto, ogni pubblicazione fallisce con `git_info_fail` —
Vercel non riesce a leggere il codice.

⚠️ **Il CRM vive sul ramo `claude/crm-cliente-hdxv20`, non su `main`.** In
Settings → Git, imposta quel ramo come *Production Branch*, oppure uniscilo a
`main` prima di pubblicare.

### 2.2 Le variabili d'ambiente

**Settings → Environment Variables.** Il minimo per partire:

```
NEXT_PUBLIC_SUPABASE_URL       (dal §1.3)
NEXT_PUBLIC_SUPABASE_ANON_KEY  (dal §1.3)
SUPABASE_SERVICE_ROLE_KEY      (dal §1.3)
```

Appena ci sono, il CRM passa ai dati veri **da solo** e la striscia gialla in
cima sparisce. Non c'è nessun interruttore da girare.

Se vuoi tenerlo sui dati di esempio anche con le chiavi presenti — per farlo
vedere a qualcuno senza toccare niente di vero — aggiungi `CRM_MODO=demo`.

### 2.3 Provare che funziona

Apri l'indirizzo da un telefono **fuori dal wi-fi del negozio**. Deve chiedere
il login. Se entra senza chiederlo, le chiavi Supabase non sono state lette:
ricontrolla il §2.2.

---

## §3 — Il primo giro di prova · ~10 minuti

Con il CRM online e collegato:

1. Entra con il tuo account.
2. **Impostazioni** → *Carica i dati di esempio*. Servono a vedere com'è fatto
   con qualcosa dentro.
3. Gira tutte le pagine: Oggi, Flusso, Pipeline, Contatti, Preventivi,
   Campagne, Attività, Attenzioni, Analisi.
4. Fai una prova vera: crea un contatto, spostalo di fase, fai un preventivo,
   completa un promemoria.
5. **Quando sei convinto: Impostazioni → *Elimina i dati di esempio*.**
   Se ne vanno solo quelli — sono marcati da una colonna nel database, non da
   un nome che sembra finto — e quello che hai creato tu resta.

**Il collaudo automatico**, se vuoi la prova che tutto regge:

```bash
cd crm && npm run build && npm start &
CRM_URL=https://<il-tuo-indirizzo> CRM_EMAIL=… CRM_PASSWORD=… \
  node tools/crm-smoke.mjs ./prove
```

Sono 19 prove. Non guardano se le pagine sono belle: guardano se cliccare
cambia davvero le cose. Se una diventa rossa, c'è un problema vero.

---

## §4 — Le card NFC · ~5 minuti a card

### 4.1 Creare la card nel CRM

**Card NFC** (dal menu, o `/card`) → *Nuova card*.

- **Codice**: minuscolo, senza spazi né accenti — `bancone-01`, `vetrina-02`.
  Finisce nell'indirizzo e va letto al telefono.
- **Nome**: come la chiami tu.
- **Dov'è**: serve fra sei mesi, quando non ti ricorderai più quale card è
  quale.

### 4.2 Scriverla nel chip

Il CRM mostra l'indirizzo da usare:
`https://<indirizzo-del-crm>/nfc/bancone-01`

Con un telefono Android e **NFC Tools** (gratuita): *Write* → *Add a record* →
*URL* → incolla → *Write*. Appoggia la card.

**Copia l'indirizzo, non riscriverlo.** È l'unica cosa che va trascritta su un
oggetto fisico, e un errore lì si scopre solo in negozio, con un cliente
davanti.

### 4.3 Se il CRM e il sito stanno su due indirizzi diversi

Aggiungi su Vercel:

```
SITO_URL=https://ramastore.it
```

Senza questo, la card manda a una pagina del Club che nel CRM non esiste.

### 4.4 Provare

Tocca la card. Devi finire sulla pagina del Club, e in `/card` il contatore
dei tocchi deve essere salito di uno.

---

## §5 — Il modulo del sito · ~1 ora

⚠️ **Prima serve una risposta:** con che cosa è fatto ramastore.it, e chi ci
mette le mani? Da qui il sito non risponde, quindi non lo so. Senza questa
informazione il resto del paragrafo non si può applicare.

### 5.1 Generare il segreto

Su un terminale:

```bash
openssl rand -hex 32
```

Copialo in due posti: su Vercel come `INGRESSO_SEGRETO`, e nella
configurazione del sito.

### 5.2 Far mandare i dati al CRM

Il modulo deve fare un `POST` a
`https://<indirizzo-del-crm>/api/webhooks/forms` con un corpo JSON, firmato
con HMAC-SHA256 usando il segreto, nell'intestazione `x-rama-firma`.

Esempio in PHP (WordPress):

```php
$dati = json_encode([
  'nome'      => $_POST['your-name'],
  'email'     => $_POST['your-email'],
  'telefono'  => $_POST['your-phone'],
  'messaggio' => $_POST['your-message'],
  'utm_source'   => $_POST['utm_source'] ?? null,
  'utm_campaign' => $_POST['utm_campaign'] ?? null,
  'card'         => $_GET['card'] ?? null,
  'pagina'       => $_SERVER['REQUEST_URI'],
]);

wp_remote_post('https://<crm>/api/webhooks/forms', [
  'headers' => [
    'Content-Type' => 'application/json',
    'x-rama-firma' => hash_hmac('sha256', $dati, INGRESSO_SEGRETO),
  ],
  'body' => $dati,
]);
```

I nomi dei campi più diffusi sono già tradotti dal CRM (Contact Form 7,
Elementor, moduli scritti a mano). Se quelli di Rama sono diversi, si
aggiungono in `ALIAS` dentro `crm/app/api/webhooks/forms/route.ts`.

### 5.3 Gli UTM, con disciplina

Se non si è disciplinati qui, l'attribuzione diventa fuffa. La regola fissa:

- `utm_source` = la piattaforma — `instagram`, `facebook`, `google`
- `utm_medium` = la superficie — `bio`, `dm`, `story`, `cpc`, `nfc`, `qr`
- `utm_campaign` = il nome della campagna, **lo stesso** scritto nella scheda
  della campagna dentro il CRM

### 5.4 Provare

Compila il modulo sul sito vero. Il contatto deve comparire in `/ingressi`
entro pochi secondi. Se non arriva, guarda `ingressi_grezzi` nel database: se
la riga c'è ed è in errore, il problema è la traduzione dei campi; se la riga
non c'è, il sito non sta chiamando.

---

## §6 — Meta: Messenger, Instagram, Lead Ads · ~1 ora + l'attesa della pratica

⚠️ **I permessi passano da App Review.** Sono giorni, non ore, e non
dipendono da noi. **Apri la pratica appena il CRM è online**, anche se pensi
di usarla fra un mese: l'attesa è l'unica parte che non si può comprimere.

### 6.1 Creare l'app

1. **developers.facebook.com** → *My Apps* → *Create App* → tipo **Business**.
2. Collegala al **Business Manager di Rama** (non a uno tuo personale).
3. Aggiungi i prodotti: **Messenger**, **Instagram**, **Webhooks**.

### 6.2 I due valori che servono al CRM

| Dove si trova | Variabile |
|---|---|
| App Settings → Basic → **App Secret** | `META_APP_SECRET` |
| **Lo inventi tu**: una stringa lunga a caso | `META_VERIFY_TOKEN` |

Il secondo serve solo alla stretta di mano iniziale: lo scrivi identico su
Vercel e nel pannello Meta.

### 6.3 Iscrivere il webhook

Messenger → *Webhooks* → *Add Callback URL*:

- **Callback URL:** `https://<crm>/api/webhooks/messenger`
- **Verify Token:** quello del punto precedente

Poi iscrivi i campi **`messages`** e **`messaging_referrals`**. Il secondo è
quello che porta `ad_id` e `ref`: senza, i messaggi arrivano ma **senza sapere
da quale campagna**.

### 6.4 I permessi da chiedere

- Messenger: `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`
- Instagram: `instagram_business_basic`, `instagram_business_manage_messages`
- Lead Ads: `leads_retrieval`, `pages_show_list`, `pages_manage_ads`
- Spesa campagne: `ads_read`

### 6.5 Accendere i traduttori

Solo **dopo** che l'app è approvata, aggiungi su Vercel:

```
META_ADATTATORI=attivo
```

Questa accende **solo la traduzione** dei payload. Non ha niente a che vedere
con la sicurezza: senza `META_APP_SECRET` il webhook risponde 503 comunque, e
con l'app secret ma senza questa, i messaggi arrivano, vengono conservati e
restano «in attesa» finché non la si accende. Meglio muto che sbagliato.

### 6.6 Il primo test vero — 10 €

Non si accende tutto insieme. Si fa una prova sola e si guarda:

1. Crea un annuncio click-to-Messenger, budget **10 €**, un giorno.
2. Nel campo *ref* dell'annuncio scrivi `prova-crm`.
3. Nel CRM crea una campagna con **Parametro ref = `prova-crm`**.
4. Manda un messaggio tu stesso dall'annuncio.
5. Guarda: il contatto deve comparire, **agganciato a quella campagna**, con
   una prossima azione urgente.

Se funziona, funziona tutto il resto. Se non funziona, hai perso 10 € e non
tre settimane.

### 6.7 Per i Lead Ads serve una cosa in più

Meta **non manda i dati del lead** nel webhook: manda un identificativo da
andare a prendere. Serve un token della Pagina:

```
META_PAGE_TOKEN=…
```

**Senza questo token il CRM non crea nessun contatto** dai Lead Ads:
conserva l'avviso e lo segna «in attesa». Un contatto senza nome né recapito
non è un contatto, è una riga vuota che qualcuno dovrà cancellare. Meta tiene
i lead **90 giorni**: quando il token arriva, la coda si rilavora e non si è
perso niente.

---

## §7 — WhatsApp · da decidere prima di fare

⚠️ **È l'unica integrazione con un costo ricorrente**: si paga per messaggio
consegnato. **Verifica il listino aggiornato prima di accendere** — ci sono
due cambi annunciati, 1 agosto 2026 e 1 ottobre 2026, e quello che so ha una
data di scadenza.

**La decisione da prendere prima:** numero dedicato, o Coexistence sul numero
che Rama usa già? Dipende da come lo usano oggi, e quello lo sa solo il
titolare.

Quando sarà deciso: WABA nel Business Manager, permessi
`whatsapp_business_messaging` e `whatsapp_business_management`, token di
system user, webhook su `https://<crm>/api/webhooks/whatsapp`.

**Consiglio:** lascialo per ultimo. Oggi non sappiamo quanto traffico arrivi
davvero su WhatsApp — e il CRM, una volta acceso, è proprio lo strumento che
te lo dirà.

---

## §8 — L'email del codice Club (Resend) · facoltativo

Serve solo alla card NFC che manda il codice per email.

**resend.com** → verifica il dominio (record SPF e DKIM nel DNS) → crea una
chiave. Poi su Vercel:

```
RESEND_API_KEY=…
EMAIL_MITTENTE=Rama Ceramiche <club@ramastore.it>
EMAIL_RISPOSTA=info@ramastore.it
```

Senza, il lead viene registrato lo stesso e la card dice al cliente di
mostrare il codice in negozio. Non si perde niente: si perde un'email.

---

## Tutte le variabili, in un posto solo

| Variabile | Serve a | Senza di lei |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | database | il CRM resta sui dati di esempio |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | database | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | le porte pubbliche | la card e i webhook non scrivono |
| `CRM_MODO=demo` | forzare i dati di esempio | (facoltativa) |
| `SITO_URL` | dove manda la card NFC | manda a una pagina che non esiste |
| `INGRESSO_SEGRETO` | firmare `/api/ingresso` e `/api/webhooks/forms` | quelle rotte rispondono 503 |
| `META_VERIFY_TOKEN` | stretta di mano dei webhook Meta | Meta non riesce a iscriversi |
| `META_APP_SECRET` | verificare la firma di Meta | i webhook rispondono 503 |
| `META_ADATTATORI=attivo` | accendere la traduzione dei payload | i messaggi arrivano ma non vengono tradotti |
| `META_PAGE_TOKEN` | leggere i Lead Ads | i lead restano «in attesa» |
| `LEAD_IP_PEPE` | freno anti-abuso della card | il freno non parte |
| `ORIGINI_CONSENTITE` | chi può chiamare `/api/lead` | la card non riesce a scrivere |
| `RESEND_API_KEY` | email del codice Club | il codice si mostra in negozio |

---

## I dati personali — la parte da non rimandare

Questo CRM tiene nomi, telefoni, email e preferenze di persone vere. Il
programma è **predisposto** per gestirli come si deve:

- consenso al marketing registrato con la data;
- cancellazione definitiva dalla scheda, che porta via anche tutta la storia
  (`on delete cascade`: nessun orfano lasciato in giro);
- esportazione completa in CSV;
- regole di riga su tutte le tabelle: solo chi è entrato legge qualcosa;
- dati su server europei (se hai scelto Frankfurt al §1.1).

⚠️ **Predisposto non vuol dire conforme.** L'informativa privacy da pubblicare
sul sito, i tempi di conservazione da dichiarare e il registro dei trattamenti
sono adempimenti di Rama, e vanno fatti verificare da chi se ne occupa per
loro. **Non sto dicendo che siete a posto: sto dicendo che il programma non vi
mette i bastoni fra le ruote.**

Due numeri di riferimento, da confermare con il loro consulente: lead non
convertiti ~24 mesi, clienti per la durata del rapporto più i dieci anni
fiscali.

---

## Se qualcosa non va

| Cosa vedi | Quasi sempre è |
|---|---|
| Striscia gialla «modalità dimostrativa» quando non dovrebbe esserci | le chiavi Supabase non sono arrivate all'app: ricontrolla §2.2 e ripubblica |
| Entra senza chiedere il login | idem |
| Una migrazione dà errore | ne è stata saltata una prima: rifai l'ordine 0001→0004 |
| Il webhook di Meta risponde 503 | manca `META_APP_SECRET` |
| Meta non riesce a iscrivere il webhook | `META_VERIFY_TOKEN` diverso fra Vercel e il pannello Meta |
| I messaggi arrivano ma senza campagna | manca l'iscrizione al campo `messaging_referrals` |
| Un lead Meta resta «in attesa» | manca `META_PAGE_TOKEN` — il lead è al sicuro su Meta per 90 giorni |
| La card NFC porta a una pagina che non esiste | manca `SITO_URL` |
| Un contatto è doppio | se sono Instagram e Messenger, è un limite di Meta: si uniscono a mano dalla scheda |

Per capire **dove guardare** quando un dato non torna, la mappa completa sta
in `DATA_FLOW.md`.
