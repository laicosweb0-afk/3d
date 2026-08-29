// Le auto degli altri: parcheggiate lungo le vie residenziali (solide, coi
// loro collider) e un filo di traffico civile che percorre le strade
// lunghe. Qui vive anche l'infrastruttura condivisa del mondo fisico: una
// sola spatial hash per giocatore, pedoni e ostacoli.

import type { MondoLugo, StradaRT, ColliderRT } from './loadMap';
import { MondoFisico } from './physics';
import { CARROZZERIE } from './carrozzerie';

export const TINTE_PARCO = [
  '#D8D5CE', '#9A9AA2', '#5A6470', '#22366E', '#8A2E28', '#3A3A40', '#C8C0A8', '#6E7A64',
] as const;

export interface Posteggio {
  x: number;
  z: number;
  yaw: number;
  tinta: number;
  /** Indice in CARROZZERIE: se la guidi, deve avere una sagoma sua. */
  carrozzeria: number;
  /** false quando l'auto non c'è più: resta lo stallo dipinto, non l'auto. */
  presente: boolean;
  /**
   * Il collider di QUESTA auto dentro la spatial hash, o null se l'auto
   * non c'è. Il riferimento si tiene qui perché la hash confronta per
   * identità: senza l'oggetto esatto non si può togliere niente. E il
   * null è la guardia contro il doppio inserimento — un'auto ceduta non ha
   * più un ingombro da cedere una seconda volta.
   */
  collider: ColliderRT | null;
  /**
   * true per gli stalli veri, dipinti di blu sull'asfalto; false per i
   * posti di riserva in coda, che non sono un parcheggio di Lugo ma solo
   * un'istanza libera dove far restare un'auto abbandonata.
   */
  stallo: boolean;
}

export interface AutoCivile {
  percorso: Float32Array;
  lunghezza: number;
  s: number;
  verso: 1 | -1;
  /** La velocità di crociera che si è scelta: il suo massimo, non la sua. */
  velocita: number;
  /** La velocità VERA di adesso: può andare a zero se ti pari davanti. */
  vAttuale: number;
  /** Da quanto sta ferma per colpa tua: dopo la pazienza, suona. */
  attesa: number;
  /** true da quando gliel'hai portata via. */
  rubata: boolean;
  /** Secondi al rientro in circolazione, lontano dai tuoi occhi. */
  rientro: number;
  carrozzeria: number;
  colore: string;
  x: number;
  z: number;
  yaw: number;
}

function lcg(seme: { s: number }): number {
  seme.s = (seme.s * 1664525 + 1013904223) >>> 0;
  return seme.s / 4294967296;
}

function lunghezzaStrada(r: StradaRT): number {
  let l = 0;
  for (let i = 0; i + 3 < r.pts.length; i += 2) {
    l += Math.hypot(r.pts[i + 2] - r.pts[i], r.pts[i + 3] - r.pts[i + 1]);
  }
  return l;
}

const MAX_POSTEGGI = 170;

/**
 * Quanti posti vuoti si allocano in coda ai parcheggi veri.
 *
 * Servono perché gli InstancedMesh di Veicoli.tsx hanno capienza FISSA,
 * decisa una volta al montaggio: quando il giocatore abbandona l'auto che
 * stava guidando, quell'auto deve diventare un'auto in sosta come le
 * altre, e senza un'istanza già allocata dove metterla si scriverebbe
 * fuori dall'array delle matrici. Sei sono i furti d'auto che si possono
 * incatenare senza mai riprendere nessuna delle auto lasciate: oltre, la
 * vecchia semplicemente non resta (vedi posaAuto).
 */
export const RISERVA_POSTEGGI = 6;

