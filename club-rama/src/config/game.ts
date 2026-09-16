/**
 * Tutta la configurazione del gioco sta qui. Per cambiare premi, esito,
 * validità o domande non serve aprire nessun altro file.
 */

export type Spicchio = { valore: number };

/** Gli spicchi, in senso orario a partire da quello sotto la lancetta. */
export const SPICCHI: Spicchio[] = [
  { valore: 30 },
  { valore: 70 },
  { valore: 50 },
  { valore: 150 },
  { valore: 30 },
  { valore: 100 },
  { valore: 50 },
  { valore: 70 },
];

/**
 * Esito deciso in partenza. La ruota atterra su uno spicchio con questo
 * valore, in un punto leggermente casuale al suo interno perché non sembri
 * calcolato. Con `null` l'esito è davvero casuale.
 */
export const OUTCOME: number | null = 70;

/** Giorni di validità del credito, contati dal giorno del ritiro. */
export const VALIDITA_GIORNI = 90;

/** Durata della rotazione in millisecondi e giri completi prima di fermarsi. */
export const GIRO = { durata: 5200, giriMin: 6, giriMax: 8 };

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
