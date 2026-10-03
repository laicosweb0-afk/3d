/**
 * CAR.G MULTISERVICE — la card NFC
 * Via Bastia 169, Lavezzola (RA)
 *
 * Tutta la configurazione sta qui: i testi, i servizi, i premi, i recapiti.
 * Per cambiare l’offerta non serve aprire nessun altro file.
 *
 * Le regole dell’impianto, le stesse di Woman, e per gli stessi motivi:
 *
 *   1. UNA SOLA DOMANDA. Ogni domanda in più abbassa i completamenti.
 *   2. NESSUN SECONDO TENTATIVO. Non c’è niente da ritentare: qui non esiste
 *      una risposta giusta, esistono quattro situazioni diverse.
 *   3. IL PREMIO NON DIPENDE MAI DALLA RISPOSTA. Chi ha il tagliando in pari
 *      e chi non lo fa da tre anni ricevono lo stesso credito. Legare il
 *      premio alla risposta cambierebbe categoria di manifestazione a premio,
 *      e soprattutto insegnerebbe a mentire al modulo.
 *   4. NESSUNO ESCE RIMPROVERATO. È la regola che qui conta più che altrove:
 *      chi arriva da questa card ha già il sospetto di essere in ritardo con
 *      la manutenzione. Se la pagina glielo conferma con tono severo, chiude.
 *      Ogni esito dice una cosa utile e nessuno dice «hai sbagliato».
 *   5. LA CARD NON DIAGNOSTICA. Dice cosa si guarda di solito a quel
 *      chilometraggio e invita a portare l’auto. Non dice mai che cosa ha
 *      l’auto di chi legge: non l’ha vista nessuno, e su freni e gomme una
 *      rassicurazione sbagliata è un problema di sicurezza, non di copy.
 */

/* ------------------------------------------------------------------ */
/* L’officina                                                          */
/* ------------------------------------------------------------------ */

export const OFFICINA = {
  nome: 'Car.G Multiservice',
  insegna: 'Officina Meccanica · Multiservice',
  via: 'Via Bastia 169',
  citta: '48017 Lavezzola (RA)',
  /** Come si legge a schermo. */
  telefono: '379 380 9830',
  /** Come finisce dentro `tel:` — niente spazi, con il prefisso. */
  telefonoLink: '+393793809830',
  instagram: 'officinacar.g',
  orari: 'Lun-Ven 8:00-18:30 · Sab 8:00-12:00',
  /** La riga che vale più di tutte le altre, e che quasi nessuno in zona ha. */
  notturno: 'Officina mobile, anche di notte: veniamo noi.',
  /**
   * La ricerca su Google Maps. Si costruisce dall’indirizzo invece di
   * incollare un link lungo: funziona uguale e non scade.
   */
  get mappa() {
    return `https://www.google.com/maps/search/?api=1&query=${
      encodeURIComponent(`${this.nome} ${this.via} ${this.citta}`)}`;
  },
};

/**
 * Il numero WhatsApp, in formato internazionale senza segni.
 *
 * Resta **vuoto** di proposito: che il fisso dell’officina sia anche un
 * numero WhatsApp attivo non ce l’ha confermato nessuno, e un bottone che
 * apre una chat verso un numero che non risponde su WhatsApp è peggio che
 * non averlo. Appena è confermato si scrive qui `'393793809830'` e il
 * bottone compare da solo.
 */
export const WHATSAPP = '';

/* ------------------------------------------------------------------ */
/* L’apertura                                                          */
/* ------------------------------------------------------------------ */

/**
 * La frase che entra sopra il filmato del marchio, a 3,9 secondi.
 *
 * È l’unica cosa che si legge prima della prima schermata, quindi deve
 * stare su due righe corte e non deve far sentire nessuno in colpa: chi
 * avvicina il telefono al bancone non è lì per essere interrogato.
 * Il «\n» è una riga spezzata a mano, non un a capo automatico.
 */
export const APERTURA = {
  /** La prima riga, in chiaro. */
  riga1: 'Un minuto',
  /** La seconda, nel blu del marchio: è il colpo d'occhio. */
  riga2: 'per la tua auto.',
};

/* ------------------------------------------------------------------ */
/* L’unica domanda: da quanto non fa il tagliando                      */
/* ------------------------------------------------------------------ */

export type Fascia = {
  id: string;
  etichetta: string;
  /** La riga sotto l’etichetta: serve a far scegliere senza pensarci su. */
  nota: string;
};

export const FASCE: Fascia[] = [
  { id: 'recente', etichetta: 'Meno di 6 mesi', nota: 'fatto da poco' },
  { id: 'anno', etichetta: 'Circa un anno', nota: 'più o meno nei tempi' },
  { id: 'tanto', etichetta: 'Più di due anni', nota: 'o anche di più' },
  { id: 'boh', etichetta: 'Non me lo ricordo', nota: 'capita a tantissimi' },
];

