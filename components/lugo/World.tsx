'use client';

// Il mondo di gioco: luce da tramonto romagnolo, cupola del cielo a
// gradiente, nebbia in tinta, e la città generata dai dati OSM.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CityMeshes } from './CityMeshes';
import { Landmarks } from './Landmarks';
import { Missioni } from './Missioni';
import { Npcs } from './Npcs';
import { Player } from './Player';
import { Props } from './Props';
import { Veicoli } from './Veicoli';
import { Insegne } from './Insegne';
import { Arredi } from './Arredi';
import { useMondo } from '@/lib/lugo/loadMap';
import { runtime } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';
import { LUCE, PALETTE } from '@/lib/lugo/palette';

function Cielo() {
  const { geometria, materiale } = useMemo(() => {
    const geometria = new THREE.SphereGeometry(1500, 24, 12);
    const materiale = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        alto: { value: new THREE.Color(PALETTE.cielo.alto) },
        basso: { value: new THREE.Color(PALETTE.cielo.basso) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 alto;
        uniform vec3 basso;
        varying vec3 vDir;
        void main() {
          float t = smoothstep(-0.08, 0.5, vDir.y);
          gl_FragColor = vec4(mix(basso, alto, t), 1.0);
        }
      `,
    });
    return { geometria, materiale };
  }, []);
  return (
    <group>
      <mesh geometry={geometria} material={materiale} frustumCulled={false} />
      {/* il sole basso a ovest, con l'alone */}
      <mesh position={[-1030, 300, 256]} ref={(m) => m?.lookAt(0, 120, 0)}>
        <circleGeometry args={[52, 24]} />
        <meshBasicMaterial color="#FFE9B8" fog={false} />
      </mesh>
      <mesh position={[-1026, 299, 255]} ref={(m) => m?.lookAt(0, 120, 0)}>
        <circleGeometry args={[130, 24]} />
        <meshBasicMaterial color="#FF9E5E" transparent opacity={0.28} fog={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Il sole basso da ovest insegue il giocatore: le ombre valgono ovunque. */
function SoleCheSegue() {
  const luce = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const rt = runtime.rt;
    const l = luce.current;
    if (!rt || !l) return;
    const t = useLugo.getState().mode === 'auto' ? rt.auto : rt.persona;
    l.position.set(t.x + LUCE.sole.position[0], LUCE.sole.position[1], t.z + LUCE.sole.position[2]);
    if (!l.target.parent && l.parent) l.parent.add(l.target);
    l.target.position.set(t.x, 0, t.z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={luce}
      position={[...LUCE.sole.position]}
      color={LUCE.sole.color}
      intensity={LUCE.sole.intensity}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.05}
      shadow-camera-left={-110}
      shadow-camera-right={110}
      shadow-camera-top={110}
      shadow-camera-bottom={-110}
      shadow-camera-near={1}
      shadow-camera-far={500}
    />
  );
}

/** Espone lo stato ispezionabile per la verifica Playwright. */
function HookVerifica() {
  const mondo = useMondo();
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      pronto: true,
      edifici: mondo.buildings.length,
      strade: mondo.roads.length,
      poi: Object.fromEntries([...mondo.poi.values()].map((p) => [p.id, { x: p.xm, z: p.zm, nome: p.nome }])),
    };
  }, [mondo]);
  return null;
}

export function World() {
  return (
    <>
      <fog attach="fog" args={[LUCE.nebbia.colore, LUCE.nebbia.vicino, LUCE.nebbia.lontano]} />
      <ambientLight color={LUCE.ambient.color} intensity={LUCE.ambient.intensity} />
      <hemisphereLight
        color={LUCE.hemi.cielo}
        groundColor={LUCE.hemi.terra}
        intensity={LUCE.hemi.intensity}
      />
      <SoleCheSegue />
      <Cielo />
      <CityMeshes senzaLandmark={['pavaglione', 'rocca', 'stazione']} />
      <Landmarks />
      <Props />
      <Veicoli />
      <Insegne />
      <Arredi />
      <Player />
      <Npcs />
      <Missioni />
      <HookVerifica />
    </>
  );
}
