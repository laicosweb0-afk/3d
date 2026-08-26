'use client';

// Il popolo di Lugo, renderizzato a instanze: un InstancedMesh per parte
// del corpo (11 draw call per TUTTI i pedoni). Le matrici si ricompongono
// ogni frame dal ciclo di camminata; i colori si scrivono una volta sola.
// In coda, la gazzella dei Carabinieri che pattuglia i viali.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { MondoFisico } from '@/lib/lugo/physics';
import {
  creaNpcs,
  stepNpcs,
  creaGazzella,
  stepGazzella,
  type Npc,
} from '@/lib/lugo/npc';
import { runtime } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';
import { QA } from '@/lib/lugo/qa';

const N_NPC = QA ? 30 : 100;

// palette per tipo e variante
const PELLI = ['#D9A67C', '#C08A5E', '#E8C09A', '#8A5A3C'];
const TUTE_MARANZA = ['#1A1A20', '#E8E8EC', '#22366E', '#3A3A42'];
const GIACCHE_ANZIANO = ['#6B655B', '#4E5A66', '#7A6A58', '#55584E'];
const DIVISA = '#1A2238';
const ROSSO_BANDA = '#B02A26';

interface Parti {
  torso: THREE.InstancedMesh;
  testa: THREE.InstancedMesh;
  copricapo: THREE.InstancedMesh;
  braccioD: THREE.InstancedMesh;
  braccioS: THREE.InstancedMesh;
  gambaD: THREE.InstancedMesh;
  gambaS: THREE.InstancedMesh;
  marsupio: THREE.InstancedMesh;
  bastone: THREE.InstancedMesh;
  bandaD: THREE.InstancedMesh;
  bandaS: THREE.InstancedMesh;
}

const _m = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _r = new THREE.Matrix4();
const _s = new THREE.Matrix4();
const _e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function setParte(
  mesh: THREE.InstancedMesh,
  i: number,
  base: THREE.Matrix4,
  px: number, py: number, pz: number,
  rx: number, rz: number,
  ox: number, oy: number, oz: number,
  sx = 1, sy = 1, sz = 1,
) {
  _m.copy(base);
  _t.makeTranslation(px, py, pz);
  _m.multiply(_t);
  if (rx !== 0 || rz !== 0) {
    _e.set(rx, 0, rz);
    _r.makeRotationFromEuler(_e);
    _m.multiply(_r);
  }
  _t.makeTranslation(ox, oy, oz);
  _m.multiply(_t);
  if (sx !== 1 || sy !== 1 || sz !== 1) {
    _s.makeScale(sx, sy, sz);
    _m.multiply(_s);
  }
  mesh.setMatrixAt(i, _m);
}

function coloreTorso(n: Npc): string {
  if (n.tipo === 'carabiniere') return DIVISA;
  if (n.tipo === 'maranza') return TUTE_MARANZA[n.variante % TUTE_MARANZA.length];
  return GIACCHE_ANZIANO[n.variante % GIACCHE_ANZIANO.length];
}

function coloreCopricapo(n: Npc): string {
  if (n.tipo === 'carabiniere') return DIVISA;
  if (n.tipo === 'maranza') return n.variante % 2 ? '#E8E8EC' : '#16161C';
  return '#3A342C';
}

