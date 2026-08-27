// Le missioni di Lugo: architettura data-driven e scalabile. La storia
// principale ("Trova il tuo amico") è una catena di missioni sui luoghi
// veri; le CONSEGNE sono missioni generate al volo, ripetibili, in stile
// rider. La macchina a stati vive nello store; qui i dati e la geometria.

import type { MondoLugo } from './loadMap';
import { puntoStradaVicino } from './car';

export type TipoMissione = 'storia' | 'consegna';

export interface TappaMissione {
  /** Id POI del map.json, "viali-n|e|s|o", oppure "xz:<x>:<z>" (posizione libera). */
  poi: string;
  titolo: string;
  /** La tappa vale solo a piedi (forza la discesa). */
  aPiedi?: boolean;
}

export interface Missione {
  id: string;
  tipo: TipoMissione;
  titolo: string;
  descrizione: string;
  /** La battuta cinematografica mostrata nella scheda di avvio. */
  frase?: string;
  tappe: TappaMissione[];
  /** Secondi totali; assente = senza tempo. */
  tempoLimite?: number;
  /** Reputazione guadagnata al completamento. */
  ricompensa: number;
  /** Euro guadagnati al completamento (base, prima dei bonus velocità). */
  denaro: number;
  /** true per le consegne: bonus in base al tempo rimasto + mancia. */
  bonusVelocita?: boolean;
}

// ── La storia principale: TROVA IL TUO AMICO ────────────────────────────────
// Giacomo non risponde al telefono da stamattina. Ogni missione è un
// indizio che porta alla prossima, fino alla soluzione (comica) in caserma.

export const MISSIONI: Missione[] = [
  {
    id: 'm01',
    tipo: 'storia',
    titolo: 'Trova il tuo amico',
    descrizione: 'Giacomo non risponde da stamattina. Doveva farsi trovare al Pavaglione.',
    frase: '“È da stamattina che lo chiamo e niente. Boh, vado a vedere.”',
    tappe: [{ poi: 'pavaglione', titolo: 'Vai al Pavaglione' }],
    ricompensa: 100,
    denaro: 10,
  },
  {
    id: 'm02',
    tipo: 'storia',
    titolo: 'Il barista sa qualcosa',
    descrizione: 'Al Pavaglione non c’è. Il barista dice di averlo visto andare verso la Rocca.',
    frase: '“Giacomo? Sì sì, era qui prima. Ha preso un caffè ed è filato in Rocca.”',
    tappe: [
      { poi: 'bar', titolo: 'Chiedi al bar' },
      { poi: 'rocca', titolo: 'Cercalo alla Rocca Estense' },
    ],
    tempoLimite: 75,
    ricompensa: 250,
    denaro: 15,
  },
  {
    id: 'm03',
    tipo: 'storia',
    titolo: 'La borsa dimenticata',
    descrizione: 'In Piazza Baracca c’è la sua borsa. Che sia partito? Controlla la stazione.',
    frase: '“Questa è la sua borsa… la riconosco dallo scotch sulla cerniera.”',
    tappe: [
      { poi: 'baracca', titolo: 'Recupera la borsa in Piazza Baracca' },
      { poi: 'stazione', titolo: 'Corri alla stazione' },
    ],
    tempoLimite: 90,
    ricompensa: 300,
    denaro: 20,
  },
  {
    id: 'm04',
    tipo: 'storia',
    titolo: 'Il giro delle voci',
    descrizione: 'In stazione nessuno l’ha visto. Chiedi in giro: quattro punti lungo i viali.',
    frase: '“Qualcuno in circonvallazione deve averlo visto per forza.”',
    tappe: [
      { poi: 'viali-n', titolo: 'Chiedi al checkpoint nord' },
      { poi: 'viali-e', titolo: 'Chiedi al checkpoint est' },
      { poi: 'viali-s', titolo: 'Chiedi al checkpoint sud' },
      { poi: 'viali-o', titolo: 'Chiedi al checkpoint ovest' },
    ],
    tempoLimite: 150,
    ricompensa: 400,
    denaro: 25,
  },
  {
    id: 'm05',
    tipo: 'storia',
    titolo: 'Sotto i portici',
    descrizione: 'Un tizio giura di averlo visto sotto le logge. Lì si va a piedi.',
    frase: '“L’ho visto io! Era al Pavaglione, sotto i portici. Parcheggia e vai.”',
    tappe: [{ poi: 'pavaglione', titolo: 'Entra nella corte a piedi', aPiedi: true }],
    tempoLimite: 90,
    ricompensa: 200,
    denaro: 15,
  },
  {
    id: 'm06',
    tipo: 'storia',
    titolo: 'Il biglietto sul monumento',
    descrizione: 'Sotto i portici, un biglietto: “Ci vediamo dall’asso”. Il monumento a Baracca.',
    frase: '“‘Ci vediamo dall’asso.’ Sempre stato un poeta, Giacomo.”',
    tappe: [{ poi: 'baracca', titolo: 'Vai al monumento a piedi', aPiedi: true }],
    tempoLimite: 120,
    ricompensa: 350,
    denaro: 15,
  },
  {
    id: 'm07',
    tipo: 'storia',
    titolo: 'Tutto chiarito in caserma',
    descrizione: 'Colpo di scena: Giacomo è in caserma. Passa dalla Rocca e vallo a prendere.',
    frase: '“Era in caserma A FARE LA DENUNCIA: aveva perso il portafoglio. Tutto qui.”',
    tappe: [
      { poi: 'rocca', titolo: 'Passa dalla Rocca' },
      { poi: 'caserma', titolo: 'Recupera Giacomo in caserma' },
    ],
    tempoLimite: 90,
    ricompensa: 300,
    denaro: 40,
  },
];

