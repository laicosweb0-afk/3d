// I varchi del Pavaglione: il quadriportico vero ha gli ingressi al centro
// dei lati. Qui si calcolano i 4 punti-varco dal rettangolo orientato
// minimo del footprint; loadMap li usa per APRIRE il collider (niente muro
// lì) e Landmarks per non disegnare pannelli di parete in corrispondenza.

/** Rettangolo orientato minimo (hull + rotating calipers), in metri. */
export function rettangoloMinimo(fp: Float32Array): {
  cx: number;
  cz: number;
  hw: number;
  hd: number;
  angle: number;
} {
  const pts: [number, number][] = [];
  for (let i = 0; i < fp.length; i += 2) pts.push([fp[i], fp[i + 1]]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);
  let best = { area: Infinity, cx: 0, cz: 0, hw: 0, hd: 0, angle: 0 };
  for (let i = 0; i < hull.length; i++) {
    const [ax, az] = hull[i];
    const [bx, bz] = hull[(i + 1) % hull.length];
    const angle = Math.atan2(bz - az, bx - ax);
    const c = Math.cos(-angle);
    const s = Math.sin(-angle);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of hull) {
      const rx = x * c - z * s;
      const rz = x * s + z * c;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (rz < minZ) minZ = rz;
      if (rz > maxZ) maxZ = rz;
    }
    const area = (maxX - minX) * (maxZ - minZ);
    if (area < best.area) {
      const mx = (minX + maxX) / 2;
      const mz = (minZ + maxZ) / 2;
      const cb = Math.cos(angle);
      const sb = Math.sin(angle);
      best = {
        area,
        cx: mx * cb - mz * sb,
        cz: mx * sb + mz * cb,
        hw: (maxX - minX) / 2,
        hd: (maxZ - minZ) / 2,
        angle,
      };
    }
  }
  return best;
}

/** I 4 punti al centro dei lati del rettangolo minimo del footprint. */
export function puntiVarco(fp: Float32Array): [number, number][] {
  const r = rettangoloMinimo(fp);
  const c = Math.cos(r.angle);
  const s = Math.sin(r.angle);
  return [
    [r.cx + c * r.hw, r.cz + s * r.hw],
    [r.cx - c * r.hw, r.cz - s * r.hw],
    [r.cx - s * r.hd, r.cz + c * r.hd],
    [r.cx + s * r.hd, r.cz - c * r.hd],
  ];
}

export const RAGGIO_VARCO = 5;

export function vicinoAVarco(x: number, z: number, varchi: [number, number][], raggio = RAGGIO_VARCO): boolean {
  for (const [vx, vz] of varchi) {
    if (Math.hypot(x - vx, z - vz) < raggio) return true;
  }
  return false;
}

// ── I corridoi dei varchi ───────────────────────────────────────────────────
// Aprire il muro «se il punto medio del segmento è vicino al varco» ha due
// modi di sbagliare, e nel Pavaglione vero li faceva entrambi: un lato di
// 110 m col punto medio proprio davanti al portale spariva PER INTERO dal
// collider (si camminava attraverso la facciata), mentre il muro della
// corte — che sta a 15-24 m dal varco, ben oltre RAGGIO_VARCO — non si
// apriva mai, e la corte restava sigillata: si entrava sotto la loggia e lì
// finiva la passeggiata. Qui il varco diventa un CORRIDOIO rettangolare che
// parte fuori dalla facciata e sfonda fino a dentro la corte: i segmenti
// (di muro o di collider) si TAGLIANO dove lo attraversano, qualunque sia
// la loro lunghezza, e tutto il resto rimane solido.

/** Mezza larghezza del passaggio: sta tra le lesene binate del portale. */
export const MEZZA_VARCO = 2.6;
/** Quanto il corridoio sporge fuori dalla facciata (il muro vero può stare
 *  fino a ~2 m dentro il rettangolo minimo). */
const FUORI_VARCO = 3;
/** Quanto il corridoio entra nella corte oltre il muro interno. */
const DENTRO_CORTE = 4;

export interface CorridoioVarco {
  /** Origine (sul lato del rettangolo minimo, spostata verso l'esterno). */
  x: number;
  z: number;
  /** Direzione unitaria verso la corte. */
  dx: number;
  dz: number;
  lunghezza: number;
  mezza: number;
}

/** Prima intersezione del raggio (x,z)+t·(dx,dz) con l'anello, o null. */
function primoIncrocio(x: number, z: number, dx: number, dz: number, anello: Float32Array): number | null {
  let best: number | null = null;
  const n = anello.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = anello[i * 2];
    const az = anello[i * 2 + 1];
    const bx = anello[j * 2];
    const bz = anello[j * 2 + 1];
    const ex = bx - ax;
    const ez = bz - az;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - x) * ez - (az - z) * ex) / den;
    const u = ((ax - x) * dz - (az - z) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1 && (best === null || t < best)) best = t;
  }
  return best;
}

