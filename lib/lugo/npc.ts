// I pedoni di Lugo: maranza a gruppetti (metà in monopattino elettrico),
// anziani col bastone, carabinieri in coppia attorno ai landmark, più la
// gazzella di pattuglia sui viali.
// Simulazione volutamente semplice: vagabondaggio a waypoint sulle strade,
// collisione a cerchio con scivolamento, balzo laterale quando un veicolo
// in corsa arriva addosso (il giocatore, il traffico civile, la gazzella).
// Niente investimenti: qui al massimo ci si becca un'imprecazione. I pedoni
// però NON sono trasparenti: chi li tocca con l'auto li vede balzare in
// salvo ma paga in velocità, e chi gli cammina addosso a piedi li vede
// cedere il passo di lato — il giocatore non viene mai spinto né bloccato.

import type { MondoLugo } from './loadMap';
import type { MondoFisico } from './physics';
import { runtime, type RuntimeGioco } from './runtime';
import { infraGioco } from './veicoli';
import type { Modalita } from './store';

export type TipoNpc = 'maranza' | 'anziano' | 'carabiniere' | 'studente' | 'ciclista';
// Gli stati dell'incontro col maranza (avvicina/chiede/ritirata) stanno QUI
// dentro e non in una variabile parallela: così la fisica a cerchio, il
// balzo sotto le auto e l'anti-incastro continuano a valere anche mentre ti
// sta attaccando bottone. Un secondo elenco di stati avrebbe voluto dire un
// pedone che, mentre parla, smette di scansarsi dal traffico.
// 'fuga' è del guidatore che scende dall'auto che gli hai appena portato
// via: non cammina e non balza, se ne va di buon passo per qualche secondo
// e poi torna a essere un passante come tutti gli altri.
export type StatoNpc = 'cammina' | 'fermo' | 'balzo' | 'avvicina' | 'chiede' | 'ritirata' | 'fuga';

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
  /**
   * Solo maranza: gira su un monopattino elettrico. Si decide alla nascita
   * col mazzo di creaNpcs, mai a runtime: il mezzo fa parte dell'identità
   * del pedone come la tuta, e il pannello del dialogo lo deve poter
   * raccontare senza rischiare che al fotogramma dopo sia sparito.
   */
  monopattino: boolean;
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
  /** In monopattino si riparte più svelti di chiunque a piedi. */
  ritirataMonopattino: 5.8,
  /** Sotto `tieniMin` arretra, sopra `tieniMax` si rifà sotto. */
  arretra: 1.2,
  riavvicina: 1.6,
  tieniMin: 1.5,
  tieniMax: 2.6,
} as const;

const PASSO = { maranza: 1.5, anziano: 0.7, carabiniere: 1.1, studente: 1.7, ciclista: 4.2 } as const;

/**
 * L'andatura del monopattino elettrico: più del maranza a piedi (1,5) e
 * meno del ciclista (4,2), così nel traffico dei marciapiedi le tre velocità
 * si leggono a colpo d'occhio. La camminata del giocatore è 2,3: il
 * monopattino la stacca, la corsa (5,2) lo stacca ancora.
 */
export const V_MONOPATTINO = 3.4;

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
 * Il punto sul marciapiede OPPOSTO della via in cui ci si trova: la meta di
 * un attraversamento. Il vagabondaggio normale tiene i pedoni sul proprio
 * lato per decine di metri, quindi chi guida se li trovava sempre ai bordi
 * e mai davvero davanti: ogni tanto uno deve tagliare la carreggiata, ed è
 * questo a renderli un ostacolo per cui vale la pena frenare. Si specchia
 * lo scostamento laterale rispetto all'asse del tratto più vicino, con un
 * piccolo avanzamento lungo la via perché l'attraversamento venga in
 * diagonale come quelli veri, non un dietrofront a novanta gradi.
 */
