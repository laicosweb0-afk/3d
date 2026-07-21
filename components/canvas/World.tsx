'use client';

// Il mondo 3D: canvas fisso, una scena, una camera, qualità adattiva.
// Luce M2: softbox da studio (environment procedurale, nessuna rete),
// chiave calda + controluce fredda, ombre di contatto sul foglio.

import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { CameraRig } from './rig/CameraRig';
import { Villa, Ground } from './scenes/Villa';
import { CadLines } from './scenes/CadLines';
import { useApp, DPR_BY_TIER, type QualityTier } from '@/lib/store';

/** Qualità adattiva: decide dal frame time misurato, mai dallo user agent. */
function QualityManager() {
  const setDpr = useThree((s) => s.setDpr);
  const quality = useApp((s) => s.quality);
  const setQuality = useApp((s) => s.setQuality);
  const ema = useRef(16);
  const lastChange = useRef(0);

  useFrame((_, dt) => {
    ema.current += (Math.min(dt * 1000, 100) - ema.current) * 0.05;
    const now = performance.now();
    if (now - lastChange.current < 2500) return;
    let next: QualityTier | null = null;
    if (ema.current > 26 && quality !== 'low') next = quality === 'high' ? 'mid' : 'low';
    else if (ema.current < 13 && quality !== 'high') next = quality === 'low' ? 'mid' : 'high';
    if (next) {
      lastChange.current = now;
      setQuality(next);
      setDpr(Math.min(DPR_BY_TIER[next], typeof window !== 'undefined' ? window.devicePixelRatio : 1.5));
    }
  });
  return null;
}

export function World() {
  return (
    <Canvas
      className="world-canvas"
      shadows="soft"
      camera={{ position: [0, 2.2, 16.5], fov: 40, near: 0.1, far: 120 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color('#FAFAF8');
        // Neutral (Khronos PBR): preserva bianchi e fedeltà dei materiali
        // reali — niente cast crema dell'ACES. È ciò che allinea la
        // materia 3D alle fotografie del portfolio.
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <ambientLight intensity={0.5} />
      <hemisphereLight intensity={0.38} color="#FFFFFF" groundColor="#D8D4CC" />
      <directionalLight
        position={[6, 11, 5]}
        intensity={1.2}
        color="#FFF6EA"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-far={40}
      />
      <directionalLight position={[-8, 6, -6]} intensity={0.3} color="#EAF0F4" />
      {/* fill interni: le stanze devono avere la stessa luce ariosa delle
          foto reali. Due sorgenti morbide (zona giorno + bagno), calde
          ma non gialle, che non toccano il mondo bianco esterno. */}
      <pointLight position={[1.2, 2.4, 0.5]} intensity={0.9} color="#FFF0DE" distance={16} decay={1.25} />
      <pointLight position={[-2.8, 2.4, -2.4]} intensity={0.7} color="#FFF3E6" distance={13} decay={1.25} />
      <CameraRig />
      <QualityManager />
      <Suspense fallback={null}>
        <Environment resolution={128} environmentIntensity={0.58}>
          {/* softbox da studio: pannelli morbidi, un cielo chiaro, un tocco caldo laterale */}
          <Lightformer intensity={2.2} position={[0, 6, -9]} scale={[12, 6, 1]} color="#FFFFFF" />
          <Lightformer intensity={1.2} position={[-8, 4, 3]} rotation-y={Math.PI / 2.6} scale={[8, 4, 1]} color="#FFF3E4" />
          <Lightformer intensity={0.9} position={[9, 3, 2]} rotation-y={-Math.PI / 2.6} scale={[7, 4, 1]} color="#EAF0F4" />
          <Lightformer intensity={1.4} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} color="#FDFDFB" />
        </Environment>
        <Ground />
        <CadLines />
        <Villa />
        <ContactShadows
          position={[0, 0.002, 0]}
          scale={34}
          blur={2.2}
          far={5.5}
          opacity={0.32}
          resolution={512}
          frames={Infinity}
          color="#3A3730"
        />
      </Suspense>
    </Canvas>
  );
}
