'use client';

// Le insegne delle botteghe vere di Lugo. Questo file non decide più niente:
// il muro giusto lo dà botteghe.ts, i colori e l'atlante li dà
// insegneAtlante.ts, i simboli li dà pittogrammi.ts. Qui si monta la
// geometria, e basta.
//
// Prima una bottega era una striscia scura larga 3,4 metri con sopra ventisei
// pixel di testo, appesa a quota fissa: da venti metri il nome era già
// illeggibile, e da lontano non si distingueva una farmacia da una merceria.
// Adesso ogni bottega ha tre cose che si leggono a tre distanze diverse:
//   • la FASCIA col nome, sulla cimasa vera del suo muro — fino a ~30 m;
//   • il TENDONE a righe, che è il secondo segnale di una via italiana;
//   • l'INSEGNA A BANDIERA col simbolo di mestiere, perpendicolare al muro,
//     che si legge camminando lungo la via e resta una macchia di colore
//     riconoscibile anche a cento metri.
// Tutto dentro un solo atlante e due sole chiamate di disegno.

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMondo, type MondoLugo } from '@/lib/lugo/loadMap';
import { logoAutorizzato, registroAttivita, type CategoriaAttivita } from '@/lib/lugo/attivita';
import { caratteriCitta } from '@/lib/lugo/carattere';
import { frontiBotteghe, type FronteBottega } from '@/lib/lugo/botteghe';
import { pittogrammaDi, PITTOGRAMMI_NON_TINTI } from '@/lib/lugo/pittogrammi';
import {
  costruisciAtlante,
  identitaBottega,
  MISURE,
  type Atlante,
  type DatiBottega,
} from '@/lib/lugo/insegneAtlante';
import { useLugo } from '@/lib/lugo/store';

const FERRO = new THREE.Color('#3A3A38');
const BIANCO = new THREE.Color('#FFFFFF');
const TINTA_MURO_ORFANO = new THREE.Color('#E3C878');

interface DatiInsegne {
  fronti: FronteBottega[];
  botteghe: DatiBottega[];
  atlante: Atlante;
  geo: THREE.BufferGeometry;
}

/**
 * L'atlante pesa parecchi megabyte di canvas e va costruito UNA volta. Il
 * `useMemo` non basta: questo componente si sospende con `use()` e React
 * butta via il tentativo sospeso, `useMemo` compreso. La cache per mondo è
 * lo stesso rimedio già usato da veicoli.ts, attivita.ts e carattere.ts.
 */
const cacheInsegne = new WeakMap<MondoLugo, DatiInsegne | null>();

