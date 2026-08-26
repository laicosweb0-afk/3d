'use client';

// Le auto degli altri: i posteggi instanziati (tre draw call per tutte) e
// il filo di traffico civile che percorre le strade lunghe, sulla corsia
// di destra come si deve.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco, stepAutoCivile, TINTE_PARCO, type AutoCivile } from '@/lib/lugo/veicoli';
import { useLugo } from '@/lib/lugo/store';

const VETRO = '#2E3A4E';
const SOTTO = '#232128';

function AutoInGiro({ auto }: { auto: AutoCivile }) {
  const gruppo = useRef<THREE.Group>(null);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (useLugo.getState().fase === 'gioco') stepAutoCivile(auto, dt);
    if (gruppo.current) {
      gruppo.current.position.set(auto.x, 0, auto.z);
      gruppo.current.rotation.y = -auto.yaw;
    }
  });
  return (
    <group ref={gruppo}>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[3.5, 0.52, 1.56]} />
        <meshLambertMaterial color={auto.colore} />
      </mesh>
      <mesh position={[-0.15, 1.05, 0]} castShadow>
        <boxGeometry args={[1.9, 0.55, 1.44]} />
        <meshLambertMaterial color={VETRO} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[3.3, 0.28, 1.5]} />
        <meshLambertMaterial color={SOTTO} />
      </mesh>
      <mesh position={[1.76, 0.55, 0]}>
        <boxGeometry args={[0.05, 0.14, 1.1]} />
        <meshLambertMaterial color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

export function Veicoli() {
  const mondo = useMondo();
  const infra = useMemo(() => infraGioco(mondo), [mondo]);

  const scocca = useRef<THREE.InstancedMesh>(null);
  const abitacolo = useRef<THREE.InstancedMesh>(null);
  const sotto = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const su = new THREE.Vector3(0, 1, 0);
    const uno = new THREE.Vector3(1, 1, 1);
    const c = new THREE.Color();
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
        ref.current.count = infra.parcheggi.length;
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      }
    }
  }, [infra]);

  const max = Math.max(1, infra.parcheggi.length);

  return (
    <group>
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
      {infra.traffico.map((a, i) => (
        <AutoInGiro key={i} auto={a} />
      ))}
    </group>
  );
}
