// Texture procedurali dei materiali-firma Mondial Service (M2).
// Generate a runtime su canvas: nessun asset di rete, un solo costo una
// tantum al mount. Tarate sulle fotografie reali dei lavori (calacatta,
// marquina, rovere, pietra a spacco). In produzione potranno essere
// sostituite da fotografie/scan senza toccare i materiali che le usano.

import * as THREE from 'three';

const SIZE = 512;

// ---- value noise + fbm minimali ----
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h: number, x: number, y: number) =>
    ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(
      l(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      l(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  };
}

function fbmFactory(seed: number, octaves = 4) {
  const n = makeNoise(seed);
  return (x: number, y: number): number => {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += n(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return sum / norm; // ~[-1,1]
  };
}

function toTexture(canvas: HTMLCanvasElement, repeat: [number, number]): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function paint(
  fill: (x: number, y: number) => [number, number, number]
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);
  const d = img.data;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = fill(x / SIZE, y / SIZE);
      const i = (y * SIZE + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Marmo: base + vene sottili ottenute da fbm "ridged" distorto. */
function marble(
  base: [number, number, number],
  vein: [number, number, number],
  seed: number,
  veinSharpness: number,
  veinDensity: number
): HTMLCanvasElement {
  const f1 = fbmFactory(seed, 5);
  const f2 = fbmFactory(seed + 7, 3);
  return paint((x, y) => {
    const warp = f2(x * 3, y * 3) * 0.9;
    const v = Math.abs(Math.sin((x * veinDensity + y * 1.7 + warp * 2.2) * Math.PI + f1(x * 5, y * 5) * 3.2));
    const veinMask = Math.pow(1 - v, veinSharpness);
    const cloud = f1(x * 2.4, y * 2.4) * 0.06;
    return [0, 1, 2].map((i) =>
      Math.round(clamp(mix(base[i] * (1 + cloud), vein[i], clamp(veinMask, 0, 1)), 0, 255))
    ) as [number, number, number];
  });
}

/** Rovere: doghe verticali con venatura fine e stacco tra le doghe. */
function oak(seed: number): HTMLCanvasElement {
  const f = fbmFactory(seed, 4);
  const planks = 6;
  return paint((x, y) => {
    const plank = Math.floor(x * planks);
    const px = x * planks - plank;
    const hueShift = makeNoise(seed + plank)(plank * 3.1, 0.5) * 10;
    const grain = f(x * 40, y * 3 + plank * 9) * 0.5 + Math.sin(y * 260 + f(x * 6, y * 2) * 14 + plank * 5) * 0.06;
    const gap = px < 0.02 || px > 0.98 ? -26 : 0;
    const r = clamp(163 + hueShift + grain * 26 + gap, 0, 255);
    const g = clamp(132 + hueShift * 0.8 + grain * 22 + gap, 0, 255);
    const b = clamp(101 + hueShift * 0.6 + grain * 18 + gap, 0, 255);
    return [Math.round(r), Math.round(g), Math.round(b)];
  });
}

/** Pietra a spacco: corsi orizzontali di conci con tono variabile. */
function stone(seed: number): HTMLCanvasElement {
  const f = fbmFactory(seed, 4);
  const rowsN = 10;
  const rowNoise = makeNoise(seed + 3);
  return paint((x, y) => {
    const row = Math.floor(y * rowsN);
    const ry = y * rowsN - row;
    // larghezze pseudo-casuali dei conci per corso
    const cell = Math.floor((x + rowNoise(row * 7.3, 0.5) * 0.5) * 5);
    const cx = ((x + rowNoise(row * 7.3, 0.5) * 0.5) * 5) - cell;
    const tone = rowNoise(cell * 13.7, row * 5.1) * 24 + f(x * 9, y * 9) * 14;
    const mortarH = ry < 0.06 || ry > 0.94 ? -38 : 0;
    const mortarV = cx < 0.03 || cx > 0.97 ? -30 : 0;
    const relief = f(x * 26, y * 26) * 9;
    const base = 196;
    const r = clamp(base + tone + relief + mortarH + mortarV, 0, 255);
    const g = clamp(base - 12 + tone * 0.9 + relief + mortarH + mortarV, 0, 255);
    const b = clamp(base - 34 + tone * 0.7 + relief + mortarH + mortarV, 0, 255);
    return [Math.round(r), Math.round(g), Math.round(b)];
  });
}

export interface BrandTextures {
  calacatta: THREE.CanvasTexture;
  marquina: THREE.CanvasTexture;
  rovere: THREE.CanvasTexture;
  pietra: THREE.CanvasTexture;
}

let cache: BrandTextures | null = null;

export function brandTextures(): BrandTextures {
  if (cache) return cache;
  cache = {
    calacatta: toTexture(marble([244, 242, 236], [168, 170, 176], 11, 26, 4.6), [2, 2]),
    marquina: toTexture(marble([20, 20, 23], [172, 170, 165], 23, 34, 5.2), [2, 2]),
    rovere: toTexture(oak(31), [5, 3]),
    pietra: toTexture(stone(47), [2.4, 1.6]),
  };
  return cache;
}
