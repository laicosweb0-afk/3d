// Le imperfezioni della città: quello che a Lugo non è mai in ordine.
//
// Una strada perfettamente pulita si legge subito come finta. Qui si
// semina, in modo deterministico, l'ingombro vero dei marciapiedi
// romagnoli: le biciclette appoggiate ai muri, i motorini davanti al bar,
// i cassonetti agli angoli, le fioriere del centro, le panchine, i cestini
// e la segnaletica. Tutto è calcolato una volta sola e disegnato con tre
// sole geometrie instanziate (scatola, cilindro, sfera).

import { MondoFisico } from './physics';
import { puntoStradaVicino } from './car';
import type { MondoLugo } from './loadMap';

export type TipoImperfezione =
  | 'bici'
  | 'scooter'
  | 'cassonetto'
  | 'fioriera'
  | 'panchina'
  | 'cartello'
  | 'cestino'
  | 'rastrelliera';

export interface Imperfezione {
  t: TipoImperfezione;
  x: number;
  z: number;
  /** Orientamento: 0 guarda verso +X. */
  rot: number;
  /** Indice di variante, per il colore. */
  v: number;
  /**
   * Solo per le bici: true mentre il giocatore la sta usando. La bici non
   * esce dalla lista — è la stessa bici, e quando la lascia torna visibile
   * dove l'ha lasciata. Il campo è opzionale apposta, così nessuno dei
   * punti che costruiscono imperfezioni deve cambiare.
   */
  presa?: boolean;
}

/** Un pezzo di un oggetto, nel suo riferimento locale (x avanti, y su). */
export interface Pezzo {
  forma: 'scatola' | 'cilindro' | 'sfera';
  p: [number, number, number];
  s: [number, number, number];
  /** Rotazione attorno all'asse X locale: serve alle ruote e ai dischi. */
  rx?: number;
  col: string;
  /** Se presente, il colore si sceglie dalla variante dell'oggetto. */
  tinte?: readonly string[];
}

const NERO_GOMMA = '#26262A';

