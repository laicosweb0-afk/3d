# Video IA — come si scrive bene un prompt

Guida operativa per generare immagini e video con l'IA (Higgsfield e i modelli che espone: Kling, Veo, Seedance, Soul, Nano Banana…), pensata per il nostro flusso: **personaggio → fermo immagine → animazione**.

> Il riferimento di partenza era un tool "character sheet" (j0edit-character-sheet). La pagina non era raggiungibile dall'ambiente di lavoro, quindi questa guida non ne riprende il contenuto: raccoglie le regole generali che valgono per tutti i generatori, e il character sheet è trattato al §2.

---

## 1. Il principio: non si fa un video con un prompt solo

Un buon video IA si costruisce a stadi, e ogni stadio blocca una decisione:

| Stadio | Cosa si decide | Costo |
|---|---|---|
| 1. **Character sheet** | Chi è il soggetto (volto, corpo, abiti, proporzioni) | Basso |
| 2. **Fermo immagine** (key frame) | Inquadratura, luce, ambiente, palette | Basso (prove a 1K) |
| 3. **Animazione** (image-to-video) | Solo il movimento | Alto |
| 4. Upscale / montaggio | Risoluzione, ritmo, suono | Medio |

Regola d'oro: **non si spende un credito video su una composizione non approvata da fermo** (vedi anche SCALETTA_BUFALA §7). Text-to-video "puro" serve per esplorare, non per produrre: il risultato cambia a ogni tentativo e il personaggio non resta lo stesso.

---

## 2. Il character sheet: la coerenza del personaggio

Il problema numero uno del video IA è che il personaggio cambia faccia da una clip all'altra. Il character sheet risolve: una tavola unica con il soggetto visto da più angoli, da usare come **immagine di riferimento** in tutte le generazioni successive.

### Template

```
Character reference sheet of [CHI: età, genere, corporatura, tratti distintivi],
[CAPELLI: colore, taglio], [ABITI: capo per capo, colori, materiali],
shown in a turnaround: front view, three-quarter view, side profile, back view,
plus a row of facial expressions: neutral, smiling, surprised, serious.
Full body, neutral standing pose, arms relaxed.
Plain light grey background, even soft studio lighting, no shadows on the background.
Consistent proportions and identical outfit in every view. Photorealistic.
```

### Regole

- **Descrivi tratti fissi e verificabili**, non impressioni: "cicatrice sopracciglio sinistro, orecchino d'oro solo a destra" vale più di "aspetto affascinante".
- **Sfondo neutro e luce piatta**: il character sheet serve a fissare il soggetto, non l'atmosfera. La luce si decide nel fermo immagine.
- **Un abito alla volta**: se il personaggio cambia vestito, si fa un secondo sheet.
- Una volta approvato, il sheet si carica come reference (o si crea il personaggio/Soul ID in Higgsfield) e **non si riscrive più il volto nel prompt**: si scrive solo "the same character" e ci si concentra su scena e azione.

---

## 3. Anatomia del prompt per il fermo immagine

L'ordine conta: i modelli pesano di più ciò che viene prima. Si scrive dal più importante al meno importante.

```
[SOGGETTO] + [AZIONE / POSA] + [AMBIENTE] + [INQUADRATURA E OTTICA] + [LUCE] + [MATERIA E DETTAGLIO] + [STILE / RESA]
```

| Blocco | Domanda | Esempio |
|---|---|---|
| Soggetto | Chi/cosa, esattamente? | a whole buffalo mozzarella, glossy, slightly irregular |
| Azione / posa | Cosa sta succedendo in questo istante? | resting on a dark walnut board, a drop of whey sliding down its side |
| Ambiente | Dove? Cosa c'è (poco) intorno? | dark green-black background, nothing else in frame |
| Inquadratura | Da dove guarda la camera? | extreme macro, low angle, 100mm macro lens, shallow depth of field |
| Luce | Da dove arriva, di che qualità, che temperatura? | single soft window light from the left, warm, deep shadows on the right |
| Materia | Che texture devono leggersi? | wet surface, fine milky sheen, visible fibres |
| Stile | Che tipo di immagine è? | editorial food photography, natural colours, subtle film grain |

### Cosa funziona

- **Linguaggio da set fotografico**, non da recensione: obiettivo (35mm, 85mm, macro), apertura ("shallow depth of field"), direzione della luce ("rim light", "backlit", "overhead softbox"), ora del giorno ("golden hour", "overcast noon").
- **Concreto e osservabile**: "goccia sul bordo" sì, "atmosfera magica" no.
- **Inglese**: quasi tutti i modelli rendono meglio con prompt in inglese. Si pensa in italiano, si scrive in inglese.
- **Lunghezza media**: 40–80 parole. Sotto, il modello inventa; sopra, ignora la coda.

### Cosa non funziona

