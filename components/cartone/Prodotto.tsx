'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { orologio, lerp, passaggio, morbida } from '@/lib/cartone/tempo';

/**
 * Il prodotto del cliente e il piedistallo su cui sta.
 *
 * È una scatola generica di proposito: non è la mozzarella di Quelli della
 * Bufala né un cantiere di Mondial Service, perché il corto deve funzionare
 * davanti a chiunque lo guardi. Chi vende scarpe deve poterci vedere la sua
 * scatola.
 *
 * Tutta la sua storia sta in tre stati dello stesso oggetto: opaco e grigio
 * (nessuno lo guarda), misurato (si capisce cos'è), firmato (ha un'identità).
 * Non cambia mai forma — cambia solo il modo in cui è trattato. È
 * letteralmente ciò che facciamo, detto senza dirlo.
 */
export function Prodotto() {
  // Il filo d'oro sugli spigoli si costruisce a mano invece di usare
  // `<Edges>` di drei: lì il materiale passato come figlio non prende, e la
  // scatola resta bordata di bianco pieno anche quando dovrebbe essere
  // ancora anonima — cioè esattamente nella metà del corto in cui non deve
  // avere nessuna firma addosso.
  const bordi = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.45, 1.95, 1.45), 15), []);

  const gruppo = useRef<THREE.Group>(null);
  const scatola = useRef<THREE.Mesh>(null);
  const materiale = useRef<THREE.MeshStandardMaterial>(null);
  const filo = useRef<THREE.LineBasicMaterial>(null);
  const sigillo = useRef<THREE.Group>(null);
  const anello = useRef<THREE.MeshStandardMaterial>(null);
  const piedistallo = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const t = orologio.t;

    // La firma arriva nella battuta 02 e non se ne va più.
    const firmato = passaggio(t, 12.9, 15.4);
    // Il giro su se stesso: il piedistallo che gira è la grammatica dello
    // still life da studio, e comincia quando si accendono le luci.
    const giro = morbida(passaggio(t, 16.4, 19.6)) * 0.86;
    // Sul congedo il prodotto non si sposta: si spengono le luci.
    // Farlo sprofondare — la prima soluzione — lo mostrava scendere sotto il
    // bordo inferiore come un ascensore, ed era l'unico taglio brusco di
    // tutto il corto. Il buio fa la stessa cosa senza muovere niente.
    const ritira = passaggio(t, 26.8, 28.4);

    if (gruppo.current) {
      gruppo.current.rotation.y = -0.5 + giro;
      gruppo.current.position.y = 0;
      gruppo.current.scale.setScalar(1);
    }

    if (materiale.current) {
      // Dal cartone grigio spento al nero profondo con un riflesso vero:
      // stesso oggetto, trattamento diverso.
      materiale.current.color.setRGB(
        lerp(0.115, 0.072, firmato),
        lerp(0.115, 0.072, firmato),
        lerp(0.12, 0.076, firmato),
      );
      materiale.current.roughness = lerp(0.94, 0.28, firmato);
      materiale.current.metalness = lerp(0.02, 0.72, firmato);
    }

    // Il filo d'oro sugli spigoli cresce da un angolo: si vede *arrivare*.
    // Il colpo d'oro quando l'identità atterra: un decimo di secondo, e
    // senza di lui il passaggio più importante del corto succede e basta.
    const colpo = Math.exp(-Math.pow((t - 14.05) / 0.13, 2));
    if (filo.current) filo.current.opacity = Math.min(1, firmato * 0.95 + colpo * 0.7) * (1 - ritira);
    if (anello.current) anello.current.emissiveIntensity = (0.15 + firmato * 0.85 + colpo * 1.8) * (1 - ritira);
    if (sigillo.current) {
      sigillo.current.scale.setScalar(0.001 + firmato * (1 - ritira));
      sigillo.current.rotation.z = (1 - firmato) * -0.9;
    }

    if (piedistallo.current) {
      const m = piedistallo.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = (0.02 + passaggio(t, 16.2, 17.4) * 0.16) * (1 - ritira);
    }
  });

  return (
    <group ref={gruppo}>
      <mesh ref={scatola} position={[0, 0.98, 0]} castShadow>
        <boxGeometry args={[1.45, 1.95, 1.45]} />
        <meshStandardMaterial ref={materiale} color="#2c2c2c" roughness={0.94} metalness={0.02} />
      </mesh>
      <lineSegments geometry={bordi} position={[0, 0.98, 0]}>
        <lineBasicMaterial ref={filo} color="#d6b37a" transparent opacity={0} />
      </lineSegments>

      {/* Il sigillo sulla faccia frontale: un anello e una barra: non è un
          logo vero — inventare un marchio per un cliente che non esiste
          sarebbe un finto lavoro in portfolio. È un segno astratto, e si
          legge come "questa scatola adesso ha un marchio". */}
      <group ref={sigillo} position={[0, 1.06, 0.735]}>
        <mesh>
          <torusGeometry args={[0.3, 0.018, 10, 48]} />
          <meshStandardMaterial ref={anello} color="#d6b37a" metalness={1} roughness={0.24} emissive="#4a3313" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.002]}>
          <boxGeometry args={[0.3, 0.045, 0.01]} />
          <meshStandardMaterial color="#d6b37a" metalness={1} roughness={0.24} emissive="#4a3313" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, -0.115, 0.002]}>
          <boxGeometry args={[0.18, 0.028, 0.01]} />
          <meshStandardMaterial color="#d6b37a" metalness={1} roughness={0.3} emissive="#4a3313" emissiveIntensity={0.4} />
        </mesh>
      </group>

      <mesh ref={piedistallo} position={[0, -0.06, 0]} receiveShadow>
        <cylinderGeometry args={[1.22, 1.32, 0.12, 64]} />
        <meshStandardMaterial color="#0b0b0b" metalness={0.7} roughness={0.42} emissive="#d6b37a" emissiveIntensity={0.02} />
      </mesh>
    </group>
  );
}
