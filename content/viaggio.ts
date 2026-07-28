// IL VIAGGIO IN VIDEO — il manifesto delle dieci clip.
//
// È la spina dorsale della versione reale del sito: l'ordine, le durate e i
// file delle clip generate (registro completo in GIRATO.md). Lo scroll viene
// ripartito in proporzione alle durate, così il ritmo sotto le dita è lo
// stesso per ogni secondo di girato — la regola SECONDI_PER_VH di shots.ts.
//
// I file vanno in public/assets/video/viaggio/. Finché non ci sono, la
// modalità video semplicemente non trova le clip: il sito 3D resta intatto.

export interface ClipDef {
  id: string;
  /** nome file senza estensione, in /assets/video/viaggio/ */
  file: string;
  /** durata usata nel viaggio, in secondi */
  durata: number;
  /**
   * Punto d'attacco dentro il file, in secondi. Serve a entrare in una clip
   * dopo il suo inizio senza rigenerarla: il montaggio costa zero, la
   * generazione no.
   */
  inizio?: number;
  titolo: string;
}

export const SECONDI_PER_VH = 2.5;

export const CLIPS: ClipDef[] = [
  // Fuori dal viaggio anche 01-terreno e 02-fondazioni: erano due riprese in
  // più, con angolazioni e movimenti di macchina diversi fra loro, che
  // allungavano l'attesa prima che comparisse una casa. Il visitatore non
  // arriva per vedere dei picchetti.
  //
  // Della costruzione si tiene solo la seconda metà: si attacca a casa già
  // impostata e la si vede chiudersi. È un taglio di montaggio — niente
  // rigenerazione.
  // Il girato entra in scena solo DENTRO casa: fuori ci pensa il 3D, che
  // tiene il bianco dell'hero senza strappi (vedi STRUTTURA.md). Tutte le
  // clip d'esterno generate — terreno, fondazioni, costruzione, materia,
  // volo, soglia — restano nel repo ma fuori dal viaggio: avevano angolazioni
  // diverse fra loro e mostravano la casa finita prima dell'ingresso.

  // Soggiorno e bagno usano le due transizioni già presenti nel repo da prima
  // di oggi. Sono migliori delle mie: la camera non si sposta di un
  // millimetro e la stanza si trasforma attorno, quindi non c'è nessuna
  // deriva d'inquadratura da nascondere.
  { id: 'soggiorno', file: '07b-soggiorno', durata: 5, titolo: 'Il soggiorno' },
  { id: 'tuffo',     file: '08-tuffo',      durata: 4, titolo: 'Il tuffo' },
  { id: 'bagno',     file: '09b-bagno',     durata: 5, titolo: 'Il bagno' },
  { id: 'uscita',    file: '10-uscita',     durata: 4, titolo: "L'uscita nel bianco" },
];

/**
 * Quota di viaggio che spetta al 3D, prima che cominci il girato.
 * Il modello porta dal foglio bianco fino alla porta che si apre: è lì che i
 * due linguaggi si danno il cambio, fuori il progetto e dentro la realtà.
 */
export const QUOTA_3D = 0.55;
/** Punto del viaggio 3D in cui la porta è aperta e si sta per entrare. */
export const P_SOGLIA_3D = 0.48;

/**
 * Dal progresso dell'intero viaggio al progresso che deve vedere il 3D.
 * Dopo la soglia resta fermo sull'ultimo fotogramma: il modello ha finito il
 * suo compito e sotto è già subentrato il girato.
 */
export function progresso3D(viaggio: number): number {
  const q = Math.min(1, Math.max(0, viaggio / QUOTA_3D));
  return q * P_SOGLIA_3D;
}

/** Dal progresso dell'intero viaggio al progresso del girato, 0..1. */
export function progressoVideo(viaggio: number): number {
  return Math.min(1, Math.max(0, (viaggio - QUOTA_3D) / (1 - QUOTA_3D)));
}