export function puntoOltreLaStrada(
  mondo: MondoLugo,
  x: number,
  z: number,
  seme: { s: number },
): [number, number] | null {
  let s: SegmentoPed | null = null;
  let tBest = 0;
  let d2Best = Infinity;
  for (const seg of segmentiCamminabili(mondo)) {
    const t = Math.max(0, Math.min(1, ((x - seg.ax) * seg.dx + (z - seg.az) * seg.dz) / (seg.l * seg.l)));
    const qx = seg.ax + seg.dx * t - x;
    const qz = seg.az + seg.dz * t - z;
    const d2 = qx * qx + qz * qz;
    if (d2 < d2Best) {
      d2Best = d2;
      s = seg;
      tBest = t;
    }
  }
  // lontani dalla rete (cortili, piazze): niente attraversamento forzato
  if (!s || d2Best > 20 * 20) return null;
  const scost =
    (x - (s.ax + s.dx * tBest)) * (-s.dz / s.l) + (z - (s.az + s.dz * tBest)) * (s.dx / s.l);
  const lato = (scost >= 0 ? -1 : 1) * s.larghezza * (0.45 + rand(seme) * 0.2);
  const t = Math.max(0, Math.min(1, tBest + (rand(seme) - 0.35) * (8 / s.l)));
  return suSegmento(s, t, lato);
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
  const mazzoMonopattino: number[] = [];
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
      monopattino: false,
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
      // metà esatta in monopattino elettrico, dallo stesso schema a mazzo:
      // un sorteggio uniforme al 50% lasciava interi gruppetti tutti a piedi
      // (o tutti in sella) una volta su quattro, e la richiesta è «circa
      // metà», non «in media metà». Il passo si riscrive DOPO lo spawn
      // perché lo spawn conosce solo l'andatura a piedi del tipo.
      m.monopattino = dalMazzo(mazzoMonopattino, 2, seme) === 0;
      if (m.monopattino) m.passo = V_MONOPATTINO * (0.96 + rand(seme) * 0.08);
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
  /**
   * Il pedone che ha appena ceduto il passo al giocatore a piedi, o null.
   * La battuta di disappunto gliela mette in bocca chi chiama (Npcs.tsx via
   * maranza.ts): le frasi dei fumetti vivono nell'atlante di maranza.ts e
   * questo modulo non può importarlo — l'importazione va in una direzione
   * sola, maranza.ts → npc.ts, o nasce un ciclo.
   */
  cede: Npc | null;
}

/**
 * Il registro degli ostacoli, per il collaudo: quante frenate da contatto
 * auto-pedone (con la velocità prima e dopo l'ultima) e quanti pedoni hanno
 * ceduto il passo. Contatori nudi, azzerati mai: le prove leggono le
 * differenze, non i totali.
 */
