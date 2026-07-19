// La "lama di trasformazione" (Concept S04): un piano in world-space che
// mescola lo stato maquette (clay) e lo stato reale di ogni materiale.
// Un solo uniform condiviso da tutti i materiali: la lama è globale.

import * as THREE from 'three';

export const sweepUniform = { value: 8 };

export interface SweepOpts {
  roughness?: number;
  metalness?: number;
}

const CLAY = new THREE.Color('#ECEAE4');

export function sweepMaterial(real: string, opts: SweepOpts = {}): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: CLAY.clone(),
    roughness: opts.roughness ?? 0.92,
    metalness: opts.metalness ?? 0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSweepX = sweepUniform;
    shader.uniforms.uRealColor = { value: new THREE.Color(real) };
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
        '#include <common>\nvarying vec3 vSweepWorldPos;\nuniform float uSweepX;\nuniform vec3 uRealColor;'
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          // la lama avanza da +x a -x: la materia appare dove x > uSweepX
          float swept = smoothstep(uSweepX - 0.3, uSweepX + 0.3, vSweepWorldPos.x);
          diffuseColor.rgb = mix(diffuseColor.rgb, uRealColor, swept);
          // filo di luce sul fronte della lama
          float blade = 1.0 - smoothstep(0.0, 0.22, abs(vSweepWorldPos.x - uSweepX));
          diffuseColor.rgb += blade * 0.07;
        }`
      );
  };
  return mat;
}
