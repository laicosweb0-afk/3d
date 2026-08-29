// I pedoni di Lugo: maranza a gruppetti, anziani col bastone, carabinieri
// in coppia attorno ai landmark, più la gazzella di pattuglia sui viali.
// Simulazione volutamente semplice: vagabondaggio a waypoint sulle strade,
// collisione a cerchio con scivolamento, balzo laterale quando un veicolo
// in corsa arriva addosso (il giocatore, il traffico civile, la gazzella).
// Niente investimenti: qui al massimo ci si becca un'imprecazione.

import type { MondoLugo } from './loadMap';
import type { MondoFisico } from './physics';
import { runtime, type RuntimeGioco } from './runtime';
import { infraGioco } from './veicoli';

export type TipoNpc = 'maranza' | 'anziano' | 'carabiniere' | 'studente' | 'ciclista';
// Gli stati dell'incontro col maranza (avvicina/chiede/ritirata) stanno QUI
// dentro e non in una variabile parallela: così la fisica a cerchio, il
// balzo sotto le auto e l'anti-incastro continuano a valere anche mentre ti
// sta attaccando bottone. Un secondo elenco di stati avrebbe voluto dire un
// pedone che, mentre parla, smette di scansarsi dal traffico.
export type StatoNpc = 'cammina' | 'fermo' | 'balzo' | 'avvicina' | 'chiede' | 'ritirata';

export interface Npc {
  tipo: TipoNpc;
  x: number;
  z: number;
  yaw: number;
  /** Velocità di camminata propria (m/s). */
  passo: number;
  /** Fase del ciclo di camminata. */
  fase: number;
  stato: StatoNpc;
  timer: number;
  targetX: number;
  targetZ: number;
  /** Indice variante colori. */
  variante: number;
  /** Direzione del balzo. */
  bx: number;
  bz: number;
  /** Velocità corrente (per l'animazione). */
  v: number;
  /** Progresso verso il waypoint, per sbloccarsi dai muri. */
  fermoDa: number;
  /** Indice del collega da seguire (il secondo della coppia di carabinieri). */
  segue?: number;
  /** Tonalità dell'incarnato, indipendente dal vestito. */
  pelle: number;
  /** Variante del copricapo (cappellino o capelli, secondo senzaCappello). */
  cappello: number;
  senzaCappello: boolean;
  /** Solo maranza: ha una sigaretta accesa in mano. */
  fuma: boolean;
  /** Secondi alla prossima tirata; fra 0 e −durataTiro il braccio è alzato. */
  tiro: number;
  /** Accumulatore del filo di fumo. */
  fumoAcc: number;
  /** Indice in FRASI_ATLANTE della battuta sopra la testa (−1 = nessuna). */
  frase: number;
  /** Istanti dell'orologio di maranza.ts: da quando a quando si legge. */
  fraseDa: number;
  fraseFino: number;
  /** Quando ti ha già chiesto la sigaretta (orologio di maranza.ts). */
  chiesto: number;
  /**
   * La punta della sigaretta, in coordinate di mondo. La scrive Npcs.tsx
   * dentro il ciclo che costruisce la matrice del braccio, perché è l'unico
   * posto che sa davvero dov'è finita la mano: chi cambierà l'animazione
   * deve aggiornare lì accanto queste tre righe. Duplicare la cinematica in
   * maranza.ts era la strada sicura per far fluttuare la sigaretta a
   * mezz'aria al primo ritocco.
   */
  manoX: number;
  manoY: number;
  manoZ: number;
}

export const RAGGIO_NPC = 0.3;

/**
 * Le andature dei tre stati dell'incontro. Stanno qui e non in maranza.ts
 * perché è stepNpcs a muovere i piedi, e perché così l'importazione va in
 * una direzione sola (maranza.ts → npc.ts) e non nasce nessun ciclo.
 * 3,1 m/s è più della camminata del giocatore (2,3) e meno della sua corsa
 * (5,2): camminare non basta a levarselo di torno, correre sì.
 */
export const PASSO_INCONTRO = {
  avvicina: 3.1,
  ritirata: 4.6,
  /** Sotto `tieniMin` arretra, sopra `tieniMax` si rifà sotto. */
  arretra: 1.2,
  riavvicina: 1.6,
  tieniMin: 1.5,
  tieniMax: 2.6,
} as const;

