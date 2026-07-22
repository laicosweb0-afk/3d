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
