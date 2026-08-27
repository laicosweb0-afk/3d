'use client';

// Arredo urbano instanziato: alberi nelle aree verdi, lampioni accesi lungo
// le strade principali. Matrici scritte una volta sola: quattro draw call
// in tutto, zero costo per frame.

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMondo, type MondoLugo } from '@/lib/lugo/loadMap';
import { rettangoloMinimo } from '@/lib/lugo/gates';

const MAX_ALBERI = 1300;
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

  // il verde nascosto dei cortili: nelle viste aeree ogni isolato ha i suoi
  // alberi. La corte del Pavaglione però resta vuota, com'è davvero;
  // quella della Rocca è il giardino pensile e ne merita un boschetto.
  for (const b of mondo.buildings) {
    if (b.landmark === 'pavaglione') continue;
    for (const foro of b.fori) {
      if (out.length >= MAX_ALBERI - 350) break;
      const n = foro.length / 2;
      let cx = 0, cz = 0;
      for (let i = 0; i < n; i++) {
        cx += foro[i * 2];
        cz += foro[i * 2 + 1];
      }
      cx /= n;
      cz /= n;
      let area = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += foro[i * 2] * foro[j * 2 + 1] - foro[j * 2] * foro[i * 2 + 1];
      }
      area = Math.abs(area / 2);
      if (area < 45) continue;
      const quanti = b.landmark === 'rocca' ? 8 : area > 220 ? 3 : area > 90 ? 2 : 1;
      for (let k = 0; k < quanti; k++) {
        const jx = cx + (rand01(seme) - 0.5) * Math.sqrt(area) * 0.5;
        const jz = cz + (rand01(seme) - 0.5) * Math.sqrt(area) * 0.5;
        if (!dentroPoligono(jx, jz, foro)) continue;
        out.push({ x: jx, z: jz, scala: 0.75 + rand01(seme) * 0.6, rot: rand01(seme) * Math.PI * 2 });
      }
    }
  }

  // i giardini delle case: dall'alto ogni villetta ha il suo albero dietro
  let giardini = 0;
  for (const b of mondo.buildings) {
    if (giardini >= 340 || out.length >= MAX_ALBERI - 420) break;
    if (b.landmark || !b.falde || b.fori.length) continue;
    if (rand01(seme) > 0.24) continue;
    let area = 0;
    const nf = b.fp.length / 2;
    for (let i = 0; i < nf; i++) {
      const j = (i + 1) % nf;
      area += b.fp[i * 2] * b.fp[j * 2 + 1] - b.fp[j * 2] * b.fp[i * 2 + 1];
    }
    area = Math.abs(area / 2);
    if (area < 60 || area > 320) continue;
    const r = rettangoloMinimo(b.fp);
    const lato = rand01(seme) < 0.5 ? 1 : -1;
    const vx = -Math.sin(r.angle) * lato;
    const vz = Math.cos(r.angle) * lato;
    const ux = Math.cos(r.angle);
    const uz = Math.sin(r.angle);
    const scosta = (rand01(seme) - 0.5) * r.hw;
    out.push({
      x: r.cx + vx * (r.hd + 3.4) + ux * scosta,
      z: r.cz + vz * (r.hd + 3.4) + uz * scosta,
      scala: 0.7 + rand01(seme) * 0.6,
      rot: rand01(seme) * Math.PI * 2,
    });
    giardini++;
  }

  // i viali alberati regolari lungo le strade principali
  for (const r of mondo.roads) {
    if (r.classe !== 'primaria') continue;
    let lato = 1;
    for (let i = 0; i + 3 < r.pts.length && out.length < MAX_ALBERI - 200; i += 2) {
      const ax = r.pts[i];
      const az = r.pts[i + 1];
      const dx = r.pts[i + 2] - ax;
      const dz = r.pts[i + 3] - az;
      const L = Math.hypot(dx, dz);
      if (L < 12) continue;
      const ux = dx / L;
      const uz = dz / L;
      for (let s = 8; s < L; s += 26) {
        lato = -lato;
        if (rand01(seme) > 0.8) continue;
        const off = (r.larghezza / 2 + 2.4) * lato;
        out.push({
          x: ax + ux * s - uz * off,
          z: az + uz * s + ux * off,
          scala: 0.85 + rand01(seme) * 0.4,
          rot: rand01(seme) * Math.PI * 2,
        });
      }
    }
  }

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
  const globi = useRef<THREE.InstancedMesh>(null);

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
    let nGlobi = 0;
    lampioni.forEach((l, i) => {
      q.setFromAxisAngle(su, l.rot);
      m.compose(new THREE.Vector3(l.x, 2.4, l.z), q, new THREE.Vector3(1, 1, 1));
      pali.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(l.x, 4.85, l.z), q, new THREE.Vector3(1, 1, 1));
      luci.current?.setMatrixAt(i, m);
      // in centro storico il lampione è a candelabro: due globi laterali
      if (Math.hypot(l.x, l.z) < 260 && globi.current) {
        const px = -Math.sin(l.rot) * 0.48;
        const pz = Math.cos(l.rot) * 0.48;
        m.compose(new THREE.Vector3(l.x + px, 4.55, l.z + pz), q, new THREE.Vector3(1, 1, 1));
        globi.current.setMatrixAt(nGlobi++, m);
        m.compose(new THREE.Vector3(l.x - px, 4.55, l.z - pz), q, new THREE.Vector3(1, 1, 1));
        globi.current.setMatrixAt(nGlobi++, m);
      }
    });
    for (const ref of [tronchi, chiome, pali, luci, globi]) {
      if (ref.current) {
        ref.current.count =
          ref === tronchi || ref === chiome
            ? alberi.length
            : ref === globi
              ? nGlobi
              : lampioni.length;
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
      <instancedMesh ref={globi} args={[undefined, undefined, MAX_LAMPIONI * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.17, 8, 6]} />
        <meshLambertMaterial color="#FFE9A8" emissive="#FFD98A" emissiveIntensity={1.6} />
      </instancedMesh>
    </group>
  );
}