const PASSO = { maranza: 1.5, anziano: 0.7, carabiniere: 1.1, studente: 1.7, ciclista: 4.2 } as const;

export const FRASI_BALZO = [
  'Uè! Sta’ attento!',
  'Boia d’un mond léder!',
  'Ciò! Guarda dove vai!',
  'Socmel!',
  'Ma sei matto?!',
] as const;

/** Battute di città, dette quando il giocatore passa vicino a piedi. */
export const FRASI_STRADA = [
  'Oh, bella!',
  'Che caldo oggi, eh.',
  'Dove vai di bello?',
  'Ci vediamo al Pavaglione.',
  'Hai visto che roba?',
  'Andiamo a prendere un caffè?',
  'Ma quanto è bello il centro oggi.',
  'Ciao ciao, ci si vede.',
] as const;

function rand(seme: { s: number }): number {
  // LCG deterministico: gli NPC nascono uguali a ogni partita
  seme.s = (seme.s * 1664525 + 1013904223) >>> 0;
  return seme.s / 4294967296;
}

/** Un tratto di strada camminabile, già pronto per il campionamento. */
interface SegmentoPed {
  ax: number;
  az: number;
  dx: number;
  dz: number;
  /** Lunghezza del tratto (m). */
  l: number;
  larghezza: number;
}

const indiceSegmenti = new WeakMap<MondoLugo, SegmentoPed[]>();

/** Tutti i tratti camminabili della mappa, appiattiti una volta per mondo. */
function segmentiCamminabili(mondo: MondoLugo): SegmentoPed[] {
  const memo = indiceSegmenti.get(mondo);
  if (memo) return memo;
  const segs: SegmentoPed[] = [];
  for (const r of mondo.roads) {
    if (
      r.classe !== 'pedonale' &&
      r.classe !== 'residenziale' &&
      r.classe !== 'servizio' &&
      r.classe !== 'secondaria'
    ) {
      continue;
    }
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      const ax = r.pts[i];
      const az = r.pts[i + 1];
      const dx = r.pts[i + 2] - ax;
      const dz = r.pts[i + 3] - az;
      const l = Math.hypot(dx, dz);
      if (l < 0.5) continue; // giunzioni degeneri: non ci si cammina
      segs.push({ ax, az, dx, dz, l, larghezza: r.larghezza });
    }
  }
  indiceSegmenti.set(mondo, segs);
  return segs;
}

/** Punto del tratto all'ascissa `t`, scostato di `lato` verso il marciapiede. */
function suSegmento(s: SegmentoPed, t: number, lato: number): [number, number] {
  const px = s.ax + s.dx * t;
  const pz = s.az + s.dz * t;
  return [px - (s.dz / s.l) * lato, pz + (s.dx / s.l) * lato];
}

// Riusato a ogni chiamata: la selezione non è mai annidata, e così non si
// alloca un array per ogni waypoint scelto in mezzo al frame.
const vicini: SegmentoPed[] = [];

/**
 * Punto casuale su una strada camminabile entro `raggio` da (x,z).
 * Si estrae fra i soli tratti che toccano davvero il disco: pescare a caso
 * su tutte le 905 strade della mappa e rifiutare quelle fuori raggio
 * riusciva nello 0,7% dei casi a raggio 8, e il ripiego «torna indietro la
 * posizione di partenza» faceva nascere i gruppetti tutti nello stesso
 * punto e inchiodava per sempre chi si fermava.
 */
