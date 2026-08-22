'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { orologio, passaggio, presenza } from '@/lib/cartone/tempo';

/**
 * Le luci: due pannelli che si accendono ai lati e il lampo dello scatto.
 *
 * Un set che si accende è la cosa più riconoscibile del nostro mestiere, e
 * costa due rettangoli. Il lampo, invece, è il momento in cui il corto
 * ammette di essere uno spot: dura due fotogrammi, e senza di lui la battuta
 * dei contenuti non ha un culmine.
 */
export function Studio() {
  const sinistra = useRef<THREE.Mesh>(null);
  const destra = useRef<THREE.Mesh>(null);
  const luceA = useRef<THREE.SpotLight>(null);
  const luceB = useRef<THREE.PointLight>(null);
  const lampo = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const t = orologio.t;

    // Si accendono una dopo l'altra: mezzo secondo di scarto e sembrano due
    // gesti, non un interruttore generale.
    const a = presenza(t, 16.2, 26.6, 0.5, 1.1);
    const b = presenza(t, 16.7, 26.6, 0.5, 1.1);
    const scatto =
      Math.exp(-Math.pow((t - 17.9) / 0.06, 2)) + 0.7 * Math.exp(-Math.pow((t - 18.35) / 0.06, 2));

    if (sinistra.current) {
      (sinistra.current.material as THREE.MeshBasicMaterial).opacity = a * (0.78 + scatto * 0.22);
      sinistra.current.visible = a > 0.01;
    }
    if (destra.current) {
      (destra.current.material as THREE.MeshBasicMaterial).opacity = b * (0.7 + scatto * 0.3);
      destra.current.visible = b > 0.01;
    }
    if (luceA.current) luceA.current.intensity = a * 60 + scatto * 90;
    if (luceB.current) luceB.current.intensity = b * 26 + scatto * 40;
    if (lampo.current) lampo.current.intensity = scatto * 260 + passaggio(t, 26.9, 28.6) * 0;
  });

  return (
    <group>
      <mesh ref={sinistra} position={[-1.42, 2.0, 0.55]} rotation={[0, 0.42, 0]}>
        <planeGeometry args={[0.11, 3.4]} />
        <meshBasicMaterial color="#fff2dc" transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={destra} position={[1.46, 1.55, 0.4]} rotation={[0, -0.45, 0]}>
        <planeGeometry args={[0.085, 2.5]} />
        <meshBasicMaterial color="#cfe0ff" transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* La luce vera che i pannelli fingono di emettere. Niente
          RectAreaLight: richiede l'inizializzazione delle LTC e in cambio dà
          una differenza che a questa scala non si vede. */}
      <spotLight
        ref={luceA}
        position={[-3.4, 3.0, 3.0]}
        angle={0.85}
        penumbra={1}
        decay={2}
        distance={16}
        intensity={0}
        color="#ffeacb"
        castShadow
      />
      <pointLight ref={luceB} position={[3.4, 1.7, 2.3]} intensity={0} distance={12} color="#cfe0ff" />
      <pointLight ref={lampo} position={[0.4, 2.2, 3.4]} intensity={0} distance={16} color="#ffffff" />
    </group>
  );
}
