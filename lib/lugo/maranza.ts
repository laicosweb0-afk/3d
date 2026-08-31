// L'incontro col maranza: quello che ti si stacca dal gruppetto, ti viene
// incontro e ti chiede una sigaretta. Qui dentro c'è tutto il cervello della
// scena — le battute, la macchina a stati dell'aggancio, l'insistenza, la
// ritirata, il cooldown che lo rende raro, la reazione al pugno e le
// particelle di fumo. Fuori di qui restano solo i pixel: chi disegna sta in
// components/lugo/Maranza.tsx, chi tocca lo store sta in Npcs.tsx.
//
// È un modulo PURO come npc.ts: niente React, niente store, niente THREE.
// Le funzioni restituiscono «esiti» (apri questo pannello, dai questi REP,
// suona questo) e chi chiama li applica. Serve a tenere una sola verità:
// quando l'HUD applicava da sé il +25 REP mentre il ciclo di gioco andava
// avanti per conto suo, il pannello diceva «grazie» e il maranza in strada
// continuava a insistere.
//
// ── REGOLE DI SCRITTURA DELLE BATTUTE, non negoziabili ────────────────────
// Nessuna parolaccia, nessun insulto, nessuna minaccia. Nessun riferimento a
// etnia, provenienza, religione o aspetto fisico: le 48 battute qui sotto
// sono un repertorio UNICO, valido per tutti i maranza allo stesso modo, e
// nessuna riga di questo file legge mai n.pelle. Il maranza è un ragazzo che
// ti chiede una sigaretta con insistenza e poi si arrende: non è un
// pericolo, non è una categoria di persone, ed è comico che non lo sia.
// Il romagnolo («ciò», «boia d'un mond léder», «va'») è colore locale, non
// la caricatura di qualcuno.
//
// ── IL FURTO, LA SIGARETTA, LA FINZIONE ───────────────────────────────────
// La sigaretta è un oggetto di scena senza marca, senza pacchetto e senza
// negozio: non compare in attivita.json, non apre nessuna partnership e non
// si compra da nessuna parte. Chiedere, dare, rifiutare e prendersi un pugno
// sono gesti di finzione, come in un gioco d'azione qualunque.

import { puntoStradaCasuale, PASSO_INCONTRO, type Npc } from './npc';
import type { MondoLugo } from './loadMap';
import type { MondoFisico } from './physics';
import { QA } from './qa';

export type MomentoFrase =
  | 'aggancio'
  | 'insistenza'
  | 'si'
  | 'pugno'
  | 'fuga'
  | 'gruppo'
  | 'ostacolo';

/**
 * Le battute, in ordine: l'indice È la cella dell'atlante disegnato da
 * Maranza.tsx, quindi l'ordine non si tocca e le nuove si aggiungono in
 * coda al proprio gruppo (aggiornando GRUPPI).
 */
export const FRASI_ATLANTE: readonly string[] = [
  // AGGANCIO — 0..7
  'Ohi! Ce l’hai una sigaretta?',
  'Bella! Una sigaretta ce l’hai?',
  'Oh raga, me la fai una sigaretta?',
  'Scusa eh... una paglia ce l’hai?',
  'Ohi bro, una sigaretta e non ti disturbo più.',
  'Ciò, dammi una sigaretta va’.',
  'Bella zio! Una paglia?',
  'Oh, hai mica una sigaretta? Giuro, l’ultima.',
  // INSISTENZA dopo il no — 8..15
  'Dai... dai, fai il bravo.',
  'Ma dai, una sola, cosa ti cambia?',
  'Dai su, dammi la sigaretta e siamo a posto.',
  'Ciò, non fare così: una e basta.',
  'Guarda che poi te ne offro due, eh.',
  'Dai bro, giuro che è l’ultima della giornata.',
  'Ma come no... mica te ne avanza una?',
  'Uffa. Dammela e ti lascio andare, promesso.',
  // REAZIONE AL SÌ — 16..22
  'Grande! Sei un bravo, giuro.',
  'Ohi, questo sì che è un signore.',
  'Bene bene, grazie zio!',
  'Te la ricambio, promesso.',
  'Boia, che uomo. Grazie eh.',
  'Sei il numero uno, ciao bello!',
  'Ecco, così si fa. Buona giornata!',
  // REAZIONE AL PUGNO — 23..29
  'Ohi ohi ohi! Ma sei matto?!',
  'Aiaaa! E cosa ti ho fatto?!',
  'Boia d’un mond léder, che manata!',
  'Va bene, va bene: me ne vado!',
  'Oh, calma! Calma, eh!',
  'Ciò! Ma sei fuori di testa?!',
  'Niente sigaretta, ho capito, niente sigaretta!',
  // RINUNCIA / TI HA PERSO — 30..36
  'Ma dove scappi? Vai va’...',
  'Vabbè, ciao eh.',
  'Boh. Buona giornata lo stesso.',
  'Eh, va bene: non fumo più.',
  'Ciò, che fretta. Ci si vede.',
  'Niente sigaretta, pazienza.',
  'Va’ va’, che poi ti stanchi.',
  // I COMPAGNI, dopo il pugno — 37..42
  'Oh oh oh! Fermi tutti!',
  'Lascia perdere, andiamo va’.',
  'Ciò, questo mena! Via, via.',
  'Ma cosa gli è preso?',
  'Dai, non ne vale la pena: andiamo.',
  'Sta’ calmo eh, noi ce ne andiamo.',
  // CEDE IL PASSO, urtato per strada — 43..47: disappunto breve, mai un
  // insulto. Sono le battute di CHIUNQUE, non solo dei maranza: le dicono
  // anche anziani e studenti, quindi ancora più miti di quelle del balzo.
  'Uè, guarda avanti!',
  'Oh! C’ero prima io, eh.',
  'Ciò, che maniere...',
  'Permesso... anzi, passa va’.',
  'Ohi, un po’ d’occhio!',
];

