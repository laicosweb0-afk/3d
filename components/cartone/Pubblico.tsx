'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { orologio, lerp, passaggio, percorso, presenza, seme } from '@/lib/cartone/tempo';

/**
 * Il pubblico: due colonne di schede che scorrono ai lati, come un dito che
 * scorre un feed.
 *
 * È il personaggio antagonista del corto, e non è un concorrente: è
 * l'indifferenza. Compare due volte e le due comparse sono la stessa
 * inquadratura con esito opposto — all'inizio le schede sfilano senza
 * fermarsi, alla fine si fermano e si girano verso il prodotto. Non serve
 * spiegarlo con una didascalia: il pubblico riconosce il gesto perché lo fa
 * duecento volte al giorno.
 */

const PER_COLONNA = 12;
const PASSO = 1.18;
const CICLO = PER_COLONNA * PASSO;

/** Lo scorrimento del feed, in unità di scena. Monotono: non torna mai indietro. */
const SCORRIMENTO = [
  { t: 0, v: [0] },
  { t: 3.0, v: [0] },
  { t: 5.7, v: [23] },
  { t: 6.8, v: [28.5] },
  { t: 23.5, v: [37] },
  { t: 25.0, v: [42.2] },
  { t: 30, v: [42.2] },
];

type Scheda = { mesh: THREE.Mesh | null; lato: number; base: number; indice: number };

export function Pubblico() {
  const schede = useRef<Scheda[]>([]);

  const elenco = useMemo(() => {
    const out: { lato: number; base: number; indice: number }[] = [];
    for (let lato = 0; lato < 2; lato += 1) {
      for (let i = 0; i < PER_COLONNA; i += 1) {
        out.push({ lato: lato === 0 ? -1 : 1, base: i * PASSO + seme(lato * 31 + i) * 0.5, indice: lato * PER_COLONNA + i });
      }
    }
    return out;
  }, []);

  useFrame(() => {
    const t = orologio.t;
    const [s] = percorso(t, SCORRIMENTO);

    // Le due comparse. In mezzo le schede restano, molto smorzate: sparire
    // del tutto e ricomparire sarebbe un taglio, e qui non si taglia mai.
    const prima = presenza(t, 2.7, 9.6, 0.7, 1.4);
    const seconda = presenza(t, 22.9, 28.2, 0.9, 1.2);
    const vive = Math.max(prima * 1, seconda * 1, Math.min(prima, 0.12));
    const fondo = t > 9.6 && t < 22.9 ? 0.1 : 0;
    const forza = Math.max(vive, fondo);

    // Si girano verso il prodotto solo alla fine.
    const gira = passaggio(t, 24.0, 25.6);
    // E si accendono: la luce fredda dello schermo diventa la luce calda
    // della scena. È il momento in cui smettono di guardare il telefono.
    const accende = passaggio(t, 24.4, 26.2);

    for (const s2 of schede.current) {
      if (!s2?.mesh) continue;
      const y = (((s2.base - s * (s2.lato > 0 ? 1 : 0.94)) % CICLO) + CICLO) % CICLO - CICLO / 2;
      const dx = 1.14 + seme(s2.indice * 7 + 3) * 0.34;
      const dz = -2.75 + seme(s2.indice * 13 + 5) * 0.9;
      s2.mesh.position.set(s2.lato * dx, y + 1.2, dz);
      s2.mesh.rotation.set(0, lerp(s2.lato * 0.32, s2.lato * -0.62, gira), s2.lato * 0.05 * (1 - gira));

      const m = s2.mesh.material as THREE.MeshStandardMaterial;
      m.opacity = forza * (0.11 + seme(s2.indice * 3 + 11) * 0.2);
      m.emissiveIntensity = lerp(0.3, 0.04, accende);
      m.emissive.setRGB(lerp(0.1, 0.44, accende), lerp(0.13, 0.33, accende), lerp(0.22, 0.15, accende));
      s2.mesh.visible = m.opacity > 0.01;
    }
  });

  return (
    <group>
      {elenco.map((c, i) => (
        <mesh
          key={c.indice}
          ref={(m) => {
            schede.current[i] = { mesh: m, lato: c.lato, base: c.base, indice: c.indice };
          }}
        >
          <planeGeometry args={[0.64, 0.92]} />
          <meshStandardMaterial
            color="#080808"
            transparent
            opacity={0}
            roughness={0.92}
            metalness={0}
            emissive="#1b2338"
            emissiveIntensity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
