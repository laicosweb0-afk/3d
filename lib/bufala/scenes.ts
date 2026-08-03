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
  // Le durate delle scene sul video vanno lette insieme ai `tempo` della
  // regia: il loro rapporto è la velocità di riproduzione. Tenerlo simile
  // fra scene vicine evita che al confine il gesto cambi passo.
  { id: 's01', vh: 2.0, capitolo: 1, titolo: "L'apparizione" },
  // La discesa dura poco più di un secondo di filmato: allungarla in vh la
  // farebbe scorrere al rallentatore rispetto alle scene vicine.
  { id: 's02', vh: 1.5, capitolo: 1, titolo: 'La forma' },
  // La sospensione è il tratto più lungo del viaggio: è quello in cui non
  // succede un fatto nuovo ma si guarda l'oggetto girare, ed è il motivo
  // per cui si continua a scorrere.
  { id: 's03', vh: 4.5, capitolo: 2, titolo: 'La pelle' },
  { id: 's04', vh: 2.5, capitolo: 2, titolo: 'Il peso' },
  // Il taglio: due secondi di filmato su tre viewport, il rapporto più
  // lento di tutti. La lentezza qui è il peso (Direzione §6).
  { id: 's05', vh: 1.5, capitolo: 3, titolo: 'Il taglio' },
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

/** Semiampiezza (in p globale) della dissolvenza incrociata a ogni confine
 *  tra scene. Deve restare sotto metà della durata della scena più corta
 *  (2.0vh su 18.5vh totali, cioè 0.054), altrimenti le due dissolvenze di
 *  una stessa scena si sovrapporrebbero fra loro invece che coi vicini.
 *
 *  Ma il vincolo vero è un altro, trovato solo guardando lo scroll reale:
 *  un valore largo (provato: 0.035, cioè ~1,3 viewport di scroll) garantisce
 *  sì "niente vuoti", ma per farlo tiene DUE titoli diversi sovrapposti e
 *  leggibili insieme per un tratto lungo — illeggibile, peggio del vuoto
 *  che doveva risolvere. 0.010 (~0,2 viewport) mantiene la stessa garanzia
 *  matematica (la somma resta sempre 1, per costruzione) ma la rende un
 *  dissolvenza rapida e pulita invece di una doppia esposizione prolungata. */
const CROSSFADE = 0.01;

/** Peso 0..1 con cui una scena partecipa al frame, con dissolvenza
 *  incrociata vera ai confini: usando lo stesso smoothstep e la stessa
 *  finestra su entrambi i lati di un confine, la scena che esce e quella
 *  che entra sommano sempre a 1 per costruzione (proprietà dello
 *  smoothstep cubico: smooth(t) + smooth(1-t) = 1). Il viaggio non ha mai
 *  un istante in cui non c'è nulla in vista — l'utente non "esce" mai dalla
 *  scena in corso finché non è già dentro la successiva.
 *
 *  Le due scene di confine non sfumano dal lato esterno: la prima è già
 *  presente al caricamento (una hero invisibile finché non si scorre è un
 *  difetto, non una scelta) e l'ultima resta piena fino alla fine del
 *  viaggio, dove il documento prende il posto del piano sequenza. */
export function sceneWeight(p: number, id: SceneId): number {
  const { p0, p1 } = sceneRange(id);
  const prima = id === SCENES[0].id;
  const ultima = id === SCENES[SCENES.length - 1].id;

  // La rampa vive nella finestra [confine-CROSSFADE, confine+CROSSFADE],
  // quindi si estende anche oltre i propri p0/p1: è lì, nel territorio
  // condiviso col vicino, che le due rampe si sovrappongono e sommano a 1.
  // Ritagliare la finestra sui propri confini (come in una prima versione
  // di questa funzione) è l'errore che riporta il buco: a p0 esatto la
  // rampa vale 0.5 per costruzione, non 0 — deve poter continuare a salire.
  const entrata = prima ? 1 : smooth((p - (p0 - CROSSFADE)) / (2 * CROSSFADE));
  const uscita = ultima ? 1 : smooth(((p1 + CROSSFADE) - p) / (2 * CROSSFADE));
  return clamp01(entrata) * clamp01(uscita);
}