export const PEZZI: Record<TipoImperfezione, readonly Pezzo[]> = {
  // la bicicletta appoggiata al muro: a Lugo ce n'è una ogni tre metri
  bici: [
    { forma: 'cilindro', p: [0.52, 0.33, 0], s: [0.66, 0.07, 0.66], rx: Math.PI / 2, col: NERO_GOMMA },
    { forma: 'cilindro', p: [-0.52, 0.33, 0], s: [0.66, 0.07, 0.66], rx: Math.PI / 2, col: NERO_GOMMA },
    { forma: 'scatola', p: [0, 0.62, 0], s: [1.0, 0.06, 0.05], col: '#000', tinte: ['#3B5F8A', '#7A2E2E', '#2F6B4F', '#4A4A4A', '#B0894A'] },
    { forma: 'scatola', p: [-0.3, 0.5, 0], s: [0.06, 0.42, 0.05], col: '#000', tinte: ['#3B5F8A', '#7A2E2E', '#2F6B4F', '#4A4A4A', '#B0894A'] },
    { forma: 'scatola', p: [0.5, 0.95, 0], s: [0.06, 0.06, 0.48], col: '#3A3A38' },
    { forma: 'scatola', p: [-0.32, 0.86, 0], s: [0.26, 0.07, 0.13], col: '#2A2A2A' },
  ],
  scooter: [
    { forma: 'cilindro', p: [0.5, 0.24, 0], s: [0.48, 0.1, 0.48], rx: Math.PI / 2, col: NERO_GOMMA },
    { forma: 'cilindro', p: [-0.5, 0.24, 0], s: [0.48, 0.11, 0.48], rx: Math.PI / 2, col: NERO_GOMMA },
    { forma: 'scatola', p: [0, 0.5, 0], s: [1.1, 0.3, 0.36], col: '#000', tinte: ['#C9503F', '#4A6B8A', '#D9C15E', '#E4E0D6', '#3E4A50'] },
    { forma: 'scatola', p: [0.48, 0.68, 0], s: [0.12, 0.66, 0.42], col: '#000', tinte: ['#C9503F', '#4A6B8A', '#D9C15E', '#E4E0D6', '#3E4A50'] },
    { forma: 'scatola', p: [-0.16, 0.74, 0], s: [0.52, 0.12, 0.34], col: '#2A2A2A' },
    { forma: 'scatola', p: [0.44, 1.0, 0], s: [0.06, 0.06, 0.44], col: '#3A3A38' },
  ],
  // la raccolta differenziata: verde, blu, marrone e giallo
  cassonetto: [
    { forma: 'scatola', p: [0, 0.48, 0], s: [1.08, 0.92, 0.82], col: '#000', tinte: ['#4A6B4E', '#3F5A6B', '#6B5F4A', '#8A7A3E'] },
    { forma: 'scatola', p: [0, 0.99, 0], s: [1.14, 0.1, 0.88], col: '#000', tinte: ['#D9C15E', '#3F5A6B', '#7A6A4A', '#4A6B4E'] },
    { forma: 'scatola', p: [0.5, 0.24, 0], s: [0.1, 0.42, 0.7], col: '#3A3A38' },
  ],
  fioriera: [
    { forma: 'scatola', p: [0, 0.26, 0], s: [0.82, 0.52, 0.82], col: '#000', tinte: ['#9A8E7A', '#A8A096', '#8E7F6C'] },
    { forma: 'sfera', p: [0, 0.78, 0], s: [0.78, 0.66, 0.78], col: '#000', tinte: ['#4E7A46', '#5C8A4E', '#436B3E'] },
  ],
  panchina: [
    { forma: 'scatola', p: [0, 0.45, 0], s: [1.7, 0.08, 0.44], col: '#000', tinte: ['#8A6B4A', '#7A5E42', '#96774F'] },
    { forma: 'scatola', p: [0, 0.72, -0.2], s: [1.7, 0.42, 0.07], col: '#000', tinte: ['#8A6B4A', '#7A5E42', '#96774F'] },
    { forma: 'scatola', p: [0.72, 0.22, 0], s: [0.08, 0.44, 0.4], col: '#3A3A38' },
    { forma: 'scatola', p: [-0.72, 0.22, 0], s: [0.08, 0.44, 0.4], col: '#3A3A38' },
  ],
  cartello: [
    { forma: 'cilindro', p: [0, 1.1, 0], s: [0.08, 2.2, 0.08], col: '#A8ACAE' },
    { forma: 'cilindro', p: [0, 2.05, 0], s: [0.62, 0.05, 0.62], rx: Math.PI / 2, col: '#000', tinte: ['#C0392B', '#2D6CB0', '#E8E4DA', '#D9A62E'] },
  ],
  cestino: [
    { forma: 'cilindro', p: [0, 0.42, 0], s: [0.6, 0.74, 0.6], col: '#000', tinte: ['#47504F', '#5A5148', '#3E4A52'] },
    { forma: 'cilindro', p: [0, 0.81, 0], s: [0.66, 0.06, 0.66], col: '#2E3432' },
  ],
  // la rastrelliera davanti alla stazione e ai portici: due correnti a
  // terra e tre archetti. Non costa NIENTE in chiamate di disegno, perché
  // finisce negli stessi tre InstancedMesh di tutto il resto del disordine
  rastrelliera: [
    { forma: 'scatola', p: [0, 0.12, 0], s: [2.4, 0.08, 0.06], col: '#8A8E92' },
    { forma: 'scatola', p: [0, 0.12, 0.5], s: [2.4, 0.08, 0.06], col: '#8A8E92' },
    { forma: 'cilindro', p: [-0.8, 0.34, 0.25], s: [0.06, 0.68, 0.06], col: '#8A8E92' },
    { forma: 'cilindro', p: [0, 0.34, 0.25], s: [0.06, 0.68, 0.06], col: '#8A8E92' },
    { forma: 'cilindro', p: [0.8, 0.34, 0.25], s: [0.06, 0.68, 0.06], col: '#8A8E92' },
  ],
};

