'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll } from './scrollState';
import { blendWorlds } from './worlds';

const COUNT = 11;
const dummy = new THREE.Object3D();
/** Raggio del corridoio all'altezza del marchio: poco più dell'oggetto. */
const CLEAR = 2.05;

/** Distribuzione deterministica: la scena dev'essere identica a ogni visita. */
function seeded(n: number) {
  let seed = 0x2545f491 ^ n;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type FamilyProps = {
  /** 0 = gocce, 1 = pannelli, 2 = schegge. */
  family: 0 | 1 | 2;
  seed: number;
};

/**
 * Una delle tre famiglie di forme. Ogni mondo le pesa diversamente: il latte è
 * quasi tutto gocce, l'officina quasi tutta schegge, il vetro quasi tutto
 * pannelli. Il peso è interpolato, quindi passando da un progetto al successivo
 * una famiglia si ritira mentre l'altra cresce — nessun taglio.
 */
function Family({ family, seed }: FamilyProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);

  const seeds = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: COUNT }, () => ({
      // posizione su una sfera irregolare attorno al cubo
      dir: new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize(),
      // guscio: nessun oggetto troppo vicino al centro, dove passa la camera
      dist: 0.62 + r() * 0.72,
      size: 0.13 + r() * 0.26,
      phase: r() * Math.PI * 2,
      spin: (r() - 0.5) * 1.6,
    }));
  }, [seed]);

  const geometry = useMemo(() => {
    if (family === 0) return new THREE.SphereGeometry(1, 20, 20);
    if (family === 1) return new THREE.BoxGeometry(1.7, 1.7, 0.09);
    return new THREE.OctahedronGeometry(1, 0);
  }, [family]);

  useFrame((state, dt) => {
    if (!mesh.current || !mat.current) return;
    const t = state.clock.elapsedTime;
    const w = blendWorlds(scroll.world);

    // Corridoio libero fra la camera e il marchio.
    //
    // La materia si muove su tutto lo spazio e finiva per passare davanti al
    // logo: sullo shooting LOEWE un pannello copriva "Jacob & Co" per intero.
    // Qui si calcola il cono che dall'occhio inquadra l'oggetto e si spinge
    // fuori ogni frammento che ci finisce dentro. Il cono si stringe
    // avvicinandosi alla camera, perché è lì che basta poco a coprire tutto.
    // Non è una regola grafica: è la stessa ragione per cui su un set nessuno
    // passa davanti all'obiettivo. Il marchio resta sempre visibile.
    const cam = state.camera.position;
    const camDist = Math.max(0.001, Math.hypot(cam.x, cam.y, cam.z));
    const ax = cam.x / camDist;
    const ay = cam.y / camDist;
    const az = cam.z / camDist;
    // una perpendicolare stabile all'asse, per i casi esattamente centrati
    let ux = -ay;
    let uy = ax;
    let uz = 0;
    const ulen = Math.hypot(ux, uy, uz) || 1;
    ux /= ulen;
    uy /= ulen;
    uz /= ulen;

    // Quanto questa famiglia è presente adesso, e quanto la materia è uscita
    // dal cubo: prima dell'apertura resta tutto dentro, a scala zero.
    const emerge = scroll.cases;
    const weight = w.weights[family] * emerge;

    if (weight < 0.004) {
      mesh.current.visible = false;
      return;
    }
    mesh.current.visible = true;

    mat.current.color.copy(w.color);
    mat.current.metalness = w.metalness;
    mat.current.roughness = w.roughness;
    mat.current.transmission = w.transmission;
    mat.current.opacity = Math.min(1, weight * 1.5);

    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      // il moto è lento nei mondi morbidi, nervoso in quello dell'officina
      const wobble = Math.sin(t * w.speed + s.phase) * 0.22;
      const jitter = w.turbulence * Math.sin(t * 3.1 * w.speed + s.phase * 4) * 0.3;
      const r = s.dist * w.spread * (0.55 + emerge * 0.45) + wobble + jitter;

      // Fisica del mondo: la gravità fa cadere o salire la materia, il vento
      // la trascina di lato. Il moto ciclico evita che si accumuli fuori campo.
      const drift = (v: number, speed: number) =>
        ((((v + t * speed + 20) % 12) + 12) % 12) - 6;
      const gy = drift(s.dir.y * r * 0.8, w.gravity);
      const gx = drift(s.dir.x * r, w.wind);
      dummy.position.set(gx, gy, s.dir.z * r);

      // quanto il frammento è avanti rispetto al marchio, lungo l'asse camera
      const along = gx * ax + gy * ay + s.dir.z * r * az;
      if (along > 0) {
        // il cono parte largo come l'oggetto e si chiude verso l'obiettivo
        const room = CLEAR * (1 - along / camDist);
        const ox = gx - along * ax;
        const oy = gy - along * ay;
        const oz = s.dir.z * r - along * az;
        const perp = Math.hypot(ox, oy, oz);
        if (room > 0 && perp < room) {
          const k = perp > 1e-3 ? room / perp : 0;
          dummy.position.set(
            along * ax + (k ? ox * k : ux * room),
            along * ay + (k ? oy * k : uy * room),
            along * az + (k ? oz * k : uz * room)
          );
        }
      }

      dummy.rotation.set(
        t * w.speed * s.spin * 0.35 + s.phase,
        t * w.speed * s.spin * 0.5,
        s.phase
      );
      // dentro al portale la materia si stira verso la camera: sono le scie
      // di velocità che rendono leggibile l'accelerazione
      const sc = s.size * weight;
      // Lo stiramento era da sette volte: sul confine la materia diventava un
      // fascio di aghi e, sommato al velo e alla camera, erano tre cose che
      // scattavano insieme. Ridotto a poco più del doppio si legge ancora come
      // velocità, ma non prende il sopravvento sulla scena.
      dummy.scale.set(sc, sc, sc * (1 + scroll.portal * 2.2));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, COUNT]} castShadow>
      <meshPhysicalMaterial
        ref={mat}
        transparent
        metalness={0.2}
        roughness={0.4}
        clearcoat={0.6}
        envMapIntensity={1.8}
        ior={1.4}
        thickness={0.6}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

/**
 * La materia che esce dal cubo quando si apre, e che cambia natura da un
 * progetto al successivo: gocce di latte → superfici di cartone → schegge di
 * metallo → lastre di vetro → cristallo.
 */
export function Matter() {
  return (
    <group>
      <Family family={0} seed={11} />
      <Family family={1} seed={29} />
      <Family family={2} seed={47} />
    </group>
  );
}
