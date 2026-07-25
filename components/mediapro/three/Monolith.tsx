'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';

/**
 * Il cubo e le due sfere sospese.
 *
 * Il cubo respira sempre — rotazione lentissima, mai ferma — e lo scroll
 * aggiunge una rotazione propria. Le sfere partono quasi immobili e cominciano
 * a orbitare davvero solo mentre la camera si avvicina: l'accelerazione è
 * legata all'avanzamento, così il movimento sembra causato da chi scorre.
 */
export function Monolith() {
  const group = useRef<THREE.Group>(null);
  const cube = useRef<THREE.Mesh>(null);
  const orbitA = useRef<THREE.Group>(null);
  const orbitB = useRef<THREE.Group>(null);
  const spin = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = scroll.hero;
    const d = Math.min(dt, 0.05);

    if (cube.current) {
      // L'offset iniziale tiene il cubo su una vista di tre quarti: due facce
      // visibili invece di una sola frontale, che leggerebbe come un pannello.
      cube.current.rotation.y = 0.62 + t * 0.075 + p * 1.1;
      cube.current.rotation.x = -0.16 + Math.sin(t * 0.32) * 0.055 + p * 0.2;
      cube.current.position.y = Math.sin(t * 0.5) * 0.07;
    }

    // le sfere accelerano da 0.15x a 1.6x mentre la camera entra
    spin.current += d * (0.15 + p * 1.45);
    const s = spin.current;
    if (orbitA.current) {
      orbitA.current.rotation.y = s * 0.9;
      orbitA.current.rotation.z = Math.sin(t * 0.28) * 0.16;
    }
    if (orbitB.current) {
      orbitB.current.rotation.y = -s * 0.62 + 1.7;
      orbitB.current.rotation.x = 0.42 + Math.sin(t * 0.22) * 0.12;
    }

    // Quando arriva il titolo, l'oggetto si sposta a destra e lascia libera la
    // metà sinistra: il testo non deve mai finire sopra il cubo. Dopo l'hero
    // continua ad allontanarsi, cedendo il campo al contenuto.
    if (group.current) {
      const heroShift = Math.max(0, (p - 0.42) / 0.58);
      const after = Math.max(0, scroll.page - 0.3) / 0.7;
      group.current.position.x = damp(group.current.position.x, heroShift * 2.7 + after * 1.6, 3, d);
      group.current.position.z = damp(group.current.position.z, after * -2.6, 3, d);
      group.current.position.y = damp(group.current.position.y, after * -0.6, 3, d);
    }
  });

  return (
    <group ref={group}>
      {/* raggio di raccordo contenuto: con spigoli troppo morbidi le facce si
          fondono e l'oggetto legge come un pannello, non come un cubo */}
      <RoundedBox ref={cube} args={[2.35, 2.45, 2.35]} radius={0.17} smoothness={6} castShadow>
        {/* Metalness alta + base scura darebbe un cubo nero: un metallo
            riflette l'ambiente, e l'ambiente qui è quasi tutto buio. Si tiene
            più bassa e si lascia lavorare anche la componente diffusa, così le
            facce hanno un gradiente invece di essere silhouette. */}
        <meshPhysicalMaterial
          color="#26262a"
          metalness={0.58}
          roughness={0.26}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={2.2}
        />
      </RoundedBox>

      {/* Sfera in acciaio. Il raggio dell'orbita è tarato perché, una volta che
          il gruppo è scivolato a destra, la sfera non attraversi mai la metà
          sinistra dell'inquadratura, dove sta il testo. */}
      <group ref={orbitA}>
        <mesh position={[1.75, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.38, 48, 48]} />
          <meshPhysicalMaterial
            color="#d8d8d8"
            metalness={1}
            roughness={0.13}
            envMapIntensity={1.9}
          />
        </mesh>
      </group>

      {/* sfera dorata, più piccola e su un'orbita inclinata */}
      <group ref={orbitB}>
        <mesh position={[1.85, -0.7, 0.4]} castShadow>
          <sphereGeometry args={[0.25, 48, 48]} />
          <meshPhysicalMaterial
            color="#d6b37a"
            metalness={1}
            roughness={0.2}
            envMapIntensity={2.1}
            emissive="#3a2a12"
            emissiveIntensity={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}
