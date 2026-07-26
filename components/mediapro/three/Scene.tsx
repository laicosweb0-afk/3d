'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Monolith } from './Monolith';
import { Matter } from './Matter';
import { LogoCube, Room } from './LogoCube';
import { Dust } from './Dust';
import { Rig } from './Rig';
import { scroll } from './scrollState';
import { blendWorlds } from './worlds';

/**
 * Qualità adattiva: misura il tempo di frame reale e abbassa la risoluzione se
 * serve, invece di indovinare dal dispositivo. Una macchina lenta perde
 * nitidezza, non fluidità.
 */
function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr);
  const ema = useRef(16);
  const last = useRef(0);
  const level = useRef(1.6);

  useFrame((state, dt) => {
    ema.current += (Math.min(dt * 1000, 100) - ema.current) * 0.05;
    const now = state.clock.elapsedTime * 1000;
    if (now - last.current < 2000) return;
    let next = level.current;
    if (ema.current > 26) next = Math.max(0.85, level.current - 0.35);
    else if (ema.current < 13) next = Math.min(1.6, level.current + 0.25);
    if (next !== level.current) {
      level.current = next;
      last.current = now;
      setDpr(Math.min(next, window.devicePixelRatio));
    }
  });
  return null;
}

/**
 * Atmosfera guidata dal progetto: la nebbia e le luci cambiano tinta insieme
 * alla materia. È il motivo per cui passando da un mondo all'altro cambia
 * tutto l'ambiente, non solo gli oggetti.
 */
function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const w = blendWorlds(scroll.world);
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.lerp(w.fog, 0.06);
      fog.density += (w.fogDensity * (0.55 + scroll.cases * 0.45) - fog.density) * 0.06;
    }
    if (key.current) {
      key.current.color.lerp(w.light, 0.06);
      // la chiave si muove piano: i riflessi sul cubo cambiano di continuo
      key.current.position.set(Math.sin(t * 0.12) * 6, 5.5 + Math.sin(t * 0.09) * 1.4, 4);
    }
    if (rim.current) {
      rim.current.color.lerp(w.light, 0.06);
      rim.current.intensity = 14 + Math.sin(t * 0.4) * 4;
    }
  });

  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight ref={key} position={[5, 6, 4]} intensity={2.6} color="#ffe3b8" />
      <directionalLight position={[-6, -2, -4]} intensity={1.5} color="#8fa6d4" />
      <pointLight ref={rim} position={[0, -2.4, 2.2]} intensity={16} distance={9} color="#d6b37a" />
    </>
  );
}

/** Messa a fuoco che segue il centro della scena, come una vera ottica. */
function Optics() {
  const dof = useRef<any>(null);
  useFrame(({ camera }) => {
    if (!dof.current) return;
    const dist = camera.position.length();
    const t = dof.current.circleOfConfusionMaterial;
    if (t) t.worldFocusDistance = dist;
  });
  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      {/* bokeh contenuto: più alto gonfia gli oggetti fuori fuoco fino a
          coprire il testo, e la scena diventa una macchia */}
      <DepthOfField ref={dof} worldFocusRange={11} bokehScale={1.9} />
      <Bloom intensity={0.72} luminanceThreshold={0.62} luminanceSmoothing={0.3} mipmapBlur />
      <Vignette offset={0.28} darkness={0.62} />
    </EffectComposer>
  );
}

export function Scene() {
  return (
    <div className="mp-canvas" aria-hidden>
      <Canvas
        dpr={[0.85, 1.6]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 38, near: 0.1, far: 60, position: [0.5, 1.7, 13.4] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        {/* la nebbia è ciò che dà distanza: senza, il fondo resta piatto */}
        <fogExp2 attach="fog" args={['#090909', 0.03]} />

        <Suspense fallback={null}>
          <Atmosphere />

          {/* Environment procedurale: riflessi sui metalli senza scaricare HDRI.
              Il pannello largo davanti è quello che salva l'oggetto: senza una
              sorgente ampia dal lato della camera, le facce rivolte a noi non
              hanno nulla da riflettere e restano silhouette. */}
          <Environment resolution={192}>
            <Lightformer form="rect" intensity={0.85} color="#8792a6" position={[0, 0, 9]} scale={[16, 16, 1]} />
            <Lightformer form="rect" intensity={4} color="#fff0d6" position={[4, 5, 3]} scale={[8, 8, 1]} />
            <Lightformer form="rect" intensity={2} color="#9fb4de" position={[-6, -1, -4]} scale={[9, 9, 1]} />
            <Lightformer form="circle" intensity={3} color="#d6b37a" position={[0, -4, 3]} scale={[5, 5, 1]} />
          </Environment>

          <Monolith />
          <Matter />
          <LogoCube />
          <Room />
          <Dust />
        </Suspense>

        <Rig />
        <AdaptiveDpr />
        <Optics />
      </Canvas>
    </div>
  );
}
