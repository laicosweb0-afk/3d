# Bazar Marrakech — Il tuo stile

La pagina della card NFC dello showroom. Messa online, percorso e decisioni
aperte: `../BAZAR.md`.

```bash
npm install
npm run dev        # sviluppo, con accesso dalla rete locale
npm run build      # build di produzione in dist/
```

Tutto quello che si cambia sta in `src/config/gioco.ts`:

| Cosa | Dove |
|---|---|
| Gli stili della domanda | `STILI` |
| I tre pezzi per stile | `PEZZI` — da confermare con il negozio |
| Gli spicchi della ruota (e quindi le probabilità) | `SPICCHI` |
| Spesa minima e validità del credito | `SPESA_MINIMA`, `VALIDITA_GIORNI` |
| Indirizzo, telefono, mappa | `NEGOZIO` |
| WhatsApp del negozio | `WHATSAPP_NEGOZIO` (vuoto = nessun bottone) |
| Email o telefono, o tutti e due | `CONTATTO_RICHIESTO` |

I contatti partono davvero solo con `VITE_LEAD_WEBHOOK_URL` in `.env.local`;
senza, l'invio è simulato e scrive in console.

Il marchio è tipografico (`src/components/BazarLogo.tsx`): quando arriva il
file vero del logo si sostituisce quel componente. I font sono in
`public/fonts/` (Bodoni Moda con licenza OFL accanto, e Inter).
