'use client';

// Le mesh fuse della città + il terreno di base. Due draw call per tutta
// Lugo: uno per gli edifici estrusi, uno per le superfici piatte.

import { useMemo } from 'react';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { generaCitta } from '@/lib/lugo/citygen';
import { PALETTE } from '@/lib/lugo/palette';

export function CityMeshes({ senzaLandmark = [] }: { senzaLandmark?: string[] }) {
  const mondo = useMondo();

  const { edifici, suolo } = useMemo(() => generaCitta(mondo, senzaLandmark), [mondo, senzaLandmark]);

  // la grana dell'intonaco: texture procedurale (nessun asset), moltiplicata
  // coi vertex colors. Il texel (0,0) resta bianco puro: le superfici senza
  // UV (tetti, strade) campionano lì e non cambiano.
  const intonaco = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(256, 256);
    let seme = 987654321;
    const rnd = () => {
      seme = (seme * 1664525 + 1013904223) >>> 0;
      return seme / 4294967296;
    };
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        // granello fine + colature verticali leggerissime + macchie larghe
        const granello = (rnd() - 0.5) * 14;
        const colatura = Math.sin(x * 0.55 + Math.sin(y * 0.02) * 3) * 3;
        const macchia = Math.sin(x * 0.045) * Math.sin(y * 0.06) * 6;
        const v = Math.max(215, Math.min(255, 243 + granello + colatura + macchia));
        const i = (y * 256 + x) * 4;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = Math.max(210, v - 3);
        img.data[i + 3] = 255;
      }
    }
    img.data[0] = img.data[1] = img.data[2] = 255;
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }, []);

  const matEdifici = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, map: intonaco ?? undefined }),
    [intonaco],
  );

  // il ciottolato delle piazze (come in Piazza dei Martiri): sassi chiari su
  // fuga appena più scura, bordo bianco del tile = le fasce di lastre chiare
  const ciottoli = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#C8C0B2';
    ctx.fillRect(0, 0, 128, 128);
    let seme = 24681357;
    const rnd = () => {
      seme = (seme * 1664525 + 1013904223) >>> 0;
      return seme / 4294967296;
    };
    for (let gy = 0; gy < 12; gy++) {
      for (let gx = 0; gx < 12; gx++) {
        const cx = gx * 10.6 + 5 + (rnd() - 0.5) * 3;
        const cy = gy * 10.6 + 5 + (rnd() - 0.5) * 3;
        const r = 3.6 + rnd() * 1.6;
        const v = 225 + Math.floor(rnd() * 30);
        ctx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * (0.75 + rnd() * 0.3), rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // bordo bianco: le superfici senza UV campionano qui e restano neutre,
    // e sulle piazze diventa la fuga chiara ogni ripetizione
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 128, 1);
    ctx.fillRect(0, 127, 128, 1);
    ctx.fillRect(0, 0, 1, 128);
    ctx.fillRect(127, 0, 1, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }, []);

  const matSuolo = useMemo(
    () => new THREE.MeshLambertMaterial({ vertexColors: true, map: ciottoli ?? undefined }),
    [ciottoli],
  );

  const terreno = useMemo(() => {
    const { minX, minZ, maxX, maxZ } = mondo.bounds;
    const margine = 400;
    return {
      w: maxX - minX + margine * 2,
      d: maxZ - minZ + margine * 2,
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    };
  }, [mondo]);

  return (
    <group>
      <mesh geometry={edifici} material={matEdifici} castShadow receiveShadow />
      <mesh geometry={suolo} material={matSuolo} receiveShadow />
      <mesh position={[terreno.x, 0, terreno.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[terreno.w, terreno.d]} />
        <meshLambertMaterial color={PALETTE.terreno} />
      </mesh>
    </group>
  );
}
