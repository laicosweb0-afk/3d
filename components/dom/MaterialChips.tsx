'use client';

// Materiali Selezionati: i campioni sono le stesse texture del mondo 3D,
// montate come canvas. Ciò che vedi nelle sezioni è ciò che vedi in scena.

import { useEffect, useRef } from 'react';
import { brandTextures } from '@/components/canvas/materials/procedural';

const MATERIALI = [
  { key: 'calacatta', nome: 'Calacatta', nota: 'Bagni e piani, venatura tenue' },
  { key: 'marquina', nome: 'Marquina', nota: 'Zoccoli e pavimenti, nero profondo' },
  { key: 'rovere', nome: 'Rovere', nota: 'Pavimenti e arredi su misura' },
  { key: 'pietra', nome: 'Pietra a spacco', nota: 'Pareti materiche, posata a corsi' },
] as const;

export function MaterialChips() {
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const T = brandTextures();
    el.querySelectorAll<HTMLDivElement>('[data-mat]').forEach((slot) => {
      const key = slot.dataset.mat as keyof typeof T;
      const canvas = T[key].image as HTMLCanvasElement;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      copy.getContext('2d')!.drawImage(canvas, 0, 0);
      copy.className = 'mat-canvas';
      slot.replaceChildren(copy);
    });
  }, []);

  return (
    <div className="mat-grid" ref={grid}>
      {MATERIALI.map((m) => (
        <figure key={m.key} className="mat-chip">
          <div className="mat-swatch" data-mat={m.key} aria-hidden="true" />
          <figcaption>
            <span className="mat-nome">{m.nome}</span>
            <span className="mat-nota">{m.nota}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