/**
 * I quattro corridoi del Pavaglione: uno per varco, dal marciapiede alla
 * corte. La profondità si misura sul FORO vero (il muro interno non è alla
 * stessa distanza su tutti i lati); senza corte si sfonda fino a metà del
 * lato corto, che di un chiostro raggiunge sempre il vuoto centrale.
 */
export function corridoiVarco(fp: Float32Array, corte?: Float32Array | null): CorridoioVarco[] {
  const r = rettangoloMinimo(fp);
  const c = Math.cos(r.angle);
  const s = Math.sin(r.angle);
  const varchi = puntiVarco(fp);
  const dirs: [number, number][] = [
    [-c, -s],
    [c, s],
    [s, -c],
    [-s, c],
  ];
  return varchi.map(([vx, vz], i) => {
    const [dx, dz] = dirs[i];
    let fondo = Math.min(r.hw, r.hd);
    if (corte && corte.length >= 6) {
      const t = primoIncrocio(vx, vz, dx, dz, corte);
      if (t !== null) fondo = t;
    }
    return {
      x: vx - dx * FUORI_VARCO,
      z: vz - dz * FUORI_VARCO,
      dx,
      dz,
      lunghezza: FUORI_VARCO + fondo + DENTRO_CORTE,
      mezza: MEZZA_VARCO,
    };
  });
}

/** True se il punto cade in uno dei corridoi, allargati di `margine`. */
export function dentroCorridoio(x: number, z: number, corridoi: CorridoioVarco[], margine = 0): boolean {
  for (const k of corridoi) {
    const px = x - k.x;
    const pz = z - k.z;
    const lungo = px * k.dx + pz * k.dz;
    if (lungo < -margine || lungo > k.lunghezza + margine) continue;
    const lato = px * -k.dz + pz * k.dx;
    if (Math.abs(lato) <= k.mezza + margine) return true;
  }
  return false;
}

/**
 * Spezza il segmento sui corridoi: `fuori` sono i tratti che restano muro
 * (o collider), `dentro` quelli che attraversano un passaggio. Entrambi
 * come intervalli [t0,t1] del parametro del segmento, in ordine; i ritagli
 * più corti di un centimetro si scartano, non disegnano niente.
 */
export function spezzaConVarchi(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  corridoi: CorridoioVarco[],
): { fuori: [number, number][]; dentro: [number, number][] } {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const minT = L > 0 ? 0.01 / L : 0;
  // intervalli del segmento DENTRO ciascun corridoio (clipping ai due
  // semipiani per asse: il corridoio è convesso, l'intersezione è un
  // intervallo solo)
  const occupati: [number, number][] = [];
  for (const k of corridoi) {
    const nx = -k.dz;
    const nz = k.dx;
    const a0 = (x1 - k.x) * k.dx + (z1 - k.z) * k.dz;
    const a1 = (x2 - k.x) * k.dx + (z2 - k.z) * k.dz;
    const b0 = (x1 - k.x) * nx + (z1 - k.z) * nz;
    const b1 = (x2 - k.x) * nx + (z2 - k.z) * nz;
    let t0 = 0;
    let t1 = 1;
    const stringi = (v0: number, v1: number, lo: number, hi: number): boolean => {
      const dv = v1 - v0;
      if (Math.abs(dv) < 1e-12) return v0 >= lo && v0 <= hi;
      let ta = (lo - v0) / dv;
      let tb = (hi - v0) / dv;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      return t0 < t1;
    };
    if (!stringi(a0, a1, 0, k.lunghezza)) continue;
    if (!stringi(b0, b1, -k.mezza, k.mezza)) continue;
    if (t1 - t0 > 1e-9) occupati.push([t0, t1]);
  }
  occupati.sort((a, b) => a[0] - b[0]);
  // unione degli occupati, poi complemento su [0,1]
  const dentro: [number, number][] = [];
  for (const [t0, t1] of occupati) {
    const ultimo = dentro[dentro.length - 1];
    if (ultimo && t0 <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], t1);
    else dentro.push([t0, t1]);
  }
  const fuori: [number, number][] = [];
  let cursore = 0;
  for (const [t0, t1] of dentro) {
    if (t0 - cursore > minT) fuori.push([cursore, t0]);
    cursore = Math.max(cursore, t1);
  }
  if (1 - cursore > minT) fuori.push([cursore, 1]);
  return { fuori, dentro: dentro.filter(([t0, t1]) => t1 - t0 > minT) };
}
