'use client';

// L'orchestratore del giocatore: legge l'input, fa girare la fisica di auto
// e personaggio, gestisce salita/discesa (E) e il raddrizza (R), muove i
// modelli e la chase camera, ed espone gli hook di verifica su __LUGO__.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco } from '@/lib/lugo/veicoli';
import { stepAuto, puntoStradaVicino, viaVicina } from '@/lib/lugo/car';
import { stepPersona, PERSONA } from '@/lib/lugo/character';
import type { StatoInput } from '@/lib/lugo/input';
import { conStick } from '@/lib/lugo/stick';
import { attivitaVicina, registroAttivita } from '@/lib/lugo/attivita';
import { runtime, type RuntimeGioco } from '@/lib/lugo/runtime';
import { updateAudio, suonaEvento } from '@/lib/lugo/audio';
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
  const scossa = useRef(0);

  useFrame(({ camera, clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const override = runtime.cameraOverride;
    if (override) {
      if (performance.now() < override.fino) {
        camera.position.set(override.x, override.y, override.z);
        mira.set(override.tx, override.ty, override.tz);
        camera.lookAt(mira);
        return;
      }
      runtime.cameraOverride = null;
    }
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

    // FOV dinamico: in velocità il campo si allarga, piano piano
    const cam = camera as THREE.PerspectiveCamera;
    const fovTarget = mode === 'auto' ? 55 + Math.min(12, Math.abs(rt.vAuto) * 0.5) : 55;
    if (Math.abs(cam.fov - fovTarget) > 0.05) {
      cam.fov += (fovTarget - cam.fov) * Math.min(1, dt * 2.5);
      cam.updateProjectionMatrix();
    }

    // scossone leggerissimo agli urti, che si spegne da solo
    if (rt.urto > 3) scossa.current = Math.min(0.4, rt.urto * 0.035);
    if (scossa.current > 0.004) {
      const t2 = clock.elapsedTime;
      camera.position.x += Math.sin(t2 * 53) * scossa.current;
      camera.position.y += Math.cos(t2 * 47) * scossa.current * 0.6;
      scossa.current *= Math.exp(-dt * 6);
    }

    rt.cameraYaw = Math.atan2(t.z - camera.position.z, t.x - camera.position.x);
  });
  return null;
}