export const DOMANDA = {
  kicker: 'Una domanda sola',
  titolo: "Quando l’hai fatto\nl’ultima volta?",
  sottotitolo: 'Vai a occhio, non serve la data esatta.',
};

/* ------------------------------------------------------------------ */
/* Cosa si legge dopo la risposta                                      */
/* ------------------------------------------------------------------ */

export type Esito = {
  /** Il titolo: due o tre parole, e mai un rimprovero. */
  titolo: string;
  /** La cosa utile. È il motivo per cui questa schermata esiste. */
  riga: string;
};

/**
 * Un esito per fascia. Nessuno è una bocciatura, e nessuno dice all’utente
 * che cos’ha la sua auto: dicono come funziona la manutenzione, che è una
 * cosa vera per tutti e che quasi nessuno sa.
 */
export const ESITI: Record<string, Esito> = {
  recente: {
    titolo: 'Sei in pari.',
    riga: 'Il tagliando però si misura anche in chilometri, non solo in mesi: '
      + "se ne hai macinati parecchi, l’olio è più vecchio di quanto dica il calendario.",
  },
  anno: {
    titolo: 'Sei nella\nfinestra giusta.',
    riga: 'Dodici mesi o quindicimila chilometri, vale quello che arriva prima. '
      + 'È il momento in cui conviene prenotare con calma, non quello in cui si corre.',
  },
  tanto: {
    titolo: 'Ci sta,\nsuccede.',
    riga: "L’olio invecchia anche da fermo: perde additivi con il tempo, non solo "
      + 'con i chilometri. Non è un dramma, è una cosa da rimettere in pari.',
  },
  boh: {
    titolo: 'Siamo in\ntantissimi.',
    riga: "Di solito è scritto sul libretto o sull’adesivo nel parabrezza. Se non "
      + 'c’è più, lo leggiamo noi dalla centralina in pochi minuti.',
  },
};

/**
 * Le percentuali di risposta, per una riga tipo «il 38% ha risposto come te».
 *
 * Resta `null` finché non c’è un conteggio vero. Scriverne uno inventato
 * sarebbe l’unica bugia di tutta l’esperienza, per giunta in bocca
 * all’officina e proprio nella schermata che deve dare fiducia.
 */
export const PERCENTUALI: Record<string, number> | null = null;

/* ------------------------------------------------------------------ */
/* I servizi                                                           */
/* ------------------------------------------------------------------ */

export type Servizio = {
  id: string;
  nome: string;
  riga: string;
};

/**
 * Il listino dei lavori, come ce li ha dettati l’officina. Nessun prezzo:
 * non ce li hanno dati, e inventarli sarebbe scrivere un preventivo a nome
 * loro. Quando arriva il listino si aggiunge un campo `prezzo` qui e la
 * schermata dei consigli lo mostra senza altre modifiche.
 */
export const SERVIZI: Servizio[] = [
  { id: 'tagliando', nome: 'Tagliando completo', riga: 'Olio, filtri e controlli. Su tutte le auto.' },
  { id: 'olio', nome: 'Cambio olio', riga: 'Anche cambio automatico. Il lavaggio è in omaggio.' },
  { id: 'gomme', nome: 'Gomme', riga: 'Riparazione e cambio, estive e invernali.' },
  { id: 'diagnosi', nome: 'Diagnosi completa', riga: 'Centralina letta su qualsiasi marca, spie comprese.' },
  { id: 'fap', nome: 'Pulizia FAP', riga: 'Si pulisce, senza sostituirlo.' },
  { id: 'fari', nome: 'Lucidatura fari', riga: 'Tornano trasparenti. Di notte si vede la differenza.' },
  { id: 'batteria', nome: 'Batterie', riga: 'Prova, ricarica e sostituzione.' },
  { id: 'mobile', nome: 'Officina mobile', riga: 'Veniamo noi, sul posto. Anche di notte.' },
];

/**
 * I tre lavori che proponiamo a chi ha risposto in un certo modo. Sono id di
 * `SERVIZI`: così il testo di un servizio si cambia in un posto solo.
 *
 * Il criterio non è commerciale, è di buon senso — ed è per questo che
 * funziona: a chi ha il tagliando fresco non si ripropone il tagliando, gli
 * si parla di quello che si consuma a chilometri.
 */
export const CONSIGLI: Record<string, string[]> = {
  recente: ['gomme', 'fari', 'diagnosi'],
  anno: ['tagliando', 'olio', 'gomme'],
  tanto: ['tagliando', 'diagnosi', 'fap'],
  boh: ['diagnosi', 'tagliando', 'olio'],
};

export const servizioDi = (id: string) => SERVIZI.find((s) => s.id === id) ?? null;
export const fasciaDi = (id: string | null) => FASCE.find((f) => f.id === id) ?? null;

