// I punti di interesse di Lugo e l'esplorazione.
//
// L'idea è quella dei giochi che spingono a uscire e riconoscere i luoghi
// veri della propria città: qui si visitano a piedi il Pavaglione, la
// Rocca, il monumento a Baracca, le piazze e le botteghe del corso, e ogni
// visita entra nel diario. Il concetto di collegare gioco e luoghi reali è
// il punto di partenza; grafica, meccaniche e materiali sono tutti
// originali di questo progetto.
//
// Sistema DATI: si aggiunge una riga e il punto compare, si scopre e
// conta per i distintivi. Delle attività reali si usano soltanto nome e
// categoria, già pubblici su OpenStreetMap.

import type { MondoLugo } from './loadMap';
import { registroAttivita, type CategoriaAttivita } from './attivita';

export type TipoPoi = 'monumento' | 'piazza' | 'attivita';

export interface PuntoInteresse {
  id: string;
  nome: string;
  tipo: TipoPoi;
  /** Una riga che dice cos'è: mai una promozione, mai un prezzo. */
  cosa: string;
  x: number;
  z: number;
  /** Entro questo raggio, a piedi, il punto si scopre. */
  raggio: number;
  categoria?: CategoriaAttivita;
}

/** I luoghi veri riconosciuti nella mappa, con la loro riga di presentazione. */
const MONUMENTI: Record<string, { cosa: string; raggio: number; tipo: TipoPoi }> = {
  pavaglione: { cosa: 'Il quadriportico del mercato, cuore di Lugo dal Settecento.', raggio: 46, tipo: 'monumento' },
  rocca: { cosa: 'La Rocca Estense: castello, torre e giardino pensile.', raggio: 40, tipo: 'monumento' },
  stazione: { cosa: 'La stazione: da qui partono i treni per Ravenna e Lavezzola.', raggio: 34, tipo: 'monumento' },
  baracca: { cosa: 'Il monumento a Francesco Baracca, l’asso di Lugo.', raggio: 26, tipo: 'monumento' },
  teatro: { cosa: 'Il teatro Rossini, all’ombra della Rocca.', raggio: 26, tipo: 'monumento' },
  caserma: { cosa: 'La caserma dei Carabinieri. Meglio entrarci per chiedere, non per altro.', raggio: 26, tipo: 'monumento' },
  parco: { cosa: 'Il verde pubblico dove Lugo va a correre.', raggio: 44, tipo: 'piazza' },
  bar: { cosa: 'Un punto di ritrovo del centro.', raggio: 22, tipo: 'piazza' },
};

const COSA_CATEGORIA: Record<CategoriaAttivita, string> = {
  bar: 'Bar',
  cibo: 'Ristorazione',
  tabacchi: 'Tabaccheria',
  farmacia: 'Farmacia',
  negozio: 'Negozio',
  servizi: 'Attività del centro',
};

const cache = new WeakMap<MondoLugo, PuntoInteresse[]>();

/** Tutti i punti di interesse: monumenti, piazze e attività vere. */
export function puntiInteresse(mondo: MondoLugo): PuntoInteresse[] {
  const gia = cache.get(mondo);
  if (gia) return gia;
  const out: PuntoInteresse[] = [];
  for (const p of mondo.poi.values()) {
    const m = MONUMENTI[p.id];
    if (!m) continue;
    out.push({ id: 'poi_' + p.id, nome: p.nome, tipo: m.tipo, cosa: m.cosa, x: p.xm, z: p.zm, raggio: m.raggio });
  }
  for (const a of registroAttivita(mondo)) {
    out.push({
      id: a.id,
      nome: a.nome,
      tipo: 'attivita',
      cosa: COSA_CATEGORIA[a.categoria],
      x: a.x,
      z: a.z,
      raggio: 14,
      categoria: a.categoria,
    });
  }
  cache.set(mondo, out);
  return out;
}

/**
 * Il primo punto non ancora scoperto entro il suo raggio. Si scopre solo a
 * piedi: passarci davanti in auto non conta, così si cammina davvero.
 */
export function poiDaScoprire(
  mondo: MondoLugo,
  x: number,
  z: number,
  visitati: readonly string[],
): PuntoInteresse | null {
  for (const p of puntiInteresse(mondo)) {
    if (visitati.includes(p.id)) continue;
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < p.raggio * p.raggio) return p;
  }
  return null;
}

/** Quanti punti ci sono, per tipo: serve al diario. */
export function contaPoi(mondo: MondoLugo): Record<TipoPoi, number> {
  const c: Record<TipoPoi, number> = { monumento: 0, piazza: 0, attivita: 0 };
  for (const p of puntiInteresse(mondo)) c[p.tipo]++;
  return c;
}
