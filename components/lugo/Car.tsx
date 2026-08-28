'use client';

// L'auto del giocatore: una utilitaria italiana costruita dalle
// PROPORZIONI descritte in lib/lugo/carrozzerie.ts — nessun marchio, solo
// la sagoma che si riconosce per strada. Rispetto alla scatola di prima:
// padiglione più stretto del corpo (il "tumblehome" che fa sembrare
// un'auto un'auto), parabrezza e lunotto inclinati, passaruota scuri,
// specchietti, maniglie, cofano che scende sul muso. Il modello guarda +X.

import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RuntimeGioco } from './Player';
import { TINTE_AUTO } from '@/lib/lugo/palette';
import { useLugo } from '@/lib/lugo/store';
import { runtime } from '@/lib/lugo/runtime';
import { cieloOra } from '@/lib/lugo/tempo';
import { CARROZZERIE, carrozzeriaById } from '@/lib/lugo/carrozzerie';

const VETRO = '#3A4756';
const GOMMA = '#1B1A1F';
const CERCHIO = '#B4B0B8';
const PLASTICA = '#2E2C33';

function Ruota({
  x,
  z,
  r,
  rt,
  sterzante,
}: {
  x: number;
  z: number;
  r: number;
  rt: RuntimeGioco;
  sterzante?: boolean;
}) {
  const sterzo = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  useFrame(() => {
    if (sterzante && sterzo.current) sterzo.current.rotation.y = -rt.auto.sterzo * 0.9;
    if (spin.current) spin.current.rotation.z = -rt.faseRuote;
  });
  return (
    <group position={[x, r, z]} ref={sterzo}>
      <group ref={spin}>
        {/* pneumatico */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, 0.2, 14]} />
          <meshLambertMaterial color={GOMMA} />
        </mesh>
        {/* cerchio in lega, appena fuori dal pneumatico */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, Math.sign(z) * 0.055]}>
          <cylinderGeometry args={[r * 0.62, r * 0.62, 0.1, 10]} />
          <meshLambertMaterial color={CERCHIO} />
        </mesh>
        {/* mozzo */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, Math.sign(z) * 0.09]}>
          <cylinderGeometry args={[r * 0.2, r * 0.2, 0.05, 8]} />
          <meshLambertMaterial color="#6E6A72" />
        </mesh>
      </group>
    </group>
  );
}