/** [primo, ultimo+1] dentro FRASI_ATLANTE. */
export const GRUPPI: Record<MomentoFrase, readonly [number, number]> = {
  aggancio: [0, 8],
  insistenza: [8, 16],
  si: [16, 23],
  pugno: [23, 30],
  fuga: [30, 37],
  gruppo: [37, 43],
  ostacolo: [43, 48],
};

/**
 * Le manopole dell'incontro. I due cooldown sono la risposta alla domanda
 * «e se diventa molesto?»: uno ti lascia in pace per un minuto e passa dopo
 * OGNI incontro (e cresce a ogni giro), l'altro impedisce che sia sempre lo
 * stesso ragazzo a fermarti. In collaudo l'incontro non parte MAI da solo
 * (attesaInizioPartita irraggiungibile): lo si provoca con l'apposito hook,
 * altrimenti un pannello aperto a sorpresa spaccherebbe le fasi che stanno
 * misurando le vetrine o la bacheca.
 */
export const INCONTRO = {
  raggioAggancio: 9,
  raggioVista: 12,
  distanzaParla: 2,
  distanzaMin: PASSO_INCONTRO.tieniMin,
  distanzaMax: PASSO_INCONTRO.tieniMax,
  vAvvicina: PASSO_INCONTRO.avvicina,
  vRitirata: PASSO_INCONTRO.ritirata,
  tempoMaxAvvicina: 9,
  tempoMaxIncontro: 22,
  attesaRisposta: 9,
  giriMax: 2,
  vFuga: 4,
  tempoFuga: 1.2,
  cooldownGlobale: 75,
  cooldownNpc: 240,
  attesaInizioPartita: QA ? 1e9 : 20,
  /** Quanto resta visibile la scena della ritirata prima di dire «finito». */
  codaRitirata: 2.5,
} as const;

/** Le manopole del fumo: una sigaretta accesa si vede da lontano. */
export const FUMO = {
  max: 48,
  vitaFilo: 1.8,
  vitaBoccata: 2.4,
  cadenzaFilo: 0.55,
  raggioEmissione: 30,
  raggioTaglio: 45,
  salita: 0.55,
  salitaExtra: 0.25,
  deriva: 0.18,
  d0Filo: 0.035,
  d1Filo: 0.22,
  d0Boccata: 0.09,
  d1Boccata: 0.34,
  opacitaFilo: 0.4,
  opacitaBoccata: 0.55,
  tiroMin: 7,
  tiroMax: 16,
  durataTiro: 1.1,
  ritardoBoccata: 0.9,
} as const;

export interface Particella {
  viva: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  /** Sfasamento dell'ondeggio: due particelle vicine non si muovono uguali. */
  giro: number;
  eta: number;
  vita: number;
  d0: number;
  d1: number;
  opacita: number;
  /** Lato del cubetto in questo istante, già cresciuto: lo legge il disegno. */
  dim: number;
  /** Opacità di questo istante, dissolvenza compresa. */
  alfa: number;
}

/**
 * Il serbatoio delle particelle: 48 oggetti creati una volta e riusati per
 * sempre. Allocare una particella per boccata voleva dire un oggetto nuovo
 * ogni mezzo secondo per ogni fumatore a schermo, cioè lavoro per il
 * garbage collector nel bel mezzo del frame.
 */
export const particelle: Particella[] = Array.from({ length: FUMO.max }, () => ({
  viva: false,
  x: 0, y: 0, z: 0,
  vx: 0, vz: 0,
  yaw: 0,
  giro: 0,
  eta: 0,
  vita: 1,
  d0: 0.03,
  d1: 0.1,
  opacita: 0.2,
  dim: 0,
  alfa: 0,
}));

export interface ContestoIncontro {
  x: number;
  z: number;
  /** Velocità del giocatore (m/s): sopra vFuga per tempoFuga secondi lo perdi. */
  v: number;
  aPiedi: boolean;
  pannelloAperto: boolean;
  wanted: number;
  missioneATempo: boolean;
  dt: number;
}

export interface EsitoIncontro {
  apriDialogo: { id: string; chi: string; testo: string; opzioni: { id: string; label: string }[] } | null;
  chiudiDialogo: boolean;
  avviso: string | null;
  rep: number;
  voce: boolean;
  suono: 'tappa' | 'fallita' | null;
}

/**
 * Il ponte fra il pannello dell'HUD e il ciclo di gioco, con lo stesso
 * schema di lib/lugo/stick.ts: il DOM scrive, il frame legge e azzera.
 * Non è un campo dello store apposta — sarebbe stato un aggiornamento di
 * React per ogni battuta e, peggio, un secondo padrone dello stato
 * dell'incontro.
 */