/** Un quadrilatero: quattro angoli in senso antiorario visti dalla faccia. */
function quad(
  pos: number[],
  uv: number[],
  col: number[],
  idx: number[],
  a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3,
  u0: number, v0: number, u1: number, v1: number,
  tinta: THREE.Color,
) {
  const base = pos.length / 3;
  for (const p of [a, b, c, d]) pos.push(p.x, p.y, p.z);
  uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
  for (let i = 0; i < 4; i++) col.push(tinta.r, tinta.g, tinta.b);
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function costruisciInsegne(mondo: MondoLugo, ridotto: boolean): DatiInsegne | null {
  const gia = cacheInsegne.get(mondo);
  if (gia !== undefined) return gia;
  const fatto = (() => {
    if (!mondo.negozi.length || typeof document === 'undefined') return null;
    const fronti = frontiBotteghe(mondo);
    if (!fronti.length) return null;
    const caratteri = caratteriCitta(mondo);
    const registro = registroAttivita(mondo);

    // Si passa per il registro e non per schedaDi(): il registro applica già
    // la guardia sugli omonimi, e senza quella due filiali con lo stesso
    // nome si prenderebbero tutte e due l'autorizzazione di una sola.
    const botteghe: DatiBottega[] = fronti.map((f) => {
      const neg = mondo.negozi[f.negozio];
      const att = registro[f.negozio];
      const k = f.edificio ? caratteri.get(f.edificio) : undefined;
      const facciata = k ? new THREE.Color(k.tinta) : TINTA_MURO_ORFANO;
      const categoria = (att?.categoria ?? 'servizi') as CategoriaAttivita;
      const nome = att?.nome ?? neg?.nome ?? 'Bottega';
      return {
        nome,
        categoria,
        pittogramma: pittogrammaDi(neg?.categoria ?? categoria, neg?.osm),
        identita: identitaBottega(nome, categoria, facciata, att?.insegna),
        larghezza: f.larghezza,
        logo: att ? logoAutorizzato(att) : null,
      };
    });

    const atlante = costruisciAtlante(botteghe, ridotto);

    const pos: number[] = [];
    const uv: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const bianco = atlante.uvBianco();

    fronti.forEach((f, i) => {
      const b = botteghe[i];
      // la tangente si ricava dalla NORMALE del muro: è quello che tiene il
      // testo dal verso giusto. Il bug delle insegne allo specchio è già
      // stato pagato una volta, non lo si ripaga.
      const tx = f.nz;
      const tz = -f.nx;
      const hw = Math.min(f.larghezza - 0.35, 6.4) / 2;
      if (hw < 0.4) return;
      const ox = f.nx * MISURE.offsetFascia;
      const oz = f.nz * MISURE.offsetFascia;
      const y0 = f.yCimasa + 0.02;
      const y1 = y0 + MISURE.bandaH;

      // 1. la fascia col nome, sulla cimasa vera
      const ub = atlante.uvBanda(i);
      quad(
        pos, uv, col, idx,
        P(f.x - tx * hw + ox, y0, f.z - tz * hw + oz),
        P(f.x + tx * hw + ox, y0, f.z + tz * hw + oz),
        P(f.x + tx * hw + ox, y1, f.z + tz * hw + oz),
        P(f.x - tx * hw + ox, y1, f.z - tz * hw + oz),
        ub.u0, ub.v0, ub.u1, ub.v1, BIANCO,
      );

      // 2. l'insegna a bandiera, perpendicolare al muro
      const yB = Math.min(f.yCimasa + 1.52, f.hTerra + 1.30);
      const centro = MISURE.sportoBandiera - MISURE.bandieraW / 2;
      const cxB = f.x + f.nx * centro;
      const czB = f.z + f.nz * centro;
      const us = atlante.uvSimbolo(b.pittogramma);
      const tinta = PITTOGRAMMI_NON_TINTI.has(b.pittogramma) ? BIANCO : b.identita.campo;

      // le due facce si scrivono a mano con le UV scambiate: chi cammina nel
      // verso opposto non deve vedere le forbici allo specchio
      for (const s of [1, -1]) {
        const dx = f.nx;
        const dz = f.nz;
        const sx = tx * s * 0.03;
        const sz = tz * s * 0.03;
        // la piastra chiara, che stacca il pannello da una facciata dello
        // stesso tono: è la ragione per cui i cartelli stradali hanno il
        // bordo bianco
        const hp = MISURE.piastraW / 2;
        const vp = MISURE.piastraH / 2;
        const uA = s > 0 ? bianco.u0 : bianco.u1;
        const uB2 = s > 0 ? bianco.u1 : bianco.u0;
        quad(
          pos, uv, col, idx,
          P(cxB - dx * hp + sx, yB - vp, czB - dz * hp + sz),
          P(cxB + dx * hp + sx, yB - vp, czB + dz * hp + sz),
          P(cxB + dx * hp + sx, yB + vp, czB + dz * hp + sz),
          P(cxB - dx * hp + sx, yB + vp, czB - dz * hp + sz),
          uA, bianco.v0, uB2, bianco.v1, b.identita.cornice,
        );
        const hq = MISURE.bandieraW / 2;
        const vq = MISURE.bandieraH / 2;
        const q0 = s > 0 ? us.u0 : us.u1;
        const q1 = s > 0 ? us.u1 : us.u0;
        const e = s * 0.05;
        quad(
          pos, uv, col, idx,
          P(cxB - dx * hq + tx * e, yB - vq, czB - dz * hq + tz * e),
          P(cxB + dx * hq + tx * e, yB - vq, czB + dz * hq + tz * e),
          P(cxB + dx * hq + tx * e, yB + vq, czB + dz * hq + tz * e),
          P(cxB - dx * hq + tx * e, yB + vq, czB - dz * hq + tz * e),
          q0, us.v0, q1, us.v1, tinta,
        );
      }

      // 3. la mensola di ferro che regge la bandiera
      const braccio = MISURE.sportoBandiera;
      for (const s of [1, -1]) {
        const e = s * 0.02;
        quad(
          pos, uv, col, idx,
          P(f.x + tx * e, yB + MISURE.piastraH / 2, f.z + tz * e),
          P(f.x + f.nx * braccio + tx * e, yB + MISURE.piastraH / 2, f.z + f.nz * braccio + tz * e),
          P(f.x + f.nx * braccio + tx * e, yB + MISURE.piastraH / 2 + 0.06, f.z + f.nz * braccio + tz * e),
          P(f.x + tx * e, yB + MISURE.piastraH / 2 + 0.06, f.z + tz * e),
          bianco.u0, bianco.v0, bianco.u1, bianco.v1, FERRO,
        );
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    return { fronti, botteghe, atlante, geo };
  })();
  cacheInsegne.set(mondo, fatto);
  return fatto;
}

/** Il tendone: falda inclinata, due fianchi, e la mantovana che pende. */
function geometriaTenda(atlante: Atlante): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const righe = atlante.uvRighe();
  const S = MISURE.sportoTenda;
  const C = MISURE.tendaCaduta;
  const M = MISURE.mantovanaH;
  // falda: dal muro (z=0, y=0) all'esterno (z=S, y=-C)
  const push = (
    a: [number, number, number], b: [number, number, number],
    c: [number, number, number], d: [number, number, number],
    u0: number, v0: number, u1: number, v1: number,
  ) => {
    const base = pos.length / 3;
    for (const p of [a, b, c, d]) pos.push(p[0], p[1], p[2]);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  // L'ordine dei vertici NON è un dettaglio: la normale che ne esce decide
  // da che parte il sole illumina la tela. Col giro sbagliato la normale
  // guarda in giù e il tendone resta nero anche a mezzogiorno.
  push([-0.5, 0, 0], [-0.5, -C, S], [0.5, -C, S], [0.5, 0, 0], righe.u0, righe.v1, righe.u1, righe.v0);
  // mantovana: pende dall'orlo esterno, e guarda la strada
  push([-0.5, -C, S], [-0.5, -C - M, S], [0.5, -C - M, S], [0.5, -C, S], righe.u0, righe.v0, righe.u1, righe.v1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function Insegne() {
  const mondo = useMondo();
  const qualita = useLugo((s) => s.qualita);
  const dati = useMemo(() => costruisciInsegne(mondo, qualita === 'bassa'), [mondo, qualita]);
  const tende = useRef<THREE.InstancedMesh>(null);
  const geoTenda = useMemo(() => (dati ? geometriaTenda(dati.atlante) : null), [dati]);

  // i loghi autorizzati entrano DENTRO l'atlante, dopo: nessuna texture in
  // più, e se un file manca resta il pittogramma al suo posto
  useEffect(() => {
    if (!dati) return;
    void dati.atlante.applicaLoghi(dati.botteghe);
  }, [dati]);

  // hook di collaudo: quante insegne, dove, e soprattutto quanti loghi sono
  // finiti a schermo — che deve essere zero finché nessuno ha autorizzato
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      insegne: () => {
        if (!dati) return null;
        // due fronti sullo stesso lato dello stesso edificio non devono
        // accavallarsi: è quello che succedeva con tre botteghe sotto lo
        // stesso portico, larghe 3,4 m fisse e centrate sul nodo
        const perLato = new Map<object, Map<number, [number, number][]>>();
        let sovrapposte = 0;
        for (const f of dati.fronti) {
          if (!f.edificio || f.lato < 0) continue;
          let lati = perLato.get(f.edificio);
          if (!lati) {
            lati = new Map();
            perLato.set(f.edificio, lati);
          }
          const g = lati.get(f.lato) ?? [];
          for (const [a, b] of g) if (f.t0 < b - 1e-6 && a < f.t1 - 1e-6) sovrapposte++;
          g.push([f.t0, f.t1]);
          lati.set(f.lato, g);
        }
        return {
          cartelli: dati.fronti.length,
          bandiere: dati.fronti.filter((f) => f.larghezza >= 1.15).length,
          senzaMuro: dati.fronti.filter((f) => !f.edificio).length,
          sovrapposte,
          loghi: dati.botteghe.filter((b) => b.logo).length,
          simboli: dati.botteghe.reduce<Record<string, number>>((acc, b) => {
            acc[b.pittogramma] = (acc[b.pittogramma] ?? 0) + 1;
            return acc;
          }, {}),
          atlante: { w: dati.atlante.lato, h: dati.atlante.lato, slot: dati.atlante.slot },
        };
      },
      // dove sta una bottega e da che parte guarda la sua insegna: serve
      // alle cartoline del collaudo
      bottega: (i = 0) => {
        if (!dati || !dati.fronti.length) return null;
        const f = dati.fronti[i % dati.fronti.length];
        const b = dati.botteghe[i % dati.botteghe.length];
        return {
          nome: b.nome,
          simbolo: b.pittogramma,
          x: f.x, z: f.z, nx: f.nx, nz: f.nz,
          y: f.yCimasa,
          larghezza: f.larghezza,
        };
      },
    };
  }, [dati]);

  useLayoutEffect(() => {
    if (!dati || !tende.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    dati.fronti.forEach((f, i) => {
      const larga = Math.max(1.2, Math.min(f.larghezza - 0.5, 4.6));
      // la tenda guarda fuori dal muro: il suo +Z locale va sulla normale
      e.set(0, Math.atan2(f.nx, f.nz), 0, 'YXZ');
      q.setFromEuler(e);
      s.set(larga, 1, 1);
      p.set(f.x + f.nx * 0.06, f.yCimasa - 0.06, f.z + f.nz * 0.06);
      m.compose(p, q, s);
      tende.current!.setMatrixAt(i, m);
      tende.current!.setColorAt(i, dati.botteghe[i].identita.tenda);
    });
    tende.current.count = dati.fronti.length;
    tende.current.instanceMatrix.needsUpdate = true;
    if (tende.current.instanceColor) tende.current.instanceColor.needsUpdate = true;
  }, [dati, geoTenda]);

  if (!dati || !geoTenda) return null;

  return (
    <group>
      {/* Tutte le insegne di Lugo, fasce e bandiere comprese, in una sola
          chiamata di disegno. Il materiale è "basic" di proposito: un'insegna
          commerciale è illuminata, e a piena luminosità si legge di notte
          come di giorno senza costare un lume. */}
      <mesh geometry={dati.geo} frustumCulled={false}>
        <meshBasicMaterial map={dati.atlante.tex} vertexColors side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh
        ref={tende}
        args={[geoTenda, undefined, Math.max(1, dati.fronti.length)]}
        frustumCulled={false}
        castShadow
      >
        {/* niente vertexColors: il colore di ogni tenda arriva da
            setColorAt, e chiedere anche gli attributi di vertice — che
            questa geometria non ha — lasciava tutti i tendoni neri */}
        <meshLambertMaterial map={dati.atlante.tex} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
