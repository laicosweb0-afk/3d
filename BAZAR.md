# Bazar Marrakech — Il tuo stile

La card NFC dello showroom **Bazar Marrakech** — showroom arredamento,
Via Fratelli Zucchini 5, 48022 Lugo (RA). Si appoggia il telefono sulla card, si apre la pagina, e in
novanta secondi: una domanda sullo stile, la ruota che estrae il credito, tre
pezzi da venire a vedere, il modulo, la tessera da mostrare al banco.

È la stessa meccanica della card Woman (`WOMAN.md`), portata in uno showroom
di arredo. Le quattro regole — una domanda sola, nessun secondo tentativo, un
premio che non dipende dalla risposta, nessuna risposta sbagliata — sono
scritte in cima a `bazar/src/config/gioco.ts`.

- **Sorgente**: `bazar/` — progetto Vite a sé, con il suo `README.md`.
- **Build**: `npm run build` dentro `bazar/`, esce `dist/`.
- **Online per provarla**:

      https://laicosweb0-afk.github.io/3d/bazar/

  È la build committata in `public/bazar/`, servita da GitHub Pages a ogni
  push su `main`. Serve per provarla dal telefono e farla vedere, **non per
  le card**: è un indirizzo in prestito. Dopo ogni modifica in `bazar/`:
  `npm run build` e ricopiare `dist/` sopra `public/bazar/`.

## Il percorso

| | Schermata | Cosa succede |
|---|---|---|
| — | Apertura | il filo d'oro che si apre, «Marhaba.», poi il fronte del biglietto e «Benvenuto nel Bazar.» |
| 1 | Ingresso | «Che casa sei?» — una domanda, poi la ruota |
| 2 | La domanda | Curve morbide · Classico elegante · Scuro e deciso · Bazar e colore. Il tocco sceglie e avanza |
| 3 | Lo stile | Velluto & Oro · Classico Senza Tempo · Notte a Marrakech · Spirito del Bazar. **Senza credito** |
| 4 | La ruota | fondo scuro, «Ora vincilo» |
| 5 | Il credito | la cifra che sale, su una spesa minima |
| 6 | I pezzi | tre pezzi scelti sullo stile, da reparti diversi del negozio |
| 7 | I dati | nome e cognome, email **oppure** telefono, consenso |
| 8 | La tessera | credito, stile, codice `BAZAR-XXXX`, scadenza; sotto, i contatti del retro del biglietto |

## Da dove vengono i dati

**Tutto dal biglietto da visita del negozio**, e solo da lì:

- **Il marchio**: BAZAR in crema molto spaziato, il filo d'oro che sfuma ai
  capi, MARRAKECH in oro e, nell'apertura, SHOWROOM ARREDAMENTO · LUGO. È
  ricostruito in tipografia (`bazar/src/components/BazarLogo.tsx`) con le
  proporzioni del fronte: se arriva il file vettoriale, si cambia solo quello.
- **Il carattere**: Poppins, lo stesso del biglietto, in quattro pesi da
  circa 8 KB, servito da noi (licenza OFL accanto ai file). Nessuna chiamata
  esterna al caricamento.
- **I colori**, campionati dai pixel: nero `#16120F` che scende a
  `#0D0A08`, crema `#EDE7DD`, oro `#D8BC86`, grigi `#AAA59E` e `#98948D`.
  Come il biglietto, la card è tutta scura.
- **I reparti**: Salotti e poltrone · Tappeti · Lampadari · Profumi e
  casalinghi. I pezzi consigliati sono presi da qui, tre per stile da reparti
  diversi, ciascuno con il suo reparto scritto sopra.
- **I contatti**, sulla tessera finale: Fatima Zahra 328 785 3098, Salah
  389 012 7054 (si toccano e chiamano), Via Fratelli Zucchini 5, 48022 Lugo
  (RA) (apre la mappa), @bazar.marrakech9 (apre Instagram). L'email
  bazarmarrakech.snc@hotmail.com è in configurazione.

Tutto sta in `NEGOZIO` e `REPARTI` dentro `bazar/src/config/gioco.ts`.

## Prima dei clienti veri

1. **I pezzi consigliati** (`PEZZI` in `gioco.ts`): i salotti sono quelli
   già in catalogo (`PRODUCT_PHOTOGRAPHY_PREMIUM.md`); tappeti, lampadari e
   profumi sono descritti per genere. Vanno confermati con il negozio: un
   pezzo consigliato che in showroom non c'è è la delusione più facile da
   evitare.
2. **Gli importi della ruota** (`SPICCHI`): proposti 30/50/70 € — cinque
   spicchi da 30, tre da 50, due da 70, cioè 50% · 30% · 20%, credito medio
   44 € — su una spesa minima di 300 € (`SPESA_MINIMA`). Sono una proposta,
   da decidere con il negozio.
3. **La ruota è onesta**: le probabilità stanno nella geometria, l'estrazione
   sceglie uno spicchio a caso senza pesi, e nessuno spicchio mostra un premio
   che non può uscire. Ma un premio variabile estratto a sorte **è un concorso
   a premi** (DPR 430/2001): regolamento, cauzione, comunicazione al
   Ministero. Con lo stesso importo in tutti gli spicchi diventa una semplice
   operazione a sconto, e non c'è niente da dichiarare.
4. **La privacy**: il link nel modulo è un segnaposto. Va messo quello vero.
5. **I contatti**: senza `VITE_LEAD_WEBHOOK_URL` l'invio è simulato e non
   salva niente. Si collega come quelli di Club Rama.
6. **WhatsApp**: `WHATSAPP_NEGOZIO` è vuoto, quindi il bottone non compare.
   I due numeri sono cellulari ma il biglietto non dice che siano WhatsApp:
   se lo sono, si scrive per esempio `393890127054` (Salah).

## Il dominio

Sulle card va un indirizzo del negozio, mai quello di prova. Il biglietto
non riporta un sito: il dominio va deciso (o confermato) con loro. Su Vercel: **Add New →
Project**, Root Directory **`bazar`**, Framework **Vite**, Output **`dist`**;
poi in Domains il sottodominio e nel DNS **un solo CNAME** col valore che
mostra Vercel. Il sito principale non si tocca. Dettagli identici a
`WOMAN.md` §3.

Il QR, per la vetrina o per provarla senza card:

```bash
python3 tools/qr.py https://<dominio-della-card> bazar-qr --neutro
```

## Controllo su telefono

```bash
cd bazar && npm install && npm run build && cd ..
node tools/static-server.mjs bazar/dist 8935 &
node tools/bazar-qa.mjs <cartella-screenshot>
```

Fotografa ogni schermata su un viewport da iPhone e fallisce se le
percentuali della ruota non sono quelle attese, se compare uno spicchio non
previsto o un sorteggio pesato, se due spicchi uguali stanno vicini, se
l'apertura non mostra il fronte del biglietto, se gli stili non sono quattro, se il credito compare già nello stile, se c'è un modo
per rispondere di nuovo, se i pezzi non sono tre o vengono da un reparto
che non è sul biglietto, se sulla tessera manca un contatto del biglietto, se il modulo si invia
vuoto, se il codice è malformato o la tessera non torna con la ruota, se
Poppins non si carica, se c'è overflow orizzontale o se la pagina chiama un
indirizzo esterno.

Resta da fare un giro con la card vera, iPhone e Android: il tocco NFC e il
browser in-app non si simulano da qui.