export const risposta: { scelta: null | 'si' | 'no' | 'pugno' | 'via' } = { scelta: null };

// ── l'orologio, le battute, il caso ──────────────────────────────────────

// L'orologio dell'incontro avanza solo mentre si gioca (chi chiama non
// invoca stepIncontro in fase 'start' né a pannelli fermi): così i cooldown
// non scadono mentre la partita è in pausa, e uno che riapre il gioco dopo
// dieci minuti non si ritrova un maranza già in faccia.
let orologio = 0;

export function oraGioco(): number {
  return orologio;
}

// Due LCG privati del modulo, nella stessa forma di npc.ts. Restano privati
// apposta: se un altro sistema pescasse dagli stessi semi, la sequenza delle
// battute cambierebbe e il mondo smetterebbe di essere ripetibile.
let semeFrasi = 4242;
function caso(): number {
  semeFrasi = (semeFrasi * 1664525 + 1013904223) >>> 0;
  return semeFrasi / 4294967296;
}
let semeFumo = 909;
function casoFumo(): number {
  semeFumo = (semeFumo * 1664525 + 1013904223) >>> 0;
  return semeFumo / 4294967296;
}

const ultima: Record<MomentoFrase, number> = {
  aggancio: -1, insistenza: -1, si: -1, pugno: -1, fuga: -1, gruppo: -1, ostacolo: -1,
};

/**
 * Una battuta del gruppo, mai due volte di fila la stessa: con sei-otto
 * varianti per gruppo basta un solo ritiro per rendere invisibile la
 * ripetizione, e non serve tenere una coda di quelle già dette.
 */
function pescaFrase(gruppo: MomentoFrase): number {
  const [a, b] = GRUPPI[gruppo];
  let i = a + Math.floor(caso() * (b - a));
  if (i === ultima[gruppo]) i = a + ((i - a + 1) % (b - a));
  ultima[gruppo] = i;
  return i;
}

/** Mette una battuta sopra la testa di `n` per `durata` secondi. */
function dilloTu(n: Npc, gruppo: MomentoFrase, durata: number): string {
  n.frase = pescaFrase(gruppo);
  n.fraseDa = orologio;
  n.fraseFino = orologio + durata;
  ultimaFrase = FRASI_ATLANTE[n.frase];
  return ultimaFrase;
}

/** Le battute di un gruppo, per il collaudo. */
export function frasiDi(gruppo: MomentoFrase): readonly string[] {
  const [a, b] = GRUPPI[gruppo];
  return FRASI_ATLANTE.slice(a, b);
}

/**
 * Il disappunto di chi ha appena ceduto il passo. Lo chiama Npcs.tsx quando
 * stepNpcs segnala uno scarto: la scelta della battuta sta QUI e non in
 * npc.ts perché gli indici dell'atlante vivono in questo file, e npc.ts non
 * può importarlo senza creare il ciclo che tutta l'architettura evita.
 * Se il pedone sta già dicendo qualcosa non lo si interrompe: due bolle che
 * si sovrascrivono in mezzo secondo non si leggono nessuna delle due.
 */
export function protestaOstacolo(n: Npc): void {
  if (n.frase >= 0 && n.fraseFino > orologio) return;
  dilloTu(n, 'ostacolo', 2.2);
}

/** Come si apre la riga: nessun tratto somatico, nessuna provenienza. */
const CHI_E = [
  'Un ragazzo',
  'Una ragazza',
  'Un tipo',
  'Una tipa',
  'Un ragazzo',
  'Una ragazza',
] as const;

/** Cosa porta addosso chi il cappellino non ce l'ha. */
const ADDOSSO = [
  'in tuta',
  'in tuta',
  'in felpa',
  'col marsupio',
  'in felpa',
  'in tuta',
] as const;

/**
 * Come lo chiama l'HUD. Solo vestiti: mai un tratto somatico, mai una
 * provenienza. Il colore della pelle non compare in nessuna condizione di
 * questo file, e questa funzione è il posto in cui sarebbe stato comodo
 * infilarcelo.
 *
 * Il cappellino si nomina SOLO quando c'è davvero, e lo si chiede a
 * `n.senzaCappello`, che è il campo che decide cosa Npcs.tsx disegna sopra
 * la testa. Prima l'intera riga usciva da `n.variante`, che è il colore
 * della TUTA ed è un'estrazione tutta sua: due maranza su sei si
 * chiamavano «col cappellino», ma il cappellino se lo mette (o no) un
 * mazzo diverso, e circa uno su cinque va in giro a testa nuda. Il
 * risultato era un pannello che descriveva un ragazzo diverso da quello
 * che il giocatore aveva davanti — l'unica cosa che il pannello deve
 * saper fare bene, dato che è lì per farti riconoscere chi ti parla.
 */
export function descrizioneMaranza(n: Npc): string {
  const chi = CHI_E[n.variante % CHI_E.length];
  const base = n.senzaCappello
    ? `${chi} ${ADDOSSO[n.variante % ADDOSSO.length]}`
    : `${chi} col cappellino`;
  // il monopattino si nomina SOLO quando c'è: stessa disciplina del
  // cappellino qui sopra — il pannello descrive quello che si vede, e il
  // collaudo confronta le due cose alla lettera
  return n.monopattino ? `${base}, in monopattino` : base;
}

