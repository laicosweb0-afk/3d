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
  /** durata del girato in secondi (fonte: GIRATO.md) */
  durata: number;
  titolo: string;
}

export const SECONDI_PER_VH = 2.5;

export const CLIPS: ClipDef[] = [
  { id: 'terreno',     file: '01-terreno',     durata: 4, titolo: 'Il terreno' },
  { id: 'fondazioni',  file: '02-fondazioni',  durata: 5, titolo: 'Le fondazioni' },
  { id: 'costruzione', file: '03-costruzione', durata: 8, titolo: 'La costruzione' },
  // 04-materia e 05-volo sono uscite dal viaggio: finivano la casa PRIMA che
  // il visitatore entrasse, e dentro lo trovava ancora cantiere. Lo stato
  // dell'edificio deve solo avanzare, mai tornare indietro — una casa col
  // prato rasato non ha il massetto grezzo di là dalla porta. I file restano
  // nel repo: se serviranno, serviranno dopo l'uscita, non prima.
  { id: 'soglia',      file: '06-soglia',      durata: 4, titolo: 'La soglia' },
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
      const local = (x - p0) / (p1 - p0);
      return { i, t: Math.min(1, Math.max(0, local)) * CLIPS[i].durata };
    }
  }
  return { i: CLIPS.length - 1, t: CLIPS[CLIPS.length - 1].durata };
}

export function clipRange(i: number): { p0: number; p1: number } {
  return range[i];
}
