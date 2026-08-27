'use client';

// L'utilitaria del giocatore: low-poly procedurale, proporzioni da city car
// italiana (3.4 m, alta e squadrata), ruote che girano e sterzano, luci
// diurne accese. Il modello è costruito lungo +X (il muso guarda
// avanti rispetto allo heading della fisica).

import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RuntimeGioco } from './Player';
import { TINTE_AUTO } from '@/lib/lugo/palette';
import { useLugo } from '@/lib/lugo/store';

const VETRO = '#2E3A4E';
const GOMMA = '#1E1C22';
const CERCHIO = '#9A96A0';

function Ruota({
  x,
  z,
  rt,
  sterzante,
}: {
  x: number;
  z: number;
  rt: RuntimeGioco;
  sterzante?: boolean;
}) {
  const sterzo = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  useFrame(() => {
    if (sterzante && sterzo.current) sterzo.current.rotation.y = -rt.auto.sterzo * 0.9;
    if (spin.current) spin.current.rotation.z = -rt.faseRuote;
  });
  return (
    <group position={[x, 0.3, z]} ref={sterzo}>
      <group ref={spin}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.22, 10]} />
          <meshLambertMaterial color={GOMMA} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.24, 8]} />
          <meshLambertMaterial color={CERCHIO} />
        </mesh>
      </group>
    </group>
  );
}

export const Car = forwardRef<THREE.Group, { rt: RuntimeGioco }>(function Car({ rt }, ref) {
  const tinta = useLugo((s) => s.tintaAuto);
  const colore = TINTE_AUTO[tinta % TINTE_AUTO.length].colore;
  const scuro = useMemo(() => new THREE.Color(colore).multiplyScalar(0.75), [colore]);

  return (
    <group ref={ref}>
      {/* scocca bassa */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[3.3, 0.52, 1.52]} />
        <meshLambertMaterial color={colore} />
      </mesh>
      {/* cofano leggermente più basso davanti */}
      <mesh position={[1.35, 0.72, 0]} castShadow>
        <boxGeometry args={[0.62, 0.18, 1.5]} />
        <meshLambertMaterial color={colore} />
      </mesh>
      {/* abitacolo squadrato, arretrato */}
      <mesh position={[-0.25, 1.12, 0]} castShadow>
        <boxGeometry args={[2.0, 0.62, 1.44]} />
        <meshLambertMaterial color={scuro} />
      </mesh>
      {/* vetri: parabrezza, lunotto, laterali */}
      <mesh position={[0.82, 1.12, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.06, 0.56, 1.36]} />
        <meshLambertMaterial color={VETRO} />
      </mesh>
      <mesh position={[-1.28, 1.12, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.06, 0.54, 1.36]} />
        <meshLambertMaterial color={VETRO} />
      </mesh>
      <mesh position={[-0.22, 1.12, 0]}>
        <boxGeometry args={[1.9, 0.5, 1.46]} />
        <meshLambertMaterial color={VETRO} />
      </mesh>
      {/* fanali anteriori accesi e luci di coda */}
      <mesh position={[1.66, 0.62, 0.5]}>
        <boxGeometry args={[0.06, 0.16, 0.28]} />
        <meshLambertMaterial color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[1.66, 0.62, -0.5]}>
        <boxGeometry args={[0.06, 0.16, 0.28]} />
        <meshLambertMaterial color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[-1.66, 0.62, 0.5]}>
        <boxGeometry args={[0.05, 0.14, 0.24]} />
        <meshLambertMaterial color="#8A1F1A" emissive="#C0362C" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-1.66, 0.62, -0.5]}>
        <boxGeometry args={[0.05, 0.14, 0.24]} />
        <meshLambertMaterial color="#8A1F1A" emissive="#C0362C" emissiveIntensity={0.9} />
      </mesh>
      {/* paraurti */}
      <mesh position={[1.62, 0.36, 0]}>
        <boxGeometry args={[0.18, 0.16, 1.5]} />
        <meshLambertMaterial color="#3A3740" />
      </mesh>
      <mesh position={[-1.62, 0.36, 0]}>
        <boxGeometry args={[0.18, 0.16, 1.5]} />
        <meshLambertMaterial color="#3A3740" />
      </mesh>
      <Ruota x={1.05} z={0.78} rt={rt} sterzante />
      <Ruota x={1.05} z={-0.78} rt={rt} sterzante />
      <Ruota x={-1.05} z={0.78} rt={rt} />
      <Ruota x={-1.05} z={-0.78} rt={rt} />
    </group>
  );
});
