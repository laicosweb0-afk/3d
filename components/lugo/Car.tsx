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
import { runtime } from '@/lib/lugo/runtime';
import { cieloOra } from '@/lib/lugo/tempo';

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
  const corpo = useRef<THREE.Group>(null);
  const stopD = useRef<THREE.MeshLambertMaterial>(null);
  const stopS = useRef<THREE.MeshLambertMaterial>(null);
  const faroD = useRef<THREE.MeshLambertMaterial>(null);
  const faroS = useRef<THREE.MeshLambertMaterial>(null);
  const vPrima = useRef(0);

  // sospensioni finte ma credibili: beccheggio in frenata/accelerazione,
  // rollio in curva; e gli stop che si accendono davvero quando freni
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const c = corpo.current;
    if (c) {
      const acc = dt > 0 ? (rt.vAuto - vPrima.current) / dt : 0;
      vPrima.current = rt.vAuto;
      const beccheggio = THREE.MathUtils.clamp(-acc * 0.006, -0.05, 0.06);
      const rollio = THREE.MathUtils.clamp(rt.auto.sterzo * rt.vAuto * 0.004, -0.05, 0.05);
      c.rotation.z += (beccheggio - c.rotation.z) * Math.min(1, dt * 8);
      c.rotation.x += (rollio - c.rotation.x) * Math.min(1, dt * 8);
    }
    const acceso = runtime.frenata ? 2.6 : 0.9;
    if (stopD.current) stopD.current.emissiveIntensity = acceso;
    if (stopS.current) stopS.current.emissiveIntensity = acceso;
    // gli abbaglianti si accendono quando cala la sera
    const fari = 0.45 + cieloOra().luci * 2.4;
    if (faroD.current) faroD.current.emissiveIntensity = fari;
    if (faroS.current) faroS.current.emissiveIntensity = fari;
  });

  return (
    <group ref={ref}>
      <group ref={corpo}>
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
        <meshLambertMaterial ref={faroD} color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[1.66, 0.62, -0.5]}>
        <boxGeometry args={[0.06, 0.16, 0.28]} />
        <meshLambertMaterial ref={faroS} color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[-1.66, 0.62, 0.5]}>
        <boxGeometry args={[0.05, 0.14, 0.24]} />
        <meshLambertMaterial ref={stopD} color="#8A1F1A" emissive="#C0362C" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-1.66, 0.62, -0.5]}>
        <boxGeometry args={[0.05, 0.14, 0.24]} />
        <meshLambertMaterial ref={stopS} color="#8A1F1A" emissive="#C0362C" emissiveIntensity={0.9} />
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
      </group>
      <Ruota x={1.05} z={0.78} rt={rt} sterzante />
      <Ruota x={1.05} z={-0.78} rt={rt} sterzante />
      <Ruota x={-1.05} z={0.78} rt={rt} />
      <Ruota x={-1.05} z={-0.78} rt={rt} />
    </group>
  );
});
