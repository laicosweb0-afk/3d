// Materiali Selezionati: i campioni sono le stesse texture fotografiche
// usate nel mondo 3D. Ciò che vedi in sezione è ciò che vedi in scena.

import { asset } from '@/lib/asset';

const MATERIALI = [
  { key: 'calacatta', nome: 'Calacatta', nota: 'Bagni e piani, venatura tenue' },
  { key: 'marquina', nome: 'Marquina', nota: 'Zoccoli e pavimenti, nero profondo' },
  { key: 'rovere', nome: 'Rovere', nota: 'Pavimenti e arredi su misura' },
  { key: 'pietra', nome: 'Pietra a spacco', nota: 'Pareti materiche, posata a corsi' },
] as const;

export function MaterialChips() {
  return (
    <div className="mat-grid">
      {MATERIALI.map((m) => (
        <figure key={m.key} className="mat-chip">
          <div className="mat-swatch">
            <img
              className="mat-canvas"
              src={asset(`/assets/textures/${m.key}.jpg`)}
              alt={`Campione di ${m.nome}`}
              loading="lazy"
            />
          </div>
          <figcaption>
            <span className="mat-nome">{m.nome}</span>
            <span className="mat-nota">{m.nota}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
