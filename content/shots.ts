// IL PIANO DEI CIAK — il passaggio dal 3D al reale (Direzione V4, portata a fondo).
//
// Il 3D non era il fine: era la previz. Ha già deciso inquadrature, tempi e
// continuità, e adesso serve a due cose molto concrete.
//
// 1. I fotogrammi di giunzione. I modelli generano al massimo 15 secondi per
//    clip, quindi il piano sequenza va spezzato. Se ogni clip nascesse per
//    conto suo si vedrebbero gli stacchi. Ma Seedance 2.0 e Kling 3.0
//    accettano `start_image` E `end_image`: renderizziamo dal 3D il fotogramma
//    esatto del confine e lo diamo come fine della clip N e inizio della N+1.
//    Le due clip si toccano sullo stesso fotogramma e il piano sequenza regge.
//
// 2. L'inquadratura. Ogni ciak parte da un render del 3D nella sua posizione di
//    camera reale: la clip generata eredita campo, altezza d'occhio e
//    prospettiva già approvate, invece di reinventarle.
//
// Regola che viene da DIRECTION_V4 e vale su tutto: «il reale autentico ha
// priorità sul generato». Dove esiste la foto vera del cliente, la foto vera è
// il fotogramma di partenza — non un'immagine inventata che le somiglia.

import type { SceneId } from '@/lib/scenes';
import { SCENES, pAt } from '@/lib/scenes';

/**
 * Secondi di girato per ogni viewport-height di scroll.
 *
 * È l'unica manopola della densità: alzarlo rende lo scrubbing più fluido e
 * pesa di più, abbassarlo il contrario. A 2.5 il viaggio (24 vh) sta in circa
 * un minuto di girato, e a 24 fps un fotogramma copre ~15 px di scroll — sotto
 * la soglia in cui l'occhio legge gli scatti durante uno scroll normale.
 */
export const SECONDI_PER_VH = 2.5;

/** Fotogrammi al secondo del girato consegnato. */
export const FPS = 24;

/** Da dove nasce il fotogramma di partenza di un ciak. */
export type Fonte =
  /** Render del 3D: l'inquadratura esiste solo come previz. */
  | 'previz'
  /** Fotografia vera del cliente, già nel repo. Ha la precedenza. */
  | 'reale';

export interface Shot {
  /** Coincide con la scena: la regia è già divisa in dodici tempi. */
  scene: SceneId;
  /** Cosa si vede, per chi legge il piano senza aprire il 3D. */
  soggetto: string;
  fonte: Fonte;
  /** Solo per fonte 'reale': il file da usare come fotogramma di partenza. */
  foto?: string;
  /**
   * Prompt per il modello. In inglese perché è la lingua su cui questi modelli
   * aderiscono meglio; l'intento in italiano sta in `soggetto`.
   */
  prompt: string;
}

// ---- I mattoni condivisi dei prompt (vedi COERENZA_CASA.md) ----
//
// La casa si descrive UNA volta sola. Ripetere la descrizione in dodici prompt
// significa che prima o poi due divergono, e il visitatore vede due case
// diverse nello stesso piano sequenza.

/** L'edificio visto da fuori. Il tratto riconoscibile è la facciata divisa. */
const ESTERNO =
  'The building is a single-storey house, roughly 10 by 8 metres, with 3-metre ' +
  'walls and a thin flat dark roof slab cantilevered about 40cm on every side, ' +
  'over an exposed concrete foundation plinth. Its entrance facade is split in ' +
  'two materials: the left half clad in rough split natural stone, the right ' +
  'half in smooth render, with an oak entrance door at the centre and one ' +
  'window to the right of the door. One large window on the right flank, one ' +
  'small tall window on the left flank, blind rear wall. All window frames are ' +
  'dark aluminium.';

/** L'interno consegnato. Vale solo dalle scene dentro casa in poi. */
const INTERNO =
  'Interior finishes: oak plank flooring throughout, pale rendered walls, ' +
  'calacatta marble surfaces. The bathroom, in the rear left corner, has black ' +
  'marquina marble floor, a calacatta marble wall, a white freestanding ' +
  'bathtub and an oak vanity with a calacatta top.';

/**
 * La regola che rende impossibile l'incoerenza: finché non entriamo davvero,
 * dalle aperture non si deve leggere nessun interno. In cantiere perché dentro
 * non c'è ancora niente; a casa finita perché il vetro riflette.
 */
const VUOTI_CANTIERE =
  'The openings read as dark empty voids: no finished interior is visible ' +
  'through them.';
