/**
 * Tutta la configurazione del gioco sta qui. Per cambiare la fragranza in
 * diffusione, le domande, i premi, l'esito o la validità non serve aprire
 * nessun altro file.
 */

export type Spicchio = {
  valore: number;
  /** Il premio grosso: si veste di rubino invece che d'oro. */
  speciale?: boolean;
};

/**
 * Gli spicchi, in senso orario a partire da quello sotto la lancetta.
 *
 * La ruota gira in avanti, quindi gli spicchi arrivano sotto la lancetta in
 * ordine DECRESCENTE di indice: prima del bersaglio passa sempre quello dopo
 * di lui nella lista. Il 100 sta all'indice 2 e il 15 all'indice 1: è così
 * che il 100 sfila sotto la lancetta un attimo prima di fermarsi sul 15.
 * Se sposti uno dei due, l'effetto sparisce.
 */
export const SPICCHI: Spicchio[] = [
  { valore: 10 },
  { valore: 15 },
  { valore: 100, speciale: true },
  { valore: 20 },
  { valore: 50 },
  { valore: 10 },
  { valore: 30 },
  { valore: 25 },
];

/**
 * Esito deciso in partenza. La ruota atterra su uno spicchio con questo
 * valore, in un punto leggermente casuale al suo interno perché non sembri
 * calcolato. Con `null` l'esito è davvero casuale.
 *
 * Il brief chiede 15 € a tutti: è questa riga a farlo. Leggi la nota nel
 * README prima di lasciarlo così davanti a clienti veri.
 */
export const ESITO: number | null = 15;

/**
 * Dove si posa la lancetta dentro lo spicchio vincente, misurato a partire
 * dal bordo che confina con lo spicchio precedente.
 *
 * Con valori bassi la ruota si ferma appena dentro, a un soffio dal premio
 * grosso appena sfilato: la tensione nasce da lì, dal punto d'arresto, non da
 * una pausa costruita. Una ruota vera non si ferma e riparte, e se lo fa si
 * vede subito che è finta.
 *
 * `null` posa la lancetta dove capita, come farebbe una ruota qualsiasi.
 */
export const ARRESTO: { da: number; a: number } | null = { da: 0.14, a: 0.26 };

/** Giorni di validità del credito, contati dal giorno del ritiro. */
export const VALIDITA_GIORNI = 90;

/** Durata della rotazione in millisecondi e giri completi prima di fermarsi. */
export const GIRO = {
  /** Durata dell'unica decelerazione, dal lancio all'arresto. */
  durata: 5400,
  giriMin: 6,
  giriMax: 8,
};

/* ------------------------------------------------------------------ */
/* Il quiz delle fragranze                                             */
/* ------------------------------------------------------------------ */

export type Opzione = {
  id: string;
  etichetta: string;
  /** Il paragone con una cosa di tutti i giorni. È questo a rendere
   *  rispondibile la domanda a chi non ha mai letto una piramide olfattiva. */
  nota?: string;
};

export type Domanda = {
  /** Il gradino della piramide olfattiva a cui si riferisce la domanda. */
  livello: 'Testa' | 'Cuore' | 'Fondo';
  titolo: string;
  sottotitolo: string;
  opzioni: Opzione[];
  /** L'id dell'opzione giusta. Deve esistere fra le opzioni qui sopra. */
  giusta: string;
  /**
   * Cosa diciamo a chi sceglie un'altra opzione. Una riga per ciascuna,
   * e nessuna di queste righe dice «sbagliato»: spiega perché quelle due
   * note si somigliano, il che è vero e toglie l'esame di mezzo.
   *
   * Una risposta senza riga qui cade su `CONSOLAZIONE` più sotto.
   */
  vicine?: Record<string, string>;
};

export type Fragranza = {
  id: string;
  nome: string;
  famiglia: string;
  /** Una riga sola: si legge dopo l'ultima risposta, quando si scopre. */
  ritratto: string;
  /**
   * La foto del flacone, se c'è: un file dentro `public/` (per esempio
   * `/fragranze/notte-aurea.png`), meglio se PNG con lo sfondo trasparente e
   * il vetro già scontornato. Quando manca, l'app disegna la sua boccetta e
   * non si rompe niente — è il motivo per cui questo campo è facoltativo.
   */
  immagine?: string;
  domande: Domanda[];
};

/**
 * Le fragranze della casa.
 *
 * Le domande non sono un test da nasi esperti: chi tocca la card ha il
 * profumo nell'aria e trenta secondi di pazienza. Per questo si sceglie fra
 * **famiglie**, non fra ingredienti — «agrumi» e non «bergamotto di
 * Calabria» — e ogni opzione porta con sé il paragone che la rende
 * riconoscibile a chiunque: la scorza d'arancia, il bucato steso, la
 * pasticceria.
 *
 * La regola per aggiungerne una: se l'opzione non si può spiegare con una
 * cosa che sta in una cucina o in un bagno, è troppo difficile per questa
 * card.
 */
