'use client';

// La camera: un solo percorso continuo campionato dal progresso smorzato.
// Doppio inseguimento (Lenis + damping del rig) + respiro steadicam.

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA_KEYS } from '@/content/direction';
import { progress, dampProgress, debugState } from '@/lib/progress';

const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const t0 = useRef(Math.random() * 100);

  const { posCurve, tgtCurve } = useMemo(() => {
    const posCurve = new THREE.CatmullRomCurve3(
      CAMERA_KEYS.map((k) => new THREE.Vector3(...k.pos)),
      false,
      'centripetal',
      0.5
    );
    const tgtCurve = new THREE.CatmullRomCurve3(
      CAMERA_KEYS.map((k) => new THREE.Vector3(...k.tgt)),
      false,
      'centripetal',
      0.5
    );
    return { posCurve, tgtCurve };
  }, []);

  useFrame((_, dt) => {
    dampProgress(Math.min(dt, 0.05));
    const p = progress.smoothed;

    // p → parametro di curva: piecewise sui keyframe
    const keys = CAMERA_KEYS;
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].p) i++;
    const seg = (p - keys[i].p) / (keys[i + 1].p - keys[i].p);
    const t = THREE.MathUtils.clamp(seg, 0, 1);
    const u = (i + t) / (keys.length - 1);

    posCurve.getPoint(u, _pos);
    tgtCurve.getPoint(u, _tgt);

    // respiro steadicam: quasi nulla da fermi, vivo in movimento
    const time = t0.current + performance.now() / 1000;
    const amp = debugState.still
      ? 0
      : 0.004 + Math.min(progress.velocity * 2.5, 1) * 0.012;
    _pos.x += (Math.sin(time * 0.9) + Math.sin(time * 1.7 + 1.3)) * amp;
    _pos.y += (Math.sin(time * 1.1 + 0.5) + Math.sin(time * 2.1)) * amp * 0.7;
    _tgt.y += Math.sin(time * 0.7 + 2.0) * amp * 0.5;

    camera.position.copy(_pos);
    camera.lookAt(_tgt);

    const fov = THREE.MathUtils.lerp(keys[i].fov, keys[i + 1].fov, t);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
