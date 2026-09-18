/**
 * THE FRAGRANCE EXPERIENCE — Woman Parfume Store
 * Smell · Guess · Share
 *
 * Tutta la configurazione sta qui. Per cambiare la fragranza ospite, i testi,
 * i premi o le fialette consigliate non serve aprire nessun altro file.
 *
 * Le regole che vengono dal documento strategico e che **non** si toccano
 * senza rimetterlo in discussione:
 *
 *   1. UNA SOLA DOMANDA. Ogni domanda in più abbassa i completamenti.
 *   2. NESSUN SECONDO TENTATIVO. Il gioco perderebbe peso e la risposta
 *      perderebbe valore come dato.
 *   3. UN SOLO PREMIO, uguale per tutti: 15 € in tre fialette da 5 €.
 *      Se il premio dipendesse dall'abilità cambierebbe categoria di
 *      manifestazione a premio, con gli adempimenti che ne seguono.
 *   4. IL RISULTATO NON È MAI UNA SCONFITTA. Chi non indovina riceve una
 *      spiegazione e una consulenza, che per una profumeria è il servizio
 *      più prezioso.
 */

/* ------------------------------------------------------------------ */
/* Le quattro famiglie: l'unica domanda del gioco                      */
/* ------------------------------------------------------------------ */

export type Famiglia = {
  id: string;
  etichetta: string;
  /** Il paragone che la rende rispondibile a chi non ha mai letto una
   *  piramide olfattiva. Senza questo la domanda è per addetti ai lavori. */
  nota: string;
  /** Come si accorda con «fialette»: femminile plurale. Senza questo campo
   *  verrebbe fuori «tre fialette legnoso», e basta una riga storta perché
   *  tutto il resto sembri scritto di fretta. */
  plurale: string;
};

export const FAMIGLIE: Famiglia[] = [
  { id: 'agrumato', etichetta: 'Agrumato', nota: 'scorza, freschezza, pulito', plurale: 'agrumate' },
  { id: 'floreale', etichetta: 'Floreale', nota: 'petali, fiori bianchi, cipria', plurale: 'floreali' },
  { id: 'legnoso', etichetta: 'Legnoso', nota: 'legno, resina, matita', plurale: 'legnose' },
  { id: 'ambrato', etichetta: 'Ambrato', nota: 'caldo, dolce, balsamico', plurale: 'ambrate' },
];

export const DOMANDA = {
  kicker: 'Prima di scoprirlo',
  titolo: 'Cosa hai sentito?',
  sottotitolo: 'Una risposta sola, quella di pancia. Non si torna indietro.',
  conferma: 'Scopri',
};

/* ------------------------------------------------------------------ */
/* La fragranza ospite di questa edizione                              */
/* ------------------------------------------------------------------ */

export type Fragranza = {
  /** Come si chiama, quando si scopre. */
  nome: string;
  /** La maison partner che la fornisce. */
  maison: string;
  /** L'id della famiglia giusta: deve esistere in FAMIGLIE. */
  famiglia: string;
  /** Le note da mostrare alla rivelazione, in ordine di lettura. */
  note: string[];
  /** Una riga sola: il ritratto della fragranza. */
  ritratto: string;
  /**
   * La nota che porta fuori strada. Finisce dentro la frase che legge chi
   * non ha indovinato: «sotto c'è un accordo di ___ che confonde quasi
   * tutti». Va scelta guardando la fragranza vera, non a caso: è quella che
   * rende la spiegazione credibile invece che di circostanza.
   */
  accordoIngannevole: string;
  /**
   * La foto del flacone o della fialetta: un file in `public/fragranze/`.
   * Quando manca, l'app disegna la sua boccetta e non si rompe niente.
   */
  immagine?: string;
};

/**
 * ⚠️ DA CAMBIARE A OGNI EDIZIONE, insieme alla fialetta che entra nei pacchi.
 *
 * È l'unica riga legata al mondo vero: se la profumeria cambia la fialetta
 * sorpresa e questa resta indietro, la pagina dà il nome sbagliato a chi ha
 * appena annusato — e non c'è modo più veloce di bruciare il giocattolo.
 *
 * I dati qui sotto sono un segnaposto per far girare la prova: nome, maison
 * e note vanno sostituiti con quelli veri appena la maison partner è scelta.
 */
