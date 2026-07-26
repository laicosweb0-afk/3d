'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';

// La camera si avvicina, ma si ferma prima di "entrare" nell'oggetto: oltre
// una certa distanza il cubo smette di leggersi come cubo e diventa una lastra.
const HERO_FROM = new THREE.Vector3(0.5, 1.7, 13.4);
const HERO_TO = new THREE.Vector3(0, 0.1, 7.6);

const target = new THREE.Vector3();
const desired = new THREE.Vector3();
const orbit = new THREE.Vector3();

/**
 * La camera come un dolly unico, dall'inizio alla fine.
 *
 * Primo tratto: si avvicina al cubo mentre l'hero monta la sua coreografia.
 * Secondo tratto: comincia a girargli intorno, e l'angolo è legato al progetto
 * — ogni mondo del portfolio si guarda da un punto diverso, senza che ci sia
 * mai un cambio di inquadratura. Il movimento non si interrompe mai.
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

    // Orbita attorno alla scena durante il portfolio. L'angolo avanza col
    // progetto, l'altezza ondeggia: è una carrellata circolare, non un taglio.
    const c = scroll.cases;
    if (c > 0.001) {
      const a = -0.35 + scroll.world * 0.78;
      const radius = (8.4 - Math.sin(scroll.world * 1.1) * 1.1) * pull;
      orbit.set(
        Math.sin(a) * radius,
        1.1 + Math.sin(scroll.world * 0.9) * 1.25,
        Math.cos(a) * radius
      );
      desired.lerp(orbit, Math.min(1, c));
    } else {
      desired.z *= pull;
    }

    // parallasse del puntatore, sempre lieve
    desired.x += scroll.pointer.x * 0.5;
    desired.y += scroll.pointer.y * -0.32;

    camera.position.x = damp(camera.position.x, desired.x, 3.4, d);
    camera.position.y = damp(camera.position.y, desired.y, 3.4, d);
    camera.position.z = damp(camera.position.z, desired.z, 3.4, d);

    // Durante l'hero la camera NON insegue l'oggetto che scivola a destra:
    // se lo seguisse, ruotando riporterebbe tutto al centro e lo scostamento
    // non si vedrebbe: il testo se lo ritroverebbe di nuovo addosso.
    const after = Math.max(0, scroll.page - 0.16) / 0.84;
    target.set(after * 1.2 * (1 - c), -after * 0.3 * (1 - c), 0);
    camera.lookAt(target);
  });

  return null;
}
