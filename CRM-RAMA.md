# CRM Rama Ceramiche — i lead della card diventano clienti

La card NFC di Rama (`public/club/index.html`, vedi `CLUB-RAMA.md`) raccoglie
ogni giorno contatti qualificati: nome, email, che stanza sta rifacendo, che
stile preferisce, se vuole il credito in negozio o via email. Fino a ieri quel
passaggio finiva nel vuoto — il codice `RAMA70-XXXX` se lo inventava il browser,
il form non salvava niente e la schermata finale prometteva un'email che non
partiva.

Adesso il tocco sulla card scrive in un database. Il codice lo batte il server,
è unico e si riscatta al banco. E chi sta in showroom, la mattina, apre una
pagina che dice chi richiamare.

    card NFC  →  POST /api/lead  →  contatto + credito + promemoria  →  email
                                              ↓
                                    il CRM dello showroom

## Dove sta

Nella cartella **`crm/`**: un'applicazione Next.js a sé, con il suo
`package.json` e la sua build. Non c'entra con il sito di Mondial Service che
sta nella radice del repo — quello è un export statico, questo ha bisogno di un
server (login, database, invio email). Convivono nello stesso repository come ci
convive già la landing del club: due progetti, due pubblicazioni.

| Cosa | Dove |
|---|---|
| Applicazione | `crm/app/`, `crm/lib/` |
| Schema del database | `crm/supabase/migrazioni/0001_schema.sql` |
| Variabili d'ambiente | `crm/.env.example` (il modello, senza segreti) |
| Collaudo | `tools/crm-smoke.mjs` |

## 1. Il database (Supabase)

