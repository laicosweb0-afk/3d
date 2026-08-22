'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { orologio, percorso, passaggio, richiamo } from '@/lib/cartone/tempo';
import { Prodotto } from './Prodotto';
import { Pro } from './Pro';
import { Pubblico } from './Pubblico';
import { Misure } from './Misure';
import { Studio } from './Studio';
import { Campagna } from './Campagna';

/**
 * La regia.
 *
 * La camera è scritta a pose, non a movimenti: si dichiara dove sta al
 * secondo che conta e l'interpolazione fa il resto. Le pose sono poche e
 * vicine tra loro — in verticale non c'è spazio per volare, e un movimento
 * ampio su un fotogramma alto e stretto si legge subito come una camera da
 * videogioco. Qui si respira e basta: un avvicinamento lento, due
 * spostamenti laterali minimi, un allargamento quando entra qualcosa.
 */

const CAMERA = [
  { t: 0, v: [0, 1.9, 6.9, 0, 1.1, 0] },
  { t: 3.0, v: [0.14, 1.95, 6.55, 0, 1.15, 0] },
  { t: 6.0, v: [0, 2.2, 7.45, 0, 1.75, 0] },
  { t: 9.0, v: [-0.36, 2.05, 6.6, 0.05, 1.72, 0] },
  { t: 12.5, v: [0.44, 2.0, 6.5, 0, 1.78, 0] },
  { t: 16.0, v: [-0.52, 1.95, 6.4, 0, 1.74, 0] },
  { t: 20.0, v: [0.16, 2.35, 7.2, 0.05, 2.05, 0] },
  { t: 23.5, v: [0, 2.0, 6.7, 0, 1.6, 0] },
  { t: 26.5, v: [0, 2.2, 6.1, 0, 2.05, 0] },
  { t: 30, v: [0, 2.4, 5.8, 0, 2.35, 0] },
];

/** Consegna al mondo esterno il modo di chiedere un disegno. */
function Richiamo() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    richiamo.invalida = invalidate;
    return () => {
      richiamo.invalida = () => {};
    };
  }, [invalidate]);
  return null;
}

function Regia() {
  const mira = useRef(new THREE.Vector3());
  useFrame(({ camera }) => {
    const t = orologio.t;
    const v = percorso(t, CAMERA);
    // Il respiro: tre centesimi di unità, invisibili da fermi e sufficienti
    // perché l'inquadratura non sembri un rendering immobile.
    const respiro = Math.sin(t * 0.42) * 0.035;
    camera.position.set(v[0] + respiro, v[1] + respiro * 0.6, v[2]);
    mira.current.set(v[3], v[4], v[5]);
    camera.lookAt(mira.current);
  });
  return null;
}