// ── la macchina a stati ──────────────────────────────────────────────────

export type FaseIncontro = 'nessuno' | 'avvicina' | 'chiede' | 'insiste' | 'ritirata';

let attivo = -1;
let ultimo = -1;
let fase: FaseIncontro = 'nessuno';
let giro = 0;
let tIncontro = 0;
let tFuga = 0;
let tRitirata = 0;
let attesa = 0;
let quanti = 0;
let prossimo: number = INCONTRO.attesaInizioPartita;
let scansione = 0;
let ultimaFrase: string | null = null;
/**
 * Chiusura del pannello richiesta da FUORI il ciclo (il pugno lo tira il
 * Player, che gira PRIMA di Npcs): la richiesta resta appesa fino al primo
 * esito utile. Senza la pendenza, azzeraEsito() del frame successivo
 * cancellava la richiesta un istante prima che Npcs la leggesse, e dopo il
 * pugno il pannello del dialogo restava a schermo con dentro uno che nel
 * frattempo stava già scappando.
 */
let chiusuraPendente = false;
// Vero mentre il pannello del dialogo è a schermo per colpa nostra: senza
// questo flag l'esito non saprebbe se c'è qualcosa da chiudere, e Npcs.tsx
// finirebbe per azzerare dialoghi che non gli appartengono.
let pannelloAperto = false;
// Il seme delle mete di ritirata: privato del modulo, come gli altri due.
const semeVaganti = { s: 5150 };
// L'ultima posizione nota del giocatore: serve a raccontare la distanza
// anche dopo che l'incontro si è chiuso (il collaudo la misura mentre lui
// scappa, quando `attivo` è già tornato a -1).
let gx = 0;
let gz = 0;

// L'esito è un oggetto solo, riusato: viene letto e applicato nello stesso
// frame in cui nasce, e allocarne uno nuovo a 60 fotogrammi al secondo per
// dire «non è successo niente» sarebbe stato spreco puro.
const esito: EsitoIncontro = {
  apriDialogo: null, chiudiDialogo: false, avviso: null, rep: 0, voce: false, suono: null,
};

function azzeraEsito(): EsitoIncontro {
  esito.apriDialogo = null;
  esito.chiudiDialogo = chiusuraPendente;
  chiusuraPendente = false;
  esito.avviso = null;
  esito.rep = 0;
  esito.voce = false;
  esito.suono = null;
  return esito;
}

/** Le opzioni del pannello: le decide qui chi conduce la conversazione. */
function opzioni(insiste: boolean) {
  return [
    { id: 'si', label: insiste ? '“E va bene, tieni.”' : '“Tieni, prendi.”' },
    { id: 'no', label: insiste ? '“Ho detto di no.”' : '“No, non fumo.”' },
    { id: 'pugno', label: 'Sganciargli un pugno' },
    { id: 'via', label: insiste ? 'Andarsene' : 'Tirare dritto' },
  ];
}

function pannello(n: Npc, testo: string, insiste: boolean) {
  // da qui in avanti c'è qualcosa a schermo che va richiuso da noi
  pannelloAperto = true;
  return {
    id: insiste ? 'sigaretta-insiste' : 'sigaretta',
    chi: descrizioneMaranza(n),
    testo: '“' + testo + '”',
    opzioni: opzioni(insiste),
  };
}

/**
 * Chiude la scena e fa ripartire l'attesa. Il cooldown CRESCE a ogni
 * incontro già avvenuto (75 s, poi 105, 135... fino a 240): più ti è già
 * capitato, più diventa raro. È tutta qui la differenza fra un incontro di
 * città e una molestia.
 */
function ritirati(n: Npc, npcs: Npc[], mondo: MondoLugo): void {
  n.stato = 'ritirata';
  n.timer = 6;
  n.fermoDa = 0;
  // meta dalla parte opposta al giocatore, ma su una strada vera: senza
  // questo il maranza «scappa» dentro una vetrina e la fisica lo tiene lì a
  // strusciare contro il vetro per sempre
  const vx = n.x - gx;
  const vz = n.z - gz;
  const l = Math.hypot(vx, vz) || 1;
  const [tx, tz] = puntoStradaCasuale(mondo, n.x + (vx / l) * 40, n.z + (vz / l) * 40, 30, semeVaganti);
  n.targetX = tx;
  n.targetZ = tz;
  n.chiesto = orologio;
  if (attivo >= 0 && npcs[attivo] === n) {
    fase = 'ritirata';
    tRitirata = 0;
    quanti++;
    prossimo = orologio + INCONTRO.cooldownGlobale * Math.min(3.2, 1 + 0.4 * quanti);
  }
}

/** Vista libera fra due punti: quattro campioni bastano a scoprire un muro. */
function vedeIlGiocatore(fisica: MondoFisico, x: number, z: number): boolean {
  for (const t of [0.25, 0.5, 0.75, 1]) {
    if (!fisica.cerchioLibero(x + (gx - x) * t, z + (gz - z) * t, 0.3)) return false;
  }
  return true;
}