export function puntoStradaCasuale(
  mondo: MondoLugo,
  x: number,
  z: number,
  raggio: number,
  seme: { s: number },
): [number, number] {
  vicini.length = 0;
  let piuVicino: SegmentoPed | null = null;
  let dist2Min = Infinity;
  let tMin = 0;
  const r2 = raggio * raggio;
  // scansione di tutti i tratti: al quadrato, senza radici, perché questa
  // gira anche in mezzo al frame quando un pedone sceglie la meta
  for (const s of segmentiCamminabili(mondo)) {
    const t = Math.max(0, Math.min(1, ((x - s.ax) * s.dx + (z - s.az) * s.dz) / (s.l * s.l)));
    const qx = s.ax + s.dx * t - x;
    const qz = s.az + s.dz * t - z;
    const d2 = qx * qx + qz * qz;
    if (d2 <= r2) vicini.push(s);
    else if (d2 < dist2Min) {
      dist2Min = d2;
      piuVicino = s;
      tMin = t;
    }
  }
  if (vicini.length) {
    const s = vicini[Math.floor(rand(seme) * vicini.length)];
    // corda del tratto dentro il disco: così è il punto estratto a stare
    // entro `raggio`, non solo il tratto che lo contiene
    const a = s.l * s.l;
    const ox = s.ax - x;
    const oz = s.az - z;
    const b = 2 * (s.dx * ox + s.dz * oz);
    const c = ox * ox + oz * oz - r2;
    const disc = b * b - 4 * a * c;
    let t0 = 0;
    let t1 = 1;
    if (disc > 0) {
      const q = Math.sqrt(disc);
      t0 = Math.max(0, (-b - q) / (2 * a));
      t1 = Math.min(1, (-b + q) / (2 * a));
    }
    const t = t0 + rand(seme) * Math.max(0, t1 - t0);
    return suSegmento(s, t, (rand(seme) - 0.5) * s.larghezza * 1.3);
  }
  // nessuna strada nel raggio: si punta alla più vicina, così chi è finito
  // fuori rete torna a camminare invece di ricevere la propria posizione
  if (piuVicino) return suSegmento(piuVicino, tMin, (rand(seme) - 0.5) * piuVicino.larghezza * 1.3);
  return [x, z];
}

/**
 * Estrazione SENZA rimpiazzo: si tiene un mazzo di `quante` carte, lo si
 * mescola e lo si distribuisce fino all'ultima prima di rimescolare.
 *
 * Sorteggiare ogni volta a caso sembrava equivalente e non lo è: con dodici
 * maranza a schermo e otto incarnati, un sorteggio uniforme lascia fuori due
 * o tre tonalità una volta su tre, e il gruppetto torna a sembrare fatto di
 * fotocopie — che è esattamente il difetto che questi campi devono togliere.
 * Col mazzo, dodici estrazioni contengono di sicuro tutti e otto gli
 * incarnati e tutte e sei le tute, e restano deterministiche.
 */
function dalMazzo(mazzo: number[], quante: number, seme: { s: number }): number {
  if (!mazzo.length) {
    for (let i = 0; i < quante; i++) mazzo.push(i);
    for (let i = mazzo.length - 1; i > 0; i--) {
      const j = Math.floor(rand(seme) * (i + 1));
      const t = mazzo[i];
      mazzo[i] = mazzo[j];
      mazzo[j] = t;
    }
  }
  return mazzo.pop() as number;
}

