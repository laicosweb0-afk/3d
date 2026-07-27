'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { scroll, damp } from './scrollState';
import { blendWorlds } from './worlds';
import { asset } from '@/lib/asset';

const IDS = ['bufala', 'mou', 'mondial', 'aurea', 'loewe', 'woman'] as const;

/**
 * File del marchio, così come consegnato dal cliente.
 *
 * REGOLA: si usa esclusivamente il file originale, senza alcuna elaborazione.
 * Niente estrazione dell'alfa, niente chiave cromatica, niente ritaglio
 * automatico: sono tutti procedimenti che alterano lettere, spessori e vuoti
 * interni del marchio. Finché il cliente non fornisce un file ufficiale con
 * trasparenza (SVG, AI, EPS, PDF o PNG), il logo viene mostrato con il proprio
 * fondo pieno — un'etichetta, che è un compromesso onesto — perché l'identità
 * del marchio vale più dell'estetica della scena.
 *
 * Stringa vuota = nessun file utilizzabile, e allora non si mostra nulla.
 * Woman Beauty Center: disponibile solo una schermata Instagram, non un logo.
 */
const ARTWORK: Record<(typeof IDS)[number], string> = {
  bufala: '/assets/mediapro/orig-bufala.png',
  mou: '/assets/mediapro/orig-mou.png',
  mondial: '/assets/mediapro/orig-mondial.png',
  aurea: '/assets/mediapro/orig-aurea.jpg',
  loewe: '/assets/mediapro/orig-loewe.jpg',
  woman: '',
};

/**
 * L'oggetto iconico di ogni cliente. Niente cubi generici: la forma racconta
 * il marchio prima ancora che si legga il nome.
 *
 *  - Bufala   sfera di latte, materia morbida e opaca
 *  - MOU      cartone del latte, superficie di carta
 *  - Mondial  dado esagonale in acciaio, l'attrezzo del mestiere
 *  - Aurea    anello, il nodo infinito della rete
 *  - Woman    vaso cosmetico in vetro satinato
 */
type Spec = {
  /** Materiale dell'oggetto. */
  color: string;
  metalness: number;
  roughness: number;
  transmission: number;
  /** Dimensione e posizione della stampa del marchio sulla superficie. */
  print: { w: number; y: number; z: number };
  /** Targa avvitata con rivetti, come le targhette dei macchinari. */
  rivets?: boolean;
};

/**
 * La stampa deve stare DENTRO alla superficie che la ospita: larghezza e
 * profondità sono calcolate sulla geometria di ciascun oggetto, non scelte a
 * occhio. Un marchio che deborda dall'oggetto è esattamente l'effetto adesivo
 * da evitare.
 */
const SPECS: Record<(typeof IDS)[number], Spec> = {
  // Il colore dell'oggetto è accordato al fondo del file del marchio, così
  // l'etichetta si fonde nella superficie invece di leggersi come un
  // rettangolo incollato. Si interviene sull'oggetto, mai sul logo.
  // sfera r=1.42: la stampa sta sulla calotta frontale
  bufala: { color: '#ffffff', metalness: 0.02, roughness: 0.66, transmission: 0, print: { w: 1.9, y: 0, z: 0.79 } },
  // cartone largo 1.7, semiprofondità 0.85
  mou: { color: '#f7e9d7', metalness: 0.02, roughness: 0.78, transmission: 0, print: { w: 1.4, y: -0.1, z: 0.87 } },
  // dado esagonale: asse lungo Z, faccia piatta a z = 0.31
  mondial: { color: '#a7b0ba', metalness: 1, roughness: 0.3, transmission: 0, print: { w: 1.85, y: 0, z: 0.34 }, rivets: true },
  // anello r=1.18: la stampa vive nel vuoto centrale
  aurea: { color: '#fbfbfb', metalness: 0.5, roughness: 0.12, transmission: 0, print: { w: 1.7, y: 0, z: 0.34 } },
  // lastra di vetro nero: il file ha gia' il fondo nero, quindi su questa
  // superficie il marchio non ha bordi visibili — si integra da solo
  loewe: { color: '#0a0b0d', metalness: 0.85, roughness: 0.05, transmission: 0, print: { w: 2.5, y: 0, z: 0.09 } },
  // vaso r=1.08: stampa sul fronte del corpo
  // porcellana, non vetro: con transmission alta la materia che passa dietro si
  // vedeva attraverso la parete e sembravano ditate sul vasetto
  woman: { color: '#efe9ee', metalness: 0.1, roughness: 0.2, transmission: 0.12, print: { w: 1.45, y: -0.28, z: 1.1 } },
};

