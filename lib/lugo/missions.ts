// Le missioni di Lugo: definizioni data-driven sui luoghi veri (i POI del
// map.json) e risoluzione delle tappe. La macchina a stati vive nello
// store; qui ci sono i dati e la geometria.

import type { MondoLugo } from './loadMap';
import { puntoStradaVicino } from './car';

export interface TappaMissione {
  /** Id POI del map.json, oppure uno speciale "viali-n|e|s|o". */
  poi: string;
  titolo: string;
  /** La tappa vale solo a piedi (forza la discesa). */
  aPiedi?: boolean;
}

export interface Missione {
  id: string;
  titolo: string;
  descrizione: string;
  tappe: TappaMissione[];
  /** Secondi totali; assente = senza tempo. */
  tempoLimite?: number;
  ricompensa: number;
}

export const MISSIONI: Missione[] = [
  {
    id: 'm01',
    titolo: 'Benvenuti a Lugo',
    descrizione: 'Prendi confidenza con la città: raggiungi il Pavaglione.',
    tappe: [{ poi: 'pavaglione', titolo: 'Vai al Pavaglione' }],
    ricompensa: 100,
  },
  {
    id: 'm02',
    titolo: 'Espresso in Rocca',
    descrizione: 'Il sindaco aspetta il caffè. Ritiralo al bar e portalo in Rocca prima che si freddi.',
    tappe: [
      { poi: 'bar', titolo: 'Ritira il caffè al bar' },
      { poi: 'rocca', titolo: 'Consegna alla Rocca Estense' },
    ],
    tempoLimite: 75,
    ricompensa: 250,
  },
  {
    id: 'm03',
    titolo: 'Il treno delle 8:04',
    descrizione: 'Un amico ha dimenticato la valigia: portala in stazione prima del treno.',
    tappe: [
      { poi: 'baracca', titolo: 'Prendi la valigia in Piazza Baracca' },
      { poi: 'stazione', titolo: 'Corri alla stazione' },
    ],
    tempoLimite: 90,
    ricompensa: 300,
  },
  {
    id: 'm04',
    titolo: 'Giro dei viali',
    descrizione: 'Quattro checkpoint attorno al centro: il giro della circonvallazione.',
    tappe: [
      { poi: 'viali-n', titolo: 'Checkpoint nord' },
      { poi: 'viali-e', titolo: 'Checkpoint est' },
      { poi: 'viali-s', titolo: 'Checkpoint sud' },
      { poi: 'viali-o', titolo: 'Checkpoint ovest' },
    ],
    tempoLimite: 150,
    ricompensa: 400,
  },
  {
    id: 'm05',
    titolo: 'Quattro passi al Pavaglione',
    descrizione: 'Sotto i portici non si entra in macchina: parcheggia e prosegui a piedi.',
    tappe: [{ poi: 'pavaglione', titolo: 'Entra nella corte a piedi', aPiedi: true }],
    tempoLimite: 90,
    ricompensa: 200,
  },
  {
    id: 'm06',
    titolo: "L'asso di Lugo",
    descrizione: 'Rendi omaggio a Francesco Baracca: tocca la base del monumento.',
    tappe: [{ poi: 'baracca', titolo: 'Tocca il monumento a piedi', aPiedi: true }],
    tempoLimite: 120,
    ricompensa: 350,
  },
  {
    id: 'm07',
    titolo: 'Documenti in caserma',
    descrizione: 'Pratiche urgenti dal municipio ai Carabinieri. Guida bene: ti guardano.',
    tappe: [
      { poi: 'rocca', titolo: 'Ritira i documenti in Rocca' },
      { poi: 'caserma', titolo: 'Consegna in caserma' },
    ],
    tempoLimite: 90,
    ricompensa: 300,
  },
];

export function missioneById(id: string): Missione | undefined {
  return MISSIONI.find((m) => m.id === id);
}

/** Risolve la posizione di una tappa; i "viali-*" si calcolano dalla mappa. */
export function posTappa(mondo: MondoLugo, tappa: TappaMissione): { x: number; z: number } {
  const speciale = tappa.poi.match(/^viali-(n|e|s|o)$/);
  if (speciale) {
    const { minX, minZ, maxX, maxZ } = mondo.bounds;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const r = Math.min(maxX - minX, maxZ - minZ) * 0.32;
    const dir = { n: [0, -1], e: [1, 0], s: [0, 1], o: [-1, 0] }[speciale[1]]!;
    const p = puntoStradaVicino(mondo, cx + dir[0] * r, cz + dir[1] * r);
    return { x: p.x, z: p.z };
  }
  const poi = mondo.poi.get(tappa.poi);
  if (poi) return { x: poi.xm, z: poi.zm };
  // POI mancante nei dati: si ripiega sul centro, meglio di un crash
  return { x: 0, z: 0 };
}

/** Le missioni si concatenano in ordine; dopo l'ultima si ricomincia. */
export function prossimaMissione(idCorrente: string | null): Missione {
  if (!idCorrente) return MISSIONI[0];
  const i = MISSIONI.findIndex((m) => m.id === idCorrente);
  return MISSIONI[(i + 1) % MISSIONI.length];
}
