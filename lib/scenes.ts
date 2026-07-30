// Mappa delle scene: traduzione diretta della tabella del Concept V2 §3.
// Le durate sono in viewport-height; gli intervalli normalizzati [p0,p1]
// sono derivati, così la regia si ritara cambiando solo questi numeri.

export type SceneId =
  | 's01' | 's02' | 's03' | 's04' | 's05' | 's06'
  | 's07' | 's08' | 's09' | 's10' | 's11' | 's12';

/** Capitoli narrativi (Direzione V3). I capitoli 5-6 — Materiali
 * Selezionati e Le Opere Realizzate — vivono nelle sezioni dopo il
 * viaggio (S13), non nel piano sequenza. */
export const CHAPTERS = [
  'La Visione',
  'Trasformare gli Spazi',
  'La Qualità Invisibile',
  'Il Benessere Quotidiano',
] as const;

export interface SceneDef {
  id: SceneId;
  vh: number;
  capitolo: 1 | 2 | 3 | 4;
  titolo: string;
}

export const SCENES: SceneDef[] = [
  { id: 's01', vh: 1.5, capitolo: 1, titolo: 'La visione' },
  { id: 's02', vh: 2.0, capitolo: 1, titolo: 'Il rilievo' },
  { id: 's03', vh: 3.0, capitolo: 2, titolo: 'La costruzione' },
  { id: 's04', vh: 2.0, capitolo: 2, titolo: 'La materia' },
  { id: 's05', vh: 1.5, capitolo: 2, titolo: 'Il volo' },
  { id: 's06', vh: 1.5, capitolo: 2, titolo: 'La soglia' },
  { id: 's07', vh: 3.0, capitolo: 2, titolo: 'Il soggiorno' },
  { id: 's08', vh: 2.5, capitolo: 3, titolo: 'Dentro la parete' },
  { id: 's09', vh: 2.5, capitolo: 3, titolo: 'Sotto il pavimento' },
  { id: 's10', vh: 2.5, capitolo: 4, titolo: 'Il bagno' },
  // La finestra ha bisogno di respiro: è l'uscita dal bagno verso il bianco,
  // e con 1.5 schermate il video correva. A 2.5 il gesto si legge.
  { id: 's11', vh: 2.5, capitolo: 4, titolo: 'La finestra' },
  { id: 's12', vh: 2.0, capitolo: 4, titolo: 'Il congedo' },
];

export const TOTAL_VH = SCENES.reduce((sum, s) => sum + s.vh, 0);

const ranges = new Map<SceneId, { p0: number; p1: number }>();
{
  let acc = 0;
  for (const s of SCENES) {
    ranges.set(s.id, { p0: acc / TOTAL_VH, p1: (acc + s.vh) / TOTAL_VH });
    acc += s.vh;
  }
}

export function sceneRange(id: SceneId): { p0: number; p1: number } {
  return ranges.get(id)!;
}

/** p globale corrispondente a un punto locale (0..1) di una scena. */
export function pAt(id: SceneId, t: number): number {
  const { p0, p1 } = sceneRange(id);
  return p0 + (p1 - p0) * t;
}

/** Progresso locale 0..1 dentro una scena, clampato. */
export function localT(p: number, id: SceneId): number {
  const { p0, p1 } = sceneRange(id);
  return clamp01((p - p0) / (p1 - p0));
}

/** 0..1 clampato tra due p globali. */
export function span(p: number, a: number, b: number): number {
  return clamp01((p - a) / (b - a));
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function smooth(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

export function sceneAt(p: number): SceneDef {
  for (const s of SCENES) {
    const r = ranges.get(s.id)!;
    if (p <= r.p1) return s;
  }
  return SCENES[SCENES.length - 1];
}