export const registroOstacoli = { frenate: 0, vPrima: 0, vDopo: 0, cedute: 0 };

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
  mode: Modalita,
): EsitoNpcs {
  let frase: string | null = null;
  let cede: Npc | null = null;
  const out = { x: 0, z: 0 };

  // L'asse dell'auto del giocatore, per il contatto vero (tre cerchi come
  // in car.ts). Si calcola una volta sola fuori dal ciclo dei pedoni.
  const inAuto = mode === 'auto';
  const cosAuto = inAuto ? Math.cos(rt.auto.yaw) : 1;
  const sinAuto = inAuto ? Math.sin(rt.auto.yaw) : 0;
  // Il giocatore a piedi, per il cedere il passo: serve la sua direzione di
  // marcia vera (vx/vz), non lo yaw — camminando all'indietro si urta con
  // la schiena, e lo scarto deve andare via dal moto, non dallo sguardo.
  const aPiedi = mode === 'piedi' && rt.vPersona > 0.8;
  const mossaX = aPiedi ? rt.persona.vx / (rt.vPersona || 1) : 0;
  const mossaZ = aPiedi ? rt.persona.vz / (rt.vPersona || 1) : 0;

  // Tutto ciò che corre per strada, non solo l'auto del giocatore: prima i
  // pedoni vedevano soltanto lui, così le sei auto civili e la gazzella li
  // attraversavano senza che nessuno si scansasse.
  veicoli.length = 0;
  if (mode === 'auto' && Math.abs(rt.vAuto) > 4) {
    // in retromarcia il muso avanza all'indietro: il verso lo dà la velocità
    const verso = rt.vAuto >= 0 ? 1 : -1;
    veicoli.push({
      x: rt.auto.x,
      z: rt.auto.z,
      fx: Math.cos(rt.auto.yaw) * verso,
      fz: Math.sin(rt.auto.yaw) * verso,
    });
  } else if (mode === 'bici' && rt.vPersona > 4.5) {
    // una bici lanciata a trenta all'ora in mezzo al Pavaglione fa scansare
    // la gente come un'auto. Sotto i 4,5 m/s no, o i pedoni saltellerebbero
    // via al passo d'uomo di chi va a spasso pedalando.
    veicoli.push({
      x: rt.persona.x,
      z: rt.persona.z,
      fx: Math.cos(rt.persona.yaw),
      fz: Math.sin(rt.persona.yaw),
    });
  }
  for (const a of infraGioco(mondo).traffico) {
    veicoli.push({ x: a.x, z: a.z, fx: Math.cos(a.yaw), fz: Math.sin(a.yaw) });
  }
  const g = runtime.gazzella;
  if (g) veicoli.push({ x: g.x, z: g.z, fx: Math.cos(g.yaw), fz: Math.sin(g.yaw) });

  for (const n of npcs) {
    // ── l'ostacolo vero: il CONTATTO con l'auto del giocatore ───────────
    // Il balzo d'allarme qui sotto scatta a 6,5 m e di solito li salva; chi
    // viene toccato lo stesso (attraversava, era dietro un angolo, l'auto
    // era troppo veloce) balza comunque in salvo — MAI nessuno a terra —
    // ma l'auto paga: la velocità crolla e l'urto arriva alla camera. Il
    // controllo gira anche su chi è GIÀ in balzo, altrimenti l'allarme dei
    // 6,5 m «consumerebbe» il contatto e la frenata non partirebbe mai.
    if (inAuto) {
      const dxA = n.x - rt.auto.x;
      const dzA = n.z - rt.auto.z;
      if (Math.abs(dxA) < 3.4 && Math.abs(dzA) < 3.4) {
        const lungo = dxA * cosAuto + dzA * sinAuto;
        const lato = -dxA * sinAuto + dzA * cosAuto;
        // distanza dal segmento dei tre cerchi di car.ts (mezzo passo 1,3 m,
        // raggio 0,85) più il raggio del pedone: sotto 1,25 è contatto
        const oltre = Math.max(0, Math.abs(lungo) - 1.3);
        if (Math.hypot(oltre, lato) < 1.25) {
          const verso = lato >= 0 ? 1 : -1;
          n.stato = 'balzo';
          n.timer = 0.38;
          n.bx = -sinAuto * verso;
          n.bz = cosAuto * verso;
          if (frase === null) {
            frase = FRASI_BALZO[Math.floor(rand(semeFrasi) * FRASI_BALZO.length)];
          }
          const vA = Math.hypot(rt.auto.vx, rt.auto.vz);
          if (vA > 1.5) {
            // la frenata morde la velocità vera (auto.vx/vz), non solo il
            // numero da cruscotto: il prossimo stepAuto integra da qui.
            // rt.vAuto e rt.urto si aggiornano per chi legge DOPO questo
            // punto nel fotogramma — la camera dà lo scossone su rt.urto.
            rt.auto.vx *= 0.45;
            rt.auto.vz *= 0.45;
            rt.vAuto *= 0.45;
            rt.urto = Math.max(rt.urto, vA * 0.55);
            registroOstacoli.frenate++;
            registroOstacoli.vPrima = vA;
            registroOstacoli.vDopo = vA * 0.45;
          }
        }
      }
    }

    // ── cede il passo: chi cammina addosso a un pedone lo fa scartare ───
    // Lo scarto è un balzo corto e lento: bx/bz portano il MODULO oltre
    // alla direzione (il balzo integra a 6,5·|b| m/s), così non serve né un
    // nuovo stato né una velocità dedicata. Il giocatore non si tocca: si
    // sposta il pedone, mai chi cammina — il suo moto è materia del mandato
    // movimento e qui nessuno scrive rt.persona.
    if (
      aPiedi &&
      cede === null &&
      (n.stato === 'cammina' || n.stato === 'fermo' || n.stato === 'ritirata')
    ) {
      const dxP = n.x - rt.persona.x;
      const dzP = n.z - rt.persona.z;
      const dP = Math.hypot(dxP, dzP);
      // 0,9 m = raggio persona (0,35) + raggio pedone (0,3) + un quarto di
      // passo di cortesia: si scansa un attimo PRIMA dello scontro vero
      if (dP > 0.001 && dP < 0.9 && (dxP / dP) * mossaX + (dzP / dP) * mossaZ > 0.35) {
        const verso = -mossaZ * dxP + mossaX * dzP >= 0 ? 1 : -1;
        n.stato = 'balzo';
        n.timer = 0.4;
        n.bx = -mossaZ * verso * 0.38;
        n.bz = mossaX * verso * 0.38;
        registroOstacoli.cedute++;
        cede = n;
      }
    }

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
    } else if (n.stato === 'fuga') {
      // scende e se ne va: riusa la direzione del balzo (bx/bz) e il timer,
      // così non serve nessun percorso nuovo e nessuna macchina a stati
      // parallela — collisione, scivolamento, rotazione e fase del passo
      // sono già condivisi qui sotto e valgono anche per lui
      vx = n.bx * n.passo * 2.2;
      vz = n.bz * n.passo * 2.2;
      n.timer -= dt;
      if (n.timer <= 0) {
        n.stato = 'cammina';
        n.fermoDa = 0;
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
        // in monopattino ti si affianca rotolando alla SUA andatura, che è
        // già sopra quella dell'aggancio a piedi: rallentarlo a 3,1 sarebbe
        // un mezzo elettrico che frena per chiederti una sigaretta
        const passo = n.monopattino ? Math.max(PASSO_INCONTRO.avvicina, n.passo) : PASSO_INCONTRO.avvicina;
        vx = (dx / d) * passo;
        vz = (dz / d) * passo;
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
          // in monopattino la ritirata riparte sul mezzo, più veloce di
          // chiunque scappi a piedi: è la stessa scena, solo su due ruote
          const aTutta = n.monopattino ? PASSO_INCONTRO.ritirataMonopattino : PASSO_INCONTRO.ritirata;
          const passo = n.timer > 2 ? aTutta : n.passo;
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
        //
        // Una volta su cinque circa la meta non è il solito giro largo ma il
        // marciapiede DI FRONTE: l'attraversamento della carreggiata. Il
        // sorteggio pesca da semeVaganti, lo stesso LCG delle mete: resta
        // deterministico e sporadico, e mette davvero qualcuno sulla
        // traiettoria di chi guida. I gregari no: attraverserebbero
        // lasciando il capo dall'altra parte della via.
        const attraversa =
          n.segue === undefined && rand(semeVaganti) < 0.18
            ? puntoOltreLaStrada(mondo, n.x, n.z, semeVaganti)
            : null;
        const [tx, tz] = attraversa ?? puntoStradaCasuale(mondo, n.x, n.z, 130, semeVaganti);
        n.targetX = tx;
        n.targetZ = tz;
      }
    } else {
      const dx = n.targetX - n.x;
      const dz = n.targetZ - n.z;
      const d = Math.hypot(dx, dz);
      // il raggio d'arrivo del monopattino è più largo del suo raggio di
      // sterzata (2,1 m a 3,4 m/s): sotto, un bersaglio mancato di poco lo
      // faceva orbitare in tondo attorno alla meta senza arrivarci mai
      const arrivo = n.monopattino ? 2.6 : 1.2;
      if (n.segue !== undefined) {
        // il gregario non si ferma mai a chiacchierare: tiene il passo
        if (d > 0.5) {
          const spinta = d > 3 ? 1.6 : 1;
          vx = (dx / d) * n.passo * spinta;
          vz = (dz / d) * n.passo * spinta;
        }
      } else if (d < arrivo) {
        n.stato = 'fermo';
        n.timer = n.tipo === 'maranza' ? 3 + Math.random() * 10 : 1 + Math.random() * 4;
      } else if (n.monopattino) {
        // curve larghe e morbide: il monopattino non piroetta sul posto,
        // sterza verso la meta ma AVANZA lungo il proprio muso. Il blocco
        // di rotazione più sotto riceve una velocità già allineata allo
        // yaw, quindi per lui è un'identità e non c'è doppio giro.
        const voluto = Math.atan2(dz, dx);
        let dy = voluto - n.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        n.yaw += Math.max(-1.7 * dt, Math.min(1.7 * dt, dy));
        vx = Math.cos(n.yaw) * n.passo;
        vz = Math.sin(n.yaw) * n.passo;
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
        // il monopattino si volta piano anche qui (avvicinamenti, balzi,
        // ritirate): un mezzo con le ruote che scatta di 90 gradi in un
        // decimo di secondo tradisce subito di essere un pupazzo
        n.yaw += dy * Math.min(1, dt * (n.monopattino ? 3.5 : 8));
      }
    }
    n.v = Math.hypot(vx, vz);
    n.fase += n.v * dt * (n.tipo === 'anziano' ? 3.2 : 2.4);
  }

  return { frase, cede };
}