// Finestra della soglia: il modello (fuori, vede la porta) e il girato
// (dentro, vede la stanza) sono due inquadrature diverse — non la stessa
// ripresa continuata. Sovrapporle in trasparenza per una finestra larga
// mostra le due immagini insieme, a doppia esposizione: si vede la porta 3D
// fantasma sopra l'interno vero. La finestra resta stretta apposta: il
// cambio deve sparire dentro il velo bianco (vedi veloBianco), non essere
// visibile come dissolvenza.
const SOGLIA_A = QUOTA_3D - 0.025;
const SOGLIA_B = QUOTA_3D + 0.02;

/**
 * Quanto il girato ha preso il posto del 3D, 0..1.
 */
export function subentroVideo(viaggio: number): number {
  const t = Math.min(1, Math.max(0, (viaggio - SOGLIA_A) / (SOGLIA_B - SOGLIA_A)));
  return t * t * (3 - 2 * t);
}

/**
 * Velo bianco sulla soglia, 0..1. Il modello e il girato non sono la stessa
 * inquadratura: invece di mostrarli insieme (doppia esposizione), il primo
 * sfuma nel bianco e il bianco sfuma nel secondo. La soglia sparisce dentro
 * la luce della porta — che nel modello e nel girato è già bruciata di luce,
 * quindi il velo è coerente con l'inquadratura, non un trucco a parte.
 */
export function veloBianco(viaggio: number): number {
  const centro = (SOGLIA_A + SOGLIA_B) / 2;
  const metaLarghezza = (SOGLIA_B - SOGLIA_A) / 2;
  const d = Math.abs(viaggio - centro) / metaLarghezza;
  const t = Math.max(0, 1 - d);
  return t * t;
}

export const DURATA_TOTALE = CLIPS.reduce((s, c) => s + c.durata, 0);
/**
 * Altezza di scroll dell'intero viaggio, in viewport-height.
 * Il girato occupa la quota dopo la soglia; il 3D si prende la parte prima, e
 * ha bisogno del suo spazio perché la casa si costruisca con calma. Da qui
 * l'altezza totale è quella del girato divisa per la quota che gli spetta.
 */
export const VIAGGIO_VH = DURATA_TOTALE / SECONDI_PER_VH / (1 - 0.55);

// Intervalli normalizzati [p0,p1] di ogni clip, derivati dalle durate.
const range: { p0: number; p1: number }[] = [];
{
  let acc = 0;
  for (const c of CLIPS) {
    range.push({ p0: acc / DURATA_TOTALE, p1: (acc + c.durata) / DURATA_TOTALE });
    acc += c.durata;
  }
}

/**
 * Da progresso globale a (clip attiva, tempo locale nel girato).
 * Ai confini vale la regola delle giunzioni: p1 della clip N e p0 della N+1
 * sono lo stesso fotogramma, quindi qualunque lato si scelga l'immagine è
 * identica per costruzione.
 */
export function clipAt(p: number): { i: number; t: number } {
  const x = Math.min(1, Math.max(0, p));
  for (let i = 0; i < CLIPS.length; i++) {
    const { p0, p1 } = range[i];
    if (x <= p1 || i === CLIPS.length - 1) {
      const local = Math.min(1, Math.max(0, (x - p0) / (p1 - p0)));
      const c = CLIPS[i];
      return { i, t: (c.inizio ?? 0) + local * c.durata };
    }
  }
  const u = CLIPS[CLIPS.length - 1];
  return { i: CLIPS.length - 1, t: (u.inizio ?? 0) + u.durata };
}

/** Estremi del tratto usato di una clip, in secondi dentro il file. */
export function estremi(i: number): { da: number; a: number } {
  const c = CLIPS[i];
  const da = c.inizio ?? 0;
  return { da, a: da + c.durata };
}

export function clipRange(i: number): { p0: number; p1: number } {
  return range[i];
}