export const FRAGRANZE: Fragranza[] = [
  {
    id: 'notte-aurea',
    nome: 'Notte Aurea',
    famiglia: 'Dolce e avvolgente',
    ritratto: 'Un fiore bianco che si scalda sulla pelle e non se ne va più.',
    domande: [
      {
        livello: 'Testa',
        titolo: 'Cosa senti appena lo annusi?',
        sottotitolo: 'La prima cosa che arriva, senza pensarci troppo.',
        opzioni: [
          { id: 'agrumi', etichetta: 'Agrumi', nota: 'come la scorza d’arancia' },
          { id: 'dolce', etichetta: 'Dolce', nota: 'zucchero, caramello' },
          { id: 'fresco', etichetta: 'Fresco', nota: 'menta, aria di mare' },
          { id: 'speziato', etichetta: 'Speziato', nota: 'pepe, cannella' },
        ],
        giusta: 'agrumi',
        vicine: {
          dolce: 'Ci sta: l’arancia all’inizio è talmente piena che sembra zucchero.',
          fresco: 'Ci sta: l’agrume pulisce l’aria, e la freschezza è la prima cosa che si sente.',
          speziato: 'Ci sta: sotto l’agrume c’è un pizzico di pepe che scalda.',
        },
      },
      {
        livello: 'Cuore',
        titolo: 'E dopo un minuto?',
        sottotitolo: 'Quando il primo slancio passa, esce il carattere.',
        opzioni: [
          { id: 'fiori-bianchi', etichetta: 'Fiori bianchi', nota: 'gelsomino, zagara' },
          { id: 'rosa', etichetta: 'Rosa', nota: 'il fiore classico' },
          { id: 'frutta', etichetta: 'Frutta', nota: 'pesca, mela' },
          { id: 'cipria', etichetta: 'Cipriato', nota: 'talco, borotalco' },
        ],
        giusta: 'fiori-bianchi',
        vicine: {
          rosa: 'Ci sta: rosa e gelsomino sono due fiori, e da vicino si confondono sempre.',
          frutta: 'Ci sta: i fiori bianchi hanno un lato dolce che sa di frutta matura.',
          cipria: 'Ci sta: i fiori bianchi, quando si posano, diventano morbidi come il talco.',
        },
      },
      {
        livello: 'Fondo',
        titolo: 'Cosa resta sulla pelle?',
        sottotitolo: 'Quello che senti stasera, sulla sciarpa.',
        opzioni: [
          { id: 'vaniglia', etichetta: 'Vaniglia', nota: 'caldo, da pasticceria' },
          { id: 'bucato', etichetta: 'Bucato pulito', nota: 'muschio bianco' },
          { id: 'legno', etichetta: 'Legno', nota: 'matita temperata' },
          { id: 'cocco', etichetta: 'Cocco', nota: 'crema solare' },
        ],
        giusta: 'vaniglia',
        vicine: {
          bucato: 'Ci sta: la vaniglia sul finire diventa morbida come il bucato.',
          legno: 'Ci sta: sotto la vaniglia c’è un legno che la tiene in piedi.',
          cocco: 'Ci sta: cocco e vaniglia sono due dolci, e si somigliano tantissimo.',
        },
      },
    ],
  },
  {
    id: 'rosa-nera',
    nome: 'Rosa Nera',
    famiglia: 'Floreale intenso',
    ritratto: 'Una rosa che ha passato la notte fuori e non chiede scusa.',
    domande: [
      {
        livello: 'Testa',
        titolo: 'Cosa senti appena lo annusi?',
        sottotitolo: 'La prima cosa che arriva, senza pensarci troppo.',
        opzioni: [
          { id: 'frutti-rossi', etichetta: 'Frutti rossi', nota: 'ribes, lampone' },
          { id: 'agrumi', etichetta: 'Agrumi', nota: 'come la scorza d’arancia' },
          { id: 'fresco', etichetta: 'Fresco', nota: 'menta, aria di mare' },
          { id: 'dolce', etichetta: 'Dolce', nota: 'zucchero, caramello' },
        ],
        giusta: 'frutti-rossi',
        vicine: {
          agrumi: 'Ci sta: i frutti rossi hanno la stessa punta acidula degli agrumi.',
          fresco: 'Ci sta: all’inizio è una frutta croccante, e sembra freschezza.',
          dolce: 'Ci sta: il lampone è dolce quanto lo zucchero, solo più acido.',
        },
      },
      {
        livello: 'Cuore',
        titolo: 'E dopo un minuto?',
        sottotitolo: 'Quando il primo slancio passa, esce il carattere.',
        opzioni: [
          { id: 'rosa', etichetta: 'Rosa', nota: 'il fiore classico' },
          { id: 'fiori-bianchi', etichetta: 'Fiori bianchi', nota: 'gelsomino, zagara' },
          { id: 'cipria', etichetta: 'Cipriato', nota: 'talco, borotalco' },
          { id: 'frutta', etichetta: 'Frutta', nota: 'pesca, mela' },
        ],
        giusta: 'rosa',
        vicine: {
          'fiori-bianchi': 'Ci sta: sono due fiori, e a naso nudo fanno lo stesso effetto.',
          cipria: 'Ci sta: la rosa, quando è densa, diventa cipriata come il talco.',
          frutta: 'Ci sta: questa rosa è così piena che sa di frutta.',
        },
      },
      {
        livello: 'Fondo',
        titolo: 'Cosa resta sulla pelle?',
        sottotitolo: 'Quello che senti stasera, sulla sciarpa.',
        opzioni: [
          { id: 'legno', etichetta: 'Legno', nota: 'matita temperata' },
          { id: 'vaniglia', etichetta: 'Vaniglia', nota: 'caldo, da pasticceria' },
          { id: 'bucato', etichetta: 'Bucato pulito', nota: 'muschio bianco' },
          { id: 'cioccolato', etichetta: 'Cioccolato', nota: 'cacao amaro' },
        ],
        giusta: 'legno',
        vicine: {
          vaniglia: 'Ci sta: il legno scuro ha un fondo dolce che sembra vaniglia.',
          bucato: 'Ci sta: sul finire ogni profumo diventa un po’ più pulito.',
          cioccolato: 'Ci sta: legno e cacao sono due amari, e si somigliano parecchio.',
        },
      },
    ],
  },
  {
    id: 'sale-di-cedro',
    nome: 'Sale di Cedro',
    famiglia: 'Fresca e pulita',
    ritratto: 'Il primo sole di maggio su una barca ferma.',
    domande: [
      {
        livello: 'Testa',
        titolo: 'Cosa senti appena lo annusi?',
        sottotitolo: 'La prima cosa che arriva, senza pensarci troppo.',
        opzioni: [
          { id: 'agrumi', etichetta: 'Agrumi', nota: 'limone, mandarino' },
          { id: 'fresco', etichetta: 'Fresco', nota: 'menta, aria di mare' },
          { id: 'dolce', etichetta: 'Dolce', nota: 'zucchero, caramello' },
          { id: 'speziato', etichetta: 'Speziato', nota: 'pepe, cannella' },
        ],
        giusta: 'agrumi',
        vicine: {
          fresco: 'Ci sta: il limone È freschezza, le due cose stanno insieme.',
          dolce: 'Ci sta: il mandarino ha una dolcezza che inganna.',
          speziato: 'Ci sta: sotto l’agrume si nasconde un pizzico di zenzero.',
        },
      },
      {
        livello: 'Cuore',
        titolo: 'E dopo un minuto?',
        sottotitolo: 'Quando il primo slancio passa, esce il carattere.',
        opzioni: [
          { id: 'marino', etichetta: 'Marino', nota: 'aria salata, scoglio' },
          { id: 'fiori-bianchi', etichetta: 'Fiori bianchi', nota: 'gelsomino, zagara' },
          { id: 'erba', etichetta: 'Erba', nota: 'prato appena tagliato' },
          { id: 'frutta', etichetta: 'Frutta', nota: 'pesca, mela' },
        ],
        giusta: 'marino',
        vicine: {
          'fiori-bianchi': 'Ci sta: il fiore d’arancio qui dentro c’è, e spinge verso il bianco.',
          erba: 'Ci sta: il marino e il verde hanno la stessa aria aperta.',
          frutta: 'Ci sta: resta un fondo di agrume che sembra frutta.',
        },
      },
      {
        livello: 'Fondo',
        titolo: 'Cosa resta sulla pelle?',
        sottotitolo: 'Quello che senti stasera, sulla sciarpa.',
        opzioni: [
          { id: 'bucato', etichetta: 'Bucato pulito', nota: 'muschio bianco' },
          { id: 'legno', etichetta: 'Legno', nota: 'matita temperata' },
          { id: 'vaniglia', etichetta: 'Vaniglia', nota: 'caldo, da pasticceria' },
          { id: 'cocco', etichetta: 'Cocco', nota: 'crema solare' },
        ],
        giusta: 'bucato',
        vicine: {
          legno: 'Ci sta: il cedro è proprio lì sotto, tiene insieme tutto.',
          vaniglia: 'Ci sta: il muschio pulito ha una morbidezza da vaniglia.',
          cocco: 'Ci sta: è la stessa scia da pelle al sole.',
        },
      },
    ],
  },
];

