# Mondial Service — Processo di pre-produzione
### Roadmap a fasi con gate di approvazione

> Regola del processo: **una fase non parte finché la precedente non è approvata.**
> Stato attuale: **Fase 1 aperta** — in attesa delle reference (vedi §Fase 1).
>
> Già in cassaforte (non si butta, si riusa):
> - Briefing PDF analizzato
> - Prototipo tecnico dello scroll-scrubbing (`prototype/`) — prova che l'effetto regge, desktop e mobile
> - Bozza architettura tecnica (`docs/ARCHITETTURA.md`) — verrà rivista in Fase 5

---

## Le tre sfide che pongo io, prima di iniziare

**1. "Beige + oro + serif" da solo non è una direzione: è il default del lusso immobiliare.**
Metà dei siti premium di real estate usa esattamente questa formula. Ciò che Mondial
Service ha di *suo* è la trasformazione grezzo→finito: nessun immobiliare la può
raccontare, un'impresa edile sì. La firma del sito deve essere questa — non solo nei
video, ma ovunque: micro-interazioni dove gli elementi si "costruiscono", linee che si
completano, luce che entra. La palette è il vestito; la trasformazione è l'identità.

**2. Quattro capitoli video sono tanti.**
Ogni capitolo costa: generazione Higgsfield coerente, peso su mobile, attenzione
dell'utente. Tre capitoli forti (Grezzo → Lavori → Consegna) reggono meglio di quattro
medi, con gli impianti raccontati dentro "Lavori" come portfolio tecnico. Decidiamo in
Fase 3 con lo storyboard in mano — ma arrivo al tavolo con questa posizione.

**3. Il rischio n°1 del progetto è la coerenza tra clip generate.**
Il match cut vive o muore sulla continuità di prospettiva e luce tra video generati
separatamente. Va progettato PRIMA di generare qualsiasi clip: inquadrature fisse
condivise, stessa altezza camera, stessa temperatura luce, prompt di regia comuni.
Per questo lo Storyboard (Fase 3) è una fase a sé e blocca la Raccolta asset (Fase 6).

---

## Fase 1 — Ricerca creativa  ⟵ SIAMO QUI

**Obiettivi**
- Definire un territorio visivo unico, non "il solito lusso beige"
- Capire chi deve convincere il sito (il cliente del cliente)

**Deliverable**
- Moodboard taggata (15–25 reference, ognuna con il *perché*)
- 2–3 direzioni creative alternative con pro/contro
- Concept statement: UNA frase che guida ogni decisione successiva

**Reference da raccogliere (la tua lista della spesa)**
1. **5–8 screenshot di OAKHAUS e PolidoriDev** con una nota ciascuno: *cosa* ti piace
   di quella schermata (lo spazio? il titolo? la transizione?). Il "cosa" vale più del link.
2. **2–4 siti Awwwards/FWA** che ti fanno dire "voglio questo livello" — anche fuori
   settore. Servono a tarare l'asticella di motion e interazione.
3. **10–15 foto reali dei VOSTRI cantieri** — le più importanti di tutte: stessa stanza
   grezza e finita se esiste, dettagli di materiali (parquet, marmo, rubinetteria),
   luce naturale. Da qui nascono i prompt Higgsfield e il match cut. Senza queste,
   generiamo case "finte" che un occhio bolognese riconosce al volo.
4. **1–2 esempi di ciò che NON volete** (siti di concorrenti o stili da evitare) —
   definire il "no" accelera tutto.
5. **Materiale brand esistente**: logo, colori usati su furgoni/biglietti/divise, se esiste.

**Domande aperte**
- Chi è il cliente tipo? Famiglia che ristruttura casa propria, o anche investitori/agenzie?
- Fascia di prezzo percepita: MS vuole posizionarsi alto? Il sito lo posizionerà comunque.
- Perché un cliente sceglie MS invece di un'altra impresa? (la risposta vera, da cantiere)

**Decisioni da prendere a fine fase**
- Direzione creativa unica approvata (una sola)
- Concept statement approvato

**Rischi**
- Reference troppo eterogenee → identità diluita. Mitigazione: max 3 direzioni, poi si taglia.

**Dipendenze**: nessuna. Blocca tutte le fasi successive.

---

## Fase 2 — Identità visiva

**Obiettivi**: tradurre la direzione scelta in linguaggio visivo concreto.
**Deliverable**: palette definitiva con regole d'uso dell'accento; coppia tipografica
testata su titoli reali in italiano (le parole lunghe italiane rompono i layout inglesi);
wordmark/logo; regia della luce (come la luce racconta il "finito").
**Domande**: esiste un logo da rispettare? Vincoli di coerenza con materiali stampati?
**Decisioni**: wordmark tipografico vs logo disegnato; palette e tipografia congelate.
**Rischi**: l'oro scivola nel kitsch se usato oltre il 5% della superficie — serve disciplina.
**Dipendenze**: Fase 1 approvata.

---

## Fase 3 — Storyboard

