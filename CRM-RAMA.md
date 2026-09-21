# CRM Rama Ceramiche — la cabina di regia commerciale

Il CRM è **di Rama Ceramiche** e ci entrano in due: il titolare e l'agenzia. I
clienti non devono sapere che esiste.

Non è un cruscotto che mostra numeri: è uno strumento che dice **cosa fare
adesso**. La regola che tiene in piedi tutto il resto è una sola:

> Nessun contatto attivo resta senza una prossima azione.

Da lì discende il modello: ogni persona ha una **fonte** (da dove è arrivata),
una **fase** (dove si trova nel percorso), una **prossima azione** con la sua
data, un valore in gioco e una storia che non si cancella.

    INGRESSO → CONTATTO → QUALIFICAZIONE → APPUNTAMENTO → PREVENTIVO
             → FOLLOW-UP → ORDINE → CLIENTE          (oppure PERSO, col motivo)

## Come è fatto dentro

Tutto passa da un solo strato dati — il **deposito** — con due attuazioni
intercambiabili. Le pagine non sanno cosa c'è sotto.

```
app/                        le pagine: Oggi, Pipeline, Contatti, Scheda,
                            Ingressi, Analisi, Attenzioni, Codice
app/azioni.ts               l'unico posto che scrive: server action → deposito
lib/dominio/                il modello, senza database e senza interfaccia
  tipi.ts                   contatto, fonte, fase, azione, evento, opportunità
  fasi.ts                   le 10 fasi con trigger di entrata e di uscita
  fonti.ts                  le 10 fonti, raggruppate in famiglie e colori
  priorita.ts               urgente / da fare / normale — soglie in cima
  automazioni.ts            «dopo un preventivo, follow-up a 4 giorni»
lib/dati/
  istantanea.ts             TUTTI i conti: elenco, pipeline, ingressi,
                            analisi, attenzioni. Funzioni pure.
  deposito.ts               l'interfaccia
  deposito-supabase.ts      Postgres
  deposito-demo.ts          in memoria, per far girare tutto senza database
  demo-semina.ts            i dieci casi di prova
supabase/migrazioni/
  0001_schema.sql           impianto iniziale (card NFC)
  0002_crm.sql              il CRM commerciale: fonte, fase, azioni, eventi,
                            opportunità — da eseguire dopo il primo
```

**Perché i conti stanno in un file solo.** `istantanea.ts` lavora su una
fotografia dei dati, quindi la versione demo e quella su Postgres danno per
forza gli stessi numeri: non ci sono due implementazioni da tenere allineate.
Per un negozio (centinaia di righe) si legge tutto e si calcola in memoria; se
un giorno i contatti diventassero decine di migliaia, si spezza in query
mirate **lì dentro**, e le pagine non se ne accorgono.

## Modalità dimostrativa

Senza le chiavi di Supabase il CRM parte lo stesso, con dieci scenari di
esempio, e **funziona davvero**: completi un'azione e sparisce dalla coda,
sposti una card e la fase cambia, registri un preventivo e nasce il follow-up.
Le scritture vivono in memoria: al riavvio si torna ai dati di partenza.

```bash
cd crm
npm install
npm run dev          # http://localhost:3100 — modalità dimostrativa
```

I dieci casi coprono: lead Instagram appena arrivato, lead Google qualificato,
appuntamento fissato, preventivo appena mandato, preventivo muto da otto
giorni, campione consegnato e mai rientrato, ordine confermato, cliente
servito, opportunità persa col motivo, e un contatto vivo **senza prossima
azione** — quello che il CRM deve gridare.

Con le chiavi presenti passa da sé ai dati veri. `CRM_MODO=demo` forza la
modalità dimostrativa anche con le chiavi configurate: utile per far vedere il
CRM senza toccare niente.

## Le pagine

| Pagina | A cosa serve |
|---|---|
| **Oggi** | La coda di lavoro: cosa è urgente adesso, cosa arriva nei prossimi tre giorni, chi è entrato e non ha ancora sentito nessuno. Ogni voce ha Completato, Posticipa, Apri contatto. |
| **Pipeline** | Dove sono ferme le persone (quante e quanto valgono) e il tabellone: trascini una card, cambia la fase davvero — con evento in timeline e nuova azione se resterebbe scoperta. |
| **Contatti** | Ricerca, filtri combinabili e scorciatoie alle domande vere: senza prossima azione, preventivi sopra 3.000 €, zitti da più di cinque giorni, azioni scadute. |
| **Scheda** | Prossima azione in testa, il percorso in ordine di tempo, le opportunità col loro valore, il registratore di attività, l'anagrafica e la cancellazione definitiva. |
| **Ingressi** | Cosa porta ogni fonte: lead, qualificati, preventivi, ordini, valori. La domanda vera è quali portano lavoro, non messaggi. |
| **Analisi** | Valore in pipeline, ordini chiusi, tempi medi, dove si perde per strada, e le risposte già calcolate («cosa devo fare oggi», «quali preventivi seguire»). |
| **Attenzioni** | Le anomalie: senza azione, preventivo muto, fermo da troppo, campione senza seguito, appuntamento senza seguito, alto valore fermo. |
| **Codice** | Il banco della card NFC: batti `RAMA70-XXXX` e lo segni riscattato. Richiede Supabase. |

