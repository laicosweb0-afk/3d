'use client';

// L'auto del giocatore: una utilitaria italiana costruita dalle
// PROPORZIONI descritte in lib/lugo/carrozzerie.ts — nessun marchio, solo
// la sagoma che si riconosce per strada. Rispetto alla scatola di prima:
// padiglione più stretto del corpo (il "tumblehome" che fa sembrare
// un'auto un'auto), parabrezza e lunotto inclinati, passaruota scuri,
// specchietti, maniglie, cofano che scende sul muso. Il modello guarda +X.

import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RuntimeGioco } from './Player';
import { TINTE_AUTO } from '@/lib/lugo/palette';
import { useLugo } from '@/lib/lugo/store';
import { runtime } from '@/lib/lugo/runtime';
import { cieloOra } from '@/lib/lugo/tempo';
import { CARROZZERIE, carrozzeriaById } from '@/lib/lugo/carrozzerie';

const VETRO = '#3A4756';
const GOMMA = '#1B1A1F';
const CERCHIO = '#B4B0B8';
const PLASTICA = '#2E2C33';

/** Una lamiera dell'auto: scatola, colore, e la sua eventuale inclinazione. */
interface Lamiera {
  p: [number, number, number];
  s: [number, number, number];
  col: string;
  /** Rotazione attorno a Z: la usano cofano, parabrezza e lunotto. */
  rz?: number;
}

/**
 * Fonde in UNA sola geometria tutte le lamiere che non si muovono l'una
 * rispetto all'altra.
 *
 * Non è un vezzo, ed è la stessa ragione per cui Character.tsx fonde testa
 * e busto: la carrozzeria era fatta di ventiquattro scatolette, e finché
 * ognuna era una mesh a sé costava ventiquattro chiamate di disegno —
 * sempre a schermo, perché l'auto del giocatore è quasi sempre inquadrata,
 * anche quando la si è appena parcheggiata e si va a piedi. Ventiquattro
 * chiamate su un tetto di centosettanta sono un settimo del budget di tutta
 * Lugo spese per una macchina che non cambia forma. Fuse, ne costa una.
 *
 * Restano fuori solo i pezzi che si muovono davvero (le quattro ruote, che
 * girano e sterzano) e i quattro fanali, che accendono e spengono il loro
 * emissivo a ogni frenata e a ogni tramonto: quelli hanno bisogno di un
 * materiale proprio.
 */
function fondiLamiere(pezzi: Lamiera[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const c = new THREE.Color();
  const FACCE: [number, number, number][][] = [
    [[1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, -1]],
    [[-1, 1, -1], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1]],
    [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]],
    [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]],
    [[-1, 1, 1], [-1, -1, 1], [1, -1, 1], [1, 1, 1]],
    [[1, 1, -1], [1, -1, -1], [-1, -1, -1], [-1, 1, -1]],
  ];
  const NORMALI: [number, number, number][] = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  for (const z of pezzi) {
    c.set(z.col);
    // la rotazione è attorno al CENTRO del pezzo, come faceva `rotation`
    // sulla mesh: ruotare attorno all'origine dell'auto sposterebbe il
    // parabrezza sul cofano
    const ca = Math.cos(z.rz ?? 0);
    const sa = Math.sin(z.rz ?? 0);
    for (let f = 0; f < 6; f++) {
      const base = pos.length / 3;
      for (const [ux, uy, uz] of FACCE[f]) {
        const lx = (ux * z.s[0]) / 2;
        const ly = (uy * z.s[1]) / 2;
        pos.push(z.p[0] + lx * ca - ly * sa, z.p[1] + lx * sa + ly * ca, z.p[2] + (uz * z.s[2]) / 2);
        const [nx, ny, nz] = NORMALI[f];
        nor.push(nx * ca - ny * sa, nx * sa + ny * ca, nz);
        col.push(c.r, c.g, c.b);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}

function Ruota({
  x,
  z,
  r,
  rt,
  sterzante,
}: {
  x: number;
  z: number;
  r: number;
  rt: RuntimeGioco;
  sterzante?: boolean;
}) {
  const sterzo = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  useFrame(() => {
    if (sterzante && sterzo.current) sterzo.current.rotation.y = -rt.auto.sterzo * 0.9;
    if (spin.current) spin.current.rotation.z = -rt.faseRuote;
  });
  return (
    <group position={[x, r, z]} ref={sterzo}>
      <group ref={spin}>
        {/* pneumatico */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[r, r, 0.2, 14]} />
          <meshLambertMaterial color={GOMMA} />
        </mesh>
        {/* cerchio in lega, appena fuori dal pneumatico */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, Math.sign(z) * 0.055]}>
          <cylinderGeometry args={[r * 0.62, r * 0.62, 0.1, 10]} />
          <meshLambertMaterial color={CERCHIO} />
        </mesh>
        {/* mozzo */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, Math.sign(z) * 0.09]}>
          <cylinderGeometry args={[r * 0.2, r * 0.2, 0.05, 8]} />
          <meshLambertMaterial color="#6E6A72" />
        </mesh>
      </group>
    </group>
  );
}

