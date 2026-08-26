'use client';

// Arredo urbano instanziato: alberi nelle aree verdi, lampioni accesi lungo
// le strade principali. Matrici scritte una volta sola: quattro draw call
// in tutto, zero costo per frame.

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMondo, type MondoLugo } from '@/lib/lugo/loadMap';

const MAX_ALBERI = 420;
const MAX_LAMPIONI = 260;

function dentroPoligono(x: number, z: number, poly: Float32Array): boolean {
  let dentro = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const zi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const zj = poly[j * 2 + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
}

function rand01(seme: { s: number }): number {
  seme.s = (seme.s * 1664525 + 1013904223) >>> 0;
  return seme.s / 4294967296;
}

interface Posa {
  x: number;
  z: number;
  scala: number;
  rot: number;
}

function calcolaAlberi(mondo: MondoLugo): Posa[] {
  const seme = { s: 4242 };
  const out: Posa[] = [];
  for (const area of mondo.aree) {
    if (area.kind !== 'verde') continue;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < area.poly.length; i += 2) {
      minX = Math.min(minX, area.poly[i]);
      maxX = Math.max(maxX, area.poly[i]);
      minZ = Math.min(minZ, area.poly[i + 1]);
      maxZ = Math.max(maxZ, area.poly[i + 1]);
    }
    const passo = 15;
    for (let x = minX + passo / 2; x < maxX; x += passo) {
      for (let z = minZ + passo / 2; z < maxZ; z += passo) {
        if (out.length >= MAX_ALBERI) return out;
        if (rand01(seme) > 0.55) continue;
        const jx = x + (rand01(seme) - 0.5) * 9;
        const jz = z + (rand01(seme) - 0.5) * 9;
        if (!dentroPoligono(jx, jz, area.poly)) continue;
        out.push({ x: jx, z: jz, scala: 0.8 + rand01(seme) * 0.7, rot: rand01(seme) * Math.PI * 2 });
      }
    }
  }
  return out;
}

function calcolaLampioni(mondo: MondoLugo): Posa[] {
  const out: Posa[] = [];
  let lato = 1;
  for (const r of mondo.roads) {
    if (r.classe !== 'primaria' && r.classe !== 'secondaria') continue;
    let residuo = 0;
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      const ax = r.pts[i];
      const az = r.pts[i + 1];
      const dx = r.pts[i + 2] - ax;
      const dz = r.pts[i + 3] - az;
      const L = Math.hypot(dx, dz);
      if (L < 0.01) continue;
      const ux = dx / L;
      const uz = dz / L;
      let s = residuo;
      while (s < L) {
        if (out.length >= MAX_LAMPIONI) return out;
        const px = ax + ux * s;
        const pz = az + uz * s;
        const off = (r.larghezza / 2 + 0.9) * lato;
        out.push({ x: px - uz * off, z: pz + ux * off, scala: 1, rot: Math.atan2(uz, ux) });
        lato = -lato;
        s += 34;
      }
      residuo = 0;
    }
  }
  return out;
}

export function Props() {
  const mondo = useMondo();
  const alberi = useMemo(() => calcolaAlberi(mondo), [mondo]);
  const lampioni = useMemo(() => calcolaLampioni(mondo), [mondo]);

  const tronchi = useRef<THREE.InstancedMesh>(null);
  const chiome = useRef<THREE.InstancedMesh>(null);
  const pali = useRef<THREE.InstancedMesh>(null);
  const luci = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const su = new THREE.Vector3(0, 1, 0);
    alberi.forEach((a, i) => {
      q.setFromAxisAngle(su, a.rot);
      m.compose(new THREE.Vector3(a.x, 1.1 * a.scala, a.z), q, new THREE.Vector3(a.scala, a.scala, a.scala));
      tronchi.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(a.x, 3.4 * a.scala, a.z), q, new THREE.Vector3(a.scala, a.scala, a.scala));
      chiome.current?.setMatrixAt(i, m);
    });
    lampioni.forEach((l, i) => {
      q.setFromAxisAngle(su, l.rot);
      m.compose(new THREE.Vector3(l.x, 2.4, l.z), q, new THREE.Vector3(1, 1, 1));
      pali.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(l.x, 4.85, l.z), q, new THREE.Vector3(1, 1, 1));
      luci.current?.setMatrixAt(i, m);
    });
    for (const ref of [tronchi, chiome, pali, luci]) {
      if (ref.current) {
        ref.current.count = ref === tronchi || ref === chiome ? alberi.length : lampioni.length;
        ref.current.instanceMatrix.needsUpdate = true;
      }
    }
  }, [alberi, lampioni]);

  return (
    <group>
      <instancedMesh ref={tronchi} args={[undefined, undefined, MAX_ALBERI]} frustumCulled={false}>
        <cylinderGeometry args={[0.18, 0.26, 2.2, 6]} />
        <meshLambertMaterial color="#6E5537" />
      </instancedMesh>
      <instancedMesh ref={chiome} args={[undefined, undefined, MAX_ALBERI]} frustumCulled={false} castShadow>
        <coneGeometry args={[1.9, 4.4, 7]} />
        <meshLambertMaterial color="#4E7A3C" />
      </instancedMesh>
      <instancedMesh ref={pali} args={[undefined, undefined, MAX_LAMPIONI]} frustumCulled={false}>
        <cylinderGeometry args={[0.07, 0.1, 4.8, 6]} />
        <meshLambertMaterial color="#3E3B44" />
      </instancedMesh>
      <instancedMesh ref={luci} args={[undefined, undefined, MAX_LAMPIONI]} frustumCulled={false}>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshLambertMaterial color="#FFE9A8" emissive="#FFD98A" emissiveIntensity={1.8} />
      </instancedMesh>
    </group>
  );
}
