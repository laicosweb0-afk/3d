'use client';

// Il protagonista a piedi: figura stilizzata ma umana, con proporzioni
// curate e animazione procedurale completa — idle che respira, camminata,
// corsa con busto in avanti e braccia piegate, gambe col ginocchio.
// Come l'auto, il modello guarda +X.

import { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RuntimeGioco } from './Player';

const PELLE = '#D9A67C';
const GIACCA = '#4A6B78'; // giubbotto blu-petrolio
const MAGLIA = '#D8D2C4';
const PANTALONI = '#3A4356'; // jeans
const CAPELLI = '#2E2620';
const SCARPE = '#E8E4DC'; // sneakers chiare

function Gamba({ z, fase, rt }: { z: number; fase: number; rt: RuntimeGioco }) {
  const anca = useRef<THREE.Group>(null);
  const ginocchio = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!anca.current) return;
    const v = Math.min(1, rt.vPersona / 2.2);
    const corsa = Math.min(1, Math.max(0, (rt.vPersona - 2.4) / 2.6));
    const osc = Math.sin(rt.persona.fase + fase);
    anca.current.rotation.z = osc * (0.5 + corsa * 0.35) * v;
    // il ginocchio si piega solo quando la gamba torna indietro
    if (ginocchio.current) {
      const piega = Math.max(0, -Math.sin(rt.persona.fase + fase - 0.6));
      ginocchio.current.rotation.z = piega * (0.55 + corsa * 0.5) * v;
    }
  });
  return (
    <group position={[0, 0.88, z]} ref={anca}>
      {/* coscia */}
      <mesh position={[0, -0.22, 0]} castShadow>
        <boxGeometry args={[0.17, 0.44, 0.16]} />
        <meshLambertMaterial color={PANTALONI} />
      </mesh>
      {/* polpaccio + scarpa, articolati sul ginocchio */}
      <group position={[0, -0.44, 0]} ref={ginocchio}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.15, 0.4, 0.14]} />
          <meshLambertMaterial color={PANTALONI} />
        </mesh>
        <mesh position={[0.06, -0.42, 0]}>
          <boxGeometry args={[0.3, 0.11, 0.15]} />
          <meshLambertMaterial color={SCARPE} />
        </mesh>
      </group>
    </group>
  );
}

function Braccio({ z, fase, rt }: { z: number; fase: number; rt: RuntimeGioco }) {
  const spalla = useRef<THREE.Group>(null);
  const gomito = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!spalla.current) return;
    const v = Math.min(1, rt.vPersona / 2.2);
    const corsa = Math.min(1, Math.max(0, (rt.vPersona - 2.4) / 2.6));
    spalla.current.rotation.z = Math.sin(rt.persona.fase + fase) * (0.4 + corsa * 0.35) * v;
    // in corsa il gomito resta piegato, da vero podista
    if (gomito.current) gomito.current.rotation.z = 0.15 + corsa * 1.1 + (1 - v) * 0.08;
  });
  return (
    <group position={[0, 1.34, z]} ref={spalla}>
      <mesh position={[0, -0.17, 0]} castShadow>
        <boxGeometry args={[0.12, 0.34, 0.12]} />
        <meshLambertMaterial color={GIACCA} />
      </mesh>
      <group position={[0, -0.34, 0]} ref={gomito}>
        <mesh position={[0, -0.14, 0]}>
          <boxGeometry args={[0.1, 0.28, 0.1]} />
          <meshLambertMaterial color={GIACCA} />
        </mesh>
        <mesh position={[0, -0.32, 0]}>
          <boxGeometry args={[0.09, 0.1, 0.09]} />
          <meshLambertMaterial color={PELLE} />
        </mesh>
      </group>
    </group>
  );
}

export const Character = forwardRef<THREE.Group, { rt: RuntimeGioco }>(function Character(
  { rt },
  ref,
) {
  const busto = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!busto.current) return;
    const v = Math.min(1, rt.vPersona / 2.2);
    const corsa = Math.min(1, Math.max(0, (rt.vPersona - 2.4) / 2.6));
    // da fermo respira; camminando dondola appena; correndo si sporge
    const respiro = v < 0.1 ? Math.sin(clock.elapsedTime * 1.6) * 0.012 : 0;
    busto.current.position.y = Math.abs(Math.sin(rt.persona.fase)) * 0.05 * v + respiro;
    busto.current.rotation.z = corsa * 0.22;
    busto.current.rotation.x = Math.sin(rt.persona.fase) * 0.03 * v;
  });

  return (
    <group ref={ref}>
      <group ref={busto}>
        {/* bacino */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[0.24, 0.16, 0.34]} />
          <meshLambertMaterial color={PANTALONI} />
        </mesh>
        {/* torso col giubbotto, spalle un filo più larghe */}
        <mesh position={[0, 1.18, 0]} castShadow>
          <boxGeometry args={[0.26, 0.42, 0.4]} />
          <meshLambertMaterial color={GIACCA} />
        </mesh>
        {/* la maglia che spunta dal giubbotto */}
        <mesh position={[0.11, 1.12, 0]}>
          <boxGeometry args={[0.06, 0.28, 0.16]} />
          <meshLambertMaterial color={MAGLIA} />
        </mesh>
        {/* collo e testa proporzionati */}
        <mesh position={[0, 1.42, 0]}>
          <boxGeometry args={[0.1, 0.08, 0.1]} />
          <meshLambertMaterial color={PELLE} />
        </mesh>
        <mesh position={[0, 1.56, 0]} castShadow>
          <boxGeometry args={[0.2, 0.22, 0.2]} />
          <meshLambertMaterial color={PELLE} />
        </mesh>
        {/* capelli corti con il ciuffo */}
        <mesh position={[-0.02, 1.68, 0]}>
          <boxGeometry args={[0.22, 0.07, 0.22]} />
          <meshLambertMaterial color={CAPELLI} />
        </mesh>
        <mesh position={[-0.1, 1.6, 0]}>
          <boxGeometry args={[0.05, 0.14, 0.22]} />
          <meshLambertMaterial color={CAPELLI} />
        </mesh>
        <Braccio z={0.26} fase={Math.PI} rt={rt} />
        <Braccio z={-0.26} fase={0} rt={rt} />
      </group>
      <Gamba z={0.09} fase={0} rt={rt} />
      <Gamba z={-0.09} fase={Math.PI} rt={rt} />
    </group>
  );
});
