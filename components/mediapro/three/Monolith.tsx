'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from '../gsap';
import { scroll, damp } from './scrollState';

const SIZE = 2.35;
const THICK = 0.15;
/** Distanza a riposo di ogni pannello dal centro. */
const REST = SIZE / 2 - THICK / 2;

/** Le sei facce, ognuna con la propria normale e il proprio orientamento. */
const FACES: { n: [number, number, number]; r: [number, number, number] }[] = [
  { n: [0, 0, 1], r: [0, 0, 0] },
  { n: [0, 0, -1], r: [0, Math.PI, 0] },
  { n: [1, 0, 0], r: [0, Math.PI / 2, 0] },
  { n: [-1, 0, 0], r: [0, -Math.PI / 2, 0] },
  { n: [0, 1, 0], r: [-Math.PI / 2, 0, 0] },
  { n: [0, -1, 0], r: [Math.PI / 2, 0, 0] },
];

/**
 * Il cubo, costruito da sei pannelli invece che da un solido unico: è ciò che
 * gli permette di aprirsi davvero più avanti nella sequenza. Da chiuso le
 * fessure fra i pannelli si leggono come le giunzioni di un oggetto lavorato.
 *
 * L'ingresso è una caduta con peso: accelera, decelera prima dell'impatto,
 * rimbalza due volte con ampiezza decrescente e nel frattempo ruota su due
 * assi. Non è una molla elastica da cartone animato — le durate sono tarate
 * perché sembri massa, non gomma.
 */