export function Npcs() {
  const mondo = useMondo();
  const fisica = useMemo(() => new MondoFisico(mondo), [mondo]);
  const npcs = useMemo(() => creaNpcs(mondo, N_NPC), [mondo]);
  const gazzella = useMemo(() => creaGazzella(mondo), [mondo]);
  const parti = useRef<Partial<Parti>>({});
  const gruppoGazzella = useRef<THREE.Group>(null);
  const lampeggianti = useRef<THREE.MeshLambertMaterial>(null);
  const ultimaFrase = useRef(0);

  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    w.__LUGO__ = { ...(w.__LUGO__ ?? {}), npcCount: () => npcs.length };
  }, [npcs]);

  // colori per instanza: una volta sola
  useEffect(() => {
    const p = parti.current as Parti;
    if (!p.torso) return;
    const c = new THREE.Color();
    npcs.forEach((n, i) => {
      p.torso.setColorAt(i, c.set(coloreTorso(n)));
      p.testa.setColorAt(i, c.set(PELLI[n.variante % PELLI.length]));
      p.copricapo.setColorAt(i, c.set(coloreCopricapo(n)));
      const braccia = n.tipo === 'anziano' ? coloreTorso(n) : n.tipo === 'carabiniere' ? DIVISA : coloreTorso(n);
      p.braccioD.setColorAt(i, c.set(braccia));
      p.braccioS.setColorAt(i, c.set(braccia));
      const gambe = n.tipo === 'maranza' ? coloreTorso(n) : n.tipo === 'carabiniere' ? DIVISA : '#3E3B36';
      p.gambaD.setColorAt(i, c.set(gambe));
      p.gambaS.setColorAt(i, c.set(gambe));
      p.marsupio.setColorAt(i, c.set('#101014'));
      p.bastone.setColorAt(i, c.set('#6E5537'));
      p.bandaD.setColorAt(i, c.set(ROSSO_BANDA));
      p.bandaS.setColorAt(i, c.set(ROSSO_BANDA));
    });
    for (const mesh of Object.values(p)) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [npcs]);

  useFrame((frame, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useLugo.getState();
    const rt = runtime.rt;
    const p = parti.current as Parti;
    if (!rt || !p.torso) return;

    if (st.fase === 'gioco') {
      const esito = stepNpcs(npcs, dt, mondo, fisica, rt, st.mode === 'auto');
      if (esito.frase && frame.clock.elapsedTime - ultimaFrase.current > 9) {
        ultimaFrase.current = frame.clock.elapsedTime;
        st.setAvviso(esito.frase);
      }
    }

    const base = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    npcs.forEach((n, i) => {
      const vNorm = Math.min(1, n.v / Math.max(0.4, n.passo));
      const bob = Math.abs(Math.sin(n.fase)) * 0.045 * vNorm;
      base.makeTranslation(n.x, bob, n.z);
      rot.makeRotationY(-n.yaw);
      base.multiply(rot);
      // il maranza ciondola: rollio lento del busto
      const rollio = n.tipo === 'maranza' ? Math.sin(n.fase * 0.5) * 0.1 : 0;
      const curva = n.tipo === 'anziano' ? 0.32 : n.tipo === 'maranza' ? -0.06 : 0;
      const avantiTesta = Math.sin(curva) * 0.42;

      const oscG = Math.sin(n.fase) * (n.tipo === 'anziano' ? 0.3 : n.tipo === 'maranza' ? 0.6 : 0.45) * vNorm;
      const oscB = Math.sin(n.fase + Math.PI) * (n.tipo === 'maranza' ? 0.5 : 0.35) * vNorm;

      setParte(p.torso, i, base, 0, 1.06, 0, curva, rollio, 0, 0, 0, 1, n.tipo === 'anziano' ? 0.92 : 1, 1);
      setParte(p.testa, i, base, avantiTesta, n.tipo === 'anziano' ? 1.34 : 1.42, 0, 0, 0, 0, 0, 0);
      setParte(p.copricapo, i, base, avantiTesta + (n.tipo === 'maranza' ? 0.03 : 0), (n.tipo === 'anziano' ? 1.34 : 1.42) + 0.14, 0, 0, 0, 0, 0, 0,
        n.tipo === 'anziano' ? 1.25 : 1, n.tipo === 'carabiniere' ? 1.4 : 1, n.tipo === 'anziano' ? 1.25 : 1);
      setParte(p.braccioD, i, base, avantiTesta * 0.7, 1.3, 0.24, 0, oscB, 0, -0.2, 0);
      setParte(p.braccioS, i, base, avantiTesta * 0.7, 1.3, -0.24, 0, -oscB * (n.tipo === 'anziano' ? 0.4 : 1), 0, -0.2, 0);
      setParte(p.gambaD, i, base, 0, 0.85, 0.09, 0, oscG, 0, -0.38, 0);
      setParte(p.gambaS, i, base, 0, 0.85, -0.09, 0, -oscG, 0, -0.38, 0);

      if (n.tipo === 'maranza') setParte(p.marsupio, i, base, 0.17, 1.0, 0, 0, -0.35, 0, 0, 0);
      else p.marsupio.setMatrixAt(i, ZERO);
      if (n.tipo === 'anziano') setParte(p.bastone, i, base, 0.15, 1.05, -0.26, 0.08, -oscB * 0.4 - 0.12, 0, -0.4, 0);
      else p.bastone.setMatrixAt(i, ZERO);
      if (n.tipo === 'carabiniere') {
        setParte(p.bandaD, i, base, 0, 0.85, 0.152, 0, oscG, 0, -0.38, 0);
        setParte(p.bandaS, i, base, 0, 0.85, -0.152, 0, -oscG, 0, -0.38, 0);
      } else {
        p.bandaD.setMatrixAt(i, ZERO);
        p.bandaS.setMatrixAt(i, ZERO);
      }
    });
    for (const mesh of Object.values(p)) {
      mesh.instanceMatrix.needsUpdate = true;
    }

    // gazzella di pattuglia
    if (gazzella && gruppoGazzella.current) {
      if (st.fase === 'gioco') stepGazzella(gazzella, dt);
      gruppoGazzella.current.position.set(gazzella.x, 0, gazzella.z);
      gruppoGazzella.current.rotation.y = -gazzella.yaw;
      runtime.gazzella = { x: gazzella.x, z: gazzella.z, yaw: gazzella.yaw };
      if (lampeggianti.current) {
        const blink = Math.sin(frame.clock.elapsedTime * 6) > 0;
        lampeggianti.current.emissiveIntensity = blink ? 2.2 : 0.4;
      }
    }
  });

  const ref = (nome: keyof Parti) => (m: THREE.InstancedMesh | null) => {
    if (m) parti.current[nome] = m;
  };

  return (
    <group>
      {/* una geometria unitaria per parte; forma e taglia vivono nelle matrici */}
      <instancedMesh ref={ref('torso')} args={[undefined, undefined, N_NPC]} frustumCulled={false} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.42]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('testa')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.2, 0.22, 0.2]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('copricapo')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.24, 0.08, 0.24]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('braccioD')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.09, 0.44, 0.09]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('braccioS')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.09, 0.44, 0.09]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('gambaD')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.13, 0.78, 0.12]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('gambaS')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.13, 0.78, 0.12]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('marsupio')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.12, 0.11, 0.3]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('bastone')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <cylinderGeometry args={[0.02, 0.025, 0.85, 6]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('bandaD')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.02, 0.76, 0.03]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('bandaS')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.02, 0.76, 0.03]} />
        <meshLambertMaterial />
      </instancedMesh>

      {gazzella && (
        <group ref={gruppoGazzella}>
          {/* la gazzella: blu scurissimo, banda bianco-rossa, barra lampeggianti */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[4.2, 0.55, 1.7]} />
            <meshLambertMaterial color="#101A36" />
          </mesh>
          <mesh position={[-0.2, 1.15, 0]} castShadow>
            <boxGeometry args={[2.3, 0.6, 1.6]} />
            <meshLambertMaterial color="#101A36" />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[4.24, 0.13, 1.72]} />
            <meshLambertMaterial color="#E8E8EC" />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[4.22, 0.06, 1.71]} />
            <meshLambertMaterial color={ROSSO_BANDA} />
          </mesh>
          <mesh position={[-0.2, 1.5, 0]}>
            <boxGeometry args={[0.5, 0.12, 1.2]} />
            <meshLambertMaterial
              ref={lampeggianti}
              color="#2244AA"
              emissive="#3366FF"
              emissiveIntensity={1}
            />
          </mesh>
          <mesh position={[2.12, 0.6, 0.5]}>
            <boxGeometry args={[0.06, 0.14, 0.26]} />
            <meshLambertMaterial color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={1.4} />
          </mesh>
          <mesh position={[2.12, 0.6, -0.5]}>
            <boxGeometry args={[0.06, 0.14, 0.26]} />
            <meshLambertMaterial color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={1.4} />
          </mesh>
          {[[1.35, 0.85], [1.35, -0.85], [-1.35, 0.85], [-1.35, -0.85]].map(([x, z]) => (
            <mesh key={x + ':' + z} position={[x, 0.32, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.32, 0.32, 0.24, 10]} />
              <meshLambertMaterial color="#1E1C22" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
