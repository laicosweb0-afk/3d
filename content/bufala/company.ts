// Dati aziendali REALI di Quelli della bufala, dal biglietto da visita
// fornito dal cliente (DIRECTION_BUFALA.md §7). Regola non negoziabile del
// progetto: qui non entra nulla di inventato. Ciò che manca resta assente.

export const company = {
  /** Marchio commerciale — è questo che il visitatore conosce. */
  brand: 'Quelli della bufala',
  /** Ragione sociale, per footer e dati strutturati. */
  ragioneSociale: 'FOOD SERVICE S.A.S. di Marra Salvatore & C.',

  telefono: '+39 392 0220924',
  telefonoHref: 'tel:+393920220924',
  /** Il numero che riceve gli ordini su WhatsApp, in cifre nude per il
   *  collegamento wa.me. Confermato dall'utente (04/08): è lo stesso del
   *  telefono — se un giorno il banco usasse un numero WhatsApp dedicato,
   *  cambia SOLO qui. */
  whatsapp: '393920220924',
  // ⚠️ Indirizzo e sito del vecchio biglietto da visita: il cliente li ha
  // sostituiti e non vanno più mostrati da nessuna parte. Restano qui solo
  // per non farli riapparire per distrazione — se servisse un recapito
  // scritto, va chiesto quello nuovo, non ripreso questo.
  emailObsoleta: 'info@quellidellabufala.it',
  sitoObsoleto: 'www.quellidellabufala.it',

  /** Sede legale e amministrativa — non è il punto vendita. */
  sedeLegale: {
    via: 'Via Fondovalle Rubicone, 11',
    cap: '47030',
    comune: 'Borghi',
    provincia: 'FC',
  },

  /** Sede operativa: vendita ingrosso e dettaglio. È il posto che il
   *  visitatore deve trovare — confermato dal cliente come unico indirizzo
   *  da mostrare nei contatti. */
  /* L'indirizzo è nella forma della scheda Google del cliente, non del
     biglietto da visita. Il biglietto diceva «Via Emilia Vecchia 75, 47923
     Rimini»; Google dice «Via Vecchia Emilia 75, 47922 Santa Giustina».
     Parole invertite, CAP diverso, località diversa — Santa Giustina è una
     frazione di Rimini. Vince Google perché la query della mappa la risolve
     Google: con le sue stringhe il segnaposto cade dove deve, con le nostre
     poteva cadere altrove. Decisione del cliente, 04/08. */
  puntoVendita: {
    presso: 'C.A.R.R. di Rimini — Centro Agro Alimentare Riminese SpA',
    via: 'Via Vecchia Emilia, 75',
    cap: '47922',
    comune: 'Santa Giustina',
    provincia: 'RN',
    dettaglio: 'Padiglione centrale · Mercato ortofrutticolo · Area Servizi',
    uscita: 'Uscita autostrada Rimini Nord',
    accesso: 'Ingresso libero e gratuito per grossisti e privati',
  },

  /** Gli orari, dalla scheda Google del cliente (04/08/2026).
   *
   *  Non sono un dato di servizio da mettere in fondo. Un banco che apre
   *  alle quattro e mezza e chiude alle nove, chiuso nel fine settimana,
   *  dice due cose insieme: a chi si rivolge — chi compra per lavoro, non
   *  chi fa la spesa il sabato — e che la merce arriva di notte. È il fatto
   *  più raro che questa azienda possiede, e va detto presto e forte.
   *
   *  ⚠️ Da riconfermare col cliente: la scheda Google mostra «Suggerisci
   *  nuovi orari», quindi nemmeno Google li dà per certi, e il giovedì
   *  chiuso è insolito abbastanza da meritare una domanda. Google tronca
   *  la visualizzazione a «04:30−09»: la chiusura alle 09:00 è la lettura
   *  naturale, non un dato letto per esteso.
   *
   *  Dato grezzo, non ancora mostrato da nessuna parte: la sezione che lo
   *  espone nasce nella task dedicata, non qui. */
  /** «Oggi al banco» — la disponibilità della mozzarella, richiesta dal
   *  titolare (04/08). Il sito è statico: il dato vivo arriva da un foglio
   *  Google che il titolare aggiorna dal telefono, pubblicato come CSV.
   *
   *  COME SI CREA (una volta sola, dall'utente):
   *  1. Un foglio Google con QUATTRO colonne: data | stato | ora | nota
   *     · data  = 2026-08-04  (anno-mese-giorno)
   *     · stato = verde | giallo | rosso
   *     · ora   = 10:47  (facoltativa)
   *     · nota  = testo libero (facoltativa, sostituisce la frase standard)
   *     Ogni mattina il titolare AGGIUNGE UNA RIGA (o corregge l'ultima).
   *  2. File → Condividi → Pubblica sul web → foglio, formato CSV.
   *  3. L'indirizzo che ne esce va incollato qui sotto.
   *
   *  REGOLA D'ONESTÀ, non negoziabile: se l'indirizzo è vuoto, se la rete
   *  non risponde o se l'ultima riga NON è di oggi, il sito non mostra
   *  nessun semaforo — mostra l'invito a chiamare. Mai un «Disponibile»
   *  di ieri spacciato per fresco. */
  disponibilitaCsv: '',

  /** Lo stato mostrato FINCHÉ il foglio non è configurato (decisione
   *  dell'utente 04/08: la grafica del titolare va in campo subito, con le
   *  lucine). Appena `disponibilitaCsv` esiste, comanda il foglio e questo
   *  campo viene ignorato. Valori: 'verde' | 'giallo' | 'rosso'. */
  disponibilitaManuale: 'verde' as 'verde' | 'giallo' | 'rosso',

  orari: [
    { giorno: 'lunedì', apre: '04:30', chiude: '09:00' },
    { giorno: 'martedì', apre: '04:30', chiude: '09:00' },
    { giorno: 'mercoledì', apre: '05:00', chiude: '09:00' },
    { giorno: 'giovedì', chiuso: true },
    { giorno: 'venerdì', apre: '05:00', chiude: '09:00' },
    { giorno: 'sabato', chiuso: true },
    { giorno: 'domenica', chiuso: true },
  ],
} as const;

/** Indirizzo del punto vendita su una riga, per meta e microcopy. */
export const indirizzoPuntoVendita =
  `${company.puntoVendita.via}, ${company.puntoVendita.cap} ${company.puntoVendita.comune} (${company.puntoVendita.provincia})`;

/** La ricerca su Google Maps: l'indirizzo del punto vendita, non la sede
 *  legale. Sono due luoghi diversi e mandare qualcuno alla sede legale
 *  significa mandarlo dove non c'è nessun banco. */
export const mappaQuery = encodeURIComponent(
  `${company.puntoVendita.presso}, ${company.puntoVendita.via}, ${company.puntoVendita.cap} ${company.puntoVendita.comune} ${company.puntoVendita.provincia}`,
);

/** L'incorporazione della mappa. Non richiede chiave API. */
export const mappaEmbed = `https://www.google.com/maps?q=${mappaQuery}&output=embed`;

/** L'apertura nell'app: su telefono Google Maps si apre davvero, non nel
 *  browser, ed è quello che serve a chi sta guidando. */
export const mappaApri = `https://www.google.com/maps/search/?api=1&query=${mappaQuery}`;