- **Parole-riempitivo**: "masterpiece, 8k, ultra detailed, best quality, stunning". Non aggiungono nulla ai modelli recenti e spesso spingono verso l'estetica plasticosa da "immagine IA".
- **Contraddizioni**: "minimal" + lista di dieci oggetti; "luce calda" + "atmosfera fredda e clinica".
- **Negazioni nel prompt**: "no people" può *evocare* persone. Si descrive in positivo ("empty room") e, se il modello ha il campo, si usa il **negative prompt**.
- **Testo e loghi generati**: escono storpiati. Il logo reale si aggiunge in post (vedi S08 della scaletta Bufala).

---

## 4. Il prompt per il video (image-to-video)

Qui l'errore più comune è **ridescrivere l'immagine**. L'immagine di partenza c'è già: il prompt deve descrivere **solo ciò che si muove e come**.

```
[MOVIMENTO DEL SOGGETTO] + [MOVIMENTO DI CAMERA] + [VELOCITÀ / RITMO] + [COSA RESTA FERMO]
```

### Regole

1. **Un'azione per clip.** 5 secondi = un gesto. "Lei si gira, sorride, prende la tazza ed esce" diventa quattro clip.
2. **Un solo movimento di camera**, nominato con precisione (tabella sotto). Due movimenti insieme = camera ubriaca.
3. **Dichiara la velocità**: "slow", "gradually", "in real time", "slow motion 120fps look". Senza indicazione il modello tende a movimenti nervosi.
4. **Dichiara cosa non si muove**: "the background stays still", "camera locked off". Riduce deformazioni e "respiro" dell'immagine.
5. **Fisica esplicita** quando conta: "the knife cuts through, the inside stretches in long milky strands, gravity pulls them down".
6. **Primo e ultimo frame** (dove il modello lo permette): si generano due fermi coerenti e si chiede al modello solo la transizione. È il modo più controllabile per i passaggi prima/dopo.

### Lessico di camera

| Termine | Cosa fa |
|---|---|
| static / locked-off shot | Camera ferma, si muove solo il soggetto |
| slow push-in / dolly in | Avvicinamento lento: tensione, rivelazione |
| pull-out / dolly out | Allontanamento: contesto, chiusura |
| pan left / right | Rotazione orizzontale sul posto |
| tilt up / down | Rotazione verticale sul posto |
| tracking shot / follow | La camera segue il soggetto in movimento |
| orbit / arc around | Giro attorno al soggetto |
| crane up / down | Salita o discesa verticale |
| handheld, subtle shake | Camera a mano: realismo, documentario |
| rack focus | Il fuoco passa da un piano all'altro |
| FPV drone | Volo fluido e veloce (con parsimonia) |

---

## 5. Esempi applicati (scaletta Bufala)

### S01 — Macro superficie + goccia (fermo)

```
Extreme macro of the wet surface of a buffalo mozzarella, filling the whole frame,
a single drop of whey forming on the edge. 100mm macro lens, very shallow depth of field.
Soft window light from the upper left, warm, the rest falls into deep shadow.
Glossy milky sheen, fine fibrous texture. Editorial food photography, natural colours, subtle film grain.
```

### S01 — stesso fermo, animato

```
The drop of whey slowly swells and slides down the curved surface, then falls out of frame.
Static camera, locked off. Slow, real-time movement. The surface and the light stay still.
```

### S05 — Il taglio (video, il movimento è il contenuto)

Fermo di partenza: mozzarella intera sul tagliere, coltello appoggiato sopra. Prompt video:

```
A knife slowly cuts the mozzarella in half; as the two halves part, the soft inside stretches
in long milky strands that sag under their own weight and a little whey runs onto the board.
Slow push-in towards the cut. Slow motion. The background stays still and dark.
```

Nota: niente da ridescrivere su luce, tagliere, fondo — sono già nell'immagine.

---

## 6. Metodo di iterazione

- **Cambia una variabile per volta.** Se cambi luce e inquadratura insieme non sai cosa ha funzionato.
- **Fissa il seed** quando hai una base buona: le varianti restano confrontabili.
- **Genera in batch piccoli (2–4)** e scegli, invece di correggere all'infinito un singolo risultato.
- **Tieni un registro**: prompt, modello, seed, risultato (ok/no e perché). Il prompt che ha funzionato diventa template.
- **Se dopo 3 tentativi non ci arriva**, il problema non è la parola: o il modello non è adatto (cambialo), o la richiesta è troppa per una clip (spezzala).
- **Scegli il modello per il compito**: alcuni sono più forti sui volti e la coerenza del personaggio, altri sulla fisica e sui movimenti di camera, altri sul testo nell'immagine. In Higgsfield conviene chiedere un confronto prima di generare in quantità.

---

## 7. Checklist prima di premere "genera"

- [ ] Il soggetto è fissato (character sheet / reference caricata)?
- [ ] Il fermo immagine è approvato prima di animarlo?
- [ ] Il prompt è in inglese, concreto, 40–80 parole, dal più importante al meno importante?
- [ ] Niente riempitivi ("8k, masterpiece"), niente contraddizioni, niente testo/logo da generare?
- [ ] Nel prompt video: una sola azione, un solo movimento di camera, velocità dichiarata, cosa resta fermo?
- [ ] Prova a bassa risoluzione prima dell'alta?
- [ ] Il reale c'è? Se il cliente ha la foto vera, la foto vera vince.
