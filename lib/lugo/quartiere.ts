// Il capitolo 3 — «IL QUARTIERE»: la città comincia a conoscerti. Qui
// vivono i DATI delle tre storie coi personaggi ricorrenti (la spesa di
// Otello, il maranza pentito, le luci del Rossini): le mete risolte dal
// registro delle attività vere, le fabbriche delle missioni dinamiche e il
// ponte con cui HUD e Player parlano col regista (components/lugo/
// Quartiere.tsx). È un modulo PURO come maranza.ts: niente React, niente
// store, niente THREE — chi lo importa non si porta dietro nulla.
//
// Le tre missioni sono DINAMICHE come la m00, e per lo stesso motivo: le
// tappe puntano ad attività VERE risolte a runtime dal registro del mondo
// (mai coordinate cieche nel codice), storiaFinita non le conta e le
// bacheche non le ripescano mai. Chiuse una volta, 'q01'/'q02'/'q03'
// finiscono in missioniFatte — già salvato e validato — e non ripartono.
//
// REGOLE LEGALI, le stesse della m00: delle attività reali si usano SOLO
// nome e categoria, già pubblici su OpenStreetMap. Niente promozioni,
// niente prezzi, niente partnership. Otello, il maranza pentito e il
// custode sono personaggi di FANTASIA: nessun nome di persona reale.

import type { MondoLugo } from './loadMap';
import { puntoStradaVicino } from './car';
import { registraDinamica, type Missione } from './missions';
import { ANCORA_PRIMO_INCONTRO, ANCORE_QUARTIERE } from './npc';

/** I tre volti fissi del capitolo. */
export type ChiQuartiere = 'otello' | 'pentito' | 'custode';

export const CHI_QUARTIERE: readonly ChiQuartiere[] = ['otello', 'pentito', 'custode'];

/** La missione di ciascun personaggio: un posto solo per gli id. */
export const MISSIONE_DI: Record<ChiQuartiere, 'q01' | 'q02' | 'q03'> = {
  otello: 'q01',
  pentito: 'q02',
  custode: 'q03',
};

/**
 * Gli sblocchi, dichiarati in un posto solo: q01 chiede la m00 fatta e il
 * livello 2 (Otello ti RICONOSCE: senza la m00 non c'è nessun «ragazzo del
 * pacchetto» da riconoscere), q02 chiede la q01 (il pentito si fida di chi
 * già fa commissioni per il quartiere), q03 il livello 3. Il livello si
 * passa da fuori già riletto dalla reputazione (livelloDaRep), con la
 * stessa diffidenza di capitoli.ts verso i derivati dei derivati.
 */
export function sbloccoQuartiere(
  chi: ChiQuartiere,
  missioniFatte: string[],
  livello: number,
): boolean {
  if (chi === 'otello') return missioniFatte.includes('m00') && livello >= 2;
  if (chi === 'pentito') return missioniFatte.includes('q01');
  return livello >= 3;
}

/**
 * Il ponte fra il quartiere e il resto del gioco, nello schema di
 * pontePrimoIncontro: chi sa una cosa la scrive qui, chi ne ha bisogno la
 * legge nel proprio giro di frame. Non è stato dello store apposta — le
 * posizioni dei tre personaggi cambiano col ciclo di gioco, e passare da
 * React vorrebbe dire un re-render per ogni passo di un pedone.
 */
export const ponteQuartiere = {
  /** Per personaggio: pronto a parlare (per la E del Player) e dove sta. */
  personaggi: {
    otello: { disponibile: false, x: 0, z: 0 },
    pentito: { disponibile: false, x: 0, z: 0 },
    custode: { disponibile: false, x: 0, z: 0 },
  } as Record<ChiQuartiere, { disponibile: boolean; x: number; z: number }>,
  /** Il Player ha premuto E davanti a uno di loro: Quartiere apre il pannello. */
  parla: null as ChiQuartiere | null,
  /** La scelta del pannello (la scrive Hud.rispondi, la consuma Quartiere). */
  scelta: null as string | null,
  /** true mentre il pentito ti sta seguendo verso il bar (q02, «accompagnalo»). */
  segue: false,
};

