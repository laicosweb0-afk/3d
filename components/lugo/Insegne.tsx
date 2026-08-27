'use client';

// Le insegne delle botteghe vere di Lugo (nomi da OpenStreetMap): un unico
// atlas CanvasTexture con tutti i nomi, un'unica mesh coi cartelli
// agganciati al muro più vicino, e le tende da sole instanziate sotto.

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMondo, type MondoLugo } from '@/lib/lugo/loadMap';

const TENDE = ['#8A3A30', '#3E6248', '#B89B5E', '#3E5068'];

interface Cartello {
  x: number;
  z: number;
  nx: number;
  nz: number;
  /** Direzione del muro (unità). */
  ex: number;
  ez: number;
  riga: number;
}

function trovaMuri(mondo: MondoLugo): Cartello[] {
  const out: Cartello[] = [];
  for (const negozio of mondo.negozi) {
    let best: Cartello | null = null;
    let bestD = 9;
    for (const b of mondo.buildings) {
      const c = b.collider;
      if (
        negozio.x < c.minX - 10 || negozio.x > c.maxX + 10 ||
        negozio.z < c.minZ - 10 || negozio.z > c.maxZ + 10
      ) {
        continue;
      }
      const fp = b.fp;
      const n = fp.length / 2;
      let cx = 0, cz = 0;
      for (let i = 0; i < n; i++) {
        cx += fp[i * 2];
        cz += fp[i * 2 + 1];
      }
      cx /= n;
      cz /= n;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x1 = fp[i * 2], z1 = fp[i * 2 + 1];
        const x2 = fp[j * 2], z2 = fp[j * 2 + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const L2 = dx * dx + dz * dz;
        if (L2 < 16) continue;
        const t = Math.max(0.12, Math.min(0.88, ((negozio.x - x1) * dx + (negozio.z - z1) * dz) / L2));
        const qx = x1 + dx * t;
        const qz = z1 + dz * t;
        const d = Math.hypot(negozio.x - qx, negozio.z - qz);
        if (d >= bestD) continue;
        const L = Math.sqrt(L2);
        let nx = dz / L;
        let nz = -dx / L;
        if (nx * (qx - cx) + nz * (qz - cz) < 0) {
          nx = -nx;
          nz = -nz;
        }
        bestD = d;
        best = { x: qx, z: qz, nx, nz, ex: dx / L, ez: dz / L, riga: 0 };
      }
    }
    if (best) {
      best.riga = out.length;
      out.push(best);
    }
  }
  return out;
}

