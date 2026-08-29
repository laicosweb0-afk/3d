'use client';

// Il protagonista di LUGO CITY, montato dal guardaroba (lib/lugo/avatar.ts).
//
// Lo stile è quello della key art: figura a blocchi netti, ma con
// proporzioni umane vere — spalle più larghe dei fianchi, testa 1/7 della
// statura, mani e piedi che stanno al loro posto. Ogni pezzo (capelli,
// copricapo, top, pantaloni, scarpe, accessorio) è una voce di dati: se ne
// aggiunge uno e il modello lo monta da solo.
//
// Come l'auto, il modello guarda +X. La suola tocca esattamente y = 0.
//
// Tre difetti di anatomia riparati rispetto alla versione precedente:
//  - le suole affondavano nell'asfalto: ora la catena anca→ginocchio→suola
//    torna a zero per costruzione (QUOTE.suolaSpessore);
//  - correndo il busto si piegava all'INDIETRO: la rotazione era positiva,
//    e con il modello rivolto a +X un angolo positivo alza il petto;
//  - il ginocchio si piegava in avanti come quello di un fenicottero:
//    la gamba si piega verso il tallone, quindi con segno negativo.

import { forwardRef, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RuntimeGioco } from './Player';
import { runtime } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';
import { tessituraStemma } from '@/lib/lugo/marchio';
import { TINTE_CAPELLI, TINTE_PELLE, tintaDi, type Avatar } from '@/lib/lugo/avatar';

// ── le quote del corpo, in metri, misurate dalla suola ──────────────────────
const Q = {
  suola: 0.055,
  scarpaAlt: 0.13,
  caviglia: 0.13,
  ginocchio: 0.54,
  anca: 0.94,
  vita: 1.08,
  spalla: 1.46,
  collo: 1.52,
  testa: 1.7, // centro
  testaAlt: 0.26,
  larghSpalle: 0.5,
  larghFianchi: 0.4,
  profTorso: 0.3,
} as const;

const cosciaLen = Q.anca - Q.ginocchio; // 0.40
const stincoLen = Q.ginocchio - Q.caviglia; // 0.41

/**
 * Un pezzo del corpo, come dato: posizione, misure, colore.
 *
 * Fondere i pezzi che non si muovono l'uno rispetto all'altro NON è un
 * vezzo: il protagonista è fatto di una trentina di scatolette, e finché
 * ognuna era una mesh a sé costava una trentina di chiamate di disegno —
 * più di tutti i veicoli di Lugo messi insieme, e sempre a schermo mentre
 * si cammina. La testa e il busto non cambiano forma da soli: si fondono
 * una volta e diventano una mesh ciascuno.
 */
export interface Pezzo {
  p: [number, number, number];
  s: [number, number, number];
  col: string;
}

