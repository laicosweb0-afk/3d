'use client';

// L'orchestratore del giocatore: legge l'input, fa girare la fisica di auto
// e personaggio, gestisce salita/discesa (E) e il raddrizza (R), muove i
// modelli e la chase camera, ed espone gli hook di verifica su __LUGO__.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { MondoFisico } from '@/lib/lugo/physics';
import { stepAuto, puntoStradaVicino } from '@/lib/lugo/car';
import { stepPersona, PERSONA } from '@/lib/lugo/character';
import type { StatoInput } from '@/lib/lugo/input';
import { runtime, type RuntimeGioco } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';
import { Car } from './Car';
import { Character } from './Character';

export type { RuntimeGioco };

const RAGGIO_RUOTA = 0.3;
const DIST_SALITA = 2.6;

function ChaseCamera({ rt }: { rt: RuntimeGioco }) {
  const desiderata = useMemo(() => new THREE.Vector3(), []);
  const mira = useMemo(() => new THREE.Vector3(), []);
  const avviata = useRef(false);

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const mode = useLugo.getState().mode;
    const t = mode === 'auto' ? rt.auto : rt.persona;

    let dirX: number;
    let dirZ: number;
    if (mode === 'auto') {
      dirX = Math.cos(rt.auto.yaw);
      dirZ = Math.sin(rt.auto.yaw);
      if (rt.vAuto < -0.5) {
        dirX = -dirX;
        dirZ = -dirZ;
      }
    } else {
      // a piedi la camera trascina: direzione = camera → personaggio
      dirX = t.x - camera.position.x;
      dirZ = t.z - camera.position.z;
      const l = Math.hypot(dirX, dirZ) || 1;
      dirX /= l;
      dirZ /= l;
    }

    const dist = mode === 'auto' ? 8.5 : 4.2;
    const alt = mode === 'auto' ? 3.4 : 2.1;
    desiderata.set(t.x - dirX * dist, alt, t.z - dirZ * dist);

    if (!avviata.current) {
      camera.position.copy(desiderata);
      avviata.current = true;
    } else {
      const k = 1 - Math.exp(-(mode === 'auto' ? 3.4 : 5.5) * dt);
      camera.position.lerp(desiderata, k);
    }

    const avantiMira = mode === 'auto' ? 5 : 1.2;
    mira.set(t.x + dirX * avantiMira, 1.4, t.z + dirZ * avantiMira);
    camera.lookAt(mira);

    rt.cameraYaw = Math.atan2(t.z - camera.position.z, t.x - camera.position.x);
  });
  return null;
}

