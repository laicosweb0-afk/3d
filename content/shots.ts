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

/**
 * I dodici ciak, uno per scena. L'ordine è quello del viaggio.
 *
 * Il filo che tiene tutto — ed è la cosa che interessa di più — è che si stia
 * costruendo mentre si scorre: dal terreno alla consegna, senza mai staccare.
 */
export const SHOTS: Shot[] = [
  {
    scene: 's01',
    soggetto: 'Il terreno prima di tutto. La luce del mattino, nessuna casa ancora.',
    fonte: 'previz',
    prompt:
      'Photoreal architectural documentary. An empty building plot at dawn, ' +
      'levelled earth and string lines marking the foundation footprint, soft ' +
      'overcast morning light, no people. Slow steady push-in. Shot on a full ' +
      'frame camera, 35mm, natural colour, no stylisation.',
  },
  {
    scene: 's02',
    soggetto: 'Il rilievo: tracciamento e picchetti sul terreno, il disegno che diventa cantiere.',
    fonte: 'previz',
    prompt:
      'Photoreal construction documentary. Surveyors setting out a house ' +
      'footprint: batter boards, string lines, chalk marks and a laser level ' +
      'on a tripod over levelled ground. Slow crane rise revealing the full ' +
      'outline. Overcast daylight, natural colour, handheld-steady.',
  },
  {
    scene: 's03',
    soggetto: 'La costruzione vera: fondazioni, muri che salgono, solaio. Il cuore del racconto.',
    fonte: 'previz',
    prompt:
      'Photoreal construction timelapse of a single-storey house being built: ' +
      'concrete foundations poured, block walls rising course by course, ' +
      'lintels set, roof slab cast. Continuous slow lateral dolly around the ' +
      'building as it grows. Real site, scaffolding, cement dust, overcast ' +
      'daylight. Documentary realism, no people in frame.',
  },
  {
    scene: 's04',
    soggetto:
      'La materia: la stessa parete grezza che diventa finita. Il grezzo e il finito nello stesso fotogramma.',
    fonte: 'previz',
    prompt:
      'Photoreal architectural transformation. A house facade transitions from ' +
      'bare structural blockwork to finished cladding — natural split stone, ' +
      'smooth render, oak door, dark aluminium window frames — the change ' +
      'sweeping horizontally across the wall. Static camera, materials ' +
      'resolving in place. Natural daylight, no stylisation.',
  },
  {
    scene: 's05',
    soggetto: 'Il volo: la casa finita, vista da fuori, il contesto che appare.',
    fonte: 'previz',
    prompt:
      'Photoreal aerial-to-eye-level shot of a finished contemporary ' +
      'single-storey house: split stone facade, flat dark roof, oak entrance ' +
      'door, large dark-framed windows, trimmed lawn. Smooth slow drone ' +
      'descent revealing the front elevation. Late afternoon sun, soft ' +
      'shadows, natural colour grade.',
  },
  {
    scene: 's06',
    soggetto: 'La soglia: ci si avvicina all’ingresso e la porta si apre.',
    fonte: 'previz',
    prompt:
      'Photoreal steadicam shot approaching the entrance of a finished modern ' +
      'house, oak door on a stone facade. The door swings open revealing warm ' +
      'interior light. Continuous forward motion, no cut. Natural daylight ' +
      'outside, warm light inside, documentary realism.',
  },
  {
    scene: 's07',
    soggetto: 'Il soggiorno consegnato, nello stile con cui consegniamo davvero.',
    fonte: 'reale',
    foto: 'public/assets/foto/soggiorno-1.jpg',
    prompt:
      'Photoreal interior. Slow steadicam move through a finished living room: ' +
      'oak plank floor, stone feature wall, calacatta marble surfaces, warm ' +
      'diffused daylight from a large window. Calm, unhurried camera. Real ' +
      'estate documentary realism, natural colour, no people.',
  },
  {
    scene: 's08',
    soggetto:
      'Dentro la parete: la stessa parete aperta in cantiere, isolamento e impianti a vista.',
    fonte: 'previz',
    prompt:
      'Photoreal construction documentary. An interior partition wall opened ' +
      'up during works: metal studs, mineral wool insulation, electrical ' +
      'conduits and copper pipework visible inside the cavity, plasterboard ' +
      'partly fixed. Slow camera move along the wall into the cavity. Work ' +
      'light and daylight mixed, dust in the air, natural colour.',
  },
  {
    scene: 's09',
    soggetto:
      'Sotto il pavimento: il radiante posato, la serpentina. Abbiamo la foto vera del cantiere.',
    fonte: 'reale',
    foto: 'public/assets/foto/cantiere.jpg',
    prompt:
      'Photoreal construction documentary. Low camera gliding just above an ' +
      'underfloor heating installation: red PEX pipework clipped in ' +
      'serpentine loops over insulation panels, manifold at the wall, screed ' +
      'ready to be poured. Real site, work lighting, natural colour, no people.',
  },
  {
    scene: 's10',
    soggetto:
      'Il bagno consegnato: marquina e calacatta. È il lavoro vero su cui è modellato il bagno 3D.',
    fonte: 'reale',
    foto: 'public/assets/foto/bagno-reale.jpg',
    prompt:
      'Photoreal interior. Slow reveal of a finished luxury bathroom: black ' +
      'marquina marble floor and dark wall, white calacatta marble wall, ' +
      'freestanding white bathtub, small window with daylight. The lights come ' +
      'up warmly towards the end of the move. Natural colour, no people.',
  },
  {
    scene: 's11',
    soggetto: 'La finestra: si esce dallo sguardo, la luce di fuori riprende.',
    fonte: 'previz',
    prompt:
      'Photoreal interior-to-exterior move. Camera pulls back from a bathroom ' +
      'window towards the room, then continues retreating through the finished ' +
      'house. Daylight from the window, warm interior light. Continuous ' +
      'smooth motion, documentary realism, natural colour.',
  },
  {
    scene: 's12',
    soggetto: 'Il congedo: la casa finita, di fronte, che si allontana.',
    fonte: 'previz',
    prompt:
      'Photoreal exterior. Slow linear pull-back from the finished house, ' +
      'recomposing the full front elevation at distance, split stone facade ' +
      'and dark roof centred in frame. Soft late daylight, calm, no people. ' +
      'Natural colour, documentary realism.',
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
