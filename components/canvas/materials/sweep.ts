// La "lama di trasformazione" (Concept S04): un piano in world-space che
// mescola lo stato maquette (clay) e lo stato reale di ogni materiale —
// colore, texture e roughness. Un solo uniform condiviso: la lama è globale.

import * as THREE from 'three';

export const sweepUniform = { value: 8 };

export interface SweepOpts {
  roughness?: number;
  metalness?: number;
  map?: THREE.Texture;
  envMapIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

const CLAY = new THREE.Color('#ECEAE4');
const CLAY_ROUGHNESS = 0.92;

export function sweepMaterial(real: string, opts: SweepOpts = {}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(real),
    map: opts.map ?? null,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0,
    envMapIntensity: opts.envMapIntensity ?? 0.6,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSweepX = sweepUniform;
    shader.uniforms.uClay = { value: CLAY.clone() };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSweepWorldPos;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvSweepWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vSweepWorldPos;
        uniform float uSweepX;
        uniform vec3 uClay;
        float sweepAmount() {
          return smoothstep(uSweepX - 0.3, uSweepX + 0.3, vSweepWorldPos.x);
        }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          // la lama avanza da +x a -x: la materia appare dove x > uSweepX
          float swept = sweepAmount();
          diffuseColor.rgb = mix(uClay, diffuseColor.rgb, swept);
          float blade = 1.0 - smoothstep(0.0, 0.22, abs(vSweepWorldPos.x - uSweepX));
          diffuseColor.rgb += blade * 0.12;
        }`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(${CLAY_ROUGHNESS.toFixed(2)}, roughnessFactor, sweepAmount());`
      );
  };
  return mat;
}