const VETRI_SPECCHIO =
  'The windows read as dark reflective glass mirroring the sky and trees; the ' +
  'interior is not legible through them.';

/** Il luogo. Senza dirlo esce un cantiere generico da qualunque parte del mondo. */
const LUOGO =
  'Set in the flat countryside of northern Italy: farmland, a row of poplars ' +
  'and low hedges on the horizon. Overcast European daylight, soft diffused ' +
  'shadows.';

/** La resa. Fotografia documentaria d'architettura, non "cinematografico". */
const RESA =
  'Documentary architectural photography, full frame camera, natural colour, ' +
  'sharp focus. No people, no text, no signage, no logos, no stylisation, no ' +
  'second storey, no pitched roof, no white window frames, no balconies.';

/** Un solo movimento continuo: il piano sequenza non deve mai staccare. */
const CONTINUO =
  'ONE single continuous shot, no cuts, no scene changes, no zoom, no handheld ' +
  'shake.';

/**
 * I dodici ciak, uno per scena. L'ordine è quello del viaggio.
 *
 * Il filo che tiene tutto — ed è la cosa che interessa di più — è che si stia
 * costruendo mentre si scorre: dal terreno alla consegna, senza mai staccare.
 *
 * Ogni prompt si compone dai mattoni qui sopra: quello che è comune a tutte le
 * clip sta scritto in un posto solo, e nel prompt resta soltanto ciò che
 * distingue quel ciak dagli altri.
 */
export const SHOTS: Shot[] = [
  {
    scene: 's01',
    soggetto: 'Il terreno prima di tutto. Nessuna casa ancora.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} An empty building plot: levelled earth with string lines ` +
      `and batter boards marking out a rectangular foundation footprint. ` +
      `Nothing is built yet. The camera pushes in slowly and steadily. ` +
      `${LUOGO} ${RESA}`,
  },
  {
    scene: 's02',
    soggetto: 'Il rilievo: tracciamento e picchetti, il disegno che diventa cantiere.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} Setting out a house footprint on bare ground: batter ` +
      `boards, taut string lines, chalk marks and a laser level on a tripod. ` +
      `The camera rises slowly on a crane, revealing the full rectangular ` +
      `outline from above. Still nothing built. ${LUOGO} ${RESA}`,
  },
  {
    scene: 's03',
    soggetto: 'La costruzione: dallo scheletro al guscio grezzo. Il cuore del racconto.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} The camera performs a slow steady lateral dolly around the ` +
      `building while descending slightly. Across the shot the house builds ` +
      `itself from a partial concrete block shell to a complete structural ` +
      `shell: walls closed course by course, window openings formed, dark ` +
      `aluminium frames installed, scaffolding and props removed, ground ` +
      `cleared. It stays RAW — bare grey blockwork and cement render, no ` +
      `stone cladding and no finishes yet. ${ESTERNO} ${VUOTI_CANTIERE} ` +
      `${LUOGO} ${RESA}`,
  },
  {
    scene: 's04',
    soggetto: 'La materia: il grezzo che diventa finito, sulla stessa parete.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} Static camera on the entrance facade. The wall transforms ` +
      `in place from bare grey blockwork into its finished materials, the ` +
      `change sweeping horizontally across the frame: rough split natural ` +
      `stone appearing on the left half, smooth render on the right half, the ` +
      `oak entrance door and dark aluminium frames resolving into place. ` +
      `${ESTERNO} ${VETRI_SPECCHIO} ${LUOGO} ${RESA}`,
  },
  {
    scene: 's05',
    soggetto: 'Il volo: la casa finita, rivelata dal fronte.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} A smooth slow drone descent from above down towards eye ` +
      `level, revealing the finished house from the front. The building is ` +
      `complete: clean facade, trimmed lawn, tidy ground, no site equipment. ` +
      `${ESTERNO} ${VETRI_SPECCHIO} ${LUOGO} ${RESA}`,
  },
  {
    scene: 's06',
    soggetto: 'La soglia: ci si avvicina all’ingresso e la porta si apre.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} A steadicam move advancing towards the entrance of the ` +
      `finished house and coming to the oak door at the centre of the split ` +
      `facade. The door swings inwards, revealing a glimpse of an oak plank ` +
      `floor and pale rendered walls in soft daylight. Continuous forward ` +
      `motion. ${ESTERNO} ${LUOGO} ${RESA}`,
  },
  {
    scene: 's07',
    soggetto: 'Il soggiorno consegnato, nello stile con cui consegniamo davvero.',
    fonte: 'reale',
    foto: 'public/assets/foto/soggiorno-1.jpg',
    prompt:
      `${CONTINUO} A slow steadicam move through the finished living room, ` +
      `calm and unhurried. Warm diffused daylight from a large window. ` +
      `${INTERNO} ${RESA}`,
  },
  {
    scene: 's08',
    soggetto: 'Dentro la parete: isolamento e impianti a vista.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} A slow camera move along an interior partition wall opened ` +
      `up during works, then into the cavity: metal studs, mineral wool ` +
      `insulation, electrical conduits and copper pipework inside, ` +
      `plasterboard partly fixed. Work light mixed with daylight, fine dust ` +
      `in the air. ${RESA}`,
  },
  {
    scene: 's09',
    soggetto: 'Sotto il pavimento: il radiante posato. Abbiamo la foto vera.',
    fonte: 'reale',
    foto: 'public/assets/foto/cantiere.jpg',
    prompt:
      `${CONTINUO} A low camera gliding just above an underfloor heating ` +
      `installation: red pipework clipped in serpentine loops over insulation ` +
      `panels, manifold at the wall, screed ready to be poured. Work ` +
      `lighting. ${RESA}`,
  },
  {
    scene: 's10',
    soggetto: 'Il bagno consegnato: marquina e calacatta. Il lavoro vero.',
    fonte: 'reale',
    foto: 'public/assets/foto/bagno-reale.jpg',
    prompt:
      `${CONTINUO} A slow reveal of the finished bathroom, ending framed on ` +
      `the freestanding white bathtub. Daylight from the small window on the ` +
      `left; towards the end of the move the lights come up warmly. ` +
      `${INTERNO} ${RESA}`,
  },
  {
    scene: 's11',
    soggetto: 'La finestra: si esce dallo sguardo, la luce di fuori riprende.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} The camera pulls back from the small bathroom window into ` +
      `the room and keeps retreating through the finished house towards the ` +
      `living room. Daylight from the window, warm interior light. ` +
      `${INTERNO} ${RESA}`,
  },
  {
    scene: 's12',
    soggetto: 'Il congedo: la casa finita, di fronte, che si allontana.',
    fonte: 'previz',
    prompt:
      `${CONTINUO} A slow linear pull-back from the finished house, ` +
      `recomposing the full front elevation at distance, centred in frame. ` +
      `Calm, soft late daylight. ${ESTERNO} ${VETRI_SPECCHIO} ${LUOGO} ` +
      `${RESA}`,
  },
];