/** Pesi per classe di strada: in centro fioriere e bici, fuori cassonetti. */
const MENU: Record<string, readonly [TipoImperfezione, number][]> = {
  pedonale: [['bici', 34], ['fioriera', 22], ['panchina', 16], ['cestino', 16], ['scooter', 12]],
  residenziale: [['bici', 38], ['scooter', 22], ['cassonetto', 12], ['cestino', 12], ['fioriera', 10], ['cartello', 6]],
  servizio: [['bici', 32], ['cassonetto', 20], ['scooter', 22], ['cestino', 16], ['cartello', 10]],
  secondaria: [['cartello', 26], ['bici', 20], ['cassonetto', 12], ['panchina', 16], ['cestino', 14], ['scooter', 12]],
  primaria: [['cartello', 40], ['cassonetto', 14], ['cestino', 22], ['panchina', 16], ['bici', 8]],
};

const MAX = 1150;

/**
 * Semina l'ingombro dei marciapiedi lungo le strade del centro abitato.
 * Deterministico: la stessa Lugo, disordinata sempre allo stesso modo.
 */
function seminaStrade(mondo: MondoLugo, fisica: MondoFisico): Imperfezione[] {
  const pav = mondo.poi.get('pavaglione');
  const cx = pav ? pav.xm : 0;
  const cz = pav ? pav.zm : 0;
  let seme = 20260828;
  const rnd = () => {
    seme = (seme * 1664525 + 1013904223) >>> 0;
    return seme / 4294967296;
  };

  const out: Imperfezione[] = [];
  let lato = 1;
  for (const r of mondo.roads) {
    const menu = MENU[r.classe];
    if (!menu) continue;
    const n = r.pts.length / 2;
    if (n < 2) continue;
    // solo dove si cammina davvero: il resto è campagna
    const mx = r.pts[0], mz = r.pts[1];
    const dist = Math.hypot(mx - cx, mz - cz);
    if (dist > 900) continue;
    // più fitto in centro, più rado in periferia
    const passoBase = dist < 300 ? 10 : dist < 600 ? 17 : 30;

    let avanzo = rnd() * passoBase;
    for (let i = 0; i + 1 < n; i++) {
      const ax = r.pts[i * 2], az = r.pts[i * 2 + 1];
      const dx = r.pts[(i + 1) * 2] - ax;
      const dz = r.pts[(i + 1) * 2 + 1] - az;
      const L = Math.hypot(dx, dz);
      if (L < 0.01) continue;
      const ux = dx / L, uz = dz / L;
      let s = avanzo;
      while (s < L) {
        if (out.length >= MAX) return out;
        const off = (r.larghezza / 2 + 1.15 + rnd() * 0.8) * lato;
        const px = ax + ux * s - uz * off;
        const pz = az + uz * s + ux * off;
        // niente oggetti dentro un muro
        if (fisica.cerchioLibero(px, pz, 0.7)) {
          let tot = 0;
          for (const [, w] of menu) tot += w;
          let acc = rnd() * tot;
          let t: TipoImperfezione = menu[0][0];
          for (const [k, w] of menu) {
            acc -= w;
            if (acc < 0) {
              t = k;
              break;
            }
          }
          // bici e panchine stanno di fianco alla strada, i cartelli la guardano
          const lungo = Math.atan2(uz, ux);
          const rot = t === 'cartello' ? lungo + Math.PI / 2 : lungo + (rnd() - 0.5) * 0.5;
          out.push({ t, x: px, z: pz, rot, v: Math.floor(rnd() * 97) });
        }
        lato = -lato;
        s += passoBase * (0.7 + rnd() * 0.7);
      }
      avanzo = Math.max(0, s - L);
    }
  }
  return out;
}

const MAX_RASTRELLIERE = 14;

