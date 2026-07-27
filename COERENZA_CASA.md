# LA CASA — regole di coerenza per la generazione

Dodici clip generate separatamente devono sembrare la stessa casa ripresa in un
solo piano sequenza. Non succede da solo: se ogni clip inventa i suoi dettagli,
il visitatore vede case diverse e l'illusione cade.

Questo documento è la verità sulla casa, ricavata dal modello 3D
(`components/canvas/scenes/Villa.tsx`), non dalla memoria. **Ogni prompt di
generazione deve rispettarlo.**

## L'edificio

Un solo piano. Impronta circa **10 × 8 metri**. Muri alti **3 m**. Copertura
**piana, scura, sottile**, a sbalzo su tutti i lati (~40 cm). Zoccolo di
fondazione in calcestruzzo a vista.

## Le quattro facciate

| lato | cosa c'è |
| --- | --- |
| **fronte** (ingresso) | metà sinistra in **pietra a spacco**, metà destra **intonacata**; porta in **rovere** al centro; una finestra a destra della porta |
| **fianco destro** | una **grande** finestra (2,7 × 1,85 m) |
| **fianco sinistro** | una **piccola** finestra alta (quella del bagno) |
| **retro** | **cieco**, intonacato, nessuna apertura |

La facciata divisa in due materiali è il tratto riconoscibile della casa: se in
una clip diventa tutta intonaco o tutta pietra, non è più la nostra.

Serramenti sempre in **alluminio scuro**, mai bianchi, mai in legno.

## Dentro

Pavimento in **rovere a doghe** in tutta la casa, tranne il bagno.

**Soggiorno** — la parte destra e centrale. Rovere a terra, pareti chiare a
intonaco, un piano in **calacatta** sul tavolino, divano chiaro, lampada da
terra, una pianta in vaso di terracotta.

**Bagno** — angolo **posteriore sinistro**. Pavimento in **marquina nero**,
parete di fondo in **calacatta bianco**, fasce di marquina sul lato, **vasca
bianca freestanding**, mobile in rovere con top in calacatta e lavabo tondo.

**Parete interna attrezzata** (la scena dello spaccato) — divide soggiorno e
bagno: intonaco sul lato soggiorno, **calacatta sul lato bagno**.

## Quale finestra guarda dentro cosa

Questa tabella è il motivo per cui esiste il documento.

| finestra | dà su |
| --- | --- |
| fronte, a destra della porta | **soggiorno** |
| fianco destro, grande | **soggiorno** |
| fianco sinistro, piccola | **bagno** |

## La regola che protegge tutto

Il rischio è che una clip d'esterno mostri, attraverso i vetri, un interno
inventato che poi contraddice le scene interne.

**Scene di cantiere (s01-s04):** le aperture devono leggersi come **vuoti scuri**,
senza interno visibile. È anche la verità del cantiere: a quello stadio dentro
non c'è ancora niente. Nei prompt: *"window openings read as dark empty voids,
no finished interior visible"*.

**Esterni a casa finita (s05, s06, s12):** i vetri devono leggersi come
**specchio scuro che riflette cielo e alberi**, interno non leggibile. È anche
la resa normale della fotografia d'architettura. Nei prompt: *"windows read as
dark reflective glass mirroring the sky, interior not legible through them"*.

**L'interno si rivela solo da s07 in poi**, dove lo controlliamo per intero.

Così l'incoerenza non viene evitata sperando che il modello indovini: viene
resa **impossibile**, perché non c'è nessun interno da sbagliare finché non ci
entriamo davvero.

## Il luogo

Campagna o periferia del **nord Italia**: terreno pianeggiante, pioppi e siepi
basse all'orizzonte, luce **coperta europea**, ombre morbide. Senza dirlo esce
un cantiere generico che un cliente italiano non riconosce come casa propria.

## Cosa non deve comparire mai

Persone. Testi, scritte, cartelli, loghi. Un secondo piano. Tetto a falde.
Serramenti bianchi. Balconi o ringhiere. Filtri, viraggi, resa "cinematografica"
spinta: la referenza è **fotografia documentaria d'architettura**, colore
naturale.
