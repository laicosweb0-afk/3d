'use client';

// La macchina delle missioni + il checkpoint visibile. Le missioni si
// concatenano da sole: la prima parte poco dopo il via, al completamento
// (o al fallimento) segue la prossima (o il retry) dopo una pausa.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { missioneById, posTappa, prossimaMissione, MISSIONI } from '@/lib/lugo/missions';
import { runtime, posGiocatore } from '@/lib/lugo/runtime';
import { suonaEvento } from '@/lib/lugo/audio';
import { useLugo } from '@/lib/lugo/store';

const RAGGIO_AUTO = 4;
const RAGGIO_PIEDI = 1.8;
const PAUSA_CATENA = 5;

export function Missioni() {
  const mondo = useMondo();
  const marker = useRef<THREE.Group>(null);
  const anello = useRef<THREE.Mesh>(null);
  const tempo = useRef(0);
  const attesa = useRef(3); // secondi prima della prima missione
  const hintPiedi = useRef(false);

  // hook di verifica
  useEffect(() => {
    const st = useLugo.getState();
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      missioni: MISSIONI.map((m) => m.id),
      avviaMissione: (id: string) => {
        const m = missioneById(id);
        if (!m) return false;
        useLugo.getState().setMissione(m.id, 'attiva', 0);
        tempo.current = m.tempoLimite ?? 0;
        useLugo.getState().setTempoResiduo(m.tempoLimite ?? null);
        useLugo.getState().setAvviso(m.titolo + ' — ' + m.tappe[0].titolo);
        return true;
      },
      denaro: () => useLugo.getState().denaro,
      tappaCorrente: () => {
        const s = useLugo.getState();
        const m = s.missioneId ? missioneById(s.missioneId) : null;
        if (!m || s.statoMissione !== 'attiva') return null;
        return posTappa(mondo, m.tappe[s.tappa]);
      },
      punteggio: () => useLugo.getState().punteggio,
      statoMissione: () => useLugo.getState().statoMissione,
    };
    void st;
  }, [mondo]);

  useFrame((frame, dtRaw) => {
    // stesso tetto del giocatore e degli NPC (0,05): con 0,1 il conto alla
    // rovescia correva al doppio della simulazione su un telefono lento, e
    // una consegna a tempo diventava impossibile
    const dt = Math.min(dtRaw, 0.05);
    const s = useLugo.getState();
    if (s.fase !== 'gioco') return;

    if (s.statoMissione === 'attiva' && s.missioneId) {
      const m = missioneById(s.missioneId)!;
      const t = m.tappe[s.tappa];
      const target = posTappa(mondo, t);
      const g = posGiocatore(s.mode);
      const d = Math.hypot(g.x - target.x, g.z - target.z);
      const raggio = s.mode === 'auto' ? RAGGIO_AUTO : RAGGIO_PIEDI;

      // tappa solo a piedi: se arrivi in auto, l'hint te lo dice
      if (t.aPiedi && s.mode === 'auto' && d < RAGGIO_AUTO * 2.5) {
        if (!hintPiedi.current) {
          hintPiedi.current = true;
          s.setAvviso('Qui si prosegue a piedi: premi E per scendere');
        }
      } else {
        hintPiedi.current = false;
      }

      // `s` è lo snapshot preso a inizio frame: dopo setMissione continua a
      // dire 'attiva', quindi senza questa bandiera il conto alla rovescia
      // qui sotto girava lo stesso e la missione risultava insieme
      // completata e fallita
      let conclusa = false;
      const valida = t.aPiedi ? s.mode === 'piedi' : true;
      if (valida && d < raggio) {
        if (s.tappa + 1 < m.tappe.length) {
          s.setMissione(m.id, 'attiva', s.tappa + 1);
          s.setAvviso(m.tappe[s.tappa + 1].titolo);
          suonaEvento('tappa');
        } else {
          conclusa = true;
          s.setMissione(m.id, 'completata', s.tappa);
          s.addPunti(m.ricompensa);
          // le consegne pagano di più chi arriva prima, mancia compresa
          let euro = m.denaro;
          let extra: string | undefined;
          if (m.bonusVelocita && m.tempoLimite) {
            const frazione = Math.max(0, tempo.current / m.tempoLimite);
            if (frazione > 0.55) euro += 8;
            else if (frazione > 0.3) euro += 4;
            const mancia = frazione > 0.45 ? 3 + ((m.semeMancia ?? 0) % 5) : 0;
            if (mancia > 0) {
              euro += mancia;
              extra = `MANCIA €${mancia}`;
            }
          }
          s.addDenaro(euro);
          // Solo la storia entra nel salvataggio per id: le consegne sono
          // infinite e riempirebbero localStorage. Ma vanno CONTATE, perché
          // il distintivo del rider chiede otto consegne e prima leggeva
          // l'elenco degli id — dove non entrava mai nulla.
          if (m.tipo === 'storia') s.addMissioneFatta(m.id);
          else if (m.tipo === 'consegna') s.contaConsegna();
          s.setEsito({ titolo: m.titolo, denaro: euro, rep: m.ricompensa, extra });
          s.setTempoResiduo(null);
          suonaEvento('successo');
          attesa.current = PAUSA_CATENA;
        }
      }

      // conto alla rovescia
      if (m.tempoLimite && !conclusa && !s.intro) {
        tempo.current -= dt;
        const arrotondato = Math.max(0, Math.ceil(tempo.current));
        if (arrotondato !== s.tempoResiduo) s.setTempoResiduo(arrotondato);
        if (tempo.current <= 0) {
          s.setMissione(m.id, 'fallita', s.tappa);
          s.setAvviso('Tempo scaduto — si riprova tra poco');
          s.setTempoResiduo(null);
          suonaEvento('fallita');
          attesa.current = PAUSA_CATENA;
        }
      }
    } else {
      // catena: idle → prima missione; completata → prossima; fallita →
      // retry per la storia, consegna nuova per le consegne
      attesa.current -= dt;
      if (attesa.current <= 0) {
        const fallitaStoria =
          s.statoMissione === 'fallita' && s.missioneId && missioneById(s.missioneId)?.tipo === 'storia';
        const m = fallitaStoria
          ? missioneById(s.missioneId!)!
          : prossimaMissione(mondo, s.missioneId, s.missioniFatte);
        s.setMissione(m.id, 'attiva', 0);
        tempo.current = m.tempoLimite ?? 0;
        s.setTempoResiduo(m.tempoLimite ?? null);
        s.setIntro({
          etichetta: m.tipo === 'consegna' ? 'CONSEGNA' : 'NUOVA MISSIONE',
          titolo: m.titolo,
          frase: m.frase,
          obiettivo: m.tappe[0].titolo,
        });
        suonaEvento('tappa');
      }
    }

    // marker del checkpoint
    if (marker.current) {
      const attiva = s.statoMissione === 'attiva' && s.missioneId;
      marker.current.visible = Boolean(attiva);
      if (attiva) {
        const m = missioneById(s.missioneId!)!;
        const target = posTappa(mondo, m.tappe[s.tappa]);
        marker.current.position.set(target.x, 0, target.z);
        const pulsa = 1 + Math.sin(frame.clock.elapsedTime * 3.5) * 0.12;
        if (anello.current) anello.current.scale.setScalar(pulsa);
      }
    }
  });

  const matMarker = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#FFC24A',
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const matFascio = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#FFC24A',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    [],
  );

  return (
    <group ref={marker} visible={false}>
      <mesh ref={anello} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, 0]} material={matMarker}>
        <ringGeometry args={[2.6, 3.4, 32]} />
      </mesh>
      <mesh position={[0, 20, 0]} material={matFascio}>
        <cylinderGeometry args={[0.8, 1.6, 40, 12, 1, true]} />
      </mesh>
    </group>
  );
}