/** Le luci di base: quelle che ci sono sempre, anche a set spento. */
function Atmosfera() {
  const scena = useThree((s) => s.scene);
  const chiave = useRef<THREE.DirectionalLight>(null);
  const ambiente = useRef<THREE.AmbientLight>(null);
  const taglio = useRef<THREE.PointLight>(null);
  const riempimento = useRef<THREE.DirectionalLight>(null);
  const controluce = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const t = orologio.t;
    // All'inizio la scena è quasi al buio: il prodotto c'è ma non è
    // illuminato da nessuno. È metà del messaggio.
    // Da 0,45 a 1,9: l'inizio è sottoesposto di proposito, e la differenza
    // fra il prima e il dopo è metà di ciò che il corto racconta.
    const acceso = passaggio(t, 6.4, 9.0);
    // E si spengono sul congedo: alla firma resta acceso solo l'occhio.
    const spento = passaggio(t, 26.9, 28.4);
    if (chiave.current) chiave.current.intensity = (0.4 + acceso * 1.5) * (1 - spento);
    if (ambiente.current) ambiente.current.intensity = 0.1 * (1 - spento);
    // Anche i riflessi vanno spenti, non solo le lampade: il cielo
    // procedurale continua a illuminare il metallo anche a buio fatto, e
    // sulla firma la scatola resterebbe visibile sotto al marchio.
    scena.environmentIntensity = 1 - spento;
    if (riempimento.current) riempimento.current.intensity = 0.4 * (1 - spento);
    if (controluce.current) controluce.current.intensity = 9 * (1 - spento);
    if (taglio.current)
      taglio.current.intensity =
        (1.4 + passaggio(t, 8.4, 10.4) * 6 + passaggio(t, 12.8, 14.0) * 7) * (1 - spento);
  });

  return (
    <>
      <ambientLight ref={ambiente} intensity={0.1} />
      <directionalLight ref={chiave} position={[2.6, 5.4, 4.2]} intensity={1} color="#ffe6c2" castShadow shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.1, 22]} />
      </directionalLight>
      <directionalLight ref={riempimento} position={[-4.2, 1.6, -3.4]} intensity={0.4} color="#7f93c4" />
      {/* Il controluce: una sorgente piccola e vicina dietro a sinistra,
          non una direzionale. Serve a staccare la sagoma dal fondo — senza,
          la scatola al buio è un buco nell'immagine — ma deve illuminare
          *lei*, non il pavimento: una direzionale a quell'angolo accende
          tutto il piano e ribalta l'inquadratura, con il fondo più chiaro
          del soggetto. */}
      <pointLight ref={controluce} position={[-1.5, 2.9, -2.1]} intensity={9} distance={7} decay={2} color="#9fb0d8" />
      <pointLight ref={taglio} position={[0, 0.6, 2.6]} intensity={3} distance={9} color="#d6b37a" />
    </>
  );
}

function Pavimento() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
      <circleGeometry args={[22, 64]} />
      <meshStandardMaterial color="#0b0b0b" metalness={0.86} roughness={0.34} />
    </mesh>
  );
}

export function Scena({ perRendering = false }: { perRendering?: boolean }) {
  return (
    <Canvas
      className="ct-tela"
      // In rendering la risoluzione è fissa e piena: il file finale non deve
      // dipendere dal devicePixelRatio della macchina che lo produce.
      dpr={perRendering ? 1 : [1, 1.75]}
      shadows
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: perRendering,
        powerPreference: 'high-performance',
      }}
      frameloop={perRendering ? 'demand' : 'always'}
      camera={{ fov: 46, near: 0.1, far: 40, position: [0, 1.9, 6.9] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.02;
      }}
    >
      <color attach="background" args={['#060606']} />
      <fogExp2 attach="fog" args={['#060606', 0.055]} />

      <Suspense fallback={null}>
        <Atmosfera />
        {/* Riflessi procedurali: il filo d'oro sugli spigoli esiste solo se ha
            qualcosa da riflettere. Nessun HDRI da scaricare. */}
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={0.32} color="#8a93a6" position={[0, 1.5, 7]} scale={[10, 14, 1]} />
          <Lightformer form="rect" intensity={1.5} color="#fff0d6" position={[3.5, 5, 3]} scale={[6, 8, 1]} />
          <Lightformer form="rect" intensity={0.7} color="#9fb4de" position={[-4.5, 0.5, -3]} scale={[7, 9, 1]} />
        </Environment>

        <Pubblico />
        <Pavimento />
        <Prodotto />
        <Misure />
        <Campagna />
        <Pro />
        <Studio />
      </Suspense>

      <Regia />
      <Richiamo />
      <EffectComposer enableNormalPass={false} multisampling={perRendering ? 4 : 0}>
        {/* Soglia alta: deve entrare nel bagliore solo ciò che è davvero una
            sorgente — l'occhio, i pannelli, il lampo. Il resto no. */}
        <Bloom intensity={0.85} luminanceThreshold={0.78} luminanceSmoothing={0.24} mipmapBlur />
        <Vignette offset={0.24} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}