function creaParcheggi(mondo: MondoLugo, fisica: MondoFisico): Posteggio[] {
  const seme = { s: 20260 };
  const out: Posteggio[] = [];
  for (const r of mondo.roads) {
    if (r.classe !== 'residenziale' && r.classe !== 'servizio') continue;
    let lato = 1;
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      const ax = r.pts[i];
      const az = r.pts[i + 1];
      const dx = r.pts[i + 2] - ax;
      const dz = r.pts[i + 3] - az;
      const L = Math.hypot(dx, dz);
      if (L < 14) continue;
      const ux = dx / L;
      const uz = dz / L;
      for (let s = 9; s + 5 < L; s += 24) {
        if (out.length >= MAX_POSTEGGI) return out;
        lato = -lato;
        if (lcg(seme) > 0.55) continue;
        const off = (r.larghezza / 2 - 0.95) * lato;
        const x = ax + ux * s - uz * off;
        const z = az + uz * s + ux * off;
        if (!fisica.cerchioLibero(x, z, 1.5)) continue;
        const yaw = Math.atan2(uz * lato, ux * lato); // parcheggiata nel verso del suo lato
        const tinta = Math.floor(lcg(seme) * TINTE_PARCO.length);
        // La carrozzeria si DERIVA da indice e tinta invece di pescarla
        // dall'LCG: un'estrazione in più sposterebbe il seme e
        // ridisegnerebbe tutti i parcheggi di Lugo, cioè cambierebbe la
        // città per aggiungere una sagoma.
        out.push({
          x,
          z,
          yaw,
          tinta,
          carrozzeria: (out.length + tinta) % CARROZZERIE.length,
          presente: true,
          collider: fisica.aggiungiObb(x, z, 1.85, 0.85, yaw),
          stallo: true,
        });
      }
    }
  }
  return out;
}

/**
 * Toglie dal mondo l'auto in sosta numero `i`: sparisce l'istanza e
 * sparisce l'ingombro. La riga blu dello stallo resta dipinta sull'asfalto,
 * perché è quello che si vede dal vivo ed è ciò che rende leggibile che lì
 * un'auto c'era.
 */
export function prendiPosteggio(infra: InfraGioco, i: number): boolean {
  const p = infra.parcheggi[i];
  if (!p || !p.presente) return false;
  if (p.collider) infra.fisica.rimuoviCollider(p.collider);
  p.collider = null;
  p.presente = false;
  infra.revParcheggi++;
  return true;
}

/**
 * Lascia un'auto dove sta il giocatore: diventa un'auto in sosta come le
 * altre, con il suo collider e la sua istanza. Si cercano prima i posti di
 * riserva in coda e poi quelli liberati dai furti precedenti. Il
 * cerchioLibero chiede solo che non ci sia un muro — l'auto del giocatore
 * nella hash non c'è mai stata. Se non c'è nessuno slot, o il posto è
 * occupato, l'auto vecchia semplicemente non resta: è documentato, ed è
 * preferibile a far crescere un array che alimenta una capienza fissa.
 */
export function posaAuto(
  infra: InfraGioco,
  x: number,
  z: number,
  yaw: number,
  tinta: number,
  carrozzeria: number,
): boolean {
  if (!infra.fisica.cerchioLibero(x, z, 1.2)) return false;
  for (let i = infra.parcheggi.length - 1; i >= 0; i--) {
    const p = infra.parcheggi[i];
    if (p.presente) continue;
    p.x = x;
    p.z = z;
    p.yaw = yaw;
    p.tinta = tinta;
    p.carrozzeria = carrozzeria;
    p.presente = true;
    p.collider = infra.fisica.aggiungiObb(x, z, 1.85, 0.85, yaw);
    infra.revParcheggi++;
    return true;
  }
  return false;
}

/** Distanza dal centro storico (l'origine della mappa è la Rocca). */
function distanzaDalCentro(pts: Float32Array): number {
  const i = (Math.floor(pts.length / 4) * 2) | 0;
  return Math.hypot(pts[i], pts[i + 1]);
}

