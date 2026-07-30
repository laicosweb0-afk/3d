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
  /**
   * Il PORTALE: la superficie architettonica che riempie il frame e dentro
   * cui avviene lo scambio 3D→reale. Nessuna dissolvenza — la materia passa
   * davanti all'obiettivo e quando si scopre siamo già nel reale, come un
   * taglio nascosto di un piano sequenza.
   *  - texture: il materiale della superficie che attraversiamo
   *  - axis/dir: la direzione della spazzata, che segue il movimento di
   *    camera di quel momento (avanti = orizzontale, discesa = verticale)
   */
  portal?: {
    texture: string;
    axis?: 'x' | 'y';
    dir?: 1 | -1;
  };
}

export const REALITY_WINDOWS: RealityWindow[] = [
  {
    id: 'soggiorno',
    scene: 's07',
    // Finestra estesa a quasi tutta la scena: qui NON si vede il 3D. Si
    // entra col grezzo e si scorre mentre la stanza si costruisce fino al
    // reale. Il 3D resta solo riferimento d'inquadratura, fuori campo.
    from: 0.2, to: 0.9,
    src: '/assets/foto/soggiorno-1.jpg',
    kicker: 'Dal vero',
    caption: 'La zona giorno, nello stile con cui consegniamo.',
    // morph costruzione→foto (Seedance): la stessa identica stanza si
    // costruisce progressivamente fino alla foto reale, stessa prospettiva
    // e finestre. Scrubbato dallo scroll. .webm (Chromium/FF) / .mp4 (Safari)
    video: '/assets/video/soggiorno-transizione',
    videoDuration: 5,
    // attraversiamo l'anta in rovere: la camera va avanti, il legno passa
    portal: { texture: '/assets/textures/rovere.jpg', axis: 'x', dir: -1 },
  },
  {
    id: 'cantiere',
    scene: 's09',
    // le tubazioni: anche qui il reale copre la scena (video in arrivo)
    from: 0.25, to: 0.88,
    src: '/assets/foto/cantiere.jpg',
    kicker: 'Dal vero',
    caption: 'Questo è un nostro cantiere: radiante a pavimento, prima del massetto.',
    // scendiamo sotto il pavimento: la stratigrafia scorre verso l'alto
    portal: { texture: '/assets/textures/marquina.jpg', axis: 'y', dir: -1 },
  },
  {
    id: 'bagno',
    scene: 's10',
    // Come il soggiorno: tutta la scena è reale. Si entra col bagno grezzo
    // e i pezzi si montano scorrendo, fino al bagno consegnato.
    from: 0.18, to: 0.9,
    src: '/assets/foto/bagno-reale.jpg',
    kicker: 'Dal vero',
    caption: 'Un nostro bagno consegnato: marquina e calacatta, chiavi in mano.',
    // morph costruzione→foto (Seedance): lo stesso identico bagno si
    // finisce progressivamente fino alla foto reale, stessa prospettiva
    // e finestra. Scrubbato dallo scroll.
    video: '/assets/video/bagno-transizione',
    videoDuration: 5,
    // il marmo della parete riempie lo schermo e diventa il bagno vero
    portal: { texture: '/assets/textures/calacatta.jpg', axis: 'x', dir: -1 },
  },
];
