'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';

/**
 * L'universo AureaClub.
 *
 * È l'unica stanza del portfolio che non usa l'oggetto + etichetta degli altri
 * clienti: qui il simbolo è la scena. Al centro c'è una lemniscata — la curva
 * dell'infinito — costruita come geometria, non come immagine appoggiata.
 *
 * ATTENZIONE, e vale come nota per chi riprenderà il file: questa NON è il
 * marchio AureaClub. È una lemniscata generica, la forma matematica. Il segno
 * del brand ha spessori, raccordi e due colori suoi, e per riprodurlo serve il
 * file vettoriale ufficiale: ricavarlo dal JPG con lo sfondo significherebbe
 * ritagliarlo automaticamente, che è vietato. Quando arriva l'SVG, si sostituisce
 * la curva qui sotto con il tracciato vero e tutto il resto della scena resta
 * com'è. Meglio nessun marchio che un marchio approssimato.
 *
 * Il resto è il mondo: nodi che si accendono, connessioni fra loro, pulsazioni
 * che percorrono la curva, polvere in orbita. Il momento della stanza è
 * l'attraversamento: la curva si sfalda in centinaia di filamenti mentre la
 * camera ci passa dentro, e si ricompone esatta dall'altra parte.
 */

/** Lemniscata di Bernoulli, con una leggera ondulazione fuori piano. */
class Lemniscate extends THREE.Curve<THREE.Vector3> {
  constructor(private a = 1.62) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const u = t * Math.PI * 2;
    const s = Math.sin(u);
    const c = Math.cos(u);
    const d = 1 + s * s;
    return target.set((this.a * c) / d, (this.a * s * c) / d, Math.sin(u * 2) * 0.17);
  }
}

const CURVE = new Lemniscate();

/** Filamenti in cui la curva si sfalda. */
const FILAMENTS = 260;
/** Nodi della rete e connessioni fra loro. */
const NODES = 30;
const LINKS = 46;
/** Pulviscolo in orbita attorno alla curva. */
const ORBITERS = 420;

const dummy = new THREE.Object3D();
const vTangent = new THREE.Vector3();
const vUp = new THREE.Vector3(1, 0, 0);
const qAlign = new THREE.Quaternion();

