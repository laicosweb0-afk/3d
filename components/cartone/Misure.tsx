'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { orologio, lerp, passaggio, presenza, tratto } from '@/lib/cartone/tempo';

/**
 * La misura: la battuta della strategia, detta con le righe di un rilievo.
 *
 * Qui c'è l'unica idea del corto che vale la pena difendere in riunione:
 * la strategia non si può filmare. È l'unico dei servizi che non produce un
 * oggetto, e ogni tentativo di mostrarla con grafici e lampadine finisce in
 * stock footage. Allora si mostra il *gesto* che la precede: prendere le
 * misure prima di toccare qualcosa. È la stessa grammatica delle linee CAD
 * dell'apertura di Mondial Service, riportata su un prodotto.
 */

const L = 1.45 / 2;
const H = 1.95;

/** Le quote, come su un disegno tecnico: la linea e i suoi due riferimenti. */
function segmenti(punti: number[][]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(punti.flat(), 3));
  return g;
}

export function Misure() {
  const gruppo = useRef<THREE.Group>(null);
  const lama = useRef<THREE.Mesh>(null);
  const filoLama = useRef<THREE.LineSegments>(null);
  const riquadro = useRef<THREE.LineBasicMaterial>(null);
  const altezza = useRef<THREE.LineBasicMaterial>(null);
  const larghezza = useRef<THREE.LineBasicMaterial>(null);

  const bordi = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.62, 2.12, 1.62), 1), []);

  // Quota verticale a sinistra della scatola, con i due riferimenti.
  const quotaH = useMemo(
    () =>
      segmenti([
        [-1.02, 0.02, 0.76], [-1.02, H + 0.02, 0.76],
        [-1.12, 0.02, 0.76], [-0.78, 0.02, 0.76],
        [-1.12, H + 0.02, 0.76], [-0.78, H + 0.02, 0.76],
      ]),
    [],
  );

  // Quota orizzontale sotto la scatola.
  const quotaL = useMemo(
    () =>
      segmenti([
        [-L, -0.16, 0.76], [L, -0.16, 0.76],
        [-L, -0.26, 0.76], [-L, -0.06, 0.76],
        [L, -0.26, 0.76], [L, -0.06, 0.76],
      ]),
    [],
  );

  // Il contorno della lama: è la riga luminosa vera e propria, il piano
  // sotto le fa solo da alone.
  const contorno = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.9, 1.9)),
    [],
  );

  useFrame(() => {
    const t = orologio.t;
    const vivo = presenza(t, 9.1, 12.9, 0.5, 0.8);
    if (gruppo.current) gruppo.current.visible = vivo > 0.01;
    if (vivo <= 0.01) return;

    // La lama di scansione scende una volta sola, lentamente, e si spegne
    // arrivata in fondo: due passate sembrerebbero uno scanner da ufficio.
    const k = tratto(t, 9.5, 11.6);
    const y = lerp(2.35, 0.05, k);
    const forza = vivo * (0.15 + 0.85 * Math.sin(Math.PI * k));
    if (lama.current) {
      lama.current.position.y = y;
      (lama.current.material as THREE.MeshBasicMaterial).opacity = forza * 0.16;
    }
    if (filoLama.current) {
      filoLama.current.position.y = y;
      (filoLama.current.material as THREE.LineBasicMaterial).opacity = forza * 0.9;
    }

    // Il riquadro scatta chiuso appena la lama parte: è il momento in cui
    // l'oggetto smette di essere una scatola e diventa un dato.
    if (riquadro.current) riquadro.current.opacity = vivo * passaggio(t, 9.7, 10.3) * 0.55;
    // Le quote arrivano dopo, una alla volta.
    if (altezza.current) altezza.current.opacity = vivo * passaggio(t, 10.4, 10.9) * 0.85;
    if (larghezza.current) larghezza.current.opacity = vivo * passaggio(t, 10.9, 11.4) * 0.85;
  });

  return (
    <group ref={gruppo}>
      <lineSegments geometry={bordi} position={[0, 0.98, 0]}>
        <lineBasicMaterial ref={riquadro} color="#d6b37a" transparent opacity={0} />
      </lineSegments>

      <mesh ref={lama} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.9, 1.9]} />
        <meshBasicMaterial
          color="#8fd2f0"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <lineSegments ref={filoLama} geometry={contorno} rotation={[-Math.PI / 2, 0, 0]}>
        <lineBasicMaterial color="#bfe9fa" transparent opacity={0} toneMapped={false} />
      </lineSegments>

      <lineSegments geometry={quotaH}>
        <lineBasicMaterial ref={altezza} color="#d6b37a" transparent opacity={0} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={quotaL}>
        <lineBasicMaterial ref={larghezza} color="#d6b37a" transparent opacity={0} toneMapped={false} />
      </lineSegments>
    </group>
  );
}
