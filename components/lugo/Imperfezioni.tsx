'use client';

// Il disordine di Lugo, disegnato con tre sole geometrie instanziate:
// una scatola, un cilindro e una sfera. Ogni oggetto (bici, cassonetto,
// panchina, rastrelliera…) è una manciata di pezzi con posizione, scala e
// colore, quindi tutte le biciclette del centro costano tre draw call
// insieme ai cestini.
//
// Le bici però adesso si possono prendere, e una bici presa deve sparire
// dal muro: per farlo bisogna sapere QUALI istanze dei due InstancedMesh
// sono sue. La mappa qui sotto tiene quegli indici, così togliere una bici
// costa sei matrici invece di un ri-render dell'intera città.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco } from '@/lib/lugo/veicoli';
import { imperfezioni, PEZZI, type Imperfezione, type Pezzo } from '@/lib/lugo/imperfezioni';
import { runtime } from '@/lib/lugo/runtime';

interface Istanza {
  m: THREE.Matrix4;
  c: THREE.Color;
}

/**
 * La matrice di un pezzo di un oggetto, nel posto in cui sta l'oggetto.
 * Estratta in una funzione sola perché la usano due strade diverse — il
 * primo montaggio e il ritocco di una bici presa o posata — e due copie
 * della stessa composizione sarebbero due copie che un giorno divergono,
 * cioè una bici che riappare storta.
 */
function componi(o: Imperfezione, pz: Pezzo, m: THREE.Matrix4): THREE.Matrix4 {
  // rotazione.y = -rot manda il +X locale su (cos rot, sin rot) e il +Z
  // locale su (-sin rot, cos rot): gli scostamenti dei pezzi seguono
  const cy = Math.cos(o.rot);
  const sy = Math.sin(o.rot);
  const lx = pz.p[0];
  const lz = pz.p[2];
  return m.compose(
    new THREE.Vector3(o.x + lx * cy - lz * sy, pz.p[1], o.z + lx * sy + lz * cy),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(pz.rx ?? 0, -o.rot, 0, 'YXZ')),
    new THREE.Vector3(pz.s[0], pz.s[1], pz.s[2]),
  );
}

/** La matrice di chi non si deve vedere: scala zero, nessun triangolo. */
const NASCOSTA = new THREE.Matrix4().makeScale(0, 0, 0);

export function Imperfezioni() {
  const mondo = useMondo();
  const fisica = useMemo(() => infraGioco(mondo).fisica, [mondo]);

  const gruppi = useMemo(() => {
    // la lista CONDIVISA, non una copia: se qui si guardasse un array
    // proprio, la bici che il giocatore si porta via resterebbe appoggiata
    // al muro per sempre, perché chi la segna come presa segna un'altra
    const oggetti = imperfezioni(mondo, fisica);
    const per: Record<Pezzo['forma'], Istanza[]> = { scatola: [], cilindro: [], sfera: [] };
    // per ogni bici, quali istanze dei due mesh le appartengono
    const indiciBici = new Map<number, { scatola: number[]; cilindro: number[] }>();
    const m = new THREE.Matrix4();
    oggetti.forEach((o, i) => {
      const mie = o.t === 'bici' ? { scatola: [] as number[], cilindro: [] as number[] } : null;
      for (const pz of PEZZI[o.t]) {
        if (mie && pz.forma !== 'sfera') mie[pz.forma].push(per[pz.forma].length);
        per[pz.forma].push({
          m: componi(o, pz, m).clone(),
          c: new THREE.Color(pz.tinte ? pz.tinte[o.v % pz.tinte.length] : pz.col),
        });
      }
      if (mie) indiciBici.set(i, mie);
    });
    return { per, indiciBici, oggetti };
  }, [mondo, fisica]);

  const scatole = useRef<THREE.InstancedMesh>(null);
  const cilindri = useRef<THREE.InstancedMesh>(null);
  const sfere = useRef<THREE.InstancedMesh>(null);
  const revVista = useRef(-1);

  useLayoutEffect(() => {
    const coppie: [React.RefObject<THREE.InstancedMesh | null>, Istanza[]][] = [
      [scatole, gruppi.per.scatola],
      [cilindri, gruppi.per.cilindro],
      [sfere, gruppi.per.sfera],
    ];
    for (const [ref, lista] of coppie) {
      const mesh = ref.current;
      if (!mesh) continue;
      lista.forEach((it, i) => {
        mesh.setMatrixAt(i, it.m);
        mesh.setColorAt(i, it.c);
      });
      mesh.count = lista.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [gruppi]);

  // Prendere o posare una bici deve costare sei matrici, non la
  // ricostruzione di milleduecento oggetti: si guarda un intero, e solo se
  // è cambiato si riscrivono le istanze delle bici segnate come sporche.
  useFrame(() => {
    if (revVista.current === runtime.revImperfezioni) return;
    revVista.current = runtime.revImperfezioni;
    const m = new THREE.Matrix4();
    for (const i of runtime.biciSporche) {
      const mie = gruppi.indiciBici.get(i);
      const o = gruppi.oggetti[i];
      if (!mie || !o) continue;
      const pezzi = PEZZI[o.t];
      let ks = 0;
      let kc = 0;
      for (const pz of pezzi) {
        if (pz.forma === 'scatola') {
          scatole.current?.setMatrixAt(mie.scatola[ks++], o.presa ? NASCOSTA : componi(o, pz, m));
        } else if (pz.forma === 'cilindro') {
          cilindri.current?.setMatrixAt(mie.cilindro[kc++], o.presa ? NASCOSTA : componi(o, pz, m));
        }
      }
    }
    runtime.biciSporche.length = 0;
    if (scatole.current) scatole.current.instanceMatrix.needsUpdate = true;
    if (cilindri.current) cilindri.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        name="imperfezioni-scatole"
        ref={scatole}
        args={[undefined, undefined, Math.max(1, gruppi.per.scatola.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh
        name="imperfezioni-cilindri"
        ref={cilindri}
        args={[undefined, undefined, Math.max(1, gruppi.per.cilindro.length)]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 7]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh
        name="imperfezioni-sfere"
        ref={sfere}
        args={[undefined, undefined, Math.max(1, gruppi.per.sfera.length)]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[0.5, 0]} />
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  );
}
