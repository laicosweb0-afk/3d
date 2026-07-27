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

  /* ---- fisica del mondo: non cambiano solo i colori ---- */
  /** Deriva verticale della materia: negativa = cade, positiva = sale. */
  gravity: number;
  /** Deriva orizzontale: il vento di questo mondo. */
  wind: number;
  /** Quanto il moto è irregolare: 0 = corpi calmi, 1 = agitati. */
  turbulence: number;

  /* ---- regia della camera: ogni mondo si guarda in un modo diverso ---- */
  /** Distanza della camera dal centro. */
  camRadius: number;
  /** Altezza della camera. */
  camHeight: number;
  /** Quanto la camera oscilla da sola (galleggiamento). */
  camFloat: number;
  /** Velocità con cui la camera raggiunge la posizione voluta: bassa = pesante. */
  camLag: number;
  /** Scatti meccanici invece di moto continuo (Mondial). */
  camStep: number;
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
    gravity: -0.5,
    wind: 0.1,
    turbulence: 0.15,
    // più vicina delle altre: la cassetta è l'oggetto più basso della serie e
    // da lontano il marchio sulla targa diventava illeggibile
    camRadius: 7.3,
    camHeight: 0.6,
    camFloat: 0.35,
    camLag: 2.4,
    camStep: 0,
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
    gravity: -0.2,
    wind: 0.25,
    turbulence: 0.2,
    camRadius: 8,
    camHeight: 0.9,
    camFloat: 0.5,
    camLag: 1.7,
    camStep: 0,
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
    gravity: -1.4,
    wind: 0.05,
    turbulence: 0.9,
    camRadius: 9.4,
    camHeight: 1.9,
    camFloat: 0.08,
    camLag: 6.5,
    camStep: 1,
  },
  // 04 — AureaClub: vetro nero e oro satinato, luce morbida.
  //
  // È l'unica stanza in cui la materia generica quasi sparisce: qui il mondo
  // sono i nodi e le connessioni di three/Aurea.tsx, e lasciare anche gocce e
  // schegge in giro era proprio ciò che la rendeva uguale a tutte le altre.
  // I pesi bassi non la svuotano, le fanno spazio.
  {
    id: 'aurea',
    color: c('#c9a25f'),
    light: c('#f3dcae'),
    fog: c('#04040a'),
    // nebbia più densa: il nero attorno diventa profondità, non fondale
    fogDensity: 0.085,
    metalness: 0.9,
    roughness: 0.1,
    transmission: 0.35,
    weights: [0.05, 0.14, 0.04],
    spread: 5.6,
    speed: 0.3,
    dust: 0.5,
    gravity: 0.08,
    wind: 0.12,
    turbulence: 0.05,
    // orbita stretta e lenta: si guarda da vicino, come uno strumento
    camRadius: 6.6,
    camHeight: 0.35,
    camFloat: 0.22,
    camLag: 2.2,
    camStep: 0,
  },
  // 05 — LOEWE × Jacob & Co: cromo e nero notte. Materia lucida e fredda,
  // camera che scivola lenta e bassa, come da un tender in movimento.
  {
    id: 'loewe',
    color: c('#cfd4da'),
    light: c('#dfe8f5'),
    fog: c('#050608'),
    fogDensity: 0.062,
    metalness: 1,
    roughness: 0.06,
    transmission: 0,
    weights: [0.3, 1, 0.45],
    spread: 4.4,
    speed: 0.34,
    dust: 0.7,
    gravity: 0.08,
    wind: 0.5,
    turbulence: 0.06,
    camRadius: 8.8,
    camHeight: 0.35,
    camFloat: 0.55,
    camLag: 1.5,
    camStep: 0,
  },
  // 06 — Woman Beauty Center: magenta e nero, luce netta.
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
    gravity: 0.35,
    wind: 0.18,
    turbulence: 0.1,
    camRadius: 8.2,
    camHeight: 1.4,
    camFloat: 0.85,
    camLag: 1.3,
    camStep: 0,
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
  gravity: number;
  wind: number;
  turbulence: number;
  camRadius: number;
  camHeight: number;
  camFloat: number;
  camLag: number;
  camStep: number;
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
  gravity: 0,
  wind: 0,
  turbulence: 0.2,
  camRadius: 8.4,
  camHeight: 1,
  camFloat: 0.3,
  camLag: 3,
  camStep: 0,
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
  blended.gravity = mix(A.gravity, B.gravity, t);
  blended.wind = mix(A.wind, B.wind, t);
  blended.turbulence = mix(A.turbulence, B.turbulence, t);
  blended.camRadius = mix(A.camRadius, B.camRadius, t);
  blended.camHeight = mix(A.camHeight, B.camHeight, t);
  blended.camFloat = mix(A.camFloat, B.camFloat, t);
  blended.camLag = mix(A.camLag, B.camLag, t);
  blended.camStep = mix(A.camStep, B.camStep, t);
  return blended;
}