function creaTraffico(mondo: MondoLugo, quante: number): AutoCivile[] {
  const seme = { s: 777001 };
  const strade = mondo.roads
    .filter((r) => (r.classe === 'secondaria' || r.classe === 'residenziale') && r.pts.length >= 6)
    .map((r) => ({ r, l: lunghezzaStrada(r), d: distanzaDalCentro(r.pts) }));

  // Le strade più lunghe di Lugo sono tutte di cintura: scegliendo solo
  // quelle, il traffico girava in periferia e il centro restava deserto.
  // Metà delle auto nasce quindi vicino al centro, su vie più corte.
  const lunghe = strade
    .filter((c) => c.l > 260)
    .sort((a, b) => b.l - a.l)
    .slice(1); // la più lunga resta alla gazzella
  const centrali = strade
    .filter((c) => c.d < 430 && c.l > 90)
    .sort((a, b) => b.l - a.l);

  const inCentro = Math.ceil(quante / 2);
  const candidate: { r: StradaRT; l: number }[] = [];
  const prese = new Set<Float32Array>();
  const aggiungi = (elenco: typeof strade, massimo: number) => {
    for (const c of elenco) {
      if (candidate.length >= massimo) break;
      if (prese.has(c.r.pts)) continue;
      prese.add(c.r.pts);
      candidate.push(c);
    }
  };
  aggiungi(centrali, inCentro);
  aggiungi(lunghe, quante);
  aggiungi(centrali, quante);

  const out: AutoCivile[] = [];
  for (let i = 0; i < quante && i < candidate.length; i++) {
    const c = candidate[i];
    out.push({
      percorso: c.r.pts,
      lunghezza: c.l,
      s: lcg(seme) * c.l,
      verso: lcg(seme) < 0.5 ? 1 : -1,
      velocita: 5.5 + lcg(seme) * 2.5,
      vAttuale: 0,
      attesa: 0,
      rubata: false,
      rientro: 0,
      // anche qui niente estrazioni nuove dall'LCG: i colori del traffico
      // di Lugo devono restare quelli di sempre
      carrozzeria: i % CARROZZERIE.length,
      colore: TINTE_PARCO[Math.floor(lcg(seme) * TINTE_PARCO.length)],
      x: c.r.pts[0],
      z: c.r.pts[1],
      yaw: 0,
    });
  }
  return out;
}

const CORSIA = 1.6; // guida a destra

/**
 * I numeri del traffico che si accorge di te. `vista` è il corridoio
 * davanti al muso: 9 metri sono circa 1,3 s a 7 m/s più il margine per
 * fermarsi in 2,7, cioè l'auto si arresta a due metri da te e non addosso.
 */
export const TRAFFICO = {
  /** Quanto lontano guarda davanti a sé (m). */
  vista: 9,
  /** Mezza larghezza del corridoio: fuori di lì non ti vede (m). */
  corsia: 1.6,
  frenata: 9,
  ripartenza: 2.6,
  /** Sotto questa velocità è ferma per davvero (m/s). */
  vFerma: 0.6,
  /** Secondi di pazienza prima del clacson. */
  pazienza: 2.2,
  /** Secondi prima che un'auto rubata rientri in circolazione. */
  rientro: 90,
} as const;

/**
 * Un passo del traffico civile. Con `davanti` (la posizione del giocatore)
 * l'auto smette di essere un binario: guarda un CORRIDOIO davanti al muso,
 * non un cerchio, così un pedone sul marciapiede non blocca la strada e uno
 * in mezzo alla carreggiata sì.
 */
export function stepAutoCivile(
  a: AutoCivile,
  dt: number,
  davanti?: { x: number; z: number } | null,
): void {
  if (a.rubata) {
    // rientra in circolazione solo quando il giocatore è lontano: al primo
    // furto non si nota, al nono sì — senza questo rientro il traffico di
    // Lugo si spopolerebbe un'auto alla volta e non tornerebbe mai
    a.rientro -= dt;
    const lontano = !davanti || Math.hypot(davanti.x - a.x, davanti.z - a.z) > 120;
    if (a.rientro <= 0 && lontano) {
      a.rubata = false;
      a.vAttuale = 0;
      a.attesa = 0;
    } else {
      return;
    }
  }

  // il muso: a.yaw tiene già conto del verso di marcia
  const fx = Math.cos(a.yaw);
  const fz = Math.sin(a.yaw);
  let bloccata = false;
  if (davanti) {
    const dx = davanti.x - a.x;
    const dz = davanti.z - a.z;
    const avanti = dx * fx + dz * fz;
    const lato = -dx * fz + dz * fx;
    bloccata = avanti > 0 && avanti < TRAFFICO.vista && Math.abs(lato) < TRAFFICO.corsia;
  }
  const vTarget = bloccata ? 0 : a.velocita;
  const rampa = vTarget < a.vAttuale ? TRAFFICO.frenata : TRAFFICO.ripartenza;
  const passo = rampa * dt;
  a.vAttuale += Math.max(-passo, Math.min(passo, vTarget - a.vAttuale));
  if (Math.abs(a.vAttuale) < 0.02) a.vAttuale = 0;
  a.attesa = bloccata && a.vAttuale < TRAFFICO.vFerma ? a.attesa + dt : 0;

  a.s += a.vAttuale * dt * a.verso;
  if (a.s >= a.lunghezza) {
    a.s = a.lunghezza;
    a.verso = -1;
  } else if (a.s <= 0) {
    a.s = 0;
    a.verso = 1;
  }
  let resto = a.s;
  const pts = a.percorso;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const dx = pts[i + 2] - pts[i];
    const dz = pts[i + 3] - pts[i + 1];
    const l = Math.hypot(dx, dz);
    if (resto <= l || i + 4 >= pts.length) {
      const t = l > 0 ? Math.min(1, resto / l) : 0;
      const ux = (dx / (l || 1)) * a.verso;
      const uz = (dz / (l || 1)) * a.verso;
      // corsia di destra rispetto al senso di marcia
      const px = pts[i] + dx * t - uz * CORSIA;
      const pz = pts[i + 1] + dz * t + ux * CORSIA;
      a.x = px;
      a.z = pz;
      a.yaw = Math.atan2(uz, ux);
      return;
    }
    resto -= l;
  }
}

