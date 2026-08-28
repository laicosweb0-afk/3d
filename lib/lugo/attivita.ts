// Il registro delle attività di Lugo: un sistema DATI, deliberatamente
// separato dal motore di gioco. Le attività nascono dai nomi veri già
// presenti in OpenStreetMap (public/lugo/map.json) e da qui possono
// diventare punti sulla mappa, vetrine visitabili, missioni o eventi.
//
// Regola importante, scritta nel codice perché non si perda: nel gioco
// un'attività reale compare SOLO come nome e categoria, esattamente come
// è già pubblica su OpenStreetMap. Nessun logo, nessun prezzo reale,
// nessuna promozione e nessuna dicitura di partnership finché
// l'esercente non ha dato la sua autorizzazione: i campi `partner`,
// `promo` e `logo` restano vuoti fino ad allora, e la UI mostra la
// dicitura di partner solo se `partner === true`.

import type { MondoLugo } from './loadMap';

export type CategoriaAttivita =
  | 'bar'
  | 'cibo'
  | 'tabacchi'
  | 'farmacia'
  | 'negozio'
  | 'servizi';

export interface ArticoloAttivita {
  nome: string;
  prezzo: number;
  /** Effetto dell'acquisto: cambia vestito, tenta la fortuna, o niente. */
  effetto?: 'outfit' | 'fortuna' | 'ristoro';
}

export interface Attivita {
  id: string;
  nome: string;
  categoria: CategoriaAttivita;
  x: number;
  z: number;
  /** Testo mostrato nella vetrina. */
  descrizione: string;
  articoli: ArticoloAttivita[];
  /** true solo per attività che hanno dato autorizzazione scritta. */
  partner: boolean;
  /** Promo autorizzata dall'esercente; null finché non c'è accordo. */
  promo: string | null;
  /** Logo autorizzato; null finché non c'è accordo. */
  logo: string | null;
  sito: string | null;
  /** L'attività può ospitare missioni / eventi (per il futuro). */
  missioni: boolean;
  eventi: boolean;
}

/** Cosa vende ogni categoria: prezzi di fantasia, tondi e credibili. */
const LISTINI: Record<CategoriaAttivita, { desc: string; articoli: ArticoloAttivita[] }> = {
  bar: {
    desc: 'Caffè, brioche e chiacchiere. Il posto dove si sa tutto di tutti.',
    articoli: [
      { nome: 'Caffè al banco', prezzo: 1.2, effetto: 'ristoro' },
      { nome: 'Brioche', prezzo: 1.5, effetto: 'ristoro' },
      { nome: 'Spritz', prezzo: 6, effetto: 'ristoro' },
    ],
  },
  cibo: {
    desc: 'Si mangia. In Romagna non è un dettaglio.',
    articoli: [
      { nome: 'Piadina crudo e squacquerone', prezzo: 5, effetto: 'ristoro' },
      { nome: 'Cappelletti', prezzo: 12, effetto: 'ristoro' },
    ],
  },
  tabacchi: {
    desc: 'Sigarette, valori bollati e la speranza di un gratta e vinci.',
    articoli: [
      { nome: 'Gratta e vinci', prezzo: 5, effetto: 'fortuna' },
      { nome: 'Pacchetto', prezzo: 6 },
    ],
  },
  farmacia: {
    desc: 'Turni, consigli e cerotti per le ginocchia sbucciate.',
    articoli: [{ nome: 'Cerotti', prezzo: 4, effetto: 'ristoro' }],
  },
  negozio: {
    desc: 'Vetrina sul corso: qui ci si veste.',
    articoli: [
      { nome: 'Maglietta', prezzo: 25, effetto: 'outfit' },
      { nome: 'Felpa', prezzo: 45, effetto: 'outfit' },
      { nome: 'Giubbotto', prezzo: 89, effetto: 'outfit' },
    ],
  },
  servizi: {
    desc: 'Un’attività del centro.',
    articoli: [],
  },
};

function normalizza(c: string | undefined): CategoriaAttivita {
  if (c === 'bar' || c === 'cibo' || c === 'tabacchi' || c === 'farmacia') return c;
  if (c === 'negozio') return 'negozio';
  return 'servizi';
}

const cache = new WeakMap<MondoLugo, Attivita[]>();

/** Il registro completo, costruito una volta sola per mondo. */
export function registroAttivita(mondo: MondoLugo): Attivita[] {
  const gia = cache.get(mondo);
  if (gia) return gia;
  const out: Attivita[] = mondo.negozi.map((n, i) => {
    const categoria = normalizza(n.categoria);
    const listino = LISTINI[categoria];
    return {
      id: 'att_' + i,
      nome: n.nome || 'Attività del centro',
      categoria,
      x: n.x,
      z: n.z,
      descrizione: listino.desc,
      articoli: listino.articoli,
      // finché non c'è un accordo firmato, questi restano così
      partner: false,
      promo: null,
      logo: null,
      sito: null,
      missioni: categoria === 'bar' || categoria === 'cibo',
      eventi: false,
    };
  });
  cache.set(mondo, out);
  return out;
}

/** L'attività più vicina entro `raggio`, o null. */
export function attivitaVicina(
  mondo: MondoLugo,
  x: number,
  z: number,
  raggio = 9,
): Attivita | null {
  let best: Attivita | null = null;
  let dBest = raggio * raggio;
  for (const a of registroAttivita(mondo)) {
    const d = (a.x - x) ** 2 + (a.z - z) ** 2;
    if (d < dBest) {
      dBest = d;
      best = a;
    }
  }
  return best;
}

/** Colore del marker per categoria (minimappa e insegne). */
export const COLORE_CATEGORIA: Record<CategoriaAttivita, string> = {
  bar: '#E8A33D',
  cibo: '#D9603F',
  tabacchi: '#3E6FB0',
  farmacia: '#2ECC6E',
  negozio: '#B07ACB',
  servizi: '#8A8A96',
};