export function creaNpcs(mondo: MondoLugo, quanti: number): Npc[] {
  const seme = { s: 12345 };
  // Un mazzo per tratto, tenuti SEPARATI apposta: pelle, tuta, cappello e
  // sigaretta si estraggono da flussi diversi, così nessun tratto somatico
  // resta incollato a un vestito o a un comportamento. Prima l'incarnato era
  // PELLI[variante % 4], cioè il colore della pelle era una conseguenza
  // della tuta: quattro maranza e sempre gli stessi quattro.
  const mazzoPelle: number[] = [];
  const mazzoTuta: number[] = [];
  const mazzoCappello: number[] = [];
  const mazzoFumo: number[] = [];
  const npcs: Npc[] = [];
  // stessa spatial hash di tutti gli altri sistemi (edifici + auto in sosta):
  // la posizione di nascita va validata come quella della discesa dall'auto
  const fisica = infraGioco(mondo).fisica;
  const fuori = { x: 0, z: 0 };

  // ancore: densi vicino ai luoghi vivi, radi altrove
  const ancore: [number, number][] = [];
  for (const id of ['pavaglione', 'baracca', 'rocca', 'stazione', 'bar']) {
    const p = mondo.poi.get(id);
    if (p) ancore.push([p.xm, p.zm]);
  }
  if (!ancore.length) ancore.push([0, 0]);

  const spawn = (tipo: TipoNpc, ax: number, az: number, raggio: number) => {
    // lo scostamento verso il marciapiede arriva a 0,65 volte la larghezza
    // della via e può finire dentro una facciata o dentro un'auto in sosta:
    // chi nasce fermo non si muoverebbe mai e resterebbe incastrato lì
    let x = 0;
    let z = 0;
    for (let tentativi = 0; tentativi < 6; tentativi++) {
      const p = puntoStradaCasuale(mondo, ax, az, raggio, seme);
      x = p[0];
      z = p[1];
      if (fisica.cerchioLibero(x, z, RAGGIO_NPC)) break;
      if (tentativi === 5) {
        // vie strette: nessun punto libero, si esce a spinta dal collider
        fisica.risolviCerchio(x, z, RAGGIO_NPC, fuori);
        x = fuori.x;
        z = fuori.z;
      }
    }
    const npc: Npc = {
      tipo,
      x,
      z,
      yaw: rand(seme) * Math.PI * 2,
      passo: PASSO[tipo] * (0.85 + rand(seme) * 0.3),
      fase: rand(seme) * Math.PI * 2,
      stato: rand(seme) < 0.3 ? 'fermo' : 'cammina',
      timer: 1 + rand(seme) * 5,
      targetX: x,
      targetZ: z,
      variante: Math.floor(rand(seme) * 4),
      bx: 0,
      bz: 0,
      v: 0,
      fermoDa: 0,
      pelle: dalMazzo(mazzoPelle, 8, seme),
      cappello: dalMazzo(mazzoCappello, 5, seme),
      senzaCappello: rand(seme) < 0.22,
      fuma: false,
      tiro: 2 + rand(seme) * 14,
      fumoAcc: 0,
      frase: -1,
      fraseDa: 0,
      fraseFino: 0,
      chiesto: -1e9,
      manoX: 0,
      manoY: 0,
      manoZ: 0,
    };
    const [tx, tz] = puntoStradaCasuale(mondo, x, z, 120, seme);
    npc.targetX = tx;
    npc.targetZ = tz;
    npcs.push(npc);
    return npc;
  };

  // carabinieri: coppie fisse vicino ai landmark istituzionali
  for (const id of ['rocca', 'pavaglione', 'stazione']) {
    const p = mondo.poi.get(id);
    if (!p) continue;
    const capo = spawn('carabiniere', p.xm, p.zm, 60);
    const indiceCapo = npcs.length - 1;
    const secondo = spawn('carabiniere', p.xm, p.zm, 60);
    // il secondo cammina di fianco al primo, sempre
    secondo.segue = indiceCapo;
    secondo.x = capo.x + 0.9;
    secondo.z = capo.z + 0.3;
    secondo.passo = capo.passo;
    secondo.stato = 'cammina';
  }

  // maranza: gruppetti di 2-3 attorno alle piazze
  const nMaranza = Math.floor(quanti * 0.42);
  let fatti = 0;
  while (fatti < nMaranza) {
    const [ax, az] = ancore[Math.floor(rand(seme) * ancore.length)];
    const gruppo = 2 + Math.floor(rand(seme) * 2);
    const [gx, gz] = puntoStradaCasuale(mondo, ax, az, 160, seme);
    for (let i = 0; i < gruppo && fatti < nMaranza; i++, fatti++) {
      const m = spawn('maranza', gx, gz, 12);
      // sei tute invece di quattro, e una sigaretta accesa a uno su due:
      // il mazzo garantisce la proporzione senza affidarla alla fortuna
      m.variante = dalMazzo(mazzoTuta, 6, seme);
      m.fuma = dalMazzo(mazzoFumo, 4, seme) < 2;
      if (rand(seme) < 0.45) {
        m.stato = 'fermo'; // in posa col telefono
        m.timer = 6 + rand(seme) * 14;
      }
    }
  }

  // studenti: a coppie, veloci, vicino al centro e alla stazione
  const nStudenti = Math.floor(quanti * 0.16);
  for (let i = 0; i < nStudenti; i += 2) {
    const [ax, az] = ancore[Math.floor(rand(seme) * ancore.length)];
    const [gx, gz] = puntoStradaCasuale(mondo, ax, az, 200, seme);
    spawn('studente', gx, gz, 8);
    if (i + 1 < nStudenti) spawn('studente', gx, gz, 8);
  }

  // ciclisti: in Romagna la bici è di serie
  const nCiclisti = Math.floor(quanti * 0.12);
  for (let i = 0; i < nCiclisti; i++) {
    const [ax, az] = ancore[Math.floor(rand(seme) * ancore.length)];
    const c = spawn('ciclista', ax, az, 260);
    c.stato = 'cammina'; // in bici non ci si ferma a chiacchierare
  }

  // anziani: sparsi, lenti
  const nAnziani = Math.max(0, quanti - npcs.length);
  for (let i = 0; i < nAnziani; i++) {
    const [ax, az] = ancore[Math.floor(rand(seme) * ancore.length)];
    spawn('anziano', ax, az, 240);
  }

  return npcs;
}

