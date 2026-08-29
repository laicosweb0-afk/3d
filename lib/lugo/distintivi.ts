// I distintivi dell'esplorazione: piccoli traguardi che premiano il
// girare Lugo a piedi invece che passarci davanti in macchina.
//
// Sistema DATI: per aggiungerne uno basta una riga in DISTINTIVI, con la
// funzione che legge il progresso dallo stato del gioco.

export interface StatoProgresso {
  /** Id dei punti di interesse scoperti. */
  poiVisitati: readonly string[];
  /** Quanti monumenti (non botteghe) sono stati scoperti. */
  monumenti: number;
  /** Quante botteghe diverse sono state scoperte. */
  botteghe: number;
  /** Missioni completate almeno una volta. */
  missioniFatte: readonly string[];
  /** Consegne portate a termine (le consegne non entrano in missioniFatte). */
  consegneFatte: number;
  /** Reputazione accumulata. */
  punteggio: number;
}

export interface Distintivo {
  id: string;
  nome: string;
  testo: string;
  /** Quanto serve per ottenerlo. */
  meta: number;
  /** A che punto si è. */
  progresso: (s: StatoProgresso) => number;
}

export const DISTINTIVI: readonly Distintivo[] = [
  {
    id: 'esploratore',
    nome: 'Esploratore del centro',
    testo: 'Visita 10 punti di interesse',
    meta: 10,
    progresso: (s) => s.poiVisitati.length,
  },
  {
    id: 'conoscitore',
    nome: 'Conoscitore di Lugo',
    testo: 'Visita 30 punti di interesse',
    meta: 30,
    progresso: (s) => s.poiVisitati.length,
  },
  {
    id: 'monumenti',
    nome: 'Giro dei monumenti',
    testo: 'Scopri i 6 luoghi storici della città',
    meta: 6,
    progresso: (s) => s.monumenti,
  },
  {
    id: 'cliente',
    nome: 'Cliente affezionato',
    testo: 'Passa davanti a 12 botteghe del centro',
    meta: 12,
    progresso: (s) => s.botteghe,
  },
  {
    id: 'rider',
    nome: 'Rider di Lugo',
    testo: 'Porta a termine 8 consegne',
    meta: 8,
    progresso: (s) => s.consegneFatte,
  },
  {
    id: 'reputazione',
    nome: 'Uno di qui',
    testo: 'Arriva a 500 di reputazione',
    meta: 500,
    progresso: (s) => s.punteggio,
  },
];

/** Gli id dei distintivi già guadagnati con questo stato. */
export function distintiviRaggiunti(s: StatoProgresso): string[] {
  return DISTINTIVI.filter((d) => d.progresso(s) >= d.meta).map((d) => d.id);
}