export const Car = forwardRef<THREE.Group, { rt: RuntimeGioco }>(function Car({ rt }, ref) {
  const tinta = useLugo((s) => s.tintaAuto);
  const modello = useLugo((s) => s.modelloAuto);
  // L'auto che guidi è quella che hai preso: la sua tinta e la sua sagoma.
  // tintaAuto e modelloAuto NON si toccano — sono la scelta fatta allo
  // start, sono salvate, e sovrascriverle vorrebbe dire perdere per sempre
  // il colore che ti eri scelto solo perché una sera hai preso l'utilitaria
  // di un altro. Riscendi dall'auto rubata e la tua è di nuovo la tua.
  const rubata = useLugo((s) => s.veicoloRubato);
  const c = carrozzeriaById(
    CARROZZERIE[(rubata ? rubata.carrozzeria : modello) % CARROZZERIE.length].id,
  );
  const colore = rubata ? rubata.colore : TINTE_AUTO[tinta % TINTE_AUTO.length].colore;
  const scuro = useMemo(() => new THREE.Color(colore).multiplyScalar(0.82), [colore]);

  const corpo = useRef<THREE.Group>(null);
  const stopD = useRef<THREE.MeshLambertMaterial>(null);
  const stopS = useRef<THREE.MeshLambertMaterial>(null);
  const faroD = useRef<THREE.MeshLambertMaterial>(null);
  const faroS = useRef<THREE.MeshLambertMaterial>(null);
  const vPrima = useRef(0);

  // quote ricavate dalla carrozzeria
  const yBase = c.rRuota + 0.06;
  const yCorpo = yBase + c.hCorpo / 2;
  const yCintura = yBase + c.hCorpo; // linea di cintura: dove finiscono le lamiere
  const yTetto = yCintura + c.hTetto;
  const largTetto = c.larg * 0.87;
  const xTetto = c.offTetto;
  const semiTetto = c.lungTetto / 2;
  const semiL = c.lung / 2;
  const semiPasso = c.passo / 2;

  // La carrozzeria intera in una geometria sola. Si ricalcola solo quando
  // cambia la sagoma o il colore — cioè allo start e quando ti porti via
  // l'auto di un altro — non a ogni fotogramma.
  const scocca = useMemo(() => {
    const tinta = '#' + new THREE.Color(colore).getHexString();
    const ombra = '#' + scuro.getHexString();
    const pezzi: Lamiera[] = [
      // fascia bassa, appena più stretta: smussa lo spigolo a terra
      { p: [0, yBase + 0.06, 0], s: [c.lung * 0.97, 0.14, c.larg * 0.94], col: ombra },
      // fiancata
      { p: [0, yCorpo, 0], s: [c.lung, c.hCorpo, c.larg], col: tinta },
      // cofano che scende sul muso
      { p: [semiL - c.cofano / 2, yCintura - 0.02, 0], s: [c.cofano, 0.12, c.larg * 0.96], col: tinta, rz: -0.06 },
      // coda
      { p: [-semiL + 0.22, yCintura - 0.02, 0], s: [0.44, 0.12, c.larg * 0.96], col: tinta },
      // padiglione: più stretto del corpo, è ciò che fa "auto"
      { p: [xTetto, yCintura + c.hTetto / 2, 0], s: [c.lungTetto * 0.98, c.hTetto * 0.9, largTetto], col: VETRO },
      // tetto in tinta, appena più stretto ancora
      { p: [xTetto, yTetto, 0], s: [c.lungTetto * 0.97, 0.09, largTetto * 0.97], col: tinta },
      // parabrezza e lunotto inclinati
      {
        p: [xTetto + semiTetto + 0.12, yCintura + c.hTetto * 0.5, 0],
        s: [0.07, c.hTetto * 1.12, largTetto * 0.97],
        col: VETRO,
        rz: -0.42 + c.squadrata * 0.2,
      },
      {
        p: [xTetto - semiTetto - 0.1, yCintura + c.hTetto * 0.5, 0],
        s: [0.07, c.hTetto * 1.06, largTetto * 0.97],
        col: VETRO,
        rz: 0.34 - c.squadrata * 0.18,
      },
      // calandra e paraurti
      { p: [semiL - 0.01, yCintura - 0.3, 0], s: [0.05, 0.12, c.larg * 0.5], col: PLASTICA },
      { p: [semiL - 0.04, yBase + 0.2, 0], s: [0.16, 0.2, c.larg * 0.96], col: PLASTICA },
      { p: [-semiL + 0.04, yBase + 0.2, 0], s: [0.16, 0.2, c.larg * 0.96], col: PLASTICA },
      // targa
      { p: [-semiL - 0.02, yBase + 0.24, 0], s: [0.02, 0.1, 0.36], col: '#E8E6DE' },
    ];
    // montanti in tinta ai quattro angoli del padiglione
    for (const [mx, mz] of [
      [xTetto + semiTetto - 0.06, largTetto / 2],
      [xTetto + semiTetto - 0.06, -largTetto / 2],
      [xTetto - semiTetto + 0.06, largTetto / 2],
      [xTetto - semiTetto + 0.06, -largTetto / 2],
    ]) {
      pezzi.push({ p: [mx, yCintura + c.hTetto / 2, mz], s: [0.11, c.hTetto, 0.09], col: tinta });
    }
    // passaruota scuri: la ruota non esce più da una scatola
    for (const px of [semiPasso, -semiPasso]) {
      for (const pz of [c.larg / 2 - 0.02, -c.larg / 2 + 0.02]) {
        pezzi.push({ p: [px, yBase + 0.04, pz], s: [c.rRuota * 2.4, 0.3, 0.12], col: PLASTICA });
      }
    }
    // specchietti e modanature
    for (const pz of [c.larg / 2 + 0.07, -c.larg / 2 - 0.07]) {
      pezzi.push({ p: [xTetto + semiTetto + 0.05, yCintura + 0.05, pz], s: [0.12, 0.09, 0.16], col: ombra });
    }
    for (const pz of [c.larg / 2 + 0.005, -c.larg / 2 - 0.005]) {
      pezzi.push({ p: [xTetto, yCintura - 0.16, pz], s: [c.lungTetto * 0.92, 0.05, 0.02], col: PLASTICA });
    }
    return fondiLamiere(pezzi);
  }, [c, colore, scuro, yBase, yCorpo, yCintura, yTetto, largTetto, xTetto, semiTetto, semiL, semiPasso]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const g = corpo.current;
    if (g) {
      const acc = dt > 0 ? (rt.vAuto - vPrima.current) / dt : 0;
      vPrima.current = rt.vAuto;
      const beccheggio = THREE.MathUtils.clamp(-acc * 0.006, -0.05, 0.06);
      const rollio = THREE.MathUtils.clamp(rt.auto.sterzo * rt.vAuto * 0.004, -0.05, 0.05);
      g.rotation.z += (beccheggio - g.rotation.z) * Math.min(1, dt * 8);
      g.rotation.x += (rollio - g.rotation.x) * Math.min(1, dt * 8);
    }
    const acceso = runtime.frenata ? 2.6 : 0.9;
    if (stopD.current) stopD.current.emissiveIntensity = acceso;
    if (stopS.current) stopS.current.emissiveIntensity = acceso;
    const fari = 0.45 + cieloOra().luci * 2.4;
    if (faroD.current) faroD.current.emissiveIntensity = fari;
    if (faroS.current) faroS.current.emissiveIntensity = fari;
  });

  return (
    <group ref={ref}>
      <group ref={corpo}>
        {/* La carrozzeria: ventiquattro lamiere in una mesh sola (vedi
            fondiLamiere). Quel che resta fuori si muove o si accende. */}
        <mesh geometry={scocca} castShadow>
          <meshLambertMaterial vertexColors />
        </mesh>

        {/* ── luci ───────────────────────────────────────────────────── */}
        {[0.32, -0.32].map((pz, i) => (
          <mesh key={'f' + pz} position={[semiL - 0.02, yCintura - 0.16, pz * (c.larg / 0.8)]}>
            <boxGeometry args={[0.06, 0.15, 0.3]} />
            <meshLambertMaterial
              ref={i === 0 ? faroD : faroS}
              color="#FFF6D8"
              emissive="#FFE9A8"
              emissiveIntensity={0.7}
            />
          </mesh>
        ))}
        {[0.34, -0.34].map((pz, i) => (
          <mesh key={'s' + pz} position={[-semiL + 0.02, yCintura - 0.14, pz * (c.larg / 0.8)]}>
            <boxGeometry args={[0.05, 0.16, 0.26]} />
            <meshLambertMaterial
              ref={i === 0 ? stopD : stopS}
              color="#8A1F1A"
              emissive="#C0362C"
              emissiveIntensity={0.9}
            />
          </mesh>
        ))}
      </group>

      <Ruota x={semiPasso} z={c.larg / 2 - 0.08} r={c.rRuota} rt={rt} sterzante />
      <Ruota x={semiPasso} z={-c.larg / 2 + 0.08} r={c.rRuota} rt={rt} sterzante />
      <Ruota x={-semiPasso} z={c.larg / 2 - 0.08} r={c.rRuota} rt={rt} />
      <Ruota x={-semiPasso} z={-c.larg / 2 + 0.08} r={c.rRuota} rt={rt} />
    </group>
  );
});
