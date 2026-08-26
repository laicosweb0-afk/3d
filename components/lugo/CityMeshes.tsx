'use client';

// Le mesh fuse della città + il terreno di base. Due draw call per tutta
// Lugo: uno per gli edifici estrusi, uno per le superfici piatte.

import { useMemo } from 'react';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { generaCitta } from '@/lib/lugo/citygen';
import { PALETTE } from '@/lib/lugo/palette';

export function CityMeshes({ senzaLandmark = false }: { senzaLandmark?: boolean }) {
  const mondo = useMondo();

  const { edifici, suolo } = useMemo(() => generaCitta(mondo, senzaLandmark), [mondo, senzaLandmark]);

  const matEdifici = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);
  const matSuolo = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);

  const terreno = useMemo(() => {
    const { minX, minZ, maxX, maxZ } = mondo.bounds;
    const margine = 400;
    return {
      w: maxX - minX + margine * 2,
      d: maxZ - minZ + margine * 2,
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    };
  }, [mondo]);

  return (
    <group>
      <mesh geometry={edifici} material={matEdifici} castShadow receiveShadow />
      <mesh geometry={suolo} material={matSuolo} receiveShadow />
      <mesh position={[terreno.x, 0, terreno.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[terreno.w, terreno.d]} />
        <meshLambertMaterial color={PALETTE.terreno} />
      </mesh>
    </group>
  );
}