/**
 * Fa scendere un guidatore dall'auto che gli è appena stata portata via.
 *
 * L'NPC non nasce: si RICICLA. Gli InstancedMesh dei pedoni hanno capienza
 * fissa (N_NPC, che in collaudo è 30), quindi aggiungerne uno vero
 * scriverebbe fuori dall'array delle matrici e il pedone in più sarebbe
 * invisibile o, peggio, sovrascriverebbe qualcun altro. Si sceglie allora
 * il pedone più LONTANO dal ladro, sopra i 45 metri, così nessuno vede un
 * passante sparire dall'altra parte della piazza.
 *
 * La scelta è cieca a chi è: guarda soltanto la distanza. Restano fuori i
 * carabinieri (sono in servizio), i ciclisti (lascerebbero la bici per
 * terra) e i maranza in monopattino (uno che scende da un'auto in piedi sul
 * suo monopattino è un teletrasporto travestito); nessun tipo, variante,
 * colore o incarnato entra nella decisione.
 */
export function scendiEScappa(
  npcs: Npc[],
  x: number,
  z: number,
  yaw: number,
  daX: number,
  daZ: number,
): Npc | null {
  let scelto: Npc | null = null;
  let dMax = 45;
  for (const n of npcs) {
    if (n.tipo === 'carabiniere' || n.tipo === 'ciclista' || n.monopattino) continue;
    const d = Math.hypot(n.x - daX, n.z - daZ);
    if (d > dMax) {
      dMax = d;
      scelto = n;
    }
  }
  if (!scelto) return null;
  // esce dalla porta del passeggero, non da sotto le ruote del ladro
  scelto.x = x - Math.sin(yaw) * 1.6;
  scelto.z = z + Math.cos(yaw) * 1.6;
  let vx = scelto.x - daX;
  let vz = scelto.z - daZ;
  const d = Math.hypot(vx, vz) || 1;
  vx /= d;
  vz /= d;
  scelto.stato = 'fuga';
  scelto.timer = 6;
  scelto.bx = vx;
  scelto.bz = vz;
  scelto.targetX = scelto.x + vx * 60;
  scelto.targetZ = scelto.z + vz * 60;
  scelto.fermoDa = 0;
  return scelto;
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
