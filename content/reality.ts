// LA CATENA REALE.
//
// Dal soggiorno grezzo fino al bianco finale non si vede più il 3D: si vedono
// video veri, generati partendo dalle fotografie reali dei lavori. Il 3D resta
// solo riferimento d'inquadratura, fuori campo.
//
// Il trucco della continuità: l'ULTIMO fotogramma di ogni video è il PRIMO del
// successivo. Le giunzioni non sono transizioni, sono la stessa immagine.
//
//   soggiorno grezzo → soggiorno finito → si alza la piastrella →
//   dentro le tubazioni → bagno grezzo → bagno finito → la finestra si apre → bianco
//
// Ogni video è scrubbato dallo scroll: è il visitatore a far costruire la casa.

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
  /** video-transizione scrubbato dallo scroll; l'ultimo frame è la foto reale */
  video?: string;
  videoDuration?: number;
  /**
   * Il PORTALE: la superficie architettonica che riempie il frame e dentro
   * cui avviene lo scambio 3D→reale. Nessuna dissolvenza — la materia passa
   * davanti all'obiettivo e quando si scopre siamo già nel reale, come un
   * taglio nascosto di un piano sequenza.
   */
  portal?: {
    texture: string;
    axis?: 'x' | 'y';
    dir?: 1 | -1;
  };
}

export const REALITY_WINDOWS: RealityWindow[] = [
  {
    // ANELLO 1 — il soggiorno si costruisce
    id: 'soggiorno',
    scene: 's07',
    from: 0.2, to: 1.0,
    src: '/assets/foto/soggiorno-1.jpg',
    kicker: 'Dal vero',
    caption: 'La zona giorno, nello stile con cui consegniamo.',
    video: '/assets/video/soggiorno-costruzione',
    videoDuration: 8,
    // si entra attraversando l'anta in rovere
    portal: { texture: '/assets/textures/rovere.jpg', axis: 'x', dir: -1 },
  },
  {
    // ANELLO 2 — si alza la piastrella e appaiono le tubazioni.
    // Prende il posto della vecchia scena 3D "dentro la parete": non
    // sparisce, diventa il viaggio dentro la struttura.
    id: 'piastrella',
    scene: 's08',
    from: 0.0, to: 1.0,
    src: '/assets/foto/cantiere.jpg',
    kicker: 'La qualità invisibile',
    caption: 'Sotto ogni pavimento, il lavoro che non vedrai mai.',
    video: '/assets/video/piastrella-tubazioni',
    videoDuration: 8,
    // nessun portale: arriviamo già dal reale del soggiorno, la continuità
    // è garantita dal fotogramma condiviso
  },
  {
    // ANELLO 3 — dentro le tubazioni fino a sbucare nel bagno grezzo
    id: 'tubazioni',
    scene: 's09',
    from: 0.0, to: 1.0,
    src: '/assets/foto/cantiere.jpg',
    kicker: 'Dal vero',
    caption: 'Impianti e stratigrafie: progettati e posati una volta, bene.',
    video: '/assets/video/dentro-tubazioni',
    videoDuration: 8,
  },
  {
    // ANELLO 4 — il bagno si costruisce
    id: 'bagno',
    scene: 's10',
    from: 0.0, to: 1.0,
    src: '/assets/foto/bagno-reale.jpg',
    kicker: 'Dal vero',
    caption: 'Un nostro bagno consegnato: marquina e calacatta, chiavi in mano.',
    video: '/assets/video/bagno-costruzione',
    videoDuration: 8,
  },
  {
    // ANELLO 5 — la finestra si apre e il bianco si prende tutto:
    // è da qui che si rientra nelle sezioni del sito.
    id: 'finestra',
    scene: 's11',
    // fino in fondo alla scena: il bianco del video non deve mai lasciare
    // spazio al 3D prima che subentri il velo bianco del congedo
    from: 0.0, to: 1.0,
    src: '/assets/foto/bagno-reale.jpg',
    kicker: '',
    caption: '',
    video: '/assets/video/finestra-bianco',
    videoDuration: 8,
  },
];
