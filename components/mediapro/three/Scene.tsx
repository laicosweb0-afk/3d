'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Monolith } from './Monolith';
import { Dust } from './Dust';
import { Rig } from './Rig';

/**
 * Qualità adattiva: misura il tempo di frame reale e abbassa la risoluzione se
 * serve, invece di indovinare dal dispositivo. Una macchina lenta perde
 * nitidezza, non fluidità.
 */
function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr);
  const ema = useRef(16);
  const last = useRef(0);
  const level = useRef(1.75);

  useFrame((state, dt) => {
    ema.current += (Math.min(dt * 1000, 100) - ema.current) * 0.05;
    const now = state.clock.elapsedTime * 1000;
    if (now - last.current < 2000) return;
    let next = level.current;
    if (ema.current > 26) next = Math.max(1, level.current - 0.35);
    else if (ema.current < 13) next = Math.min(1.75, level.current + 0.25);
    if (next !== level.current) {
      level.current = next;
      last.current = now;
      setDpr(Math.min(next, window.devicePixelRatio));
    }
  });
  return null;
}

export function Scene() {
  return (
    <div className="mp-canvas" aria-hidden>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 38, near: 0.1, far: 60, position: [0.5, 1.7, 13.2] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        {/* la nebbia è ciò che dà distanza: senza, il fondo resta piatto */}
        <fogExp2 attach="fog" args={['#090909', 0.058]} />

        <Suspense fallback={null}>
          {/* chiave dorata calda + controluce fredda: il contrasto disegna gli
              spigoli del cubo, che altrimenti sparirebbero sul nero */}
          <ambientLight intensity={0.42} />
          <directionalLight position={[5, 6, 4]} intensity={2.6} color="#ffe3b8" />
          <directionalLight position={[-6, -2, -4]} intensity={1.5} color="#8fa6d4" />
          <pointLight position={[0, -2.4, 2.2]} intensity={18} distance={9} color="#d6b37a" />

          {/* Environment procedurale: riflessi sui metalli senza scaricare HDRI.
              Il pannello largo davanti è quello che salva l'oggetto: senza una
              sorgente ampia dal lato della camera, le facce rivolte a noi non
              hanno nulla da riflettere e restano nere. */}
          <Environment resolution={192}>
            <Lightformer form="rect" intensity={0.85} color="#8792a6" position={[0, 0, 9]} scale={[16, 16, 1]} />
            <Lightformer form="rect" intensity={4} color="#fff0d6" position={[4, 5, 3]} scale={[8, 8, 1]} />
            <Lightformer form="rect" intensity={2} color="#9fb4de" position={[-6, -1, -4]} scale={[9, 9, 1]} />
            <Lightformer form="circle" intensity={3} color="#d6b37a" position={[0, -4, 3]} scale={[5, 5, 1]} />
          </Environment>

          <Monolith />
          <Dust />
        </Suspense>

        <Rig />
        <AdaptiveDpr />
      </Canvas>
    </div>
  );
}
