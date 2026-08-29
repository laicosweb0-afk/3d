// Gli eventi del mondo: cosa succede a Lugo, e quando. Sono DATI, non
// codice: aggiungere un evento significa aggiungere una riga a EVENTI, e
// il mondo lo mette in scena da solo all'ora giusta nel posto giusto.
//
// In futuro un'attività autorizzata potrà "ospitare" un evento aggiungendo
// il proprio id qui: il campo `attivita` è già previsto e resta vuoto
// finché non c'è un accordo.

export type TipoEvento = 'mercato' | 'musica' | 'raduno' | 'fiera' | 'luci';

/**
 * Quando un evento vive nel CALENDARIO vero, non solo nell'orologio del
 * gioco. Serviva: un mercato non c'è la domenica, un raduno è di domenica,
 * e le luci d'inverno non stanno accese ad agosto.
 *
 * Le date si scrivono "MM-GG" per quello che torna ogni anno, oppure
 * "AAAA-MM-GG" per quello che succede una volta sola. Una finestra che
 * scavalca il capodanno (dal 12-06 al 01-06) è ammessa e funziona.
 *
 * ATTENZIONE: qui vanno gli eventi del GIOCO. Un evento vero della città
 * si aggiunge solo con informazioni verificate — data, luogo e nome — e
 * mai attribuendolo a un'attività che non l'ha autorizzato.
 */
export interface FinestraCalendario {
  /** Giorni della settimana ammessi (0 = domenica). Assente = tutti. */
  giorni?: number[];
  /** Prima data compresa. */
  dal?: string;
  /** Ultima data compresa. */
  al?: string;
}

export interface EventoMondo {
  id: string;
  titolo: string;
  /** La riga che compare quando ci arrivi. */
  testo: string;
  /** Id del POI attorno a cui si svolge. */
  poi: string;
  /** Finestra oraria (24h). */
  daOra: number;
  aOra: number;
  tipo: TipoEvento;
  /** Quando succede nel calendario; assente = tutti i giorni dell'anno. */
  calendario?: FinestraCalendario;
  /** Id dell'attività che lo ospita, quando autorizzata. */
  attivita?: string;
}

export const EVENTI: EventoMondo[] = [
  {
    id: 'mercato_pavaglione',
    titolo: 'Mercato del Pavaglione',
    testo: 'Banchi sotto le logge: il mercato è il cuore della mattina.',
    poi: 'pavaglione',
    daOra: 7,
    aOra: 13.5,
    tipo: 'mercato',
    // di domenica i banchi non ci sono
    calendario: { giorni: [1, 2, 3, 4, 5, 6] },
  },
  {
    id: 'musica_baracca',
    titolo: 'Musica in Piazza Baracca',
    testo: 'Palco, casse e gente: stasera si suona sotto la stele.',
    poi: 'baracca',
    daOra: 18.5,
    aOra: 23.5,
    tipo: 'musica',
    // si suona il venerdì e il sabato, e solo da aprile a settembre
    calendario: { giorni: [5, 6], dal: '04-01', al: '09-30' },
  },
  {
    id: 'raduno_rocca',
    titolo: 'Raduno di bici alla Rocca',
    testo: 'Il gruppo del giro domenicale si trova qui, in fila davanti alla Rocca.',
    poi: 'rocca',
    daOra: 8,
    aOra: 11,
    tipo: 'raduno',
    // il giro è domenicale: il nome lo dice già
    calendario: { giorni: [0] },
  },
  {
    id: 'fiera_martiri',
    titolo: 'Fiera in Piazza dei Martiri',
    testo: 'Gazebi e luci: la piazza si veste a festa.',
    poi: 'pavaglione',
    daOra: 15,
    aOra: 20,
    tipo: 'fiera',
    // fiera nei fine settimana della bella stagione
    calendario: { giorni: [6, 0], dal: '04-15', al: '09-15' },
  },
  {
    id: 'luci_inverno',
    titolo: 'Luci d’inverno',
    testo: 'Le luminarie sono accese: il centro cambia faccia appena fa buio.',
    poi: 'pavaglione',
    daOra: 16.5,
    aOra: 23.5,
    tipo: 'luci',
    // dall'inizio di dicembre all'Epifania: la finestra scavalca il capodanno
    calendario: { dal: '12-01', al: '01-06' },
  },
];

/** "MM-GG" → 1231; "AAAA-MM-GG" → 1231 (l'anno lo controlla `annoDi`). */
function giornoDellAnno(data: string): number {
  const p = data.split('-');
  const mm = Number(p[p.length - 2]);
  const gg = Number(p[p.length - 1]);
  return mm * 100 + gg;
}

/** L'anno scritto nella data, se c'è: le date con anno valgono una volta sola. */
function annoDi(data: string): number | null {
  const p = data.split('-');
  return p.length === 3 ? Number(p[0]) : null;
}

/** true se la data di oggi cade nella finestra dell'evento. */
export function nelCalendario(f: FinestraCalendario | undefined, quando: Date): boolean {
  if (!f) return true;
  if (f.giorni && !f.giorni.includes(quando.getDay())) return false;
  if (!f.dal && !f.al) return true;
  const oggi = (quando.getMonth() + 1) * 100 + quando.getDate();
  const anno = quando.getFullYear();
  const aDal = f.dal ? annoDi(f.dal) : null;
  const aAl = f.al ? annoDi(f.al) : null;
  if (aDal !== null && anno < aDal) return false;
  if (aAl !== null && anno > aAl) return false;
  const dal = f.dal ? giornoDellAnno(f.dal) : 101;
  const al = f.al ? giornoDellAnno(f.al) : 1231;
  // una finestra che scavalca il capodanno è vera "fuori" dall'intervallo
  return dal <= al ? oggi >= dal && oggi <= al : oggi >= dal || oggi <= al;
}

/** Gli eventi in corso: giusti di ora E giusti di giorno. */
export function eventiAttivi(ora: number, quando: Date = new Date()): EventoMondo[] {
  return EVENTI.filter(
    (e) => ora >= e.daOra && ora < e.aOra && nelCalendario(e.calendario, quando),
  );
}

/** Gli eventi previsti oggi, anche quelli che devono ancora cominciare. */
export function eventiDiOggi(quando: Date = new Date()): EventoMondo[] {
  return EVENTI.filter((e) => nelCalendario(e.calendario, quando)).sort((a, b) => a.daOra - b.daOra);
}