export function Monolith() {
  const group = useRef<THREE.Group>(null);
  const cube = useRef<THREE.Group>(null);
  const panels = useRef<(THREE.Mesh | null)[]>([]);
  const orbitA = useRef<THREE.Group>(null);
  const orbitB = useRef<THREE.Group>(null);
  const sphereA = useRef<THREE.Mesh>(null);
  const sphereB = useRef<THREE.Mesh>(null);

  // Valori guidati dalla timeline d'ingresso e letti in useFrame.
  const entry = useMemo(() => ({ y: 15, rx: 0.95, ry: -1.35, landed: 0 }), []);
  const spin = useRef(0);
  const prevY = useRef(15);
  const impulse = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      entry.y = 0;
      entry.rx = -0.16;
      entry.ry = 0.62;
      entry.landed = 1;
      return;
    }

    const tl = gsap.timeline({ delay: 0.25 });
    // caduta: accelera come sotto gravità
    tl.to(entry, { y: 0, duration: 1.15, ease: 'power2.in' });
    // primo rimbalzo, ampio ma corto
    tl.to(entry, { y: 0.92, duration: 0.34, ease: 'power2.out' });
    tl.to(entry, { y: 0, duration: 0.3, ease: 'power2.in' });
    // secondo rimbalzo, un terzo del primo
    tl.to(entry, { y: 0.28, duration: 0.22, ease: 'power2.out' });
    tl.to(entry, { y: 0, duration: 0.2, ease: 'power2.in' });
    // assestamento appena percettibile
    tl.to(entry, { y: 0.06, duration: 0.14, ease: 'power2.out' });
    tl.to(entry, { y: 0, duration: 0.14, ease: 'power2.in' });
    tl.to(entry, { landed: 1, duration: 0.01 });
    // la rotazione attraversa tutta la caduta e si assesta dopo l'impatto
    tl.to(entry, { rx: -0.16, ry: 0.62, duration: 2.4, ease: 'power3.out' }, 0);

    return () => {
      tl.kill();
    };
  }, [entry]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = scroll.hero;
    const d = Math.min(dt, 0.05);

    // velocità verticale del cubo: serve a far reagire le sfere all'impatto
    const vy = (entry.y - prevY.current) / Math.max(d, 0.001);
    prevY.current = entry.y;
    // l'urto verso il basso genera un impulso che si smorza da solo
    if (vy < -6) impulse.current = Math.min(1, impulse.current + Math.abs(vy) * 0.02);
    impulse.current = damp(impulse.current, 0, 2.6, d);

    if (cube.current) {
      const idle = entry.landed;
      cube.current.position.y = entry.y + idle * Math.sin(t * 0.32) * 0.055;
      cube.current.rotation.y = entry.ry + idle * t * 0.045 + p * 0.72;
      cube.current.rotation.x = entry.rx + idle * Math.sin(t * 0.2) * 0.04 + p * 0.14;
      cube.current.rotation.z = idle * Math.sin(t * 0.13) * 0.015;
    }

    // Apertura: i pannelli si allontanano lungo la propria normale nell'ultimo
    // tratto dell'hero, restano aperti per tutto il portfolio e si richiudono
    // uscendone — il cubo si ricompone e torna un oggetto solo, in lontananza.
    const back = scroll.after;
    const open = (Math.max(0, (p - 0.72) / 0.28) + scroll.cases * 0.35) * (1 - back);
    panels.current.forEach((m, i) => {
      if (!m) return;
      const n = FACES[i].n;
      const push = REST + open * 1.9;
      m.position.set(n[0] * push, n[1] * push, n[2] * push);
      m.rotation.z = FACES[i].r[2] + open * 0.24 * (i % 2 ? 1 : -1);
    });

    // Le sfere accelerano con lo scroll e vengono spinte fuori dall'impatto.
    spin.current += d * (0.09 + p * 0.72);
    const s = spin.current;
    const kick = 1 + impulse.current * 0.55;
    if (orbitA.current) {
      orbitA.current.rotation.y = s * 0.9;
      orbitA.current.rotation.z = Math.sin(t * 0.28) * 0.16 - impulse.current * 0.22;
      orbitA.current.scale.setScalar(kick);
    }
    if (orbitB.current) {
      orbitB.current.rotation.y = -s * 0.62 + 1.7;
      orbitB.current.rotation.x = 0.42 + Math.sin(t * 0.22) * 0.12 + impulse.current * 0.3;
      orbitB.current.scale.setScalar(1 + impulse.current * 0.38);
    }
    // rimbalzano anche loro, in ritardo rispetto al cubo
    if (sphereA.current) sphereA.current.position.y = 0.55 + impulse.current * 0.5;
    if (sphereB.current) sphereB.current.position.y = -0.7 - impulse.current * 0.42;

    if (group.current) {
      const heroShift = Math.max(0, (p - 0.42) / 0.58);
      const drift = Math.max(0, scroll.page - 0.3) / 0.7;
      // durante il portfolio il cubo torna al centro: è il contenitore da cui
      // esce la materia di ogni progetto
      const near = 1 - scroll.cases;
      const x = heroShift * 2.7 * near + drift * 1.6 * near + back * 3.1;
      group.current.position.x = damp(group.current.position.x, x, 3, d);
      // Dopo il portfolio scende in profondità: la nebbia se ne prende una
      // parte e quello che resta è una sagoma lontana, non un oggetto che
      // passa davanti al testo.
      const z = drift * -2.6 * near - back * 7.4;
      group.current.position.z = damp(group.current.position.z, z, 3, d);
      const y = drift * -0.6 * near + back * 1.5;
      group.current.position.y = damp(group.current.position.y, y, 3, d);
      // Aprendosi il cubo si fa da parte senza sparire: resta il contenitore
      // riconoscibile da cui la materia è uscita, ma non deve più dominare
      // l'inquadratura, che ora appartiene al progetto.
      const shrink = (1 - scroll.cases * 0.92) * (1 - back * 0.68);
      group.current.scale.setScalar(damp(group.current.scale.x, shrink, 3, d));
      // sotto una certa soglia sparisce del tutto: nelle stanze dei clienti
      // il campo appartiene al cubo del marchio, non piu' a questo
      group.current.visible = scroll.cases < 0.92;
    }
  });

  return (
    <group ref={group}>
      <group ref={cube}>
        {FACES.map((f, i) => (
          <RoundedBox
            key={i}
            ref={(m: THREE.Mesh) => {
              panels.current[i] = m;
            }}
            args={[SIZE, SIZE, THICK]}
            radius={0.06}
            smoothness={4}
            rotation={f.r}
            castShadow
          >
            <meshPhysicalMaterial
              color="#26262a"
              metalness={0.58}
              roughness={0.26}
              clearcoat={1}
              clearcoatRoughness={0.12}
              envMapIntensity={2.2}
              side={THREE.DoubleSide}
            />
          </RoundedBox>
        ))}
      </group>

      <group ref={orbitA}>
        <mesh ref={sphereA} position={[1.75, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.38, 48, 48]} />
          <meshPhysicalMaterial color="#d8d8d8" metalness={1} roughness={0.13} envMapIntensity={1.9} />
        </mesh>
      </group>

      <group ref={orbitB}>
        <mesh ref={sphereB} position={[1.85, -0.7, 0.4]} castShadow>
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
