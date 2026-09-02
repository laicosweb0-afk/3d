// Controller del personaggio a piedi.
//
// Regole del movimento, in chiaro perché non si perdano:
//  1. l'input arriva come DUE ASSI normalizzati (ax = destra, az = avanti),
//     identici che vengano dalla tastiera o dal joystick;
//  2. quegli assi si trasformano nel piano del mondo usando il riferimento
//     della CAMERA: "avanti" è ciò che il giocatore vede come avanti;
//  3. il personaggio RUOTA verso la direzione richiesta e cammina lungo la
//     direzione in cui guarda — così non scivola mai di lato e non sembra
//     mai andare al contrario;
//  4. mentre gira stretto rallenta, come farebbe una persona vera;
//  5. tutto è in metri al secondo e moltiplicato per dt: la velocità non
//     dipende dagli FPS.
//
// Convenzioni degli assi (le stesse di tutto il gioco): x = est, z = sud,
// yaw = atan2(dz, dx) — 0 guarda +x. Il modello 3D è costruito lungo +X e
// viene ruotato con `rotation.y = -yaw`, che è la corrispondenza corretta
// fra questo sistema e quello di three.js.

import type { MondoFisico } from './physics';
import type { StatoInput } from './input';

export interface StatoPersona {
  x: number;
  z: number;
  /** Direzione verso cui guarda il modello (rad). */
  yaw: number;
  vx: number;
  vz: number;
  /** Fase del passo per l'animazione (cresce con la distanza percorsa). */
  fase: number;
  /**
   * Quota da terra in metri: 0 al suolo, sale solo durante il salto. È una
   * dimensione IN PIÙ, non un cambio del moto orizzontale: gli assi, la
   * rampa e lo yaw non la guardano mai.
   */
  y: number;
  /** Velocità verticale (m/s), viva solo in aria. */
  vy: number;
}

/** Tutti i numeri del movimento in un posto solo, facili da ritoccare. */
/** Radianti di fase per metro percorso: 2π / 1.8 m di falcata. */
const FALCATA = 3.5;

export const PERSONA = {
  vCammina: 2.3,
  vCorsa: 5.2,
  /** m/s²: quanto in fretta si prende velocità. */
  accelerazione: 16,
  /** m/s²: quanto in fretta ci si ferma (più alta: stop più secco). */
  decelerazione: 22,
  /** rad/s: quanto in fretta il personaggio si gira. */
  velRotazione: 11,
  /**
   * Sotto questo modulo l'input è considerato nullo. Serve SOLO contro le
   * derive numeriche: la tastiera manda 0 o 1 esatti, e il pad ha già la
   * sua zona morta (ZONA_MORTA in stick.ts), che riporta la spinta a
   * partire da zero. Il vecchio 0.12, applicato qui sulla spinta GIÀ
   * riscalata, era una SECONDA zona morta: il movimento partiva solo a
   * ~13 px di palla sui 46 (il 28% della corsa mangiato) e, quando
   * partiva, lo faceva con un gradino di 0.12·2.3 = 0,28 m/s invece che
   * da zero — esattamente lo scatto che il riscalo del pad prometteva di
   * evitare.
   */
  zonaMorta: 0.02,
  raggio: 0.35,
  /**
   * m/s d'impulso verticale del salto. Con la gravità qui sotto l'apice è
   * ~0,59 m e si sta in aria ~0,7 s: quanto basta per un muretto da mezzo
   * metro senza sembrare sulla luna. Niente coyote-time e niente buffering:
   * si salta da terra, punto.
   */
  saltoImpulso: 3.4,
  /** m/s²: la gravità del salto (quella vera, non quella dei platform). */
  gravita: 9.8,
} as const;

