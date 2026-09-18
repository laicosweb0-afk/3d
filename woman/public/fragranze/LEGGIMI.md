# Le foto dei flaconi

Qui dentro va lo scatto della **fragranza ospite** di questa edizione — la
fialetta senza nome che entra nei pacchi — e, volendo, quelli delle edizioni
passate. Un file per fragranza:

    ospite.png

Poi, in `src/config/gioco.ts`, una riga sola dentro `OSPITE`:

```ts
export const OSPITE: Fragranza = {
  nome: 'Nome vero',
  maison: 'Maison partner',
  immagine: 'fragranze/ospite.png',
  …
};
```

Da quel momento l'app mostra la foto al posto della boccetta disegnata. Se il
file manca o il nome non torna, non si rompe niente: torna il disegno.

Attenzione a **cosa si vede nella foto**: se l'etichetta porta il nome, quella
foto non va mostrata prima della risposta. L'app già se ne occupa — nella
schermata della domanda usa sempre il disegno — ma se un giorno qualcuno la
sposta, il nome sullo scaffale diventa la soluzione del quiz.

## Come devono essere

| | |
|---|---|
| **Formato** | PNG con **sfondo trasparente**, vetro già scontornato |
| **Larghezza** | 700–900px basta: a schermo il flacone sta in 170px, il doppio serve solo ai telefoni con lo schermo fitto |
| **Peso** | sotto i 250 KB l'uno. Sono i primi byte che il cliente scarica col telefono in mano, in negozio, spesso con una riga di rete soltanto |
| **Inquadratura** | il flacone dritto, centrato, un filo d'aria sopra e sotto |
| **Ombra** | meglio senza: la mette l'app, e due ombre sovrapposte si vedono |

Lo sfondo trasparente non è un capriccio: il fondo dell'app è crema, non
bianco. Un rettangolo bianco attorno al flacone si nota subito e rovina più di
quanto la foto aggiunga.

## Il modo più veloce di ottenerle

Il flacone su un foglio bianco opaco, luce da una finestra di lato (mai il
flash: sul vetro fa una stella), telefono in orizzontale a un metro, poi lo
scontorno automatico che ormai fanno sia iPhone (tieni premuto sul soggetto →
Copia) sia gli strumenti online. Dieci minuti per tutte e tre.

Se il fornitore della fragranza ha già le foto ufficiali su sfondo
trasparente, meglio ancora: sono fatte in studio e si vede.
