'use client';

// La villa placeholder di M1. Geometrie grigie, ma con la struttura dati
// definitiva: buildOrder per la costruzione (S03), materiali sweep per la
// lama (S04), gruppi apribili per parete (S08) e stratigrafia (S09).
// In M2 le box diventano il modello Blender: i contratti restano questi.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  buildProgress, sweepX, doorOpen, wallOpen, strataOpen,
  lightsOn, windowOpen, contextAmount,
} from '@/content/direction';
import { progress } from '@/lib/progress';
import { smooth, span, clamp01 } from '@/lib/scenes';
import { sweepMaterial, sweepUniform } from '../materials/sweep';

const BUILD_STEPS = 8; // gruppi di costruzione 0..7

/** ScaleY di un gruppo di costruzione: finestre scaglionate su buildProgress. */
function buildScale(bp: number, order: number): number {
  const start = (order / BUILD_STEPS) * 0.82;
  return smooth(span(bp, start, start + 0.18));
}

interface BlockProps {
  size: [number, number, number];
  at: [number, number, number];
  mat: THREE.Material;
  order: number;
  rotY?: number;
}

/** Volume che si costruisce dal basso (origine alla base). */
function Block({ size, at, mat, order, rotY = 0 }: BlockProps) {
  return (
    <group position={at} rotation-y={rotY} userData={{ order }}>
      <mesh position={[0, size[1] / 2, 0]} material={mat} castShadow>
        <boxGeometry args={size} />
      </mesh>
    </group>
  );
}