/** Differenza fra due angoli, riportata in (−π, π]. */
function delta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function stepPersona(
  s: StatoPersona,
  input: StatoInput,
  dt: number,
  fisica: MondoFisico,
  cameraYaw: number,
  /**
   * true nell'ISTANTE in cui si chiede il salto (il fronte del tasto lo fa
   * il Player, che è l'unico a sapere di fuoco e bottoni dello schermo).
   * Sta a parte e non dentro StatoInput per la stessa ragione per cui
   * `corsa` è opzionale: gli StatoInput costruiti a mano dai banchi di
   * prova non devono cambiare di una virgola.
   */
  salta = false,
): number {
  // ── 1. l'input nel riferimento della camera ──────────────────────────
  // avanti = dove guarda la camera; destra = avanti ruotato di +90° nel
  // piano x-z, che con questi assi è (−sin, +cos).
  const cy = Math.cos(cameraYaw);
  const sy = Math.sin(cameraYaw);
  const ax = input.ax;
  const az = input.az;
  const spinta = Math.min(1, Math.hypot(ax, az));

  let vTarget = 0;
  let yawTarget = s.yaw;
  if (spinta > PERSONA.zonaMorta) {
    const wx = az * cy - ax * sy;
    const wz = az * sy + ax * cy;
    yawTarget = Math.atan2(wz, wx);
    // La corsa è ANALOGICA: 0 camminata, 1 sprint pieno. La tastiera manda
    // 0 o 1 secchi (Shift), lo stick la sfuma nell'ultimo tratto della
    // palla: così il bersaglio di velocità è CONTINUO fra 2,3 e 5,2 m/s e
    // la rampa non riceve mai il gradino da +2,9 che faceva oscillare
    // cammina/corri sul bordo della vecchia soglia. Chi non fornisce
    // `corsa` (gli StatoInput costruiti a mano) vale il booleano di sempre.
    const corsa = input.corsa ?? (input.corri ? 1 : 0);
    vTarget = spinta * (PERSONA.vCammina + corsa * (PERSONA.vCorsa - PERSONA.vCammina));
  }

  // ── 2. rotazione morbida verso la direzione richiesta ────────────────
  const scarto = delta(yawTarget, s.yaw);
  if (vTarget > 0) {
    const passoMax = PERSONA.velRotazione * dt;
    s.yaw += Math.abs(scarto) <= passoMax ? scarto : Math.sign(scarto) * passoMax;
    // girando stretto si rallenta: niente virate innaturali a piena velocità
    const strettezza = Math.min(1, Math.abs(scarto) / Math.PI);
    vTarget *= 1 - 0.75 * strettezza;
  }

  // ── 3. velocità con accelerazione e decelerazione ────────────────────
  const vAttuale = Math.hypot(s.vx, s.vz);
  const rampa = vTarget > vAttuale ? PERSONA.accelerazione : PERSONA.decelerazione;
  let v = vAttuale + Math.sign(vTarget - vAttuale) * rampa * dt;
  // niente oltrepassamenti: la rampa non deve scavalcare il bersaglio
  if ((vTarget > vAttuale && v > vTarget) || (vTarget < vAttuale && v < vTarget)) v = vTarget;
  if (v < 0.02) v = 0;

  // si cammina SEMPRE lungo la direzione in cui si guarda
  s.vx = Math.cos(s.yaw) * v;
  s.vz = Math.sin(s.yaw) * v;

  // ── 3b. il salto: la quota, e SOLO la quota ──────────────────────────
  // Si stacca da terra solo da terra (y = 0): in aria il tasto non fa
  // niente, quindi il doppio salto non esiste per costruzione. Il moto
  // orizzontale qui sopra non è stato toccato di una riga: in volo la
  // rampa, lo yaw e le zone morte lavorano identici, e l'unica cosa che
  // cambia è che risolviCerchio riceve la quota e lascia passare sopra
  // gli ostacoli bassi. Il confronto è `=== 0` e non `<= 0` per pigrizia
  // difensiva: uno stato costruito a mano senza `y` resta a terra.
  if (salta && s.y === 0) s.vy = PERSONA.saltoImpulso;
  if (s.y > 0 || s.vy > 0) {
    s.vy -= PERSONA.gravita * dt;
    s.y += s.vy * dt;
    // all'atterraggio si torna ESATTAMENTE a zero: niente code asintotiche,
    // il terreno di Lugo è piatto e y è anche la chiave del "sono a terra"
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
    }
  }

  // ── 4. spostamento e collisione ──────────────────────────────────────
  // da dove si parte: serve dopo, per misurare quanto ci si è mossi DAVVERO
  const x0 = s.x;
  const z0 = s.z;
  s.x += s.vx * dt;
  s.z += s.vz * dt;

  const out = { x: 0, z: 0 };
  // la quota entra nella fisica: a terra (y=0) panchine e fioriere sono
  // muri come tutto il resto, in volo si scavalcano se si è sopra la loro h
  const contatto = fisica.risolviCerchio(s.x, s.z, PERSONA.raggio, out, s.y);
  if (contatto) {
    s.x = out.x;
    s.z = out.z;
    // si scivola lungo il muro invece di incollarsi
    const [nx, nz] = contatto;
    const vn = s.vx * nx + s.vz * nz;
    if (vn < 0) {
      s.vx -= nx * vn;
      s.vz -= nz * vn;
    }
    // Negli ANGOLI CONCAVI la proiezione qui sopra non basta: risolviCerchio
    // risolve la posizione contro TUTTI i collider ma ritorna UNA normale
    // sola (l'ultima del suo ciclo), quindi la componente lungo l'altro
    // muro sopravviveva intatta, la rampa la ripompava a ~4,9 a ogni frame
    // e da fermi nella rientranza si "sprintava" a 4,7 m/s riportati — con
    // l'animazione, che legge questa velocità, a frullare i piedi contro
    // il muro. La verità sta nella POSIZIONE, che è risolta bene: la
    // velocità che si tiene (e si riporta) non può superare lo spostamento
    // davvero percorso nel fotogramma. Sul muro piatto e negli scivoli il
    // percorso coincide con lo scivolo e questo taglio non tocca niente.
    const percorso = Math.hypot(s.x - x0, s.z - z0);
    const passoScivolo = Math.hypot(s.vx, s.vz) * dt;
    if (passoScivolo > percorso) {
      const r = passoScivolo > 1e-9 ? percorso / passoScivolo : 0;
      // r al QUADRATO, non r semplice. Col rapporto semplice la velocità
      // tenuta pareggiava sempre il passo del frame, la rampa ci rimetteva
      // sopra la sua parte al frame dopo, e nell'angolo l'equilibrio era
      // un vibrare sul posto a ~0,5 m/s riportati (misurato al bar Jolly:
      // zig-zag di ~2,7 cm a frame fra le due pareti, spostamento netto
      // quasi nullo). Il quadrato spegne la retroazione: a passo quasi
      // pieno r²≈r≈1 e gli scivoli veri non cambiano di niente, a passo
      // mangiato dal muro la velocità muore davvero invece di rimbalzare.
      s.vx *= r * r;
      s.vz *= r * r;
    }
  }

  // ── 5. animazione al passo con la velocità reale ─────────────────────
  // La fase avanza con la DISTANZA percorsa — quella vera, misurata sulla
  // posizione, non la velocità post-scivolo: contro un muro lo spostamento
  // è zero e i piedi si fermano invece di strisciare. Il fattore è la
  // falcata: con l'ampiezza d'anca di Character.tsx (±0.5 rad su una gamba
  // di 0.94 m) un ciclo completo copre circa 1,8 m, cioè due passi da
  // 90 cm. Con il vecchio 2.2 il ciclo copriva 2,9 m e i piedi
  // strisciavano sull'asfalto.
  const vFinale = Math.hypot(s.vx, s.vz);
  // In aria la fase si CONGELA: le gambe sono raccolte (Character le piega
  // apposta) e un ciclo di camminata che avanza a mezz'aria si rivedrebbe
  // all'atterraggio come uno scatto del passo. La guardia è !(y > 0) e non
  // y === 0, così uno stato senza `y` continua a camminare come sempre.
  if (vFinale > 0.05 && !(s.y > 0)) s.fase += Math.hypot(s.x - x0, s.z - z0) * FALCATA;
  return vFinale;
}