/**
 * Spinta cerchio-vs-OBB su un rettangolo passato a mano (semiassi 1,85 ×
 * 0,85), con la stessa matematica di MondoFisico.risolviCerchio.
 *
 * Serve perché le auto civili FERME devono essere solide: ci si appoggia,
 * non ci si passa attraverso. Quelle in corsa no, e non è una svista — a
 * Lugo non si investe nessuno, e un'auto in movimento che spingesse il
 * giocatore lo sbatterebbe contro una facciata, perché questa spinta non
 * passa dalla fisica dei muri.
 */
export function respingiDaAuto(
  x: number,
  z: number,
  r: number,
  a: { x: number; z: number; yaw: number },
): [number, number] | null {
  const cos = Math.cos(a.yaw);
  const sin = Math.sin(a.yaw);
  const hw = 1.85;
  const hd = 0.85;
  const dx = x - a.x;
  const dz = z - a.z;
  const lx = dx * cos + dz * sin;
  const lz = -dx * sin + dz * cos;
  if (Math.abs(lx) > hw + r || Math.abs(lz) > hd + r) return null;
  const qx = Math.max(-hw, Math.min(hw, lx));
  const qz = Math.max(-hd, Math.min(hd, lz));
  let ddx = lx - qx;
  let ddz = lz - qz;
  let dist = Math.hypot(ddx, ddz);
  if (dist === 0) {
    // centro dentro il rettangolo: si esce dal lato più vicino
    const ex = hw - Math.abs(lx);
    const ez = hd - Math.abs(lz);
    if (ex < ez) {
      ddx = lx >= 0 ? 1 : -1;
      ddz = 0;
      dist = -ex;
    } else {
      ddx = 0;
      ddz = lz >= 0 ? 1 : -1;
      dist = -ez;
    }
  }
  if (dist >= r) return null;
  const l = Math.hypot(ddx, ddz) || 1;
  const nxl = ddx / l;
  const nzl = ddz / l;
  const nx = nxl * cos - nzl * sin;
  const nz = nxl * sin + nzl * cos;
  const pen = r - dist;
  return [x + nx * pen, z + nz * pen];
}

// ── infrastruttura condivisa ────────────────────────────────────────────────

export interface InfraGioco {
  fisica: MondoFisico;
  parcheggi: Posteggio[];
  traffico: AutoCivile[];
  /**
   * Contatore di revisione dei parcheggi: quando cambia, Veicoli.tsx
   * riscrive le matrici. Un confronto fra due interi per fotogramma è
   * gratis e non fa passare da React niente che cambia in mezzo al gioco.
   */
  revParcheggi: number;
}

const cache = new WeakMap<MondoLugo, InfraGioco>();

/** Un solo mondo fisico (edifici + auto parcheggiate) per tutti i sistemi. */
export function infraGioco(mondo: MondoLugo): InfraGioco {
  let infra = cache.get(mondo);
  if (!infra) {
    const fisica = new MondoFisico(mondo);
    const parcheggi = creaParcheggi(mondo, fisica);
    for (let i = 0; i < RISERVA_POSTEGGI; i++) {
      parcheggi.push({ x: 0, z: 0, yaw: 0, tinta: 0, carrozzeria: 0, presente: false, collider: null, stallo: false });
    }
    const traffico = creaTraffico(mondo, 9);
    infra = { fisica, parcheggi, traffico, revParcheggi: 0 };
    cache.set(mondo, infra);
  }
  return infra;
}