/**
 * Un giro della scena. Va chiamato DOPO stepNpcs, quando le posizioni del
 * fotogramma sono già aggiornate, e solo in fase 'gioco'.
 */
export function stepIncontro(
  npcs: Npc[],
  ctx: ContestoIncontro,
  fisica: MondoFisico,
  mondo: MondoLugo,
): EsitoIncontro {
  azzeraEsito();
  orologio += ctx.dt;
  gx = ctx.x;
  gz = ctx.z;

  if (fase === 'nessuno') {
    // ── chi ti ferma, e quando ────────────────────────────────────────
    // Mai in auto, mai con un pannello aperto, mai coi Carabinieri alle
    // costole e MAI durante una consegna a tempo: perdere il lavoro perché
    // un ragazzo voleva una sigaretta sarebbe la cosa peggiore che questo
    // sistema possa fare a chi gioca.
    scansione -= ctx.dt;
    if (
      scansione > 0 ||
      !ctx.aPiedi ||
      ctx.pannelloAperto ||
      ctx.wanted > 0 ||
      ctx.missioneATempo ||
      orologio < prossimo
    ) {
      return esito;
    }
    scansione = 0.5;
    let scelto = -1;
    let dMin: number = INCONTRO.raggioAggancio;
    for (let i = 0; i < npcs.length; i++) {
      const n = npcs[i];
      if (n.tipo !== 'maranza') continue;
      if (n.stato !== 'cammina' && n.stato !== 'fermo') continue;
      if (n.chiesto + INCONTRO.cooldownNpc > orologio) continue;
      const d = Math.hypot(n.x - gx, n.z - gz);
      if (d >= dMin) continue;
      if (!vedeIlGiocatore(fisica, n.x, n.z)) continue;
      dMin = d;
      scelto = i;
    }
    if (scelto < 0) return esito;
    aggancia(npcs, scelto);
    return esito;
  }

  const n = npcs[attivo];
  if (!n) {
    fase = 'nessuno';
    attivo = -1;
    return esito;
  }
  const d = Math.hypot(n.x - gx, n.z - gz);
  tIncontro += ctx.dt;

  if (fase === 'ritirata') {
    tRitirata += ctx.dt;
    if (tRitirata > INCONTRO.codaRitirata) {
      fase = 'nessuno';
      attivo = -1;
    }
    return esito;
  }

  // Un'auto in corsa mentre ti parla: il maranza salta di lato e la scena
  // finisce lì. Senza questa uscita il pannello restava aperto su un
  // interlocutore che nel frattempo era volato a tre metri di distanza.
  if (n.stato === 'balzo') {
    ultimaFrase = FRASI_ATLANTE[pescaFrase('fuga')];
    chiudiIlPannello();
    fase = 'ritirata';
    tRitirata = 0;
    n.chiesto = orologio;
    prossimo = orologio + INCONTRO.cooldownGlobale;
    return esito;
  }

  // Sei salito in auto nel mezzo del discorso: la scena finisce lì. Senza
  // questa uscita il maranza continuerebbe a chiedere una sigaretta al
  // cofano di un'automobile, e il pannello resterebbe aperto in guida.
  if (!ctx.aPiedi) {
    dilloTu(n, 'fuga', 2.6);
    chiudiIlPannello();
    ritirati(n, npcs, mondo);
    return esito;
  }

  if (fase === 'avvicina') {
    // il bersaglio si aggiorna a ogni frame: se ti sposti, ti segue
    n.targetX = gx;
    n.targetZ = gz;
    if (d > INCONTRO.raggioVista || tIncontro > INCONTRO.tempoMaxAvvicina || n.fermoDa > 1.6) {
      // troppo lontano, troppo tempo, o incastrato dietro un muro: si
      // arrende da solo invece di pestare i piedi contro una facciata
      dilloTu(n, 'fuga', 2.6);
      ritirati(n, npcs, mondo);
      return esito;
    }
    if (d < INCONTRO.distanzaParla) {
      fase = 'chiede';
      n.stato = 'chiede';
      giro = 0;
      attesa = INCONTRO.attesaRisposta;
      const testo = dilloTu(n, 'aggancio', 6);
      esito.apriDialogo = pannello(n, testo, false);
      esito.voce = true;
      esito.suono = 'tappa';
    }
    return esito;
  }

  // ── chiede / insiste ──────────────────────────────────────────────────
  // La fuga: 3,1 m/s è più della camminata (2,3) e meno della corsa (5,2).
  // Camminare non basta a levarselo di torno, correre sì — ed è l'unica
  // regola che chi gioca deve capire, senza che nessuno gliela spieghi.
  if (ctx.v > INCONTRO.vFuga) tFuga += ctx.dt;
  else tFuga = 0;
  if (tFuga > INCONTRO.tempoFuga || d > INCONTRO.raggioVista || tIncontro > INCONTRO.tempoMaxIncontro) {
    dilloTu(n, 'fuga', 3);
    // il pannello non deve restarti addosso mentre corri: era il difetto
    // peggiore del dialogo di prima, che ti inseguiva a schermo per sempre
    chiudiIlPannello();
    ritirati(n, npcs, mondo);
    return esito;
  }

  const scelta = risposta.scelta;
  risposta.scelta = null;
  attesa -= ctx.dt;

  if (scelta === 'si') {
    const testo = dilloTu(n, 'si', 3.2);
    esito.rep = 25;
    esito.avviso = '“' + testo + '” · +25 REP';
    esito.suono = 'tappa';
    esito.voce = true;
    // con te ha chiuso: non ti ferma più per il resto della partita
    n.chiesto = orologio + 1e5;
    ritirati(n, npcs, mondo);
    return esito;
  }
  if (scelta === 'pugno') {
    // qui si chiude soltanto il pannello: il colpo vero lo tira il Player,
    // che è l'unico a sapere dove guardi e chi hai davvero davanti
    esito.chiudiDialogo = true;
    pannelloAperto = false;
    return esito;
  }
  if (scelta === 'via') {
    esito.chiudiDialogo = true;
    pannelloAperto = false;
    fase = 'insiste';
    attesa = 2.5;
    dilloTu(n, 'insistenza', 2.5);
    return esito;
  }
  if (scelta === 'no' || attesa <= 0) {
    // Chi ha scelto «tirare dritto» non ha più un pannello davanti: il
    // maranza gli tiene dietro un paio di secondi borbottando e poi molla.
    // Senza questa uscita la scadenza dell'attesa gli riaprirebbe in faccia
    // il pannello che aveva appena chiuso, ed è la cosa più fastidiosa che
    // un gioco possa fare.
    if (!pannelloAperto && scelta !== 'no') {
      dilloTu(n, 'fuga', 3);
      ritirati(n, npcs, mondo);
      return esito;
    }
    // niente risposta è una risposta: anche chi lascia il pannello aperto
    // e guarda altrove vede la scena andare avanti
    giro++;
    if (giro <= INCONTRO.giriMax) {
      fase = 'insiste';
      attesa = INCONTRO.attesaRisposta;
      const testo = dilloTu(n, 'insistenza', 6);
      esito.apriDialogo = pannello(n, testo, true);
      esito.voce = true;
      return esito;
    }
    const testo = dilloTu(n, 'fuga', 3);
    esito.rep = 5;
    esito.avviso = '“' + testo + '” · Hai tenuto i nervi · +5 REP';
    chiudiIlPannello();
    ritirati(n, npcs, mondo);
    return esito;
  }

  return esito;
}

