# The Fragrance Experience — prototipo quiz mobile

Prototipo cliccabile, mobile-first, della pagina raggiunta dal QR sul
coupon nei pacchi di WO•MAN Perfume Store. Percorso: landing con la
fialetta «?» → quiz di 4 domande (una alla volta, progress 01/04) →
risultato → credito €15 e 3 raccomandazioni → email → busta da
consegnare → chiusura. Nessun backend: tutto lo stato vive in memoria.
Direzione visiva: editoriale/luxury su fondo chiaro, Inter dominante,
serif solo come dettaglio (il «?», i nomi delle fragranze), rosa WO•MAN
usato come accento.

## Come avviare

```bash
npm install
npm run dev
```

Poi aprire uno dei due percorsi qui sotto. La route del prototipo è `/s`
(il resto del repository ospita altri progetti e non c'entra col quiz).

## I due percorsi (URL di esempio)

- **Dal coupon nel pacco:**
  `http://localhost:3000/s?c=WMN-001`
- **Dalla busta consegnata a mano:**
  `http://localhost:3000/s?c=WMN-002&from=busta&nome=Giulia`

Il codice `?c=` viene solo memorizzato nello stato e mostrato nel pannello
demo (pulsante discreto in basso a destra), insieme a: switch coupon/busta,
switch forza risposta esatta/errata, ricomincia, ed elenco degli eventi
tracciati (`scan_opened`, `quiz_answered`, `result_shown`,
`families_selected`, `email_saved`, `envelope_named`, `flow_completed`),
ognuno con timestamp e codice coupon. Nessun dato viene inviato altrove.

## Come cambiare fragranza, domande e raccomandazioni

Tutto in **`data/fragrances.ts`**: la fragranza misteriosa (`MYSTERY`),
le famiglie olfattive (`FAMILIES`), le quattro domande del quiz
(`QUESTIONS` — quella con `scoring: true` decide se la fragranza è stata
riconosciuta) e il catalogo (`CATALOG`) da cui vengono pescate le tre
raccomandazioni in base alle risposte.

## Testi e colori

- Tutte le stringhe: **`content/quiz/copy.ts`** (struttura pronta per
  aggiungere lingue: si aggiunge una chiave a `COPY` e si cambia `LANG`).
- Design tokens (colori, scala tipografica, spaziature, transizioni):
  **`app/s/colors.css`**.
- Stili delle schermate: `app/s/quiz.css`.
- Logo: `public/WOMAN-logo.png` (fondi chiari) e
  `public/WOMAN-logo-white.png` (fondi scuri), altezza fissa 22 px.

Nota tecnica: gli stili usano CSS custom properties scoped alla route `/s`
invece di Tailwind, per non introdurre una pipeline CSS globale in un
repository che ospita già altri siti; palette, tipografia e layout seguono
comunque il brief alla lettera.
