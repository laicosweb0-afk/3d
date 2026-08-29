// La bici di Lugo: quella appoggiata al muro, e quella che si pedala.
//
// A Lugo la bici non è un mezzo fra gli altri: è IL mezzo. Ce n'è una ogni
// tre metri appoggiata a una facciata, e imperfezioni.ts le semina già
// tutte. Qui non se ne inventa nessuna: quella che si prende è esattamente
// quella che era al muro, con il suo colore, e quando la si lascia resta
// dove la si è lasciata — riprendibile, da chiunque ripassi di lì.
//
// Il modello di guida opera sullo StatoPersona che esiste già, e non su una
// terza struttura tutta sua. È la scelta che fa funzionare da sola metà del
// gioco: camera, minimappa, missioni, nome della via, eventi e audio
// leggono rt.persona e continuano a leggere quello anche mentre si pedala.
// Una StatoBici separata avrebbe voluto dire ritoccare otto file per far
// sapere a ognuno che esiste un terzo posto dove guardare.

import type { StatoPersona } from './character';
import type { StatoInput } from './input';
import type { MondoFisico } from './physics';
import type { MondoLugo } from './loadMap';
import { imperfezioni, type Pezzo } from './imperfezioni';
import { runtime } from './runtime';

/**
 * I numeri della bici, tutti in un posto solo.
 *
 * Non è un'auto e non deve sembrarlo: niente slittamento laterale (una
 * bici non deriva), niente freno a mano, e una retromarcia lentissima che
 * serve solo a tirarsi fuori da un angolo. La velocità massima, 8,4 m/s,
 * sono trenta all'ora: è la velocità vera di uno che pedala con convinzione
 * in centro, ed è più della corsa a piedi (5,2) senza arrivare all'auto.
 */
export const BICI = {
  vMax: 8.4,
  vMaxIndietro: 1.1,
  accel: 4.6,
  /** Pedalare all'indietro quando si va avanti è frenare. */
  frenataPedale: 8.0,
  /** Il freno vero, quello dello Spazio. */
  frenata: 11.0,
  attritoLin: 0.22,
  attritoQuad: 0.012,
  /** Agilità dello sterzo da fermi e in corsa (rad/s). */
  sterzoLento: 2.4,
  sterzoVeloce: 0.85,
  /** Velocità alla quale lo sterzo è ormai tutto "veloce" (m/s). */
  vSterzo: 6.5,
  raggio: 0.45,
  /** Radianti di fase per metro: 2π ogni 5,5 m, cioè 88 pedalate al minuto. */
  pedalata: 1.15,
  /** Massima piega in curva (rad): solo estetica. */
  inclinazione: 0.38,
} as const;

export interface EsitoBici {
  /** Velocità di marcia con segno (m/s). */
  v: number;
  /** Modulo dell'ultimo urto, per audio e scossone della camera. */
  urto: number;
  /** Inclinazione voluta in questo istante (rad, positiva = a destra). */
  piega: number;
}

/**
 * I due pezzi che ha SOLO la bici che si guida: pedivella e pedale.
 *
 * Stanno qui e non dentro PEZZI.bici di imperfezioni.ts perché lì
 * verrebbero moltiplicati per le centinaia di bici seminate in città —
 * seicento scatolette in più negli InstancedMesh del disordine per un
 * dettaglio che si vede solo da sei metri, cioè solo quando la bici sei tu.
 */
export const PEDALI: readonly Pezzo[] = [
  { forma: 'scatola', p: [0, 0.26, 0], s: [0.06, 0.3, 0.05], col: '#3A3A38' },
  { forma: 'scatola', p: [0, 0.12, 0.09], s: [0.16, 0.04, 0.06], col: '#26262A' },
];

/**
 * Un passo di guida in sella. Stessa struttura di stepAuto, meno tutto
 * quello che una bici non fa.
 */