function chiudiIlPannello(): void {
  if (pannelloAperto) {
    esito.chiudiDialogo = true;
    chiusuraPendente = true;
    pannelloAperto = false;
  }
}

function aggancia(npcs: Npc[], i: number): void {
  attivo = i;
  ultimo = i;
  fase = 'avvicina';
  giro = 0;
  tIncontro = 0;
  tFuga = 0;
  attesa = INCONTRO.attesaRisposta;
  const n = npcs[i];
  n.stato = 'avvicina';
  n.fermoDa = 0;
  n.targetX = gx;
  n.targetZ = gz;
  // i compagni si fermano a guardare: due bastano a far capire che è un
  // gruppetto, e restare fermi non costa niente alla simulazione
  let compagni = 0;
  for (const c of npcs) {
    if (compagni >= 2) break;
    if (c === n || c.tipo !== 'maranza' || c.stato !== 'cammina') continue;
    if (Math.hypot(c.x - n.x, c.z - n.z) > 6) continue;
    c.stato = 'fermo';
    c.timer = 12;
    compagni++;
  }
}

/**
 * Quando sei TU a premere E per primo: stessa macchina a stati, stesso
 * pannello, stesso fumetto sopra la testa. Un solo ingresso, così non
 * esistono due conversazioni diverse per la stessa scena.
 */
export function avviaIncontroDaE(npcs: Npc[], i: number): EsitoIncontro {
  azzeraEsito();
  const n = npcs[i];
  if (!n) return esito;
  aggancia(npcs, i);
  fase = 'chiede';
  n.stato = 'chiede';
  const testo = dilloTu(n, 'aggancio', 6);
  esito.apriDialogo = pannello(n, testo, false);
  esito.voce = true;
  esito.suono = 'tappa';
  return esito;
}

/**
 * Il pugno subìto. Il gruppo NON attacca mai il giocatore: non c'è rissa,
 * non c'è vendetta e non c'è nessuna banda che ti aspetta all'angolo. I
 * compagni si allontanano dicendo la loro, e la scena si esaurisce da sé —
 * è una gag, non un sistema di combattimento.
 */
