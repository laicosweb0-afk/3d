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

/**
 * I dati di presentazione stanno FUORI dal codice, in
 * `public/lugo/attivita.json`: nome e categoria arrivano da OpenStreetMap,
 * il resto (riga di presentazione, colori dell'insegna, eventuale logo o
 * promozione autorizzata) si aggiorna cambiando quel file, senza toccare
 * il motore. Finché il file è vuoto — e di serie lo è — il gioco mostra
 * solo nome e categoria, e nessuna attività risulta partner.
 */
/**
 * Il livello di presenza di un'attività dentro Lugo City. NESSUNO è il
 * default e non richiede nulla: l'attività esiste con nome e categoria,
 * come già pubblici su OpenStreetMap. Gli altri livelli descrivono cosa
 * l'esercente ha AUTORIZZATO, e si attivano solo dal file dei dati.
 */
export type LivelloPartner = 'NESSUNO' | 'BASE' | 'BOTTEGA' | 'PREMIUM';

const LIVELLI_PARTNER: readonly LivelloPartner[] = ['NESSUNO', 'BASE', 'BOTTEGA', 'PREMIUM'];

export interface SchedaAttivita {
  descrizione?: string;
  /** Livello autorizzato: NESSUNO se assente. */
  livello?: LivelloPartner;
  insegna?: { fondo?: string; testo?: string; tenda?: string };
  partner?: boolean;
  promo?: string | null;
  logo?: string | null;
  banner?: string | null;
  sito?: string | null;
}

let schede: Record<string, SchedaAttivita> = {};
let schedeCaricate = false;

/** Carica una volta sola le schede autorizzate. Se manca il file, pazienza. */
export async function caricaSchedeAttivita(base = ''): Promise<void> {
  if (schedeCaricate) return;
  schedeCaricate = true;
  try {
    const res = await fetch(`${base}/lugo/attivita.json`, { cache: 'force-cache' });
    if (!res.ok) return;
    const dati = (await res.json()) as { attivita?: Record<string, SchedaAttivita> };
    if (dati && typeof dati.attivita === 'object' && dati.attivita) schede = dati.attivita;
  } catch {
    // nessuna scheda: si resta ai soli nome e categoria pubblici
  }
}

/** La scheda autorizzata di un'attività, se c'è. */
export function schedaDi(nome: string): SchedaAttivita | undefined {
  return schede[nome];
}

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
  /**
   * Quanto l'attività è presente nel gioco. Sale SOLO con l'autorizzazione
   * dell'esercente, scritta in public/lugo/attivita.json:
   *  - NESSUNO: nome e categoria, niente altro (è il default di tutte);
   *  - BASE: più la riga di presentazione e i colori dell'insegna;
   *  - BOTTEGA: più una missione dedicata e la sua ricompensa;
   *  - PREMIUM: più eventi e contenuti su misura.
   */
  livelloPartner: LivelloPartner;
  /** Promo autorizzata dall'esercente; null finché non c'è accordo. */
  promo: string | null;
  /** Logo autorizzato; null finché non c'è accordo. */
  logo: string | null;
  sito: string | null;
  /** Colori dell'insegna, se l'esercente ne ha forniti. */
  insegna?: { fondo?: string; testo?: string; tenda?: string };
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

/**
 * L'id di un'attività NON può essere la sua posizione nell'array: quello
 * lo decide tools/lugo/build-map.mjs ordinando per distanza dal centro, e
 * basta che a Lugo apra o chiuda una bottega perché tutti gli indici
 * successivi slittino. Siccome l'id finisce nel salvataggio del giocatore
 * (poiVisitati), il diario dichiarerebbe visitati posti mai visti. Qui si
 * ricava invece dal nome e dalla posizione, che in OSM non cambiano.
 */
/**
 * L'hash FNV-1a di una stringa. Nasce qui per fare gli id stabili delle
 * attività, ma serve anche a chi deve dare a una bottega un colore tutto
 * suo: lo stesso nome deve dare sempre lo stesso numero, su ogni computer
 * e a ogni partita.
 */
