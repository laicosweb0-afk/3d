'use client';

// Il mondo di gioco: luce da tramonto romagnolo, cupola del cielo a
// gradiente, nebbia in tinta, e la città generata dai dati OSM.

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CityMeshes } from './CityMeshes';
import { Player } from './Player';
import { useMondo } from '@/lib/lugo/loadMap';
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
  return <mesh geometry={geometria} material={materiale} frustumCulled={false} />;
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
      <directionalLight
        position={[...LUCE.sole.position]}
        color={LUCE.sole.color}
        intensity={LUCE.sole.intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={1}
        shadow-camera-far={500}
      />
      <Cielo />
      <CityMeshes />
      <Player />
      <HookVerifica />
    </>
  );
}