1. Su [supabase.com](https://supabase.com) → **New project**. Piano gratuito.
   **Region: Frankfurt (eu-central-1)** — sono dati personali di clienti
   italiani, restano in Europa.
2. **SQL Editor → New query**: incolla tutto `crm/supabase/migrazioni/0001_schema.sql`
   e premi **Run**. Crea tabelle, indici, regole di accesso e il trigger che
   apre il profilo a ogni persona invitata.
3. **Authentication → Providers → Email**: lascia acceso *Email*, **spegni
   "Enable sign ups"**. Nel CRM non c'è registrazione: si entra solo su invito.
4. **Authentication → Users → Invite user**: una per ogni persona dello
   showroom. Ricevono l'email, scelgono la password, entrano.
5. **Project Settings → API**: copia `Project URL`, `anon public` e
   `service_role`. Le prime due sono pubbliche per natura; **la terza no**:
   scavalca tutte le regole di accesso, vive solo nelle variabili del server.

## 2. La pubblicazione (Vercel)

Come per il club, un progetto Vercel che guarda una sola cartella:

| Campo | Valore |
|---|---|
| Framework Preset | **Next.js** |
| Root Directory | **`crm`** |
| Production Branch | `main` |

`crm/vercel.json` fissa già la regione **fra1** (Francoforte) e gli header di
sicurezza. In **Settings → Environment Variables** vanno:

| Variabile | Valore |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | il Project URL di Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la chiave `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | la chiave `service_role` |
| `LEAD_IP_PEPE` | una stringa casuale lunga, inventata da te |
| `ORIGINI_CONSENTITE` | `https://club.ramastore.it` |
| `RESEND_API_KEY` | la chiave di Resend (punto 4) |
| `EMAIL_MITTENTE` | `Rama Ceramiche <club@ramastore.it>` |
| `EMAIL_RISPOSTA` | l'indirizzo vero del negozio |

Poi **Settings → Domains → `crm.ramastore.it`**, e nel DNS del dominio un solo
record:

    Tipo    CNAME
    Nome    crm
    Valore  <quello che ti mostra Vercel>

Vale lo stesso avvertimento del club: copia il valore **esatto** dalla
schermata di Vercel, non da qui. Il dominio nudo e `www` non si toccano.

## 3. La card che parla col CRM

In `public/club/index.html`, in cima allo script, c'è:

```js
const CONFIG = {
  api: '…/api/lead',   // in locale punta a localhost:3100
  privacy: ''          // ← l'informativa privacy di Rama
};
```

L'indirizzo dell'API è già `https://crm.ramastore.it/api/lead`: se il CRM finisce
altrove, si cambia lì e basta.

**`privacy` va riempito.** Finché è vuoto, accanto alla spunta del consenso non
compare nessun link — meglio niente che un link rotto — ma stai raccogliendo
nome ed email di privati: l'informativa ci vuole. Appena Rama la pubblica,
incolla l'indirizzo lì dentro.

Cosa succede se la rete manca proprio in quel momento: la pagina **non** inventa
un codice. Dice che non riesce, lascia riprovare, e intanto tiene il contatto da
parte per rispedirlo al caricamento successivo.

## 4. L'email (Resend)

Su [resend.com](https://resend.com) (piano gratuito: 3.000 email al mese) →
**Domains → Add domain**: `ramastore.it`, e nel DNS i record che ti dà
(SPF/DKIM). Poi **API Keys → Create**, e la chiave va in `RESEND_API_KEY`.

Senza chiave il CRM non si rompe: registra il lead lo stesso e la card, invece
di promettere un'email, dice al cliente di mostrare il codice in negozio.

## 5. Come si usa, la mattina

| Pagina | A cosa serve |
|---|---|
| **Oggi** | Chi va richiamato (con quelli in ritardo in rosso) e chi è arrivato dalla card senza che nessuno l'abbia ancora sentito. Ogni lead nuovo si porta dietro un promemoria automatico a due giorni. |
| **Contatti** | La rubrica: ricerca per nome o email, filtro per stato, scheda con note, promemoria, crediti, tag e chi lo segue. |
| **Codice** | Il banco: il cliente mostra `RAMA70-XXXX`, tu lo batti e vedi di chi è, quanto vale, se è scaduto o già usato. Un tocco e risulta riscattato. |
| **Impostazioni** | Chi ha accesso, quanti dati ci sono, e il pulsante per scaricare tutto in CSV. |

Gli stati di un contatto vanno da *Nuovo* a *Cliente* (o *Perso*) passando per
*Contattato*, *Venuto in showroom*, *Preventivo fatto*: servono a sapere a colpo
d'occhio chi è rimasto indietro.

## 6. Sviluppo e collaudo

```bash
cd crm
cp .env.example .env.local     # e riempi i valori del tuo progetto Supabase
npm install
npm run dev                    # http://localhost:3100
npm run build && npm run typecheck
```

Con il CRM in piedi, la prova completa del giro:

```bash
# il lead come lo manda la card
curl -X POST http://localhost:3100/api/lead -H 'Content-Type: application/json' \
  -d '{"nome":"Mario Rossi","email":"mario@example.it","consenso":true,
       "progetto":"Bagno","stile":"Minimal","consegna":"Negozio",
       "client_token":"prova-1"}'
# → {"codice":"RAMA70-…","scadenza":"…","emailInviata":false}
# ripetendo la stessa chiamata esce lo stesso codice: non si duplica niente

# il giro completo dell'interfaccia
CRM_URL=http://localhost:3100 CRM_EMAIL=tu@ramastore.it CRM_PASSWORD=… \
  node tools/crm-smoke.mjs /tmp/scatti
```

E la card, che va provata anche da sola (il CRM lì è simulato, non serve
accenderlo):

```bash
node tools/static-server.mjs public 8932 &
node tools/club-mobile.mjs /tmp/scatti-club
```

## 7. I dati personali

Quello che il codice fa già:

- tutto in Europa: Supabase a Francoforte, Vercel in `fra1`;
- il consenso promozionale salvato con la data in cui è stato dato;
- dell'IP di chi compila resta solo un'impronta con pepe, mai l'indirizzo;
- niente entra e niente esce senza login: l'unica porta aperta è `/api/lead`,
  che scrive soltanto;
- cancellazione definitiva di una persona dalla sua scheda — sparisce con note,
  promemoria e crediti;
- export CSV, così i dati restano del cliente qualunque cosa succeda a questo
  programma.

Quello che resta a Rama, e non posso fare io: pubblicare l'informativa privacy
(e incollarne l'indirizzo in `CONFIG.privacy`), firmare i contratti di
trattamento con Supabase, Vercel e Resend, e decidere per quanto tenere i
contatti che non diventano mai clienti.

## 8. Cosa non fa (ancora)

Niente colonne trascinabili della trattativa, niente preventivi, niente invio
WhatsApp, nessuna statistica di conversione della card, nessuna importazione
dell'anagrafica storica del negozio. Sono i passi successivi, da decidere
quando il primo mese di lead avrà detto cosa serve davvero.

## 9. Quanto costa

Zero, all'inizio: Supabase (piano gratuito, 500 MB di database), Vercel (Hobby)
e Resend (3.000 email al mese) bastano per un negozio. Il dominio è già di Rama.
Si paga quando il volume cresce — e a quel punto sarà un buon segno.