export function stepBici(
  s: StatoPersona,
  input: StatoInput,
  dt: number,
  fisica: MondoFisico,
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
): EsitoBici {
  const fx = Math.cos(s.yaw);
  const fz = Math.sin(s.yaw);
  // tutta la velocità è longitudinale per costruzione, quindi la proiezione
  // sul muso non perde niente: è solo il modo di riportarla a uno scalare
  let v = s.vx * fx + s.vz * fz;

  const gas = Math.max(-1, Math.min(1, input.az));
  if (gas > 0.05) {
    v += BICI.accel * gas * dt;
  } else if (gas < -0.05) {
    // sopra i 0,3 m/s pedalare all'indietro FRENA; solo da quasi fermi
    // spinge in retromarcia, e piano: una bici indietro non ci va
    v -= (v > 0.3 ? BICI.frenataPedale : BICI.accel * 0.5) * -gas * dt;
  }
  // il freno è secco e basta: niente freno a mano, niente derapata
  if (input.freno) v -= Math.sign(v) * Math.min(Math.abs(v), BICI.frenata * dt);

  // ruota libera: con 0,22 e 0,012 la resistenza a fondo scala vale 2,7 m/s²
  // contro 4,6 di spinta (a 8,4 ci si arriva davvero), e mollando i pedali
  // ci si ferma in circa tre secondi e dodici metri — si scivola, non si
  // inchioda
  v -= (BICI.attritoLin * v + BICI.attritoQuad * v * Math.abs(v)) * dt;
  v = Math.max(-BICI.vMaxIndietro, Math.min(BICI.vMax, v));

  // Lo sterzo dipende dalla velocità, come una bici vera: da fermi si gira
  // sul posto puntandosi coi piedi, in corsa la bici si raddrizza da sola.
  // Senza questa dipendenza, a trenta all'ora un colpo di manubrio faceva
  // una virata a novanta gradi.
  const t = Math.min(1, Math.abs(v) / BICI.vSterzo);
  const agilita = BICI.sterzoLento + (BICI.sterzoVeloce - BICI.sterzoLento) * t;
  const presa = Math.min(1, 0.4 + Math.abs(v) / 1.6);
  const yawPrima = s.yaw;
  // ax > 0 = destra = yaw crescente, coerente con stepAuto e con
  // rotation.y = -yaw; spingendola indietro lo sterzo si inverte, come
  // quando si porta una bici a mano tirandola per il manubrio
  s.yaw += input.ax * agilita * presa * dt * (v < -0.05 ? -1 : 1);

  let scarto = s.yaw - yawPrima;
  while (scarto > Math.PI) scarto -= Math.PI * 2;
  while (scarto < -Math.PI) scarto += Math.PI * 2;
  const omega = dt > 0 ? scarto / dt : 0;
  const piega = Math.max(
    -BICI.inclinazione,
    Math.min(BICI.inclinazione, omega * v * 0.055),
  );

  s.vx = Math.cos(s.yaw) * v;
  s.vz = Math.sin(s.yaw) * v;
  s.x += s.vx * dt;
  s.z += s.vz * dt;

  // ── muri ─────────────────────────────────────────────────────────────
  let urto = 0;
  const out = { x: s.x, z: s.z };
  const contatto = fisica.risolviCerchio(s.x, s.z, BICI.raggio, out);
  if (contatto) {
    s.x = out.x;
    s.z = out.z;
    const vn = s.vx * contatto[0] + s.vz * contatto[1];
    if (vn < 0) {
      // Contro un muro la bici NON rimbalza come l'auto: si struscia e
      // perde slancio. Con il moltiplicatore dell'auto, nei vicoli di Lugo
      // si veniva sparati indietro a ogni sfioramento di facciata.
      const frontale = Math.min(1, -vn / Math.max(0.3, Math.abs(v)));
      v *= 1 - 0.75 * frontale;
      s.vx = Math.cos(s.yaw) * v;
      s.vz = Math.sin(s.yaw) * v;
      urto = -vn;
    }
  }

  // ── confini del mondo, come per l'auto ───────────────────────────────
  const M = 30;
  if (s.x < bounds.minX - M) {
    s.x = bounds.minX - M;
    if (s.vx < 0) s.vx = 0;
  } else if (s.x > bounds.maxX + M) {
    s.x = bounds.maxX + M;
    if (s.vx > 0) s.vx = 0;
  }
  if (s.z < bounds.minZ - M) {
    s.z = bounds.minZ - M;
    if (s.vz < 0) s.vz = 0;
  } else if (s.z > bounds.maxZ + M) {
    s.z = bounds.maxZ + M;
    if (s.vz > 0) s.vz = 0;
  }

  if (Math.abs(v) < 0.03) {
    v = 0;
    s.vx = 0;
    s.vz = 0;
  }
  // la fase avanza con la DISTANZA come per il passo, ma a 1,15 rad/m
  // invece di 3,5: sono 88 pedalate al minuto a fondo scala, la cadenza di
  // un ciclista vero, e non serve nessun contatore nuovo per averla
  s.fase += Math.abs(v) * dt * BICI.pedalata;

  return { v, urto, piega };
}

