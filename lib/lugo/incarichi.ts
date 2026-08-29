// Gli incarichi: quello che Lugo ti chiede oggi, e quello che ti chiede
// questa settimana. Non sono missioni con un percorso — sono traguardi che
// si riempiono giocando, qualunque cosa tu stia facendo: consegne portate,
// luoghi scoperti, spese fatte, euro guadagnati, chilometri di città.
//
// Sono uguali per tutti nello stesso giorno perché nascono dalla DATA, non
// dal caso: la chiave del giorno (o della settimana) entra in una funzione
// di hash e ne esce sempre la stessa scelta. Nessun server, nessuna rete.
//
// Il progresso non si tiene incarico per incarico: si fotografano i totali
// del giocatore quando il periodo comincia, e il progresso è la differenza.
// Così un incarico non può mai perdere il conto, e il cambio di giorno è
// una riga sola.

export type Metrica = 'missioni' | 'consegne' | 'scoperte' | 'acquisti' | 'euro' | 'metri';

/** I totali di sempre del giocatore, da cui si ricava ogni progresso. */
export type Contatori = Record<Metrica, number>;

export const CONTATORI_ZERO: Contatori = {
  missioni: 0,
  consegne: 0,
  scoperte: 0,
  acquisti: 0,
  euro: 0,
  metri: 0,
};

export interface Incarico {
  id: string;
  periodo: 'giorno' | 'settimana';
  titolo: string;
  descrizione: string;
  metrica: Metrica;
  /** Quanto serve per chiuderlo. */
  quanto: number;
  rep: number;
  denaro: number;
}

/** Lo stato di un incarico per il giocatore che lo sta guardando. */
export interface IncaricoVivo extends Incarico {
  fatto: number;
  completo: boolean;
  riscosso: boolean;
}

interface Stampo {
  metrica: Metrica;
  titolo: string;
  descrizione: (q: number) => string;
  /** Quanto chiede in una giornata; la settimana moltiplica. */
  quanto: number;
  rep: number;
  denaro: number;
}

const STAMPI: readonly Stampo[] = [
  {
    metrica: 'consegne',
    titolo: 'Giro di consegne',
    descrizione: (q) => `Porta a termine ${q} consegne.`,
    quanto: 3,
    rep: 150,
    denaro: 120,
  },
  {
    metrica: 'missioni',
    titolo: 'Uno che si dà da fare',
    descrizione: (q) => `Chiudi ${q} missioni, di qualunque tipo.`,
    quanto: 4,
    rep: 180,
    denaro: 150,
  },
  {
    metrica: 'scoperte',
    titolo: 'Occhi aperti',
    descrizione: (q) => `Scopri ${q} posti nuovi girando a piedi.`,
    quanto: 5,
    rep: 160,
    denaro: 90,
  },
  {
    metrica: 'acquisti',
    titolo: 'Si fa il giro delle botteghe',
    descrizione: (q) => `Compra qualcosa in ${q} attività di Lugo.`,
    quanto: 3,
    rep: 130,
    denaro: 70,
  },
  {
    metrica: 'euro',
    titolo: 'La giornata rende',
    descrizione: (q) => `Guadagna €${q} lavorando in città.`,
    quanto: 500,
    rep: 170,
    denaro: 130,
  },
  {
    metrica: 'metri',
    titolo: 'Lugo da cima a fondo',
    descrizione: (q) => `Percorri ${(q / 1000).toFixed(1)} km per le vie della città.`,
    quanto: 4000,
    rep: 140,
    denaro: 100,
  },
];

/** Quanto la settimana chiede in più rispetto a una giornata. */
const MOLTIPLICATORE_SETTIMANA = 4;

/** Hash stabile di una stringa: la stessa data dà sempre lo stesso numero. */
function seme(chiave: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < chiave.length; i++) {
    h ^= chiave.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Numeri pseudocasuali ma ripetibili a partire dal seme. */
function estrai(s: number, k: number): number {
  let h = (s ^ Math.imul(k + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** La chiave del giorno, in ora locale: "2026-08-29". */
export function chiaveGiorno(d: Date = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const g = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${g}`;
}

/**
 * La chiave della settimana ISO: "2026-W35". La settimana comincia di
 * lunedì, come il calendario che abbiamo in cucina.
 */
export function chiaveSettimana(d: Date = new Date()): string {
  // si porta la data al giovedì della sua settimana: è il giorno che
  // decide a quale anno appartiene la settimana secondo lo standard ISO
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const giorno = (t.getDay() + 6) % 7; // lunedì = 0
  t.setDate(t.getDate() - giorno + 3);
  const primoGiovedi = new Date(t.getFullYear(), 0, 4);
  const scarto = (primoGiovedi.getDay() + 6) % 7;
  primoGiovedi.setDate(primoGiovedi.getDate() - scarto + 3);
  const settimana = 1 + Math.round((t.getTime() - primoGiovedi.getTime()) / (7 * 86400000));
  return `${t.getFullYear()}-W${`${settimana}`.padStart(2, '0')}`;
}

/** Sceglie `quanti` stampi diversi, sempre gli stessi per la stessa chiave. */
function scegli(chiave: string, quanti: number): Stampo[] {
  const s = seme(chiave);
  const resto = STAMPI.slice();
  const out: Stampo[] = [];
  for (let i = 0; i < quanti && resto.length; i++) {
    out.push(resto.splice(Math.floor(estrai(s, i) * resto.length), 1)[0]);
  }
  return out;
}

/** I tre incarichi di oggi. */
export function incarichiDelGiorno(chiave: string = chiaveGiorno()): Incarico[] {
  return scegli(chiave, 3).map((st) => ({
    id: `g:${chiave}:${st.metrica}`,
    periodo: 'giorno' as const,
    titolo: st.titolo,
    descrizione: st.descrizione(st.quanto),
    metrica: st.metrica,
    quanto: st.quanto,
    rep: st.rep,
    denaro: st.denaro,
  }));
}

/** I due incarichi della settimana: chiedono di più, e pagano di più. */
export function incarichiDellaSettimana(chiave: string = chiaveSettimana()): Incarico[] {
  return scegli('s' + chiave, 2).map((st) => {
    const quanto = st.quanto * MOLTIPLICATORE_SETTIMANA;
    return {
      id: `s:${chiave}:${st.metrica}`,
      periodo: 'settimana' as const,
      titolo: st.titolo,
      descrizione: st.descrizione(quanto),
      metrica: st.metrica,
      quanto,
      rep: st.rep * 5,
      denaro: st.denaro * 5,
    };
  });
}

/**
 * Riempie gli incarichi col progresso vero: quanto è cambiato dal momento
 * in cui il periodo è cominciato.
 */
export function incarichiVivi(
  incarichi: Incarico[],
  ora: Contatori,
  base: Contatori,
  riscossi: readonly string[],
): IncaricoVivo[] {
  return incarichi.map((i) => {
    const fatto = Math.max(0, Math.min(i.quanto, (ora[i.metrica] ?? 0) - (base[i.metrica] ?? 0)));
    return {
      ...i,
      fatto,
      completo: fatto >= i.quanto,
      riscosso: riscossi.includes(i.id),
    };
  });
}

/** Quanti incarichi sono pronti da riscuotere: è il numerino sul diario. */
export function daRiscuotere(vivi: IncaricoVivo[]): number {
  return vivi.filter((i) => i.completo && !i.riscosso).length;
}