/**
 * Luce frontale sul marchio, dosata per oggetto: è l'inverso della chiarezza
 * della superficie su cui il marchio è applicato.
 */
const FILL: Record<(typeof IDS)[number], number> = {
  bufala: 5,
  mou: 7,
  mondial: 16,
  aurea: 6,
  loewe: 30,
  woman: 7,
};

function Shape({ id }: { id: (typeof IDS)[number] }) {
  if (id === 'bufala') {
    // Cassetta di legno: il marchio contiene già una targa lignea, e su una
    // cassetta un'etichetta rettangolare stampata è la norma, non un ripiego.
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[2.4, 1.55, 1.5]} />
          <meshPhysicalMaterial color="#6b4a2c" metalness={0.02} roughness={0.82} clearcoat={0.15} />
        </mesh>
        {[-0.62, 0, 0.62].map((y) => (
          <mesh key={y} castShadow position={[0, y, 0.76]}>
            <boxGeometry args={[2.42, 0.46, 0.05]} />
            <meshPhysicalMaterial color="#7d5834" metalness={0.02} roughness={0.78} />
          </mesh>
        ))}
      </group>
    );
  }
  if (id === 'mou') {
    // cartone del latte: corpo squadrato e cimosa superiore
    return (
      <group>
        <mesh castShadow position={[0, -0.15, 0]}>
          <boxGeometry args={[1.7, 2.3, 1.7]} />
          <ObjMaterial id={id} />
        </mesh>
        <mesh castShadow position={[0, 1.14, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.7, 0.34, 0.14]} />
          <ObjMaterial id={id} />
        </mesh>
      </group>
    );
  }
  if (id === 'mondial') {
    // dado esagonale: sei lati, non un cilindro
    return (
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.62, 6]} />
        <ObjMaterial id={id} />
      </mesh>
    );
  }
  if (id === 'loewe') {
    return (
      <mesh castShadow>
        <boxGeometry args={[2.9, 1.7, 0.14]} />
        <ObjMaterial id={id} />
      </mesh>
    );
  }
  if (id === 'aurea') {
    return (
      <mesh castShadow rotation={[0.35, 0, 0]}>
        <torusGeometry args={[1.18, 0.3, 32, 96]} />
        <ObjMaterial id={id} />
      </mesh>
    );
  }
  // woman: vaso cosmetico con coperchio
  return (
    <group>
      <mesh castShadow position={[0, -0.28, 0]}>
        <cylinderGeometry args={[1.08, 1.08, 1.15, 64]} />
        <ObjMaterial id={id} />
      </mesh>
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[1.14, 1.14, 0.3, 64]} />
        <ObjMaterial id={id} />
      </mesh>
    </group>
  );
}

function ObjMaterial({ id }: { id: (typeof IDS)[number] }) {
  const s = SPECS[id];
  return (
    <meshPhysicalMaterial
      color={s.color}
      metalness={s.metalness}
      roughness={s.roughness}
      transmission={s.transmission}
      thickness={s.transmission > 0 ? 1.2 : 0}
      clearcoat={0.6}
      clearcoatRoughness={0.2}
      envMapIntensity={1.1}
    />
  );
}

/**
 * L'etichetta con il marchio, applicata alla superficie dell'oggetto.
 *
 * L'immagine è il file del cliente così com'è, fondo compreso: viene solo
 * posizionata e illuminata, mai ritoccata. Le proporzioni del piano seguono
 * quelle native del file, così il marchio non viene mai stirato. Riceve le
 * luci della stanza con la rugosità dell'oggetto che la ospita, quindi si
 * comporta come un'etichetta stampata e non come un'immagine incollata.
 */