// ── il registro delle bici ─────────────────────────────────────────────────

const registro = new WeakMap<MondoLugo, { rev: number; indici: number[] }>();

/**
 * Gli indici, dentro la lista CONDIVISA delle imperfezioni, delle bici che
 * si possono ancora prendere. Memoizzati e ricalcolati solo quando cambia
 * runtime.revImperfezioni, cioè solo quando una bici viene presa o posata:
 * scorrere milleduecento oggetti a ogni pressione di E, e a ogni frame per
 * il suggerimento, sarebbe stato lavoro buttato via.
 */
export function biciRubabili(mondo: MondoLugo, fisica: MondoFisico): number[] {
  const memo = registro.get(mondo);
  if (memo && memo.rev === runtime.revImperfezioni) return memo.indici;
  const lista = imperfezioni(mondo, fisica);
  const indici: number[] = [];
  for (let i = 0; i < lista.length; i++) {
    if (lista[i].t === 'bici' && !lista[i].presa) indici.push(i);
  }
  registro.set(mondo, { rev: runtime.revImperfezioni, indici });
  return indici;
}

/** L'indice della bici prendibile più vicina, o −1 se non ce n'è nessuna. */
export function biciPiuVicina(
  mondo: MondoLugo,
  fisica: MondoFisico,
  x: number,
  z: number,
  maxD = 2.2,
): number {
  const lista = imperfezioni(mondo, fisica);
  let scelta = -1;
  let d2 = maxD * maxD;
  for (const i of biciRubabili(mondo, fisica)) {
    const o = lista[i];
    if (o.presa) continue;
    const dx = o.x - x;
    const dz = o.z - z;
    const q = dx * dx + dz * dz;
    if (q < d2) {
      d2 = q;
      scelta = i;
    }
  }
  return scelta;
}

/**
 * Prende la bici numero `i`: sparisce dal muro e comincia a esistere sotto
 * il giocatore. Non c'è nessun collider da togliere alla fisica, perché le
 * bici non ne hanno mai avuto uno (imperfezioniCitta le valida con
 * cerchioLibero ma non chiama mai aggiungiObb): è il motivo per cui la
 * bici è il più semplice dei tre furti, e l'unico che non tocca la
 * spatial hash.
 */
export function prendiBici(mondo: MondoLugo, fisica: MondoFisico, i: number): boolean {
  const lista = imperfezioni(mondo, fisica);
  const o = lista[i];
  if (!o || o.t !== 'bici' || o.presa) return false;
  o.presa = true;
  runtime.biciInSella = i;
  runtime.biciSporche.push(i);
  runtime.revImperfezioni++;
  return true;
}

/**
 * Posa la bici che si stava guidando. Si prova il punto dove sei e poi i
 * quattro scostamenti laterali: se nessuno è libero la si appoggia lo
 * stesso dove sei, perché una bici non deve poter sparire — rifiutare la
 * posa vorrebbe dire tenersela addosso per sempre, e posarla dentro un
 * muro vorrebbe dire perderla per sempre. Meglio una bici un po' dentro
 * un gradino che una bici irrecuperabile.
 */
export function lasciaBici(
  mondo: MondoLugo,
  fisica: MondoFisico,
  x: number,
  z: number,
  yaw: number,
): void {
  const i = runtime.biciInSella;
  if (i < 0) return;
  const o = imperfezioni(mondo, fisica)[i];
  runtime.biciInSella = -1;
  if (!o) return;
  let px = x;
  let pz = z;
  for (const [ox, oz] of [
    [0, 0],
    [0.8, 0],
    [-0.8, 0],
    [0, 0.8],
    [0, -0.8],
  ]) {
    if (fisica.cerchioLibero(x + ox, z + oz, 0.7)) {
      px = x + ox;
      pz = z + oz;
      break;
    }
  }
  o.x = px;
  o.z = pz;
  // appoggiata di traverso rispetto a come la guidavi, come tutte le altre
  o.rot = yaw + Math.PI / 2;
  o.presa = false;
  runtime.biciSporche.push(i);
  runtime.revImperfezioni++;
}