## Le regole che il CRM applica da sé

Stanno in `lib/dominio/`, in chiaro, con le soglie in cima al file:

- **priorità** — urgente: azione scaduta o in scadenza oggi, oppure silenzio da
  14 giorni, oppure nessuna azione su un contatto sopra 3.000 €. Da fare: in
  scadenza entro tre giorni, o silenzio da una settimana. Il valore conta
  nell'ordinamento, non nel colore: se tutto è urgente, niente lo è.
- **automazioni** — nuovo lead → rispondere oggi; preventivo inviato →
  follow-up a 4 giorni; campione consegnato → richiamo per il rientro a 10
  giorni; appuntamento → preparare il preventivo il giorno dopo; cambio fase →
  l'azione tipica di quella fase, ma solo se il contatto resterebbe scoperto.

Nessuna di queste regole manda messaggi a nessuno: **aprono promemoria**. Un
motore di invii veri (email, WhatsApp, code differite) si aggancia lì, senza
toccare le pagine.

## Messa online

### 1. Il database (Supabase)

1. **New project** su [supabase.com](https://supabase.com), piano gratuito,
   **region Frankfurt (eu-central-1)**: sono dati personali di clienti
   italiani, restano in Europa.
2. **SQL Editor**: esegui prima `crm/supabase/migrazioni/0001_schema.sql`, poi
   `0002_crm.sql`. Il secondo trasforma l'impianto della card nel CRM
   commerciale senza perdere niente: traduce le vecchie provenienze in fonti,
   gli stati in fasi, spezza il nome in nome e cognome, trasforma le note in
   eventi e crea un'opportunità per ogni credito già emesso.
3. **Authentication → Providers → Email**: acceso, ma **"Enable sign ups"
   spento**. Si entra solo su invito.
4. **Authentication → Users → Invite user**: due account, il tuo e quello del
   titolare.
5. **Project Settings → API**: copia `Project URL`, `anon public` e
   `service_role`. La terza scavalca tutte le regole di accesso: vive solo
   nelle variabili del server, mai nel browser.

### 2. La pubblicazione (Vercel)

Un progetto che guarda una cartella sola:

| Campo | Valore |
|---|---|
| Framework Preset | **Next.js** |
| Root Directory | **`crm`** |
| Production Branch | `main` |

`crm/vercel.json` fissa già la regione **fra1** e gli header di sicurezza.
Variabili d'ambiente (il modello è in `crm/.env.example`):

| Variabile | Valore |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | il Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la chiave `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | la chiave `service_role` |
| `LEAD_IP_PEPE` | una stringa casuale lunga |
| `ORIGINI_CONSENTITE` | `https://club.ramastore.it` |
| `RESEND_API_KEY`, `EMAIL_MITTENTE`, `EMAIL_RISPOSTA` | invio del codice della card |

Poi **Settings → Domains → `crm.ramastore.it`** e nel DNS un CNAME `crm` →
il valore **esatto** che mostra Vercel in quella schermata.

### 3. La card NFC

`public/club/index.html` manda il lead a `/api/lead`. Da lì entra nel CRM come
qualsiasi altro contatto: fonte `card_nfc`, fase `nuovo`, un'opportunità col
lavoro del quiz e il promemoria di richiamo a due giorni — più il credito del
Club, che resta sulla sua tabella. Dettagli e collaudo della card in
`CLUB-RAMA.md`.

### 4. L'email (Resend)

Piano gratuito, dominio `ramastore.it` da verificare nel DNS. Senza chiave il
CRM registra il lead lo stesso e la card, invece di promettere un'email, dice
al cliente di mostrare il codice in negozio.

## Collaudo

```bash
cd crm && npm run build && npm run typecheck   # verdi
npm start &                                    # modalità dimostrativa

node tools/crm-smoke.mjs /tmp/scatti           # il giro completo
```

Il collaudo non guarda se le pagine sono belle, guarda se **cliccare cambia
davvero le cose**: completa un'azione e verifica che sparisca dalla coda e
resti nella storia, sposta una card nel kanban e verifica la fase e l'evento,
crea un contatto e verifica che nasca con la prossima azione, registra un
preventivo, cerca, elimina, e controlla che su telefono non ci sia
scorrimento laterale. Esce 1 al primo scostamento.

Contro l'istanza vera servono anche `CRM_URL`, `CRM_EMAIL`, `CRM_PASSWORD`.

## I dati personali

Tutto in Europa (Supabase Francoforte, Vercel `fra1`). Consenso con data,
IP solo in impronta, cancellazione definitiva dalla scheda, export CSV.
Restano a Rama: informativa privacy pubblicata e contratti di trattamento con
Supabase, Vercel e Resend.

## Cosa non c'è ancora

Invii automatici veri (email e WhatsApp), assistente in linguaggio naturale
(l'impianto c'è: le risposte in Analisi sono calcolate dalle stesse funzioni
da cui dovrà leggere), importazione dell'anagrafica storica del negozio,
gestione dei campioni come tabella a sé — oggi vivono come eventi
«campione consegnato» e «campione reso», che bastano per il follow-up.
