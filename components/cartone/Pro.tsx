'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { orologio, caduta, lerp, passaggio, percorso, posa, rimbalzo, tratto } from '@/lib/cartone/tempo';

/**
 * Pro — la mascotte.
 *
 * Non è un personaggio con braccia e faccia: è il cubo del marchio MediaPro
 * (lo stesso monolite che sta in home, `components/mediapro/three/Monolith`)
 * che a un certo punto apre un occhio. La scelta è deliberata: una mascotte
 * disegnata da zero sarebbe un secondo marchio da mantenere, mentre questa
 * *è* il marchio — chi vede il corto e poi apre il sito riconosce lo stesso
 * oggetto, e non deve imparare niente di nuovo.
 *
 * L'occhio è un obiettivo fotografico, ed è tutta la recitazione che serve:
 * si apre, mette a fuoco, sbatte, si allunga quando si gira il video, si
 * chiude sul congedo. Le due sferette ai lati fanno da mani senza essere
 * mani — bastano per indicare, e non obbligano a risolvere un problema di
 * animazione che in trenta secondi nessuno guarderebbe.
 */

const CORPO = 1.15;

/** Le pose nel tempo: [x, y, z]. Fuori campo fino alla caduta. */
const POSIZIONE = [
  // Parte da poco sopra il bordo, non da undici unità di altezza: con
  // l'accelerazione di gravità quasi tutto lo spostamento avviene alla fine,
  // e da lassù il cubo restava fuori campo fino all'ultimo decimo di secondo
  // — una comparsa, non una caduta.
  { t: 0, v: [0.35, 6.4, 1.0] },
  { t: 6.05, v: [0.35, 6.4, 1.0] },
  { t: 6.95, v: [0.35, 2.92, 1.0], ease: caduta },
  { t: 7.35, v: [0.35, 3.62, 1.0], ease: posa },
  { t: 7.65, v: [0.35, 2.92, 1.0], ease: caduta },
  { t: 7.9, v: [0.35, 3.16, 1.0], ease: posa },
  { t: 8.12, v: [0.35, 2.94, 1.0] },
  { t: 9.5, v: [-0.2, 2.86, 1.25] },
  { t: 12.5, v: [0.55, 2.8, 1.1] },
  { t: 16.0, v: [-0.5, 2.74, 1.5] },
  { t: 20.0, v: [0.85, 3.12, 0.9] },
  { t: 23.5, v: [0, 2.88, 1.35] },
  { t: 26.5, v: [0, 2.92, 1.6] },
  { t: 28.4, v: [0, 3.06, 1.15] },
  { t: 30, v: [0, 3.06, 1.15] },
];

/** Rotazione del corpo: quanto Pro si gira verso il prodotto o verso di noi. */
const SGUARDO = [
  { t: 6.05, v: [0.9, -1.5] },
  { t: 8.2, v: [0.02, -0.5] },
  { t: 9.5, v: [0.06, -0.62] },
  { t: 16.0, v: [0.04, -0.5] },
  { t: 20.0, v: [0.02, -0.34] },
  { t: 23.6, v: [0, 0] },
  { t: 30, v: [0, 0] },
];