export function hashNome(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function idStabile(nome: string, x: number, z: number): string {
  return 'att_' + hashNome(`${nome}|${Math.round(x)}|${Math.round(z)}`).toString(36);
}

const cache = new WeakMap<MondoLugo, Attivita[]>();

/** Il registro completo, costruito una volta sola per mondo. */
export function registroAttivita(mondo: MondoLugo): Attivita[] {
  const gia = cache.get(mondo);
  if (gia) return gia;
  // i nomi che compaiono più di una volta (catene, filiali) non possono
  // risolvere una scheda: l'autorizzazione di un esercente non deve mai
  // finire addosso a un omonimo che non ha autorizzato nulla
  const quantiConNome = new Map<string, number>();
  for (const n of mondo.negozi) {
    const k = n.nome || '';
    quantiConNome.set(k, (quantiConNome.get(k) ?? 0) + 1);
  }
  const idUsati = new Set<string>();

  const out: Attivita[] = mondo.negozi.map((n) => {
    const categoria = normalizza(n.categoria);
    const listino = LISTINI[categoria];
    const nome = n.nome || 'Attività del centro';
    // la scheda vale solo se esiste, è stata autorizzata e il nome
    // identifica una sola attività
    const sch = (quantiConNome.get(n.nome || '') ?? 0) === 1 ? schedaDi(nome) : undefined;
    let id = idStabile(nome, n.x, n.z);
    // due botteghe con lo stesso nome allo stesso metro sono impossibili in
    // OSM, ma se capitasse non devono condividere l'identità
    for (let k = 2; idUsati.has(id); k++) id = idStabile(nome + '#' + k, n.x, n.z);
    idUsati.add(id);
    // il livello vale solo con l'autorizzazione: senza `partner: true` resta
    // NESSUNO qualunque cosa dica il file dei dati
    const livello: LivelloPartner =
      sch?.partner === true && sch.livello && LIVELLI_PARTNER.includes(sch.livello)
        ? sch.livello
        : 'NESSUNO';
    return {
      id,
      nome,
      categoria,
      x: n.x,
      z: n.z,
      descrizione: sch?.descrizione || listino.desc,
      articoli: listino.articoli,
      partner: sch?.partner === true,
      livelloPartner: livello,
      promo: sch?.partner === true ? (sch.promo ?? null) : null,
      logo: sch?.partner === true ? (sch.logo ?? null) : null,
      sito: sch?.sito ?? null,
      // anche i colori dell'insegna sono materiale dell'esercente: valgono
      // solo se ha autorizzato, e solo sopra il livello NESSUNO
      insegna: sch?.partner === true && livello !== 'NESSUNO' ? sch.insegna : undefined,
      // bar e locali ospitano missioni perché è la loro natura; le altre
      // categorie solo se l'esercente ha autorizzato quel livello
      missioni:
        categoria === 'bar' ||
        categoria === 'cibo' ||
        livello === 'BOTTEGA' ||
        livello === 'PREMIUM',
      // gli eventi su misura sono l'ultimo gradino, e sono sempre concordati
      eventi: livello === 'PREMIUM',
    };
  });
  cache.set(mondo, out);
  return out;
}

/**
 * L'UNICA porta da cui può uscire il percorso di un logo. Restituisce
 * qualcosa solo se tutte insieme: l'attività è partner, il livello
 * autorizzato è sopra NESSUNO, il percorso c'è, sta sotto /lugo/insegne/ e
 * non contiene doppi punti o risalite di cartella.
 *
 * Non è pignoleria: un logo è il marchio di qualcuno, e finisce a schermo
 * dentro un gioco. Se un giorno qualcuno scrive nel file dei dati il logo
 * di un'attività che non ha autorizzato niente, deve non comparire — e il
 * collaudo prova proprio questa funzione coi casi cattivi, non solo col
 * caso buono.
 */
export function logoAutorizzato(a: {
  partner: boolean;
  livelloPartner: LivelloPartner;
  logo: string | null;
}): string | null {
  if (a.partner !== true) return null;
  if (!a.livelloPartner || a.livelloPartner === 'NESSUNO') return null;
  const p = a.logo;
  if (typeof p !== 'string' || p.length < 2 || p.length > 200) return null;
  if (!p.startsWith('/lugo/insegne/')) return null;
  if (p.includes('..') || p.includes('//') || p.includes(':')) return null;
  return p;
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