export function subisciPugno(
  n: Npc,
  npcs: Npc[],
  dirX: number,
  dirZ: number,
): { eraMolesto: boolean; compagni: number; frase: string } {
  const eraMolesto = n.stato === 'chiede' || n.stato === 'avvicina';
  n.stato = 'balzo';
  n.timer = 0.22;
  n.bx = dirX;
  n.bz = dirZ;
  const frase = dilloTu(n, 'pugno', 2.4);
  // la sigaretta cade: si spegne per venticinque secondi, e dove è finita
  // resta un po' di fumo a terra
  if (n.fuma) {
    for (let k = 0; k < 3; k++) emetti(n.x, 0.25, n.z, 'boccata', 0, 0);
    n.fuma = false;
    n.tiro = -25;
  }
  n.chiesto = orologio + 1e5;
  let compagni = 0;
  let dettoDaUno = false;
  for (const c of npcs) {
    if (c === n || c.tipo !== 'maranza') continue;
    if (Math.hypot(c.x - n.x, c.z - n.z) > 12) continue;
    c.stato = 'ritirata';
    c.timer = 6;
    const vx = c.x - n.x;
    const vz = c.z - n.z;
    const l = Math.hypot(vx, vz) || 1;
    c.targetX = c.x + (vx / l) * 10;
    c.targetZ = c.z + (vz / l) * 10;
    compagni++;
    if (!dettoDaUno) {
      dettoDaUno = true;
      dilloTu(c, 'gruppo', 2.6);
    }
  }
  if (attivo >= 0 && npcs[attivo] === n) {
    chiudiIlPannello();
    fase = 'ritirata';
    tRitirata = 0;
    quanti++;
    // dopo un pugno il cooldown va al massimo: per un bel po' nessuno ti
    // ferma più, ed è la conseguenza giusta senza bisogno di punire nessuno
    prossimo = orologio + INCONTRO.cooldownGlobale * 3.2;
  }
  ultimaFrase = frase;
  return { eraMolesto, compagni, frase };
}

/** Lo stato dell'incontro, per l'HUD, il Player e il collaudo. */
export function incontroInCorso(): {
  attivo: boolean;
  indice: number;
  fase: FaseIncontro;
  giro: number;
  distanza: number;
  frase: string | null;
  ultimaFrase: string | null;
  cooldown: number;
  x: number;
  z: number;
} {
  const i = attivo >= 0 ? attivo : ultimo;
  return {
    attivo: fase !== 'nessuno',
    indice: i,
    fase,
    giro,
    distanza: distanzaDaUltimo,
    x: xUltimo,
    z: zUltimo,
    frase: fraseCorrente,
    ultimaFrase,
    cooldown: Math.max(0, prossimo - orologio),
  };
}

// Distanza e battuta corrente si fotografano a ogni giro di stepFumo (che
// gira sempre, anche a incontro chiuso): leggerle da incontroInCorso()
// avrebbe voluto dire tenersi un riferimento all'array degli NPC dentro un
// getter, e quello è il modo classico per farsi tenere in vita una partita
// vecchia dopo un cambio di mappa.
let distanzaDaUltimo = 99;
let fraseCorrente: string | null = null;
let xUltimo = 0;
let zUltimo = 0;

/**
 * Hook di collaudo: forza l'aggancio. Il maranza più vicino viene messo a
 * sette metri davanti a te (in un punto libero) con la sigaretta accesa, e
 * da lì in poi fa tutto da solo, con la macchina a stati vera. Serve perché
 * in headless nessuno può aspettare che un maranza si decida.
 */
export function provocaIncontro(
  npcs: Npc[],
  px: number,
  pz: number,
  pyaw: number,
  fisica: MondoFisico,
  // con `true` si aggancia il più vicino IN MONOPATTINO: serve al collaudo
  // per provare che il pannello nomina il mezzo, senza girare la mappa a
  // caccia del ragazzo giusto. Senza argomento il comportamento è identico
  // a prima, e le prove esistenti non si accorgono di niente.
  soloMonopattino = false,
): number {
  gx = px;
  gz = pz;
  let scelto = -1;
  let dMin = Infinity;
  for (let i = 0; i < npcs.length; i++) {
    const n = npcs[i];
    if (n.tipo !== 'maranza') continue;
    if (soloMonopattino && !n.monopattino) continue;
    const d = Math.hypot(n.x - px, n.z - pz);
    if (d < dMin) {
      dMin = d;
      scelto = i;
    }
  }
  if (scelto < 0) return -1;
  const n = npcs[scelto];
  if (dMin > 7) {
    for (const giroAng of [0, 0.6, -0.6, 1.2, -1.2, 2, -2, Math.PI]) {
      const a = pyaw + giroAng;
      const x = px + Math.cos(a) * 6.5;
      const z = pz + Math.sin(a) * 6.5;
      if (!fisica.cerchioLibero(x, z, 0.3)) continue;
      n.x = x;
      n.z = z;
      break;
    }
  }
  n.fuma = true;
  n.tiro = 1.2;
  n.chiesto = -1e9;
  prossimo = 0;
  scansione = 0;
  fase = 'nessuno';
  attivo = -1;
  aggancia(npcs, scelto);
  return scelto;
}

/** Il ritratto dei maranza vivi: dimostra che non sono quattro fotocopie. */
export function statisticheMaranza(npcs: Npc[]): {
  totali: number; fumatori: number; pelli: number; tute: number; senzaCappello: number;
  monopattini: number;
} {
  const pelli = new Set<number>();
  const tute = new Set<number>();
  let totali = 0;
  let fumatori = 0;
  let senzaCappello = 0;
  let monopattini = 0;
  for (const n of npcs) {
    if (n.tipo !== 'maranza') continue;
    totali++;
    pelli.add(n.pelle);
    tute.add(n.variante % 6);
    if (n.fuma) fumatori++;
    if (n.senzaCappello) senzaCappello++;
    if (n.monopattino) monopattini++;
  }
  return { totali, fumatori, pelli: pelli.size, tute: tute.size, senzaCappello, monopattini };
}

// ── il fumo ──────────────────────────────────────────────────────────────

