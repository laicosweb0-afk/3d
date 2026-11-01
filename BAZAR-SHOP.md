# Bazar Marrakech — il negozio online

Il sito e-commerce di **Bazar Marrakech**, in stile Apple: grandi titoli,
tanto spazio, riquadri prodotto a tutta larghezza, barra traslucida in alto,
pagine prodotto «Acquista …» con galleria e borsa. Marrakech mette la
tavolozza (nero, oro, crema) e le foto vere dei divani.

- **File**: `public/bazar-shop/index.html` (HTML + CSS + JS in un file solo),
  foto in `public/bazar-shop/img/`, Poppins in `public/bazar-shop/fonts/`.
  Nessuna build, nessuna libreria, nessuna chiamata esterna.
- **Online** dopo un push su `main`:

      https://laicosweb0-afk.github.io/3d/bazar-shop/

## Le pagine

| Indirizzo | Pagina |
|---|---|
| `#/` | Home: marchio, «Il tuo salotto ti aspetta.», la nuova collezione blu, i riquadri dei divani e delle poltrone, il dettaglio del velluto che si avvicina con lo scroll, i salotti, perché sceglierci, lo showroom |
| `#/negozio` · `#/negozio/set` · `/divani` · `/poltrone` · `/complementi` | Il negozio con i filtri |
| `#/p/<id>` | La pagina prodotto: galleria, finitura, «Nel salotto» per i set, quantità, preferiti, consegna, primo piano, «Completa il salotto» |
| `#/borsa` | La borsa e la richiesta d'ordine |
| `#/showroom` | Contatti e indirizzo |

## Il catalogo

L'array `PRODOTTI` in cima allo script. Tre salotti completi (Tortora, Blu
Notte, Beige), quattro divani, due poltrone, i tavolini nesting. Un set
elenca i pezzi in `nelSet`. Per aggiungere un articolo basta un elemento in
più con le sue foto in `img/`. I nomi sono descrittivi (gli stessi della
card NFC): vanno sostituiti con quelli dei modelli del negozio.

## Prima dei clienti veri

1. **I prezzi.** Sono tutti `prezzo: null` → «Prezzo su richiesta». Non sono
   stati inventati. Con un numero (euro, IVA inclusa) il prezzo compare
   ovunque e la borsa fa il totale.
2. **Il pagamento.** Oggi la borsa diventa una *richiesta d'ordine* con un
   codice `BM-XXXX`, che parte per email a bazarmarrakech.snc@hotmail.com (e
   su WhatsApp se `WHATSAPP` ha un numero); il negozio conferma prezzo,
   consegna e pagamento. Per incassare online si collega un checkout
   (Stripe Payment Links, Shopify, SumUp…) al posto di `inviaOrdine()`.
3. **Composizioni e misure**: non sono state fornite, quindi non ci sono.
   Se il negozio le dà, vanno nei `dettagli` o come opzioni.
4. **Privacy e condizioni di vendita**: per vendere online servono
   informativa privacy, condizioni di vendita e diritto di recesso.
5. **Il dominio**: il posto naturale è `bazar-marrakech.com` (o
   `shop.bazar-marrakech.com`), come per la card in `BAZAR.md`.