export function Insegne() {
  const mondo = useMondo();

  const dati = useMemo(() => {
    if (!mondo.negozi.length || typeof document === 'undefined') return null;
    const cartelli = trovaMuri(mondo);
    if (!cartelli.length) return null;

    // atlas dei nomi: una riga per insegna, su più colonne se sono tante
    const RIGA = 44;
    const colonne = Math.max(1, Math.ceil((cartelli.length * RIGA) / 8192));
    const righePerCol = Math.ceil(cartelli.length / colonne);
    const canvas = document.createElement('canvas');
    canvas.width = 512 * colonne;
    canvas.height = Math.min(8192, Math.max(64, 2 ** Math.ceil(Math.log2(righePerCol * RIGA))));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2A2430';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    cartelli.forEach((c, i) => {
      const nome = mondo.negozi[i]?.nome ?? '';
      const col = Math.floor(i / righePerCol);
      const riga = i % righePerCol;
      ctx.fillStyle = '#1E1A28';
      ctx.fillRect(col * 512, riga * RIGA + 2, 512, RIGA - 4);
      ctx.fillStyle = '#F0E6CE';
      ctx.font = 'bold 26px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(nome.toUpperCase().slice(0, 24), col * 512 + 256, riga * RIGA + RIGA / 2);
    });
    const atlas = new THREE.CanvasTexture(canvas);
    atlas.anisotropy = 4;

    // una sola geometria con tutti i cartelli
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    cartelli.forEach((c, i) => {
      const cxp = c.x + c.nx * 0.09;
      const czp = c.z + c.nz * 0.09;
      const hx = c.ex * 1.7;
      const hz = c.ez * 1.7;
      const y0 = 2.75;
      const y1 = 3.3;
      const base = pos.length / 3;
      pos.push(
        cxp - hx, y0, czp - hz,
        cxp + hx, y0, czp + hz,
        cxp + hx, y1, czp + hz,
        cxp - hx, y1, czp - hz,
      );
      const col = Math.floor(i / righePerCol);
      const riga = i % righePerCol;
      const u0 = col / colonne;
      const u1 = (col + 1) / colonne;
      const v0 = 1 - ((riga + 1) * RIGA) / canvas.height;
      const v1 = 1 - (riga * RIGA) / canvas.height;
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    return { cartelli, atlas, geo };
  }, [mondo]);

  const tende = useRef<THREE.InstancedMesh>(null);
  const vetrine = useRef<THREE.InstancedMesh>(null);
  const porte = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!dati || !tende.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    const uno = new THREE.Vector3(1, 1, 1);
    dati.cartelli.forEach((c, i) => {
      const angolo = Math.atan2(c.ez, c.ex);
      e.set(-0.45, -angolo, 0, 'YXZ');
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(c.x + c.nx * 0.55, 2.5, c.z + c.nz * 0.55), q, uno);
      tende.current!.setMatrixAt(i, m);
      tende.current!.setColorAt(i, col.set(TENDE[i % TENDE.length]));
      // vetrina e porta del negozio, sotto l'insegna
      e.set(0, -angolo, 0, 'YXZ');
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(c.x + c.nx * 0.07 - c.ex * 0.5, 1.1, c.z + c.nz * 0.07 - c.ez * 0.5), q, uno);
      vetrine.current?.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(c.x + c.nx * 0.07 + c.ex * 1.15, 1.1, c.z + c.nz * 0.07 + c.ez * 1.15), q, uno);
      porte.current?.setMatrixAt(i, m);
    });
    for (const ref of [tende, vetrine, porte]) {
      if (ref.current) {
        ref.current.count = dati.cartelli.length;
        ref.current.instanceMatrix.needsUpdate = true;
        if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      }
    }
  }, [dati]);

  // le insegne di categoria a bandiera: la T dei tabacchi, la croce verde
  const targaT = useMemo(
    () => (typeof document !== 'undefined' ? usaTargaT() : null),
    [],
  );

  if (!dati) return null;

  return (
    <group>
      <mesh geometry={dati.geo}>
        <meshBasicMaterial map={dati.atlas} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={tende} args={[undefined, undefined, Math.max(1, dati.cartelli.length)]} frustumCulled={false}>
        <boxGeometry args={[3.0, 0.05, 1.0]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={vetrine} args={[undefined, undefined, Math.max(1, dati.cartelli.length)]} frustumCulled={false}>
        <boxGeometry args={[1.9, 2.0, 0.06]} />
        <meshLambertMaterial color="#27313E" emissive="#4E4230" emissiveIntensity={0.35} />
      </instancedMesh>
      <instancedMesh ref={porte} args={[undefined, undefined, Math.max(1, dati.cartelli.length)]} frustumCulled={false}>
        <boxGeometry args={[0.95, 2.2, 0.06]} />
        <meshLambertMaterial color="#2A1E14" />
      </instancedMesh>

      {dati.cartelli.map((c, i) => {
        const cat = mondo.negozi[i]?.categoria;
        if (cat === 'tabacchi' && targaT) {
          return (
            <mesh
              key={'t' + i}
              position={[c.x + c.nx * 0.55, 3.7, c.z + c.nz * 0.55]}
              rotation={[0, Math.atan2(c.ex, c.ez), 0]}
            >
              <planeGeometry args={[0.6, 0.7]} />
              <meshBasicMaterial map={targaT} side={THREE.DoubleSide} />
            </mesh>
          );
        }
        if (cat === 'farmacia') {
          return (
            <group
              key={'f' + i}
              position={[c.x + c.nx * 0.55, 3.7, c.z + c.nz * 0.55]}
              rotation={[0, Math.atan2(c.ex, c.ez), 0]}
            >
              <mesh>
                <boxGeometry args={[0.75, 0.24, 0.06]} />
                <meshLambertMaterial color="#1E8A46" emissive="#2ECC6E" emissiveIntensity={1.4} />
              </mesh>
              <mesh>
                <boxGeometry args={[0.24, 0.75, 0.06]} />
                <meshLambertMaterial color="#1E8A46" emissive="#2ECC6E" emissiveIntensity={1.4} />
              </mesh>
            </group>
          );
        }
        return null;
      })}
    </group>
  );
}

/** La targa dei tabacchi: T bianca in campo nero, come dal vivo. */
function usaTargaT(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#14161C';
  ctx.fillRect(0, 0, 96, 112);
  ctx.strokeStyle = '#E8E2D2';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, 86, 102);
  ctx.fillStyle = '#F0EADA';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', 48, 58);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}
