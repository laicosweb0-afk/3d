// Mappa delle scene del viaggio "Quelli della bufala".
// Traduzione diretta della tabella di SCALETTA_BUFALA.md §2: le durate sono
// in viewport-height, gli intervalli [p0,p1] sono derivati — per ritarare il
// ritmo si cambiano solo i `vh`, mai il resto del codice.

export type SceneId =
  | 's01' | 's02' | 's03' | 's04' | 's05' | 's06' | 's07' | 's08';

/** I capitoli formano una frase continua che si completa scorrendo
 *  (SCALETTA_BUFALA.md §3). */
export const CHAPTERS = [
  'Ciò che si vede',
  'Ciò che si tocca',
  'Ciò che si nasconde',
  'Ciò che resta',
] as const;

export type ChapterIndex = 1 | 2 | 3 | 4;

export interface SceneDef {
  id: SceneId;
  vh: number;
  capitolo: ChapterIndex;
  titolo: string;
}

export const SCENES: SceneDef[] = [
  { id: 's01', vh: 2.0, capitolo: 1, titolo: "L'apparizione" },
  { id: 's02', vh: 2.5, capitolo: 1, titolo: 'La forma' },
  { id: 's03', vh: 2.0, capitolo: 2, titolo: 'La pelle' },
  { id: 's04', vh: 2.5, capitolo: 2, titolo: 'Il peso' },
  // Il taglio è il momento clou: è la scena più lunga di tutto il viaggio
  // perché il movimento deve poter essere lentissimo (Direzione §6).
  { id: 's05', vh: 3.0, capitolo: 3, titolo: 'Il taglio' },
  { id: 's06', vh: 2.0, capitolo: 3, titolo: 'Il tempo' },
  { id: 's07', vh: 2.5, capitolo: 4, titolo: 'La famiglia' },
  { id: 's08', vh: 2.0, capitolo: 4, titolo: 'Il congedo' },
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

/** Smoothstep — la curva di default per ogni dissolvenza del viaggio. */
export function smooth(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

export function sceneAt(p: number): SceneDef {
  for (const s of SCENES) {
    if (p <= ranges.get(s.id)!.p1) return s;
  }
  return SCENES[SCENES.length - 1];
}

/** Finestra di visibilità di una scena, con dissolvenza in entrata e uscita.
 *  Restituisce 0..1: è l'opacità/peso con cui la scena partecipa al frame.
 *
 *  Le due scene di confine non sfumano dal lato esterno: la prima è già
 *  presente al caricamento (una hero invisibile finché non si scorre è un
 *  difetto, non una scelta) e l'ultima resta piena fino alla fine del
 *  viaggio, dove il documento prende il posto del piano sequenza. */
export function sceneWeight(p: number, id: SceneId, fade = 0.25): number {
  const t = localT(p, id);
  const prima = id === SCENES[0].id;
  const ultima = id === SCENES[SCENES.length - 1].id;

  if (t <= 0) return prima ? 1 : 0;
  if (t >= 1) return ultima ? 1 : 0;

  const entrata = prima ? 1 : smooth(Math.min(t / fade, 1));
  const uscita = ultima ? 1 : smooth(Math.min((1 - t) / fade, 1));
  return entrata * uscita;
}