/** I nomi che leggono i pannelli: come nomeBar della m00, senza articolo. */
export interface MetaQuartiere {
  nome: string;
  /** Dove manda davvero la tappa (porta del negozio o carreggiata vicina). */
  x: number;
  z: number;
}

interface MeteQuartiere {
  spesa: MetaQuartiere;
  paste: MetaQuartiere;
  bar: MetaQuartiere;
  farmacia: MetaQuartiere;
  tabacchi: MetaQuartiere;
  negozio: MetaQuartiere;
}

// Le mete si risolvono UNA volta per mondo e si tengono qui: i dialoghi le
// nominano prima ancora che una missione esista, e rifare la scansione dei
// 110 negozi a ogni apertura di pannello sarebbe lavoro buttato.
const meteCache = new WeakMap<MondoLugo, MeteQuartiere>();

type Libero = (x: number, z: number, raggio: number) => boolean;

/**
 * La tappa sta SULLA PORTA quando il nodo OSM è in aria libera, altrimenti
 * sulla carreggiata più vicina: è la stessa lezione della m00, dove la
 * proiezione cieca spediva la consegna a 53 metri dal bancone.
 */
function puntoMeta(
  mondo: MondoLugo,
  dest: { x: number; z: number },
  libero?: Libero,
): { x: number; z: number } {
  if (libero && libero(dest.x, dest.z, 0.6)) return { x: dest.x, z: dest.z };
  return puntoStradaVicino(mondo, dest.x, dest.z);
}

/**
 * L'attività VERA più vicina a (x,z) che passa il filtro, col nome. Le
 * senza nome si scartano subito: «Porta le paste al » senza destinatario è
 * il pannello più triste che il gioco possa mostrare.
 */
function negozioVicino(
  mondo: MondoLugo,
  x: number,
  z: number,
  filtro: (n: { nome: string; categoria: string; osm?: string }) => boolean,
): { nome: string; x: number; z: number } | null {
  let scelto: { nome: string; x: number; z: number } | null = null;
  let dMin = Infinity;
  for (const n of mondo.negozi) {
    if (!n.nome || !filtro(n)) continue;
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < dMin) {
      dMin = d;
      scelto = n;
    }
  }
  return scelto;
}

/**
 * Risolve tutte le mete del quartiere dal registro del mondo.
 *  - La SPESA di Otello: il supermercato vero più vicino al suo spiazzo.
 *    Si cerca prima per etichetta OSM 'supermarket' (la categoria 'cibo'
 *    del gioco mette insieme ristoranti e pasticcerie, e «ritira la spesa
 *    al ristorante» non sta in piedi), col ripiego sul 'cibo' più vicino.
 *  - Le PASTE del pentito: una 'confectionery' se c'è, se no il 'cibo' più
 *    vicino al Pavaglione; il BAR delle scuse è il bar più vicino.
 *  - Le tre cose del CUSTODE: farmacia, tabacchi e negozio più vicini al
 *    teatro — tre categorie diverse per costruzione. Il ripiego, se una
 *    categoria sparisse dai dati OSM, è il 'servizi' più vicino: brutto ma
 *    mai un crash, come il «bar del centro» della m00.
 */
