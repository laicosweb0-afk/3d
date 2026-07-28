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
  { id: 'costruzione', file: '03-costruzione', inizio: 3.6, durata: 4.4, titolo: 'La costruzione' },
  // Fuori dal viaggio: 04-materia, 05-volo e 06-soglia. Tutte e tre
  // mostravano la casa GIÀ FINITA — pietra, prato rasato — prima che il
  // visitatore entrasse, e di là dalla porta lo aspettava ancora il cantiere.
  // Lo stato dell'edificio deve solo avanzare, mai tornare indietro. Erano
  // anche i doppioni: dodici secondi di casa finita quasi identici.
  // I file restano nel repo — semmai serviranno dopo l'uscita, non prima.
  { id: 'soggiorno',   file: '07-soggiorno',   durata: 8, titolo: 'Il soggiorno' },
  { id: 'tuffo',       file: '08-tuffo',       durata: 4, titolo: 'Il tuffo' },
  { id: 'bagno',       file: '09-bagno',       durata: 6, titolo: 'Il bagno' },
  { id: 'uscita',      file: '10-uscita',      durata: 4, titolo: "L'uscita nel bianco" },
];

export const DURATA_TOTALE = CLIPS.reduce((s, c) => s + c.durata, 0);
/** Altezza di scroll del viaggio video, in viewport-height. */
export const VIAGGIO_VH = DURATA_TOTALE / SECONDI_PER_VH;

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