export interface EsitoNpcs {
  /** Una frase da mostrare (balzo appena scattato), o null. */
  frase: string | null;
}

const semeFrasi = { s: 777 };
// Semi condivisi e persistenti: la partita resta deterministica ma la
// sequenza avanza sempre, non si ripete uguale a parità di posizione.
const semeVaganti = { s: 20260 };

/** I veicoli in corsa visti dai pedoni in questo frame (buffer riusato). */
const veicoli: { x: number; z: number; fx: number; fz: number }[] = [];

export function stepNpcs(
  npcs: Npc[],
  dt: number,
  mondo: MondoLugo,
  fisica: MondoFisico,
  rt: RuntimeGioco,
  modeAuto: boolean,
): EsitoNpcs {
  let frase: string | null = null;
  const out = { x: 0, z: 0 };

  // Tutto ciò che corre per strada, non solo l'auto del giocatore: prima i
  // pedoni vedevano soltanto lui, così le sei auto civili e la gazzella li
  // attraversavano senza che nessuno si scansasse.
  veicoli.length = 0;
  if (modeAuto && Math.abs(rt.vAuto) > 4) {
    // in retromarcia il muso avanza all'indietro: il verso lo dà la velocità
    const verso = rt.vAuto >= 0 ? 1 : -1;
    veicoli.push({
      x: rt.auto.x,
      z: rt.auto.z,
      fx: Math.cos(rt.auto.yaw) * verso,
      fz: Math.sin(rt.auto.yaw) * verso,
    });
  }
  for (const a of infraGioco(mondo).traffico) {
    veicoli.push({ x: a.x, z: a.z, fx: Math.cos(a.yaw), fz: Math.sin(a.yaw) });
  }
  const g = runtime.gazzella;
  if (g) veicoli.push({ x: g.x, z: g.z, fx: Math.cos(g.yaw), fz: Math.sin(g.yaw) });

  for (const n of npcs) {
    // un veicolo arriva addosso → balzo laterale
    if (n.stato !== 'balzo') {
      for (const v of veicoli) {
        const dx = n.x - v.x;
        const dz = n.z - v.z;
        if (Math.abs(dx) > 6.5 || Math.abs(dz) > 6.5) continue;
        if (Math.hypot(dx, dz) >= 6.5) continue;
        // solo se il pedone è ancora davanti: da chi è già passato non ci
        // si scansa, altrimenti si salterebbe a ogni auto che si allontana
        if (dx * v.fx + dz * v.fz < -1) continue;
        n.stato = 'balzo';
        n.timer = 0.38;
        // via dalla traiettoria: perpendicolare alla marcia del veicolo
        const lato = -v.fz * dx + v.fx * dz >= 0 ? 1 : -1;
        n.bx = -v.fz * lato;
        n.bz = v.fx * lato;
        if (frase === null && Math.random() < 0.5) {
          frase = FRASI_BALZO[Math.floor(rand(semeFrasi) * FRASI_BALZO.length)];
        }
        break;
      }
    }

    // il gregario tiene la posizione di fianco al capo
    if (n.segue !== undefined && n.stato !== 'balzo') {
      const capo = npcs[n.segue];
      n.targetX = capo.x - Math.sin(capo.yaw) * 0.95 - Math.cos(capo.yaw) * 0.2;
      n.targetZ = capo.z + Math.cos(capo.yaw) * 0.95 - Math.sin(capo.yaw) * 0.2;
      n.stato = 'cammina';
    }

    let vx = 0;
    let vz = 0;
    if (n.stato === 'balzo') {
      vx = n.bx * 6.5;
      vz = n.bz * 6.5;
      n.timer -= dt;
      if (n.timer <= 0) {
        n.stato = 'fermo';
        n.timer = 0.8 + Math.random() * 1.5;
      }
    } else if (n.stato === 'avvicina') {
      // ti viene incontro: il bersaglio lo riscrive maranza.ts a ogni frame,
      // e qui NON vale la resa a 1,2 m del vagabondaggio — se ci cadesse
      // dentro, il maranza ti arriverebbe a un metro e si dimenticherebbe
      // di te proprio mentre sta per parlarti
      const dx = n.targetX - n.x;
      const dz = n.targetZ - n.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        vx = (dx / d) * PASSO_INCONTRO.avvicina;
        vz = (dz / d) * PASSO_INCONTRO.avvicina;
      }
    } else if (n.stato === 'chiede') {
      // ti sta davanti e tiene la distanza: se gli cammini addosso arretra,
      // se ti allontani si rifà sotto. E ti guarda in faccia ANCHE da fermo:
      // la rotazione più in basso vale solo per chi si muove, e uno che ti
      // parla dandoti la schiena è la prima cosa che si nota.
      const dx = rt.persona.x - n.x;
      const dz = rt.persona.z - n.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < PASSO_INCONTRO.tieniMin) {
        vx = (-dx / d) * PASSO_INCONTRO.arretra;
        vz = (-dz / d) * PASSO_INCONTRO.arretra;
      } else if (d > PASSO_INCONTRO.tieniMax) {
        vx = (dx / d) * PASSO_INCONTRO.riavvicina;
        vz = (dz / d) * PASSO_INCONTRO.riavvicina;
      }
      let dy = Math.atan2(dz, dx) - n.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      n.yaw += dy * Math.min(1, dt * 8);
    } else if (n.stato === 'ritirata') {
      // se ne va di buon passo per qualche secondo, poi rallenta e torna a
      // vagabondare: senza il ritorno a 'cammina' resterebbe in ritirata per
      // sempre, cioè un pedone che scappa da un fatto di dieci minuti fa
      n.timer -= dt;
      if (n.timer <= 0) {
        n.stato = 'cammina';
      } else {
        const dx = n.targetX - n.x;
        const dz = n.targetZ - n.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.6) {
          const passo = n.timer > 2 ? PASSO_INCONTRO.ritirata : n.passo;
          vx = (dx / d) * passo;
          vz = (dz / d) * passo;
        }
      }
    } else if (n.stato === 'fermo') {
      n.timer -= dt;
      if (n.timer <= 0) {
        n.stato = 'cammina';
        // il seme deve avanzare, non ripartire dalla posizione: un NPC fermo
        // ricalcolava lo stesso seme a ogni scadenza e quindi la stessa meta,
        // restando immobile per tutta la partita
        const [tx, tz] = puntoStradaCasuale(mondo, n.x, n.z, 130, semeVaganti);
        n.targetX = tx;
        n.targetZ = tz;
      }
    } else {
      const dx = n.targetX - n.x;
      const dz = n.targetZ - n.z;
      const d = Math.hypot(dx, dz);
      if (n.segue !== undefined) {
        // il gregario non si ferma mai a chiacchierare: tiene il passo
        if (d > 0.5) {
          const spinta = d > 3 ? 1.6 : 1;
          vx = (dx / d) * n.passo * spinta;
          vz = (dz / d) * n.passo * spinta;
        }
      } else if (d < 1.2) {
        n.stato = 'fermo';
        n.timer = n.tipo === 'maranza' ? 3 + Math.random() * 10 : 1 + Math.random() * 4;
      } else {
        vx = (dx / d) * n.passo;
        vz = (dz / d) * n.passo;
      }
    }

    if (vx !== 0 || vz !== 0) {
      n.x += vx * dt;
      n.z += vz * dt;
      const contatto = fisica.risolviCerchio(n.x, n.z, RAGGIO_NPC, out);
      if (contatto) {
        n.x = out.x;
        n.z = out.z;
        n.fermoDa += dt;
        // incastrato contro un muro: cambia meta
        if (n.fermoDa > 2 && n.stato === 'cammina') {
          n.fermoDa = 0;
          n.stato = 'fermo';
          n.timer = 0.5;
        }
      } else {
        n.fermoDa = 0;
      }
      // chi sta parlando ha già girato la faccia verso di te: qui si
      // guarderebbe la direzione di marcia, cioè si volterebbe dall'altra
      // parte proprio mentre arretra di un passo
      if (n.stato !== 'chiede') {
        const targetYaw = Math.atan2(vz, vx);
        let dy = targetYaw - n.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        n.yaw += dy * Math.min(1, dt * 8);
      }
    }
    n.v = Math.hypot(vx, vz);
    n.fase += n.v * dt * (n.tipo === 'anziano' ? 3.2 : 2.4);
  }

  return { frase };
}