/** Durata in secondi del ciak, derivata dalla durata di scroll della scena. */
export function durataShot(scene: SceneId): number {
  const def = SCENES.find((s) => s.id === scene);
  if (!def) throw new Error(`scena sconosciuta: ${scene}`);
  // I modelli si fermano a 15 secondi: qui non ci arriviamo mai (la scena più
  // lunga è 3 vh), ma il limite va detto dove sta il calcolo, non a voce.
  return Math.min(15, Math.round(def.vh * SECONDI_PER_VH * 10) / 10);
}

/** Fotogrammi del ciak, cioè quanti ne servono per lo scrubbing di quella scena. */
export function fotogrammiShot(scene: SceneId): number {
  return Math.round(durataShot(scene) * FPS);
}

/**
 * I p globali dei fotogrammi di giunzione: uno per ogni confine di scena, più
 * i due estremi. Sono le immagini da renderizzare dal 3D e da passare ai
 * modelli come `end_image` della clip che chiude e `start_image` di quella che
 * apre — è il punto in cui le clip si saldano.
 */
export function giunzioni(): { id: string; p: number }[] {
  const punti: { id: string; p: number }[] = [
    { id: `${SHOTS[0].scene}-inizio`, p: 0 },
  ];
  for (const shot of SHOTS) {
    // La fine di un ciak è l'inizio del successivo: un solo fotogramma, non due.
    punti.push({ id: `${shot.scene}-fine`, p: pAt(shot.scene, 1) });
  }
  return punti;
}

/** Totale del girato, per sapere in anticipo quanto pesa la consegna. */
export function totaleGirato(): { secondi: number; fotogrammi: number } {
  let secondi = 0;
  let fotogrammi = 0;
  for (const shot of SHOTS) {
    secondi += durataShot(shot.scene);
    fotogrammi += fotogrammiShot(shot.scene);
  }
  return { secondi: Math.round(secondi * 10) / 10, fotogrammi };
}