export function Villa() {
  const root = useRef<THREE.Group>(null);
  const doorRef = useRef<THREE.Group>(null);
  const windowRef = useRef<THREE.Group>(null);
  const wallL = useRef<THREE.Group>(null);
  const wallR = useRef<THREE.Group>(null);
  const insL = useRef<THREE.Group>(null);
  const insR = useRef<THREE.Group>(null);
  const tileGroup = useRef<THREE.Group>(null);
  const screedGroup = useRef<THREE.Group>(null);
  const serpGroup = useRef<THREE.Group>(null);
  const insulGroup = useRef<THREE.Group>(null);
  const slabGroup = useRef<THREE.Group>(null);
  const lampLight = useRef<THREE.PointLight>(null);
  const lampMat = useRef<THREE.MeshStandardMaterial>(null);

  const M = useMemo(() => ({
    muro: sweepMaterial('#EAE6DD'),
    pilastro: sweepMaterial('#DDD9D0'),
    tetto: sweepMaterial('#595C61', { roughness: 0.7 }),
    pavimento: sweepMaterial('#8F7A62', { roughness: 0.6 }),
    porta: sweepMaterial('#816448', { roughness: 0.55 }),
    arredo: sweepMaterial('#C9C4B9', { roughness: 0.8 }),
    ceramica: sweepMaterial('#F4F2EE', { roughness: 0.3 }),
    piastrella: sweepMaterial('#E5E1D8', { roughness: 0.4 }),
    massetto: sweepMaterial('#BDB9B0', { roughness: 0.95 }),
    serpentina: sweepMaterial('#B0503C', { roughness: 0.5 }),
    isolante: sweepMaterial('#C4BBA8', { roughness: 0.95 }),
    soletta: sweepMaterial('#A9A59D', { roughness: 0.95 }),
    intonaco: sweepMaterial('#EDE9E0'),
    montante: sweepMaterial('#8E959C', { roughness: 0.6 }),
    tubo: sweepMaterial('#6E7076', { roughness: 0.5 }),
  }), []);

  const serpentineGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const xs = [-1.4, -4.3];
    let zi = -1.9;
    for (let row = 0; row < 5; row++) {
      const [a, b] = row % 2 === 0 ? xs : [xs[1], xs[0]];
      pts.push(new THREE.Vector3(a, 0, zi), new THREE.Vector3(b, 0, zi));
      zi -= 0.4;
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.12);
    return new THREE.TubeGeometry(curve, 220, 0.035, 10, false);
  }, []);

  useFrame(() => {
    const p = progress.smoothed;
    if (!root.current) return;

    // S04/S12 — lama di trasformazione (uniform globale)
    sweepUniform.value = sweepX(p);

    // S03 — costruzione: scala dal suolo per buildOrder
    const bp = buildProgress(p);
    root.current.traverse((o) => {
      const order = (o.userData as { order?: number }).order;
      if (order === undefined) return;
      const s = buildScale(bp, order);
      o.scale.set(1, Math.max(s, 0.0001), 1);
      o.visible = s > 0.001;
    });

    // S06 — la porta si apre con lo scroll (verso l'interno)
    if (doorRef.current) doorRef.current.rotation.y = doorOpen(p) * 1.9;

    // S11 — la finestra si apre per l'uscita
    if (windowRef.current) windowRef.current.rotation.y = windowOpen(p) * 1.65;

    // S08 — spaccato della parete: le pelli scorrono, gli strati si mostrano
    const w = wallOpen(p);
    const w2 = smooth(span(w, 0.35, 1));
    if (wallL.current) wallL.current.position.x = -1.125 - w * 0.95;
    if (wallR.current) wallR.current.position.x = 1.125 + w * 0.95;
    if (insL.current) insL.current.position.x = -1.05 - w2 * 0.4;
    if (insR.current) insR.current.position.x = 1.05 + w2 * 0.4;

    // S09 — esploso della stratigrafia (il bagno sale con la sua piastrella)
    const e = strataOpen(p);
    if (tileGroup.current) tileGroup.current.position.y = e * 0.95;
    if (screedGroup.current) screedGroup.current.position.y = e * 0.55;
    if (serpGroup.current) serpGroup.current.position.y = e * 0.18;
    if (insulGroup.current) insulGroup.current.position.y = -e * 0.06;
    if (slabGroup.current) slabGroup.current.position.y = -e * 0.18;

    // S10-bis — la casa si accende
    const glow = lightsOn(p);
    if (lampLight.current) lampLight.current.intensity = glow * 6;
    if (lampMat.current) lampMat.current.emissiveIntensity = glow * 4;
  });

  return (
    <group ref={root}>
      {/* ordine 0 — fondazioni (fronte pieno; zona bagno ribassata per la stratigrafia) */}
      <Block size={[10.6, 0.35, 5.8]} at={[0, 0, 1.4]} mat={M.soletta} order={0} />
      <Block size={[10.6, 0.15, 2.9]} at={[0, 0, -2.9]} mat={M.soletta} order={0} />

      {/* ordine 1 — pavimenti interni */}
      <Block size={[9.8, 0.06, 5.4]} at={[0, 0.35, 1.15]} mat={M.pavimento} order={1} />
      <Block size={[5.4, 0.26, 2.4]} at={[2.25, 0.15, -2.7]} mat={M.pavimento} order={1} />

      {/* ordine 2 — pilastri */}
      {([[-4.9, -3.9], [4.9, -3.9], [-4.9, 3.9], [4.9, 3.9]] as const).map(([x, z], i) => (
        <Block key={i} size={[0.35, 3, 0.35]} at={[x, 0.35, z]} mat={M.pilastro} order={2} />
      ))}

      {/* ordine 3 — muri perimetrali */}
      <Block size={[10, 3, 0.3]} at={[0, 0.35, -3.85]} mat={M.muro} order={3} />
      <Block size={[4.4, 3, 0.3]} at={[-2.8, 0.35, 3.85]} mat={M.muro} order={3} />
      <Block size={[4.4, 3, 0.3]} at={[2.8, 0.35, 3.85]} mat={M.muro} order={3} />
      <Block size={[1.2, 0.8, 0.3]} at={[0, 2.55, 3.85]} mat={M.muro} order={3} />
      <Block size={[0.3, 3, 8]} at={[4.85, 0.35, 0]} mat={M.muro} order={3} />
      {/* parete ovest con vano finestra (bagno) */}
      <Block size={[0.3, 3, 6.45]} at={[-4.85, 0.35, 0.775]} mat={M.muro} order={3} />
      <Block size={[0.3, 3, 0.45]} at={[-4.85, 0.35, -3.775]} mat={M.muro} order={3} />
      <Block size={[0.3, 0.6, 1.1]} at={[-4.85, 0.35, -3.0]} mat={M.muro} order={3} />
      <Block size={[0.3, 1.0, 1.1]} at={[-4.85, 2.35, -3.0]} mat={M.muro} order={3} />

      {/* ordine 4 — copertura + soffitto interno */}
      <Block size={[10.8, 0.35, 8.8]} at={[0, 3.35, 0]} mat={M.tetto} order={4} />
      <group position={[0, 3.34, 0]} userData={{ order: 4 }}>
        <mesh rotation-x={Math.PI / 2} material={M.intonaco}>
          <planeGeometry args={[9.8, 7.8]} />
        </mesh>
      </group>

      {/* ordine 5 — parete interna attrezzata (S08), z = -1.5 */}
      <group position={[-2.75, 0.35, -1.5]} userData={{ order: 5 }}>
        {/* pelli che si aprono */}
        <group ref={wallL} position={[-1.125, 0, 0]}>
          <mesh position={[0, 1.5, 0.1]} material={M.intonaco}>
            <boxGeometry args={[2.25, 3, 0.05]} />
          </mesh>
          <mesh position={[0, 1.5, -0.1]} material={M.intonaco}>
            <boxGeometry args={[2.25, 3, 0.05]} />
          </mesh>
        </group>
        <group ref={wallR} position={[1.125, 0, 0]}>
          <mesh position={[0, 1.5, 0.1]} material={M.intonaco}>
            <boxGeometry args={[2.25, 3, 0.05]} />
          </mesh>
          <mesh position={[0, 1.5, -0.1]} material={M.intonaco}>
            <boxGeometry args={[2.25, 3, 0.05]} />
          </mesh>
        </group>
        {/* struttura: montanti (fuori dalla traiettoria della camera) */}
        {[-1.6, -0.35, 1.5].map((x) => (
          <mesh key={x} position={[x, 1.5, 0]} material={M.montante}>
            <boxGeometry args={[0.12, 3, 0.09]} />
          </mesh>
        ))}
        {/* isolamento */}
        <group ref={insL} position={[-1.05, 0, 0]}>
          <mesh position={[0, 1.45, -0.035]} material={M.isolante}>
            <boxGeometry args={[1.15, 2.8, 0.07]} />
          </mesh>
        </group>
        <group ref={insR} position={[1.05, 0, 0]}>
          <mesh position={[0, 1.45, -0.035]} material={M.isolante}>
            <boxGeometry args={[1.15, 2.8, 0.07]} />
          </mesh>
        </group>
        {/* impianti: corrugati e scatola */}
        {[0.75, 1.05].map((y) => (
          <mesh key={y} position={[0, y, 0.045]} rotation-z={Math.PI / 2} material={M.tubo}>
            <cylinderGeometry args={[0.022, 0.022, 2.8, 10]} />
          </mesh>
        ))}
        <mesh position={[0.55, 1.35, 0.045]} material={M.tubo}>
          <boxGeometry args={[0.13, 0.13, 0.06]} />
        </mesh>
      </group>

      {/* ordine 6 — serramenti */}
      <group position={[-0.6, 0.35, 3.85]} userData={{ order: 6 }}>
        <group ref={doorRef}>
          <mesh position={[0.6, 1.1, 0]} material={M.porta}>
            <boxGeometry args={[1.18, 2.2, 0.07]} />
          </mesh>
        </group>
      </group>
      <group position={[-4.85, 0.95, -2.45]} userData={{ order: 6 }}>
        <group ref={windowRef}>
          <mesh position={[0, 0.7, -0.55]} material={M.ceramica}>
            <boxGeometry args={[0.05, 1.4, 1.08]} />
          </mesh>
        </group>
      </group>

      {/* stratigrafia del bagno (S09), zona x -5..-0.5, z -4..-1.5 */}
      <group position={[-2.75, 0, -2.75]} userData={{ order: 1 }}>
        <group ref={slabGroup}>
          <mesh position={[0, 0.22, 0]} material={M.soletta}>
            <boxGeometry args={[4.4, 0.14, 2.4]} />
          </mesh>
        </group>
        <group ref={insulGroup}>
          <mesh position={[0, 0.32, 0]} material={M.isolante}>
            <boxGeometry args={[4.4, 0.06, 2.4]} />
          </mesh>
        </group>
        <group ref={serpGroup} position-y={0}>
          <mesh geometry={serpentineGeo} material={M.serpentina} position={[2.75, 0.385, 2.75]} />
        </group>
        <group ref={screedGroup}>
          <mesh position={[0, 0.425, 0]} material={M.massetto}>
            <boxGeometry args={[4.4, 0.05, 2.4]} />
          </mesh>
        </group>
        {/* il bagno sale con la sua piastrella */}
        <group ref={tileGroup}>
          <mesh position={[0, 0.465, 0]} material={M.piastrella}>
            <boxGeometry args={[4.4, 0.03, 2.4]} />
          </mesh>
          {/* vasca freestanding (dalla foto reale marquina/calacatta) */}
          <mesh position={[-1.55, 0.76, -0.55]} material={M.ceramica}>
            <boxGeometry args={[1.6, 0.56, 0.78]} />
          </mesh>
          <mesh position={[1.6, 0.87, -0.9]} material={M.arredo}>
            <boxGeometry args={[0.85, 0.78, 0.42]} />
          </mesh>
        </group>
        {/* lampada del bagno (S10-bis) */}
        <mesh position={[-0.5, 3.28, -0.3]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[0.9, 0.5]} />
          <meshStandardMaterial
            ref={lampMat}
            color="#FFFFFF"
            emissive="#FFD9A0"
            emissiveIntensity={0}
          />
        </mesh>
        <pointLight ref={lampLight} position={[-0.5, 2.6, -0.3]} color="#FFD9A0" intensity={0} distance={7} decay={1.6} />
      </group>

      {/* ordine 7 — arredi del soggiorno */}
      <Block size={[2.0, 0.7, 0.9]} at={[2.2, 0.41, 1.7]} mat={M.arredo} order={7} />
      <Block size={[1.1, 0.34, 0.7]} at={[1.8, 0.41, -0.1]} mat={M.arredo} order={7} />
      <Block size={[0.45, 0.5, 2.4]} at={[4.4, 0.41, 0.4]} mat={M.arredo} order={7} />
    </group>
  );
}

/** Terreno e contesto: bianco assoluto che diventa (appena) reale in S05. */
export function Ground() {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const white = useMemo(() => new THREE.Color('#FAFAF8'), []);
  const green = useMemo(() => new THREE.Color('#E2E5DA'), []);

  useFrame(({ scene }) => {
    const c = contextAmount(progress.smoothed);
    if (mat.current) mat.current.color.copy(white).lerp(green, c * 0.8);
    if (scene.background instanceof THREE.Color) {
      scene.background.setRGB(
        THREE.MathUtils.lerp(0.98, 0.936, clamp01(c) * 0.5),
        THREE.MathUtils.lerp(0.98, 0.945, clamp01(c) * 0.5),
        THREE.MathUtils.lerp(0.972, 0.955, clamp01(c) * 0.5)
      );
    }
  });

  // Non illuminato: il terreno è il foglio, si fonde con il fondo.
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
      <circleGeometry args={[60, 48]} />
      <meshBasicMaterial ref={mat} color="#FAFAF8" />
    </mesh>
  );
}