function risolviMete(mondo: MondoLugo, libero?: Libero): MeteQuartiere {
  const memo = meteCache.get(mondo);
  if (memo) return memo;

  const ot = ANCORA_PRIMO_INCONTRO;
  const pe = ANCORE_QUARTIERE.pentito;
  const cu = ANCORE_QUARTIERE.custode;

  const meta = (
    dest: { nome: string; x: number; z: number } | null,
    ripiego: string,
    vicinoA: { x: number; z: number },
  ): MetaQuartiere => {
    const p = dest ? puntoMeta(mondo, dest, libero) : puntoStradaVicino(mondo, vicinoA.x, vicinoA.z);
    return { nome: dest?.nome || ripiego, x: p.x, z: p.z };
  };

  const spesa =
    negozioVicino(mondo, ot.x, ot.z, (n) => n.osm === 'supermarket') ??
    negozioVicino(mondo, ot.x, ot.z, (n) => n.categoria === 'cibo');
  const paste =
    negozioVicino(mondo, pe.x, pe.z, (n) => n.osm === 'confectionery' || n.osm === 'bakery') ??
    negozioVicino(mondo, pe.x, pe.z, (n) => n.categoria === 'cibo');
  const bar = negozioVicino(mondo, pe.x, pe.z, (n) => n.categoria === 'bar');
  const servizi = (p: { x: number; z: number }) =>
    negozioVicino(mondo, p.x, p.z, (n) => n.categoria === 'servizi');
  const farmacia = negozioVicino(mondo, cu.x, cu.z, (n) => n.categoria === 'farmacia') ?? servizi(cu);
  const tabacchi = negozioVicino(mondo, cu.x, cu.z, (n) => n.categoria === 'tabacchi') ?? servizi(cu);
  const negozio = negozioVicino(mondo, cu.x, cu.z, (n) => n.categoria === 'negozio') ?? servizi(cu);

  const mete: MeteQuartiere = {
    spesa: meta(spesa, 'supermercato del centro', ot),
    paste: meta(paste, 'pasticceria del centro', pe),
    bar: meta(bar, 'bar del Pavaglione', pe),
    farmacia: meta(farmacia, 'farmacia del centro', cu),
    tabacchi: meta(tabacchi, 'tabaccheria del centro', cu),
    negozio: meta(negozio, 'negozio del centro', cu),
  };
  meteCache.set(mondo, mete);
  return mete;
}

/** Le mete risolte, per i dialoghi e per il regista (sola lettura). */
export function meteQuartiere(mondo: MondoLugo, libero?: Libero): MeteQuartiere {
  return risolviMete(mondo, libero);
}

const xz = (p: { x: number; z: number }) => `xz:${p.x.toFixed(1)}:${p.z.toFixed(1)}`;

// ── Le tre fabbriche ────────────────────────────────────────────────────────
// Tipo 'storia' APPOSTA, pur essendo dinamiche: così al completamento l'id
// finisce in missioniFatte (che si salva) e la guardia del premio unico di
// Missioni.tsx — «una storia paga una volta sola» — le copre già, senza una
// riga in più. Fuori da MISSIONI restano invisibili a storiaFinita e alle
// bacheche: nessun ripescaggio fra i classici.

/** q01 «La spesa di Otello»: ritiro al supermercato, ritorno allo spiazzo. */
export function creaMissioneSpesa(mondo: MondoLugo, libero?: Libero): Missione {
  const mete = risolviMete(mondo, libero);
  const m: Missione = {
    id: 'q01',
    tipo: 'storia',
    categoria: 'storia',
    difficolta: 'facile',
    livelloRichiesto: 2,
    titolo: 'La spesa di Otello',
    descrizione: `La spesa di Otello è pronta al ${mete.spesa.nome}: ritirala e riportagliela allo spiazzo dietro la Rocca.`,
    frase: '“Già pagata, eh! C’è solo da portarla. Con le mie gambe, capisci…”',
    tappe: [
      { poi: xz(mete.spesa), titolo: `Ritira la spesa al ${mete.spesa.nome}` },
      { poi: xz(ANCORA_PRIMO_INCONTRO), titolo: 'Riporta la spesa a Otello' },
    ],
    ricompensa: 20,
    denaro: 15,
  };
  registraDinamica(m);
  return m;
}

/**
 * q02 «Il maranza pentito»: le scuse e le paste al bar. Due FORME, un id:
 * la classica ha due tappe (paste, poi bar), l'accompagnata una sola —
 * andate insieme al bar, le paste le porta lui. La forma la decide la
 * scelta nel dialogo, quindi la missione si costruisce SOLO in quel
 * momento: costruirla prima avrebbe voluto dire tenerne due registrate e
 * sperare che nessuno avvii quella sbagliata.
 */
