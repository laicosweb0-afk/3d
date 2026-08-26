'use client';

// Il protagonista a piedi: figura low-poly articolata, camminata
// procedurale (gambe e braccia oscillano con la fase del passo).
// Come l'auto, il modello guarda +X.

import { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RuntimeGioco } from './Player';

const PELLE = '#D9A67C';
const MAGLIA = '#3E7A73';
const PANTALONI = '#3A3A46';
const CAPELLI = '#2E2620';
const SCARPE = '#24222A';

function Gamba({ z, fase, rt }: { z: number; fase: number; rt: RuntimeGioco }) {
  const anca = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!anca.current) return;
    const v = Math.min(1, rt.vPersona / 2.2);
    anca.current.rotation.z = Math.sin(rt.persona.fase + fase) * 0.55 * v;
  });
  return (
    <group position={[0, 0.84, z]} ref={anca}>
      <mesh position={[0, -0.42, 0]} castShadow>
        <boxGeometry args={[0.16, 0.8, 0.15]} />
        <meshLambertMaterial color={PANTALONI} />
      </mesh>
      <mesh position={[0.05, -0.8, 0]}>
        <boxGeometry args={[0.28, 0.1, 0.16]} />
        <meshLambertMaterial color={SCARPE} />
      </mesh>
    </group>
  );
}

function Braccio({ z, fase, rt }: { z: number; fase: number; rt: RuntimeGioco }) {
  const spalla = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!spalla.current) return;
    const v = Math.min(1, rt.vPersona / 2.2);
    spalla.current.rotation.z = Math.sin(rt.persona.fase + fase) * 0.45 * v;
  });
  return (
    <group position={[0, 1.32, z]} ref={spalla}>
      <mesh position={[0, -0.26, 0]} castShadow>
        <boxGeometry args={[0.11, 0.52, 0.11]} />
        <meshLambertMaterial color={MAGLIA} />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[0.09, 0.1, 0.09]} />
        <meshLambertMaterial color={PELLE} />
      </mesh>
    </group>
  );
}

export const Character = forwardRef<THREE.Group, { rt: RuntimeGioco }>(function Character(
  { rt },
  ref,
) {
  return (
    <group ref={ref}>
      {/* torso */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.26, 0.52, 0.4]} />
        <meshLambertMaterial color={MAGLIA} />
      </mesh>
      {/* testa */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.22, 0.24, 0.22]} />
        <meshLambertMaterial color={PELLE} />
      </mesh>
      <mesh position={[-0.02, 1.62, 0]}>
        <boxGeometry args={[0.24, 0.08, 0.24]} />
        <meshLambertMaterial color={CAPELLI} />
      </mesh>
      <Gamba z={0.09} fase={0} rt={rt} />
      <Gamba z={-0.09} fase={Math.PI} rt={rt} />
      <Braccio z={0.26} fase={Math.PI} rt={rt} />
      <Braccio z={-0.26} fase={0} rt={rt} />
    </group>
  );
});
