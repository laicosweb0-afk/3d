'use client';

// La messa in scena degli eventi (lib/lugo/eventi.ts): all'ora giusta, nel
// posto giusto, compaiono banchi, palco o file di bici. Tutto instanziato e
// deterministico; quando l'evento finisce le cose spariscono da sole.
// Avvicinandosi, l'HUD annuncia l'evento una volta sola.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco } from '@/lib/lugo/veicoli';
import { rettangoloMinimo } from '@/lib/lugo/gates';
import { eventiAttivi, eventiDiOggi, type EventoMondo } from '@/lib/lugo/eventi';
import { tempo, cieloOra } from '@/lib/lugo/tempo';
import { runtime } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';

interface Pezzo {
  tipo: 'banco' | 'tenda' | 'palco' | 'cassa' | 'bici' | 'luce';
  x: number;
  y: number;
  z: number;
  rot: number;
  sx: number;
  sy: number;
  sz: number;
  colore: string;
}

function lcg(s: number) {
  let v = (s * 2654435761) >>> 0;
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

/**
 * File ordinate attorno a un punto, allineate all'edificio: è così che si
 * mette il mercato, non a caso. Si tengono solo le postazioni libere.
 */
function postiInFile(
  cx: number,
  cz: number,
  ang: number,
  quanti: number,
  libero: (x: number, z: number, r: number) => boolean,
): [number, number][] {
  const ux = Math.cos(ang);
  const uz = Math.sin(ang);
  const vx = -uz;
  const vz = ux;
  const out: [number, number][] = [];
  for (const v of [-11, 11, -22, 22, 0]) {
    for (let u = -24; u <= 24 && out.length < quanti; u += 6.5) {
      const x = cx + ux * u + vx * v;
      const z = cz + uz * u + vz * v;
      if (!libero(x, z, 2.2)) continue;
      out.push([x, z]);
    }
    if (out.length >= quanti) break;
  }
  return out;
}

/**
 * Trova posti liberi attorno a un punto: si prova su anelli concentrici e
 * si tiene solo dove non c'è un edificio. Così un mercato non finisce mai
 * dentro il Pavaglione.
 */
function postiLiberi(
  cx: number,
  cz: number,
  quanti: number,
  libero: (x: number, z: number, r: number) => boolean,
  rnd: () => number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let raggio = 26; raggio <= 120 && out.length < quanti; raggio += 9) {
    const passi = Math.max(10, Math.round((2 * Math.PI * raggio) / 7));
    const giro = rnd() * Math.PI * 2;
    for (let i = 0; i < passi && out.length < quanti; i++) {
      const a = giro + (i / passi) * Math.PI * 2;
      const x = cx + Math.cos(a) * raggio;
      const z = cz + Math.sin(a) * raggio;
      if (!libero(x, z, 2.2)) continue;
      // niente banchi appiccicati fra loro
      if (out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 5.5)) continue;
      out.push([x, z]);
    }
  }
  return out;
}

/** Costruisce gli oggetti di un evento attorno al suo POI, solo dove c'è posto. */
function scena(
  e: EventoMondo,
  cx: number,
  cz: number,
  ang: number,
  libero: (x: number, z: number, r: number) => boolean,
): Pezzo[] {
  const rnd = lcg(e.id.length * 977 + Math.round(cx));
  const out: Pezzo[] = [];
  if (e.tipo === 'mercato' || e.tipo === 'fiera') {
    const tende = e.tipo === 'fiera' ? ['#D8D2C4', '#A34A3E', '#4A6B78'] : ['#D8D2C4', '#8A7A66'];
    const posti = postiInFile(cx, cz, ang, 14, libero);
    if (!posti.length) posti.push(...postiLiberi(cx, cz, 14, libero, rnd));
    posti.forEach(([x, z], i) => {
      const rot = ang;
      out.push({ tipo: 'banco', x, y: 0.45, z, rot, sx: 2.6, sy: 0.9, sz: 1.5, colore: '#8A7A66' });
      out.push({
        tipo: 'tenda', x, y: 2.15, z, rot, sx: 3.0, sy: 0.14, sz: 1.9,
        colore: tende[i % tende.length],
      });
    });
  } else if (e.tipo === 'musica') {
    const posti = postiLiberi(cx, cz, 1, libero, rnd);
    const [px, pz] = posti[0] ?? [cx + 20, cz + 20];
    const rot = Math.atan2(cz - pz, cx - px);
    out.push({ tipo: 'palco', x: px, y: 0.5, z: pz, rot, sx: 8, sy: 1, sz: 5, colore: '#3A3630' });
    const dx = Math.cos(rot + Math.PI / 2);
    const dz = Math.sin(rot + Math.PI / 2);
    for (const l of [-3.2, 3.2]) {
      out.push({
        tipo: 'cassa', x: px + dx * l, y: 1.9, z: pz + dz * l, rot,
        sx: 0.7, sy: 1.8, sz: 0.6, colore: '#1C1C22',
      });
    }
    for (let i = 0; i < 8; i++) {
      const t = (i - 3.5) * 0.95;
      out.push({
        tipo: 'luce', x: px + dx * t, y: 3.6, z: pz + dz * t, rot,
        sx: 0.22, sy: 0.22, sz: 0.22, colore: '#FFD08A',
      });
    }
  } else if (e.tipo === 'luci') {
    // Le luminarie: due festoni incrociati sopra la piazza. Le lampadine
    // stanno in alto, quindi non chiedono spazio a terra — l'unica cosa
    // che conta è che scendano in mezzo come una catenaria vera.
    for (const gira of [0, Math.PI / 2]) {
      const dx = Math.cos(ang + gira);
      const dz = Math.sin(ang + gira);
      const N = 22;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * 2 - 1;
        const sag = (1 - t * t) * 1.6;
        out.push({
          tipo: 'luce',
          x: cx + dx * t * 22,
          y: 6.4 - sag,
          z: cz + dz * t * 22,
          rot: ang,
          sx: 0.2, sy: 0.2, sz: 0.2,
          colore: i % 4 === 0 ? '#FFE6B0' : '#FFC24A',
        });
      }
    }
  } else {
    // raduno di bici: una fila appoggiata, ordinata, dove c'è spazio
    const posti = postiLiberi(cx, cz, 1, libero, rnd);
    const [px, pz] = posti[0] ?? [cx + 20, cz];
    const rot = Math.atan2(cz - pz, cx - px);
    const dx = Math.cos(rot + Math.PI / 2);
    const dz = Math.sin(rot + Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const t = (i - 4.5) * 1.3;
      out.push({
        tipo: 'bici', x: px + dx * t, y: 0.55, z: pz + dz * t, rot: rot + Math.PI / 2,
        sx: 1.25, sy: 0.09, sz: 0.07, colore: ['#2E3540', '#7A2E2E', '#2E5A46'][i % 3],
      });
    }
  }
  return out;
}

