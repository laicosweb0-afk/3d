'use client';

// Il mondo di gioco: cielo, sole, nebbia e luci seguono l'orologio di
// Lugo (lib/lugo/tempo.ts) — dall'alba al pieno giorno al tramonto alla
// notte — sopra la città generata dai dati OSM.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
import { Imperfezioni } from './Imperfezioni';
import { Festa } from './Festa';
import { Eventi } from './Eventi';
import { useMondo } from '@/lib/lugo/loadMap';
import { runtime } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';
import { LUCE, PALETTE } from '@/lib/lugo/palette';
import { caratteriCitta } from '@/lib/lugo/carattere';
import { imperfezioniCitta } from '@/lib/lugo/imperfezioni';
import { puntiInteresse } from '@/lib/lugo/poi';
import { infraGioco } from '@/lib/lugo/veicoli';
import { passaTempo, tempo } from '@/lib/lugo/tempo';

function Cielo({ matCielo }: { matCielo: React.MutableRefObject<THREE.ShaderMaterial | null> }) {
  // il cielo viaggia col giocatore: la mappa è larga cinque chilometri e
  // una cupola ancorata all'origine si finiva per attraversarla
  const volta = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (!volta.current) return;
    volta.current.position.x = camera.position.x;
    volta.current.position.z = camera.position.z;
  });
  const { geometria, materiale } = useMemo(() => {
    const geometria = new THREE.SphereGeometry(1240, 24, 12);
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
  matCielo.current = materiale;
  return (
    <group ref={volta}>
      <mesh geometry={geometria} material={materiale} frustumCulled={false} />
      {/* le colline dell'Appennino a sud: una striscia bassa e sbiadita
          all'orizzonte, come nelle foto aeree */}
      {[
        [45, 1120, 380, 44], [62, 1070, 300, 34], [78, 1170, 440, 50],
        [95, 1090, 325, 37], [110, 1200, 405, 42], [126, 1130, 292, 30],
        [140, 1175, 365, 39],
      ].map(([gradi, dist, raggio, altezza]) => {
        const a = (gradi * Math.PI) / 180;
        return (
          <mesh key={gradi} position={[Math.cos(a) * dist, altezza / 2 - 22, Math.sin(a) * dist]}>
            <coneGeometry args={[raggio, altezza, 7]} />
            <meshBasicMaterial color="#C2CEDA" fog={false} />
          </mesh>
        );
      })}

      <Nuvole />
    </group>
  );
}

/**
 * Il sole e il suo alone stanno FUORI dalla volta che segue la camera:
 * `Meteo` scrive le loro posizioni in coordinate di mondo, e dentro un
 * gruppo traslato finivano al doppio della distanza.
 */
function Sole({
  sole,
  alone,
}: {
  sole: React.MutableRefObject<THREE.Mesh | null>;
  alone: React.MutableRefObject<THREE.Mesh | null>;
}) {
  return (
    <>
      <mesh ref={sole} position={[-420, 900, 270]}>
        <circleGeometry args={[46, 24]} />
        <meshBasicMaterial color="#FFFCEE" fog={false} />
      </mesh>
      <mesh ref={alone} position={[-416, 896, 268]}>
        <circleGeometry args={[110, 24]} />
        <meshBasicMaterial color="#FFF6D8" transparent opacity={0.2} fog={false} depthWrite={false} />
      </mesh>
    </>
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

/**
 * Il regista del cielo: fa scorrere l'orologio e aggiorna in un colpo solo
 * sole, ombre, nebbia, cupola e disco solare. Il sole insegue il giocatore
 * perché le ombre valgano ovunque nella mappa.
 */
function Meteo() {
  const luce = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const matCielo = useRef<THREE.ShaderMaterial | null>(null);
  const sole = useRef<THREE.Mesh>(null);
  const alone = useRef<THREE.Mesh>(null);
  const mira = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ scene }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const c = passaTempo(dt);
    const rt = runtime.rt;
    const t = rt ? (useLugo.getState().mode === 'auto' ? rt.auto : rt.persona) : { x: 0, z: 0 };

    const l = luce.current;
    if (l) {
      l.position.set(t.x + c.solePos[0], c.solePos[1], t.z + c.solePos[2]);
      l.color.set(c.soleColore);
      l.intensity = c.soleIntensita;
      if (!l.target.parent && l.parent) l.parent.add(l.target);
      l.target.position.set(t.x, 0, t.z);
      l.target.updateMatrixWorld();
    }
    if (hemi.current) {
      hemi.current.color.set(c.hemiCielo);
      hemi.current.groundColor.set(c.hemiTerra);
      hemi.current.intensity = c.hemiIntensita;
    }
    if (amb.current) {
      amb.current.color.set(c.ambColore);
      amb.current.intensity = c.ambIntensita;
    }
    const nebbia = scene.fog as THREE.Fog | null;
    if (nebbia) {
      nebbia.color.set(c.nebbiaColore);
      nebbia.near = c.nebbiaVicino;
      nebbia.far = c.nebbiaLontano;
    }
    if (matCielo.current) {
      (matCielo.current.uniforms.alto.value as THREE.Color).set(c.cieloAlto);
      (matCielo.current.uniforms.basso.value as THREE.Color).set(c.cieloBasso);
    }
    // il disco solare segue la direzione della luce, e sparisce sotto l'orizzonte
    const dir = new THREE.Vector3(c.solePos[0], c.solePos[1], c.solePos[2]).normalize();
    for (const [m, scala] of [[sole.current, 1000] as const, [alone.current, 996] as const]) {
      if (!m) continue;
      m.position.set(t.x + dir.x * scala, dir.y * scala, t.z + dir.z * scala);
      mira.set(t.x, 120, t.z);
      m.lookAt(mira);
      m.visible = c.soleAlto > -0.05;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.color.set(c.soleColore);
    }
  });

  return (
    <>
      <ambientLight ref={amb} color={LUCE.ambient.color} intensity={LUCE.ambient.intensity} />
      <hemisphereLight
        ref={hemi}
        color={LUCE.hemi.cielo}
        groundColor={LUCE.hemi.terra}
        intensity={LUCE.hemi.intensity}
      />
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
      <Cielo matCielo={matCielo} />
      <Sole sole={sole} alone={alone} />
    </>
  );
}