export function Player() {
  const mondo = useMondo();
  const fisica = useMemo(() => new MondoFisico(mondo), [mondo]);

  const rt = useMemo<RuntimeGioco>(() => {
    const rocca = mondo.poi.get('rocca');
    const spawn = puntoStradaVicino(mondo, rocca ? rocca.xm : 0, rocca ? rocca.zm : 0);
    const creato: RuntimeGioco = {
      auto: { x: spawn.x, z: spawn.z, yaw: spawn.yaw, vx: 0, vz: 0, sterzo: 0 },
      persona: { x: spawn.x + 2, z: spawn.z + 2, yaw: 0, vx: 0, vz: 0, fase: 0 },
      vAuto: 0,
      vPersona: 0,
      faseRuote: 0,
      cameraYaw: spawn.yaw,
      urto: 0,
    };
    runtime.rt = creato;
    return creato;
  }, [mondo]);

  const gruppoAuto = useRef<THREE.Group>(null);
  const gruppoPersona = useRef<THREE.Group>(null);
  const [, getInput] = useKeyboardControls();
  const interagiscePrima = useRef(false);
  const resetPrima = useRef(false);
  const hudAcc = useRef(0);
  const hintPrima = useRef<string | null>(null);

  // hook di verifica/debug
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    const attivo = () => (useLugo.getState().mode === 'auto' ? rt.auto : rt.persona);
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      pos: () => [attivo().x, attivo().z],
      mode: () => useLugo.getState().mode,
      teleport: (x: number, z: number) => {
        const a = attivo();
        a.x = x;
        a.z = z;
        if ('vx' in a) {
          a.vx = 0;
          a.vz = 0;
        }
        // l'altro mezzo segue, così salita/discesa restano coerenti
        const altro = useLugo.getState().mode === 'auto' ? rt.persona : rt.auto;
        altro.x = x + 3;
        altro.z = z + 3;
      },
      muro: () => {
        const edificio = mondo.buildings.find(
          (b) => b.collider.tipo === 'obb' && b.collider.hw > 3 && b.collider.hw < 40,
        );
        if (!edificio) return false;
        const c = edificio.collider;
        const salvato = { ...rt.auto };
        const ax = c.cos;
        const az = c.sin;
        rt.auto.x = c.cx + ax * (c.hw + 6);
        rt.auto.z = c.cz + az * (c.hw + 6);
        rt.auto.yaw = Math.atan2(-az, -ax);
        rt.auto.vx = 0;
        rt.auto.vz = 0;
        const input: StatoInput = {
          avanti: true, indietro: false, sinistra: false, destra: false,
          corri: false, freno: false, interagisci: false, reset: false,
        };
        for (let i = 0; i < 150; i++) stepAuto(rt.auto, input, 1 / 60, fisica, mondo.bounds);
        const dx = rt.auto.x - c.cx;
        const dz = rt.auto.z - c.cz;
        const lx = dx * c.cos + dz * c.sin;
        const lz = -dx * c.sin + dz * c.cos;
        const dentro = Math.abs(lx) < c.hw && Math.abs(lz) < c.hd;
        Object.assign(rt.auto, salvato);
        return dentro;
      },
    };
  }, [rt, mondo, fisica]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useLugo.getState();
    const fermo: StatoInput = {
      avanti: false, indietro: false, sinistra: false, destra: false,
      corri: false, freno: false, interagisci: false, reset: false,
    };
    const input = st.fase === 'gioco' ? (getInput() as unknown as StatoInput) : fermo;

    if (st.mode === 'auto') {
      const esito = stepAuto(rt.auto, input, dt, fisica, mondo.bounds);
      rt.vAuto = esito.v;
      rt.urto = esito.urto;
      rt.faseRuote += (esito.v * dt) / RAGGIO_RUOTA;

      if (input.reset && !resetPrima.current) {
        const p = puntoStradaVicino(mondo, rt.auto.x, rt.auto.z);
        rt.auto.x = p.x;
        rt.auto.z = p.z;
        rt.auto.yaw = p.yaw;
        rt.auto.vx = 0;
        rt.auto.vz = 0;
      }

      // discesa: solo quasi da fermi, in un punto libero a lato
      if (input.interagisci && !interagiscePrima.current && Math.abs(esito.v) < 3) {
        const latoX = -Math.sin(rt.auto.yaw);
        const latoZ = Math.cos(rt.auto.yaw);
        for (const lato of [1.7, -1.7, 0]) {
          const px = rt.auto.x + latoX * lato - Math.cos(rt.auto.yaw) * (lato === 0 ? 2.6 : 0);
          const pz = rt.auto.z + latoZ * lato - Math.sin(rt.auto.yaw) * (lato === 0 ? 2.6 : 0);
          if (fisica.cerchioLibero(px, pz, PERSONA.raggio + 0.1)) {
            rt.persona.x = px;
            rt.persona.z = pz;
            rt.persona.vx = 0;
            rt.persona.vz = 0;
            rt.persona.yaw = rt.auto.yaw;
            rt.auto.vx = 0;
            rt.auto.vz = 0;
            st.setMode('piedi');
            break;
          }
        }
      }
    } else {
      rt.vPersona = stepPersona(rt.persona, input, dt, fisica, rt.cameraYaw);

      // salita: vicino all'auto
      if (input.interagisci && !interagiscePrima.current) {
        const d = Math.hypot(rt.persona.x - rt.auto.x, rt.persona.z - rt.auto.z);
        if (d < DIST_SALITA) st.setMode('auto');
      }
    }
    interagiscePrima.current = input.interagisci;
    resetPrima.current = input.reset;

    // suggerimento contestuale sul tasto E
    let hint: string | null = null;
    if (st.fase === 'gioco') {
      if (st.mode === 'auto' && Math.abs(rt.vAuto) < 0.5) hint = 'Premi E per scendere';
      else if (st.mode === 'piedi') {
        const d = Math.hypot(rt.persona.x - rt.auto.x, rt.persona.z - rt.auto.z);
        if (d < DIST_SALITA) hint = 'Premi E per salire in auto';
      }
    }
    if (hint !== hintPrima.current) {
      hintPrima.current = hint;
      st.setHint(hint);
    }

    // modelli
    if (gruppoAuto.current) {
      gruppoAuto.current.position.set(rt.auto.x, 0, rt.auto.z);
      gruppoAuto.current.rotation.y = -rt.auto.yaw;
    }
    if (gruppoPersona.current) {
      gruppoPersona.current.visible = st.mode === 'piedi';
      gruppoPersona.current.position.set(rt.persona.x, 0, rt.persona.z);
      gruppoPersona.current.rotation.y = -rt.persona.yaw;
    }

    // HUD a bassa frequenza
    hudAcc.current += dt;
    if (hudAcc.current > 0.2) {
      hudAcc.current = 0;
      const v = st.mode === 'auto' ? Math.abs(rt.vAuto) : rt.vPersona;
      st.setKmh(Math.round(v * 3.6));
    }
  });

  return (
    <>
      <Car ref={gruppoAuto} rt={rt} />
      <Character ref={gruppoPersona} rt={rt} />
      <ChaseCamera rt={rt} />
    </>
  );
}