export function Player() {
  const mondo = useMondo();
  const infra = useMemo(() => infraGioco(mondo), [mondo]);
  const fisica = infra.fisica;

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
  const viaAcc = useRef(0);
  const viaPrima = useRef<string | null>(null);
  // polizia: "calore" per guida spericolata, con decadimento
  const calore = useRef(0);
  const cooldownUrto = useRef(0);
  const decadimento = useRef(0);
  const cooldownDialogo = useRef(0);

  // hook di verifica/debug
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    const attivo = () => (useLugo.getState().mode === 'auto' ? rt.auto : rt.persona);
    const registroAttivitaHook = () =>
      registroAttivita(mondo).slice(0, 40).map((a) => ({ nome: a.nome, x: a.x, z: a.z, cat: a.categoria }));
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      pos: () => [attivo().x, attivo().z],
      attivita: () => registroAttivitaHook(),
      mode: () => useLugo.getState().mode,
      teleport: (x: number, z: number, yaw?: number) => {
        const a = attivo();
        a.x = x;
        a.z = z;
        if (typeof yaw === 'number') a.yaw = yaw;
        if ('vx' in a) {
          a.vx = 0;
          a.vz = 0;
        }
        // l'altro mezzo segue, così salita/discesa restano coerenti
        const altro = useLugo.getState().mode === 'auto' ? rt.persona : rt.auto;
        altro.x = x + 3;
        altro.z = z + 3;
      },
      fotocamera: (x: number, y: number, z: number, tx: number, ty: number, tz: number, durataMs = 3000) => {
        runtime.cameraOverride = { x, y, z, tx, ty, tz, fino: performance.now() + durataMs };
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
    // tastiera + joystick virtuale, fusi in un unico punto
    const input = st.fase === 'gioco' ? conStick(getInput() as unknown as StatoInput) : fermo;

    if (st.mode === 'auto') {
      const esito = stepAuto(rt.auto, input, dt, fisica, mondo.bounds);
      rt.vAuto = esito.v;
      rt.urto = esito.urto;
      rt.faseRuote += (esito.v * dt) / RAGGIO_RUOTA;
      runtime.frenata = input.freno || (input.indietro && esito.v > 0.5);

      // i veicoli in movimento sono solidi: gazzella e traffico civile
      let urtoMobile = false;
      const mobili: { x: number; z: number }[] = [...infra.traffico];
      if (runtime.gazzella) mobili.push(runtime.gazzella);
      for (const g of mobili) {
        const dx = rt.auto.x - g.x;
        const dz = rt.auto.z - g.z;
        const d = Math.hypot(dx, dz);
        const minD = 2.6;
        if (d > 0.001 && d < minD) {
          const nx = dx / d;
          const nz = dz / d;
          rt.auto.x += nx * (minD - d);
          rt.auto.z += nz * (minD - d);
          const vn = rt.auto.vx * nx + rt.auto.vz * nz;
          if (vn < 0) {
            rt.auto.vx -= nx * vn * 1.4;
            rt.auto.vz -= nz * vn * 1.4;
            rt.auto.vx *= 0.8;
            rt.auto.vz *= 0.8;
            rt.urto = Math.max(rt.urto, -vn);
            if (-vn > 2) urtoMobile = true;
          }
        }
      }

      // ── polizia: la guida spericolata scalda gli animi ────────────────
      cooldownUrto.current -= dt;
      if ((urtoMobile || rt.urto > 7) && cooldownUrto.current <= 0) {
        cooldownUrto.current = 1.5;
        calore.current += 1;
        decadimento.current = 0;
        const wanted = calore.current >= 7 ? 3 : calore.current >= 4 ? 2 : calore.current >= 2 ? 1 : 0;
        if (wanted !== st.wanted) {
          st.setWanted(wanted);
          if (wanted > st.wanted || (wanted === 1 && st.wanted === 0)) {
            st.setAvviso('I Carabinieri ti hanno notato!');
            suonaEvento('fallita');
          }
        }
      }
      // beccato: gazzella addosso e quasi fermo → multa e si ricomincia
      if (st.wanted > 0 && runtime.gazzella) {
        const dG = Math.hypot(rt.auto.x - runtime.gazzella.x, rt.auto.z - runtime.gazzella.z);
        if (dG < 4.2 && Math.abs(esito.v) < 2.5) {
          const multa = Math.min(st.denaro, 30 * st.wanted);
          st.addDenaro(-multa);
          calore.current = 0;
          st.setWanted(0);
          runtime.caccia = false;
          st.setAvviso(multa > 0 ? `Fermato dai Carabinieri · Multa €${multa}` : 'Fermato dai Carabinieri · Solo un avvertimento');
          suonaEvento('fallita');
        }
      }

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
            suonaEvento('salita');
            break;
          }
        }
      }
    } else {
      rt.vPersona = stepPersona(rt.persona, input, dt, fisica, rt.cameraYaw);
      runtime.frenata = false;

      // salita: vicino all'auto. Altrimenti, E parla col maranza vicino.
      cooldownDialogo.current -= dt;
      const dAuto = Math.hypot(rt.persona.x - rt.auto.x, rt.persona.z - rt.auto.z);
      if (input.interagisci && !interagiscePrima.current) {
        const bottega = st.vetrina || st.dialogo ? null : attivitaVicina(mondo, rt.persona.x, rt.persona.z, 9);
        if (dAuto < DIST_SALITA) {
          st.setMode('auto');
          suonaEvento('salita');
        } else if (bottega) {
          st.setVetrina({
            id: bottega.id,
            nome: bottega.nome,
            categoria: bottega.categoria,
            descrizione: bottega.descrizione,
            partner: bottega.partner,
            promo: bottega.promo,
            articoli: bottega.articoli,
          });
          suonaEvento('tappa');
        } else if (!st.dialogo && cooldownDialogo.current <= 0 && runtime.npcs) {
          for (const n of runtime.npcs) {
            if (n.tipo !== 'maranza') continue;
            if (Math.hypot(n.x - rt.persona.x, n.z - rt.persona.z) < 3.4) {
              cooldownDialogo.current = 45;
              st.setDialogo({
                id: 'sigaretta',
                chi: 'Un ragazzo in tuta',
                testo: '“Bella! Hai mica una sigaretta?”',
                opzioni: [
                  { id: 'si', label: '“Tieni.”' },
                  { id: 'no', label: '“No, mi spiace.”' },
                  { id: 'via', label: 'Tira dritto' },
                ],
              });
              suonaEvento('tappa');
              break;
            }
          }
        }
      }
    }
    interagiscePrima.current = input.interagisci;
    resetPrima.current = input.reset;

    // il calore si raffredda comunque, anche mentre si scappa a piedi
    decadimento.current += dt;
    if (decadimento.current > 20 && calore.current > 0) {
      decadimento.current = 0;
      calore.current = Math.max(0, calore.current - 2);
      const wanted = calore.current >= 7 ? 3 : calore.current >= 4 ? 2 : calore.current >= 2 ? 1 : 0;
      if (wanted !== st.wanted) {
        st.setWanted(wanted);
        if (wanted === 0) st.setAvviso('I Carabinieri ti hanno perso di vista.');
      }
    }
    runtime.caccia = useLugo.getState().wanted > 0;

    // suggerimento contestuale sul tasto E
    let hint: string | null = null;
    if (st.fase === 'gioco') {
      if (st.mode === 'auto' && Math.abs(rt.vAuto) < 0.5) hint = 'Premi E per scendere';
      else if (st.mode === 'piedi') {
        const d = Math.hypot(rt.persona.x - rt.auto.x, rt.persona.z - rt.auto.z);
        if (d < DIST_SALITA) hint = 'Premi E per salire in auto';
        else if (!st.vetrina && !st.dialogo) {
          const bottega = attivitaVicina(mondo, rt.persona.x, rt.persona.z, 9);
          if (bottega) hint = `Premi E · ${bottega.nome}`;
        }
        if (!hint && !st.dialogo && cooldownDialogo.current <= 0 && runtime.npcs) {
          for (const n of runtime.npcs) {
            if (n.tipo !== 'maranza') continue;
            if (Math.hypot(n.x - rt.persona.x, n.z - rt.persona.z) < 3.4) {
              hint = 'Premi E per parlare';
              break;
            }
          }
        }
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

    updateAudio(rt, st.mode, dt);

    // HUD a bassa frequenza
    hudAcc.current += dt;
    if (hudAcc.current > 0.2) {
      hudAcc.current = 0;
      const v = st.mode === 'auto' ? Math.abs(rt.vAuto) : rt.vPersona;
      st.setKmh(Math.round(v * 3.6));
    }

    // il nome della via, come nei giochi veri
    viaAcc.current += dt;
    if (viaAcc.current > 0.5) {
      viaAcc.current = 0;
      const t = st.mode === 'auto' ? rt.auto : rt.persona;
      const nome = viaVicina(mondo, t.x, t.z);
      if (nome !== viaPrima.current) {
        viaPrima.current = nome;
        st.setVia(nome);
      }
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
