'use client';

// Le insegne delle botteghe vere di Lugo (nomi da OpenStreetMap): un unico
// atlas CanvasTexture con tutti i nomi, un'unica mesh coi cartelli
// agganciati al muro più vicino, e le tende da sole instanziate sotto.

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMondo, type MondoLugo } from '@/lib/lugo/loadMap';

const TENDE = ['#8A3A30', '#3E6248', '#B89B5E', '#3E5068'];

interface Cartello {
  x: number;
  z: number;
  nx: number;
  nz: number;
  /** Direzione del muro (unità). */
  ex: number;
  ez: number;
  riga: number;
}

function trovaMuri(mondo: MondoLugo): Cartello[] {
  const out: Cartello[] = [];
  for (const negozio of mondo.negozi) {
    let best: Cartello | null = null;
    let bestD = 9;
    for (const b of mondo.buildings) {
      const c = b.collider;
      if (
        negozio.x < c.minX - 10 || negozio.x > c.maxX + 10 ||
        negozio.z < c.minZ - 10 || negozio.z > c.maxZ + 10
      ) {
        continue;
      }
      const fp = b.fp;
      const n = fp.length / 2;
      let cx = 0, cz = 0;
      for (let i = 0; i < n; i++) {
        cx += fp[i * 2];
        cz += fp[i * 2 + 1];
      }
      cx /= n;
      cz /= n;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x1 = fp[i * 2], z1 = fp[i * 2 + 1];
        const x2 = fp[j * 2], z2 = fp[j * 2 + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const L2 = dx * dx + dz * dz;
        if (L2 < 16) continue;
        const t = Math.max(0.12, Math.min(0.88, ((negozio.x - x1) * dx + (negozio.z - z1) * dz) / L2));
        const qx = x1 + dx * t;
        const qz = z1 + dz * t;
        const d = Math.hypot(negozio.x - qx, negozio.z - qz);
        if (d >= bestD) continue;
        const L = Math.sqrt(L2);
        let nx = dz / L;
        let nz = -dx / L;
        if (nx * (qx - cx) + nz * (qz - cz) < 0) {
          nx = -nx;
          nz = -nz;
        }
        bestD = d;
        best = { x: qx, z: qz, nx, nz, ex: dx / L, ez: dz / L, riga: 0 };
      }
    }
    if (best) {
      best.riga = out.length;
      out.push(best);
    }
  }
  return out;
}

export function Insegne() {
  const mondo = useMondo();

  const dati = useMemo(() => {
    if (!mondo.negozi.length || typeof document === 'undefined') return null;
    const cartelli = trovaMuri(mondo);
    if (!cartelli.length) return null;

    // atlas dei nomi: una riga per insegna
    const RIGA = 44;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.max(64, 2 ** Math.ceil(Math.log2(cartelli.length * RIGA)));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2A2430';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    cartelli.forEach((c, i) => {
      const nome = mondo.negozi[i]?.nome ?? '';
      ctx.fillStyle = '#1E1A28';
      ctx.fillRect(0, i * RIGA + 2, 512, RIGA - 4);
      ctx.fillStyle = '#F0E6CE';
      ctx.font = 'bold 26px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(nome.toUpperCase().slice(0, 24), 256, i * RIGA + RIGA / 2);
    });
    const atlas = new THREE.CanvasTexture(canvas);
    atlas.anisotropy = 4;

    // una sola geometria con tutti i cartelli
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    cartelli.forEach((c, i) => {
      const cxp = c.x + c.nx * 0.09;
      const czp = c.z + c.nz * 0.09;
      const hx = c.ex * 1.7;
      const hz = c.ez * 1.7;
      const y0 = 2.75;
      const y1 = 3.3;
      const base = pos.length / 3;
      pos.push(
        cxp - hx, y0, czp - hz,
        cxp + hx, y0, czp + hz,
        cxp + hx, y1, czp + hz,
        cxp - hx, y1, czp - hz,
      );
      const v0 = 1 - ((i + 1) * RIGA) / canvas.height;
      const v1 = 1 - (i * RIGA) / canvas.height;
      uv.push(0, v0, 1, v0, 1, v1, 0, v1);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    return { cartelli, atlas, geo };
  }, [mondo]);

  const tende = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!dati || !tende.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    dati.cartelli.forEach((c, i) => {
      const angolo = Math.atan2(c.ez, c.ex);
      e.set(-0.45, -angolo, 0, 'YXZ');
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(c.x + c.nx * 0.55, 2.5, c.z + c.nz * 0.55), q, new THREE.Vector3(1, 1, 1));
      tende.current!.setMatrixAt(i, m);
      tende.current!.setColorAt(i, col.set(TENDE[i % TENDE.length]));
    });
    tende.current.count = dati.cartelli.length;
    tende.current.instanceMatrix.needsUpdate = true;
    if (tende.current.instanceColor) tende.current.instanceColor.needsUpdate = true;
  }, [dati]);

  if (!dati) return null;

  return (
    <group>
      <mesh geometry={dati.geo}>
        <meshBasicMaterial map={dati.atlas} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={tende} args={[undefined, undefined, Math.max(1, dati.cartelli.length)]} frustumCulled={false}>
        <boxGeometry args={[3.0, 0.05, 1.0]} />
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  );
}
