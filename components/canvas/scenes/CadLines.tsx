'use client';

// S02 — il disegno. Griglia architettonica che affiora e perimetro che si
// disegna (drawRange). Le quote riprendono il linguaggio del metro a nastro.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cadDraw } from '@/content/direction';
import { progress } from '@/lib/progress';
import { smooth, span } from '@/lib/scenes';

const INK = '#6E7076';
const INK_STRONG = '#17181A';

function gridGeometry(size: number, step: number): THREE.BufferGeometry {
  const pts: number[] = [];
  const h = size / 2;
  for (let v = -h; v <= h + 0.001; v += step) {
    pts.push(-h, 0, v, h, 0, v);
    pts.push(v, 0, -h, v, 0, h);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/** Polilinea suddivisa per un disegno fluido via drawRange. */
function polyline(points: [number, number][], y: number, subdiv = 24): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    for (let s = 0; s < subdiv; s++) {
      const t = s / subdiv;
      pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t));
    }
  }
  pts.push(new THREE.Vector3(points[points.length - 1][0], y, points[points.length - 1][1]));
  return new THREE.BufferGeometry().setFromPoints(pts);
}

export function CadLines() {
  const gridMat = useRef<THREE.LineBasicMaterial>(null);
  const outline = useRef<THREE.Line>(null);
  const quote = useRef<THREE.Line>(null);

  const gridGeo = useMemo(() => gridGeometry(26, 1), []);
  const outlineGeo = useMemo(
    () => polyline([[-5.3, 4.3], [5.3, 4.3], [5.3, -4.3], [-5.3, -4.3], [-5.3, 4.3]], 0.02),
    []
  );
  const quoteGeo = useMemo(
    () =>
      polyline(
        [[-5.3, 5.6], [-5.3, 5.2], [-5.3, 5.4], [5.3, 5.4], [5.3, 5.2], [5.3, 5.6]],
        0.02, 12
      ),
    []
  );

  useFrame(() => {
    const d = cadDraw(progress.smoothed);
    if (gridMat.current) gridMat.current.opacity = smooth(span(d, 0, 0.45)) * 0.28;
    const oCount = outlineGeo.getAttribute('position').count;
    const qCount = quoteGeo.getAttribute('position').count;
    if (outline.current) {
      outline.current.geometry.setDrawRange(0, Math.floor(oCount * smooth(span(d, 0.2, 0.75))));
    }
    if (quote.current) {
      quote.current.geometry.setDrawRange(0, Math.floor(qCount * smooth(span(d, 0.6, 1))));
    }
  });

  return (
    <group>
      <lineSegments geometry={gridGeo}>
        <lineBasicMaterial ref={gridMat} color={INK} transparent opacity={0} />
      </lineSegments>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <primitive object={new THREE.Line(outlineGeo, new THREE.LineBasicMaterial({ color: INK_STRONG }))} ref={outline} />
      <primitive object={new THREE.Line(quoteGeo, new THREE.LineBasicMaterial({ color: INK }))} ref={quote} />
    </group>
  );
}
