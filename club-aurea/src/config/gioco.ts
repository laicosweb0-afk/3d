/**
 * Tutta la configurazione del gioco sta qui. Per cambiare la fragranza in
 * diffusione, le domande, i premi, l'esito o la validità non serve aprire
 * nessun altro file.
 */

export type Spicchio = {
  valore: number;
  /** Il premio grosso: si veste d'oro invece che di magenta. */
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

export type Opzione = { id: string; etichetta: string; nota?: string };

export type Domanda = {
  /** Il gradino della piramide olfattiva a cui si riferisce la domanda. */
  livello: 'Testa' | 'Cuore' | 'Fondo';
  titolo: string;
  sottotitolo: string;
  opzioni: Opzione[];
  /** L'id dell'opzione giusta. Deve esistere fra le opzioni qui sopra. */
  giusta: string;
};

export type Fragranza = {
  id: string;
  nome: string;
  famiglia: string;
  /** Una riga sola: si legge dopo l'ultima risposta, quando si scopre. */
  ritratto: string;
  domande: Domanda[];
};

/**
 * Le fragranze della casa. Le domande non sono indovinelli da manuale: il
 * cliente ha il profumo addosso o nell'aria del negozio mentre risponde, e
 * quello che gli chiediamo è di riconoscerlo — testa, cuore, fondo.
 */
export const FRAGRANZE: Fragranza[] = [
  {
    id: 'notte-aurea',
    nome: 'Notte Aurea',
    famiglia: 'Orientale floreale',
    ritratto: 'Un fiore bianco che si scalda sulla pelle e non se ne va più.',
    domande: [
      {
        livello: 'Testa',
        titolo: 'Cosa senti per primo?',
        sottotitolo: 'La nota di testa è quella che arriva nei primi minuti.',
        opzioni: [
          { id: 'bergamotto', etichetta: 'Bergamotto', nota: 'agrumato, pulito' },
          { id: 'pepe', etichetta: 'Pepe rosa', nota: 'pungente, secco' },
          { id: 'lavanda', etichetta: 'Lavanda', nota: 'erbaceo, fresco' },
          { id: 'mela', etichetta: 'Mela verde', nota: 'acidulo, croccante' },
        ],
        giusta: 'bergamotto',
      },
      {
        livello: 'Cuore',
        titolo: 'E adesso, sotto?',
        sottotitolo: 'Il cuore esce dopo una decina di minuti ed è il carattere.',
        opzioni: [
          { id: 'gelsomino', etichetta: 'Gelsomino sambac', nota: 'bianco, narcotico' },
          { id: 'rosa', etichetta: 'Rosa damascena', nota: 'vellutato, dolce' },
          { id: 'iris', etichetta: 'Iris', nota: 'cipriato, elegante' },
          { id: 'neroli', etichetta: 'Fiori d’arancio', nota: 'solare, mieloso' },
        ],
        giusta: 'gelsomino',
      },
      {
        livello: 'Fondo',
        titolo: 'Cosa resta sulla pelle?',
        sottotitolo: 'Il fondo è quello che senti stasera, sulla sciarpa.',
        opzioni: [
          { id: 'vaniglia', etichetta: 'Vaniglia e ambra', nota: 'caldo, avvolgente' },
          { id: 'muschio', etichetta: 'Muschio bianco', nota: 'pulito, di bucato' },
          { id: 'vetiver', etichetta: 'Vetiver', nota: 'terroso, affumicato' },
          { id: 'patchouli', etichetta: 'Patchouli', nota: 'scuro, di bosco' },
        ],
        giusta: 'vaniglia',
      },
    ],
  },
  {
    id: 'rosa-nera',
    nome: 'Rosa Nera',
    famiglia: 'Floreale legnoso',
    ritratto: 'Una rosa che ha passato la notte fuori e non chiede scusa.',
    domande: [
      {
        livello: 'Testa',
        titolo: 'Cosa senti per primo?',
        sottotitolo: 'La nota di testa è quella che arriva nei primi minuti.',
        opzioni: [
          { id: 'pepe', etichetta: 'Pepe rosa', nota: 'pungente, secco' },
          { id: 'bergamotto', etichetta: 'Bergamotto', nota: 'agrumato, pulito' },
          { id: 'menta', etichetta: 'Menta', nota: 'freddo, verde' },
          { id: 'pera', etichetta: 'Pera', nota: 'succoso, morbido' },
        ],
        giusta: 'pepe',
      },
      {
        livello: 'Cuore',
        titolo: 'E adesso, sotto?',
        sottotitolo: 'Il cuore esce dopo una decina di minuti ed è il carattere.',
        opzioni: [
          { id: 'rosa', etichetta: 'Rosa damascena', nota: 'vellutato, dolce' },
          { id: 'tuberosa', etichetta: 'Tuberosa', nota: 'carnoso, denso' },
          { id: 'violetta', etichetta: 'Violetta', nota: 'cipriato, timido' },
          { id: 'gelsomino', etichetta: 'Gelsomino', nota: 'bianco, narcotico' },
        ],
        giusta: 'rosa',
      },
      {
        livello: 'Fondo',
        titolo: 'Cosa resta sulla pelle?',
        sottotitolo: 'Il fondo è quello che senti stasera, sulla sciarpa.',
        opzioni: [
          { id: 'oud', etichetta: 'Patchouli e oud', nota: 'scuro, resinoso' },
          { id: 'vaniglia', etichetta: 'Vaniglia', nota: 'dolce, da pasticceria' },
          { id: 'cedro', etichetta: 'Legno di cedro', nota: 'asciutto, a matita' },
          { id: 'muschio', etichetta: 'Muschio bianco', nota: 'pulito, di bucato' },
        ],
        giusta: 'oud',
      },
    ],
  },
  {
    id: 'sale-di-cedro',
    nome: 'Sale di Cedro',
    famiglia: 'Agrumato legnoso',
    ritratto: 'Il primo sole di maggio su una barca ferma.',
    domande: [
      {
        livello: 'Testa',
        titolo: 'Cosa senti per primo?',
        sottotitolo: 'La nota di testa è quella che arriva nei primi minuti.',
        opzioni: [
          { id: 'mandarino', etichetta: 'Mandarino verde', nota: 'agrumato, amaro' },
          { id: 'cannella', etichetta: 'Cannella', nota: 'speziato, caldo' },
          { id: 'cassis', etichetta: 'Ribes nero', nota: 'acido, scuro' },
          { id: 'zenzero', etichetta: 'Zenzero', nota: 'frizzante, pepato' },
        ],
        giusta: 'mandarino',
      },
      {
        livello: 'Cuore',
        titolo: 'E adesso, sotto?',
        sottotitolo: 'Il cuore esce dopo una decina di minuti ed è il carattere.',
        opzioni: [
          { id: 'neroli', etichetta: 'Neroli', nota: 'solare, verde' },
          { id: 'tuberosa', etichetta: 'Tuberosa', nota: 'carnoso, denso' },
          { id: 'rosa', etichetta: 'Rosa', nota: 'vellutato, dolce' },
          { id: 'iris', etichetta: 'Iris', nota: 'cipriato, elegante' },
        ],
        giusta: 'neroli',
      },
      {
        livello: 'Fondo',
        titolo: 'Cosa resta sulla pelle?',
        sottotitolo: 'Il fondo è quello che senti stasera, sulla sciarpa.',
        opzioni: [
          { id: 'cedro', etichetta: 'Cedro e muschio', nota: 'asciutto, salato' },
          { id: 'ambra', etichetta: 'Ambra', nota: 'caldo, resinoso' },
          { id: 'fava', etichetta: 'Fava tonka', nota: 'dolce, di mandorla' },
          { id: 'incenso', etichetta: 'Incenso', nota: 'fumoso, di chiesa' },
        ],
        giusta: 'cedro',
      },
    ],
  },
];

/**
 * Quale fragranza c'è nell'aria del negozio, oggi. È l'unica riga da tenere
 * allineata al mondo vero: se il diffusore cambia e questa resta indietro, il
 * quiz dice "sbagliato" a chi ha il naso giusto, che è il modo più veloce di
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
 * La riga sotto il punteggio. Nessuna di queste frasi nomina un numero: le
 * domande possono diventare due o cinque, e un verdetto che dice «su tre»
 * sarebbe la prima cosa a suonare falsa.
 */
export function verdetto(giuste: number, totale: number): string {
  if (giuste === totale) return 'Tutte. Hai il naso.';
  if (giuste === 0) return 'Nessuna. Si impara annusando.';
  // Le frasi restano senza genere: «ci sei andato vicino» sceglie per chi
  // legge, e qui non abbiamo nessun motivo per farlo.
  if (giuste === totale - 1) return 'Quasi tutte.';
  return 'Qualcuna l’hai presa.';
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
