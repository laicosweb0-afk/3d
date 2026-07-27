'use client';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';
import { blendWorlds } from './worlds';

// La camera si avvicina, ma si ferma prima di "entrare" nell'oggetto: oltre
// una certa distanza il cubo smette di leggersi come cubo e diventa una lastra.
const HERO_FROM = new THREE.Vector3(0.5, 1.7, 13.4);
const HERO_TO = new THREE.Vector3(0, 0.1, 7.6);

const target = new THREE.Vector3();
const desired = new THREE.Vector3();
const orbit = new THREE.Vector3();
/** Trasversale della camera: serve a spostare il soggetto in orizzontale. */
const right = new THREE.Vector3();

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
  const _t = { current: 0 };

  useFrame((state, dt) => {
    _t.current = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const p = scroll.hero;
    // In verticale l'inquadratura è stretta e l'oggetto riempirebbe tutto lo
    // schermo: si arretra in proporzione, così la scala resta la stessa.
    const aspect = size.width / size.height;
    const pull = aspect < 1 ? 1 + (1 - aspect) * 0.95 : 1;

    // ease-out: veloce all'inizio, quasi ferma quando arriva addosso all'oggetto
    const e = 1 - Math.pow(1 - p, 2.4);
    desired.copy(HERO_FROM).lerp(HERO_TO, e);

    // Ogni mondo ha la sua regia: raggio, altezza, galleggiamento e persino
    // il modo di raggiungere la posizione. Woman galleggia, Aurea orbita
    // stretta attorno al logo, Mondial si muove pesante e a scatti, MOU è
    // morbida come se fosse immersa. Non è la stessa camera ricolorata.
    const c = scroll.cases;
    const w = blendWorlds(scroll.world);
    let lag = 3.4;
    if (c > 0.001) {
      const tt = _t.current;
      const a = -0.35 + scroll.world * 0.78;
      // Il portale avvicina la camera, non la scaraventa: prima il raggio
      // crollava di quasi cinque unità in mezzo secondo e il movimento si
      // leggeva come uno strappo. Un avvicinamento contenuto, su un tragitto
      // più lungo, fa lo stesso effetto e sembra una macchina su binario.
      // Un passo indietro rispetto a prima: spostando il soggetto a destra,
      // con il raggio di prima gli oggetti larghi — la lastra LOEWE, il
      // vasetto Woman — uscivano dal bordo. Arretrando entrano interi, e
      // rimpicciolirsi un po' non è un danno: il protagonista è il titolo.
      const radius = (w.camRadius + 1.3 - scroll.portal * 1.9) * pull;
      const float = Math.sin(tt * 0.55) * w.camFloat;
      // movimento meccanico: la posizione viene quantizzata a scatti
      const stepped = w.camStep > 0.5 ? Math.round(a * 6) / 6 : a;
      orbit.set(
        Math.sin(stepped) * radius,
        w.camHeight + float + Math.sin(scroll.world * 0.9) * 0.5,
        Math.cos(stepped) * radius
      );
      desired.lerp(orbit, Math.min(1, c));
      // camLag basso = camera pesante, che arriva in ritardo sul bersaglio
      lag = w.camLag + scroll.portal * 1.6;
    } else {
      desired.z *= pull;
    }

    // parallasse del puntatore, sempre lieve
    desired.x += scroll.pointer.x * 0.5;
    desired.y += scroll.pointer.y * -0.32;

    camera.position.x = damp(camera.position.x, desired.x, lag, d);
    camera.position.y = damp(camera.position.y, desired.y, lag, d);
    camera.position.z = damp(camera.position.z, desired.z, lag, d);

    // Durante l'hero la camera NON insegue l'oggetto che scivola a destra:
    // se lo seguisse, ruotando riporterebbe tutto al centro e lo scostamento
    // non si vedrebbe: il testo se lo ritroverebbe di nuovo addosso.
    const after = Math.max(0, scroll.page - 0.16) / 0.84;
    target.set(after * 1.2 * (1 - c), -after * 0.3 * (1 - c), 0);

    // Il soggetto sta a destra, sempre. Dall'hero fino all'ultima stanza.
    //
    // Prima l'oggetto era al centro e la camera gli girava intorno: da certe
    // angolazioni finiva addosso al testo, e nessuna velatura salva un titolo
    // che ha un oggetto lucido esattamente sotto. Qui la mira si sposta lungo
    // la trasversale della camera — cioè il "sinistra" dell'inquadratura, non
    // quello del mondo — e il soggetto si trova a destra qualunque sia
    // l'angolo dell'orbita. Il testo ha metà schermo tutta per sé.
    //
    // Vale anche per l'hero: il cubo passava esattamente dietro alle righe del
    // titolo, ed è il primo posto in cui non deve succedere.
    if (aspect < 1) {
      // In verticale non c'è una metà da liberare: lo schermo è stretto e
      // spostare di lato manderebbe il soggetto fuori campo. Si libera l'altra
      // dimensione — la mira scende, quindi l'oggetto sale — e il testo occupa
      // la parte bassa. Stesso principio, asse diverso.
      target.addScaledVector(camera.up, -(1.5 + c * 0.6));
    } else {
      right.subVectors(camera.position, target).normalize().cross(camera.up).normalize();
      // il segno: `right` così calcolato punta alla sinistra dell'inquadratura,
      // quindi spostare la mira in quella direzione manda il soggetto a destra
      const shift = 1.55 + 0.2 * Math.min(1, c);
      target.addScaledVector(right, shift);
    }
    camera.lookAt(target);
  });

  return null;
}
