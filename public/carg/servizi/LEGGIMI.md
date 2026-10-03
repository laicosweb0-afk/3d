# Le foto dei servizi

In questa cartella vanno le foto dei lavori: una per servizio. Finché una
foto manca, la card mostra il disegno di quel servizio — quindi si possono
aggiungere una alla volta, senza aspettare di averle tutte.

## Come si attaccano

Si mette il file qui dentro e si scrive il nome in `src/config/gioco.ts`,
nella riga di quel servizio:

```ts
{ id: 'gomme', nome: 'Gomme', claim: '…', quando: '…', foto: 'gomme.webp' },
```

Nient'altro. La card si accorge da sola che c'è la foto e smette di
disegnare l'icona.

## Che foto servono

| id | Servizio | Cosa fotografare |
|---|---|---|
| `tagliando` | Tagliando completo | Il filtro nuovo in mano, o l'olio che scende nel motore |
| `olio` | Cambio olio | L'auto appena lavata, o il tappo dell'olio aperto |
| `gomme` | Gomme | Una gomma sulla smontagomme, o il battistrada da vicino |
| `diagnosi` | Diagnosi completa | Lo strumento collegato alla presa sotto il volante |
| `fap` | Pulizia FAP | Il FAP smontato, o il confronto prima/dopo |
| `fari` | Lucidatura fari | **Il confronto fra il faro opaco e quello lucidato** |
| `batteria` | Batterie | Le pinze sulla batteria, o il tester acceso |
| `mobile` | Officina mobile | Il furgone aperto di sera, con la luce accesa |

## Come vanno scattate

Il ritaglio è **tondo**, quindi il soggetto va **al centro** e non attaccato
ai bordi: quello che sta negli angoli sparisce.

- **Quadrate**, almeno 600×600 px.
- Formato **`.webp`** (o `.jpg`). Sotto i **120 KB** l'una: sono otto, e la
  card deve aprirsi su una riga di rete sola in officina.
- **Da vicino.** Nel tondo da 60 px una foto d'ambiente non si legge: si
  vede il pezzo, la mano, l'attrezzo. Niente campi larghi.
- **Luce vera.** Il neon dell'officina va benissimo, il flash dritto no.
- **Foto vostre, non prese da internet.** Oltre al diritto d'autore, è
  esattamente quello che fa la differenza: il cliente riconosce il suo
  paese, e capisce che il lavoro lo fate davvero voi.

Una foto storta ma vera vale più di una da catalogo. Se una non viene bene,
si lascia il disegno: non stona, è fatto apposta per stare in fila con le
altre.
