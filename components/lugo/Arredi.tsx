'use client';

// Gli arredi urbani mappati uno per uno su OpenStreetMap: gli alberi veri
// delle vie, le strisce pedonali orientate sulla strada vera, i semafori,
// le fermate del bus, le fontane. Tutto instanziato o fuso: pochi draw
// call per centinaia di oggetti reali.

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMondo, type MondoLugo } from '@/lib/lugo/loadMap';
import { Accumulo } from '@/lib/lugo/citygen';

/** Direzione e larghezza della strada più vicina (per orientare le strisce). */
function stradaSotto(mondo: MondoLugo, x: number, z: number): { ux: number; uz: number; larghezza: number } | null {
  let bestD = 11;
  let best: { ux: number; uz: number; larghezza: number } | null = null;
  for (const r of mondo.roads) {
    if (r.classe === 'pedonale') continue;
    const pts = r.pts;
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i];
      const az = pts[i + 1];
      if (Math.abs(ax - x) > 70 || Math.abs(az - z) > 70) continue;
      const abx = pts[i + 2] - ax;
      const abz = pts[i + 3] - az;
      const len2 = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / len2));
      const d = Math.hypot(x - (ax + abx * t), z - (az + abz * t));
      if (d < bestD) {
        const L = Math.sqrt(len2);
        bestD = d;
        best = { ux: abx / L, uz: abz / L, larghezza: r.larghezza };
      }
    }
  }
  return best;
}

