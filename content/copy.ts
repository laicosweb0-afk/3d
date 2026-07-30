// Copy del viaggio — Direzione V3: Mondial Service è un'impresa edile
// premium. Il tema è la trasformazione, non il disegno. Linguaggio
// essenziale, credibile, da cantiere d'eccellenza. Seconda persona.

import type { SceneId } from '@/lib/scenes';

export interface SceneCopy {
  scene: SceneId;
  /** finestra di visibilità nel progresso locale della scena */
  from: number;
  to: number;
  kicker?: string;
  title: string;
  body?: string;
}

export const JOURNEY_COPY: SceneCopy[] = [
  {
    scene: 's03', from: 0.25, to: 0.85,
    kicker: 'Trasformare gli spazi',
    title: 'Ogni trasformazione ha un metodo.',
    body: 'Cantiere, tempi e qualità esecutiva, sotto un’unica regia.',
  },
  {
    scene: 's05', from: 0.25, to: 0.9,
    kicker: 'Mondial Service',
    title: 'Dal primo sopralluogo alla consegna delle chiavi.',
  },
  {
    scene: 's07', from: 0.22, to: 0.5,
    kicker: 'Trasformare gli spazi',
    title: 'Ristrutturazioni complete.',
    body: 'Il tuo spazio, trasformato e consegnato finito. Un unico interlocutore, dall’inizio alla fine.',
  },
  {
    scene: 's08', from: 0.35, to: 0.85,
    kicker: 'La qualità invisibile',
    title: 'La qualità che non vedrai mai. Noi sì.',
    body: 'Isolamento, struttura, impianti: il lavoro a regola d’arte è quello che non si vede.',
  },
  {
    scene: 's09', from: 0.26, to: 0.5,
    kicker: 'La qualità invisibile',
    title: 'Sotto ogni pavimento, un lavoro fatto per durare.',
    body: 'Massetti, riscaldamento radiante, tubazioni: progettati e posati una volta, bene.',
  },
  {
    scene: 's10', from: 0.16, to: 0.4,
    kicker: 'Il benessere quotidiano',
    title: 'Bagni chiavi in mano.',
    body: 'Dal massetto alla rubinetteria: tu scegli i materiali, noi consegniamo finito.',
  },
  {
    scene: 's12', from: 0.55, to: 1,
    title: 'Hai visto una trasformazione.',
    body: 'La prossima può essere casa tua.',
  },
];

export const HERO = {
  title: 'Trasformiamo spazi\nin case da vivere.',
  sub: 'Ristrutturazioni · Impianti · Servizi',
  notice: 'Preparati: da qui in poi è un piccolo viaggio',
  scrollHint: 'Scorri',
};
