# Car.G Multiservice — il sito

Il sito vetrina dell'officina, accanto alla card NFC (`carg/`).

Online, dopo il merge su `main`: **https://laicosweb0-afk.github.io/3d/carg-sito/**

È una pagina sola in `public/carg-sito/index.html`, HTML/CSS/JS inline, senza
build: l'export di Next la copia così com'è. Logo, favicon e font (Inter) sono
nella stessa cartella, quindi la pagina **non chiama nessun dominio esterno**
finché il visitatore non tocca «Mostra la mappa».

## Impianto

Stile Apple: hero nera spaziosa, titoli grandi centrati, schede bianche su
grigio chiaro, una barra che compare in alto dopo l'hero
(«Officina mobile · Scrivici · Chiama»). Il sito è centrato sull'**officina
mobile**; l'officina vera e propria viene dopo, come «E tutto il resto».

## Sezioni

1. **Hero** — video in loop a tutto schermo, muto, come su apple.com
   (`hero.webm` 390 KB per Chrome/Firefox, `hero.mp4` 680 KB per Safari,
   `hero.jpg` come poster). Sopra: «Officina mobile / Veniamo da te.», Chiama
   e WhatsApp, «A casa tua · In strada · Ovunque tu sia». Tasto pausa in
   basso a destra (in alto sul telefono); il video si ferma quando esce dallo
   schermo e non parte con «riduci movimento». Il sorgente è 854×480: con una
   versione 1080p si rigenerano i tre file con gli stessi comandi ffmpeg
   (`-an`, crf 25 per l'mp4 con `+faststart`, vp9 crf 36 per il webm).
2. **Galleria** a scorrimento con pausa: batteria, gomme, fari, piccole
   riparazioni, tagliando a domicilio, lucidatura fari (prima/dopo,
   `fari-prima-dopo.webp`, dal volantino). Testi del volantino «Officina mobile».
3. **Tu resti lì, ci muoviamo noi** — casa, strada, notte; auto, furgoni,
   veicoli commerciali.
4. **Lucidatura fari** — il prima/dopo in grande.
5. **E tutto il resto** — i 12 servizi, con «Anche a domicilio» dove il
   volantino lo dice.
6. **Coupon nuovo cliente** — controllo auto gratuito (freni, pneumatici e
   pressione, batteria, diagnosi, climatizzatore, livelli) e 10% sulla
   manodopera del primo intervento in officina, con la nota del coupon.
7. **Prenota** — casa / strada / officina, il modulo apre WhatsApp con il
   messaggio già scritto. Nessun server, nessun dato salvato.
8. **Dove siamo** — orari con «aperto ora», mappa Google solo su richiesta.

Le fonti dei testi: `carg/src/config/gioco.ts` e i due volantini (coupon nuovo
cliente, officina mobile). Il WhatsApp sul 379 380 9830 è sul furgone e sul
coupon, quindi è considerato confermato.

## Se cambia qualcosa

I testi dei servizi sono copiati da `gioco.ts`: se cambiano lì, vanno
aggiornati anche qui. Telefono, indirizzo e orari compaiono nel JSON-LD in
testa, nel corpo e nello script (`ORARI`, `TEL`).

## Cosa manca prima di andare sul dominio vero

- **P.IVA e ragione sociale** nel piè di pagina (obbligatorie per legge).
- **Privacy e cookie policy.**
- **Foto vere** dei lavori e dell'officina (vedi `carg/public/servizi/LEGGIMI.md`).
- **Prezzi**: non ce li hanno dati, quindi non ci sono.
- **Facebook**: il volantino lo cita, ma manca l'indirizzo della pagina.
- **Foto più grandi**: furgone e fari sono ritagli dei volantini; con le
  foto originali la hero diventa più nitida.
- Togliere il `noindex` e mettere `og:image` con l'URL assoluto.
