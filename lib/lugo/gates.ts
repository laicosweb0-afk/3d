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
