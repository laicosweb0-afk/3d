# Campagne → CRM — piano di integrazione

Documento di analisi, non di implementazione. Serve a decidere **cosa si può
davvero collegare**, in che ordine, e cosa serve da te prima di scrivere una
riga di codice di integrazione.

Regola che ho seguito: dove non ho potuto verificare tecnicamente — perché
serve un account Meta vero, un numero di telefono o una revisione approvata —
c'è scritto **DA VERIFICARE**. Niente è dato per funzionante finché non lo si
è visto funzionare.

---

## 1. Come Rama genera oggi i contatti con le campagne

**DA VERIFICARE con te e col titolare.** Questo è l'unico punto che non posso
dedurre da solo, ed è quello che decide l'ordine di tutto il resto. Le domande
a cui serve rispondere, con i numeri dell'ultimo mese:

- quali campagne girano adesso (nome, obiettivo, budget giornaliero);
- dove portano: **Messenger**, **WhatsApp**, **modulo istantaneo** (Lead Ads),
  **DM Instagram**, oppure il sito;
- quanti messaggi arrivano al giorno, e chi risponde;
- quanto tempo passa in media fra il messaggio e la risposta;
- dove finiscono oggi quei contatti: a memoria, su un foglio, in rubrica.

Quello che so dal repository: Rama usa già campagne che portano su Messenger —
è la cosa che hai indicato come priorità — e ha la card NFC che scrive
direttamente nel CRM. Il resto è da mappare insieme.

---

## 2. Come vengono gestiti oggi i messaggi Messenger

**DA VERIFICARE.** Presumibilmente dalla app Messenger o dalla Posta di Meta
Business Suite, a mano. Quello che conta sapere:

- chi risponde e con che telefono/computer;
- se è già collegata la **Posta unica** di Business Suite (Messenger +
  Instagram insieme);
- se esiste già un'app Meta collegata alla Pagina (per esempio ManyChat o
  simili): se c'è, va saputo, perché **due app che ascoltano la stessa Pagina
  possono litigare** sugli stessi eventi.

---

## 3. Come collegare Messenger al CRM

È la strada più corta e la più adatta come **primo collegamento reale**.

**Come funziona.** Meta manda un *webhook* — una chiamata HTTP — al nostro
indirizzo ogni volta che qualcuno scrive alla Pagina. Il CRM riceve, riconosce
la persona, apre la conversazione e crea la prossima azione.

**Cosa serve:**

| Pezzo | Cosa |
|---|---|
| App Meta | Un'app su developers.facebook.com, collegata al Business Manager di Rama |
| Iscrizioni webhook | I campi **`messages`** e **`messaging_referrals`** sulla Pagina — servono **tutti e due**, altrimenti l'informazione della campagna non arriva |
| Permessi | `pages_messaging`, più `pages_manage_metadata` e `pages_show_list` per gestire le iscrizioni |
| App Review | Sì, per parlare con utenti veri. In sviluppo si prova con gli account che hanno un ruolo sull'app |
| Verifica azienda | Business Verification sul Business Manager di Rama — **DA VERIFICARE** se già fatta |
| Indirizzo pubblico | Un URL HTTPS che risponde: sarà `crm.ramastore.it/api/ingresso/messenger` |

**Cosa riceviamo davvero** (documentato da Meta):

