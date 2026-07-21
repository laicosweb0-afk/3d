'use client';

// La villa M2: stessa regia e stessi contratti di M1 (buildOrder, lama,
// gruppi apribili), qualità artistica dei materiali dalle foto reali
// Mondial Service: intonaco caldo, pietra a spacco, rovere, calacatta,
// marquina, serramenti scuri. Geometrie ancora low-poly ma credibili.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  buildProgress, sweepX, doorOpen, wallOpen, strataOpen,
  lightsOn, windowOpen, contextAmount,
} from '@/content/direction';
import { progress } from '@/lib/progress';
import { smooth, span, clamp01 } from '@/lib/scenes';
import { sweepMaterial, sweepUniform } from '../materials/sweep';

const BUILD_STEPS = 8;

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

function Block({ size, at, mat, order, rotY = 0 }: BlockProps) {
  return (
    <group position={at} rotation-y={rotY} userData={{ order }}>
      <mesh position={[0, size[1] / 2, 0]} material={mat}>
        <boxGeometry args={size} />
      </mesh>
    </group>
  );
}

/** Serramento: cornice a 4 profili + lastra arretrata (mai telaio pieno). */
function Window({
  at, w, h, mats, rotY = 0, order = 6,
}: {
  at: [number, number, number];
  w: number; h: number;
  mats: { telaio: THREE.Material; vetro: THREE.Material };
  rotY?: number; order?: number;
}) {
  const t = 0.08, d = 0.09;
  return (
    <group position={at} rotation-y={rotY} userData={{ order }}>
      <mesh position={[0, h + t / 2, 0]} material={mats.telaio}>
        <boxGeometry args={[w + 2 * t, t, d]} />
      </mesh>
      <mesh position={[0, -t / 2, 0]} material={mats.telaio}>
        <boxGeometry args={[w + 2 * t, t, d]} />
      </mesh>
      <mesh position={[-(w + t) / 2, h / 2, 0]} material={mats.telaio}>
        <boxGeometry args={[t, h, d]} />
      </mesh>
      <mesh position={[(w + t) / 2, h / 2, 0]} material={mats.telaio}>
        <boxGeometry args={[t, h, d]} />
      </mesh>
      <mesh position={[0, h / 2, -0.015]} material={mats.vetro}>
        <boxGeometry args={[w, h, 0.02]} />
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
  const glowWin = useRef<THREE.MeshStandardMaterial>(null);

  // Texture fotografiche dei materiali reali (fornite dal cliente via Higgsfield)
  const T = useTexture({
    calacatta: '/assets/textures/calacatta.jpg',
    marquina: '/assets/textures/marquina.jpg',
    rovere: '/assets/textures/rovere.jpg',
    pietra: '/assets/textures/pietra.jpg',
  });

  const M = useMemo(() => {
    const setup = (t: THREE.Texture, rx: number, ry: number) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    };
    setup(T.calacatta, 1.6, 1.6);
    setup(T.marquina, 1.8, 1.8);
    setup(T.rovere, 3.2, 3.2);
    setup(T.pietra, 2.2, 1.5);
    const rovereScuro = T.rovere.clone();
    rovereScuro.repeat.set(0.6, 1);
    return {
      muro: sweepMaterial('#EDE7DC', { roughness: 0.85 }),
      pietraFacciata: sweepMaterial('#FFFFFF', { map: T.pietra, roughness: 0.9 }),
      pilastro: sweepMaterial('#E3E0D8', { roughness: 0.8 }),
      tetto: sweepMaterial('#3E4145', { roughness: 0.45, metalness: 0.35, envMapIntensity: 0.9 }),
      pavimento: sweepMaterial('#FFFFFF', { map: T.rovere, roughness: 0.55, envMapIntensity: 0.5 }),
      porta: sweepMaterial('#A8906F', { map: rovereScuro, roughness: 0.5 }),
      telaio: sweepMaterial('#3A3D42', { roughness: 0.4, metalness: 0.6, envMapIntensity: 1 }),
      vetro: new THREE.MeshStandardMaterial({
        color: '#C9D6D8', transparent: true, opacity: 0.26,
        roughness: 0.06, metalness: 0.1, envMapIntensity: 1.6,
      }),
      arredo: sweepMaterial('#C9C3B8', { roughness: 0.95 }),
      arredoScuro: sweepMaterial('#4A463F', { roughness: 0.7 }),
      calacatta: sweepMaterial('#FFFFFF', { map: T.calacatta, roughness: 0.3, envMapIntensity: 1.1 }),
      marquina: sweepMaterial('#FFFFFF', { map: T.marquina, roughness: 0.22, envMapIntensity: 1.3 }),
      ceramica: sweepMaterial('#F6F4F0', { roughness: 0.12, envMapIntensity: 1.2 }),
      metallo: sweepMaterial('#8A8D92', { roughness: 0.3, metalness: 0.85, envMapIntensity: 1.3 }),
      piastrella: sweepMaterial('#FFFFFF', { map: T.marquina, roughness: 0.25, envMapIntensity: 1.2 }),
      massetto: sweepMaterial('#BDB9B0', { roughness: 0.95 }),
      serpentina: sweepMaterial('#B0503C', { roughness: 0.5 }),
      isolante: sweepMaterial('#C4BBA8', { roughness: 0.95 }),
      soletta: sweepMaterial('#A9A59D', { roughness: 0.95 }),
      intonaco: sweepMaterial('#EDE9E0', { roughness: 0.9 }),
      montante: sweepMaterial('#8E959C', { roughness: 0.6, metalness: 0.3 }),
      tubo: sweepMaterial('#6E7076', { roughness: 0.5 }),
      terracotta: sweepMaterial('#A5754F', { roughness: 0.85 }),
      verde: sweepMaterial('#7D8471', { roughness: 1 }),
      tela: sweepMaterial('#F1EEE6', { roughness: 0.95 }),
      tessuto: sweepMaterial('#E9E4DA', { roughness: 1 }),
    };
  }, [T]);

  // Ombre reali su tutto (tranne i trasparenti): il costo è un solo sole.
  useEffect(() => {
    root.current?.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const transparent = (o.material as THREE.Material)?.transparent;
        o.castShadow = !transparent;
        o.receiveShadow = true;
      }
    });
  }, []);

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

  // vasca freestanding: profilo tornito liscio, chiuso sul bordo
  const tubGeo = useMemo(() => {
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.26, 0.004),
      new THREE.Vector2(0.35, 0.07),
      new THREE.Vector2(0.4, 0.22),
      new THREE.Vector2(0.42, 0.42),
      new THREE.Vector2(0.42, 0.52),
      new THREE.Vector2(0.4, 0.55),
    ];
    return new THREE.LatheGeometry(profile, 32);
  }, []);

  useFrame(() => {
    const p = progress.smoothed;
    if (!root.current) return;

    sweepUniform.value = sweepX(p);

    const bp = buildProgress(p);
    root.current.traverse((o) => {
      const order = (o.userData as { order?: number }).order;
      if (order === undefined) return;
      const s = buildScale(bp, order);
      o.scale.set(1, Math.max(s, 0.0001), 1);
      o.visible = s > 0.001;
    });

    if (doorRef.current) doorRef.current.rotation.y = doorOpen(p) * 1.9;
    if (windowRef.current) windowRef.current.rotation.y = windowOpen(p) * 1.65;

    const w = wallOpen(p);
    const w2 = smooth(span(w, 0.35, 1));
    if (wallL.current) wallL.current.position.x = -1.125 - w * 0.95;
    if (wallR.current) wallR.current.position.x = 1.125 + w * 0.95;
    if (insL.current) insL.current.position.x = -1.05 - w2 * 0.4;
    if (insR.current) insR.current.position.x = 1.05 + w2 * 0.4;

    const e = strataOpen(p);
    if (tileGroup.current) tileGroup.current.position.y = e * 0.95;
    if (screedGroup.current) screedGroup.current.position.y = e * 0.55;
    if (serpGroup.current) serpGroup.current.position.y = e * 0.18;
    if (insulGroup.current) insulGroup.current.position.y = -e * 0.06;
    if (slabGroup.current) slabGroup.current.position.y = -e * 0.18;

    const glow = lightsOn(p);
    if (lampLight.current) lampLight.current.intensity = glow * 6;
    if (lampMat.current) lampMat.current.emissiveIntensity = glow * 4;
    if (glowWin.current) glowWin.current.emissiveIntensity = glow * 1.6;
  });

  const winMats = { telaio: M.telaio, vetro: M.vetro };

  return (
    <group ref={root}>
      {/* ordine 0 — fondazioni */}
      <Block size={[10.6, 0.35, 5.8]} at={[0, 0, 1.4]} mat={M.soletta} order={0} />
      <Block size={[10.6, 0.15, 2.9]} at={[0, 0, -2.9]} mat={M.soletta} order={0} />

      {/* ordine 1 — pavimenti interni (rovere) */}
      <Block size={[9.8, 0.06, 5.4]} at={[0, 0.35, 1.15]} mat={M.pavimento} order={1} />
      <Block size={[5.4, 0.26, 2.4]} at={[2.25, 0.15, -2.7]} mat={M.pavimento} order={1} />

      {/* ordine 2 — pilastri */}
      {([[-4.9, -3.9], [4.9, -3.9], [-4.9, 3.9], [4.9, 3.9]] as const).map(([x, z], i) => (
        <Block key={i} size={[0.35, 3, 0.35]} at={[x, 0.35, z]} mat={M.pilastro} order={2} />
      ))}

      {/* ordine 3 — muri perimetrali (facciata: intonaco + settore in pietra) */}
      <Block size={[10, 3, 0.3]} at={[0, 0.35, -3.85]} mat={M.muro} order={3} />
      <Block size={[4.4, 3, 0.3]} at={[-2.8, 0.35, 3.85]} mat={M.pietraFacciata} order={3} />
      <Block size={[4.4, 3, 0.3]} at={[2.8, 0.35, 3.85]} mat={M.muro} order={3} />
      <Block size={[1.2, 0.8, 0.3]} at={[0, 2.55, 3.85]} mat={M.muro} order={3} />
      <Block size={[0.3, 3, 8]} at={[4.85, 0.35, 0]} mat={M.muro} order={3} />
      <Block size={[0.3, 3, 6.45]} at={[-4.85, 0.35, 0.775]} mat={M.muro} order={3} />
      <Block size={[0.3, 3, 0.45]} at={[-4.85, 0.35, -3.775]} mat={M.muro} order={3} />
      <Block size={[0.3, 0.6, 1.1]} at={[-4.85, 0.35, -3.0]} mat={M.muro} order={3} />
      <Block size={[0.3, 1.0, 1.1]} at={[-4.85, 2.35, -3.0]} mat={M.muro} order={3} />

      {/* ordine 4 — copertura sottile scura + soffitto */}
      <Block size={[10.8, 0.22, 8.8]} at={[0, 3.35, 0]} mat={M.tetto} order={4} />
      <group position={[0, 3.34, 0]} userData={{ order: 4 }}>
        <mesh rotation-x={Math.PI / 2} material={M.intonaco}>
          <planeGeometry args={[9.8, 7.8]} />
        </mesh>
      </group>

      {/* ordine 5 — parete interna attrezzata (S08) */}
      <group position={[-2.75, 0.35, -1.5]} userData={{ order: 5 }}>
        <group ref={wallL} position={[-1.125, 0, 0]}>
          <mesh position={[0, 1.5, 0.1]} material={M.intonaco}>
            <boxGeometry args={[2.25, 3, 0.05]} />
          </mesh>
          <mesh position={[0, 1.5, -0.1]} material={M.calacatta}>
            <boxGeometry args={[2.25, 3, 0.05]} />
          </mesh>
        </group>
        <group ref={wallR} position={[1.125, 0, 0]}>
          <mesh position={[0, 1.5, 0.1]} material={M.intonaco}>
            <boxGeometry args={[2.25, 3, 0.05]} />
          </mesh>
          <mesh position={[0, 1.5, -0.1]} material={M.calacatta}>
            <boxGeometry args={[2.25, 3, 0.05]} />
          </mesh>
        </group>
        {[-1.6, -0.35, 1.5].map((x) => (
          <mesh key={x} position={[x, 1.5, 0]} material={M.montante}>
            <boxGeometry args={[0.12, 3, 0.09]} />
          </mesh>
        ))}
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
        {[0.75, 1.05].map((y) => (
          <mesh key={y} position={[0, y, 0.045]} rotation-z={Math.PI / 2} material={M.tubo}>
            <cylinderGeometry args={[0.022, 0.022, 2.8, 10]} />
          </mesh>
        ))}
        <mesh position={[0.55, 1.35, 0.045]} material={M.tubo}>
          <boxGeometry args={[0.13, 0.13, 0.06]} />
        </mesh>
      </group>

      {/* rivestimenti bagno: fascia marquina + parete calacatta (dalla foto reale) */}
      <Block size={[4.35, 2.55, 0.05]} at={[-2.75, 0.36, -3.67]} mat={M.calacatta} order={5} />
      <Block size={[0.05, 1.2, 0.85]} at={[-4.66, 0.36, -1.98]} mat={M.marquina} order={5} />
      <Block size={[0.05, 0.55, 1.2]} at={[-4.66, 0.36, -3.0]} mat={M.marquina} order={5} />
      <Block size={[0.05, 1.2, 0.35]} at={[-4.66, 0.36, -3.78]} mat={M.marquina} order={5} />

      {/* ordine 6 — serramenti */}
      <group position={[-0.6, 0.35, 3.85]} userData={{ order: 6 }}>
        <group ref={doorRef}>
          <mesh position={[0.6, 1.1, 0]} material={M.porta}>
            <boxGeometry args={[1.18, 2.2, 0.07]} />
          </mesh>
          <mesh position={[1.05, 1.1, 0.06]} material={M.metallo}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
          </mesh>
        </group>
      </group>
      <Window at={[2.8, 1.3, 4.02]} w={1.7} h={1.45} mats={winMats} />
      <Window at={[5.03, 0.85, 0.7]} w={2.7} h={1.85} mats={winMats} rotY={Math.PI / 2} />
      <group position={[-4.85, 0.95, -2.45]} userData={{ order: 6 }}>
        <group ref={windowRef}>
          {/* anta della finestra del bagno: cornice + lastra */}
          <mesh position={[0, 1.38, -0.55]} material={M.telaio}>
            <boxGeometry args={[0.06, 0.08, 1.12]} />
          </mesh>
          <mesh position={[0, 0.02, -0.55]} material={M.telaio}>
            <boxGeometry args={[0.06, 0.08, 1.12]} />
          </mesh>
          <mesh position={[0, 0.7, -0.03]} material={M.telaio}>
            <boxGeometry args={[0.06, 1.44, 0.08]} />
          </mesh>
          <mesh position={[0, 0.7, -1.07]} material={M.telaio}>
            <boxGeometry args={[0.06, 1.44, 0.08]} />
          </mesh>
          <mesh position={[0, 0.7, -0.55]} material={M.vetro}>
            <boxGeometry args={[0.02, 1.28, 0.96]} />
          </mesh>
        </group>
      </group>

      {/* stratigrafia del bagno (S09) */}
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
        {/* il bagno sale con la sua piastrella (marquina) */}
        <group ref={tileGroup}>
          <mesh position={[0, 0.465, 0]} material={M.piastrella}>
            <boxGeometry args={[4.4, 0.03, 2.4]} />
          </mesh>
          {/* vasca freestanding + rubinetteria (dalla foto marquina/calacatta) */}
          <mesh
            geometry={tubGeo}
            material={M.ceramica}
            position={[-1.55, 0.49, -0.55]}
            scale={[1.7, 1.0, 1.05]}
          />
          <mesh position={[-2.2, 0.75, -0.9]} material={M.metallo}>
            <cylinderGeometry args={[0.02, 0.02, 0.65, 8]} />
          </mesh>
          <mesh position={[-2.2, 1.08, -0.82]} rotation-x={Math.PI / 2.4} material={M.metallo}>
            <cylinderGeometry args={[0.013, 0.013, 0.22, 8]} />
          </mesh>
          {/* barra e asciugamani sulla parete calacatta */}
          <mesh position={[0.35, 1.25, -0.86]} rotation-z={Math.PI / 2} material={M.metallo}>
            <cylinderGeometry args={[0.01, 0.01, 0.7, 8]} />
          </mesh>
          <mesh position={[0.2, 1.05, -0.84]} material={M.ceramica}>
            <boxGeometry args={[0.26, 0.38, 0.02]} />
          </mesh>
          <mesh position={[0.52, 1.08, -0.84]} material={M.tessuto}>
            <boxGeometry args={[0.24, 0.32, 0.02]} />
          </mesh>
          {/* mobile bagno: rovere + top calacatta + lavabo */}
          <group position={[1.6, 0, -0.9]}>
            <mesh position={[0, 0.75, 0]} material={M.porta}>
              <boxGeometry args={[0.95, 0.55, 0.45]} />
            </mesh>
            <mesh position={[0, 1.05, 0]} material={M.calacatta}>
              <boxGeometry args={[1.0, 0.04, 0.5]} />
            </mesh>
            <mesh position={[0, 1.12, 0]} material={M.ceramica}>
              <cylinderGeometry args={[0.16, 0.19, 0.13, 20]} />
            </mesh>
          </group>
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

      {/* finestre che si accendono (S10-bis, viste da fuori in S11) */}
      <group position={[2.8, 1.3, 3.99]} userData={{ order: 6 }}>
        <mesh position={[0, 0.725, 0]}>
          <planeGeometry args={[1.6, 1.35]} />
          <meshStandardMaterial
            ref={glowWin}
            color="#DDE3E4"
            emissive="#FFD9A0"
            emissiveIntensity={0}
            transparent
            opacity={0.55}
          />
        </mesh>
      </group>

      {/* micro-dettagli architettonici: battiscopa e cornice porta (ordine 7) */}
      <group userData={{ order: 7 }}>
        <mesh position={[-2.75, 0.45, -1.36]} material={M.intonaco}>
          <boxGeometry args={[4.5, 0.08, 0.02]} />
        </mesh>
        <mesh position={[4.69, 0.45, 0]} material={M.intonaco}>
          <boxGeometry args={[0.02, 0.08, 7.4]} />
        </mesh>
        <mesh position={[0, 0.45, 3.69]} material={M.intonaco}>
          <boxGeometry args={[9.4, 0.08, 0.02]} />
        </mesh>
        <mesh position={[-4.69, 0.45, 1.25]} material={M.intonaco}>
          <boxGeometry args={[0.02, 0.08, 5.4]} />
        </mesh>
        {/* cornice della porta d'ingresso */}
        <mesh position={[-0.66, 1.47, 4.02]} material={M.porta}>
          <boxGeometry args={[0.09, 2.3, 0.05]} />
        </mesh>
        <mesh position={[0.66, 1.47, 4.02]} material={M.porta}>
          <boxGeometry args={[0.09, 2.3, 0.05]} />
        </mesh>
        <mesh position={[0, 2.62, 4.02]} material={M.porta}>
          <boxGeometry args={[1.42, 0.09, 0.05]} />
        </mesh>
      </group>

      {/* dettagli d'ambiente, discreti (ordine 7) */}
      <group userData={{ order: 7 }}>
        {/* quadri minimal */}
        <group position={[4.68, 1.55, -2.2]}>
          <mesh material={M.arredoScuro}>
            <boxGeometry args={[0.03, 0.95, 0.75]} />
          </mesh>
          <mesh position={[-0.02, 0, 0]} material={M.tela}>
            <boxGeometry args={[0.01, 0.82, 0.62]} />
          </mesh>
        </group>
        <group position={[1.6, 1.7, -3.68]}>
          <mesh material={M.arredoScuro}>
            <boxGeometry args={[0.7, 0.9, 0.03]} />
          </mesh>
          <mesh position={[0, 0, 0.02]} material={M.tela}>
            <boxGeometry args={[0.58, 0.78, 0.01]} />
          </mesh>
        </group>
        {/* libri sul tavolino */}
        <mesh position={[1.62, 0.77, -0.18]} rotation-y={0.12} material={M.arredoScuro}>
          <boxGeometry args={[0.3, 0.025, 0.21]} />
        </mesh>
        <mesh position={[1.64, 0.795, -0.16]} rotation-y={-0.06} material={M.tela}>
          <boxGeometry args={[0.27, 0.022, 0.19]} />
        </mesh>
        <mesh position={[2.05, 0.77, 0.05]} rotation-y={0.4} material={M.verde}>
          <boxGeometry args={[0.24, 0.02, 0.17]} />
        </mesh>
        {/* vaso sul mobile basso */}
        <mesh position={[4.4, 0.99, 1.1]} material={M.ceramica}>
          <cylinderGeometry args={[0.06, 0.08, 0.16, 16]} />
        </mesh>
        {/* pianta in vaso di terracotta */}
        <group position={[-4.15, 0.41, 3.1]}>
          <mesh position={[0, 0.16, 0]} material={M.terracotta}>
            <cylinderGeometry args={[0.15, 0.12, 0.32, 16]} />
          </mesh>
          <mesh position={[0, 0.55, 0]} material={M.porta}>
            <cylinderGeometry args={[0.018, 0.024, 0.5, 8]} />
          </mesh>
          <mesh position={[0, 0.95, 0]} scale={[1, 0.85, 1]} material={M.verde}>
            <icosahedronGeometry args={[0.32, 1]} />
          </mesh>
          <mesh position={[0.18, 1.12, 0.08]} scale={[0.7, 0.6, 0.7]} material={M.verde}>
            <icosahedronGeometry args={[0.24, 1]} />
          </mesh>
        </group>
        {/* lampada da terra */}
        <group position={[3.5, 0.41, 2.9]}>
          <mesh position={[0, 0.01, 0]} material={M.metallo}>
            <cylinderGeometry args={[0.14, 0.14, 0.02, 20]} />
          </mesh>
          <mesh position={[0, 0.7, 0]} material={M.metallo}>
            <cylinderGeometry args={[0.012, 0.012, 1.4, 8]} />
          </mesh>
          <mesh position={[0, 1.45, 0]} material={M.tessuto}>
            <cylinderGeometry args={[0.13, 0.16, 0.22, 20, 1, true]} />
          </mesh>
        </group>
      </group>

      {/* ordine 7 — arredi soggiorno */}
      <group position={[2.2, 0.41, 1.7]} userData={{ order: 7 }}>
        <mesh position={[0, 0.22, 0]} material={M.arredo}>
          <boxGeometry args={[2.0, 0.42, 0.9]} />
        </mesh>
        <mesh position={[0, 0.55, -0.36]} material={M.arredo}>
          <boxGeometry args={[2.0, 0.5, 0.18]} />
        </mesh>
        {[-0.5, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.48, 0.02]} material={M.arredo}>
            <boxGeometry args={[0.9, 0.14, 0.75]} />
          </mesh>
        ))}
      </group>
      <group position={[1.8, 0.41, -0.1]} userData={{ order: 7 }}>
        <mesh position={[0, 0.32, 0]} material={M.calacatta}>
          <boxGeometry args={[1.1, 0.05, 0.7]} />
        </mesh>
        <mesh position={[0, 0.15, 0]} material={M.arredoScuro}>
          <boxGeometry args={[0.9, 0.3, 0.5]} />
        </mesh>
      </group>
      <Block size={[0.45, 0.5, 2.4]} at={[4.4, 0.41, 0.4]} mat={M.arredoScuro} order={7} />
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

  // Non illuminato e fuori dal tone mapping: il terreno è il foglio,
  // si fonde con il fondo senza linea d'orizzonte.
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
      <circleGeometry args={[60, 48]} />
      <meshBasicMaterial ref={mat} color="#FAFAF8" toneMapped={false} />
    </mesh>
  );
}