export const OSPITE: Fragranza = {
  nome: 'Nome Fragranza',
  maison: 'Maison Ospite',
  famiglia: 'ambrato',
  note: ['Bergamotto', 'Gelsomino', 'Vaniglia e ambra'],
  ritratto: 'Un fiore bianco che si scalda sulla pelle e non se ne va più.',
  accordoIngannevole: 'fiori bianchi',
};

/* ------------------------------------------------------------------ */
/* Cosa si legge dopo la risposta                                      */
/* ------------------------------------------------------------------ */

export const ESITO = {
  /** Chi ha preso la famiglia giusta. */
  centrato: {
    titolo: 'Naso allenato.',
    riga: (f: Fragranza) => `È esattamente ${f.nome}, di ${f.maison}.`,
    premio: 'Le tre fialette le scegli tu.',
  },
  /**
   * Chi ha sentito altro. Non è un errore da correggere: è una percezione,
   * e da qui in avanti diventa il criterio con cui Woman sceglie le fialette.
   */
  altrove: {
    titolo: 'Il tuo naso ti ha portato altrove.',
    riga: (f: Fragranza) =>
      `E non è un caso: sotto c'è un accordo di ${f.accordoIngannevole} che confonde quasi tutti.`,
    premio: 'Le tre fialette te le scegliamo noi, su quello che hai sentito.',
  },
};

/**
 * Le percentuali di risposta, per la riga «il 62% ha risposto come te».
 *
 * Resta `null` finché non c'è un conteggio vero: sono le risposte di chi ha
 * giocato prima, e finché nessuno ha giocato quel numero non esiste. Scriverne
 * uno inventato sarebbe l'unica bugia di tutta l'esperienza, per giunta in
 * bocca al negozio e dentro la schermata che dovrebbe dare fiducia.
 *
 * Quando l'endpoint che conta sarà in piedi, qui arriva una mappa
 * `{ agrumato: 12, floreale: 24, legnoso: 18, ambrato: 46 }` e la riga si
 * accende da sola.
 */
export const PERCENTUALI: Record<string, number> | null = null;

/* ------------------------------------------------------------------ */
/* Le tre fialette consigliate, per chi ha sentito altro               */
/* ------------------------------------------------------------------ */

export type Consiglio = { nome: string; riga: string };

/**
 * Per ogni famiglia, le tre fialette che Woman propone a chi l'ha scelta.
 * È il pezzo di consulenza del documento: la percezione del cliente diventa
 * il criterio della selezione, non un errore da correggere.
 *
 * Vanno sostituite con fragranze che la profumeria ha davvero in fialetta.
 */
export const CONSIGLI: Record<string, Consiglio[]> = {
  agrumato: [
    { nome: 'Fialetta agrumata 1', riga: 'La scorza pulita, senza fronzoli.' },
    { nome: 'Fialetta agrumata 2', riga: 'Agrume e verde, per il giorno.' },
    { nome: 'Fialetta agrumata 3', riga: 'Agrume con un fondo di legno.' },
  ],
  floreale: [
    { nome: 'Fialetta floreale 1', riga: 'Fiori bianchi, pieni.' },
    { nome: 'Fialetta floreale 2', riga: 'Una rosa che non fa la timida.' },
    { nome: 'Fialetta floreale 3', riga: 'Cipriato, morbido, da sera.' },
  ],
  legnoso: [
    { nome: 'Fialetta legnosa 1', riga: 'Legno asciutto, quasi matita.' },
    { nome: 'Fialetta legnosa 2', riga: 'Legno e fumo.' },
    { nome: 'Fialetta legnosa 3', riga: 'Legno con una punta di agrume.' },
  ],
  ambrato: [
    { nome: 'Fialetta ambrata 1', riga: 'Vaniglia calda, lunga.' },
    { nome: 'Fialetta ambrata 2', riga: 'Ambra e spezie.' },
    { nome: 'Fialetta ambrata 3', riga: 'Dolce, ma con il legno sotto.' },
  ],
};

/* ------------------------------------------------------------------ */
/* Il premio                                                           */
/* ------------------------------------------------------------------ */

/** Quanto vale il credito, in euro, e in quante fialette si ritira. */
export const PREMIO = { valore: 15, fialette: 3, taglio: 5 };