export function Eventi() {
  const mondo = useMondo();
  // hook di verifica: quali eventi cadono in una certa data e a una certa
  // ora. Il collaudo lo interroga con date vere (una domenica, un venerdì
  // d'agosto, Natale) e controlla che il calendario risponda giusto.
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    const quando = (giorno?: string) => (giorno ? new Date(giorno + 'T12:00:00') : new Date());
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      eventiOggi: (giorno?: string) => eventiDiOggi(quando(giorno)).map((e) => e.id),
      eventiAllOra: (ora: number, giorno?: string) =>
        eventiAttivi(ora, quando(giorno)).map((e) => e.id),
    };
  }, []);
  const [attivi, setAttivi] = useState<EventoMondo[]>(() => eventiAttivi(tempo.ora));
  const annunciati = useRef<Set<string>>(new Set());
  const acc = useRef(0);
  const luci = useRef<THREE.Group>(null);

  // ogni due secondi si controlla se il cartellone è cambiato
  useFrame((_, dtRaw) => {
    acc.current += Math.min(dtRaw, 0.1);
    if (acc.current < 2) return;
    acc.current = 0;
    const ora = eventiAttivi(tempo.ora);
    const idsOra = ora.map((e) => e.id).join(',');
    setAttivi((prima) => (prima.map((e) => e.id).join(',') === idsOra ? prima : ora));

    // annuncio quando ci arrivi vicino, una volta per evento
    const st = useLugo.getState();
    if (st.fase !== 'gioco') return;
    const rt = runtime.rt;
    if (!rt) return;
    const g = st.mode === 'auto' ? rt.auto : rt.persona;
    for (const e of ora) {
      if (annunciati.current.has(e.id)) continue;
      const p = mondo.poi.get(e.poi);
      if (!p) continue;
      if (Math.hypot(g.x - p.xm, g.z - p.zm) < 70) {
        annunciati.current.add(e.id);
        st.setAvviso(`${e.titolo} — ${e.testo}`);
      }
    }
    // le luci del palco si accendono quando cala la sera
    if (luci.current) {
      const acceso = 0.2 + cieloOra().luci * 2.6;
      luci.current.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
        if (m && m.emissive) m.emissiveIntensity = acceso;
      });
    }
  });

  // gli eventi finiti non lasciano tracce: l'elenco si ricalcola
  useEffect(() => {
    annunciati.current = new Set([...annunciati.current].filter((id) => attivi.some((e) => e.id === id)));
  }, [attivi]);

  const fisica = useMemo(() => infraGioco(mondo).fisica, [mondo]);
  const pezzi = useMemo(() => {
    const libero = (x: number, z: number, r: number) => fisica.cerchioLibero(x, z, r);
    const out: Pezzo[] = [];
    for (const e of attivi) {
      const p = mondo.poi.get(e.poi);
      if (!p) continue;
      // le file seguono l'orientamento dell'edificio del luogo
      const edificio = mondo.buildings.find((b) => b.landmark === e.poi);
      const ang = edificio ? rettangoloMinimo(edificio.fp).angle : 0;
      out.push(...scena(e, p.xm, p.zm, ang, libero));
    }
    return out;
  }, [attivi, mondo, fisica]);

  // hook di verifica: cosa c'è in scena adesso
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      eventi: () => ({ attivi: attivi.map((e) => e.id), pezzi: pezzi.length }),
    };
  }, [attivi, pezzi]);

  if (!pezzi.length) return null;

  return (
    <group ref={luci}>
      {pezzi.map((z, i) => (
        <mesh key={i} position={[z.x, z.y, z.z]} rotation={[0, z.rot, 0]} castShadow={z.tipo !== 'luce'}>
          <boxGeometry args={[z.sx, z.sy, z.sz]} />
          {z.tipo === 'luce' ? (
            <meshLambertMaterial color={z.colore} emissive="#FFD08A" emissiveIntensity={0.6} />
          ) : (
            <meshLambertMaterial color={z.colore} />
          )}
        </mesh>
      ))}
    </group>
  );
}
