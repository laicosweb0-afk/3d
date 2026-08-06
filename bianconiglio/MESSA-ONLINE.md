# Messa online — la ricetta completa (~25 minuti, una volta sola)

Questa guida è scritta per essere eseguita senza sapere niente di tecnico:
ogni passo dice **dove cliccare** e **cosa incollare**. Le cose da incollare
sono già pronte qui dentro.

Servono tre account, tutti sulla tua email. Non posso crearli io al posto tuo
per lo stesso motivo per cui non posso firmare al posto tuo: sono proprietà
dell'azienda (e due hanno un pagamento attaccato).

| Account | A cosa serve | Costo |
|---|---|---|
| Anthropic | il cervello del coniglio | ~5 $ una tantum (bastano per mesi di demo) |
| ElevenLabs | la voce Disney | piano Starter, ~5 $/mese |
| Vercel | il link privato online | gratis |

Tieni aperto un blocco note: raccoglierai **4 valori** da incollare alla fine.

---

## Blocco A — Il cervello (5 minuti)

1. Vai su **console.anthropic.com** → **Sign up** → registrati con l'email
   aziendale.
2. Menu a sinistra → **Billing** → **Add credits** → carica **5 $** (minimo).
3. Menu a sinistra → **API Keys** → **Create Key** → dalle un nome
   («bianconiglio») → **copia la chiave** (comincia con `sk-ant-`).
   ⚠️ Si vede UNA volta sola: incollala subito nel blocco note.

→ Nel blocco note ora hai: **`ANTHROPIC_API_KEY`**

---

## Blocco B — La voce Disney (10 minuti, la parte divertente)

1. Vai su **elevenlabs.io** → **Sign up** → registrati → scegli il piano
   **Starter**.
2. Menu a sinistra → **Voices** → **Add a new voice** → **Voice Design**.
3. Nel campo della descrizione incolla la **prima candidata**:

   > Playful young male cartoon character voice for animated film dubbing,
   > Italian, high pitch, bright and warm, slightly mischievous, impeccable
   > diction

4. Nel campo del testo di prova incolla il copione vero (giudica su questo,
   non su «ciao come stai»):

   > Oh! Sei arrivato fin qui… Tic tac, ogni cosa a suo tempo. Segui il
   > coniglio!

5. **Generate** → ascolta le proposte. Se nessuna ti convince, riprova con la
   seconda o la terza descrizione:

   > Whimsical fairy-tale creature voice, Italian, childlike wonder but
   > articulate and quick-witted, theatrical storyteller energy, silvery timbre

   > Cheeky elegant cartoon rabbit voice, Italian, fast-talking, aristocratic
   > playfulness, light and airy, Pixar sidekick style

6. Quando UNA ti fa sorridere: **Save voice** (nome: «Bianconiglio»).
7. Apri la voce appena salvata → trovi il **Voice ID** (una sigla tipo
   `pNInz6obpgDQGcFmaJgB`) → copialo nel blocco note.
8. Clicca sulla tua **iniziale in basso a sinistra** → **API Keys** →
   **Create API Key** → copiala nel blocco note.

→ Nel blocco note ora hai anche: **`ELEVENLABS_API_KEY`** e
**`ELEVENLABS_VOICE_ID`**

---

## Blocco C — Il link privato (5 minuti)

0. Prima, scegli la **parola d'ordine** della demo: quella che darai al
   titolare insieme al link. Scrivila nel blocco note come `DEMO_PASSWORD`.
   (Ora il blocco note ha 4 valori: è tutto.)
1. Vai su **vercel.com** → **Sign up** → **Continue with GitHub** →
   autorizza. (È lo stesso account dove vive già il progetto: niente password
   nuove.)
2. **Add New…** → **Project** → nella lista appare **3d** → **Import**.
3. Nella schermata di configurazione, DUE cose prima di premere Deploy:
   - **Root Directory** → **Edit** → scegli la cartella **`bianconiglio`**.
     È il passaggio che conta: senza, viene pubblicato il sito sbagliato.
   - **Environment Variables** → aggiungi, uno per riga, i 4 valori del
     blocco note (nome a sinistra, valore a destra):
     `DEMO_PASSWORD`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`,
     `ELEVENLABS_VOICE_ID`
4. **Deploy** → un minuto di attesa → appare l'indirizzo del sito
   (tipo `https://bianconiglio-xyz.vercel.app`).

> Se il primo tentativo dice che la cartella `bianconiglio` non esiste,
> significa che il lavoro non è ancora sullo scaffale principale del
> deposito: dimmelo in chat e lo sistemo io in un minuto, poi premi
> **Redeploy**.

---

## Il collaudo (2 minuti, dal tuo iPhone)

1. Apri l'indirizzo → inserisci la parola d'ordine.
2. Il coniglio sbuca dopo un paio di secondi, intero, in piedi.
3. Tocca il microfono («Tocca per svegliare il coniglio») → consenti il
   microfono → chiedi ad alta voce: *«Cerco un profumo per la sera»*.
4. Deve risponderti **con la voce che hai scelto tu**, bocca che si muove.

Poi manda in chat **indirizzo + parola d'ordine**: rifaccio da qui tutte le
verifiche sulla versione online e sistemo quello che eventualmente emerge
solo in produzione.

---

## Se qualcosa non torna

| Sintomo | Causa quasi certa | Rimedio |
|---|---|---|
| «DEMO_PASSWORD non è configurata» | variabile scritta male o mancante | Vercel → Settings → Environment Variables, controlla il nome esatto |
| Il coniglio risponde ma con la voce del telefono | manca `ELEVENLABS_VOICE_ID` o `ELEVENLABS_API_KEY` | aggiungile e premi Redeploy |
| «Tic tac… mi si è impigliata la catena» a ogni domanda | `ANTHROPIC_API_KEY` mancante o senza credito | controlla la chiave e il Billing su console.anthropic.com |
| Pagina bianca o sito sbagliato | Root Directory non impostata | Settings → General → Root Directory → `bianconiglio` → Redeploy |

Per cambiare la voce in futuro: nuova voce su ElevenLabs → sostituisci il
Voice ID su Vercel → Redeploy. Zero codice.
