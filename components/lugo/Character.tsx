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
    anca.current.rotation.z = Math.sin(rt.persona.fase + fase) * ampiezza;
    if (ginocchio.current) {
      // il ginocchio va all'indietro, verso il tallone: angolo NEGATIVO
      const piega = Math.max(0, -Math.sin(rt.persona.fase + fase - 0.5));
      ginocchio.current.rotation.z = -piega * (0.7 + corsa * 0.6) * v;
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

function Braccio({
  z,
  fase,
  rt,
  top,
  colTop,
  colPelle,
  orologio,
}: {
  z: number;
  fase: number;
  rt: RuntimeGioco;
  top: string;
  colTop: string;
  colPelle: string;
  orologio: boolean;
}) {
  const spalla = useRef<THREE.Group>(null);
  const gomito = useRef<THREE.Group>(null);
  const manicaCorta = top === 'tshirt';

  useFrame(() => {
    if (!spalla.current) return;
    const v = Math.min(1, rt.vPersona / 2.3);
    const corsa = Math.min(1, Math.max(0, (rt.vPersona - 2.6) / 2.6));
    spalla.current.rotation.z = Math.sin(rt.persona.fase + fase) * (0.42 + corsa * 0.34) * v;
    // in corsa il gomito resta piegato, da vero podista; il braccio si
    // piega all'indietro, quindi negativo
    if (gomito.current) gomito.current.rotation.z = -(0.14 + corsa * 1.05) - (1 - v) * 0.06;
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

function Capelli({ stile, col, sottoCappello }: { stile: string; col: string; sottoCappello: boolean }) {
  const y = Q.testa;
  const h = Q.testaAlt;
  if (stile === 'rasato') {
    return <Blocco p={[0, y + h * 0.34, 0]} s={[0.245, 0.05, 0.245]} col={col} ombra={false} />;
  }
  // sotto il cappellino resta solo la nuca e le basette
  if (sottoCappello) {
    return (
      <>
        <Blocco p={[-0.115, y + 0.01, 0]} s={[0.05, 0.19, 0.235]} col={col} ombra={false} />
        <Blocco p={[0, y - 0.02, 0.115]} s={[0.2, 0.14, 0.05]} col={col} ombra={false} />
        <Blocco p={[0, y - 0.02, -0.115]} s={[0.2, 0.14, 0.05]} col={col} ombra={false} />
      </>
    );
  }
  const alto = stile === 'medi' ? 0.13 : stile === 'ricci' ? 0.12 : 0.085;
  return (
    <>
      <Blocco p={[0, y + h / 2 - alto / 2 + 0.02, 0]} s={[0.25, alto, 0.25]} col={col} ombra={false} />
      <Blocco p={[-0.115, y + 0.02, 0]} s={[0.045, 0.2, 0.24]} col={col} ombra={false} />
      {stile === 'crop' && <Blocco p={[0.115, y + h / 2 - 0.01, 0]} s={[0.06, 0.07, 0.22]} col={col} ombra={false} />}
      {stile === 'ricci' && (
        <>
          <Blocco p={[0.06, y + h / 2 + 0.05, 0.09]} s={[0.1, 0.09, 0.1]} col={col} ombra={false} />
          <Blocco p={[-0.02, y + h / 2 + 0.06, -0.08]} s={[0.11, 0.09, 0.11]} col={col} ombra={false} />
        </>
      )}
      {stile === 'medi' && (
        <>
          <Blocco p={[-0.09, y - 0.09, 0.1]} s={[0.09, 0.1, 0.05]} col={col} ombra={false} />
          <Blocco p={[-0.09, y - 0.09, -0.1]} s={[0.09, 0.1, 0.05]} col={col} ombra={false} />
        </>
      )}
      {stile === 'fade' && <Blocco p={[0, y - 0.05, 0]} s={[0.248, 0.06, 0.248]} col="#1A1512" ombra={false} />}
    </>
  );
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

    // il corpo intero sale e scende col passo; da fermo respira appena
    if (corpo.current) {
      const rimbalzo = Math.abs(Math.sin(rt.persona.fase)) * 0.045 * v;
      const respiro = (1 - v) * Math.sin(t * 1.5) * 0.008;
      corpo.current.position.y = rimbalzo + respiro;
      // da fermo il peso si sposta piano da un piede all'altro
      corpo.current.rotation.x = (1 - v) * Math.sin(t * 0.8) * 0.035;
    }
    // il busto ruota attorno alla VITA, non attorno ai piedi: correndo si
    // sporge in avanti (angolo negativo col modello rivolto a +X)
    if (busto.current) {
      busto.current.rotation.z = -corsa * 0.26 - v * 0.05;
      busto.current.rotation.x = Math.sin(rt.persona.fase) * 0.035 * v;
    }
    // la testa resta più dritta del busto e ondeggia appena
    if (testa.current) {
      testa.current.rotation.z = corsa * 0.2;
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
            {/* bacino */}
            <Blocco p={[0, Q.anca + 0.07, 0]} s={[0.27, 0.16, Q.larghFianchi]} col={colPant} />
            {/* torso: spalle più larghe dei fianchi */}
            <Blocco p={[0, (Q.vita + Q.spalla) / 2 + 0.02, 0]} s={[Q.profTorso, Q.spalla - Q.vita + 0.1, Q.larghSpalle - 0.06]} col={colTop} />
            <Blocco p={[0, Q.spalla - 0.03, 0]} s={[Q.profTorso - 0.01, 0.16, Q.larghSpalle]} col={colTop} />
            {avatar.top === 'giubbotto' && (
              <Blocco p={[0.14, Q.spalla - 0.06, 0]} s={[0.035, 0.2, Q.larghSpalle - 0.08]} col="#EDE7DA" ombra={false} />
            )}
            {avatar.top === 'tuta' && (
              <>
                <Blocco p={[0, Q.spalla - 0.16, 0.215]} s={[Q.profTorso - 0.02, 0.5, 0.03]} col="#EDE7DA" ombra={false} />
                <Blocco p={[0, Q.spalla - 0.16, -0.215]} s={[Q.profTorso - 0.02, 0.5, 0.03]} col="#EDE7DA" ombra={false} />
              </>
            )}
            {/* il cappuccio della felpa, calato sulle spalle */}
            {avatar.top === 'felpa' && (
              <>
                <Blocco p={[-0.1, Q.spalla + 0.02, 0]} s={[0.13, 0.2, 0.34]} col={colTop} />
                <Blocco p={[-0.13, Q.spalla - 0.14, 0]} s={[0.09, 0.16, 0.3]} col={colTop} ombra={false} />
              </>
            )}
            {/* lo stemma LC sulla schiena */}
            {stemma && (
              <mesh position={[-0.152, Q.spalla - 0.24, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[0.19, 0.19]} />
                <meshLambertMaterial map={stemma} transparent />
              </mesh>
            )}
            {avatar.accessorio === 'zaino' && (
              <>
                <Blocco p={[-0.2, Q.spalla - 0.2, 0]} s={[0.13, 0.36, 0.3]} col="#2F3540" />
                <Blocco p={[-0.27, Q.spalla - 0.24, 0]} s={[0.03, 0.12, 0.22]} col="#C0392B" ombra={false} />
              </>
            )}
            {avatar.accessorio === 'catenina' && (
              <Blocco p={[0.11, Q.collo - 0.06, 0]} s={[0.05, 0.09, 0.14]} col="#E8C86A" ombra={false} />
            )}

            <Braccio z={0.29} fase={Math.PI} rt={rt} top={avatar.top} colTop={colTop} colPelle={colPelle} orologio={avatar.accessorio === 'orologio'} />
            <Braccio z={-0.29} fase={0} rt={rt} top={avatar.top} colTop={colTop} colPelle={colPelle} orologio={false} />

            {/* collo e testa */}
            <Blocco p={[0, Q.collo + 0.02, 0]} s={[0.115, 0.09, 0.125]} col={colPelle} ombra={false} />
            <group position={[0, Q.testa, 0]} ref={testa}>
              <group position={[0, -Q.testa, 0]}>
                <Blocco p={[0, Q.testa, 0]} s={[0.235, Q.testaAlt, 0.24]} col={colPelle} />
                {/* occhi e sopracciglia: bastano quattro pixel per dare uno sguardo */}
                <Blocco p={[0.119, Q.testa + 0.035, 0.06]} s={[0.006, 0.035, 0.045]} col="#241C16" ombra={false} />
                <Blocco p={[0.119, Q.testa + 0.035, -0.06]} s={[0.006, 0.035, 0.045]} col="#241C16" ombra={false} />
                <Blocco p={[0.119, Q.testa + 0.075, 0.062]} s={[0.006, 0.016, 0.055]} col={colCapelli} ombra={false} />
                <Blocco p={[0.119, Q.testa + 0.075, -0.062]} s={[0.006, 0.016, 0.055]} col={colCapelli} ombra={false} />
                {avatar.accessorio === 'occhiali' && (
                  <Blocco p={[0.124, Q.testa + 0.04, 0]} s={[0.012, 0.055, 0.235]} col="#14161C" ombra={false} />
                )}
                <Capelli stile={avatar.capelli} col={colCapelli} sottoCappello={conCappello || conCuffia} />
                {conCappello && (
                  <>
                    <Blocco p={[0, Q.testa + Q.testaAlt / 2 + 0.04, 0]} s={[0.26, 0.12, 0.26]} col={colCappello} />
                    {/* la visiera: sporge davanti e ha spessore, altrimenti
                        di fronte si vede solo un filo e il cappellino
                        sembra una cuffia */}
                    <Blocco p={[0.2, Q.testa + Q.testaAlt / 2 - 0.005, 0]} s={[0.2, 0.05, 0.25]} col={colCappello} />
                    <Blocco p={[0.2, Q.testa + Q.testaAlt / 2 - 0.032, 0]} s={[0.19, 0.012, 0.24]} col="#0E0F13" ombra={false} />
                  </>
                )}
                {conCuffia && (
                  <>
                    <Blocco p={[0, Q.testa + Q.testaAlt / 2 + 0.025, 0]} s={[0.26, 0.13, 0.26]} col={colCappello} />
                    <Blocco p={[0, Q.testa + 0.07, 0]} s={[0.265, 0.06, 0.265]} col={colCappello} ombra={false} />
                  </>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});
