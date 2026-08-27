'use client';

// Le luminarie della festa: filari di lucine calde appese a catenaria
// sulle vie pedonali del centro, attorno al Pavaglione. Un solo
// InstancedMesh emissivo per tutte le lampadine.

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';

const MAX_LUCI = 520;
const LUCI_PER_FILO = 11;
const ALTEZZA = 4.6;
const CADUTA = 0.75;

export function Festa() {
  const mondo = useMondo();

  const luci = useMemo(() => {
    const p = mondo.poi.get('pavaglione');
    if (!p) return [];
    const out: [number, number, number][] = [];
    for (const r of mondo.roads) {
      if (r.classe !== 'pedonale') continue;
      const pts = r.pts;
      for (let i = 0; i + 3 < pts.length && out.length < MAX_LUCI; i += 2) {
        const ax = pts[i];
        const az = pts[i + 1];
        const bx = pts[i + 2];
        const bz = pts[i + 3];
        const mx = (ax + bx) / 2;
        const mz = (az + bz) / 2;
        if (Math.hypot(mx - p.xm, mz - p.zm) > 150) continue;
        const dx = bx - ax;
        const dz = bz - az;
        const L = Math.hypot(dx, dz);
        if (L < 8) continue;
        const ux = dx / L;
        const uz = dz / L;
        // un filo ogni ~13 m, teso di traverso alla via
        for (let s = 6; s + 4 < L && out.length < MAX_LUCI; s += 13) {
          const cx = ax + ux * s;
          const cz = az + uz * s;
          const px = -uz;
          const pz = ux;
          const meta = r.larghezza / 2 + 1.6;
          for (let k = 0; k < LUCI_PER_FILO; k++) {
            const t = k / (LUCI_PER_FILO - 1);
            const lx = cx + px * meta * (t * 2 - 1);
            const lz = cz + pz * meta * (t * 2 - 1);
            // catenaria approssimata con la parabola
            const ly = ALTEZZA - CADUTA * (1 - (t * 2 - 1) ** 2);
            out.push([lx, ly, lz]);
          }
        }
      }
    }
    return out;
  }, [mondo]);

  const mesh = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const m = new THREE.Matrix4();
    luci.forEach(([x, y, z], i) => {
      m.makeTranslation(x, y, z);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.count = luci.length;
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [luci]);

  if (!luci.length) return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, Math.max(1, luci.length)]} frustumCulled={false}>
      <sphereGeometry args={[0.09, 6, 4]} />
      <meshLambertMaterial color="#FFE9B0" emissive="#FFD98A" emissiveIntensity={2.2} />
    </instancedMesh>
  );
}
