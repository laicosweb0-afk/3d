'use client';

// Le auto degli altri: i posteggi instanziati (tre draw call per tutte) e
// il filo di traffico civile che percorre le strade lunghe, sulla corsia
// di destra come si deve.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco, stepAutoCivile, TINTE_PARCO, type AutoCivile } from '@/lib/lugo/veicoli';
import { Accumulo } from '@/lib/lugo/citygen';
import { useLugo } from '@/lib/lugo/store';

const VETRO = '#2E3A4E';
const SOTTO = '#232128';

export function Veicoli() {
  const mondo = useMondo();
  const infra = useMemo(() => infraGioco(mondo), [mondo]);

  // le strisce blu attorno ai posteggi, come dal vivo a Largo del Tricolore
  const strisceBlu = useMemo(() => {
    if (!infra.parcheggi.length) return null;
    const acc = new Accumulo();
    const blu = new THREE.Color('#3A78C2');
    const Y = 0.268;
    const HL = 2.45; // mezza lunghezza dello stallo
    const HW = 1.2; // mezza larghezza
    const S = 0.09; // mezzo spessore della riga
    for (const p of infra.parcheggi) {
      const c = Math.cos(p.yaw);
      const s = Math.sin(p.yaw);
      const punto = (u: number, v: number): [number, number] => [
        p.x + u * c - v * s,
        p.z + u * s + v * c,
      ];
      const linea = (u1: number, v1: number, u2: number, v2: number) => {
        // riga come rettangolo sottile fra due punti in coordinate stallo
        const [ax, az] = punto(u1, v1);
        const [bx, bz] = punto(u2, v2);
        const dx = bx - ax;
        const dz = bz - az;
        const l = Math.hypot(dx, dz) || 1;
        const px = (-dz / l) * S;
        const pz = (dx / l) * S;
        acc.tri(ax - px, Y, az - pz, bx - px, Y, bz - pz, bx + px, Y, bz + pz, 0, 1, 0, blu.r, blu.g, blu.b);
        acc.tri(ax - px, Y, az - pz, bx + px, Y, bz + pz, ax + px, Y, az + pz, 0, 1, 0, blu.r, blu.g, blu.b);
      };
      linea(-HL, -HW, HL, -HW);
      linea(-HL, HW, HL, HW);
      linea(-HL, -HW, -HL, HW);
      linea(HL, -HW, HL, HW);
    }
    return acc.build();
  }, [infra]);

  const scocca = useRef<THREE.InstancedMesh>(null);
  const abitacolo = useRef<THREE.InstancedMesh>(null);
  const sotto = useRef<THREE.InstancedMesh>(null);

  const fari = useRef<THREE.InstancedMesh>(null);

  // Le auto che girano stanno nelle STESSE instanced di quelle in sosta.
  // Prima ognuna era un gruppetto di quattro mesh sue: nove auto facevano
  // trentasei chiamate di disegno, e a piazza Baracca — dove si vede mezzo
  // centro insieme — il conto sfondava il tetto senza che nessuno se ne
  // accorgesse, perché il collaudo misurava in un punto solo.
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const gioca = useLugo.getState().fase === 'gioco';
    const base = infra.parcheggi.length;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const su = new THREE.Vector3(0, 1, 0);
    const uno = new THREE.Vector3(1, 1, 1);
    infra.traffico.forEach((a, i) => {
      if (gioca) stepAutoCivile(a, dt);
      q.setFromAxisAngle(su, -a.yaw);
      const c = Math.cos(a.yaw);
      const s2 = Math.sin(a.yaw);
      m.compose(new THREE.Vector3(a.x, 0.5, a.z), q, uno);
      scocca.current?.setMatrixAt(base + i, m);
      m.compose(new THREE.Vector3(a.x - c * 0.15, 1.02, a.z - s2 * 0.15), q, uno);
      abitacolo.current?.setMatrixAt(base + i, m);
      m.compose(new THREE.Vector3(a.x, 0.22, a.z), q, uno);
      sotto.current?.setMatrixAt(base + i, m);
      m.compose(new THREE.Vector3(a.x + c * 1.76, 0.55, a.z + s2 * 1.76), q, uno);
      fari.current?.setMatrixAt(i, m);
    });
    for (const ref of [scocca, abitacolo, sotto, fari]) {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    }
  });

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const su = new THREE.Vector3(0, 1, 0);
    const uno = new THREE.Vector3(1, 1, 1);
    const c = new THREE.Color();
    infra.traffico.forEach((a, i) => {
      scocca.current?.setColorAt(infra.parcheggi.length + i, c.set(a.colore));
    });
    if (fari.current) fari.current.count = infra.traffico.length;
    infra.parcheggi.forEach((p, i) => {
      q.setFromAxisAngle(su, -p.yaw);
      m.compose(new THREE.Vector3(p.x, 0.5, p.z), q, uno);
      scocca.current?.setMatrixAt(i, m);
      scocca.current?.setColorAt(i, c.set(TINTE_PARCO[p.tinta % TINTE_PARCO.length]));
      m.compose(new THREE.Vector3(p.x - Math.cos(p.yaw) * 0.15, 1.02, p.z - Math.sin(p.yaw) * 0.15), q, uno);
      abitacolo.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, 0.22, p.z), q, uno);
      sotto.current?.setMatrixAt(i, m);
    });
    for (const ref of [scocca, abitacolo, sotto]) {
      if (ref.current) {
        ref.current.count = infra.parcheggi.length + infra.traffico.length;
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      }
    }
  }, [infra]);

  const max = Math.max(1, infra.parcheggi.length + infra.traffico.length);

  return (
    <group name="veicoli">
      {strisceBlu && (
        <mesh geometry={strisceBlu}>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
      <instancedMesh ref={scocca} args={[undefined, undefined, max]} frustumCulled={false} castShadow>
        <boxGeometry args={[3.5, 0.5, 1.56]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={abitacolo} args={[undefined, undefined, max]} frustumCulled={false}>
        <boxGeometry args={[1.85, 0.52, 1.42]} />
        <meshLambertMaterial color={VETRO} />
      </instancedMesh>
      <instancedMesh ref={sotto} args={[undefined, undefined, max]} frustumCulled={false}>
        <boxGeometry args={[3.3, 0.26, 1.5]} />
        <meshLambertMaterial color={SOTTO} />
      </instancedMesh>
      <instancedMesh
        ref={fari}
        args={[undefined, undefined, Math.max(1, infra.traffico.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.05, 0.14, 1.1]} />
        <meshLambertMaterial color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={1.2} />
      </instancedMesh>
    </group>
  );
}
