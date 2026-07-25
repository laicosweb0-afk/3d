'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';

/** Punti chiave del percorso della camera, in ordine di scroll. */
// La camera si avvicina, ma si ferma prima di "entrare" nell'oggetto: oltre
// una certa distanza il cubo smette di leggersi come cubo e diventa una lastra.
const HERO_FROM = new THREE.Vector3(0.5, 1.7, 13.4);
const HERO_TO = new THREE.Vector3(0, 0.1, 7.6);
const AFTER = new THREE.Vector3(-0.9, -0.5, 6.6);

const target = new THREE.Vector3();
const desired = new THREE.Vector3();

/**
 * La camera come un dolly: nessun salto fra una sezione e l'altra, un'unica
 * traiettoria continua. L'hero consuma il primo tratto; il resto della pagina
 * prosegue il movimento, ed è questo che tiene le sezioni nello stesso spazio
 * invece di farle sembrare blocchi impilati.
 */
export function Rig() {
  const { camera, size } = useThree();

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const p = scroll.hero;
    // In verticale l'inquadratura è stretta e l'oggetto riempirebbe tutto lo
    // schermo: si arretra in proporzione, così la scala resta la stessa.
    const aspect = size.width / size.height;
    const pull = aspect < 1 ? 1 + (1 - aspect) * 0.95 : 1;
    // ease-out: veloce all'inizio, quasi ferma quando arriva addosso all'oggetto
    const e = 1 - Math.pow(1 - p, 2.4);

    desired.copy(HERO_FROM).lerp(HERO_TO, e);

    // oltre l'hero la camera non si ferma: continua a scendere e a spostarsi
    const after = Math.max(0, scroll.page - 0.16) / 0.84;
    if (after > 0) desired.lerp(AFTER, Math.min(after, 1));

    // parallasse del puntatore, sempre lieve
    desired.x += scroll.pointer.x * 0.5;
    desired.y += scroll.pointer.y * -0.32;

    camera.position.x = damp(camera.position.x, desired.x, 4, d);
    camera.position.y = damp(camera.position.y, desired.y, 4, d);
    camera.position.z = damp(camera.position.z, desired.z * pull, 4, d);

    // Durante l'hero la camera NON insegue l'oggetto che scivola a destra:
    // se lo seguisse, ruotando riporterebbe tutto al centro e lo scostamento
    // non si vedrebbe: il testo se lo ritroverebbe di nuovo addosso.
    target.set(after * 1.2, -after * 0.3, 0);
    camera.lookAt(target);
  });

  return null;
}