function emetti(x: number, y: number, z: number, tipo: 'filo' | 'boccata', sx: number, sz: number): void {
  for (const p of particelle) {
    if (p.viva) continue;
    p.viva = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = (casoFumo() - 0.5) * 2 * FUMO.deriva + sx;
    p.vz = (casoFumo() - 0.5) * 2 * FUMO.deriva + sz;
    p.yaw = casoFumo() * Math.PI;
    p.giro = casoFumo() * 6.283;
    p.eta = 0;
    p.vita = tipo === 'filo' ? FUMO.vitaFilo : FUMO.vitaBoccata;
    p.d0 = tipo === 'filo' ? FUMO.d0Filo : FUMO.d0Boccata;
    p.d1 = tipo === 'filo' ? FUMO.d1Filo : FUMO.d1Boccata;
    p.opacita = tipo === 'filo' ? FUMO.opacitaFilo : FUMO.opacitaBoccata;
    p.dim = p.d0;
    p.alfa = 0;
    return;
  }
  // serbatoio pieno: la particella non nasce e basta. Meglio un filo di
  // fumo più rado che un'allocazione a metà frame.
}

/**
 * Un giro di fumo: le tirate dei fumatori vicini, il filo che sale dalla
 * sigaretta, l'integrazione delle particelle vive. La punta della sigaretta
 * NON si ricalcola qui: la scrive Npcs.tsx dentro il ciclo che costruisce
 * davvero la matrice del braccio (n.manoX/manoY/manoZ). Duplicare la
 * cinematica in due file era la strada sicura per ritrovarsi il fumo che
 * esce da mezz'aria appena qualcuno ritocca l'animazione.
 */
export function stepFumo(npcs: Npc[], dt: number, px: number, pz: number, attivoOra: boolean): void {
  gx = px;
  gz = pz;
  distanzaDaUltimo = 99;
  fraseCorrente = null;
  const vivo = attivo >= 0 ? npcs[attivo] : ultimo >= 0 ? npcs[ultimo] : null;
  if (vivo) {
    distanzaDaUltimo = Math.hypot(vivo.x - px, vivo.z - pz);
    xUltimo = vivo.x;
    zUltimo = vivo.z;
    if (vivo.frase >= 0 && vivo.fraseFino > orologio) fraseCorrente = FRASI_ATLANTE[vivo.frase];
  }

  if (attivoOra) {
    for (const n of npcs) {
      if (n.tipo !== 'maranza') continue;
      if (!n.fuma) {
        // la sigaretta caduta si riaccende dopo un po': n.tiro sotto zero
        // di venticinque secondi è il conto alla rovescia della ripresa
        if (n.tiro < -FUMO.durataTiro) {
          n.tiro += dt;
          if (n.tiro >= -FUMO.durataTiro) {
            n.fuma = true;
            n.tiro = FUMO.tiroMin;
          }
        }
        continue;
      }
      if (Math.abs(n.x - px) > FUMO.raggioEmissione || Math.abs(n.z - pz) > FUMO.raggioEmissione) continue;
      const prima = n.tiro;
      n.tiro -= dt;
      // la boccata esce dalla BOCCA, un attimo dopo la tirata: è il
      // dettaglio che rende leggibile la scena (prima tira, poi soffia)
      if (prima > -FUMO.ritardoBoccata && n.tiro <= -FUMO.ritardoBoccata) {
        const bx = n.x + Math.cos(n.yaw) * 0.15;
        const bz = n.z + Math.sin(n.yaw) * 0.15;
        for (let k = 0; k < 3; k++) {
          emetti(bx, 1.52, bz, 'boccata', Math.cos(n.yaw) * 0.55, Math.sin(n.yaw) * 0.55);
        }
      }
      if (n.tiro <= -FUMO.durataTiro) n.tiro = FUMO.tiroMin + casoFumo() * (FUMO.tiroMax - FUMO.tiroMin);
      n.fumoAcc += dt;
      if (n.fumoAcc >= FUMO.cadenzaFilo) {
        n.fumoAcc = 0;
        emetti(n.manoX, n.manoY + 0.05, n.manoZ, 'filo', 0, 0);
      }
    }
  }

  for (const p of particelle) {
    if (!p.viva) continue;
    p.eta += dt;
    const t = p.eta / p.vita;
    if (t >= 1 || Math.abs(p.x - px) > FUMO.raggioTaglio || Math.abs(p.z - pz) > FUMO.raggioTaglio) {
      p.viva = false;
      continue;
    }
    p.y += (FUMO.salita + FUMO.salitaExtra * t) * dt;
    p.vx += Math.sin(orologio * 1.7 + p.giro) * 0.05 * dt;
    // la spinta della boccata si spegne subito: il fumo soffiato parte
    // in avanti e poi resta lì a salire, come quello vero
    const freno = Math.exp(-2.2 * dt);
    p.vx *= freno;
    p.vz *= freno;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.yaw += 0.6 * dt;
    // si gonfia subito e poi rallenta
    p.dim = p.d0 + (p.d1 - p.d0) * (1 - (1 - t) * (1 - t));
    const su = Math.min(1, t / 0.12);
    const giu = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
    p.alfa = p.opacita * su * giu;
  }
}