/**
 * Quando chi risponde sceglie un'opzione per cui non abbiamo scritto una
 * riga apposta. Non dice mai «sbagliato»: nessuno deve uscire da questa card
 * sentendosi bocciato, il credito lo prende comunque, e il profumo lo stava
 * annusando per davvero.
 */
export const CONSOLAZIONE = 'Ci sta: sono due note che si somigliano parecchio.';

/** La riga di chi ha preso la nota giusta. */
export const CONFERMA = 'Esatto, è proprio quella.';

/**
 * Quale fragranza c'è nell'aria del negozio, oggi. È l'unica riga legata al
 * mondo vero: se il diffusore cambia e questa resta indietro, il quiz dice
 * la nota sbagliata a chi ha il naso giusto, che è il modo più veloce di
 * rovinare tutto.
 *
 * Con `null` la fragranza è scelta a caso a ogni tocco della card: va bene
 * solo per far vedere il giocattolo, non in negozio.
 */
export const IN_DIFFUSIONE: string | null = 'notte-aurea';

export function fragranzaDelGiorno(): Fragranza {
  const scelta = FRAGRANZE.find((f) => f.id === IN_DIFFUSIONE);
  return scelta ?? FRAGRANZE[Math.floor(Math.random() * FRAGRANZE.length)];
}