export function creaMissioneScuse(
  mondo: MondoLugo,
  accompagnato: boolean,
  libero?: Libero,
): Missione {
  const mete = risolviMete(mondo, libero);
  const m: Missione = {
    id: 'q02',
    tipo: 'storia',
    categoria: 'storia',
    difficolta: 'facile',
    livelloRichiesto: 2,
    titolo: 'Il maranza pentito',
    descrizione: accompagnato
      ? `Accompagna il pentito al ${mete.bar.nome}: le scuse le fa lui, di persona.`
      : `Porta le scuse del pentito (e un pacchetto di paste da ${mete.paste.nome}) al ${mete.bar.nome}.`,
    frase: accompagnato
      ? '“Cammina avanti tu, che io intanto ripasso le scuse.”'
      : '“Di’ che mi dispiace. E che le paste sono quelle buone.”',
    tappe: accompagnato
      ? [{ poi: xz(mete.bar), titolo: `Accompagna il pentito al ${mete.bar.nome}`, aPiedi: true }]
      : [
          { poi: xz(mete.paste), titolo: `Ritira le paste da ${mete.paste.nome}` },
          { poi: xz(mete.bar), titolo: `Porta paste e scuse al ${mete.bar.nome}` },
        ],
    ricompensa: 25,
    denaro: 10,
  };
  registraDinamica(m);
  return m;
}

/**
 * q03 «Le luci del Rossini»: tre cose da tre attività vere di categorie
 * diverse, poi il ritorno al teatro. Le tappe sono IN SEQUENZA perché il
 * motore delle missioni avanza una tappa alla volta (Missioni.tsx legge
 * solo m.tappe[s.tappa]): la libertà d'ordine avrebbe chiesto di
 * riscrivere la macchina, e il mandato dice esplicitamente di non farlo.
 */
export function creaMissioneLuci(mondo: MondoLugo, libero?: Libero): Missione {
  const mete = risolviMete(mondo, libero);
  const cu = ANCORE_QUARTIERE.custode;
  const m: Missione = {
    id: 'q03',
    tipo: 'storia',
    categoria: 'storia',
    difficolta: 'media',
    livelloRichiesto: 3,
    titolo: 'Le luci del Rossini',
    descrizione:
      'Al custode del Teatro Rossini mancano tre cose per la serata: farmacia, tabacchi e negozio, poi si torna al teatro.',
    frase: '“Tre cose, tre botteghe, una serata sola.”',
    tappe: [
      { poi: xz(mete.farmacia), titolo: `Passa in farmacia: ${mete.farmacia.nome}` },
      { poi: xz(mete.tabacchi), titolo: `Passa da ${mete.tabacchi.nome}` },
      { poi: xz(mete.negozio), titolo: `Passa da ${mete.negozio.nome}` },
      { poi: xz({ x: cu.x, z: cu.z }), titolo: 'Torna dal custode al Teatro Rossini' },
    ],
    ricompensa: 30,
    denaro: 25,
  };
  registraDinamica(m);
  return m;
}

// ── Gli aiuti per Player e HUD ──────────────────────────────────────────────

/**
 * Il personaggio del quartiere disponibile più vicino entro `raggio`: lo
 * usano il gradino E e l'hint del Player, così i due leggono la STESSA
 * regola — se divergessero, il suggerimento sarebbe una bugia proprio nel
 * momento in cui serve (la lezione della scala della E).
 */
export function quartiereVicino(x: number, z: number, raggio = 3.4): ChiQuartiere | null {
  let scelto: ChiQuartiere | null = null;
  let dMin = raggio;
  for (const chi of CHI_QUARTIERE) {
    const p = ponteQuartiere.personaggi[chi];
    if (!p.disponibile) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < dMin) {
      dMin = d;
      scelto = chi;
    }
  }
  return scelto;
}

/** Il testo dell'hint, accanto alla regola che lo fa comparire. */
export const HINT_QUARTIERE: Record<ChiQuartiere, string> = {
  otello: 'Premi E per parlare con Otello',
  pentito: 'Premi E per parlare col maranza pentito',
  custode: 'Premi E per parlare col custode del teatro',
};
