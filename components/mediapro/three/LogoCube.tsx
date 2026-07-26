'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';
import { blendWorlds, WORLDS } from './worlds';
import { asset } from '@/lib/asset';

const FACES = ['bufala', 'mou', 'mondial', 'aurea', 'woman'] as const;

/**
 * Il cubo del cliente: una scatola con il marchio stampato sulle facce, che
 * ruota lenta al centro della sua stanza.
 *
 * Il cambio di cliente non è uno scambio di texture a vista. Avvicinandosi al
 * confine fra due progetti il cubo si ritrae e si spegne, la texture cambia
 * mentre non lo si vede, e poi torna: si legge come uscire da una stanza ed
 * entrare nella successiva, non come un'immagine che salta.
 */
export function LogoCube() {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const shown = useRef(-1);

  const textures = useTexture(FACES.map((f) => asset(`/assets/mediapro/face-${f}.png`)));

  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    });
  }, [textures]);

  useFrame((state, dt) => {
    if (!group.current || !mesh.current || !mat.current) return;
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const w = blendWorlds(scroll.world);

    // Distanza dal centro del progetto più vicino: 0 = dentro la stanza,
    // 0.5 = esattamente sulla soglia fra due stanze.
    const nearest = Math.round(scroll.world);
    const edge = Math.abs(scroll.world - nearest);
    // presenza: piena dentro la stanza, nulla sulla soglia
    const presence = Math.max(0, 1 - edge * 2.6) * scroll.cases;

    // `nearest` cambia esattamente sulla soglia fra due stanze, dove la
    // presenza è già zero: lo scambio di texture è quindi sempre coperto,
    // senza bisogno di condizioni sull'opacità — che anzi, scorrendo veloce,
    // potevano non verificarsi mai e lasciare il marchio sbagliato in scena.
    const idx = Math.max(0, Math.min(FACES.length - 1, nearest));
    if (shown.current !== idx) {
      shown.current = idx;
      mat.current.map = textures[idx];
      mat.current.needsUpdate = true;
    }

    if (mat.current.map) mat.current.emissiveMap = mat.current.map;
    mat.current.emissive.set('#ffffff');
    mat.current.emissiveIntensity = 0.42;

    // Il cubo segue l'angolo dell'orbita della camera, con un dondolio sopra:
    // ruota sempre, ma una faccia resta rivolta verso chi guarda. Con una
    // rotazione libera il marchio finiva di taglio proprio mentre lo si legge.
    const camAngle = -0.35 + scroll.world * 0.78;
    mesh.current.rotation.y = camAngle + Math.sin(t * 0.24) * 0.3;
    mesh.current.rotation.x = Math.sin(t * 0.3) * 0.09;
    group.current.position.y = damp(
      group.current.position.y,
      Math.sin(t * 0.55) * 0.12,
      3,
      d
    );
    // La presenza guida la scala, non l'opacità: un cubo semitrasparente
    // lascia leggere in trasparenza il testo speculare della faccia opposta.
    const s = presence * 1.12;
    group.current.scale.setScalar(damp(group.current.scale.x, s, 5, d));
    group.current.position.z = damp(group.current.position.z, (1 - presence) * -3.2, 4, d);
    group.current.visible = presence > 0.02;
  });

  return (
    <group ref={group}>
      <RoundedBox ref={mesh} args={[2.1, 2.1, 2.1]} radius={0.1} smoothness={5} castShadow>
        {/* I marchi vivono su fondo chiaro: a piena illuminazione andavano in
            bianco pieno e il logo spariva. Il colore di base fa da freno, e la
            componente emissiva tiene la stampa leggibile anche in ombra. */}
        <meshPhysicalMaterial
          ref={mat}
          color="#6f6f6f"
          metalness={0.05}
          roughness={0.62}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
          envMapIntensity={0.25}
        />
      </RoundedBox>
    </group>
  );
}

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

export { WORLDS };