// ── gazzella di pattuglia ───────────────────────────────────────────────────

export interface Gazzella {
  x: number;
  z: number;
  yaw: number;
  /** Percorso: la polilinea più lunga tra primarie e secondarie. */
  percorso: Float32Array;
  /** Ascissa curvilinea corrente (m) e verso (+1/−1). */
  s: number;
  verso: 1 | -1;
  lunghezza: number;
}

export function creaGazzella(mondo: MondoLugo): Gazzella | null {
  let migliore: Float32Array | null = null;
  let migliorLunghezza = 0;
  for (const r of mondo.roads) {
    if (r.classe !== 'primaria' && r.classe !== 'secondaria') continue;
    let l = 0;
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      l += Math.hypot(r.pts[i + 2] - r.pts[i], r.pts[i + 3] - r.pts[i + 1]);
    }
    if (l > migliorLunghezza) {
      migliorLunghezza = l;
      migliore = r.pts;
    }
  }
  if (!migliore || migliorLunghezza < 80) return null;
  return {
    x: migliore[0],
    z: migliore[1],
    yaw: 0,
    percorso: migliore,
    s: 0,
    verso: 1,
    lunghezza: migliorLunghezza,
  };
}

const V_GAZZELLA = 7;
const V_INSEGUIMENTO = 15;