/** Espone lo stato ispezionabile per la verifica Playwright. */
function HookVerifica() {
  const mondo = useMondo();
  const gl = useThree((s) => s.gl);
  const scenaGlobale = useThree((s) => s.scene);
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      pronto: true,
      edifici: mondo.buildings.length,
      strade: mondo.roads.length,
      poi: Object.fromEntries([...mondo.poi.values()].map((p) => [p.id, { x: p.xm, z: p.zm, nome: p.nome }])),
      // il punto di carreggiata più vicino: la verifica lo usa per mettersi
      // in mezzo alla strada invece che dentro un muro
      suStrada: (x: number, z: number) => {
        let best: [number, number] = [x, z];
        let bestD = Infinity;
        for (const r of mondo.roads) {
          if (r.classe === 'pedonale') continue;
          const n = r.pts.length / 2;
          for (let i = 0; i + 1 < n; i++) {
            const ax = r.pts[i * 2], az = r.pts[i * 2 + 1];
            const dx = r.pts[(i + 1) * 2] - ax, dz = r.pts[(i + 1) * 2 + 1] - az;
            const L2 = dx * dx + dz * dz || 1;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
            const qx = ax + dx * t, qz = az + dz * t;
            const d = (qx - x) * (qx - x) + (qz - z) * (qz - z);
            if (d < bestD) {
              bestD = d;
              best = [qx, qz];
            }
          }
        }
        return best;
      },
      // chi pesa davvero: i dieci oggetti più costosi della scena
      pesi: () => {
        const out: { nome: string; tri: number }[] = [];
        gl.info.autoReset = gl.info.autoReset;
        scenaGlobale?.traverse((o) => {
          const m = o as THREE.Mesh & { count?: number; isInstancedMesh?: boolean };
          const g = m.geometry as THREE.BufferGeometry | undefined;
          if (!g || !g.getAttribute) return;
          const pos = g.getAttribute('position');
          if (!pos) return;
          const base = g.index ? g.index.count / 3 : pos.count / 3;
          const n = m.isInstancedMesh ? base * (m.count ?? 0) : base;
          if (n > 500) out.push({ nome: m.name || m.type + ':' + (m.material as THREE.Material)?.type, tri: Math.round(n) });
        });
        return out.sort((a, b) => b.tri - a.tri).slice(0, 14);
      },
      // il costo di un fotogramma: triangoli e draw call dell'ultimo frame
      render: () => ({
        triangoli: gl.info.render.triangles,
        chiamate: gl.info.render.calls,
        texture: gl.info.memory.textures,
        geometrie: gl.info.memory.geometries,
      }),
      // stato dell'esplorazione, per il collaudo
      esplorazione: () => {
        const st = useLugo.getState();
        const tutti = puntiInteresse(mondo);
        return {
          visitati: st.poiVisitati.length,
          totale: tutti.length,
          distintivi: st.distintivi,
          monumenti: tutti.filter((p) => p.tipo === 'monumento').length,
          attivita: tutti.filter((p) => p.tipo === 'attivita').length,
        };
      },
      // il ritratto statistico della città: serve alla verifica per
      // dimostrare che gli edifici non sono più tutti uguali
      citta: () => {
        const k = [...caratteriCitta(mondo).values()];
        const alt = k.map((c) => c.h);
        const conta = (f: (c: (typeof k)[number]) => string) => {
          const m: Record<string, number> = {};
          for (const c of k) m[f(c)] = (m[f(c)] ?? 0) + 1;
          return m;
        };
        return {
          n: k.length,
          hMin: Math.min(...alt),
          hMax: Math.max(...alt),
          hMedia: alt.reduce((a, b) => a + b, 0) / alt.length,
          altezzeDistinte: new Set(alt.map((h) => Math.round(h * 10))).size,
          piani: conta((c) => String(c.piani)),
          materiali: conta((c) => c.materiale),
          tetti: conta((c) => c.tetto),
          zone: conta((c) => c.zona),
          botteghe: k.filter((c) => c.bottega).length,
          tinteDistinte: new Set(k.map((c) => c.tinta.getHexString())).size,
          imperfezioni: imperfezioniCitta(mondo, infraGioco(mondo).fisica).length,
        };
      },
      // orologio pilotabile: serve alle cartoline notturne della verifica
      ora: (h?: number) => {
        if (typeof h === 'number') tempo.ora = ((h % 24) + 24) % 24;
        return tempo.ora;
      },
      tempoScorre: (on: boolean) => {
        tempo.scorre = on;
      },
    };
  }, [mondo, gl, scenaGlobale]);
  return null;
}

export function World() {
  return (
    <>
      <fog attach="fog" args={[LUCE.nebbia.colore, LUCE.nebbia.vicino, LUCE.nebbia.lontano]} />
      <Meteo />
      <CityMeshes senzaLandmark={['pavaglione', 'rocca', 'stazione']} />
      <Landmarks />
      <Props />
      <Veicoli />
      <Insegne />
      <Arredi />
      <Imperfezioni />
      <Festa />
      <Eventi />
      <Player />
      <Npcs />
      <Missioni />
      <HookVerifica />
    </>
  );
}
