// Le carrozzerie che si vedono davvero per le strade di Lugo: utilitarie
// e citycar italiane, descritte per PROPORZIONI e non per marchio. Sono
// silhouette generiche ispirate alle categorie reali (la squadrata da
// città, la tonda piccola, la berlinetta compatta, il monovolumino,
// il piccolo SUV), così nessun logo e nessun modello protetto entra nel
// gioco: quello che si riconosce è la sagoma, che è ciò che conta.
//
// Ogni misura è in metri; il modello è costruito lungo +X.

export interface Carrozzeria {
  id: string;
  /** Nome descrittivo, mai un marchio. */
  nome: string;
  /** Lunghezza, altezza e larghezza della scocca. */
  lung: number;
  larg: number;
  /** Altezza del corpo sotto i vetri. */
  hCorpo: number;
  /** Altezza del padiglione (abitacolo). */
  hTetto: number;
  /** Lunghezza dell'abitacolo e suo spostamento verso il posteriore. */
  lungTetto: number;
  offTetto: number;
  /** Sbalzo del cofano davanti (0 = muso corto, tipo citycar). */
  cofano: number;
  /** Passo e raggio ruota. */
  passo: number;
  rRuota: number;
  /** Quanto è squadrata: 0 tonda, 1 spigolosa (governa gli spioventi). */
  squadrata: number;
}

export const CARROZZERIE: Carrozzeria[] = [
  {
    id: 'squadrata',
    nome: 'Utilitaria squadrata',
    lung: 3.6, larg: 1.6, hCorpo: 0.6, hTetto: 0.56, lungTetto: 1.95, offTetto: -0.22,
    cofano: 0.5, passo: 2.25, rRuota: 0.3, squadrata: 1,
  },
  {
    id: 'tondina',
    nome: 'Citycar tonda',
    lung: 3.35, larg: 1.58, hCorpo: 0.58, hTetto: 0.5, lungTetto: 1.7, offTetto: -0.06,
    cofano: 0.4, passo: 2.15, rRuota: 0.29, squadrata: 0.15,
  },
  {
    id: 'compatta',
    nome: 'Compatta cinque porte',
    lung: 4.0, larg: 1.68, hCorpo: 0.62, hTetto: 0.5, lungTetto: 2.1, offTetto: -0.28,
    cofano: 0.72, passo: 2.5, rRuota: 0.31, squadrata: 0.45,
  },
  {
    id: 'monovolumino',
    nome: 'Monovolume piccolo',
    lung: 3.9, larg: 1.66, hCorpo: 0.68, hTetto: 0.62, lungTetto: 2.2, offTetto: -0.12,
    cofano: 0.45, passo: 2.45, rRuota: 0.3, squadrata: 0.6,
  },
  {
    id: 'suvetto',
    nome: 'SUV compatto',
    lung: 4.2, larg: 1.76, hCorpo: 0.76, hTetto: 0.54, lungTetto: 2.2, offTetto: -0.24,
    cofano: 0.75, passo: 2.6, rRuota: 0.35, squadrata: 0.7,
  },
];

export function carrozzeriaById(id: string): Carrozzeria {
  return CARROZZERIE.find((c) => c.id === id) ?? CARROZZERIE[0];
}
