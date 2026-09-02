// Fisica 2D del mondo (Lugo è in pianura): spatial hash dei collider degli
// edifici, collisione cerchio-vs-OBB e cerchio-vs-segmento con risoluzione
// a scivolamento. Nessuna libreria: deterministico, leggero, testabile.
// L'unica concessione alla terza dimensione è l'altezza OPZIONALE `h` dei
// collider: serve al salto, che scavalca panchine e fioriere ma mai i muri.

import type { MondoLugo, ColliderRT } from './loadMap';

const CELLA = 16; // metri

export class MondoFisico {
  private hash = new Map<number, ColliderRT[]>();
  /**
   * Gli OSTACOLI BASSI (panchine, fioriere) vivono in una hash TUTTA LORO,
   * non in quella dei muri, e la ragione è di taglio chirurgico: li vede
   * solo chi chiama risolviCerchio dichiarando la propria quota (il
   * personaggio a piedi, che può saltarli). Auto, bici, pedoni, gazzella e
   * tutti i punti che seminano la città con cerchioLibero continuano a
   * vedere ESATTAMENTE il mondo di prima: metterli nella hash principale
   * avrebbe fatto sbandare il traffico contro le panchine dei viali e
   * spostato spawn e bacheche calcolati — mezzo gioco cambiato per dare
   * un salto a una persona sola.
   */
  private hashBassi = new Map<number, ColliderRT[]>();
  /** true dopo la prima chiamata di arredaOstacoliBassi: si arreda una volta. */
  private bassiPronti = false;
  private minX: number;
  private minZ: number;
  private cols: number;

  constructor(mondo: MondoLugo) {
    this.minX = mondo.bounds.minX - 64;
    this.minZ = mondo.bounds.minZ - 64;
    this.cols = Math.ceil((mondo.bounds.maxX + 128 - this.minX) / CELLA);
    for (const b of mondo.buildings) this.inserisci(b.collider);
  }

  /**
   * Ostacolo OBB aggiuntivo (auto parcheggiate, arredi). Restituisce il
   * collider appena inserito: per toglierlo bisogna avere in mano
   * ESATTAMENTE quell'oggetto, perché la hash confronta per identità e non
   * per valore. Chi non deve rimuovere niente ignora il valore e continua
   * a compilare come prima.
   */
  aggiungiObb(cx: number, cz: number, hw: number, hd: number, angle: number): ColliderRT {
    const r = Math.hypot(hw, hd);
    const c: ColliderRT = {
      tipo: 'obb',
      cx,
      cz,
      hw,
      hd,
      cos: Math.cos(angle),
      sin: Math.sin(angle),
      segs: null,
      minX: cx - r,
      minZ: cz - r,
      maxX: cx + r,
      maxZ: cz + r,
    };
    this.inserisci(c);
    return c;
  }

  private chiave(cx: number, cz: number): number {
    return cz * this.cols + cx;
  }