function Print({ id, tex }: { id: (typeof IDS)[number]; tex: THREE.Texture | null }) {
  const s = SPECS[id];
  if (!tex) return null;
  const ratio = tex.image ? tex.image.width / tex.image.height : 2;
  const h = s.print.w / ratio;
  return (
    <group position={[0, s.print.y, s.print.z]}>
      {/* La targa ha spessore: uno spigolo che raccoglie la luce è ciò che
          distingue un'etichetta applicata da un'immagine proiettata. */}
      <mesh castShadow>
        <boxGeometry args={[s.print.w, h, 0.035]} />
        <meshPhysicalMaterial
          map={tex}
          roughness={Math.min(0.85, s.roughness + 0.08)}
          metalness={s.metalness * 0.3}
          envMapIntensity={0.7}
        />
      </mesh>
      {/* Rivetti: su una targa industriale sono il dettaglio che la rende
          davvero avvitata all'oggetto invece che appoggiata. */}
      {s.rivets &&
        [
          [-s.print.w / 2 + 0.09, h / 2 - 0.09],
          [s.print.w / 2 - 0.09, h / 2 - 0.09],
          [-s.print.w / 2 + 0.09, -h / 2 + 0.09],
          [s.print.w / 2 - 0.09, -h / 2 + 0.09],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.03]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshPhysicalMaterial color="#c9ced4" metalness={1} roughness={0.24} />
          </mesh>
        ))}
    </group>
  );
}

/**
 * Gli oggetti dei cinque clienti. Solo quello del progetto corrente è in
 * scena: sulla soglia fra due stanze la presenza va a zero, quindi il ricambio
 * avviene mentre non si vede nulla.
 */
export function Objects() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const slots = useRef<(THREE.Group | null)[]>([]);
  const fill = useRef<THREE.PointLight>(null);

  // si caricano solo i file effettivamente disponibili
  const paths = IDS.map((id) => ARTWORK[id]).filter(Boolean) as string[];
  const loaded = useTexture(paths.map((p) => asset(p)));
  const byId = useMemo(() => {
    const map: Partial<Record<(typeof IDS)[number], THREE.Texture>> = {};
    let k = 0;
    for (const id of IDS) {
      if (!ARTWORK[id]) continue;
      const t = loaded[k++];
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      map[id] = t;
    }
    return map;
  }, [loaded]);

  useFrame((state, dt) => {
    if (!group.current || !inner.current) return;
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const w = blendWorlds(scroll.world);

    const nearest = Math.round(scroll.world);
    const edge = Math.abs(scroll.world - nearest);
    const presence = Math.max(0, 1 - edge * 2.6) * scroll.cases;
    const idx = Math.max(0, Math.min(IDS.length - 1, nearest));

    slots.current.forEach((g, i) => {
      if (g) g.visible = i === idx;
    });

    // segue l'angolo dell'orbita: una faccia resta sempre verso chi guarda
    const camAngle = -0.35 + scroll.world * 0.78;
    inner.current.rotation.y = camAngle + Math.sin(t * 0.22) * 0.26;
    inner.current.rotation.x = Math.sin(t * 0.3) * 0.07;

    // Luce di servizio sul marchio. L'atmosfera di ogni mondo è tinta e spesso
    // molto scura — sul nero LOEWE il logo spariva nel fondo — quindi il
    // marchio ha una sua sorgente bianca, ferma fra l'occhio e l'oggetto.
    // Non tinge: illumina e basta, così i colori restano quelli del file.
    if (fill.current) {
      const cam = state.camera.position;
      fill.current.position.set(cam.x * 0.42, cam.y * 0.42 + 0.6, cam.z * 0.42);
      // Tanta quanta ne serve, non di più: la lastra nera LOEWE ne vuole molta,
      // la cassetta bianca quasi nessuna — dove il fondo è già chiaro una luce
      // forte la brucia e il marchio annega nel bagliore.
      fill.current.intensity = presence * FILL[IDS[idx]];
      fill.current.visible = presence > 0.02;
    }

    group.current.position.y = damp(group.current.position.y, Math.sin(t * 0.5) * 0.13, 3, d);
    group.current.scale.setScalar(damp(group.current.scale.x, presence * 1.05, 5, d));
    group.current.position.z = damp(group.current.position.z, (1 - presence) * -3.4, 4, d);
    group.current.visible = presence > 0.02;
    void w;
  });

  return (
    <>
      {/* fuori dal gruppo: non deve seguirne scala e rotazione */}
      <pointLight ref={fill} color="#ffffff" distance={14} decay={1.6} />
      <group ref={group}>
        <group ref={inner}>
          {IDS.map((id, i) => (
            <group
              key={id}
              ref={(g) => {
                slots.current[i] = g;
              }}
              visible={i === 0}
            >
              <Shape id={id} />
              <Print id={id} tex={byId[id] ?? null} />
            </group>
          ))}
        </group>
      </group>
    </>
  );
}
