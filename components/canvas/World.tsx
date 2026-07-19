'use client';

// Il mondo 3D: canvas fisso, una scena, una camera, qualità adattiva.

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
      camera={{ position: [0, 2.2, 16.5], fov: 40, near: 0.1, far: 120 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color('#FAFAF8');
      }}
    >
      <ambientLight intensity={0.75} />
      <hemisphereLight intensity={0.5} color="#FFFFFF" groundColor="#D8D4CC" />
      <directionalLight position={[6, 11, 5]} intensity={1.35} />
      <directionalLight position={[-8, 6, -6]} intensity={0.35} />
      <CameraRig />
      <QualityManager />
      <Ground />
      <CadLines />
      <Villa />
    </Canvas>
  );
}
