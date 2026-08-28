'use client';

// Il disordine di Lugo, disegnato con tre sole geometrie instanziate:
// una scatola, un cilindro e una sfera. Ogni oggetto (bici, cassonetto,
// panchina…) è una manciata di pezzi con posizione, scala e colore, quindi
// tutte le biciclette del centro costano tre draw call insieme ai cestini.

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco } from '@/lib/lugo/veicoli';
import { imperfezioniCitta, PEZZI, type Pezzo } from '@/lib/lugo/imperfezioni';

interface Istanza {
  m: THREE.Matrix4;
  c: THREE.Color;
}

export function Imperfezioni() {
  const mondo = useMondo();
  const fisica = useMemo(() => infraGioco(mondo).fisica, [mondo]);

  const gruppi = useMemo(() => {
    const oggetti = imperfezioniCitta(mondo, fisica);
    const per: Record<Pezzo['forma'], Istanza[]> = { scatola: [], cilindro: [], sfera: [] };
    const pos = new THREE.Vector3();
    const sca = new THREE.Vector3();
    const eul = new THREE.Euler();
    const qua = new THREE.Quaternion();
    for (const o of oggetti) {
      // rotazione.y = -rot manda il +X locale su (cos rot, sin rot) e il +Z
      // locale su (-sin rot, cos rot): gli scostamenti dei pezzi seguono
      const cy = Math.cos(o.rot);
      const sy = Math.sin(o.rot);
      for (const pz of PEZZI[o.t]) {
        const lx = pz.p[0];
        const lz = pz.p[2];
        per[pz.forma].push({
          m: new THREE.Matrix4().compose(
            pos.set(o.x + lx * cy - lz * sy, pz.p[1], o.z + lx * sy + lz * cy),
            qua.setFromEuler(eul.set(pz.rx ?? 0, -o.rot, 0, 'YXZ')),
            sca.set(pz.s[0], pz.s[1], pz.s[2]),
          ),
          c: new THREE.Color(pz.tinte ? pz.tinte[o.v % pz.tinte.length] : pz.col),
        });
      }
    }
    return per;
  }, [mondo, fisica]);

  const scatole = useRef<THREE.InstancedMesh>(null);
  const cilindri = useRef<THREE.InstancedMesh>(null);
  const sfere = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const coppie: [React.RefObject<THREE.InstancedMesh | null>, Istanza[]][] = [
      [scatole, gruppi.scatola],
      [cilindri, gruppi.cilindro],
      [sfere, gruppi.sfera],
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

  return (
    <group>
      <instancedMesh
        name="imperfezioni-scatole"
        ref={scatole}
        args={[undefined, undefined, Math.max(1, gruppi.scatola.length)]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh
        name="imperfezioni-cilindri"
        ref={cilindri}
        args={[undefined, undefined, Math.max(1, gruppi.cilindro.length)]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.5, 0.5, 1, 7]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh
        name="imperfezioni-sfere"
        ref={sfere}
        args={[undefined, undefined, Math.max(1, gruppi.sfera.length)]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[0.5, 0]} />
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  );
}