  /**
   * Percorre il rettangolo di celle coperto dalla bbox del collider. Sta in
   * un posto solo perché inserimento e rimozione devono attraversare lo
   * STESSO insieme di celle: scritti due volte, prima o poi divergono, e
   * quel che resta è un fantasma solido in mezzo alla strada che nessuno
   * vede e che ferma le auto.
   */
  private celle(
    c: ColliderRT,
    fn: (cella: ColliderRT[], k: number) => void,
    mappa: Map<number, ColliderRT[]> = this.hash,
  ): void {
    const x0 = Math.floor((c.minX - this.minX) / CELLA);
    const x1 = Math.floor((c.maxX - this.minX) / CELLA);
    const z0 = Math.floor((c.minZ - this.minZ) / CELLA);
    const z1 = Math.floor((c.maxZ - this.minZ) / CELLA);
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const k = this.chiave(x, z);
        let cella = mappa.get(k);
        if (!cella) {
          cella = [];
          mappa.set(k, cella);
        }
        fn(cella, k);
      }
    }
  }

  private inserisci(c: ColliderRT, mappa: Map<number, ColliderRT[]> = this.hash) {
    this.celle(c, (cella) => cella.push(c), mappa);
  }

  /**
   * Toglie un ostacolo dalla fisica senza ricostruire niente.
   *
   * Ricostruire la spatial hash per un'auto che se ne va vorrebbe dire
   * reinserire migliaia di edifici: mezzo secondo di scatto nel mezzo della
   * partita, ogni volta che si prende un'auto in sosta. Il collider però si
   * porta dietro la sua bbox, quindi le celle da ripulire sono ESATTAMENTE
   * quelle in cui era entrato, e non serve nessuna ricerca globale:
   * un'utilitaria (r ≈ 2,04 m su celle da 16) ne tocca al massimo quattro.
   */
  rimuoviCollider(c: ColliderRT): void {
    this.celle(c, (cella) => {
      const i = cella.indexOf(c);
      if (i >= 0) cella.splice(i, 1);
    });
  }

  /** Rimette un ostacolo tolto prima: l'auto abbandonata torna solida. */
  rimettiCollider(c: ColliderRT): void {
    this.inserisci(c);
  }

  /** Raccoglie in `out` i collider di `mappa` vicini a (x,z) entro raggio r. */
  private viciniIn(
    x: number,
    z: number,
    r: number,
    mappa: Map<number, ColliderRT[]>,
    out: ColliderRT[],
  ): void {
    const visti = new Set<ColliderRT>();
    const x0 = Math.floor((x - r - this.minX) / CELLA);
    const x1 = Math.floor((x + r - this.minX) / CELLA);
    const z0 = Math.floor((z - r - this.minZ) / CELLA);
    const z1 = Math.floor((z + r - this.minZ) / CELLA);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cella = mappa.get(this.chiave(cx, cz));
        if (!cella) continue;
        for (const c of cella) {
          if (!visti.has(c)) {
            visti.add(c);
            out.push(c);
          }
        }
      }
    }
  }

  /** Collider potenzialmente vicini a (x,z) entro raggio r. */
  vicini(x: number, z: number, r: number): ColliderRT[] {
    const out: ColliderRT[] = [];
    this.viciniIn(x, z, r, this.hash, out);
    return out;
  }

  /**
   * Registra gli arredi bassi e scavalcabili — una volta sola, al primo
   * fotogramma del gioco, quando la lista delle imperfezioni è GIÀ stata
   * seminata dai componenti che la disegnano. Chiamarla due volte (uno
   * smontaggio/rimontaggio del Player) non deve raddoppiare le panchine:
   * di qui il chiavistello, che sta nella fisica e non nel chiamante
   * perché è la fisica a pagare il conto dei doppioni.
   *
   * Le misure stanno qui e vengono dalla geometria disegnata in
   * imperfezioni.ts (PEZZI): la panchina è 1,70×0,48 con la seduta a
   * ~0,45 m; la fioriera è una vasca di 0,82 con il bordo a 0,52 — il
   * collider si ferma a 0,50 perché lo scavalco non deve dipendere dal
   * campionamento a fotogrammi radi del banco di prova, e i due centimetri
   * che mancano sono il bordo smussato. Il cespuglio sopra la vasca è
   * fogliame: si attraversa. Tutto il resto del disordine (cassonetti,
   * cartelli, bici in sosta) NON diventa solido: le bici sono bersagli di
   * furto e bisogna poterci arrivare addosso.
   */
  arredaOstacoliBassi(
    oggetti: readonly { t: string; x: number; z: number; rot: number }[],
  ): void {
    if (this.bassiPronti) return;
    this.bassiPronti = true;
    const MISURE: Record<string, { hw: number; hd: number; h: number }> = {
      panchina: { hw: 0.85, hd: 0.24, h: 0.45 },
      fioriera: { hw: 0.41, hd: 0.41, h: 0.5 },
    };
    for (const o of oggetti) {
      const m = MISURE[o.t];
      if (!m) continue;
      const r = Math.hypot(m.hw, m.hd);
      this.inserisci(
        {
          tipo: 'obb',
          cx: o.x,
          cz: o.z,
          hw: m.hw,
          hd: m.hd,
          cos: Math.cos(o.rot),
          sin: Math.sin(o.rot),
          segs: null,
          h: m.h,
          minX: o.x - r,
          minZ: o.z - r,
          maxX: o.x + r,
          maxZ: o.z + r,
        },
        this.hashBassi,
      );
    }
  }

  /**
   * Spinge fuori un cerchio (x,z,r) da tutti i collider vicini.
   * Ritorna [nx, nz, penetrazione] dell'ultimo contatto (o null) e
   * scrive la posizione corretta in `out`.
   *
   * `quotaY` è la quota da terra di chi si muove, ed è OPZIONALE apposta:
   * chi non la passa (auto, pedoni, tutte le chiamate esistenti) vede il
   * mondo identico a prima, ostacoli bassi compresi — cioè NON li vede
   * proprio, perché stanno nella loro hash separata. Chi la dichiara
   * incontra anche gli arredi bassi: un collider con `h` definita e
   * h ≤ quotaY non respinge (ci sei sopra, lo stai scavalcando); sotto
   * quella quota respinge come un muro. In aria, poi, il cerchio si
   * stringe alla metà contro i SOLI ostacoli bassi: le gambe sono
   * raccolte (Character piega le ginocchia) e il raggio da fermo — 0,35 m
   * di spalle E piedi — pretenderebbe un volo da lungista per superare
   * una vasca di 0,82; contro i muri veri il raggio resta pieno anche a
   * mezz'aria, che di lì non si passa comunque.
   */
  risolviCerchio(
    x: number,
    z: number,
    r: number,
    out: { x: number; z: number },
    quotaY?: number,
  ): [number, number] | null {
    let px = x;
    let pz = z;
    let contatto: [number, number] | null = null;
    const cand = this.vicini(x, z, r + 2);
    if (quotaY !== undefined && this.hashBassi.size > 0) {
      this.viciniIn(x, z, r + 2, this.hashBassi, cand);
    }
    for (const c of cand) {
      let rc = r;
      if (c.h !== undefined && quotaY !== undefined) {
        if (quotaY >= c.h) continue;
        if (quotaY > 0.02) rc = r * 0.5;
      }
      if (c.tipo === 'obb') {
        // porta il punto nello spazio dell'OBB
        const dx = px - c.cx;
        const dz = pz - c.cz;
        const lx = dx * c.cos + dz * c.sin;
        const lz = -dx * c.sin + dz * c.cos;
        const qx = Math.max(-c.hw, Math.min(c.hw, lx));
        const qz = Math.max(-c.hd, Math.min(c.hd, lz));
        let ddx = lx - qx;
        let ddz = lz - qz;
        let dist = Math.hypot(ddx, ddz);
        if (dist === 0) {
          // centro dentro l'OBB: esci dal lato più vicino
          const ex = c.hw - Math.abs(lx);
          const ez = c.hd - Math.abs(lz);
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
        if (dist < rc) {
          const l = Math.hypot(ddx, ddz) || 1;
          const nxl = ddx / l;
          const nzl = ddz / l;
          // normale di nuovo in spazio mondo
          const nx = nxl * c.cos - nzl * c.sin;
          const nz = nxl * c.sin + nzl * c.cos;
          const pen = rc - dist;
          px += nx * pen;
          pz += nz * pen;
          contatto = [nx, nz];
        }
      } else if (c.segs) {
        for (let i = 0; i < c.segs.length; i += 4) {
          const ax = c.segs[i];
          const az = c.segs[i + 1];
          const bx = c.segs[i + 2];
          const bz = c.segs[i + 3];
          const abx = bx - ax;
          const abz = bz - az;
          const len2 = abx * abx + abz * abz || 1;
          const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / len2));
          const qx = ax + abx * t;
          const qz = az + abz * t;
          let dx = px - qx;
          let dz = pz - qz;
          const dist = Math.hypot(dx, dz);
          if (dist < rc && dist > 1e-6) {
            dx /= dist;
            dz /= dist;
            const pen = rc - dist;
            px += dx * pen;
            pz += dz * pen;
            contatto = [dx, dz];
          }
        }
      }
    }
    out.x = px;
    out.z = pz;
    return contatto;
  }

  /** True se un cerchio in (x,z) non tocca nulla: per lo spawn di discesa. */
  cerchioLibero(x: number, z: number, r: number): boolean {
    const out = { x, z };
    return this.risolviCerchio(x, z, r, out) === null;
  }
}
