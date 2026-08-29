'use client';

// La bici che si sta pedalando: due chiamate di disegno, e solo mentre si
// pedala.
//
// I pezzi sono gli stessi di PEZZI.bici di imperfezioni.ts, con in più la
// pedivella e il pedale: quella che guidi è letteralmente la bici che hai
// preso al muro, con il suo colore. Sono due InstancedMesh e non sette
// mesh separate perché sette mesh sono sette chiamate di disegno a schermo
// per tutto il tempo in cui si va in giro, e il margine del budget è di due:
// il count va a ZERO quando non si è in sella, che in three è l'unico modo
// vero di NON pagare una chiamata (una mesh invisibile con count pieno
// costa lo stesso).

import { forwardRef, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco } from '@/lib/lugo/veicoli';
import { imperfezioni, PEZZI } from '@/lib/lugo/imperfezioni';
import { BICI, PEDALI } from '@/lib/lugo/bici';
import { runtime } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';
import type { RuntimeGioco } from '@/lib/lugo/runtime';

/** Le scatole del telaio: quelle della bici al muro più pedivella e pedale. */
const SCATOLE = [...PEZZI.bici.filter((p) => p.forma === 'scatola'), ...PEDALI];
const RAGGIO_RUOTA_BICI = 0.33;

export const Bici = forwardRef<THREE.Group, { rt: RuntimeGioco }>(function Bici({ rt }, ref) {
  const mondo = useMondo();
  const fisica = useMemo(() => infraGioco(mondo).fisica, [mondo]);
  const telaio = useRef<THREE.InstancedMesh>(null);
  const ruote = useRef<THREE.InstancedMesh>(null);
  const inSella = useRef(-1);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const sca = useMemo(() => new THREE.Vector3(), []);
  const eul = useMemo(() => new THREE.Euler(), []);
  const qua = useMemo(() => new THREE.Quaternion(), []);
  const col = useMemo(() => new THREE.Color(), []);

  // il telaio si scrive una volta sola: cambia solo il COLORE, e solo
  // quando si cambia bici
  useLayoutEffect(() => {
    const mesh = telaio.current;
    if (!mesh) return;
    SCATOLE.forEach((p, i) => {
      mesh.setMatrixAt(
        i,
        m.compose(
          pos.set(p.p[0], p.p[1], p.p[2]),
          qua.setFromEuler(eul.set(p.rx ?? 0, 0, 0)),
          sca.set(p.s[0], p.s[1], p.s[2]),
        ),
      );
      mesh.setColorAt(i, col.set(p.col));
    });
    mesh.count = 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (ruote.current) ruote.current.count = 0;
  }, [m, pos, qua, eul, sca, col]);

  useFrame(() => {
    const attiva = useLugo.getState().mode === 'bici' && runtime.biciInSella >= 0;
    const t = telaio.current;
    const r = ruote.current;
    if (!t || !r) return;
    if (!attiva) {
      // count a zero: in three è così, e solo così, che la chiamata di
      // disegno si salta davvero
      t.count = 0;
      r.count = 0;
      inSella.current = -1;
      return;
    }
    t.count = SCATOLE.length;
    r.count = 2;

    // il colore del telaio è quello della bici che hai preso: la bici blu
    // appoggiata al muro resta blu anche sotto di te
    if (inSella.current !== runtime.biciInSella) {
      inSella.current = runtime.biciInSella;
      const o = imperfezioni(mondo, fisica)[runtime.biciInSella];
      SCATOLE.forEach((p, i) => {
        const tinta = p.tinte && o ? p.tinte[o.v % p.tinte.length] : p.col;
        t.setColorAt(i, col.set(tinta));
      });
      if (t.instanceColor) t.instanceColor.needsUpdate = true;
    }

    // Le ruote girano con la fase della pedalata, che avanza con la
    // distanza percorsa: si dividono i radianti per metro e si moltiplica
    // per il raggio, così la ruota non pattina mai sull'asfalto. Il segno
    // è negativo perché con l'ordine XYZ una rotazione positiva attorno
    // all'asse della ruota porterebbe il punto anteriore verso l'alto,
    // cioè la ruota girerebbe al contrario del moto.
    const giro = -rt.persona.fase / BICI.pedalata / RAGGIO_RUOTA_BICI;
    for (let i = 0; i < 2; i++) {
      r.setMatrixAt(
        i,
        m.compose(
          pos.set(i === 0 ? 0.52 : -0.52, RAGGIO_RUOTA_BICI, 0),
          qua.setFromEuler(eul.set(Math.PI / 2, giro, 0, 'XYZ')),
          sca.set(0.66, 0.07, 0.66),
        ),
      );
    }
    r.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={ref} name="bici-giocatore">
      <instancedMesh
        ref={telaio}
        args={[undefined, undefined, SCATOLE.length]}
        frustumCulled={false}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>
      {/* dieci lati e non i sette del disordine di città: questa ruota la
          si guarda da sei metri, non da trenta */}
      <instancedMesh ref={ruote} args={[undefined, undefined, 2]} frustumCulled={false}>
        <cylinderGeometry args={[0.5, 0.5, 1, 10]} />
        <meshLambertMaterial color="#26262A" />
      </instancedMesh>
    </group>
  );
});
