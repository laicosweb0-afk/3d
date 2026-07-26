'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';
import { blendWorlds } from './worlds';

/**
 * Il pavimento della stanza: senza un piano sotto, gli oggetti galleggiano nel
 * vuoto e non si ha mai la sensazione di essere *dentro* a qualcosa. Prende
 * colore dalla luce del progetto, quindi ogni stanza è un ambiente diverso.
 */
export function Room() {
  const floor = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((_, dt) => {
    if (!floor.current || !mat.current) return;
    const w = blendWorlds(scroll.world);
    const d = Math.min(dt, 0.05);
    mat.current.color.lerp(w.fog, 0.06);
    mat.current.emissive.lerp(w.light, 0.05);
    mat.current.emissiveIntensity = 0.05;
    mat.current.opacity = damp(mat.current.opacity, scroll.cases * 0.85, 3, d);
    floor.current.visible = scroll.cases > 0.02;
  });

  return (
    <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.4, 0]} receiveShadow>
      <circleGeometry args={[26, 64]} />
      <meshStandardMaterial
        ref={mat}
        transparent
        opacity={0}
        metalness={0.85}
        roughness={0.32}
      />
    </mesh>
  );
}