export type Spicchio = {
  /** Sempre `PREMIO.valore`: è la regola. Sta qui perché la ruota lo legge. */
  valore: number;
  /** Cosa arriva insieme alle tre fialette su questo spicchio. */
  extra?: string;
};

/**
 * Gli spicchi della ruota.
 *
 * **Valgono tutti 15 €**: non c'è un premio grosso che nessuno può vincere,
 * perché una ruota con un premio irraggiungibile è esattamente la pratica che
 * il documento evita — e, in Italia, una pratica commerciale ingannevole ai
 * sensi del Codice del Consumo.
 *
 * Quello che cambia da spicchio a spicchio è l'`extra`: un omaggio in più,
 * di valore trascurabile, che dà alla ruota qualcosa da estrarre. Da sapere
 * con gli occhi aperti: **il credito da 15 € garantito a tutti non è un
 * concorso a premi, l'omaggio estratto a sorte sì.** Se si vuole restare
 * nella sobrietà del documento senza toccare la scenografia, basta lasciare
 * tutti gli `extra` vuoti: la ruota gira, il premio è uno solo, e non c'è
 * niente da dichiarare.
 */
export const SPICCHI: Spicchio[] = [
  { valore: PREMIO.valore },
  { valore: PREMIO.valore, extra: 'e la pochette Woman' },
  { valore: PREMIO.valore },
  { valore: PREMIO.valore, extra: 'e un campione in più' },
  { valore: PREMIO.valore },
  { valore: PREMIO.valore, extra: 'e la consulenza in negozio' },
];

/** Durata della rotazione in millisecondi e giri completi prima di fermarsi. */
export const GIRO = {
  /** Durata dell'unica decelerazione, dal lancio all'arresto. */
  durata: 4800,
  giriMin: 5,
  giriMax: 7,
};

/** Giorni di validità del credito, contati dal giorno del ritiro. */
export const VALIDITA_GIORNI = 90;

/* ------------------------------------------------------------------ */
/* I livelli: restano nel profilo e non si consumano                   */
/* ------------------------------------------------------------------ */

/**
 * Naso curioso → naso allenato → naso esperto. Il livello cresce a ogni
 * edizione e, a differenza di una fialetta, non si consuma: è il pezzo che
 * costa zero e che fa tornare.
 *
 * Qui dentro sappiamo solo com'è andata oggi: chi indovina alla prima parte
 * da «allenato», chi no da «curioso». Il resto lo saprà il profilo, quando
 * ci sarà.
 */
export const LIVELLI = ['Naso curioso', 'Naso allenato', 'Naso esperto'] as const;
export const livelloDi = (centrato: boolean) => (centrato ? LIVELLI[1] : LIVELLI[0]);

/* ------------------------------------------------------------------ */
/* Il modulo e il codice                                               */
/* ------------------------------------------------------------------ */

/**
 * Cosa chiediamo per consegnare il credito.
 *
 * `'uno'` accetta il modulo con l'email **oppure** il telefono, dicendolo a
 * schermo; `'entrambi'` li rende obbligatori tutti e due. Il nome e cognome
 * è sempre richiesto.
 */
export const CONTATTO_RICHIESTO: 'uno' | 'entrambi' = 'uno';

/**
 * Il numero WhatsApp della profumeria, in formato internazionale senza segni.
 * Finché è vuoto, alla fine non compare nessun bottone.
 */
export const WHATSAPP_NEGOZIO = '';

export function messaggioWhatsApp(l: {
  nome: string; credito: number; codice: string; famiglia: string;
}): string {
  return [
    `Ciao, sono ${l.nome}.`,
    `Ho il credito Woman da ${l.credito}€, codice ${l.codice}.`,
    '',
    `Alla fialetta sorpresa ho sentito: ${l.famiglia.toLowerCase()}.`,
    '',
    'Vorrei ritirare le mie tre fialette.',
  ].join('\n');
}

/** Codice del credito nel formato WOMAN-XXXX. */
export function generaCodice(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // via I, O, 0 e 1: si confondono
  let out = '';
  for (let i = 0; i < 4; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `WOMAN-${out}`;
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

export const famigliaDi = (id: string | null) =>
  FAMIGLIE.find((f) => f.id === id) ?? null;
