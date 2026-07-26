'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll } from './scrollState';
import { blendWorlds } from './worlds';

/**
 * Il pulviscolo sospeso: dà scala e profondità alla scena, e attraversando il
 * campo mentre la camera avanza è ciò che rende leggibile il movimento.
 *
 * Le posizioni sono generate con un seme fisso: la scena deve essere identica
 * a ogni caricamento, non casuale a ogni visita.
 */
const COUNT = 420;

export function Dust() {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    // generatore deterministico (mulberry32)
    let seed = 0x9e3779b9;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const positions = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // distribuite in un cilindro attorno all'asse della camera
      const r = 3 + rand() * 9;
      const a = rand() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (rand() - 0.5) * 13;
      positions[i * 3 + 2] = -14 + rand() * 22;
      scales[i] = 0.5 + rand() * 1.4;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    return g;
  }, []);

  useFrame((state, dt) => {
    if (!points.current) return;
    const t = state.clock.elapsedTime;
    const w = blendWorlds(scroll.world);
    // deriva lentissima + leggera reazione al puntatore; nei mondi "veloci"
    // (l'officina) il pulviscolo si muove come scintille, non come polvere
    points.current.rotation.y = t * 0.014 * w.speed * 2 + scroll.pointer.x * 0.05;
    points.current.position.y = Math.sin(t * 0.1) * 0.32 + scroll.pointer.y * 0.18;

    const m = points.current.material as THREE.PointsMaterial;
    // mentre la camera entra il pulviscolo si dirada; nel portfolio prende
    // colore e densità dal mondo del progetto corrente
    const base = 0.55 - scroll.hero * 0.22;
    m.opacity = base * (1 - scroll.cases) + 0.5 * w.dust * scroll.cases;
    m.size = 0.045 + scroll.cases * (w.dust - 1) * 0.02;
    m.color.lerp(w.light, scroll.cases * 0.08);
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.045}
        sizeAttenuation
        color="#d6b37a"
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
