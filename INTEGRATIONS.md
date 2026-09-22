# INTEGRATIONS — lo stato vero di ogni collegamento

Questo documento dice, per ciascuna integrazione, **cosa funziona davvero
adesso** e **cosa manca**. È scritto per essere letto fra sei mesi da qualcuno
che non ha seguito i lavori.

Una regola sola, e vale su tutto il file: **niente è dichiarato READY se non è
stato verificato su un collegamento vero**. Il codice scritto, compilato e
collaudato contro un payload di esempio non è «pronto»: è pronto a essere
provato. La differenza fra le due cose è tutto il tempo che si perde quando si
scopre che non era vero.

## Le sigle di stato

| Stato | Vuol dire |
|---|---|
| **READY** | Collegato a un account vero, provato, funziona. |
| **PARTIALLY READY** | Una parte funziona ed è provata; il resto no. Dice quale. |
| **TO CONFIGURE** | Il codice c'è e regge; mancano solo chiavi o impostazioni. Nessuna pratica da aprire. |
| **TO VERIFY** | Scritto seguendo la documentazione, mai visto girare su dati veri. |
| **NOT CONNECTED** | Non esiste nessun collegamento. Serve un account, una pratica, o tutti e due. |

**Oggi nessuna integrazione è READY.** Il CRM gira in modalità dimostrativa,
sui dati di esempio, e tutto quello che scrive è vero ma vive in memoria.

---

## Riepilogo

| Integrazione | Stato | Blocca l'uso quotidiano? |
|---|---|---|
| Supabase (database e accessi) | **NOT CONNECTED** | **Sì.** Senza, non esistono dati veri. |
| Vercel (pubblicazione) | **PARTIALLY READY** | Sì per l'uso fuori dal computer. |
| Card NFC | **PARTIALLY READY** | No |
| Modulo del sito | **TO CONFIGURE** | No |
| Resend (email del codice Club) | **TO CONFIGURE** | No |
| Ingresso normalizzato `/api/ingresso` | **TO CONFIGURE** | No |
| Messenger | **NOT CONNECTED** | No |
| Instagram | **NOT CONNECTED** | No |
| WhatsApp Cloud API | **NOT CONNECTED** | No |
| Meta Lead Ads | **NOT CONNECTED** | No |
| Meta Ads Insights (la spesa) | **NOT CONNECTED** | No |

L'ordine in cui conviene affrontarle sta in `INTEGRATION_GAP_ANALYSIS.md`.

---

## 1. Supabase — database e accessi

- **STATO: NOT CONNECTED.** Il progetto Supabase non è mai stato creato. Le
  quattro migrazioni (`crm/supabase/migrazioni/0001`…`0004`) non sono mai state
  eseguite da nessuna parte. È il blocco più importante: finché non c'è, il CRM
  non ha dati veri e non ha login.
- **COSA SERVE:** un account Supabase (il piano gratuito basta per i numeri di
  Rama) e dieci minuti.
- **ACCOUNT:** da creare su supabase.com. Intestarlo a Rama, non all'agenzia:
  i dati sono di Rama.
- **API:** `@supabase/supabase-js` e `@supabase/ssr`, già installati.
- **PERMESSI / PRATICHE:** nessuna. Non c'è niente da far approvare.
- **WEBHOOK:** nessuno.
- **DATI CHE RICEVE:** tutto il CRM — contatti, opportunità, azioni, eventi,
  campagne, conversazioni, identità, card, impostazioni.
- **DATI CHE MANDA:** solo a noi.
- **COSTI:** gratuito fino a 500 MB di database e 50.000 utenti attivi. Il CRM
  di uno showroom sta in poche decine di MB: nei fatti, zero.
- **CONFIGURAZIONE MANUALE:** creare il progetto, eseguire le quattro
  migrazioni in ordine, copiare tre chiavi nelle variabili d'ambiente,
  invitare i due account. Passo per passo in `SETUP_GUIDE.md` §1.
- **AUTOMAZIONI POSSIBILI:** nessuna — è il database, non un servizio.
- **COME SI VERIFICA:** con le chiavi configurate, `modoDati()` passa da
  `demo` a `supabase` da solo e la striscia gialla in cima sparisce. Poi:
  `CRM_URL=… CRM_EMAIL=… CRM_PASSWORD=… node tools/crm-smoke.mjs` deve dare
  19 prove verdi come in demo.

## 2. Vercel — pubblicazione

