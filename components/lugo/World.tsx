'use client';

// Il mondo di gioco: pieno giorno come nelle viste 3D di Maps — cupola
// azzurra a gradiente, sole alto, nuvole bianche, foschia chiara — e la
// città generata dai dati OSM.

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
import { Festa } from './Festa';
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
      {/* le colline dell'Appennino a sud: una striscia bassa e sbiadita
          all'orizzonte, come nelle foto aeree */}
      {[
        [45, 1650, 560, 52], [62, 1580, 440, 40], [78, 1720, 640, 60],
        [95, 1600, 480, 44], [110, 1780, 590, 50], [126, 1660, 430, 36],
        [140, 1740, 530, 46],
      ].map(([gradi, dist, raggio, altezza]) => {
        const a = (gradi * Math.PI) / 180;
        return (
          <mesh key={gradi} position={[Math.cos(a) * dist, altezza / 2 - 22, Math.sin(a) * dist]}>
            <coneGeometry args={[raggio, altezza, 7]} />
            <meshBasicMaterial color="#C2CEDA" fog={false} />
          </mesh>
        );
      })}

      {/* il sole alto a sud-ovest, con un velo d'alone */}
      <mesh position={[-420, 900, 270]} ref={(m) => m?.lookAt(0, 120, 0)}>
        <circleGeometry args={[46, 24]} />
        <meshBasicMaterial color="#FFFCEE" fog={false} />
      </mesh>
      <mesh position={[-416, 896, 268]} ref={(m) => m?.lookAt(0, 120, 0)}>
        <circleGeometry args={[110, 24]} />
        <meshBasicMaterial color="#FFF6D8" transparent opacity={0.2} fog={false} depthWrite={false} />
      </mesh>
      <Nuvole />
    </group>
  );
}

/** Nuvole bianche low-poly sparse, ferme nel cielo come nelle viste aeree. */
function Nuvole() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const pose = useMemo(() => {
    // LCG deterministico: stesso cielo a ogni avvio
    let s = 20250827;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const out: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number }[] = [];
    for (let c = 0; c < 14; c++) {
      const a = rnd() * Math.PI * 2;
      const d = 350 + rnd() * 900;
      const cx = Math.cos(a) * d;
      const cz = Math.sin(a) * d;
      const cy = 330 + rnd() * 130;
      const puffi = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < puffi; k++) {
        out.push({
          x: cx + (rnd() - 0.5) * 110,
          y: cy + (rnd() - 0.5) * 16,
          z: cz + (rnd() - 0.5) * 70,
          sx: 34 + rnd() * 46,
          sy: 10 + rnd() * 9,
          sz: 22 + rnd() * 26,
          rot: rnd() * Math.PI,
        });
      }
    }
    // i cirri: veli sottili e allungati come pennellate, anche sopra il
    // centro, così riempiono il cielo pure in vista bassa
    for (let c = 0; c < 16; c++) {
      const a = rnd() * Math.PI * 2;
      const d = 100 + rnd() * 700;
      out.push({
        x: Math.cos(a) * d,
        y: 340 + rnd() * 160,
        z: Math.sin(a) * d,
        sx: 220 + rnd() * 260,
        sy: 5 + rnd() * 3,
        sz: 30 + rnd() * 34,
        rot: rnd() * Math.PI,
      });
    }
    return out;
  }, []);

  useEffect(() => {
    const im = mesh.current;
    if (!im) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const su = new THREE.Vector3(0, 1, 0);
    pose.forEach((p, i) => {
      q.setFromAxisAngle(su, p.rot);
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.sx, p.sy, p.sz));
      im.setMatrixAt(i, m);
    });
    im.count = pose.length;
    im.instanceMatrix.needsUpdate = true;
  }, [pose]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, Math.max(1, pose.length)]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color="#F8FBFE" fog={false} transparent opacity={0.72} depthWrite={false} />
    </instancedMesh>
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
      <Festa />
      <Player />
      <Npcs />
      <Missioni />
      <HookVerifica />
    </>
  );
}