/**
 * Il titolo del riepilogo.
 *
 * Non è una pagella. Chi ha preso tutto se lo sente dire, ma chi non ha
 * preso niente legge comunque una riga che parla del suo naso e non dei
 * suoi errori: da questa schermata si esce contenti, sempre, perché il
 * premio non è mai stato il punteggio.
 */
export function verdetto(giuste: number, totale: number): string {
  if (giuste === totale) return 'Tutte. Hai il naso.';
  if (giuste === 0) return 'Il tuo naso ha idee sue.';
  if (giuste === totale - 1) return 'Quasi tutte.';
  return 'Qualcuna l’hai presa.';
}

/**
 * La riga sotto il titolo del riepilogo. Anche a zero risposte giuste dice
 * una cosa vera e gentile: le note si somigliano, riconoscerle è un
 * mestiere, e intanto la fragranza adesso ha un nome.
 */
export function chiosa(giuste: number, totale: number): string {
  if (giuste === totale) return 'Tre su tre. Il naso ce l’hai, davvero.';
  if (giuste === 0) return 'Le note si somigliano tutte, all’inizio: si impara annusando.';
  return `${giuste} su ${totale}. Le altre le riconosci la prossima volta.`;
}
/* ------------------------------------------------------------------ */
/* Il modulo e il credito                                              */
/* ------------------------------------------------------------------ */

/**
 * Cosa chiediamo per consegnare il credito.
 *
 * Il brief scrive «Email / Numero di telefono»: quella barra si può leggere in
 * due modi, e la differenza non è di dettaglio — chiederne uno solo fa
 * compilare più persone, chiederli entrambi lascia due strade per ritrovarle.
 *
 * `'uno'` (com'è adesso) accetta il modulo con uno dei due campi pieno,
 * dicendolo a schermo. `'entrambi'` li rende tutti e due obbligatori. Il nome
 * e cognome è sempre richiesto.
 */
export const CONTATTO_RICHIESTO: 'uno' | 'entrambi' = 'uno';

/**
 * Il numero WhatsApp della profumeria, in formato internazionale senza segni:
 * per esempio 393331234567. Finché è vuoto, alla fine non compare nessun
 * bottone; appena c'è un numero, il cliente può aprire la chat con il codice
 * già scritto.
 */
export const WHATSAPP_NEGOZIO = '';

/**
 * Il messaggio che il cliente si ritrova già pronto nella chat.
 *
 * Parte dal suo WhatsApp, quindi arriva alla profumeria dal suo numero vero:
 * il contatto è verificato per costruzione, non c'è modo di sbagliarlo a
 * scrivere.
 */
export function messaggioWhatsApp(l: {
  nome: string; credito: number; codice: string; fragranza: string; giuste: number; totale: number;
}): string {
  return [
    `Ciao, sono ${l.nome}.`,
    `Ho il credito Club Aurea da ${l.credito}€, codice ${l.codice}.`,
    '',
    `Ho indovinato ${l.giuste} note su ${l.totale} di ${l.fragranza}.`,
    '',
    'Vorrei provarla in profumeria.',
  ].join('\n');
}

/** Codice del credito nel formato AUREA-XXXX. */
export function generaCodice(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // via I, O, 0 e 1: si confondono
  let out = '';
  for (let i = 0; i < 4; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `AUREA-${out}`;
}

export function scadenza(da = new Date()): Date {
  const d = new Date(da);
  d.setDate(d.getDate() + VALIDITA_GIORNI);
  return d;
}

export function dataItaliana(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Mese abbreviato: nella tessera la data deve stare su una riga sola. */
export function dataBreve(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '');
}
