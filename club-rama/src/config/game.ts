/**
 * Tutta la configurazione del gioco sta qui. Per cambiare premi, esito,
 * validità o domande non serve aprire nessun altro file.
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
 * di lui nella lista. Il 200 sta all'indice 2 e il 70 all'indice 1: è così
 * che il 200 sfila sotto la lancetta un attimo prima di fermarsi sul 70.
 * Se sposti uno dei due, l'effetto sparisce.
 */
export const SPICCHI: Spicchio[] = [
  { valore: 30 },
  { valore: 70 },
  { valore: 200, speciale: true },
  { valore: 50 },
  { valore: 150 },
  { valore: 30 },
  { valore: 100 },
  { valore: 50 },
];

/**
 * Gli esiti possibili e quanto spesso escono. Sopra i 70 non si va: i premi
 * grossi stanno sulla ruota per farsi vedere e per far sudare, non per essere
 * vinti. Il 70 esce più di tutti — è il premio su cui è costruita l'offerta —
 * ma non da solo: se uscisse sempre lui, due persone che confrontano lo
 * schermo capirebbero in un attimo che la ruota non decide niente.
 *
 * I pesi sono relativi, non percentuali: si possono cambiare a occhio senza
 * rifare i conti perché tornino a cento.
 */
export type Esito = { valore: number; peso: number };

export const ESITI: Esito[] = [
  { valore: 30, peso: 18 },
  { valore: 50, peso: 27 },
  { valore: 70, peso: 55 },
];

/**
 * Per ogni esito, lo spicchio su cui fermarsi.
 *
 * Non è un dettaglio: gli spicchi arrivano sotto la lancetta in ordine
 * decrescente, quindi la scelta dello spicchio decide *quale premio sfila via
 * un attimo prima*. Il 70 sull'indice 1 si prende il 200 davanti; il 50
 * sull'indice 3 si prende il 150; il 30 sull'indice 0 si prende il 70. Ogni
 * esito ha così il suo quasi-premio, e nessun giro finisce piatto.
 */
export const SPICCHIO_PER_ESITO: Record<number, number> = { 30: 0, 50: 3, 70: 1 };

/** Sorteggia il premio secondo i pesi. */
export function sorteggiaEsito(): number {
  const totale = ESITI.reduce((s, e) => s + e.peso, 0);
  let r = Math.random() * totale;
  for (const e of ESITI) {
    r -= e.peso;
    if (r <= 0) return e.valore;
  }
  return ESITI[ESITI.length - 1].valore;
}

/** Lo spicchio su cui atterrare per un dato premio. */
export function spicchioPer(valore: number): number {
  const scelto = SPICCHIO_PER_ESITO[valore];
  if (scelto !== undefined && SPICCHI[scelto]?.valore === valore) return scelto;
  const tutti = SPICCHI.map((s, i) => (s.valore === valore ? i : -1)).filter((i) => i >= 0);
  return tutti[Math.floor(Math.random() * tutti.length)];
}

/**
 * Dove si posa la lancetta dentro lo spicchio vincente, misurato a partire
 * dal bordo che confina con lo spicchio precedente.
 *
 * Vale solo quando quello appena sfilato è il premio grosso: lì la ruota si
 * posa appena dentro, a un soffio dal 200, e la tensione nasce dal punto
 * d'arresto invece che da una pausa costruita. Una ruota vera non si ferma e
 * riparte, e se lo fa si vede subito che è finta. Sugli altri esiti la
 * lancetta si posa dove capita, in mezzo allo spicchio.
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

/**
 * Il numero WhatsApp del negozio, in formato internazionale senza segni:
 * per esempio 393331234567. Finché è vuoto, chi sceglie WhatsApp vede solo
 * il messaggio di conferma; appena c'è un numero compare il bottone che apre
 * la chat con il codice già scritto.
 */
export const WHATSAPP_NEGOZIO = '';

/**
 * Il messaggio che il cliente si ritrova già pronto nella chat.
 *
 * Parte dal suo WhatsApp, quindi arriva a Rama dal suo numero vero: il
 * contatto è verificato per costruzione, non c'è modo di sbagliarlo a
 * scrivere. Dentro ci mettiamo tutto il resto, così la conversazione nasce
 * già con le informazioni sul tavolo.
 */
export function messaggioWhatsApp(l: {
  nome: string; email: string; credito: number; codice: string; ambiente: string; stile: string;
}): string {
  return [
    `Ciao, sono ${l.nome}.`,
    `Ho il credito Club Rama da ${l.credito}€, codice ${l.codice}.`,
    '',
    `Sto rifacendo: ${l.ambiente.toLowerCase()}`,
    `Stile che mi piace: ${l.stile.toLowerCase()}`,
    `La mia email: ${l.email}`,
    '',
    'Vorrei un preventivo.',
  ].join('\n');
}

export type Opzione = { id: string; etichetta: string; nota?: string };

export const AMBIENTI: Opzione[] = [
  { id: 'bagno', etichetta: 'Bagno' },
  { id: 'cucina', etichetta: 'Cucina' },
  { id: 'salotto', etichetta: 'Salotto' },
  { id: 'casa', etichetta: 'Casa intera' },
];

export const STILI: Opzione[] = [
  { id: 'minimal', etichetta: 'Minimal e moderno' },
  { id: 'classico', etichetta: 'Classico' },
  { id: 'materico', etichetta: 'Effetto legno o pietra' },
  { id: 'indeciso', etichetta: 'Non lo so ancora' },
];

/** Codice del credito nel formato RAMA-XXXX. */
export function generaCodice(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // via I, O, 0 e 1: si confondono
  let out = '';
  for (let i = 0; i < 4; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `RAMA-${out}`;
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
