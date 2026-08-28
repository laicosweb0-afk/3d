// Gli eventi del mondo: cosa succede a Lugo, e quando. Sono DATI, non
// codice: aggiungere un evento significa aggiungere una riga a EVENTI, e
// il mondo lo mette in scena da solo all'ora giusta nel posto giusto.
//
// In futuro un'attività autorizzata potrà "ospitare" un evento aggiungendo
// il proprio id qui: il campo `attivita` è già previsto e resta vuoto
// finché non c'è un accordo.

export type TipoEvento = 'mercato' | 'musica' | 'raduno' | 'fiera';

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
  },
  {
    id: 'musica_baracca',
    titolo: 'Musica in Piazza Baracca',
    testo: 'Palco, casse e gente: stasera si suona sotto la stele.',
    poi: 'baracca',
    daOra: 18.5,
    aOra: 23.5,
    tipo: 'musica',
  },
  {
    id: 'raduno_rocca',
    titolo: 'Raduno di bici alla Rocca',
    testo: 'Il gruppo del giro domenicale si trova qui, in fila davanti alla Rocca.',
    poi: 'rocca',
    daOra: 8,
    aOra: 11,
    tipo: 'raduno',
  },
  {
    id: 'fiera_martiri',
    titolo: 'Fiera in Piazza dei Martiri',
    testo: 'Gazebi e luci: la piazza si veste a festa.',
    poi: 'pavaglione',
    daOra: 15,
    aOra: 20,
    tipo: 'fiera',
  },
];

/** Gli eventi in corso a una certa ora. */
export function eventiAttivi(ora: number): EventoMondo[] {
  return EVENTI.filter((e) => ora >= e.daOra && ora < e.aOra);
}