- **STATO: PARTIALLY READY.** Il progetto `rama-crm` esiste, è configurato
  (framework Next.js, Root Directory `crm`, protezione d'accesso disattivata
  perché il link sia apribile). **Quello che manca è il collegamento a
  GitHub:** l'app Vercel non è installata sul repository, quindi Vercel non
  riesce a leggere il codice e la pubblicazione fallisce con `git_info_fail`.
- **COSA SERVE:** un clic su
  `vercel.com/laicosweb0-5609/rama-crm/settings/git` → *Connect Git
  Repository* → `laicosweb0-afk/3d`.
- **ACCOUNT:** già attivo (`laicosweb0@gmail.com`, piano Hobby).
- **API:** nessuna da parte nostra.
- **PERMESSI:** l'app GitHub di Vercel deve poter leggere il repository.
- **COSTI:** gratuito su Hobby. Attenzione: il piano Hobby è per uso non
  commerciale — per un CRM di un'azienda, prima o poi va messo il piano Pro
  (20 $/mese) o spostato altrove. **DA VERIFICARE con Vercel** prima di
  metterci dati veri.
- **CONFIGURAZIONE MANUALE:** collegare il repository, poi le variabili
  d'ambiente (Settings → Environment Variables).
- **NOTA:** il CRM sta in `crm/`, il sito nella radice. Sono due progetti
  Vercel distinti, e il ramo su cui vive il CRM oggi è
  `claude/crm-cliente-hdxv20`, non `main`.
- **COME SI VERIFICA:** la pubblicazione arriva a `READY` e l'indirizzo si
  apre da un telefono fuori dal wi-fi del negozio.

## 3. Card NFC

- **STATO: PARTIALLY READY.** Il codice funziona ed è collaudato: `/nfc/<codice>`
  conta il tocco, attacca l'attribuzione al link e manda avanti la persona
  (prova nº 16 del collaudo). Quello che manca è la parte fisica — le card non
  sono ancora programmate con il nuovo indirizzo.
