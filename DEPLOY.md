# Messa online del sito

Il sito è un **export statico** (Next.js `output: 'export'`): la build produce
una cartella `out/` autonoma, deployabile ovunque. Nessun server necessario.

## Build locale

```bash
npm ci
npm run build   # genera la cartella out/
```

`out/` contiene tutto: HTML, JS, CSS (con il font embeddato), foto, video e
il file `CNAME` con il dominio del brand.

## Opzione A — GitHub Pages (automatica, consigliata)

È già configurata la pipeline `.github/workflows/deploy.yml`.

1. Su GitHub: **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.
2. Ogni push sul branch ricostruisce e pubblica il sito da solo (oppure
   **Actions → Deploy sito → Run workflow** a mano).
3. **Dominio**: il file `public/CNAME` punta a `www.mondialservicesrl.it`.
   Nel DNS del dominio crea un record **CNAME** `www` →
   `<utente>.github.io`. Il sito viene servito alla radice del dominio, così
   tutti i percorsi `/assets/...` funzionano senza modifiche.
   - Se il dominio non è ancora pronto, elimina `public/CNAME` per pubblicare
     temporaneamente sul sottodominio `github.io`.

## Opzione B — qualsiasi host statico (Vercel, Netlify, un CDN, hosting proprio)

Carica il contenuto della cartella `out/` nella root del sito. Su Vercel/Netlify
basta collegare il repo GitHub: rilevano Next.js e il dominio si aggiunge dal
loro pannello, senza toccare il codice.

## Note

- Il font (Hanken Grotesk) è embeddato nel CSS: zero richieste esterne.
- I video di transizione hanno doppio formato `.webm` (Chrome/Firefox) e
  `.mp4` (Safari): non rimuoverne nessuno.
- Con `prefers-reduced-motion` il viaggio 3D si ritira e resta il documento
  testuale completo: il sito resta accessibile.

## Il portfolio (`/portfolio/`)

Dentro `public/portfolio/` c'è una pagina a sé: il **portfolio istantaneo** da
mandare come link in un DM. È HTML puro (CSS e JS inline) e sta in `public/`,
quindi l'export la copia senza toccarla: dopo un push su `main` è online a

    https://laicosweb0-afk.github.io/3d/portfolio/

Non è un'altra build e non entra nel sito di Mondial Service: è solo una
cartella statica che viaggia insieme. Come si aggiorna: `PORTFOLIO.md`.

### Rigenerare le anteprime dei due siti

Le schede 04 e 05 mostrano lo scroll dei due siti immersivi. I due video si
riprendono dal sito vero, non si montano a mano:

```bash
npm run build                       # genera out/
node tools/static-server.mjs out 4173 &

# Quelli della Bufala: ripresa in tempo reale, la pagina è leggera
node tools/capture-scroll.mjs http://localhost:4173/bufala/ \
  public/portfolio/assets/05.mp4 --mode live --seconds 13

# Mondial Service: un fotogramma alla volta. Senza scheda grafica il 3D gira
# a 2 fotogrammi al secondo e in tempo reale uscirebbe una diapositiva; il
# viaggio però è funzione pura dello scroll, quindi si può renderizzare con
# calma e rimontare a 24 fps.
node tools/capture-scroll.mjs "http://localhost:4173/?still=1" \
  public/portfolio/assets/04.mp4 --mode frames --seconds 13 --fps 24 --share 0.78
```

Poi si riestrae il poster (primo fotogramma utile) di ciascuno:

```bash
node_modules/ffmpeg-static/ffmpeg -ss 3.4 -i public/portfolio/assets/05.mp4 \
  -frames:v 1 -q:v 4 -y public/portfolio/assets/05.jpg
```