/* ------------------------------------------------------------------ */
/* Il premio: la ruota                                                 */
/* ------------------------------------------------------------------ */

/**
 * Gli spicchi: **ogni importo compare una volta sola**, alternando quelli
 * bassi e quelli alti, come su una ruota da premi vera.
 *
 * Le cifre sono tarate sull’officina e non sul negozio: un tagliando sta fra
 * i 150 e i 250 €, quindi un credito da 10 € non si sentirebbe. Qui il
 * credito vale fra il 10 e il 25% del lavoro, che è uno sconto che si vede.
 */
export const SPICCHI: number[] = [20, 60, 30, 80, 40, 100, 50, 150];

/**
 * Quanto si vince davvero, e quanto spesso. Si vince sempre, e sempre uno
 * fra 20, 30 e 40 €. Gli altri spicchi restano a schermo ma non escono mai.
 *
 * ⚠️ **Da sapere, perché è stato detto e va lasciato scritto.** Mostrare
 * premi che nessuno può vincere è una pratica commerciale ingannevole ai
 * sensi degli artt. 20-23 del Codice del Consumo, e un premio estratto a
 * sorte di importo variabile è un concorso a premi (DPR 430/2001), con
 * regolamento, cauzione e comunicazione al Ministero. La versione senza
 * nessuno dei due problemi costa una riga: in `SPICCHI` si mettono solo
 * `[20, 30, 40]` ripetuti secondo queste stesse percentuali — sei 40, tre 30,
 * due 20 — e si toglie `PESI`, perché a quel punto le probabilità stanno
 * nella geometria e l’estrazione può essere davvero casuale.
 */
export const PESI: { valore: number; peso: number }[] = [
  { valore: 40, peso: 55 },
  { valore: 30, peso: 27 },
  { valore: 20, peso: 18 },
];

/** Il credito più alto fra quelli che si possono vincere davvero. */
export const PREMIO_MASSIMO = Math.max(...PESI.map((p) => p.valore));

/** Estrae il credito secondo i pesi. Restituisce il valore, non l’indice. */
export function estrai(): number {
  const totale = PESI.reduce((s, p) => s + p.peso, 0);
  let n = Math.random() * totale;
  for (const p of PESI) {
    n -= p.peso;
    if (n <= 0) return p.valore;
  }
  return PESI[PESI.length - 1].valore;
}

/** Il credito medio per cliente: serve a chi fa i conti, non all’app. */
export function creditoMedio(): number {
  const totale = PESI.reduce((s, p) => s + p.peso, 0);
  return PESI.reduce((s, p) => s + p.valore * p.peso, 0) / totale;
}

/** Durata della rotazione in millisecondi e giri completi prima di fermarsi. */
export const GIRO = { durata: 4800, giriMin: 5, giriMax: 7 };

/** Giorni di validità del credito, contati dal giorno del ritiro. */
export const VALIDITA_GIORNI = 90;

/** Quanto deve valere il lavoro perché il credito si possa usare. */
export const SPESA_MINIMA = 0;

/* ------------------------------------------------------------------ */
/* Il modulo e il codice                                               */
/* ------------------------------------------------------------------ */

/**
 * `'uno'` accetta il modulo con l’email **oppure** il telefono, dicendolo a
 * schermo; `'entrambi'` li rende obbligatori tutti e due. Nome e cognome
 * sono sempre richiesti.
 */
export const CONTATTO_RICHIESTO: 'uno' | 'entrambi' = 'uno';

/**
 * Marca e modello dell’auto: facoltativo, e deve restare facoltativo.
 *
 * Per un’officina vale più dell’email — sapendo che auto è, al telefono
 * sanno già pezzi, tempi e prezzo — ma è anche il campo che fa abbandonare
 * se diventa un obbligo. Non chiediamo la targa: è un dato personale vero,
 * e per richiamare un cliente non serve.
 */
export const CHIEDI_AUTO = true;

/** Codice del credito nel formato CARG-XXXX. */
export function generaCodice(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // via I, O, 0 e 1: si confondono
  let out = '';
  for (let i = 0; i < 4; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `CARG-${out}`;
}

export function scadenza(da = new Date()): Date {
  const d = new Date(da);
  d.setDate(d.getDate() + VALIDITA_GIORNI);
  return d;
}

/** Mese abbreviato: nella tessera la data deve stare su una riga sola. */
export function dataBreve(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '');
}

export function messaggioWhatsApp(l: {
  nome: string; credito: number; codice: string; auto: string;
}): string {
  return [
    `Ciao, sono ${l.nome}.`,
    `Ho il credito Car.G da ${l.credito}€, codice ${l.codice}.`,
    l.auto ? `La mia auto è una ${l.auto}.` : '',
    '',
    'Vorrei prenotare.',
  ].filter((r, i, a) => r !== '' || a[i - 1] !== '').join('\n');
}