- il testo del messaggio e il momento in cui è arrivato;
- il **PSID**, l'identificativo della persona per quella Pagina;
- se arriva da un annuncio, l'oggetto `referral` con **`ad_id`**, `source: ADS`,
  `type: OPEN_THREAD`, il parametro **`ref`** (quello che decidiamo noi quando
  si crea l'annuncio) e `ads_context_data` con titolo e immagine dell'annuncio;
- nome, cognome e foto profilo chiedendoli alla *User Profile API* con il PSID.

**Cosa NON riceviamo:**

- **email e telefono**: non esistono in Messenger. Si ottengono solo se la
  persona li scrive, o li chiediamo noi in chat;
- il PSID **non vale fuori dalla Pagina di Rama**: la stessa persona ha un
  identificativo diverso per ogni azienda. Quindi non si può incrociare
  automaticamente con WhatsApp o con Instagram;
- lo storico delle conversazioni precedenti all'attivazione — **DA VERIFICARE**
  se la Conversations API consente di leggerlo all'indietro.

**Il trucco che conviene adottare subito:** quando si crea un annuncio
click-to-Messenger si può impostare un parametro `ref` libero. Mettendoci il
nome della campagna (`ref=bagno-settembre`) il CRM sa da quale campagna arriva
la persona **anche prima** di avere l'integrazione con le statistiche degli
annunci. Costa zero e si può fare oggi, a mano, nel gestore inserzioni.

---

## 4. Come collegare WhatsApp

Più potente, ma più burocratico: è l'unico canale dove la persona ci lascia
il **numero di telefono**, cioè l'unica chiave che permette davvero di
riconoscerla fra un canale e l'altro.

**Cosa serve:**

| Pezzo | Cosa | Nota |
|---|---|---|
| Meta Business Account | Quello di Rama, verificato | Business Verification |
| WABA | *WhatsApp Business Account* dentro il Business Manager | |
| Numero dedicato | Un numero che **non** sia già attivo sulla app WhatsApp Business, oppure attivato in **Coexistence** (la modalità che permette di tenere la app e l'API sullo stesso numero) | **DA VERIFICARE** se Rama vuole usare il numero che usa già |
| App Meta + prodotto WhatsApp | Sulla stessa app | |
| Token | Un *System User* con permesso `whatsapp_business_messaging`; il token temporaneo dura 24 ore e non va usato in produzione | |
| Webhook | Stesso meccanismo di Messenger, su `/api/ingresso/whatsapp` | |
| Template | I messaggi inviati **fuori** dalle 24 ore dall'ultimo messaggio del cliente devono usare modelli approvati da Meta in anticipo | |

**Cosa riceviamo:**

- numero di telefono del cliente, nome del profilo WhatsApp, testo, timestamp;
- se arriva da un annuncio click-to-WhatsApp, l'oggetto `referral` con
  **`ctwa_clid`** (l'identificativo del clic), `source_id` e
  `source_type: ad` (oppure `post` se è un contenuto sponsorizzato).
  È il modo affidabile di attribuire la conversazione all'annuncio: il vecchio
  trucco del testo precompilato si rompe appena il cliente cancella il testo.

**Costi — attenzione, qui si paga davvero.** Da luglio 2025 Meta fattura **per
messaggio consegnato**, non più per conversazione, con prezzo diverso per
categoria (marketing, utility, autenticazione, servizio) e per Paese. Due
cambiamenti annunciati per il 2026: dal **1º agosto 2026** una nuova categoria
per le risposte generate da agenti AI (a consumo), e dal **1º ottobre 2026**
diventano a pagamento anche i messaggi di servizio e utility dentro la
finestra di 24 ore. **Il prezzo esatto per l'Italia è DA VERIFICARE** sul
listino ufficiale di Meta: non lo scrivo a memoria.

C'è però una finestra gratuita che conviene conoscere: le conversazioni nate
da un annuncio click-to-WhatsApp hanno un periodo di ingresso gratuito
(riportato come 72 ore) in cui si può scrivere senza il costo del messaggio
marketing. **DA VERIFICARE** durata e condizioni attuali.

---

## 5. Come collegare Instagram

Tecnicamente è il fratello di Messenger.

- Permessi: `instagram_business_basic` e `instagram_business_manage_messages`,
  con **App Review**; in sviluppo si può provare con un numero limitato di
  account di prova (documentato: 25).
- L'identificativo è l'**IGSID**, unico per utente **per ogni account
  professionale**: come il PSID, non vale fuori da Rama.
- Finestra di risposta: la documentazione Meta indica **7 giorni** per la
  risposta di un operatore umano.
- Cosa riceviamo: testo, timestamp, IGSID, e il riferimento all'annuncio per i
  messaggi nati da inserzioni — **DA VERIFICARE** la forma esatta del payload
  per Instagram, che non è identica a quella di Messenger.

Conviene farlo **dopo** Messenger: è lo stesso impianto, quindi il secondo
canale costa molto meno del primo.

---

## 6. Come collegare i moduli istantanei (Lead Ads)

È il canale più semplice di tutti, perché la persona **compila un modulo**:
nome, email e telefono arrivano già strutturati.

- Webhook `leadgen` più Graph API per rileggere il lead.
- Permessi: `leads_retrieval`, `pages_manage_metadata`, `pages_show_list`,
  `pages_read_engagement`, `ads_management`. App Review necessaria.
- **Meta conserva i lead per 90 giorni**: dopo, dall'API non si recuperano
  più. Per questo l'ingestione automatica non è un lusso.

Se Rama non usa ancora i moduli istantanei, vale la pena provarli: sono la
via più corta per avere contatti completi dentro il CRM.

---

## 7. La spesa delle campagne

Per rispondere a *«questa campagna quanto è costata?»* serve un pezzo a parte:
la **Ads Insights API** (permesso `ads_read`, più `read_insights` per la sola
lettura). Dà per ogni campagna impression, clic, **spesa**, per giorno.

Si legge una volta al giorno e si scrive nel CRM accanto ai risultati
commerciali. Finché non è collegata, il CRM accetta la spesa **inserita a
mano** — e dove non c'è, scrive **N/D**, mai zero.

---

## 8. Cosa possiamo e cosa non possiamo ricevere — il riassunto

| Dato | Messenger | Instagram | WhatsApp | Modulo istantaneo |
|---|---|---|---|---|
| Nome | sì (profilo) | sì (profilo) | sì (nome profilo) | sì |
| Email | **no** | **no** | **no** | sì |
| Telefono | **no** | **no** | **sì** | sì |
| Testo del messaggio | sì | sì | sì | — |
| Annuncio di provenienza | sì (`ad_id`, `ref`) | DA VERIFICARE | sì (`ctwa_clid`) | sì |
| Identificativo stabile | PSID (solo Rama) | IGSID (solo Rama) | numero | email/telefono |
| Storico precedente | DA VERIFICARE | DA VERIFICARE | no | no |
| Costo del singolo contatto | no — solo spesa di campagna | no | no | no |

**La conseguenza importante:** solo WhatsApp e i moduli danno una chiave
(telefono, email) che permette di riconoscere la stessa persona su più canali.
Per Messenger e Instagram il collegamento è **una decisione umana** — «questa
Giulia è quella di prima» — e per questo il CRM deve offrire un **unisci
contatti** comodo, non pretendere che il computer indovini.

---

## 9. Cosa richiede configurazione manuale (non automatizzabile da qui)

1. Business Verification del Business Manager di Rama.
2. Creazione dell'app Meta e collegamento alla Pagina.
3. App Review per ogni permesso (settimane, non giorni).
4. Per WhatsApp: WABA, numero, eventuale Coexistence, template approvati.
5. Impostazione del parametro `ref` sugli annunci click-to-Messenger.
6. Carta di credito sul Business Manager per la spesa pubblicitaria e per i
   messaggi WhatsApp.

## 10. Cosa può essere automatizzato

Tutto il resto: ricezione dei webhook, riconoscimento della persona, apertura
della conversazione, creazione della prossima azione, avanzamento di fase,
promemoria di follow-up, conteggi per campagna, lettura giornaliera della
spesa.

---

## 11. Cosa mi serve da te, in ordine

1. **Le risposte del punto 1** (mezz'ora col titolare).
2. Accesso al **Business Manager** di Rama come sviluppatore, o una persona che
   lo abbia e possa cliccare insieme a noi.
3. L'**ID della Pagina** Facebook e dell'account Instagram professionale.
4. Se si vuole WhatsApp: decidere **quale numero** e se tenerlo anche sulla app.
5. Il progetto Supabase e Vercel (già in `CRM-RAMA.md`): senza il CRM online a
   un indirizzo HTTPS, i webhook non hanno dove bussare.

---

## 12. Il primo collegamento concreto da provare

**Messenger, con un annuncio solo.**

1. Il CRM va online (Supabase + Vercel): senza indirizzo pubblico non si parte.
2. Si crea l'app Meta e si iscrive la Pagina ai campi `messages` e
   `messaging_referrals`.
3. Si crea **una** campagna click-to-Messenger con `ref=prova-crm`.
4. Si spendono 10 €.
5. Si guarda se nel CRM compare: il contatto, la conversazione, la campagna
   giusta e la prossima azione «rispondere».

Se questo giro funziona, tutto il resto è ripetizione: Instagram e WhatsApp
usano lo stesso impianto, cambia solo l'adattatore.

**Nel frattempo il CRM funziona lo stesso**, a mano: le campagne si creano e
si collegano ai contatti senza nessuna API — è quello che ho costruito adesso
(vedi `CRM-RAMA.md`, sezione Campagne). L'integrazione riempie automaticamente
caselle che già esistono.

---

## Fonti

- [Messenger Platform — webhook `messaging_referrals`](https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messaging_referrals)
- [Messenger Platform — webhook `messages`](https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages/)
- [Messenger Platform — User Profile API](https://developers.facebook.com/documentation/business-messaging/messenger-platform/identity/user-profile)
- [Instagram — messaging API con Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/)
- [Meta — Lead Ads, recupero dei lead](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving) · [webhook leadgen](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/)
- [Meta — Ads Insights API](https://developers.facebook.com/documentation/ads-commerce/marketing-api/insights)
- [Click-to-WhatsApp: attribuzione con `ctwa_clid`](https://whapi.cloud/blog/track-click-to-whatsapp-ctwa-clid)
- [WhatsApp Cloud API — requisiti di attivazione](https://www.wati.io/en/blog/whatsapp-api-prerequisites/) · [prezzi per messaggio e cambiamenti 2026](https://blueticks.co/blog/whatsapp-business-api-pricing-2026)