/**
 * Pattuglia sui viali; con `caccia` punta dritta al giocatore (wanted):
 * niente percorso, solo pressione — arcade quanto basta.
 */
export function stepGazzella(
  g: Gazzella,
  dt: number,
  caccia?: { x: number; z: number },
): void {
  if (caccia) {
    const dx = caccia.x - g.x;
    const dz = caccia.z - g.z;
    const d = Math.hypot(dx, dz);
    if (d > 3.2) {
      const passo = Math.min(V_INSEGUIMENTO * dt, d - 3);
      g.x += (dx / d) * passo;
      g.z += (dz / d) * passo;
      g.yaw = Math.atan2(dz, dx);
    }
    // aggiorna l'ascissa al punto del percorso più vicino? No: al rientro
    // in pattuglia riparte da dove si trova l'ascissa salvata, va benissimo.
    return;
  }
  g.s += V_GAZZELLA * dt * g.verso;
  if (g.s >= g.lunghezza) {
    g.s = g.lunghezza;
    g.verso = -1;
  } else if (g.s <= 0) {
    g.s = 0;
    g.verso = 1;
  }
  // posizione lungo la polilinea all'ascissa s
  let resto = g.s;
  const pts = g.percorso;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const dx = pts[i + 2] - pts[i];
    const dz = pts[i + 3] - pts[i + 1];
    const l = Math.hypot(dx, dz);
    if (resto <= l || i + 4 >= pts.length) {
      const t = l > 0 ? Math.min(1, resto / l) : 0;
      g.x = pts[i] + dx * t;
      g.z = pts[i + 1] + dz * t;
      const dir = g.verso;
      g.yaw = Math.atan2(dz * dir, dx * dir);
      return;
    }
    resto -= l;
  }
}
