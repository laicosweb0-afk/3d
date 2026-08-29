// La progressione di LUGO CITY: livelli e reputazione.
//
// Due scale separate e volutamente diverse.
//  - Il LIVELLO è il grado di cittadinanza: cresce con la reputazione e
//    sblocca capi, missioni e attività. Ha un titolo narrativo, non un
//    numero e basta.
//  - La REPUTAZIONE è quanto sei conosciuto in città: ha le sue soglie con
//    nome, che compaiono nel diario e nelle classifiche future.
//
// Sistema DATI: le soglie stanno tutte qui e si tarano cambiando un numero.
// Nessun altro file deve contenere valori di progressione.

export interface Livello {
  n: number;
  titolo: string;
  /** Reputazione necessaria per raggiungerlo. */
  rep: number;
  /** Una riga che si legge nella scheda di avanzamento. */
  nota: string;
}

export const LIVELLI: readonly Livello[] = [
  { n: 1, titolo: 'Appena arrivato', rep: 0, nota: 'Hai messo piede in centro. Nessuno sa chi sei.' },
  { n: 2, titolo: 'Ti stai facendo conoscere', rep: 300, nota: 'Qualcuno comincia a salutarti al bar.' },
  { n: 3, titolo: 'Conosci Lugo', rep: 900, nota: 'Sai dove girare senza guardare la mappa.' },
  { n: 4, titolo: 'Sei conosciuto', rep: 2000, nota: 'Ti chiamano per nome sotto il Pavaglione.' },
  { n: 5, titolo: 'Cittadino', rep: 4000, nota: 'Lugo è casa tua a tutti gli effetti.' },
  { n: 6, titolo: 'Personaggio locale', rep: 7500, nota: 'Ti fermano per strada per chiederti come va.' },
  { n: 7, titolo: 'VIP locale', rep: 13000, nota: 'Nei locali il tavolo lo trovi sempre.' },
  { n: 8, titolo: 'Leggenda di Lugo', rep: 22000, nota: 'Di te si racconta anche a chi non c’era.' },
];

export interface GradoRep {
  nome: string;
  rep: number;
}

/** Le soglie di reputazione, con il nome che compare nel diario. */
export const GRADI_REP: readonly GradoRep[] = [
  { nome: 'Nessuno', rep: 0 },
  { nome: 'Nuovo in città', rep: 500 },
  { nome: 'Conosciuto', rep: 2000 },
  { nome: 'Cittadino', rep: 5000 },
  { nome: 'Personaggio locale', rep: 10000 },
  { nome: 'VIP', rep: 25000 },
  { nome: 'Leggenda di Lugo', rep: 50000 },
];

/** Il livello corrispondente a una reputazione. */
export function livelloDaRep(rep: number): Livello {
  let out = LIVELLI[0];
  for (const l of LIVELLI) if (rep >= l.rep) out = l;
  return out;
}

/** Il grado di reputazione corrispondente. */
export function gradoDaRep(rep: number): GradoRep {
  let out = GRADI_REP[0];
  for (const g of GRADI_REP) if (rep >= g.rep) out = g;
  return out;
}

/** Quanto manca al livello successivo: 0..1, più il livello di arrivo. */
export function avanzamento(rep: number): { frazione: number; prossimo: Livello | null; mancano: number } {
  const ora = livelloDaRep(rep);
  const prossimo = LIVELLI.find((l) => l.n === ora.n + 1) ?? null;
  if (!prossimo) return { frazione: 1, prossimo: null, mancano: 0 };
  const arco = prossimo.rep - ora.rep;
  const fatto = rep - ora.rep;
  return {
    frazione: arco > 0 ? Math.max(0, Math.min(1, fatto / arco)) : 1,
    prossimo,
    mancano: Math.max(0, prossimo.rep - rep),
  };
}