**Obiettivi**: la regia dell'esperienza. La fase più importante del progetto.
**Deliverable**: storyboard per capitolo (frame iniziale, frame finale, movimento,
punto di ingresso dei testi); **mappa dei match cut** (quale frame aggancia quale);
**prompt Higgsfield pronti** per ogni clip, con specifiche tecniche (720p, H.264
all-keyframe, 4–8 s, primo frame = grezzo, ultimo = finito); struttura narrativa
definitiva (3 o 4 capitoli).
**Domande**: quali ambienti reali del vostro portfolio meritano un capitolo?
**Decisioni**: numero di capitoli; durata totale dell'esperienza (target: 60–90 s di scroll).
**Rischi**: clip incoerenti tra loro → match cut impossibile. Mitigazione: prompt di
regia condivisi, generazione a lotti con verifica di continuità prima di approvare.
**Dipendenze**: Fase 2 (la luce e la palette guidano i prompt).

---

## Fase 4 — UX Flow

**Obiettivi**: progettare il viaggio completo, dall'arrivo alla conversione.
**Deliverable**: flow map; wireframe bassa fedeltà mobile e desktop; gerarchia delle
CTA; primo giro di copy (lo scrivi tu, io strutturo dove e quanto testo serve).
**Domande**: la conversione primaria è WhatsApp? Quanto conta il traffico da Instagram/ads
(cambia il punto d'ingresso)? Serve una versione "veloce" per chi vuole solo il numero?
**Decisioni**: architettura delle sezioni definitiva; comportamento su connessioni lente.
**Rischi**: l'esperienza cinematica ritarda la conversione — chi ha fretta deve poter
convertire in 5 secondi (CTA fissa sempre visibile, già prevista).
**Dipendenze**: Fase 3.

---

## Fase 5 — Architettura tecnica

**Obiettivi**: finalizzare `docs/ARCHITETTURA.md` alla luce di F1–F4.
**Deliverable**: architettura Next.js definitiva; budget di performance per asset
(kB per video, per font, per JS); matrice dei fallback (iOS, reduced-motion, low-end);
dove R3F crea valore reale e dove no.
**Decisioni**: hosting (Vercel?), analytics e banner cookie (GDPR), dominio.
**Rischi**: peso video su mobile — il budget si decide qui, non a sviluppo iniziato.
**Dipendenze**: Fase 4.

---

## Fase 6 — Raccolta asset

**Obiettivi**: tutto il materiale reale, pronto e verificato.
**Deliverable**: video Higgsfield generati secondo storyboard e verificati sui match cut;
foto portfolio ottimizzate; recensioni **reali** (mai inventate — placeholder sì,
recensioni finte mai: danno legale e reputazionale); dati aziendali (numero WhatsApp,
telefono, indirizzo, P.IVA).
**Domande**: chi genera le clip? (tu su Higgsfield con i miei prompt; posso anche
generarle io se mi dai accesso al flusso che preferisci).
**Rischi**: asset mancanti bloccano lo sviluppo → checklist con stato per ogni asset.
**Dipendenze**: Fase 3 (lo storyboard È la lista della spesa), Fase 5 (specifiche tecniche).

---

## Fase 7 — Design System

**Obiettivi**: congelare il linguaggio in componenti riusabili (anche per i clienti futuri).
**Deliverable**: tokens definitivi (colore, tipo, spazio, motion); libreria componenti;
pagina di stile vivente nel progetto (`/styleguide` in dev).
**Decisioni**: Figma intermedio sì/no — per un team di due consiglio di progettare
direttamente in codice con review su screenshot: più veloce e il risultato È il sito.
**Rischi**: over-engineering del sistema per un solo sito — si astrae solo ciò che si riusa.
**Dipendenze**: Fasi 2 e 4.

---

## Fase 8 — Sviluppo

**Obiettivi**: costruire il sito finale in Next.js (architettura Ibrida).
**Deliverable**: le fasi F0–F7 della roadmap tecnica in `ARCHITETTURA.md`, con
deploy continuo su Vercel: vedi ogni avanzamento su URL reale, non su screenshot.
**Decisioni**: ordine dei capitoli in produzione; cosa entra nella v1 e cosa dopo il lancio.
**Rischi**: scrubbing su iOS Safari — mitigato: prototipo già pronto con fallback
(all-keyframe + WebM; sequenza frame come piano C).
**Dipendenze**: Fasi 5, 6, 7. **Parte solo dopo il tuo "START".**

---

## Fase 9 — Polish & ottimizzazione

**Obiettivi**: il 10% finale che separa "bello" da "premium".
**Deliverable**: QA cross-device reale (iPhone, Android medio, desktop); Lighthouse
mobile ≥ 90 su tutte le metriche; pass accessibilità (contrasti, tastiera, reduced-motion);
SEO tecnica (metadata, OG, JSON-LD LocalBusiness Bologna, sitemap); rifinitura
micro-interazioni; go-live su dominio.
**Rischi**: "polish infinito" — timebox e lista chiusa di rifiniture.
**Dipendenze**: Fase 8.

---

*Ultimo aggiornamento: sessione di pre-produzione iniziale. Il documento si aggiorna a ogni gate.*
