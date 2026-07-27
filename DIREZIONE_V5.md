# MONDIAL SERVICE — DIREZIONE V5 (la casa è il sito)

I punti fondamentali, come dettati dal committente il 27/07/2026. Questa è la
specifica: se una scelta tecnica la contraddice, è la scelta tecnica a essere
sbagliata.

## I punti

- **Un unico piano sequenza ("One Shot")**: niente pagine scollegate. L'utente
  entra in un mondo e la telecamera non si interrompe mai.
- Si parte **dall'alto**, con un'inquadratura tipo drone del cantiere Mondial
  Service.
- Scendendo, la telecamera si avvicina alla casa **ancora in costruzione**.
- La casa **si costruisce progressivamente mentre l'utente scorre**: muri,
  strutture, serramenti, pavimenti, fino a diventare una casa completa.
- A un certo punto **la porta si apre automaticamente** e la camera entra senza
  stacchi.
- Da lì **ogni ambiente della stessa casa diventa una sezione del sito**:
  - soggiorno → presentazione
  - bagno → rivestimenti
  - cucina → materiali
  - altre stanze → servizi e portfolio
- L'utente **non perde mai l'orientamento**: ha sempre la sensazione di
  attraversare la stessa abitazione, non di cambiare pagina.

## Cosa c'è già e cosa manca

| punto | stato |
| --- | --- |
| piano sequenza unico | **parziale** — regge per il viaggio, si spezza alle sezioni |
| partenza dall'alto, drone sul cantiere | **manca** — oggi si parte a livello d'occhio su un terreno vuoto |
| discesa verso la casa in costruzione | **parziale** — la discesa c'è, ma arriva dopo la costruzione, non durante |
| la casa si costruisce scorrendo | **fatto** |
| la porta si apre, si entra senza stacchi | **fatto** (s06) |
| ogni ambiente è una sezione | **manca** — le sezioni sono sei blocchi piatti dopo il viaggio |
| cucina | **manca** — non esiste nel modello 3D |
| mai perdere l'orientamento | **rotto** dal salto tra viaggio e sezioni |

## I tre lavori che mancano

### 1. L'apertura dall'alto

Oggi `s01` è un terreno vuoto ripreso a livello d'occhio, con una lenta spinta
in avanti. La specifica dice **drone sul cantiere**, dall'alto, in discesa.
Cambia la prima inquadratura del sito — quella che decide se l'utente resta.

### 2. Gli ambienti come sezioni

Oggi dopo il viaggio il mondo si dissolve e scorrono sei sezioni piatte:
`metodo`, `opere`, `ambienti`, `materiali`, `servizi`, `garanzie`. È il punto
in cui l'utente capisce di essere tornato su un sito, ed è esattamente quello
che la specifica vieta.

Vanno diventate ambienti attraversati dalla stessa camera:

| sezione | ambiente |
| --- | --- |
| presentazione | soggiorno |
| rivestimenti | bagno |
| materiali | cucina |
| servizi | altre stanze |
| portfolio | altre stanze |

### 3. La cucina non esiste

Il modello ha soggiorno e bagno. La cucina — che nella specifica porta i
materiali — non c'è, e nel repo esiste solo come fotografia
(`public/assets/foto/cucina.jpg`). Va modellata, perché senza il volume 3D non
si possono ricavare i fotogrammi di confine né la traiettoria di camera.

Lo stesso vale per le "altre stanze" di servizi e portfolio: oggi la casa ha
due ambienti, la specifica ne chiede almeno quattro.

## Il punto aperto

La specifica porta l'utente **dentro** la casa e ce lo tiene, stanza dopo
stanza, fino alla fine. L'uscita dalla finestra del bagno — rimessa oggi
perché il committente la ricordava — nella V5 non compare.

Le due cose non sono per forza in conflitto: l'uscita può restare come chiusura
**dopo** tutti gli ambienti, non come passaggio verso le sezioni, dato che le
sezioni ora stanno dentro. Ma va deciso, non dedotto.

## Cosa questo comporta sul girato

Il viaggio non è più di dodici ciak: gli ambienti-sezione ne aggiungono. E
l'ordine cambia — il bagno non è più una tappa di passaggio verso l'uscita, è
la sezione "rivestimenti" e deve durare quanto serve a leggerla.

Prima di generare altro va rifatta la tabella delle scene, perché oggi
`lib/scenes.ts` descrive un viaggio che finisce e poi lascia il posto a un sito.
Nella V5 non finisce: diventa il sito.