function fondiPezzi(pezzi: Pezzo[]): THREE.BufferGeometry {
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
    for (let f = 0; f < 6; f++) {
      const base = pos.length / 3;
      for (const [ux, uy, uz] of FACCE[f]) {
        pos.push(z.p[0] + (ux * z.s[0]) / 2, z.p[1] + (uy * z.s[1]) / 2, z.p[2] + (uz * z.s[2]) / 2);
        nor.push(...NORMALI[f]);
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

/** Una mesh sola per un gruppo di pezzi rigidi. */
function Fuso({ pezzi, ombra = true }: { pezzi: Pezzo[]; ombra?: boolean }) {
  const geo = useMemo(() => fondiPezzi(pezzi), [pezzi]);
  return (
    <mesh geometry={geo} castShadow={ombra}>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

/** Un mattone del corpo: scatola con posizione, misure e colore. */
function Blocco({
  p,
  s,
  col,
  ombra = true,
}: {
  p: [number, number, number];
  s: [number, number, number];
  col: string;
  ombra?: boolean;
}) {
  return (
    <mesh position={p} castShadow={ombra}>
      <boxGeometry args={s} />
      <meshLambertMaterial color={col} />
    </mesh>
  );
}

function Gamba({
  z,
  fase,
  rt,
  pantaloni,
  colPantaloni,
  scarpe,
  colScarpe,
}: {
  z: number;
  fase: number;
  rt: RuntimeGioco;
  pantaloni: string;
  colPantaloni: string;
  scarpe: string;
  colScarpe: string;
}) {
  const anca = useRef<THREE.Group>(null);
  const ginocchio = useRef<THREE.Group>(null);
  const larghezza = pantaloni === 'baggy' ? 0.215 : pantaloni === 'cargo' ? 0.2 : 0.185;
  const alte = scarpe === 'alte';

  useFrame(() => {
    if (!anca.current) return;
    const v = Math.min(1, rt.vPersona / 2.3);
    const corsa = Math.min(1, Math.max(0, (rt.vPersona - 2.6) / 2.6));
    // ampiezza del passo: legata alla falcata vera, così i piedi non strisciano
    const ampiezza = (0.5 + corsa * 0.28) * v;
    const camminata = Math.sin(rt.persona.fase + fase) * ampiezza;
    // In sella la gamba non cammina, pedala. Col modello rivolto a +X un
    // angolo POSITIVO su un arto che pende porta il piede in AVANTI: 0,62
    // rad mettono le cosce sui pedali, e il ginocchio resta piegato
    // all'indietro (negativo) come già fa camminando. La fase è la stessa
    // di sempre, solo che ora avanza a 1,15 rad/m invece di 3,5: si pedala
    // a 88 giri al minuto senza nessun contatore nuovo.
    const sella = rt.sella;
    const pedalata = 0.62 + Math.sin(rt.persona.fase + fase) * 0.3;
    anca.current.rotation.z = camminata * (1 - sella) + pedalata * sella;
    if (ginocchio.current) {
      // il ginocchio va all'indietro, verso il tallone: angolo NEGATIVO
      const piega = Math.max(0, -Math.sin(rt.persona.fase + fase - 0.5));
      const camminaGin = -piega * (0.7 + corsa * 0.6) * v;
      const pedalaGin = -(0.95 + Math.sin(rt.persona.fase + fase + 1.9) * 0.45);
      ginocchio.current.rotation.z = camminaGin * (1 - sella) + pedalaGin * sella;
    }
  });

  return (
    <group position={[0, Q.anca, z]} ref={anca}>
      <Blocco p={[0, -cosciaLen / 2, 0]} s={[larghezza + 0.01, cosciaLen, larghezza]} col={colPantaloni} />
      {pantaloni === 'cargo' && (
        <Blocco p={[larghezza * 0.55, -cosciaLen * 0.62, 0]} s={[0.03, 0.15, larghezza * 0.7]} col={colPantaloni} ombra={false} />
      )}
      <group position={[0, -cosciaLen, 0]} ref={ginocchio}>
        <Blocco p={[0, -stincoLen / 2, 0]} s={[larghezza - 0.02, stincoLen, larghezza - 0.015]} col={colPantaloni} />
        {alte && (
          <Blocco p={[0, -stincoLen + 0.07, 0]} s={[0.185, 0.14, 0.175]} col={colScarpe} ombra={false} />
        )}
        {/* la scarpa: la suola poggia esattamente sul terreno */}
        <Blocco
          p={[0.055, -stincoLen - Q.scarpaAlt / 2 + 0.005, 0]}
          s={[0.34, Q.scarpaAlt - Q.suola * 0.5, 0.185]}
          col={colScarpe}
        />
        <Blocco
          p={[0.055, -stincoLen - Q.scarpaAlt + Q.suola / 2, 0]}
          s={[0.35, Q.suola, 0.19]}
          col="#F2EFE7"
          ombra={false}
        />
      </group>
    </group>
  );
}

/** Durata dell'animazione del pugno: la stessa che arma il Player. */
export const DURATA_PUGNO = 0.42;

/**
 * 0 → 1 lungo il pugno, 0 quando non c'è nessun pugno in corso. La tengono
 * insieme braccio e busto: il colpo parte dalle anche, e con due curve
 * diverse il busto e il braccio andrebbero per conto loro.
 */
function avanzamentoPugno(): number {
  if (runtime.pugno.t <= 0) return 0;
  return 1 - runtime.pugno.t / DURATA_PUGNO;
}

function Braccio({
  z,
  fase,
  rt,
  top,
  colTop,
  colPelle,
  orologio,
  colpisce = false,
}: {
  z: number;
  fase: number;
  rt: RuntimeGioco;
  top: string;
  colTop: string;
  colPelle: string;
  orologio: boolean;
  colpisce?: boolean;
}) {
  const spalla = useRef<THREE.Group>(null);
  const gomito = useRef<THREE.Group>(null);
  const manicaCorta = top === 'tshirt';

  useFrame(() => {
    if (!spalla.current) return;
    const v = Math.min(1, rt.vPersona / 2.3);
    const corsa = Math.min(1, Math.max(0, (rt.vPersona - 2.6) / 2.6));
    const p = colpisce ? avanzamentoPugno() : 0;
    if (p > 0) {
      // ── il pugno, in tre tratti ────────────────────────────────────────
      // Un pugno che parte già disteso non si legge: servono la carica
      // indietro e poi la distensione. Il segno è quello del file (modello
      // rivolto a +X: negativo = avanti/in alto, come il busto che si
      // sporge correndo), quindi la spalla va a −1,35 e non a +1,35, che
      // porterebbe il pugno dietro la schiena.
      // La rotazione del passo qui si SOSTITUISCE, non si somma: sommata,
      // camminando il colpo partirebbe da un braccio già in movimento e
      // arriverebbe ogni volta in un punto diverso.
      let spallaZ: number;
      let gomitoZ: number;
      if (p < 0.25) {
        const k = p / 0.25;
        spallaZ = 0.55 * k;
        gomitoZ = -0.14 - 1.56 * k;
      } else if (p < 0.55) {
        const k = (p - 0.25) / 0.3;
        const morbido = 1 - (1 - k) * (1 - k) * (1 - k);
        spallaZ = 0.55 + (-1.35 - 0.55) * morbido;
        gomitoZ = -1.7 + (1.7 - 0.12) * morbido;
      } else {
        const k = (p - 0.55) / 0.45;
        // rientro esponenziale alla posa di camminata: il braccio torna
        // giù da solo, senza scatti, e l'ultimo fotogramma del pugno è già
        // quello del passo successivo
        const rientro = Math.exp(-3.5 * k);
        spallaZ = -1.35 * rientro;
        gomitoZ = -0.14 + 0.02 * rientro;
      }
      spalla.current.rotation.z = spallaZ;
      if (gomito.current) gomito.current.rotation.z = gomitoZ;
      return;
    }
    // Le mani vanno sul manubrio e ci restano: senza la mescola su rt.sella
    // le braccia continuavano a dondolare mentre si pedalava, e la bici
    // sembrava passare sotto uno che cammina nel vuoto.
    const sella = rt.sella;
    const camminata = Math.sin(rt.persona.fase + fase) * (0.42 + corsa * 0.34) * v;
    spalla.current.rotation.z = camminata * (1 - sella) + 1.05 * sella;
    // in corsa il gomito resta piegato, da vero podista; il braccio si
    // piega all'indietro, quindi negativo
    if (gomito.current) {
      const camminaGomito = -(0.14 + corsa * 1.05) - (1 - v) * 0.06;
      gomito.current.rotation.z = camminaGomito * (1 - sella) + -0.2 * sella;
    }
  });

  return (
    <group position={[0, Q.spalla, z]} ref={spalla}>
      <Blocco p={[0, -0.17, 0]} s={[0.14, 0.34, 0.145]} col={colTop} />
      <group position={[0, -0.34, 0]} ref={gomito}>
        <Blocco p={[0, -0.14, 0]} s={[0.125, 0.28, 0.13]} col={manicaCorta ? colPelle : colTop} />
        {orologio && <Blocco p={[0, -0.26, 0]} s={[0.13, 0.035, 0.135]} col="#C8CBD0" ombra={false} />}
        <Blocco p={[0.01, -0.34, 0]} s={[0.115, 0.12, 0.12]} col={colPelle} ombra={false} />
      </group>
    </group>
  );
}

function pezziCapelli(stile: string, col: string, sottoCappello: boolean): Pezzo[] {
  const y = Q.testa;
  const h = Q.testaAlt;
  if (stile === 'rasato') return [{ p: [0, y + h * 0.34, 0], s: [0.245, 0.05, 0.245], col }];
  // sotto il cappellino resta solo la nuca e le basette
  if (sottoCappello) {
    return [
      { p: [-0.115, y + 0.01, 0], s: [0.05, 0.19, 0.235], col },
      { p: [0, y - 0.02, 0.115], s: [0.2, 0.14, 0.05], col },
      { p: [0, y - 0.02, -0.115], s: [0.2, 0.14, 0.05], col },
    ];
  }
  const alto = stile === 'medi' ? 0.13 : stile === 'ricci' ? 0.12 : 0.085;
  const out: Pezzo[] = [
    { p: [0, y + h / 2 - alto / 2 + 0.02, 0], s: [0.25, alto, 0.25], col },
    { p: [-0.115, y + 0.02, 0], s: [0.045, 0.2, 0.24], col },
  ];
  if (stile === 'crop') out.push({ p: [0.115, y + h / 2 - 0.01, 0], s: [0.06, 0.07, 0.22], col });
  if (stile === 'ricci') {
    out.push({ p: [0.06, y + h / 2 + 0.05, 0.09], s: [0.1, 0.09, 0.1], col });
    out.push({ p: [-0.02, y + h / 2 + 0.06, -0.08], s: [0.11, 0.09, 0.11], col });
  }
  if (stile === 'medi') {
    out.push({ p: [-0.09, y - 0.09, 0.1], s: [0.09, 0.1, 0.05], col });
    out.push({ p: [-0.09, y - 0.09, -0.1], s: [0.09, 0.1, 0.05], col });
  }
  if (stile === 'fade') out.push({ p: [0, y - 0.05, 0], s: [0.248, 0.06, 0.248], col: '#1A1512' });
  return out;
}

export const Character = forwardRef<THREE.Group, { rt: RuntimeGioco }>(function Character({ rt }, ref) {
  const busto = useRef<THREE.Group>(null);
  const corpo = useRef<THREE.Group>(null);
  const testa = useRef<THREE.Group>(null);
  const avatar = useLugo((s) => s.avatar) as Avatar;

  const colPelle = TINTE_PELLE[avatar.pelle % TINTE_PELLE.length];
  const colCapelli = TINTE_CAPELLI[avatar.capelliTinta % TINTE_CAPELLI.length];
  const colTop = tintaDi('top', avatar.top, avatar.topTinta);
  const colPant = tintaDi('pantaloni', avatar.pantaloni, avatar.pantaloniTinta);
  const colScarpe = tintaDi('scarpe', avatar.scarpe, avatar.scarpeTinta);
  const colCappello = tintaDi('copricapo', avatar.copricapo, avatar.copricapoTinta);
  const conCappello = avatar.copricapo === 'cappellino';
  const conCuffia = avatar.copricapo === 'cuffia';

  // I pezzi rigidi, radunati una volta per look. Cambiano solo quando
  // cambia il guardaroba, non a ogni fotogramma.
  const pezziTesta = useMemo<Pezzo[]>(() => {
    const out: Pezzo[] = [
      { p: [0, Q.testa, 0], s: [0.235, Q.testaAlt, 0.24], col: colPelle },
      // occhi e sopracciglia: bastano quattro pixel per dare uno sguardo
      { p: [0.119, Q.testa + 0.035, 0.06], s: [0.006, 0.035, 0.045], col: '#241C16' },
      { p: [0.119, Q.testa + 0.035, -0.06], s: [0.006, 0.035, 0.045], col: '#241C16' },
      { p: [0.119, Q.testa + 0.075, 0.062], s: [0.006, 0.016, 0.055], col: colCapelli },
      { p: [0.119, Q.testa + 0.075, -0.062], s: [0.006, 0.016, 0.055], col: colCapelli },
    ];
    if (avatar.accessorio === 'occhiali') {
      out.push({ p: [0.124, Q.testa + 0.04, 0], s: [0.012, 0.055, 0.235], col: '#14161C' });
    }
    out.push(...pezziCapelli(avatar.capelli, colCapelli, conCappello || conCuffia));
    if (conCappello) {
      out.push({ p: [0, Q.testa + Q.testaAlt / 2 + 0.04, 0], s: [0.26, 0.12, 0.26], col: colCappello });
      // la visiera sporge davanti e ha spessore: di fronte, senza, si vede
      // solo un filo e il cappellino sembra una cuffia
      out.push({ p: [0.2, Q.testa + Q.testaAlt / 2 - 0.005, 0], s: [0.2, 0.05, 0.25], col: colCappello });
      out.push({ p: [0.2, Q.testa + Q.testaAlt / 2 - 0.032, 0], s: [0.19, 0.012, 0.24], col: '#0E0F13' });
    }
    if (conCuffia) {
      out.push({ p: [0, Q.testa + Q.testaAlt / 2 + 0.025, 0], s: [0.26, 0.13, 0.26], col: colCappello });
      out.push({ p: [0, Q.testa + 0.07, 0], s: [0.265, 0.06, 0.265], col: colCappello });
    }
    return out;
  }, [avatar.accessorio, avatar.capelli, colPelle, colCapelli, colCappello, conCappello, conCuffia]);

  const pezziBusto = useMemo<Pezzo[]>(() => {
    const out: Pezzo[] = [
      { p: [0, Q.anca + 0.07, 0], s: [0.27, 0.16, Q.larghFianchi], col: colPant },
      // torso: spalle più larghe dei fianchi
      { p: [0, (Q.vita + Q.spalla) / 2 + 0.02, 0], s: [Q.profTorso, Q.spalla - Q.vita + 0.1, Q.larghSpalle - 0.06], col: colTop },
      { p: [0, Q.spalla - 0.03, 0], s: [Q.profTorso - 0.01, 0.16, Q.larghSpalle], col: colTop },
    ];
    if (avatar.top === 'giubbotto') {
      out.push({ p: [0.14, Q.spalla - 0.06, 0], s: [0.035, 0.2, Q.larghSpalle - 0.08], col: '#EDE7DA' });
    }
    if (avatar.top === 'tuta') {
      out.push({ p: [0, Q.spalla - 0.16, 0.215], s: [Q.profTorso - 0.02, 0.5, 0.03], col: '#EDE7DA' });
      out.push({ p: [0, Q.spalla - 0.16, -0.215], s: [Q.profTorso - 0.02, 0.5, 0.03], col: '#EDE7DA' });
    }
    // il cappuccio della felpa, calato sulle spalle
    if (avatar.top === 'felpa') {
      out.push({ p: [-0.1, Q.spalla + 0.02, 0], s: [0.13, 0.2, 0.34], col: colTop });
      out.push({ p: [-0.13, Q.spalla - 0.14, 0], s: [0.09, 0.16, 0.3], col: colTop });
    }
    if (avatar.accessorio === 'zaino') {
      out.push({ p: [-0.2, Q.spalla - 0.2, 0], s: [0.13, 0.36, 0.3], col: '#2F3540' });
      out.push({ p: [-0.27, Q.spalla - 0.24, 0], s: [0.03, 0.12, 0.22], col: '#C0392B' });
    }
    if (avatar.accessorio === 'catenina') {
      out.push({ p: [0.11, Q.collo - 0.06, 0], s: [0.05, 0.09, 0.14], col: '#E8C86A' });
    }
    return out;
  }, [avatar.top, avatar.accessorio, colTop, colPant]);

  // lo stemma LC sulla schiena della felpa, come nella key art
  const stemma = useMemo(() => {
    if (avatar.top !== 'felpa' && avatar.top !== 'tuta') return null;
    const c = tessituraStemma(192);
    if (!c) return null;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }, [avatar.top]);

  useFrame(({ clock }) => {
    const v = Math.min(1, rt.vPersona / 2.3);
    const corsa = Math.min(1, Math.max(0, (rt.vPersona - 2.6) / 2.6));
    const t = clock.elapsedTime;

    // in sella non si rimbalza a ogni passo e non si sposta il peso da un
    // piede all'altro: si pende con la bici, tutti e due attorno alla
    // stessa linea a terra (rotation.x positivo = verso destra, come il
    // rollio dell'auto)
    const sella = rt.sella;
    // il corpo intero sale e scende col passo; da fermo respira appena
    if (corpo.current) {
      const rimbalzo = Math.abs(Math.sin(rt.persona.fase)) * 0.045 * v;
      const respiro = (1 - v) * Math.sin(t * 1.5) * 0.008;
      corpo.current.position.y = (rimbalzo + respiro) * (1 - sella);
      // da fermo il peso si sposta piano da un piede all'altro
      corpo.current.rotation.x =
        (1 - v) * Math.sin(t * 0.8) * 0.035 * (1 - sella) + rt.piega * sella;
    }
    // il busto ruota attorno alla VITA, non attorno ai piedi: correndo si
    // sporge in avanti (angolo negativo col modello rivolto a +X)
    if (busto.current) {
      // Il pugno parte dalle anche: senza torsione del busto sembra un
      // braccio che si muove da solo. Il segno è negativo perché con
      // rotazione Y positiva la spalla a −z andrebbe INDIETRO
      // (x' = x cosθ + z sinθ), cioè l'esatto contrario di quel che serve.
      const colpo = avanzamentoPugno();
      // sale e ridiscende lungo il colpo: la torsione accompagna il braccio
      // e si scioglie insieme a lui
      const curvaColpo = Math.sin(colpo * Math.PI);
      // in sella ci si sporge sul manubrio: −0,5 rad di busto, che è più
      // della corsa. Il termine del pugno resta dentro la parte "a piedi"
      // e non si somma alla posa del ciclista, perché in sella un pugno
      // non si tira (il Player lo condiziona a mode === 'piedi')
      const aPiedi = -corsa * 0.26 - v * 0.05 - 0.12 * curvaColpo;
      busto.current.rotation.z = aPiedi * (1 - sella) + -0.5 * sella;
      busto.current.rotation.x = Math.sin(rt.persona.fase) * 0.035 * v * (1 - sella);
      busto.current.rotation.y = -0.26 * curvaColpo;
    }
    // la testa resta più dritta del busto e ondeggia appena; in sella si
    // rialza sulla strada invece di seguire il busto piegato in avanti
    if (testa.current) {
      testa.current.rotation.z = corsa * 0.2 * (1 - sella) + 0.42 * sella;
      testa.current.rotation.y = (1 - v) * Math.sin(t * 0.55) * 0.12;
    }
  });

  return (
    <group ref={ref}>
      <group ref={corpo}>
        <Gamba z={0.115} fase={0} rt={rt} pantaloni={avatar.pantaloni} colPantaloni={colPant} scarpe={avatar.scarpe} colScarpe={colScarpe} />
        <Gamba z={-0.115} fase={Math.PI} rt={rt} pantaloni={avatar.pantaloni} colPantaloni={colPant} scarpe={avatar.scarpe} colScarpe={colScarpe} />

        {/* tutto ciò che sta sopra la vita ruota attorno alla vita */}
        <group position={[0, Q.vita, 0]} ref={busto}>
          <group position={[0, -Q.vita, 0]}>
            {/* bacino, torso, cappuccio, zaino: pezzi che non si muovono
                l'uno rispetto all'altro, quindi una mesh sola */}
            <Fuso pezzi={pezziBusto} />
            {/* lo stemma LC sulla schiena */}
            {stemma && (
              <mesh position={[-0.152, Q.spalla - 0.24, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[0.19, 0.19]} />
                <meshLambertMaterial map={stemma} transparent />
              </mesh>
            )}

            <Braccio z={0.29} fase={Math.PI} rt={rt} top={avatar.top} colTop={colTop} colPelle={colPelle} orologio={avatar.accessorio === 'orologio'} />
            <Braccio z={-0.29} fase={0} rt={rt} top={avatar.top} colTop={colTop} colPelle={colPelle} orologio={false} colpisce />

            {/* collo e testa */}
            <Blocco p={[0, Q.collo + 0.02, 0]} s={[0.115, 0.09, 0.125]} col={colPelle} ombra={false} />
            <group position={[0, Q.testa, 0]} ref={testa}>
              <group position={[0, -Q.testa, 0]}>
                <Fuso pezzi={pezziTesta} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});
