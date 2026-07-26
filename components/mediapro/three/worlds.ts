import * as THREE from 'three';

/**
 * I cinque mondi del portfolio.
 *
 * Non sono cinque scene separate che si sostituiscono: sono cinque set di
 * parametri fra cui la scena interpola di continuo. `scroll.world` è un numero
 * frazionario (2.4 = poco oltre il terzo mondo), quindi il passaggio da un
 * progetto al successivo non è un taglio ma una miscela — è così che si
 * ottiene la transizione invisibile latte → metallo → vetro → luce.
 *
 * Ogni mondo pesa in modo diverso le tre famiglie di forme presenti in scena:
 * gocce (sfere), pannelli (lastre sottili) e schegge (solidi sfaccettati).
 */
export type World = {
  id: string;
  /** Colore dominante della materia. */
  color: THREE.Color;
  /** Colore delle luci e del pulviscolo. */
  light: THREE.Color;
  /** Nebbia: densità e tinta. */
  fog: THREE.Color;
  fogDensity: number;
  metalness: number;
  roughness: number;
  /** Quanto sono trasparenti le superfici (vetro, cristallo). */
  transmission: number;
  /** Peso delle tre famiglie di forme: gocce, pannelli, schegge. */
  weights: [number, number, number];
  /** Ampiezza della nuvola di oggetti e velocità del loro moto. */
  spread: number;
  speed: number;
  /** Densità e vivacità del pulviscolo. */
  dust: number;
};

const c = (hex: string) => new THREE.Color(hex);

export const WORLDS: World[] = [
  // 01 — Quelli della Bufala: latte, bianco, carta. Materia morbida e opaca.
  {
    id: 'bufala',
    color: c('#f2efe8'),
    light: c('#fff8ec'),
    fog: c('#0d0d0c'),
    fogDensity: 0.05,
    metalness: 0.06,
    roughness: 0.62,
    transmission: 0.12,
    weights: [1, 0.25, 0],
    spread: 4.2,
    speed: 0.5,
    dust: 1,
  },
  // 02 — MOU: verde e panna, la mozzarella. Materia tonda e opaca, non metallo.
  {
    id: 'mou',
    color: c('#2f6b39'),
    light: c('#eaf3d8'),
    fog: c('#080d09'),
    fogDensity: 0.056,
    metalness: 0.1,
    roughness: 0.55,
    transmission: 0.06,
    weights: [1, 0.4, 0],
    spread: 3.9,
    speed: 0.62,
    dust: 0.85,
  },
  // 03 — Mondial Service: blu notte e ambra, il metallo del mestiere.
  {
    id: 'mondial',
    color: c('#27405f'),
    light: c('#f0a63c'),
    fog: c('#070a0e'),
    fogDensity: 0.072,
    metalness: 1,
    roughness: 0.22,
    transmission: 0,
    weights: [0.1, 0.35, 1],
    spread: 3.9,
    speed: 1.5,
    dust: 1.35,
  },
  // 04 — AureaClub: rosa, perla e nero. Materia lucida e ordinata.
  {
    id: 'aurea',
    color: c('#d86f9c'),
    light: c('#ffd8e6'),
    fog: c('#0d0a0c'),
    fogDensity: 0.05,
    metalness: 0.35,
    roughness: 0.12,
    transmission: 0.6,
    weights: [0.6, 1, 0.2],
    spread: 4.5,
    speed: 0.55,
    dust: 0.9,
  },
  // 05 — Woman Beauty Center: magenta e nero, luce netta.
  {
    id: 'woman',
    color: c('#e0559b'),
    light: c('#ffc8e4'),
    fog: c('#0c0709'),
    fogDensity: 0.08,
    metalness: 0.25,
    roughness: 0.08,
    transmission: 0.72,
    weights: [0.45, 0.35, 1],
    spread: 3.5,
    speed: 0.42,
    dust: 1.45,
  },
];

/** Stato interpolato, riusato ogni frame per non allocare. */
export type BlendedWorld = {
  color: THREE.Color;
  light: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
  metalness: number;
  roughness: number;
  transmission: number;
  weights: [number, number, number];
  spread: number;
  speed: number;
  dust: number;
};

export const blended: BlendedWorld = {
  color: new THREE.Color(),
  light: new THREE.Color(),
  fog: new THREE.Color(),
  fogDensity: 0.05,
  metalness: 0,
  roughness: 0.5,
  transmission: 0,
  weights: [1, 0, 0],
  spread: 4,
  speed: 0.5,
  dust: 1,
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Miscela i due mondi adiacenti a `index` (frazionario) dentro `blended`.
 * Nessuna allocazione: viene chiamata a ogni fotogramma.
 */
export function blendWorlds(index: number): BlendedWorld {
  const clamped = Math.max(0, Math.min(WORLDS.length - 1, index));
  const i = Math.floor(clamped);
  const j = Math.min(WORLDS.length - 1, i + 1);
  const t = clamped - i;
  const A = WORLDS[i];
  const B = WORLDS[j];

  blended.color.copy(A.color).lerp(B.color, t);
  blended.light.copy(A.light).lerp(B.light, t);
  blended.fog.copy(A.fog).lerp(B.fog, t);
  blended.fogDensity = mix(A.fogDensity, B.fogDensity, t);
  blended.metalness = mix(A.metalness, B.metalness, t);
  blended.roughness = mix(A.roughness, B.roughness, t);
  blended.transmission = mix(A.transmission, B.transmission, t);
  blended.weights[0] = mix(A.weights[0], B.weights[0], t);
  blended.weights[1] = mix(A.weights[1], B.weights[1], t);
  blended.weights[2] = mix(A.weights[2], B.weights[2], t);
  blended.spread = mix(A.spread, B.spread, t);
  blended.speed = mix(A.speed, B.speed, t);
  blended.dust = mix(A.dust, B.dust, t);
  return blended;
}