/** Rumore deterministico: la scena dev'essere identica a ogni visita. */
function seeded(n: number) {
  let seed = 0x9e3779b9 ^ n;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Aurea() {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const tube = useRef<THREE.Mesh>(null);
  const tubeMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const shards = useRef<THREE.InstancedMesh>(null);
  const shardMat = useRef<THREE.MeshStandardMaterial>(null);
  const pulses = useRef<THREE.Group>(null);
  const orbiters = useRef<THREE.Points>(null);
  const orbMat = useRef<THREE.PointsMaterial>(null);
  const netNodes = useRef<THREE.Points>(null);
  const netLines = useRef<THREE.LineSegments>(null);
  const nodeMat = useRef<THREE.PointsMaterial>(null);
  const lineMat = useRef<THREE.LineBasicMaterial>(null);
  const glow = useRef<THREE.PointLight>(null);

  /** Stato smorzato, così ogni parametro arriva con la propria inerzia. */
  const state = useRef({ presence: 0, shatter: 0, net: 0 });

  const geometry = useMemo(() => new THREE.TubeGeometry(CURVE, 340, 0.115, 18, true), []);

  /** Posizione di riposo di ogni filamento sulla curva, e dove vola aprendosi. */
  const filaments = useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: FILAMENTS }, (_, i) => {
      const t = i / FILAMENTS;
      const at = CURVE.getPoint(t);
      const tan = CURVE.getTangent(t).normalize();
      // scostamento attorno all'asse del tubo: i filamenti formano il volume
      const ang = r() * Math.PI * 2;
      const rad = 0.05 + r() * 0.085;
      const nx = -tan.y;
      const ny = tan.x;
      const off = new THREE.Vector3(
        Math.cos(ang) * nx * rad,
        Math.cos(ang) * ny * rad,
        Math.sin(ang) * rad
      );
      const rest = at.clone().add(off);
      // aprendosi vanno verso l'esterno, con una componente casuale
      const out = rest
        .clone()
        .normalize()
        .multiplyScalar(1.6 + r() * 3.4)
        .add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(2.6));
      return {
        rest,
        out,
        tan,
        len: 0.06 + r() * 0.16,
        spin: (r() - 0.5) * 5.2,
        phase: r() * Math.PI * 2,
      };
    });
  }, []);

  /** Nodi della rete e coppie da collegare. */
  const network = useMemo(() => {
    const r = seeded(23);
    const nodes = Array.from({ length: NODES }, () => {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(2 * r() - 1);
      const rad = 2.6 + r() * 2.4;
      return {
        base: new THREE.Vector3(
          Math.sin(ph) * Math.cos(th) * rad,
          Math.cos(ph) * rad * 0.62,
          Math.sin(ph) * Math.sin(th) * rad
        ),
        phase: r() * Math.PI * 2,
        speed: 0.2 + r() * 0.5,
      };
    });
    // ogni connessione unisce due nodi vicini: una rete, non una ragnatela a caso
    const pairs: [number, number][] = [];
    for (let i = 0; i < NODES && pairs.length < LINKS; i++) {
      const order = nodes
        .map((n, j) => ({ j, d: n.base.distanceTo(nodes[i].base) }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d);
      for (let k = 0; k < 2 && pairs.length < LINKS; k++) {
        const j = order[k].j;
        if (!pairs.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) {
          pairs.push([i, j]);
        }
      }
    }
    return { nodes, pairs };
  }, []);

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NODES * 3), 3));
    return g;
  }, []);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(network.pairs.length * 6), 3)
    );
    return g;
  }, [network]);

  const orbGeo = useMemo(() => {
    const r = seeded(41);
    const pos = new Float32Array(ORBITERS * 3);
    const seedData = new Float32Array(ORBITERS * 3);
    for (let i = 0; i < ORBITERS; i++) {
      seedData[i * 3] = r(); // punto sulla curva
      seedData[i * 3 + 1] = 0.2 + r() * 1.5; // distanza dalla curva
      seedData[i * 3 + 2] = r() * Math.PI * 2; // fase
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo: g, seedData };
  }, []);

  useFrame((frame, dt) => {
    if (!root.current) return;
    const t = frame.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const s = state.current;

    // Quanto siamo dentro la stanza Aurea (indice 3 dei mondi).
    const dist = Math.abs(scroll.world - 3);

    // La visibilità è un fatto geometrico, non un valore smorzato.
    //
    // Prima dipendeva dalla presenza interpolata, e su una macchina lenta —
    // o con una scrollata veloce — quel numero restava indietro: i filamenti
    // dorati di Aurea si ritrovavano in mezzo alla stanza LOEWE, che è
    // esattamente il difetto che questa scena doveva risolvere. Fuori da questa
    // distanza la stanza non esiste, punto; la morbidezza la fa la presenza,
    // che qui dentro governa scala e intensità.
    root.current.visible = dist < 0.68 && scroll.cases > 0.02;
    if (!root.current.visible) {
      // si riparte da zero al rientro, così la ricomparsa è sempre una nascita
      s.presence = 0;
      s.net = 0;
      return;
    }

    // Piena per quasi tutta la stanza, si ritira solo sul bordo.
    const target = Math.max(0, Math.min(1, (0.68 - dist) / 0.22)) * scroll.cases;
    s.presence = damp(s.presence, target, 8, d);

    // Lo sfaldamento parte quando l'oggetto è ancora tutto in scena e cresce
    // avvicinandosi alla soglia: prima si spacca, poi attraversiamo. Nell'ordine
    // inverso non si vedrebbe nulla, perché a quel punto la stanza è già finita.
    const edge = Math.max(0, Math.min(1, (dist - 0.16) / 0.26));
    const shatterTarget = Math.max(edge, scroll.portal);
    s.shatter = damp(s.shatter, shatterTarget, 8, d);

    // La rete si accende dopo, quando la curva si è ricomposta: prima l'oggetto,
    // poi il mondo attorno. Un accendersi tutto insieme non racconta niente.
    s.net = damp(s.net, Math.max(0, 1 - s.shatter * 1.6) * s.presence, 3.2, d);

    // Spostata verso destra come gli oggetti delle altre stanze: il testo del
    // progetto occupa la metà sinistra e la curva non deve attraversarlo.
    root.current.position.x = 0.85;
    root.current.scale.setScalar(0.32 + s.presence * 0.6);

    if (spin.current) {
      // La curva segue l'orbita della camera invece di ruotare per conto suo.
      // Con una rotazione libera, un paio di secondi ogni giro il simbolo si
      // presenta di taglio e diventa una riga: proprio nel momento in cui deve
      // essere riconoscibile. Qui oscilla di venti gradi attorno alla direzione
      // di chi guarda — si muove, ma resta sempre un infinito.
      const cam = frame.camera.position;
      const face = Math.atan2(cam.x, cam.z);
      spin.current.rotation.y = face + Math.sin(t * 0.28) * 0.34;
      spin.current.rotation.x = -0.12 + Math.sin(t * 0.23) * 0.13;
      spin.current.rotation.z = Math.sin(t * 0.17) * 0.09;
    }

    // ---- la curva piena, che cede il posto ai filamenti aprendosi ----
    if (tube.current && tubeMat.current) {
      const solid = 1 - Math.min(1, s.shatter * 1.25);
      tubeMat.current.opacity = solid;
      tube.current.visible = solid > 0.01;
      // luce interna che respira, e il riflesso che scorre lungo la superficie
      tubeMat.current.emissiveIntensity = 0.35 + Math.sin(t * 0.9) * 0.16 + s.net * 0.5;
      tubeMat.current.iridescence = 0.4 + Math.sin(t * 0.5) * 0.25;
    }

    // ---- i filamenti ----
    if (shards.current && shardMat.current) {
      // A riposo devono sparire del tutto: se restano visibili sulla curva
      // sembrano detriti attaccati all'oro, non un oggetto che si è ricomposto.
      // La soglia è alta apposta — al centro della stanza lo sfaldamento non è
      // mai esattamente zero, e senza margine i filamenti non se ne vanno mai.
      const sh = Math.max(0, (s.shatter - 0.03) / 0.97);
      shards.current.visible = sh > 0.001;
      if (shards.current.visible) {
        shardMat.current.emissiveIntensity = 1.4 + sh * 2.6;
        shardMat.current.opacity = Math.min(1, sh * 3);
        for (let i = 0; i < FILAMENTS; i++) {
          const f = filaments[i];
          // interpolazione con un pizzico di anticipo: partono a scaglioni,
          // non tutti insieme, e questo è ciò che li fa sembrare tanti
          const lag = 0.6 + ((i % 17) / 17) * 0.55;
          const k = Math.min(1, sh * lag);
          dummy.position.lerpVectors(f.rest, f.out, k);
          // in volo si allungano nella direzione del moto: sono scie
          const stretch = 1 + k * 7;
          vTangent.copy(f.tan);
          qAlign.setFromUnitVectors(vUp, vTangent);
          dummy.quaternion.copy(qAlign);
          dummy.rotateX(k * f.spin + f.phase * k);
          dummy.scale.set(f.len * stretch, 0.022, 0.022);
          dummy.updateMatrix();
          shards.current.setMatrixAt(i, dummy.matrix);
        }
        shards.current.instanceMatrix.needsUpdate = true;
      }
    }

    // ---- pulsazioni che percorrono la curva ----
    if (pulses.current) {
      pulses.current.visible = s.shatter < 0.6;
      pulses.current.children.forEach((child, i) => {
        const u = (t * 0.11 + i / pulses.current!.children.length) % 1;
        CURVE.getPoint(u, child.position);
        const beat = 0.7 + Math.sin(t * 2.4 + i) * 0.3;
        child.scale.setScalar(beat * (1 - s.shatter));
      });
    }

    if (glow.current) {
      glow.current.intensity = s.presence * (5 + Math.sin(t * 1.3) * 1.6) + s.shatter * 12;
    }

    // ---- la rete: nodi che derivano piano e connessioni fra loro ----
    if (netNodes.current && netLines.current && nodeMat.current && lineMat.current) {
      const np = nodeGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < NODES; i++) {
        const n = network.nodes[i];
        np[i * 3] = n.base.x + Math.sin(t * n.speed + n.phase) * 0.34;
        np[i * 3 + 1] = n.base.y + Math.cos(t * n.speed * 0.8 + n.phase) * 0.3;
        np[i * 3 + 2] = n.base.z + Math.sin(t * n.speed * 0.6 + n.phase * 1.7) * 0.34;
      }
      nodeGeo.attributes.position.needsUpdate = true;

      const lp = lineGeo.attributes.position.array as Float32Array;
      network.pairs.forEach(([a, b], i) => {
        lp[i * 6] = np[a * 3];
        lp[i * 6 + 1] = np[a * 3 + 1];
        lp[i * 6 + 2] = np[a * 3 + 2];
        lp[i * 6 + 3] = np[b * 3];
        lp[i * 6 + 4] = np[b * 3 + 1];
        lp[i * 6 + 5] = np[b * 3 + 2];
      });
      lineGeo.attributes.position.needsUpdate = true;

      nodeMat.current.opacity = s.net * 0.95;
      nodeMat.current.size = 0.075 + Math.sin(t * 1.7) * 0.012;
      // le connessioni restano tenui: sono il tessuto, non il soggetto
      lineMat.current.opacity = s.net * 0.22;
      netNodes.current.visible = s.net > 0.02;
      netLines.current.visible = s.net > 0.02;
    }

    // ---- pulviscolo in orbita attorno alla curva ----
    if (orbiters.current && orbMat.current) {
      const pos = orbGeo.geo.attributes.position.array as Float32Array;
      const sd = orbGeo.seedData;
      const tmp = new THREE.Vector3();
      for (let i = 0; i < ORBITERS; i++) {
        const u = (sd[i * 3] + t * 0.012) % 1;
        const rad = sd[i * 3 + 1];
        const ph = sd[i * 3 + 2] + t * 0.45;
        CURVE.getPoint(u, tmp);
        pos[i * 3] = tmp.x + Math.cos(ph) * rad;
        pos[i * 3 + 1] = tmp.y + Math.sin(ph * 0.7) * rad * 0.5;
        pos[i * 3 + 2] = tmp.z + Math.sin(ph) * rad;
      }
      orbGeo.geo.attributes.position.needsUpdate = true;
      orbMat.current.opacity = s.presence * 0.5;
    }
  });

  return (
    <group ref={root}>
      <pointLight ref={glow} color="#f3d9a4" distance={12} decay={1.5} />
      <group ref={spin}>
        {/* la curva piena: oro satinato, con un fondo di luce propria */}
        <mesh ref={tube} geometry={geometry} castShadow>
          <meshPhysicalMaterial
            ref={tubeMat}
            transparent
            color="#c9a25f"
            metalness={1}
            roughness={0.24}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive="#8a6a2e"
            envMapIntensity={2.4}
          />
        </mesh>

        {/* i filamenti in cui si sfalda */}
        <instancedMesh ref={shards} args={[undefined, undefined, FILAMENTS]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            ref={shardMat}
            transparent
            color="#f6e2b6"
            emissive="#e0b972"
            roughness={0.3}
            metalness={0.7}
          />
        </instancedMesh>

        {/* le pulsazioni che percorrono la curva */}
        <group ref={pulses}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color="#fff2d6" toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* la rete attorno: nodi e connessioni */}
      <points ref={netNodes} geometry={nodeGeo}>
        <pointsMaterial
          ref={nodeMat}
          transparent
          color="#ffe6b8"
          size={0.075}
          sizeAttenuation
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <lineSegments ref={netLines} geometry={lineGeo}>
        <lineBasicMaterial ref={lineMat} transparent color="#d8b98a" depthWrite={false} />
      </lineSegments>

      <points ref={orbiters} geometry={orbGeo.geo}>
        <pointsMaterial
          ref={orbMat}
          transparent
          color="#ffdca8"
          size={0.035}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
