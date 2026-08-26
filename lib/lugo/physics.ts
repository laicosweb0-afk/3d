// Fisica 2D del mondo (Lugo è in pianura): spatial hash dei collider degli
// edifici, collisione cerchio-vs-OBB e cerchio-vs-segmento con risoluzione
// a scivolamento. Nessuna libreria: deterministico, leggero, testabile.

import type { MondoLugo, ColliderRT } from './loadMap';

const CELLA = 16; // metri

export class MondoFisico {
  private hash = new Map<number, ColliderRT[]>();
  private minX: number;
  private minZ: number;
  private cols: number;

  constructor(mondo: MondoLugo) {
    this.minX = mondo.bounds.minX - 64;
    this.minZ = mondo.bounds.minZ - 64;
    this.cols = Math.ceil((mondo.bounds.maxX + 128 - this.minX) / CELLA);
    for (const b of mondo.buildings) this.inserisci(b.collider);
  }

  private chiave(cx: number, cz: number): number {
    return cz * this.cols + cx;
  }

  private inserisci(c: ColliderRT) {
    const x0 = Math.floor((c.minX - this.minX) / CELLA);
    const x1 = Math.floor((c.maxX - this.minX) / CELLA);
    const z0 = Math.floor((c.minZ - this.minZ) / CELLA);
    const z1 = Math.floor((c.maxZ - this.minZ) / CELLA);
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const k = this.chiave(x, z);
        let cella = this.hash.get(k);
        if (!cella) {
          cella = [];
          this.hash.set(k, cella);
        }
        cella.push(c);
      }
    }
  }

  /** Collider potenzialmente vicini a (x,z) entro raggio r. */
  vicini(x: number, z: number, r: number): ColliderRT[] {
    const out: ColliderRT[] = [];
    const visti = new Set<ColliderRT>();
    const x0 = Math.floor((x - r - this.minX) / CELLA);
    const x1 = Math.floor((x + r - this.minX) / CELLA);
    const z0 = Math.floor((z - r - this.minZ) / CELLA);
    const z1 = Math.floor((z + r - this.minZ) / CELLA);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cella = this.hash.get(this.chiave(cx, cz));
        if (!cella) continue;
        for (const c of cella) {
          if (!visti.has(c)) {
            visti.add(c);
            out.push(c);
          }
        }
      }
    }
    return out;
  }

  /**
   * Spinge fuori un cerchio (x,z,r) da tutti i collider vicini.
   * Ritorna [nx, nz, penetrazione] dell'ultimo contatto (o null) e
   * scrive la posizione corretta in `out`.
   */
  risolviCerchio(x: number, z: number, r: number, out: { x: number; z: number }): [number, number] | null {
    let px = x;
    let pz = z;
    let contatto: [number, number] | null = null;
    for (const c of this.vicini(x, z, r + 2)) {
      if (c.tipo === 'obb') {
        // porta il punto nello spazio dell'OBB
        const dx = px - c.cx;
        const dz = pz - c.cz;
        const lx = dx * c.cos + dz * c.sin;
        const lz = -dx * c.sin + dz * c.cos;
        const qx = Math.max(-c.hw, Math.min(c.hw, lx));
        const qz = Math.max(-c.hd, Math.min(c.hd, lz));
        let ddx = lx - qx;
        let ddz = lz - qz;
        let dist = Math.hypot(ddx, ddz);
        if (dist === 0) {
          // centro dentro l'OBB: esci dal lato più vicino
          const ex = c.hw - Math.abs(lx);
          const ez = c.hd - Math.abs(lz);
          if (ex < ez) {
            ddx = lx >= 0 ? 1 : -1;
            ddz = 0;
            dist = -ex;
          } else {
            ddx = 0;
            ddz = lz >= 0 ? 1 : -1;
            dist = -ez;
          }
        }
        if (dist < r) {
          const l = Math.hypot(ddx, ddz) || 1;
          const nxl = ddx / l;
          const nzl = ddz / l;
          // normale di nuovo in spazio mondo
          const nx = nxl * c.cos - nzl * c.sin;
          const nz = nxl * c.sin + nzl * c.cos;
          const pen = r - dist;
          px += nx * pen;
          pz += nz * pen;
          contatto = [nx, nz];
        }
      } else if (c.segs) {
        for (let i = 0; i < c.segs.length; i += 4) {
          const ax = c.segs[i];
          const az = c.segs[i + 1];
          const bx = c.segs[i + 2];
          const bz = c.segs[i + 3];
          const abx = bx - ax;
          const abz = bz - az;
          const len2 = abx * abx + abz * abz || 1;
          const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / len2));
          const qx = ax + abx * t;
          const qz = az + abz * t;
          let dx = px - qx;
          let dz = pz - qz;
          const dist = Math.hypot(dx, dz);
          if (dist < r && dist > 1e-6) {
            dx /= dist;
            dz /= dist;
            const pen = r - dist;
            px += dx * pen;
            pz += dz * pen;
            contatto = [dx, dz];
          }
        }
      }
    }
    out.x = px;
    out.z = pz;
    return contatto;
  }

  /** True se un cerchio in (x,z) non tocca nulla: per lo spawn di discesa. */
  cerchioLibero(x: number, z: number, r: number): boolean {
    const out = { x, z };
    return this.risolviCerchio(x, z, r, out) === null;
  }
}
