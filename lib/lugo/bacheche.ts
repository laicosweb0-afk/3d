// Le bacheche: i posti di Lugo dove si va a cercare lavoro. Finché la
// storia va avanti le missioni arrivano da sole, come sempre; quando la
// storia è finita non piovono più dal cielo — si passa dal Pavaglione,
// dalla Rocca, dalla stazione o da piazza Baracca e si sceglie.
//
// Una bacheca non ha missioni scritte a mano: le chiede ai generatori che
// già esistono (le consegne e le missioni delle attività), e le tiene ferme
// finché il pannello resta aperto.

import type { MondoLugo } from './loadMap';
import { infraGioco } from './veicoli';
import { puntoStradaVicino } from './car';
import {
  attivitaConMissioni,
  creaConsegna,
  creaMissioneAttivita,
  MISSIONI,
  type Missione,
} from './missions';

export interface Bacheca {
  id: string;
  /** Il POI del map.json su cui si appoggia. */
  poi: string;
  nome: string;
  sottotitolo: string;
}

export const BACHECHE: readonly Bacheca[] = [
  {
    id: 'pavaglione',
    poi: 'pavaglione',
    nome: 'Il Pavaglione',
    sottotitolo: 'Sotto le arcate si sa sempre chi cerca una mano.',
  },
  {
    id: 'rocca',
    poi: 'rocca',
    nome: 'La Rocca Estense',
    sottotitolo: 'Il municipio: pratiche, commissioni, gente di passaggio.',
  },
  {
    id: 'stazione',
    poi: 'stazione',
    nome: 'La stazione',
    sottotitolo: 'Chi arriva ha quasi sempre qualcosa da far portare.',
  },
  {
    id: 'baracca',
    poi: 'baracca',
    nome: 'Piazza Baracca',
    sottotitolo: 'Il salotto di Lugo: qui girano le voci prima che altrove.',
  },
];

/**
 * Dove sta davvero la bacheca. Il punto di interesse di OpenStreetMap è il
 * CENTRO del luogo — per la Rocca è dentro il torrione, e lì non ci si
 * arriva. La bacheca si appoggia quindi al primo punto libero attorno al
 * POI: quello è anche il punto che il segnalino della città indica.
 */
const cachePosti = new WeakMap<MondoLugo, { bacheca: Bacheca; x: number; z: number }[]>();

export function postiBacheca(mondo: MondoLugo): { bacheca: Bacheca; x: number; z: number }[] {
  const gia = cachePosti.get(mondo);
  if (gia) return gia;
  const fisica = infraGioco(mondo).fisica;
  const out: { bacheca: Bacheca; x: number; z: number }[] = [];
  for (const b of BACHECHE) {
    const p = mondo.poi.get(b.poi);
    if (!p) continue;
    let posto: { x: number; z: number } | null = null;
    if (fisica.cerchioLibero(p.xm, p.zm, 1.2)) posto = { x: p.xm, z: p.zm };
    else {
      // si gira attorno al luogo allargando il raggio finché non si trova
      // un punto dove una persona ci sta davvero
      cerca: for (const r of [12, 18, 24, 30, 38]) {
        for (let k = 0; k < 16; k++) {
          const a = (Math.PI * 2 * k) / 16;
          const x = p.xm + Math.cos(a) * r;
          const z = p.zm + Math.sin(a) * r;
          if (fisica.cerchioLibero(x, z, 1.2)) {
            posto = { x, z };
            break cerca;
          }
        }
      }
    }
    if (!posto) {
      const s = puntoStradaVicino(mondo, p.xm, p.zm);
      posto = { x: s.x, z: s.z };
    }
    out.push({ bacheca: b, x: posto.x, z: posto.z });
  }
  cachePosti.set(mondo, out);
  return out;
}

/** La bacheca a portata di mano, o null. */
export function bachecaVicina(
  mondo: MondoLugo,
  x: number,
  z: number,
  raggio = 10,
): { bacheca: Bacheca; x: number; z: number } | null {
  let vicina: { bacheca: Bacheca; x: number; z: number } | null = null;
  let dMin = raggio;
  for (const p of postiBacheca(mondo)) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < dMin) {
      dMin = d;
      vicina = p;
    }
  }
  return vicina;
}

/**
 * Le tre proposte di una bacheca: una consegna, un lavoro di bottega e un
 * classico della storia da rigiocare. `giro` fa cambiare le proposte a ogni
 * apertura, così la bacheca non è un elenco fisso.
 */
export function offerteBacheca(
  mondo: MondoLugo,
  bachecaId: string,
  livello: number,
  giro: number,
): Missione[] {
  const out: Missione[] = [];
  out.push(creaConsegna(mondo));

  const attivita = attivitaConMissioni();
  if (attivita.length) {
    // ogni bacheca pesca da un punto diverso dell'elenco: al Pavaglione e
    // alla stazione non compare la stessa bottega
    const salto = bachecaId.length * 7 + giro * 3;
    out.push(creaMissioneAttivita(mondo, attivita[salto % attivita.length]));
  }

  const classici = MISSIONI.filter((m) => (m.livelloRichiesto ?? 1) <= livello);
  if (classici.length) out.push(classici[(giro + bachecaId.length) % classici.length]);

  return out;
}