export function Arredi() {
  const mondo = useMondo();

  const dati = useMemo(() => {
    // la corte del Pavaglione è vuota nelle foto aeree: nessun albero lì
    const pav = mondo.buildings.find((b) => b.landmark === 'pavaglione');
    const dentroPav = (x: number, z: number): boolean => {
      if (!pav) return false;
      const fp = pav.fp;
      const n = fp.length / 2;
      let dentro = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = fp[i * 2], zi = fp[i * 2 + 1];
        const xj = fp[j * 2], zj = fp[j * 2 + 1];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
      }
      return dentro;
    };
    const alberi = mondo.arredi.filter((a) => a.tipo === 'albero' && !dentroPav(a.x, a.z));
    const semafori = mondo.arredi.filter((a) => a.tipo === 'semaforo');
    const bus = mondo.arredi.filter((a) => a.tipo === 'bus');

    // i paletti grigi attorno alle piazze del centro (come ai Martiri)
    const paletti: [number, number][] = [];
    for (const area of mondo.aree) {
      if (area.kind !== 'piazza' || paletti.length >= 260) continue;
      const poly = area.poly;
      const n = poly.length / 2;
      let cx = 0, cz = 0;
      for (let i = 0; i < n; i++) {
        cx += poly[i * 2];
        cz += poly[i * 2 + 1];
      }
      cx /= n;
      cz /= n;
      if (Math.hypot(cx, cz) > 320) continue;
      for (let i = 0; i < n && paletti.length < 260; i++) {
        const j = (i + 1) % n;
        const ax = poly[i * 2];
        const az = poly[i * 2 + 1];
        const dx = poly[j * 2] - ax;
        const dz = poly[j * 2 + 1] - az;
        const L = Math.hypot(dx, dz);
        for (let s = 1.6; s < L && paletti.length < 260; s += 3.2) {
          paletti.push([ax + (dx / L) * s, az + (dz / L) * s]);
        }
      }
    }

    // strisce e fontane: geometria fusa, un draw call
    const acc = new Accumulo();
    const bianco = new THREE.Color('#DAD4C6');
    for (const a of mondo.arredi) {
      if (a.tipo === 'zebre') {
        const s = stradaSotto(mondo, a.x, a.z);
        if (!s) continue;
        const meta = (s.larghezza - 0.8) / 2;
        const px = -s.uz;
        const pz = s.ux;
        for (let k = -2; k <= 2; k++) {
          const cx = a.x + s.ux * k * 0.85;
          const cz = a.z + s.uz * k * 0.85;
          acc.tri(
            cx - px * meta - s.ux * 0.22, 0.285, cz - pz * meta - s.uz * 0.22,
            cx + px * meta - s.ux * 0.22, 0.285, cz + pz * meta - s.uz * 0.22,
            cx + px * meta + s.ux * 0.22, 0.285, cz + pz * meta + s.uz * 0.22,
            0, 1, 0, bianco.r, bianco.g, bianco.b,
          );
          acc.tri(
            cx - px * meta - s.ux * 0.22, 0.285, cz - pz * meta - s.uz * 0.22,
            cx + px * meta + s.ux * 0.22, 0.285, cz + pz * meta + s.uz * 0.22,
            cx - px * meta + s.ux * 0.22, 0.285, cz - pz * meta + s.uz * 0.22,
            0, 1, 0, bianco.r, bianco.g, bianco.b,
          );
        }
      } else if (a.tipo === 'obelisco') {
        // il monumento bianco da piazza: basamento e ago rastremato
        const marmo = new THREE.Color('#DCD8CC');
        const pietra = new THREE.Color('#B9AF9E');
        const quadV = (
          x1: number, z1: number, x2: number, z2: number,
          y0: number, y1: number, nx: number, nz: number, c: THREE.Color,
        ) => {
          acc.tri(x1, y0, z1, x2, y0, z2, x2, y1, z2, nx, 0, nz, c.r, c.g, c.b);
          acc.tri(x1, y0, z1, x2, y1, z2, x1, y1, z1, nx, 0, nz, c.r, c.g, c.b);
        };
        const scatola = (half: number, y0: number, y1: number, c: THREE.Color) => {
          quadV(a.x - half, a.z - half, a.x + half, a.z - half, y0, y1, 0, -1, c);
          quadV(a.x + half, a.z - half, a.x + half, a.z + half, y0, y1, 1, 0, c);
          quadV(a.x + half, a.z + half, a.x - half, a.z + half, y0, y1, 0, 1, c);
          quadV(a.x - half, a.z + half, a.x - half, a.z - half, y0, y1, -1, 0, c);
          acc.tri(a.x - half, y1, a.z - half, a.x + half, y1, a.z - half, a.x + half, y1, a.z + half, 0, 1, 0, c.r, c.g, c.b);
          acc.tri(a.x - half, y1, a.z - half, a.x + half, y1, a.z + half, a.x - half, y1, a.z + half, 0, 1, 0, c.r, c.g, c.b);
        };
        scatola(1.5, 0, 0.9, pietra);
        scatola(1.0, 0.9, 1.7, pietra);
        // l'ago: quattro facce rastremate fino alla punta
        const b0 = 0.6;
        const b1 = 0.16;
        const y0 = 1.7;
        const y1 = 9.4;
        const punte: [number, number][][] = [
          [[-b0, -b0], [b0, -b0]],
          [[b0, -b0], [b0, b0]],
          [[b0, b0], [-b0, b0]],
          [[-b0, b0], [-b0, -b0]],
        ];
        for (const [[ax0, az0], [bx0, bz0]] of punte) {
          const nx = (ax0 + bx0) / 2;
          const nz = (az0 + bz0) / 2;
          const nl = Math.hypot(nx, nz) || 1;
          acc.tri(
            a.x + ax0, y0, a.z + az0,
            a.x + bx0, y0, a.z + bz0,
            a.x + (bx0 / b0) * b1, y1, a.z + (bz0 / b0) * b1,
            nx / nl, 0.1, nz / nl, marmo.r, marmo.g, marmo.b,
          );
          acc.tri(
            a.x + ax0, y0, a.z + az0,
            a.x + (bx0 / b0) * b1, y1, a.z + (bz0 / b0) * b1,
            a.x + (ax0 / b0) * b1, y1, a.z + (az0 / b0) * b1,
            nx / nl, 0.1, nz / nl, marmo.r, marmo.g, marmo.b,
          );
          acc.tri(
            a.x + (ax0 / b0) * b1, y1, a.z + (az0 / b0) * b1,
            a.x + (bx0 / b0) * b1, y1, a.z + (bz0 / b0) * b1,
            a.x, y1 + 0.9, a.z,
            nx / nl, 0.5, nz / nl, marmo.r, marmo.g, marmo.b,
          );
        }
      } else if (a.tipo === 'fontana') {
        const acqua = new THREE.Color('#5A7D8C');
        const pietra = new THREE.Color('#B9AF9E');
        const lati = 10;
        for (let i = 0; i < lati; i++) {
          const a0 = (i / lati) * Math.PI * 2;
          const a1 = ((i + 1) / lati) * Math.PI * 2;
          const r0 = 1.6;
          acc.tri(
            a.x + Math.cos(a0) * r0, 0, a.z + Math.sin(a0) * r0,
            a.x + Math.cos(a1) * r0, 0, a.z + Math.sin(a1) * r0,
            a.x + Math.cos(a1) * r0, 0.55, a.z + Math.sin(a1) * r0,
            Math.cos(a0), 0, Math.sin(a0), pietra.r, pietra.g, pietra.b,
          );
          acc.tri(
            a.x + Math.cos(a0) * r0, 0, a.z + Math.sin(a0) * r0,
            a.x + Math.cos(a1) * r0, 0.55, a.z + Math.sin(a1) * r0,
            a.x + Math.cos(a0) * r0, 0.55, a.z + Math.sin(a0) * r0,
            Math.cos(a0), 0, Math.sin(a0), pietra.r, pietra.g, pietra.b,
          );
          acc.tri(
            a.x, 0.45, a.z,
            a.x + Math.cos(a0) * 1.45, 0.45, a.z + Math.sin(a0) * 1.45,
            a.x + Math.cos(a1) * 1.45, 0.45, a.z + Math.sin(a1) * 1.45,
            0, 1, 0, acqua.r, acqua.g, acqua.b,
          );
        }
      }
    }

    return { alberi, semafori, bus, paletti, fusa: acc.pos.length ? acc.build() : null };
  }, [mondo]);

  const tronchi = useRef<THREE.InstancedMesh>(null);
  const chiome = useRef<THREE.InstancedMesh>(null);
  const paliSem = useRef<THREE.InstancedMesh>(null);
  const testeSem = useRef<THREE.InstancedMesh>(null);
  const paliBus = useRef<THREE.InstancedMesh>(null);
  const cartelliBus = useRef<THREE.InstancedMesh>(null);
  const bollard = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const su = new THREE.Vector3(0, 1, 0);

    dati.alberi.forEach((a, i) => {
      const seme = Math.abs(Math.sin(a.x * 12.9 + a.z * 78.2));
      const scala = 0.75 + seme * 0.8;
      q.setFromAxisAngle(su, seme * Math.PI * 2);
      m.compose(new THREE.Vector3(a.x, 1.1 * scala, a.z), q, new THREE.Vector3(scala, scala, scala));
      tronchi.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(a.x, 3.4 * scala, a.z), q, new THREE.Vector3(scala, scala, scala));
      chiome.current?.setMatrixAt(i, m);
    });
    dati.semafori.forEach((a, i) => {
      q.identity();
      m.compose(new THREE.Vector3(a.x, 1.6, a.z), q, new THREE.Vector3(1, 1, 1));
      paliSem.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(a.x, 3.35, a.z), q, new THREE.Vector3(1, 1, 1));
      testeSem.current?.setMatrixAt(i, m);
    });
    dati.bus.forEach((a, i) => {
      q.identity();
      m.compose(new THREE.Vector3(a.x, 1.35, a.z), q, new THREE.Vector3(1, 1, 1));
      paliBus.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(a.x, 2.75, a.z), q, new THREE.Vector3(1, 1, 1));
      cartelliBus.current?.setMatrixAt(i, m);
    });
    dati.paletti.forEach(([x, z], i) => {
      q.identity();
      m.compose(new THREE.Vector3(x, 0.45, z), q, new THREE.Vector3(1, 1, 1));
      bollard.current?.setMatrixAt(i, m);
    });
    const coppie: [React.RefObject<THREE.InstancedMesh | null>, number][] = [
      [tronchi, dati.alberi.length],
      [chiome, dati.alberi.length],
      [paliSem, dati.semafori.length],
      [testeSem, dati.semafori.length],
      [paliBus, dati.bus.length],
      [cartelliBus, dati.bus.length],
      [bollard, dati.paletti.length],
    ];
    for (const [ref, n] of coppie) {
      if (ref.current) {
        ref.current.count = n;
        ref.current.instanceMatrix.needsUpdate = true;
      }
    }
  }, [dati]);

  const maxA = Math.max(1, dati.alberi.length);
  const maxS = Math.max(1, dati.semafori.length);
  const maxB = Math.max(1, dati.bus.length);

  return (
    <group name="arredi">
      {dati.fusa && (
        <mesh geometry={dati.fusa}>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
      <instancedMesh ref={tronchi} args={[undefined, undefined, maxA]} frustumCulled={false}>
        <cylinderGeometry args={[0.14, 0.2, 2.2, 6]} />
        <meshLambertMaterial color="#6E5537" />
      </instancedMesh>
      <instancedMesh ref={chiome} args={[undefined, undefined, maxA]} frustumCulled={false} castShadow>
        <sphereGeometry args={[1.7, 6, 4]} />
        <meshLambertMaterial color="#557A42" flatShading />
      </instancedMesh>
      <instancedMesh ref={paliSem} args={[undefined, undefined, maxS]} frustumCulled={false}>
        <cylinderGeometry args={[0.07, 0.09, 3.2, 6]} />
        <meshLambertMaterial color="#3E3B44" />
      </instancedMesh>
      <instancedMesh ref={testeSem} args={[undefined, undefined, maxS]} frustumCulled={false}>
        <boxGeometry args={[0.3, 0.75, 0.3]} />
        <meshLambertMaterial color="#22201E" emissive="#D97A2E" emissiveIntensity={0.55} />
      </instancedMesh>
      <instancedMesh ref={paliBus} args={[undefined, undefined, maxB]} frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.07, 2.7, 6]} />
        <meshLambertMaterial color="#3E3B44" />
      </instancedMesh>
      <instancedMesh ref={cartelliBus} args={[undefined, undefined, maxB]} frustumCulled={false}>
        <boxGeometry args={[0.55, 0.55, 0.06]} />
        <meshLambertMaterial color="#D9862E" />
      </instancedMesh>
      <instancedMesh
        ref={bollard}
        args={[undefined, undefined, Math.max(1, dati.paletti.length)]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.07, 0.08, 0.9, 6]} />
        <meshLambertMaterial color="#585862" />
      </instancedMesh>
    </group>
  );
}
