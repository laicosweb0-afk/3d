'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { orologio, lerp, passaggio, presenza, seme, tratto } from '@/lib/cartone/tempo';

/**
 * Le campagne: il prodotto si moltiplica in schede che volano dentro tre
 * riquadri, e sotto sale una curva.
 *
 * I tre riquadri non portano il logo di Meta, Google o TikTok: mettere marchi
 * altrui in uno spot che vende noi è un problema legale e, prima ancora, un
 * modo per dire che il nostro mestiere è saper cliccare in tre pannelli. Sono
 * tre destinazioni, e chi lavora nel settore capisce quali.
 *
 * La curva che sale è l'unico numero del corto, ed è muta di proposito: non
 * ha una scala, non ha una percentuale accanto. Le statistiche gonfiate sono
 * già state tolte dal sito una volta (vedi SECTORS in
 * components/mediapro/content.ts) — non rientrano dalla porta del video.
 */

const BERSAGLI: [number, number, number][] = [
  [-1.34, 2.05, -1.5],
  [1.36, 1.85, -1.4],
  [-0.05, 4.15, -2.0],
];

const QUANTE = 9;
/** I punti della salita: pochi e distinti, si contano a occhio. */
const PUNTI = 12;

export function Campagna() {
  const gruppo = useRef<THREE.Group>(null);
  const schede = useRef<(THREE.Mesh | null)[]>([]);
  const riquadri = useRef<(THREE.Mesh | null)[]>([]);
  const punti = useRef<(THREE.Mesh | null)[]>([]);

  const volo = useMemo(
    () =>
      Array.from({ length: QUANTE }, (_, i) => ({
        bersaglio: BERSAGLI[i % 3],
        da: 20.25 + i * 0.16,
        // Ogni scheda prende una strada leggermente diversa: senza, sembrano
        // un unico oggetto che si sdoppia.
        arco: 0.9 + seme(i * 5 + 1) * 1.5,
        sbanda: (seme(i * 9 + 4) - 0.5) * 1.1,
        posa: (seme(i * 17 + 8) - 0.5) * 0.5,
      })),
    [],
  );

  // La salita, fatta di punti invece che di una linea: una polilinea di un
  // pixel su un verticale ricompresso da Instagram sparisce, e non si può
  // ispessire (lo spessore delle linee non è supportato quasi ovunque). I
  // punti si accendono uno dopo l'altro e si contano a occhio.
  const salita = useMemo(
    () =>
      Array.from({ length: PUNTI }, (_, i) => {
        const k = i / (PUNTI - 1);
        return [lerp(-1.52, 0.42, k), 0.8 + Math.pow(k, 1.6) * 2.55, -1.05] as [number, number, number];
      }),
    [],
  );

  useFrame(() => {
    const t = orologio.t;
    const vivo = presenza(t, 19.9, 24.4, 0.6, 1.0);
    if (gruppo.current) gruppo.current.visible = vivo > 0.01;
    if (vivo <= 0.01) return;

    riquadri.current.forEach((r, i) => {
      if (!r) return;
      const k = passaggio(t, 20.0 + i * 0.16, 20.7 + i * 0.16);
      r.scale.setScalar(0.6 + k * 0.4);
      (r.material as THREE.MeshBasicMaterial).opacity = vivo * k * 0.45;
    });

    schede.current.forEach((s, i) => {
      if (!s) return;
      const v = volo[i];
      const k = tratto(t, v.da, v.da + 1.15);
      const m = s.material as THREE.MeshStandardMaterial;
      if (k <= 0) {
        s.visible = false;
        return;
      }
      s.visible = true;
      // Bezier quadratica: la scheda parte dal prodotto, scavalca e si posa.
      const p0 = new THREE.Vector3(0, 1.0, 0.78);
      const p2 = new THREE.Vector3(...v.bersaglio);
      const p1 = new THREE.Vector3(
        (p0.x + p2.x) / 2 + v.sbanda,
        Math.max(p0.y, p2.y) + v.arco,
        (p0.z + p2.z) / 2 + 0.9,
      );
      const u = 1 - k;
      s.position.set(
        u * u * p0.x + 2 * u * k * p1.x + k * k * p2.x,
        u * u * p0.y + 2 * u * k * p1.y + k * k * p2.y,
        u * u * p0.z + 2 * u * k * p1.z + k * k * p2.z,
      );
      s.rotation.set(v.posa * (1 - k), v.sbanda * (1 - k) * 1.4, v.posa * 0.6 * (1 - k));
      s.scale.setScalar(lerp(0.35, 1, Math.min(1, k * 2.4)));
      m.opacity = vivo * Math.min(1, k * 5) * (0.9 - 0.25 * k);
    });

    punti.current.forEach((p, i) => {
      if (!p) return;
      const k = passaggio(t, 20.9 + i * 0.17, 21.2 + i * 0.17);
      p.scale.setScalar(0.001 + k * (1 + (i / PUNTI) * 0.9));
      (p.material as THREE.MeshBasicMaterial).opacity = vivo * k * 0.95;
    });
  });

  return (
    <group ref={gruppo}>
      {BERSAGLI.map((b, i) => (
        <mesh
          key={i}
          position={b}
          ref={(m) => {
            riquadri.current[i] = m;
          }}
        >
          <ringGeometry args={[0.44, 0.452, 4, 1, Math.PI / 4]} />
          <meshBasicMaterial color="#d6b37a" transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {volo.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            schede.current[i] = m;
          }}
          visible={false}
        >
          <planeGeometry args={[0.27, 0.36]} />
          <meshStandardMaterial
            color="#050505"
            transparent
            opacity={0}
            roughness={0.3}
            metalness={0.2}
            emissive="#e8c88e"
            emissiveIntensity={1.15}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {salita.map((p, i) => (
        <mesh
          key={i}
          position={p}
          ref={(m) => {
            punti.current[i] = m;
          }}
        >
          <circleGeometry args={[0.062, 16]} />
          <meshBasicMaterial color="#d6b37a" transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