export const Car = forwardRef<THREE.Group, { rt: RuntimeGioco }>(function Car({ rt }, ref) {
  const tinta = useLugo((s) => s.tintaAuto);
  const modello = useLugo((s) => s.modelloAuto);
  const c = carrozzeriaById(CARROZZERIE[modello % CARROZZERIE.length].id);
  const colore = TINTE_AUTO[tinta % TINTE_AUTO.length].colore;
  const scuro = useMemo(() => new THREE.Color(colore).multiplyScalar(0.82), [colore]);

  const corpo = useRef<THREE.Group>(null);
  const stopD = useRef<THREE.MeshLambertMaterial>(null);
  const stopS = useRef<THREE.MeshLambertMaterial>(null);
  const faroD = useRef<THREE.MeshLambertMaterial>(null);
  const faroS = useRef<THREE.MeshLambertMaterial>(null);
  const vPrima = useRef(0);

  // quote ricavate dalla carrozzeria
  const yBase = c.rRuota + 0.06;
  const yCorpo = yBase + c.hCorpo / 2;
  const yCintura = yBase + c.hCorpo; // linea di cintura: dove finiscono le lamiere
  const yTetto = yCintura + c.hTetto;
  const largTetto = c.larg * 0.87;
  const xTetto = c.offTetto;
  const semiTetto = c.lungTetto / 2;
  const semiL = c.lung / 2;
  const semiPasso = c.passo / 2;

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const g = corpo.current;
    if (g) {
      const acc = dt > 0 ? (rt.vAuto - vPrima.current) / dt : 0;
      vPrima.current = rt.vAuto;
      const beccheggio = THREE.MathUtils.clamp(-acc * 0.006, -0.05, 0.06);
      const rollio = THREE.MathUtils.clamp(rt.auto.sterzo * rt.vAuto * 0.004, -0.05, 0.05);
      g.rotation.z += (beccheggio - g.rotation.z) * Math.min(1, dt * 8);
      g.rotation.x += (rollio - g.rotation.x) * Math.min(1, dt * 8);
    }
    const acceso = runtime.frenata ? 2.6 : 0.9;
    if (stopD.current) stopD.current.emissiveIntensity = acceso;
    if (stopS.current) stopS.current.emissiveIntensity = acceso;
    const fari = 0.45 + cieloOra().luci * 2.4;
    if (faroD.current) faroD.current.emissiveIntensity = fari;
    if (faroS.current) faroS.current.emissiveIntensity = fari;
  });

  return (
    <group ref={ref}>
      <group ref={corpo}>
        {/* ── scocca ──────────────────────────────────────────────────── */}
        {/* fascia bassa, appena più stretta: smussa lo spigolo a terra */}
        <mesh position={[0, yBase + 0.06, 0]} castShadow>
          <boxGeometry args={[c.lung * 0.97, 0.14, c.larg * 0.94]} />
          <meshLambertMaterial color={scuro} />
        </mesh>
        {/* fiancata */}
        <mesh position={[0, yCorpo, 0]} castShadow>
          <boxGeometry args={[c.lung, c.hCorpo, c.larg]} />
          <meshLambertMaterial color={colore} />
        </mesh>
        {/* cofano che scende sul muso */}
        <mesh position={[semiL - c.cofano / 2, yCintura - 0.02, 0]} rotation={[0, 0, -0.06]} castShadow>
          <boxGeometry args={[c.cofano, 0.12, c.larg * 0.96]} />
          <meshLambertMaterial color={colore} />
        </mesh>
        {/* coda */}
        <mesh position={[-semiL + 0.22, yCintura - 0.02, 0]} castShadow>
          <boxGeometry args={[0.44, 0.12, c.larg * 0.96]} />
          <meshLambertMaterial color={colore} />
        </mesh>

        {/* ── padiglione: più stretto del corpo, è ciò che fa "auto" ──── */}
        <mesh position={[xTetto, yCintura + c.hTetto / 2, 0]} castShadow>
          <boxGeometry args={[c.lungTetto * 0.98, c.hTetto * 0.9, largTetto]} />
          <meshLambertMaterial color={VETRO} />
        </mesh>
        {/* tetto in tinta, appena più stretto ancora */}
        <mesh position={[xTetto, yTetto, 0]} castShadow>
          <boxGeometry args={[c.lungTetto * 0.97, 0.09, largTetto * 0.97]} />
          <meshLambertMaterial color={colore} />
        </mesh>
        {/* montanti in tinta ai quattro angoli del padiglione */}
        {[
          [xTetto + semiTetto - 0.06, largTetto / 2],
          [xTetto + semiTetto - 0.06, -largTetto / 2],
          [xTetto - semiTetto + 0.06, largTetto / 2],
          [xTetto - semiTetto + 0.06, -largTetto / 2],
        ].map(([mx, mz], i) => (
          <mesh key={i} position={[mx, yCintura + c.hTetto / 2, mz]}>
            <boxGeometry args={[0.11, c.hTetto, 0.09]} />
            <meshLambertMaterial color={colore} />
          </mesh>
        ))}
        {/* parabrezza e lunotto inclinati */}
        <mesh
          position={[xTetto + semiTetto + 0.12, yCintura + c.hTetto * 0.5, 0]}
          rotation={[0, 0, -0.42 + c.squadrata * 0.2]}
        >
          <boxGeometry args={[0.07, c.hTetto * 1.12, largTetto * 0.97]} />
          <meshLambertMaterial color={VETRO} />
        </mesh>
        <mesh
          position={[xTetto - semiTetto - 0.1, yCintura + c.hTetto * 0.5, 0]}
          rotation={[0, 0, 0.34 - c.squadrata * 0.18]}
        >
          <boxGeometry args={[0.07, c.hTetto * 1.06, largTetto * 0.97]} />
          <meshLambertMaterial color={VETRO} />
        </mesh>

        {/* ── passaruota scuri: la ruota non esce più da una scatola ──── */}
        {[semiPasso, -semiPasso].map((px) =>
          [c.larg / 2 - 0.02, -c.larg / 2 + 0.02].map((pz) => (
            <mesh key={`${px}-${pz}`} position={[px, yBase + 0.04, pz]}>
              <boxGeometry args={[c.rRuota * 2.4, 0.3, 0.12]} />
              <meshLambertMaterial color={PLASTICA} />
            </mesh>
          )),
        )}

        {/* ── dettagli: specchietti, maniglie, modanatura ─────────────── */}
        {[c.larg / 2 + 0.07, -c.larg / 2 - 0.07].map((pz) => (
          <mesh key={pz} position={[xTetto + semiTetto + 0.05, yCintura + 0.05, pz]}>
            <boxGeometry args={[0.12, 0.09, 0.16]} />
            <meshLambertMaterial color={scuro} />
          </mesh>
        ))}
        {[c.larg / 2 + 0.005, -c.larg / 2 - 0.005].map((pz) => (
          <mesh key={'m' + pz} position={[xTetto, yCintura - 0.16, pz]}>
            <boxGeometry args={[c.lungTetto * 0.92, 0.05, 0.02]} />
            <meshLambertMaterial color={PLASTICA} />
          </mesh>
        ))}

        {/* ── luci ───────────────────────────────────────────────────── */}
        {[0.32, -0.32].map((pz, i) => (
          <mesh key={'f' + pz} position={[semiL - 0.02, yCintura - 0.16, pz * (c.larg / 0.8)]}>
            <boxGeometry args={[0.06, 0.15, 0.3]} />
            <meshLambertMaterial
              ref={i === 0 ? faroD : faroS}
              color="#FFF6D8"
              emissive="#FFE9A8"
              emissiveIntensity={0.7}
            />
          </mesh>
        ))}
        {[0.34, -0.34].map((pz, i) => (
          <mesh key={'s' + pz} position={[-semiL + 0.02, yCintura - 0.14, pz * (c.larg / 0.8)]}>
            <boxGeometry args={[0.05, 0.16, 0.26]} />
            <meshLambertMaterial
              ref={i === 0 ? stopD : stopS}
              color="#8A1F1A"
              emissive="#C0362C"
              emissiveIntensity={0.9}
            />
          </mesh>
        ))}
        {/* calandra e paraurti */}
        <mesh position={[semiL - 0.01, yCintura - 0.3, 0]}>
          <boxGeometry args={[0.05, 0.12, c.larg * 0.5]} />
          <meshLambertMaterial color={PLASTICA} />
        </mesh>
        <mesh position={[semiL - 0.04, yBase + 0.2, 0]}>
          <boxGeometry args={[0.16, 0.2, c.larg * 0.96]} />
          <meshLambertMaterial color={PLASTICA} />
        </mesh>
        <mesh position={[-semiL + 0.04, yBase + 0.2, 0]}>
          <boxGeometry args={[0.16, 0.2, c.larg * 0.96]} />
          <meshLambertMaterial color={PLASTICA} />
        </mesh>
        {/* targa */}
        <mesh position={[-semiL - 0.02, yBase + 0.24, 0]}>
          <boxGeometry args={[0.02, 0.1, 0.36]} />
          <meshLambertMaterial color="#E8E6DE" />
        </mesh>
      </group>

      <Ruota x={semiPasso} z={c.larg / 2 - 0.08} r={c.rRuota} rt={rt} sterzante />
      <Ruota x={semiPasso} z={-c.larg / 2 + 0.08} r={c.rRuota} rt={rt} sterzante />
      <Ruota x={-semiPasso} z={c.larg / 2 - 0.08} r={c.rRuota} rt={rt} />
      <Ruota x={-semiPasso} z={-c.larg / 2 + 0.08} r={c.rRuota} rt={rt} />
    </group>
  );
});
