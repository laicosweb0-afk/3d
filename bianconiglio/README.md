# Bianconiglio — demo privata (FASE 1)

Il link privato da mostrare al titolare: la hero col claim del biglietto, il
Bianconiglio che sbuca, gli occhi che seguono il dito, e una conversazione a
voce con un sommelier olfattivo che consiglia fragranze vere del catalogo.

**Questa cartella è un progetto a sé.** Non condivide niente con il sito nella
cartella superiore — né `package.json`, né configurazione, né deploy. Il sito
sopra è un export statico su GitHub Pages e non può avere API routes; questa
demo ne ha bisogno per tenere le chiavi lontane dal browser. Tenerli separati
significa che qui non si può rompere niente di quello che è già online.

---

## 1. Le due cose che mancano per essere completa

### Il PNG del Bianconiglio

Finché non c'è, al suo posto compare un riquadro tratteggiato che dice cosa
manca. Scaricalo e mettilo lì:

```bash
cd bianconiglio
curl -o public/bianconiglio.png "https://d8j0ntlcm91z4.cloudfront.net/user_3EzPcrBGp32RbeIR79HWLyATCBp/hf_20260806_101726_45a01fb1-d3d4-4f5c-9b60-09b0710ab805.png"
```

> **Guardane il peso prima di pubblicare.** Un PNG 4K può pesare parecchi MB, e
> sarebbe l'unica cosa capace di affossare il punteggio Lighthouse di una pagina
> per il resto leggerissima (107 kB di JavaScript in tutto). Il coniglio non
> viene mai mostrato più largo di 416 px: se il file supera i 400-500 kB, prima
> di andare online conviene ridurlo — `cwebp -q 82 -resize 900 0` produce un
> `.webp` che a occhio è identico e pesa una frazione. In quel caso cambia anche
> `POSA_BASE` in `lib/anatomia.ts`.

### La voce

Su ElevenLabs → Voice Design, con la descrizione concordata:

> playful young cartoon character voice, Italian, high pitch, warm, slightly
> mischievous, clear diction

Genera 3-4 candidate, scegli a orecchio, copia il **Voice ID** e mettilo in
`ELEVENLABS_VOICE_ID`. Da quel momento la voce vera si accende da sola, senza
toccare il codice.

Finché il Voice ID non c'è, **la demo funziona lo stesso**: ripiega sulla voce
del browser col tono alzato. È un segnaposto, si sente che lo è, e serve solo a
non lasciare la demo muta nel frattempo.

---

## 2. Far girare la demo

```bash
cd bianconiglio
npm install
cp .env.example .env.local     # e compila almeno DEMO_PASSWORD e ANTHROPIC_API_KEY
npm run dev                    # http://localhost:3000
```

`npm run build && npm start` per provare la versione di produzione.

---

## 3. Metterla online su Vercel

1. Vercel → **Add New → Project** → scegli questo repository.
2. **Root Directory: `bianconiglio`.** È il passaggio che conta: senza, Vercel
   costruisce il sito della cartella superiore.
3. Framework: Next.js (lo riconosce da solo). Nessun comando da cambiare.
4. In **Settings → Environment Variables** incolla le variabili di
   `.env.example` (le stesse per Production e Preview).
5. Deploy.

La demo è già protetta da password sua (punto 4 qui sotto) e già `noindex`.
Se vuoi una seconda serratura, in **Settings → Deployment Protection** puoi
attivare anche la password di Vercel — ma non serve, e aggiunge una schermata
in più prima della nostra.

---

## 4. Come è chiusa

Chi apre il link senza la parola viene rimandato a `/sblocca`, e non vede
niente: né la pagina, né le API, né il PNG del coniglio. La parola la scegli tu
in `DEMO_PASSWORD`.

Il cookie che resta nel browser **non contiene la parola**, contiene la sua
impronta: leggendolo non si risale a niente. Dura 30 giorni.

Le chiavi di Claude e di ElevenLabs non escono mai dal server: il browser parla
solo con `/api/chat` e `/api/tts`, che stanno qui dentro. Nessuna variabile ha
il prefisso `NEXT_PUBLIC_`, che è l'unico modo per finire nel bundle.

---

## 5. Le cose che vorrai cambiare

| Cosa | Dove |
|---|---|
| Il messaggio di benvenuto | `lib/personaggio.ts` → `BENVENUTO` |
| La personalità del coniglio | `lib/personaggio.ts` → `SISTEMA` |
| Cosa dice quando qualcosa si rompe | `lib/personaggio.ts` → `SCUSA` |
| Il claim, il marchio, il link «Continua» | `lib/personaggio.ts` → `CLAIM` |
| Il Voice ID e il modello vocale | variabili d'ambiente, nessun file |
| Il modello di Claude | `ANTHROPIC_MODEL` (default `claude-sonnet-5`) |
| Colori, tipografia, cornici | `app/globals.css`, in cima |
| Dove stanno occhi e bocca sul PNG | `lib/anatomia.ts` — vedi qui sotto |

### Calibrare occhi e bocca

Il PNG è un'immagine ferma: le pupille che seguono il dito e la bocca che si
apre sono disegnate sopra, e vanno allineate una volta sola.

Apri la demo aggiungendo **`?calibra=1`** all'indirizzo: compaiono una griglia e
tre mirini — due sugli occhi, uno sulla bocca. Sposta i numeri in
`lib/anatomia.ts`, ricarica, finché i mirini non coincidono. Sono percentuali,
quindi valgono su ogni schermo. Poi togli `?calibra=1`.

Se un giorno generi la posa a **bocca aperta** dall'Element Higgsfield, mettila
in `public/` e scrivi il suo percorso in `POSA_BOCCA_APERTA`: la demo smette di
disegnare la bocca e passa alla dissolvenza fra le due immagini, che è più bella.

---

## 6. Cosa succede se qualcosa non funziona

La regola è una sola, e vale ovunque: **il testo arriva prima della voce, e la
conversazione non si ferma mai.**

| Se si rompe | Cosa vede il titolare |
|---|---|
| ElevenLabs (chiave, quota, Voice ID) | Il coniglio parla con la voce del browser |
| Claude (chiave, rete, quota) | «Tic tac… mi si è impigliata la catena dell'orologio.» |
| Il microfono è negato | «Il microfono è chiuso. Scrivi pure, ti leggo lo stesso.» |
| Il browser non ha il riconoscimento vocale | Il tasto microfono non compare — resta la scrittura |
| Il PNG manca | Un riquadro che dice quale file mettere e dove |

Nessuno di questi casi mostra un errore tecnico: il coniglio inciampa nella
catena dell'orologio, non in uno stack trace.

---

## 7. Cosa **non** c'è, di proposito

Niente raccolta email, niente analytics, niente aggancio al dominio del cliente,
nessuna menzione di quel nome che a gennaio si potrà dire. Il sito vero non è
stato toccato. La Hero 3D scrolling è la FASE 2 e comincia solo dopo il sì del
titolare.
