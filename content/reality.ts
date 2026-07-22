// Le finestre di realtà (Direzione V4): il reale affiora dentro il
// viaggio, guidato dallo scroll, reversibile. Il 3D compone
// l'inquadratura, la fotografia la conferma.

import type { SceneId } from '@/lib/scenes';

export interface RealityWindow {
  id: string;
  scene: SceneId;
  /** finestra di visibilità nel progresso locale della scena */
  from: number;
  to: number;
  src: string;
  kicker: string;
  caption: string;
  /** se presente: video-transizione (3D→reale) scrubbato dallo scroll,
   * al posto del crossfade. L'ultimo frame del video è la foto reale. */
  video?: string;
  videoDuration?: number;
}

export const REALITY_WINDOWS: RealityWindow[] = [
  {
    id: 'soggiorno',
    scene: 's07',
    from: 0.52, to: 0.9,
    src: '/assets/foto/soggiorno-1.jpg',
    kicker: 'Dal vero',
    caption: 'La zona giorno, nello stile con cui consegniamo.',
    // morph costruzione→foto (Seedance): la stessa identica stanza si
    // costruisce progressivamente fino alla foto reale, stessa prospettiva
    // e finestre. Scrubbato dallo scroll. .webm (Chromium/FF) / .mp4 (Safari)
    video: '/assets/video/soggiorno-transizione',
    videoDuration: 5,
  },
  {
    id: 'cantiere',
    scene: 's09',
    from: 0.52, to: 0.85,
    src: '/assets/foto/cantiere.jpg',
    kicker: 'Dal vero',
    caption: 'Questo è un nostro cantiere: radiante a pavimento, prima del massetto.',
  },
  {
    id: 'bagno',
    scene: 's10',
    from: 0.4, to: 0.74,
    src: '/assets/foto/bagno-reale.jpg',
    kicker: 'Dal vero',
    caption: 'Un nostro bagno consegnato: marquina e calacatta, chiavi in mano.',
    // morph costruzione→foto (Seedance): lo stesso identico bagno si
    // finisce progressivamente fino alla foto reale, stessa prospettiva
    // e finestra. Scrubbato dallo scroll.
    video: '/assets/video/bagno-transizione',
    videoDuration: 5,
  },
];