/**
 * Le rastrelliere del centro, con le loro bici già dentro.
 *
 * Sta FUORI dal ciclo delle strade, e con un seme tutto suo, per due
 * ragioni che sembrano una sola ma non lo sono. La prima: quel ciclo esce
 * con `return out` appena tocca MAX, quindi tutto ciò che gli si mettesse
 * dentro verrebbe saltato proprio nelle vie più affollate, che sono
 * esattamente quelle dove una rastrelliera ci vuole. La seconda, più
 * grave: le imperfezioni di Lugo escono da un LCG deterministico, e una
 * sola estrazione in più sposterebbe TUTTO il disordine della città — le
 * bici cambierebbero muro, i cassonetti angolo, e le fasi di collaudo che
 * si teletrasportano su punti calcolati diventerebbero instabili senza che
 * nessuno capisca perché. Con un seme proprio, Lugo resta identica e le
 * rastrelliere si aggiungono in coda.
 */
function aggiungiRastrelliere(mondo: MondoLugo, fisica: MondoFisico, out: Imperfezione[]): void {
  let seme = 20260901;
  const rnd = () => {
    seme = (seme * 1664525 + 1013904223) >>> 0;
    return seme / 4294967296;
  };
  let messe = 0;
  for (const id of ['stazione', 'pavaglione', 'rocca', 'teatro', 'baracca', 'parco']) {
    if (messe >= MAX_RASTRELLIERE) break;
    const p = mondo.poi.get(id);
    if (!p) continue;
    for (const raggio of [8, 13]) {
      if (messe >= MAX_RASTRELLIERE) break;
      const giroBase = rnd() * Math.PI * 2;
      let messa = false;
      for (let k = 0; k < 12 && !messa; k++) {
        const a = giroBase + (k / 12) * Math.PI * 2;
        const px = p.xm + Math.cos(a) * raggio;
        const pz = p.zm + Math.sin(a) * raggio;
        // 2,2 m liberi: la rastrelliera è lunga 2,4 e va appoggiata al
        // marciapiede, non incastrata fra due fioriere
        if (!fisica.cerchioLibero(px, pz, 2.2)) continue;
        const rot = puntoStradaVicino(mondo, px, pz).yaw;
        out.push({ t: 'rastrelliera', x: px, z: pz, rot, v: messe });
        messe++;
        messa = true;
        // le bici ci stanno DI TRAVERSO, come nella realtà: ruotate di 90°
        // rispetto all'asse della rastrelliera, a passo di 62 cm
        const ux = Math.cos(rot);
        const uz = Math.sin(rot);
        for (let b = 0; b < 4; b++) {
          const s = -0.93 + b * 0.62;
          const bx = px + ux * s;
          const bz = pz + uz * s;
          if (!fisica.cerchioLibero(bx, bz, 0.5)) continue;
          out.push({ t: 'bici', x: bx, z: bz, rot: rot + Math.PI / 2, v: (messe * 7 + b * 13) % 97 });
        }
      }
    }
  }
}

/** Tutto il disordine di Lugo: le strade più le rastrelliere del centro. */
export function imperfezioniCitta(mondo: MondoLugo, fisica: MondoFisico): Imperfezione[] {
  const out = seminaStrade(mondo, fisica);
  aggiungiRastrelliere(mondo, fisica, out);
  return out;
}

const memoria = new WeakMap<MondoLugo, Imperfezione[]>();

/**
 * La lista CONDIVISA delle imperfezioni: sempre lo stesso array per lo
 * stesso mondo.
 *
 * Senza questa memoria ogni chiamante otteneva una COPIA — Imperfezioni.tsx
 * e l'hook citta() di World.tsx se la ricalcolavano ciascuno per conto
 * proprio — e la conseguenza si vedeva solo dal furto in poi: la bici che
 * ti porti via resterebbe appoggiata al muro per tutti gli altri, perché
 * chi la disegna sta guardando un array diverso da quello in cui è stata
 * segnata come presa. Il registro delle bici rubabili e il disegnatore
 * devono guardare lo stesso array, o non si vedrà mai sparire niente.
 */
export function imperfezioni(mondo: MondoLugo, fisica: MondoFisico): Imperfezione[] {
  let lista = memoria.get(mondo);
  if (!lista) {
    lista = imperfezioniCitta(mondo, fisica);
    memoria.set(mondo, lista);
  }
  return lista;
}
