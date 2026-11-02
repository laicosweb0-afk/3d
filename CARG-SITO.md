# Car.G Multiservice — il sito

Il sito vetrina dell'officina, accanto alla card NFC (`carg/`).

Online, dopo il merge su `main`: **https://laicosweb0-afk.github.io/3d/carg-sito/**

È una pagina sola in `public/carg-sito/index.html`, HTML/CSS/JS inline, senza
build: l'export di Next la copia così com'è. Logo, favicon e font (Inter) sono
nella stessa cartella, quindi la pagina **non chiama nessun dominio esterno**
finché il visitatore non tocca «Mostra la mappa».

## Sezioni

1. **Hero** — titolo, stato «aperto ora / chiuso» calcolato sull'ora di Roma.
2. **Servizi** — gli otto lavori di `carg/src/config/gioco.ts` (`SERVIZI`), con
   le stesse parole e gli stessi disegni della card.
3. **Soccorso** — officina mobile notturna, testi della locandina (`SOCCORSO`).
4. **Perché Car.G** — solo cose già dichiarate dall'officina.
5. **Come funziona** — tre passi.
6. **Card NFC** — rimanda a `../carg/` per il credito.
7. **Prenota** — il modulo prepara un SMS al 379 380 9830 che il cliente invia
   dal suo telefono: nessun server, nessun dato salvato.
8. **Dove siamo** — indirizzo, orari con il giorno di oggi evidenziato, mappa
   Google caricata solo su richiesta (GDPR), link alle indicazioni.

Su telefono compare in basso la barra «Chiama / Prenota».

## Se cambia qualcosa

I testi dei servizi sono copiati da `gioco.ts`: se cambiano lì, vanno
aggiornati anche qui. Telefono, indirizzo e orari compaiono nel JSON-LD in
testa, nel corpo e nello script (`ORARI`, `TEL`).

## Cosa manca prima di andare sul dominio vero

- **P.IVA e ragione sociale** nel piè di pagina (obbligatorie per legge).
- **Privacy e cookie policy.**
- **Foto vere** dei lavori e dell'officina (vedi `carg/public/servizi/LEGGIMI.md`).
- **Prezzi**: non ce li hanno dati, quindi non ci sono.
- **WhatsApp**: se il numero è confermato, il modulo può aprire WhatsApp
  invece dell'SMS.
- Togliere il `noindex` e mettere `og:image` con l'URL assoluto.
