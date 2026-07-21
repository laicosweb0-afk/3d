# Mondial Service — La casa che nasce

## Concept
Il sito è un'esperienza a capitoli, non una pagina: si entra nella casa e la si
guarda costruirsi. Lo scroll controlla il tempo dei video time-lapse generati
da foto reference reali (stanza in cantiere → stanza finita).

- **Spina narrativa**: "il cantiere che diventa casa" — ogni capitolo è una
  stanza che si completa davanti al visitatore.
- **Registro**: quiet luxury italiano, notturno caldo (i video sono girati al
  tramonto con luce dorata).

## Palette
- `#10151d` notte di cantiere (base scura)
- `#f2ede3` intonaco (testi, finale chiaro)
- `#7d8b6f` salvia (accento, meter di costruzione — richiama l'ulivo del soggiorno)

## Tipografia
- Fraunces (display serif, titoli) — carattere editoriale italiano
- Archivo (sans, testi e chrome)

## Capitoli
1. **La casa** — time-lapse esterno villa (impalcature → facciata finita)
2. **L'ingresso** — la porta blu si apre, la camera entra
3. **Il soggiorno** — morph reference: grezzo → arredato (Seedance 2.0, start frame generato dalla reference reale)
4. **Il bagno** — morph reference: tracce sull'intonaco → Marquina + Calacatta
5. **I materiali** — carrellata macro sulle finiture
6. **Mordano** — mappa OSM, brand Mondial Service, slot logo/contatti

## Meccanica
- Capitoli "scrub": wrapper alto N×viewport, scena sticky, scroll → `currentTime`.
- Video via Blob quando il CDN espone CORS, altrimenti src diretto (seek byte-range);
  fallback finale: riproduzione singola alla comparsa del capitolo.
- Priming iOS al primo tocco; `prefers-reduced-motion` = solo poster, niente fetch video.
- Meter "grezzo → finito" mostra l'avanzamento della costruzione.

## Vincoli di build (sessione)
La rete dell'ambiente di build blocca i download dai CDN, quindi i video non
sono ri-encodati localmente: il sito punta agli MP4 originali del CDN di
generazione. Ottimizzazione (GOP corto, encode mobile, poster estratti dai
frame reali) da fare appena possibile in un ambiente con rete aperta.

## TODO
- [ ] Logo Mondial Service reale (slot pronto nel finale, `site/index.html`)
- [ ] Contatti reali del cliente (telefono, indirizzo, email)
- [ ] Morph cucina e camera da letto dalle foto reference
- [ ] Re-encode video (desktop CRF20/GOP8, mobile 720p CRF23/GOP4) + poster esatti
- [ ] Eventuale dominio personalizzato
