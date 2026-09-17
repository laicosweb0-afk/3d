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
 * Esito deciso in partenza. La ruota atterra su uno spicchio con questo
 * valore, in un punto leggermente casuale al suo interno perché non sembri
 * calcolato. Con `null` l'esito è davvero casuale.
 */
export const OUTCOME: number | null = 70;

/**
 * La frenata in due tempi: la ruota si ferma quasi del tutto sullo spicchio
 * che precede il bersaglio, resta lì un istante, poi scivola avanti di uno
 * scatto e si posa. Serve a far credere, per un secondo, che stia per uscire
 * il premio grosso.
 *
 * Vale solo se lo spicchio che precede è marcato `speciale`. Con OUTCOME a
 * `null` non entra mai in gioco: se l'esito è davvero casuale, la suspense
 * costruita non avrebbe senso.
 */
export const QUASI = true;

/** Giorni di validità del credito, contati dal giorno del ritiro. */
export const VALIDITA_GIORNI = 90;

/** Durata della rotazione in millisecondi e giri completi prima di fermarsi. */
export const GIRO = {
  /** La corsa vera e propria, fino a un soffio dal bersaglio. */
  durata: 4300,
  /** Il respiro col premio grosso fermo sotto la lancetta. */
  pausa: 430,
  /** Lo scatto finale che scopre il premio vero. */
  scivolo: 980,
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

/** Il messaggio che il cliente si ritrova già pronto nella chat. */
export function messaggioWhatsApp(nome: string, credito: number, codice: string, ambiente: string): string {
  return `Ciao, sono ${nome}. Ho il credito Club Rama da ${credito}€, codice ${codice}. ` +
    `Vorrei un preventivo per ${ambiente.toLowerCase()}.`;
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
