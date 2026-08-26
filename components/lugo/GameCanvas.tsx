'use client';

// Il canvas di gioco: tone mapping neutro come il resto del sito, qualità
// adattiva misurata dal frame time (mai dallo user agent), niente
// postprocessing — il tramonto lo fa la luce, non i filtri.

import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { World } from './World';
import { useLugo, DPR_PER_TIER, type QualitaTier } from '@/lib/lugo/store';
import { LUCE } from '@/lib/lugo/palette';
import { QA } from '@/lib/lugo/qa';

function QualityManager() {
  const setDpr = useThree((s) => s.setDpr);
  const qualita = useLugo((s) => s.qualita);
  const setQualita = useLugo((s) => s.setQualita);
  const ema = useRef(16);
  const ultimoCambio = useRef(0);

  useFrame((_, dt) => {
    ema.current += (Math.min(dt * 1000, 100) - ema.current) * 0.05;
    const ora = performance.now();
    if (ora - ultimoCambio.current < 2500) return;
    let next: QualitaTier | null = null;
    if (ema.current > 26 && qualita !== 'bassa') next = qualita === 'alta' ? 'media' : 'bassa';
    else if (ema.current < 13 && qualita !== 'alta') next = qualita === 'bassa' ? 'media' : 'alta';
    if (next) {
      ultimoCambio.current = ora;
      setQualita(next);
      setDpr(Math.min(DPR_PER_TIER[next], typeof window !== 'undefined' ? window.devicePixelRatio : 1.5));
    }
  });
  return null;
}

export function GameCanvas() {
  return (
    <Canvas
      className="lugo-canvas"
      shadows={!QA}
      camera={{ position: [80, 120, 180], fov: 55, near: 0.5, far: 2000 }}
      dpr={QA ? 0.7 : [1, 1.75]}
      gl={{ antialias: !QA, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = LUCE.toneMappingExposure;
      }}
    >
      <QualityManager />
      <Suspense fallback={null}>
        <World />
      </Suspense>
    </Canvas>
  );
}
