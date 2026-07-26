'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';
import { blendWorlds } from './worlds';
import { asset } from '@/lib/asset';

const IDS = ['bufala', 'mou', 'mondial', 'aurea', 'woman'] as const;

/**
 * L'oggetto iconico di ogni cliente. Niente cubi generici: la forma racconta
 * il marchio prima ancora che si legga il nome.
 *
 *  - Bufala   sfera di latte, materia morbida e opaca
 *  - MOU      cartone del latte, superficie di carta
 *  - Mondial  dado esagonale in acciaio, l'attrezzo del mestiere
 *  - Aurea    anello, il nodo infinito della rete
 *  - Woman    vaso cosmetico in vetro satinato
 */
type Spec = {
  /** Materiale dell'oggetto. */
  color: string;
  metalness: number;
  roughness: number;
  transmission: number;
  /** Dimensione e posizione della stampa del marchio sulla superficie. */
  print: { w: number; y: number; z: number };
};

/**
 * La stampa deve stare DENTRO alla superficie che la ospita: larghezza e
 * profondità sono calcolate sulla geometria di ciascun oggetto, non scelte a
 * occhio. Un marchio che deborda dall'oggetto è esattamente l'effetto adesivo
 * da evitare.
 */
const SPECS: Record<(typeof IDS)[number], Spec> = {
  // sfera r=1.42: la stampa sta sulla calotta frontale
  bufala: { color: '#f6f3ec', metalness: 0.02, roughness: 0.66, transmission: 0, print: { w: 1.5, y: 0, z: 1.36 } },
  // cartone largo 1.7, semiprofondità 0.85
  mou: { color: '#e8e2d4', metalness: 0.02, roughness: 0.78, transmission: 0, print: { w: 1.4, y: -0.1, z: 0.87 } },
  // dado esagonale: asse lungo Z, faccia piatta a z = 0.31
  mondial: { color: '#a7b0ba', metalness: 1, roughness: 0.3, transmission: 0, print: { w: 1.95, y: 0, z: 0.33 } },
  // anello r=1.18: la stampa vive nel vuoto centrale
  aurea: { color: '#e7dfd2', metalness: 0.5, roughness: 0.12, transmission: 0, print: { w: 1.7, y: 0, z: 0.34 } },
  // vaso r=1.08: stampa sul fronte del corpo
  woman: { color: '#efe9ee', metalness: 0.1, roughness: 0.16, transmission: 0.55, print: { w: 1.45, y: -0.28, z: 1.1 } },
};

function Shape({ id }: { id: (typeof IDS)[number] }) {
  if (id === 'bufala') {
    return (
      <mesh castShadow>
        <sphereGeometry args={[1.42, 64, 64]} />
        <ObjMaterial id={id} />
      </mesh>
    );
  }
  if (id === 'mou') {
    // cartone del latte: corpo squadrato e cimosa superiore
    return (
      <group>
        <mesh castShadow position={[0, -0.15, 0]}>
          <boxGeometry args={[1.7, 2.3, 1.7]} />
          <ObjMaterial id={id} />
        </mesh>
        <mesh castShadow position={[0, 1.14, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.7, 0.34, 0.14]} />
          <ObjMaterial id={id} />
        </mesh>
      </group>
    );
  }
  if (id === 'mondial') {
    // dado esagonale: sei lati, non un cilindro
    return (
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.62, 6]} />
        <ObjMaterial id={id} />
      </mesh>
    );
  }
  if (id === 'aurea') {
    return (
      <mesh castShadow rotation={[0.35, 0, 0]}>
        <torusGeometry args={[1.18, 0.3, 32, 96]} />
        <ObjMaterial id={id} />
      </mesh>
    );
  }
  // woman: vaso cosmetico con coperchio
  return (
    <group>
      <mesh castShadow position={[0, -0.28, 0]}>
        <cylinderGeometry args={[1.08, 1.08, 1.15, 64]} />
        <ObjMaterial id={id} />
      </mesh>
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[1.14, 1.14, 0.3, 64]} />
        <ObjMaterial id={id} />
      </mesh>
    </group>
  );
}

function ObjMaterial({ id }: { id: (typeof IDS)[number] }) {
  const s = SPECS[id];
  return (
    <meshPhysicalMaterial
      color={s.color}
      metalness={s.metalness}
      roughness={s.roughness}
      transmission={s.transmission}
      thickness={s.transmission > 0 ? 1.2 : 0}
      clearcoat={0.6}
      clearcoatRoughness={0.2}
      envMapIntensity={1.1}
    />
  );
}

/**
 * La stampa del marchio sulla superficie.
 *
 * È un piano appoggiato alla superficie con il PNG trasparente del cliente:
 * niente riquadro, niente fondo, solo il segno. Riceve le luci della stanza
 * con la stessa rugosità dell'oggetto, quindi si comporta come una
 * serigrafia — non come un adesivo che ignora l'illuminazione. Il
 * `polygonOffset` la tiene incollata alla superficie senza sfarfallii.
 */
function Print({ id, tex }: { id: (typeof IDS)[number]; tex: THREE.Texture }) {
  const s = SPECS[id];
  const ratio = tex.image ? tex.image.width / tex.image.height : 2;
  return (
    <mesh position={[0, s.print.y, s.print.z]}>
      <planeGeometry args={[s.print.w, s.print.w / ratio]} />
      <meshPhysicalMaterial
        map={tex}
        transparent
        alphaTest={0.02}
        roughness={Math.min(0.85, s.roughness + 0.08)}
        metalness={s.metalness * 0.4}
        envMapIntensity={0.8}
        polygonOffset
        polygonOffsetFactor={-6}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Gli oggetti dei cinque clienti. Solo quello del progetto corrente è in
 * scena: sulla soglia fra due stanze la presenza va a zero, quindi il ricambio
 * avviene mentre non si vede nulla.
 */
export function Objects() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const slots = useRef<(THREE.Group | null)[]>([]);

  const textures = useTexture(IDS.map((f) => asset(`/assets/mediapro/lg-${f}.png`)));
  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
  }, [textures]);

  useFrame((state, dt) => {
    if (!group.current || !inner.current) return;
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const w = blendWorlds(scroll.world);

    const nearest = Math.round(scroll.world);
    const edge = Math.abs(scroll.world - nearest);
    const presence = Math.max(0, 1 - edge * 2.6) * scroll.cases;
    const idx = Math.max(0, Math.min(IDS.length - 1, nearest));

    slots.current.forEach((g, i) => {
      if (g) g.visible = i === idx;
    });

    // segue l'angolo dell'orbita: una faccia resta sempre verso chi guarda
    const camAngle = -0.35 + scroll.world * 0.78;
    inner.current.rotation.y = camAngle + Math.sin(t * 0.22) * 0.26;
    inner.current.rotation.x = Math.sin(t * 0.3) * 0.07;

    group.current.position.y = damp(group.current.position.y, Math.sin(t * 0.5) * 0.13, 3, d);
    group.current.scale.setScalar(damp(group.current.scale.x, presence * 1.05, 5, d));
    group.current.position.z = damp(group.current.position.z, (1 - presence) * -3.4, 4, d);
    group.current.visible = presence > 0.02;
    void w;
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        {IDS.map((id, i) => (
          <group
            key={id}
            ref={(g) => {
              slots.current[i] = g;
            }}
            visible={i === 0}
          >
            <Shape id={id} />
            <Print id={id} tex={textures[i]} />
          </group>
        ))}
      </group>
    </group>
  );
}