// ── Le consegne: missioni generate, ripetibili, in stile rider ──────────────

/** Registro delle missioni generate al volo (consegne). */
const DINAMICHE = new Map<string, Missione>();
let contatoreConsegne = 0;

function lcg(seme: number): () => number {
  let s = (seme * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Genera una consegna: ritiro da un bar/ristorante del centro, consegna a
 * un altro negozio abbastanza lontano. Il tempo dipende dalla distanza;
 * pagare di più chi arriva prima lo fa il bonus in Missioni.tsx.
 */
export function creaConsegna(mondo: MondoLugo): Missione {
  contatoreConsegne++;
  const rnd = lcg(contatoreConsegne);
  const cibo = mondo.negozi.filter((n) => n.categoria === 'cibo' || n.categoria === 'bar');
  const tutti = mondo.negozi;
  const ritiro = cibo.length
    ? cibo[Math.floor(rnd() * cibo.length)]
    : { nome: 'Bar Centrale', categoria: 'bar', x: 0, z: 0 };
  let dest = tutti.length
    ? tutti[Math.floor(rnd() * tutti.length)]
    : { nome: 'centro', categoria: 'negozio', x: 60, z: 60 };
  for (let i = 0; i < 12 && Math.hypot(dest.x - ritiro.x, dest.z - ritiro.z) < 220; i++) {
    dest = tutti[Math.floor(rnd() * tutti.length)] ?? dest;
  }
  const dist = Math.hypot(dest.x - ritiro.x, dest.z - ritiro.z);
  const tempoLimite = Math.round(40 + dist / 7);
  const pRitiro = puntoStradaVicino(mondo, ritiro.x, ritiro.z);
  const pDest = puntoStradaVicino(mondo, dest.x, dest.z);
  const m: Missione = {
    id: `consegna_${String(contatoreConsegne).padStart(3, '0')}`,
    tipo: 'consegna',
    titolo: 'Consegna per ' + (dest.nome || 'il centro'),
    descrizione: `Ritira da ${ritiro.nome || 'il bar'} e consegna prima che si freddi.`,
    frase: `“Ordine pronto da ${ritiro.nome || 'il bar'}. Se arrivi caldo, la mancia è tua.”`,
    tappe: [
      { poi: `xz:${pRitiro.x.toFixed(1)}:${pRitiro.z.toFixed(1)}`, titolo: `Ritira da ${ritiro.nome || 'il bar'}` },
      { poi: `xz:${pDest.x.toFixed(1)}:${pDest.z.toFixed(1)}`, titolo: `Consegna a ${dest.nome || 'destinazione'}` },
    ],
    tempoLimite,
    ricompensa: 50,
    denaro: 8,
    bonusVelocita: true,
  };
  DINAMICHE.set(m.id, m);
  if (DINAMICHE.size > 40) {
    const primo = DINAMICHE.keys().next().value;
    if (primo) DINAMICHE.delete(primo);
  }
  return m;
}

export function missioneById(id: string): Missione | undefined {
  return MISSIONI.find((m) => m.id === id) ?? DINAMICHE.get(id);
}

/** Risolve la posizione di una tappa; i "viali-*" e gli "xz:*" si calcolano. */
export function posTappa(mondo: MondoLugo, tappa: TappaMissione): { x: number; z: number } {
  const libera = tappa.poi.match(/^xz:(-?[\d.]+):(-?[\d.]+)$/);
  if (libera) return { x: parseFloat(libera[1]), z: parseFloat(libera[2]) };
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

/**
 * La catena: finché la storia non è finita si prosegue con la prossima
 * missione di storia; poi la città vive di consegne, con ogni tanto una
 * missione di storia rigiocabile per la reputazione.
 */
export function prossimaMissione(
  mondo: MondoLugo,
  idCorrente: string | null,
  missioniFatte: string[],
): Missione {
  const daFare = MISSIONI.find((m) => !missioniFatte.includes(m.id));
  if (daFare) return daFare;
  // storia finita: si vive di consegne (e ogni 4 un classico da rigiocare)
  if (contatoreConsegne > 0 && contatoreConsegne % 4 === 3) {
    const idx = (contatoreConsegne / 4) | 0;
    return MISSIONI[idx % MISSIONI.length];
  }
  return creaConsegna(mondo);
}
