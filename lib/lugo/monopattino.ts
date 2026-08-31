// Il monopattino elettrico dei maranza: pedana, piantone, manubrio e
// parafango FUSI in un solo BufferGeometry, perché il budget di Lugo si
// misura in chiamate di disegno e quattro scatole separate sarebbero state
// quattro InstancedMesh — qui invece è UNO solo per tutti i monopattini
// della città. Le due ruotine NON stanno qui dentro: sono le ruote della
// bici dei ciclisti, riusate scalate per istanza (ogni pedone ha già il suo
// posto in quelle mesh e ciclisti e maranza non se lo contendono mai),
// quindi il mezzo intero costa una sola chiamata nuova in tutto il gioco.
//
// Il modello guarda verso +X come tutto il resto (rotation.y = −yaw), e le
// misure parlano con la posa di Npcs.tsx: il manubrio sta dove arrivano le
// mani con le braccia protese a BRACCIO_AL_MANUBRIO radianti — chi ritocca
// una delle due sponde deve ritoccare l'altra, o le mani stringono l'aria.

import * as THREE from 'three';

export const MONOPATTINO = {
  /**
   * Quota della pedana: i piedi del maranza stanno qui, non a terra. NON è
   * la quota di un monopattino vero da catalogo: piazze e marciapiedi di
   * Lugo sono lastre a QUOTA_CALPESTIO (0,19 m) sopra lo zero degli NPC, e
   * una pedana a 12 cm ci finiva DENTRO — in piazza restava a vista il solo
   * piantone, e il maranza sembrava aggrappato a un palo della luce.
   */
  altezzaPedana: 0.25,
  /** Centri delle ruote lungo l'asse (m) e loro quota (= raggio). */
  ruotaAvanti: 0.46,
  ruotaDietro: -0.38,
  quotaRuota: 0.17,
  /** Scala da applicare alla ruota della bici (raggio 0,34 → 0,17). */
  scalaRuota: 0.5,
  /** La ruotina è tozza: il cilindro della bici (5 cm) va ingrassato. */
  spessoreRuota: 1.6,
  /** Rotazione Z delle braccia protese alla barra del manubrio. */
  braccioAlManubrio: 0.95,
} as const;

// Cache di modulo e non useMemo, per la stessa trappola documentata in
// Maranza.tsx: Npcs.tsx sta sotto Suspense e un useMemo del tentativo
// sospeso viene buttato via, geometria compresa. Qui la geometria è una e
// immortale: nasce alla prima richiesta e non si smonta mai.
let cache: THREE.BufferGeometry | null = null;

/**
 * Fusione a mano di quattro BoxGeometry: stessi attributi (position,
 * normal, uv) e stesso indice a 16 bit, quindi basta accodare i buffer e
 * rialzare gli indici. Niente BufferGeometryUtils: per quattro scatole
 * l'import di un modulo intero degli examples non ripaga.
 */
function fondi(pezzi: THREE.BoxGeometry[]): THREE.BufferGeometry {
  let nVertici = 0;
  let nIndici = 0;
  for (const p of pezzi) {
    nVertici += p.getAttribute('position').count;
    nIndici += p.getIndex()!.count;
  }
  const posizioni = new Float32Array(nVertici * 3);
  const normali = new Float32Array(nVertici * 3);
  const uv = new Float32Array(nVertici * 2);
  const indici = new Uint16Array(nIndici);
  let ov = 0;
  let oi = 0;
  for (const p of pezzi) {
    const pos = p.getAttribute('position');
    posizioni.set(pos.array as Float32Array, ov * 3);
    normali.set(p.getAttribute('normal').array as Float32Array, ov * 3);
    uv.set(p.getAttribute('uv').array as Float32Array, ov * 2);
    const idx = p.getIndex()!;
    for (let k = 0; k < idx.count; k++) indici[oi + k] = idx.getX(k) + ov;
    ov += pos.count;
    oi += idx.count;
    p.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(posizioni, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normali, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(indici, 1));
  return g;
}

/** La geometria del monopattino, già in coordinate del pedone (verso +X). */
export function geometriaMonopattino(): THREE.BufferGeometry {
  if (cache) return cache;
  const M = MONOPATTINO;
  const pezzi: THREE.BoxGeometry[] = [];
  const scatola = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) => {
    const b = new THREE.BoxGeometry(w, h, d);
    if (rz !== 0) b.rotateZ(rz);
    b.translate(x, y, z);
    pezzi.push(b);
  };
  // la pedana: il piano su cui il maranza sta in piedi
  scatola(0.62, 0.05, 0.15, 0, M.altezzaPedana - 0.025, 0);
  // il piantone: leggermente inclinato all'indietro come quelli veri, dal
  // muso della pedana fin sotto il manubrio
  scatola(0.05, 1.06, 0.05, 0.44, 0.74, 0, 0.09);
  // la barra del manubrio, dove Npcs.tsx fa arrivare le mani
  scatola(0.05, 0.05, 0.46, 0.39, 1.25, 0);
  // il parafango sopra la ruotina posteriore: è il dettaglio che da dietro
  // dice «monopattino» invece di «asse da stiro con le rotelle»
  scatola(0.16, 0.03, 0.12, M.ruotaDietro, 0.37, 0);
  cache = fondi(pezzi);
  return cache;
}