export function Pro() {
  const gruppo = useRef<THREE.Group>(null);
  const corpo = useRef<THREE.Group>(null);
  const canna = useRef<THREE.Group>(null);
  const pupilla = useRef<THREE.Mesh>(null);
  const bagliore = useRef<THREE.Mesh>(null);
  const manoA = useRef<THREE.Mesh>(null);
  const manoB = useRef<THREE.Mesh>(null);
  const vetro = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const t = orologio.t;
    if (!gruppo.current || !corpo.current) return;

    const [x, y, z] = percorso(t, POSIZIONE);
    // Il galleggio parte solo dopo l'atterraggio, altrimenti la caduta
    // ondeggia e perde peso.
    const posato = passaggio(t, 8.1, 8.7);
    const galleggio = Math.sin(t * 1.45) * 0.07 * posato;
    gruppo.current.position.set(x, y + galleggio, z);

    const [rx, ry] = percorso(t, SGUARDO);
    // Durante la caduta il cubo ruota: è ciò che la fa leggere come un
    // arrivo e non come una comparsa.
    const giro = (1 - passaggio(t, 6.05, 8.4)) * 2.6;
    corpo.current.rotation.set(rx + giro * 0.35, ry + giro, giro * 0.18);
    // L'impatto schiaccia il cubo per due decimi di secondo. Senza questo
    // l'atterraggio non si sente.
    const urto = Math.max(0, rimbalzo(tratto(t, 6.95, 7.5))) * 0.16;
    corpo.current.scale.set(1 + urto * 0.6, 1 - urto, 1 + urto * 0.6);

    // — L'occhio —
    // Apertura: chiuso fino all'atterraggio, poi si spalanca. I due battiti
    // di palpebra sono l'unica cosa che lo rende vivo.
    const apre = passaggio(t, 8.2, 8.95);
    const battito =
      1 -
      0.92 * Math.exp(-Math.pow((t - 13.4) / 0.09, 2)) -
      0.92 * Math.exp(-Math.pow((t - 21.7) / 0.09, 2));
    // La messa a fuoco: durante la misura l'iride si stringe, come un
    // diaframma che chiude. Sul congedo si richiude del tutto.
    const fuoco = 1 - 0.42 * passaggio(t, 9.2, 10.4) * (1 - passaggio(t, 11.8, 12.6));
    const chiude = 1 - passaggio(t, 28.6, 29.4);
    const iride = apre * battito * fuoco * chiude;
    if (pupilla.current) pupilla.current.scale.setScalar(Math.max(0.001, iride));
    if (vetro.current) vetro.current.emissiveIntensity = 0.04 + 0.26 * iride;

    // Il lampo dello scatto, a metà della battuta dei contenuti.
    const lampo = Math.exp(-Math.pow((t - 17.9) / 0.07, 2)) + 0.7 * Math.exp(-Math.pow((t - 18.35) / 0.07, 2));
    if (bagliore.current) {
      bagliore.current.scale.setScalar(0.2 + lampo * 0.75);
      (bagliore.current.material as THREE.MeshBasicMaterial).opacity = 0.2 * iride + lampo * 0.9;
    }

    // L'obiettivo si allunga quando si gira: è il gesto che racconta il
    // servizio video senza scrivere "video production".
    if (canna.current) {
      const estrae = passaggio(t, 16.2, 17.2) * (1 - passaggio(t, 19.2, 19.9));
      canna.current.position.z = 0.02 + estrae * 0.34;
      canna.current.scale.setScalar(1 + estrae * 0.16);
    }

    // — Le mani —
    // Stanno larghe quando indica, si stringono quando presenta.
    const largo = lerp(0.74, 0.9, passaggio(t, 12.6, 13.4) * (1 - passaggio(t, 15.4, 16.2)));
    const alza = passaggio(t, 12.8, 13.6) * (1 - passaggio(t, 15.6, 16.4));
    const vive = passaggio(t, 8.5, 9.1) * (1 - passaggio(t, 28.4, 29.2));
    if (manoA.current && manoB.current) {
      const oscilla = Math.sin(t * 1.9) * 0.05;
      manoA.current.position.set(-largo, -0.16 + alza * 0.5 + oscilla, 0.28);
      manoB.current.position.set(largo, -0.16 + alza * 0.5 - oscilla, 0.28);
      const r = 0.085 * vive;
      manoA.current.scale.setScalar(r);
      manoB.current.scale.setScalar(r);
    }
  });

  return (
    <group ref={gruppo}>
      <group ref={corpo}>
        {/* Cubo a spigolo vivo, non stondato: su una scatola arrotondata gli
            spigoli non esistono come spigoli, e il filo d'oro — l'unica cosa
            che impedisce a un cubo nero di sparire in un fondo nero — non ha
            dove appoggiarsi. È anche la forma del monolite in home. */}
        <mesh castShadow>
          <boxGeometry args={[CORPO, CORPO, CORPO]} />
          <meshStandardMaterial color="#242424" metalness={0.38} roughness={0.5} />
          <Edges threshold={15} color="#d6b37a" />
        </mesh>

        {/* L'obiettivo, sulla faccia rivolta a noi. */}
        <group ref={canna} position={[0, 0, 0.02]}>
          <mesh position={[0, 0, CORPO / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.215, 0.235, 0.12, 40]} />
            <meshStandardMaterial color="#0d0d0d" metalness={0.9} roughness={0.24} />
          </mesh>
          {/* La ghiera */}
          <mesh position={[0, 0, CORPO / 2 + 0.075]}>
            <torusGeometry args={[0.205, 0.016, 12, 48]} />
            <meshStandardMaterial color="#d6b37a" metalness={1} roughness={0.22} emissive="#3a2b13" />
          </mesh>
          {/* Il vetro */}
          <mesh position={[0, 0, CORPO / 2 + 0.085]}>
            <circleGeometry args={[0.195, 44]} />
            <meshStandardMaterial
              ref={vetro}
              color="#04090f"
              metalness={0.7}
              roughness={0.08}
              emissive="#12384c"
              emissiveIntensity={0.05}
            />
          </mesh>
          {/* L'iride: è la palpebra, la messa a fuoco e l'espressione insieme. */}
          <mesh ref={pupilla} position={[0, 0, CORPO / 2 + 0.095]}>
            <ringGeometry args={[0.072, 0.125, 40]} />
            <meshBasicMaterial color="#a7dff3" transparent opacity={0.9} toneMapped={false} />
          </mesh>
          {/* Il riflesso: un punto bianco fuori asse. Senza, l'occhio è morto. */}
          <mesh ref={bagliore} position={[-0.062, 0.055, CORPO / 2 + 0.1]}>
            <circleGeometry args={[0.16, 24]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.25} toneMapped={false} />
          </mesh>
        </group>

        <mesh ref={manoA}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial color="#d6b37a" metalness={0.95} roughness={0.26} emissive="#251a09" />
        </mesh>
        <mesh ref={manoB}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial color="#d6b37a" metalness={0.95} roughness={0.26} emissive="#251a09" />
        </mesh>
      </group>
    </group>
  );
}