- **COSA SERVE:** le card NFC (ce n'è già una in negozio) e un telefono
  Android con un'app tipo *NFC Tools* per scriverci dentro l'indirizzo.
- **ACCOUNT:** nessuno.
- **WEBHOOK:** nessuno. È una rotta nostra.
- **DATI CHE RICEVE:** il tocco — quale card, quando. Nient'altro: niente
  cookie, niente identificativi della persona.
- **DATI CHE MANDA:** rimanda alla pagina del Club con `card`, `utm_source`,
  `utm_medium` attaccati al link.
- **COSTI:** le card, una volta. Nessun costo ricorrente.
- **CONFIGURAZIONE MANUALE:** creare la card nel CRM (`/card`), copiare
  l'indirizzo che il CRM mostra, scriverlo nel chip. Se il CRM e il sito
  stanno su due indirizzi diversi, va impostata anche `SITO_URL`.
- **AUTOMAZIONI:** il conteggio dei tocchi e l'attribuzione sono già
  automatici. Il passaggio da tocco a contatto no, ed è giusto così: un tocco
  non è una persona.
- **COME SI VERIFICA:** si tocca la card col telefono, si guarda `/card`: il
  contatore è salito di uno.

## 4. Modulo del sito — `/api/webhooks/forms`

- **STATO: TO CONFIGURE.** La rotta funziona ed è collaudata (prova nº 17:
  due invii dello stesso modulo fanno una scheda sola). Manca il collegamento
  dalla parte del sito.
- **COSA SERVE:** accesso al sito ramastore.it e sapere con che cosa è fatto.
  **DA VERIFICARE:** da qui il sito non risponde, quindi non so che piattaforma
  sia né chi ci mette le mani.
- **API:** la nostra. Il modulo manda un POST JSON.
- **PERMESSI:** nessuno.
- **DATI CHE RICEVE:** nome, cognome, email, telefono, messaggio, città, più
  gli UTM e il codice della card se c'erano nel link. I nomi dei campi più
  diffusi sono già tradotti (Contact Form 7, Elementor, moduli scritti a mano);
  se il modulo di Rama ne usa altri, si aggiungono in `ALIAS` dentro
  `crm/app/api/webhooks/forms/route.ts` e non si tocca altro.
- **COSTI:** nessuno.
- **CONFIGURAZIONE MANUALE:** generare `INGRESSO_SEGRETO`, metterlo nel CRM e
  nel sito, far firmare al sito il corpo della richiesta con HMAC-SHA256
  nell'intestazione `x-rama-firma`. Senza il segreto, in produzione la rotta
  risponde **503**: non finge di funzionare.
- **AUTOMAZIONI:** il contatto entra, viene riconosciuto se esiste già, gli si
  apre una prossima azione urgente. Tutto automatico.
- **COME SI VERIFICA:** si compila il modulo sul sito vero e il contatto
  compare in `/ingressi` entro pochi secondi.

## 5. Resend — l'email del codice Club

- **STATO: TO CONFIGURE.** Il codice esiste da prima ed è indipendente dal
  resto del CRM.
- **COSA SERVE:** un account Resend e un dominio verificato.
- **PERMESSI:** verifica DNS del dominio (record SPF e DKIM).
- **COSTI:** gratuito fino a 3.000 email al mese.
- **CONFIGURAZIONE MANUALE:** `RESEND_API_KEY`, `EMAIL_MITTENTE`,
  `EMAIL_RISPOSTA`.
- **SE NON C'È:** il lead viene registrato lo stesso e la card dice al cliente
  di mostrare il codice in negozio. Non si perde niente, si perde un'email.

## 6. Ingresso normalizzato — `/api/ingresso/[canale]`

- **STATO: TO CONFIGURE.** È la porta di casa: ci passa tutto quello che non è
  un webhook di Meta. Collaudata (prova nº 12).
- **CONFIGURAZIONE MANUALE:** `INGRESSO_SEGRETO`. Senza, in produzione
  risponde **503**. In modalità dimostrativa è aperta apposta, altrimenti non
  sarebbe provabile.
- **NOTA DI SICUREZZA:** se il CRM viene pubblicato in demo su un indirizzo
  pubblico, questa rotta accetta scritture da chiunque abbia il link. I dati
  sono finti e vivono in memoria, ma è bene saperlo.

## 7. Messenger

- **STATO: NOT CONNECTED.** Il traduttore del payload è scritto seguendo la
  documentazione di Meta e il webhook risponde correttamente alla verifica e
  alla firma — ma **non ha mai visto un payload vero** (il collaudo usa un
  payload costruito da noi). La traduzione è quindi **TO VERIFY** al primo
  messaggio reale.
- **COSA SERVE:** un'app Meta, la Pagina Facebook di Rama, i permessi
  approvati.
- **ACCOUNT:** Business Manager di Rama, con la Pagina collegata.
- **API:** Messenger Platform, campi `messages` e `messaging_referrals`.
- **PERMESSI:** `pages_messaging`, `pages_manage_metadata`,
  `pages_read_engagement`. Passano da App Review: **è una pratica, va messa in
  conto** (giorni, non ore).
- **WEBHOOK:** `POST https://<crm>/api/webhooks/messenger`, con
  `META_VERIFY_TOKEN` per la stretta di mano e `META_APP_SECRET` per la firma.
- **DATI CHE RICEVE:** il PSID di chi scrive, il testo, e — se la
  conversazione nasce da un annuncio — `ad_id` e il `ref` che abbiamo messo
  noi. Nome e foto **non** arrivano col messaggio: si chiedono a parte con la
  User Profile API.
- **DATI CHE MANDA:** niente. Il CRM **non risponde ai clienti**: si risponde
  da Messenger come sempre. Questa è una scelta, non un limite tecnico.
- **COSTI:** nessuno.
- **AUTOMAZIONI POSSIBILI:** riconoscere da sola la campagna dal `ref`,
  aprire il filo di conversazione, creare il contatto con la prossima azione
  urgente. Tutto già scritto: si accende quando il collegamento c'è.
- **COME SI VERIFICA:** il primo test concreto è in
  `CAMPAIGN_INTEGRATION_PLAN.md` §12 — una campagna da 10 € con
  `ref=prova-crm`.

## 8. Instagram

- **STATO: NOT CONNECTED.** Come Messenger, con due differenze che contano.
- **PERMESSI:** `instagram_business_basic`, `instagram_business_manage_messages`.
- **DIFFERENZE:** l'identificativo è l'IGSID, non il PSID, e **non è lo stesso
  identificativo di Messenger nemmeno per la stessa persona**. E c'è una
  finestra di 7 giorni per rispondere come essere umano.
- **CONSEGUENZA PRATICA:** la stessa persona che scrive prima su Instagram e
  poi su Messenger resta **due schede** finché non lascia un'email o un
  telefono. Il CRM se ne accorge e lo segnala come possibile doppione; unire è
  una decisione di una persona, non del programma. Non è un difetto: è che
  Meta non ci dice che sono la stessa.
- **DA VERIFICARE:** la forma esatta del payload Instagram non è identica a
  quella di Messenger. Il traduttore la tratta come simile: va controllata sul
  primo messaggio vero.

## 9. WhatsApp Cloud API

- **STATO: NOT CONNECTED.** È l'integrazione più impegnativa delle tre.
- **COSA SERVE:** un WhatsApp Business Account, e **un numero dedicato** —
  oppure la Coexistence, che permette di tenere il numero già in uso.
  **DA VERIFICARE:** quale dei due va bene per Rama dipende da come usano il
  numero oggi, e non lo so.
- **PERMESSI:** `whatsapp_business_messaging`, `whatsapp_business_management`,
  con un token di system user.
- **WEBHOOK:** `POST https://<crm>/api/webhooks/whatsapp`.
- **DATI CHE RICEVE:** numero (`wa_id`), nome del profilo, testo, e per gli
  annunci click-to-WhatsApp il `ctwa_clid` e il `source_id`.
- **NOTA IMPORTANTE:** il `ctwa_clid` identifica **quel clic**, non la
  campagna. Per riconoscere la campagna si usa `source_id`, che è
  l'inserzione. Il `ctwa_clid` resta salvato per quando si faranno i conti con
  le statistiche di Meta.
- **COSTI:** **non è gratis.** Da luglio 2025 si paga per messaggio
  consegnato. E ci sono due cambi già annunciati: **1 agosto 2026** e
  **1 ottobre 2026**. **DA VERIFICARE il listino aggiornato prima di
  accendere**: quello che so ha una data di scadenza.
- **AUTOMAZIONI POSSIBILI:** le stesse di Messenger.

## 10. Meta Lead Ads — i moduli dentro Facebook e Instagram

- **STATO: NOT CONNECTED.** La rotta `/api/webhooks/leads` è scritta e
  compilata, mai provata su dati veri.
- **COME FUNZIONA DAVVERO, e perché è fatta così:** Meta **non manda i dati
  del lead** nel webhook. Manda solo un `leadgen_id`: «è arrivato un modulo,
  vienilo a prendere». I campi si leggono con una seconda chiamata alla Graph
  API, che vuole un token della Pagina con `leads_retrieval`.
- **QUINDI:** con `META_PAGE_TOKEN` configurato, il lead viene letto e
  registrato davvero. **Senza token, l'avviso si conserva e si segna «in
  attesa», e non viene creato nessun contatto.** Un contatto senza nome né
  recapito non è un contatto: è una riga vuota che qualcuno dovrà cancellare.
- **PERMESSI:** `leads_retrieval`, `pages_show_list`,
  `pages_read_engagement`, `pages_manage_ads`. App Review.
- **SCADENZA IMPORTANTE:** Meta tiene i lead **90 giorni**. Chi li scarica a
  mano prima o poi ne perde. Quando il token arriverà, la coda salvata si può
  rilavorare e niente sarà andato perso — è esattamente il motivo per cui il
  payload grezzo si salva **prima** di qualunque altra cosa.

## 11. Meta Ads Insights — la spesa delle campagne

- **STATO: NOT CONNECTED.** È il motivo per cui nel CRM si legge **N/D** al
  posto della spesa, e non uno zero.
- **PERMESSI:** `ads_read`.
- **DATI CHE RICEVE:** spesa, impression, clic per campagna, gruppo e
  annuncio.
- **NEL FRATTEMPO:** la spesa si scrive a mano nella scheda della campagna, e
  il costo per contatto si calcola da sé. Il CRM funziona lo stesso: solo,
  dove non sa, dice che non sa.

---

## Cosa il CRM non fa, e non per dimenticanza

- **Non manda messaggi ai clienti.** Non email, non WhatsApp, non Messenger.
  Le regole automatiche aprono promemoria a voi, non parlano con loro. Il
  giorno che servirà, si aggancia in `crm/lib/dominio/automazioni.ts`.
- **Non unisce due schede da solo.** Quando sospetta un doppione lo dice.
  Unire è irreversibile, quindi lo decide una persona.
- **Non inventa un'attribuzione.** Se non sa da dove arriva un contatto, il
  campo resta vuoto. «Altro» sarebbe una bugia comoda.
- **Non crea un contatto da un tocco sulla card.** Tanta gente appoggia il
  telefono per curiosità. Contarli come lead gonfierebbe i numeri e renderebbe
  inutile l'unico dato che conta: quanti lasciano il nome davvero.
