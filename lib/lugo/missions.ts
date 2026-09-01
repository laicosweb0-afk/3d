// Le missioni di Lugo: architettura data-driven e scalabile. La storia
// principale ("Trova il tuo amico") è una catena di missioni sui luoghi
// veri; le CONSEGNE sono missioni generate al volo, ripetibili, in stile
// rider. La macchina a stati vive nello store; qui i dati e la geometria.

import type { MondoLugo } from './loadMap';
import { puntoStradaVicino } from './car';

export type TipoMissione = 'storia' | 'consegna';

/** A che famiglia appartiene la missione: serve alla scheda e ai filtri. */
export type CategoriaMissione =
  | 'introduzione'
  | 'storia'
  | 'consegna'
  | 'esplorazione'
  | 'attivita';

export type Difficolta = 'facile' | 'media' | 'tosta';

export interface TappaMissione {
  /** Id POI del map.json, "viali-n|e|s|o", oppure "xz:<x>:<z>" (posizione libera). */
  poi: string;
  titolo: string;
  /** La tappa vale solo a piedi (forza la discesa). */
  aPiedi?: boolean;
  /** Il punto va riportato sulla carreggiata più vicina (POI dentro i muri). */
  suStrada?: boolean;
  /**
   * Obiettivo di ESPLORAZIONE invece che di posizione: la tappa si chiude
   * quando il giocatore ha scoperto altri `scopri` punti di interesse da
   * quando è cominciata. Con questo il gioco sa esprimere «conosci Lugo:
   * scopri tre attività», che con le sole coordinate era impossibile.
   */
  scopri?: number;
  /** Come sopra, ma conta gli acquisti fatti nelle botteghe. */
  compra?: number;
}

export interface Missione {
  id: string;
  tipo: TipoMissione;
  titolo: string;
  descrizione: string;
  /** La battuta cinematografica mostrata nella scheda di avvio. */
  frase?: string;
  tappe: TappaMissione[];
  /** Secondi totali; assente = senza tempo. */
  tempoLimite?: number;
  /** Reputazione guadagnata al completamento. */
  ricompensa: number;
  /** Euro guadagnati al completamento (base, prima dei bonus velocità). */
  denaro: number;
  /** true per le consegne: bonus in base al tempo rimasto + mancia. */
  bonusVelocita?: boolean;
  /** Numero della consegna: fa variare la mancia. */
  semeMancia?: number;
  /** Famiglia della missione (default: dedotta da `tipo`). */
  categoria?: CategoriaMissione;
  difficolta?: Difficolta;
  /** Livello del giocatore sotto il quale la missione non viene proposta. */
  livelloRichiesto?: number;
  /** Attività di Lugo che ospita la missione, se ce n'è una. */
  attivitaId?: string;
  /** Distintivo assegnato al completamento. */
  distintivo?: string;
  /** true se si può rigiocare dopo averla finita. */
  ripetibile?: boolean;
}

// ── La storia principale: TROVA IL TUO AMICO ────────────────────────────────
// Giacomo non risponde al telefono da stamattina. Ogni missione è un
// indizio che porta alla prossima, fino alla soluzione (comica) in caserma.

export const MISSIONI: Missione[] = [
  // ── L'ingresso in città: le cinque missioni che insegnano il gioco ──────
  {
    id: 'mvp1',
    tipo: 'storia',
    categoria: 'introduzione',
    difficolta: 'facile',
    livelloRichiesto: 1,
    titolo: 'Appena arrivato',
    descrizione: 'Sei a Lugo e non ti conosce nessuno. Si comincia dal posto che conoscono tutti.',
    frase: '“Allora, il Pavaglione. Da lì in poi si vede.”',
    tappe: [{ poi: 'pavaglione', titolo: 'Raggiungi il Pavaglione' }],
    ricompensa: 50,
    denaro: 100,
  },
  {
    id: 'mvp2',
    tipo: 'storia',
    categoria: 'attivita',
    difficolta: 'facile',
    livelloRichiesto: 1,
    titolo: 'Ho sete',
    descrizione: 'Un caffè al banco è il modo più veloce per farsi vedere in giro.',
    frase: '“Un caffè e due chiacchiere: a Lugo si comincia sempre così.”',
    tappe: [{ poi: 'bar', titolo: 'Vai al bar del centro', suStrada: true }],
    ricompensa: 50,
    denaro: 150,
  },
  {
    id: 'mvp3',
    tipo: 'storia',
    categoria: 'consegna',
    difficolta: 'media',
    livelloRichiesto: 1,
    titolo: 'Una consegna al volo',
    descrizione: 'Ritira e porta a destinazione prima che scada il tempo.',
    frase: '“Se ci arrivi in tempo, il prossimo giro te lo do ancora a te.”',
    tappe: [
      { poi: 'teatro', titolo: 'Ritira il pacco al Teatro Rossini', suStrada: true },
      { poi: 'stazione', titolo: 'Consegna in stazione', suStrada: true },
    ],
    tempoLimite: 240,
    ricompensa: 100,
    denaro: 350,
  },
  {
    id: 'mvp4',
    tipo: 'storia',
    categoria: 'esplorazione',
    difficolta: 'media',
    livelloRichiesto: 1,
    titolo: 'Conosci Lugo',
    descrizione: 'Fatti un giro a piedi e scopri tre attività del centro.',
    frase: '“Se non sai cosa c\'è sotto i portici, non conosci Lugo.”',
    tappe: [{ poi: 'pavaglione', titolo: 'Scopri 3 attività a piedi', scopri: 3, aPiedi: true }],
    ricompensa: 250,
    denaro: 500,
  },
  {
    id: 'mvp5',
    tipo: 'storia',
    categoria: 'introduzione',
    difficolta: 'media',
    livelloRichiesto: 2,
    titolo: 'Ora ti conoscono',
    descrizione: 'Hai fatto il giro giusto. Torna in piazza: qualcuno ti aspetta.',
    frase: '“Ohi, ma tu sei quello che gira sempre in centro. Piacere.”',
    tappe: [
      { poi: 'baracca', titolo: 'Passa dal monumento a Baracca' },
      { poi: 'pavaglione', titolo: 'Torna al Pavaglione a piedi', aPiedi: true },
    ],
    ricompensa: 500,
    denaro: 1000,
    distintivo: 'esploratore',
  },

  // ── La storia: TROVA IL TUO AMICO ───────────────────────────────────────
  {
    id: 'm01',
    tipo: 'storia',
    titolo: 'Trova il tuo amico',
    descrizione: 'Giacomo non risponde da stamattina. Doveva farsi trovare al Pavaglione.',
    frase: '“È da stamattina che lo chiamo e niente. Boh, vado a vedere.”',
    tappe: [{ poi: 'pavaglione', titolo: 'Vai al Pavaglione' }],
    ricompensa: 100,
    denaro: 10,
  },
  {
    id: 'm02',
    tipo: 'storia',
    titolo: 'Il barista sa qualcosa',
    descrizione: 'Al Pavaglione non c’è. Il barista dice di averlo visto andare verso la Rocca.',
    frase: '“Giacomo? Sì sì, era qui prima. Ha preso un caffè ed è filato in Rocca.”',
    tappe: [
      { poi: 'bar', titolo: 'Chiedi al bar', suStrada: true },
      { poi: 'rocca', titolo: 'Cercalo alla Rocca Estense' },
    ],
    tempoLimite: 75,
    ricompensa: 250,
    denaro: 15,
  },
  {
    id: 'm03',
    tipo: 'storia',
    titolo: 'La borsa dimenticata',
    descrizione: 'In Piazza Baracca c’è la sua borsa. Che sia partito? Controlla la stazione.',
    frase: '“Questa è la sua borsa… la riconosco dallo scotch sulla cerniera.”',
    tappe: [
      { poi: 'baracca', titolo: 'Recupera la borsa in Piazza Baracca' },
      { poi: 'stazione', titolo: 'Corri alla stazione' },
    ],
    tempoLimite: 90,
    ricompensa: 300,
    denaro: 20,
  },
  {
    id: 'm04',
    tipo: 'storia',
    titolo: 'Il giro delle voci',
    descrizione: 'In stazione nessuno l’ha visto. Chiedi in giro: quattro punti lungo i viali.',
    frase: '“Qualcuno in circonvallazione deve averlo visto per forza.”',
    tappe: [
      { poi: 'viali-n', titolo: 'Chiedi al checkpoint nord' },
      { poi: 'viali-e', titolo: 'Chiedi al checkpoint est' },
      { poi: 'viali-s', titolo: 'Chiedi al checkpoint sud' },
      { poi: 'viali-o', titolo: 'Chiedi al checkpoint ovest' },
    ],
    tempoLimite: 150,
    ricompensa: 400,
    denaro: 25,
  },
  {
    id: 'm05',
    tipo: 'storia',
    titolo: 'Sotto i portici',
    descrizione: 'Un tizio giura di averlo visto sotto le logge. Lì si va a piedi.',
    frase: '“L’ho visto io! Era al Pavaglione, sotto i portici. Parcheggia e vai.”',
    tappe: [{ poi: 'pavaglione', titolo: 'Entra nella corte a piedi', aPiedi: true }],
    tempoLimite: 90,
    ricompensa: 200,
    denaro: 15,
  },
  {
    id: 'm06',
    tipo: 'storia',
    titolo: 'Il biglietto sul monumento',
    descrizione: 'Sotto i portici, un biglietto: “Ci vediamo dall’asso”. Il monumento a Baracca.',
    frase: '“‘Ci vediamo dall’asso.’ Sempre stato un poeta, Giacomo.”',
    tappe: [{ poi: 'baracca', titolo: 'Vai al monumento a piedi', aPiedi: true }],
    tempoLimite: 120,
    ricompensa: 350,
    denaro: 15,
  },
  {
    id: 'm07',
    tipo: 'storia',
    titolo: 'Tutto chiarito in caserma',
    descrizione: 'Colpo di scena: Giacomo è in caserma. Passa dalla Rocca e vallo a prendere.',
    frase: '“Era in caserma A FARE LA DENUNCIA: aveva perso il portafoglio. Tutto qui.”',
    tappe: [
      { poi: 'rocca', titolo: 'Passa dalla Rocca' },
      { poi: 'caserma', titolo: 'Recupera Giacomo in caserma', suStrada: true },
    ],
    tempoLimite: 90,
    ricompensa: 300,
    denaro: 40,
  },
];

// ── Le consegne: missioni generate, ripetibili, in stile rider ──────────────

/**
 * Le attività che possono ospitare una missione. Le riempie il registro
 * (lib/lugo/attivita.ts) al caricamento: qui non si importa, per non legare
 * le missioni al registro e viceversa.
 */
let attivitaPerMissioni: { id: string; nome: string; categoria: string; x: number; z: number }[] = [];

export function registraAttivitaConMissioni(
  elenco: { id: string; nome: string; categoria: string; x: number; z: number }[],
): void {
  attivitaPerMissioni = elenco;
}

/** Le attività che oggi possono ospitare una missione (sola lettura). */
export function attivitaConMissioni(): readonly {
  id: string;
  nome: string;
  categoria: string;
  x: number;
  z: number;
}[] {
  return attivitaPerMissioni;
}

/** Registro delle missioni generate al volo (consegne). */
const DINAMICHE = new Map<string, Missione>();

/**
 * Inserisce (o REinserisce) una missione dinamica nel registro. La Map fa da
 * LRU per anzianità di inserimento: reinserire una missione la sposta in
 * coda, così una missione ancora viva (m00 attiva, per esempio) non viene
 * sfrattata da quaranta aperture di bacheca. Il taglio non tocca mai la
 * missione appena inserita: con la mappa piena di una sola voce, il "primo"
 * sarebbe proprio lei.
 */
export function registraDinamica(m: Missione): void {
  DINAMICHE.delete(m.id);
  DINAMICHE.set(m.id, m);
  if (DINAMICHE.size > 40) {
    const primo = DINAMICHE.keys().next().value;
    if (primo && primo !== m.id) DINAMICHE.delete(primo);
  }
}

let contatoreConsegne = 0;
/** Quante missioni sono state proposte a storia finita: fa girare la rotazione. */
let contatoreProposte = 0;

function lcg(seme: number): () => number {
  let s = (seme * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Genera una consegna: ritiro da un bar/ristorante del centro, consegna a
 * un altro negozio abbastanza lontano. Il tempo dipende dalla distanza;
 * pagare di più chi arriva prima lo fa il bonus in Missioni.tsx.
 */
export function creaConsegna(mondo: MondoLugo): Missione {
  contatoreConsegne++;
  const rnd = lcg(contatoreConsegne);
  const cibo = mondo.negozi.filter((n) => n.categoria === 'cibo' || n.categoria === 'bar');
  const tutti = mondo.negozi;
  const ritiro = cibo.length
    ? cibo[Math.floor(rnd() * cibo.length)]
    : { nome: 'Bar Centrale', categoria: 'bar', x: 0, z: 0 };
  let dest = tutti.length
    ? tutti[Math.floor(rnd() * tutti.length)]
    : { nome: 'centro', categoria: 'negozio', x: 60, z: 60 };
  for (let i = 0; i < 12 && Math.hypot(dest.x - ritiro.x, dest.z - ritiro.z) < 220; i++) {
    dest = tutti[Math.floor(rnd() * tutti.length)] ?? dest;
  }
  const dist = Math.hypot(dest.x - ritiro.x, dest.z - ritiro.z);
  const tempoLimite = Math.round(40 + dist / 7);
  const pRitiro = puntoStradaVicino(mondo, ritiro.x, ritiro.z);
  const pDest = puntoStradaVicino(mondo, dest.x, dest.z);
  const m: Missione = {
    id: `consegna_${String(contatoreConsegne).padStart(3, '0')}`,
    // la mancia varia con il numero della consegna: prima si usava la
    // LUNGHEZZA dell'id, che è sempre 12, quindi la mancia era sempre €3
    semeMancia: contatoreConsegne,
    tipo: 'consegna',
    titolo: 'Consegna per ' + (dest.nome || 'il centro'),
    descrizione: `Ritira da ${ritiro.nome || 'il bar'} e consegna prima che si freddi.`,
    frase: `“Ordine pronto da ${ritiro.nome || 'il bar'}. Se arrivi caldo, la mancia è tua.”`,
    tappe: [
      { poi: `xz:${pRitiro.x.toFixed(1)}:${pRitiro.z.toFixed(1)}`, titolo: `Ritira da ${ritiro.nome || 'il bar'}` },
      { poi: `xz:${pDest.x.toFixed(1)}:${pDest.z.toFixed(1)}`, titolo: `Consegna a ${dest.nome || 'destinazione'}` },
    ],
    tempoLimite,
    ricompensa: 50,
    denaro: 8,
    bonusVelocita: true,
  };
  registraDinamica(m);
  return m;
}


// ── Le missioni delle attività ──────────────────────────────────────────────
// Un'attività non è un cartello: è un posto dove si va a fare qualcosa. Qui
// non c'è nessuna missione scritta a mano per la singola bottega — c'è uno
// STAMPO per categoria, e il registro delle attività lo riempie. Aggiungere
// una categoria significa aggiungere una riga.

interface StampoAttivita {
  titolo: (nome: string) => string;
  descrizione: (nome: string) => string;
  frase: string;
  obiettivo: (nome: string) => string;
  rep: number;
  denaro: number;
  secondi: number;
}

const STAMPI: Record<string, StampoAttivita> = {
  bar: {
    titolo: (n) => `Tre caffè da ${n}`,
    descrizione: (n) => `Passa da ${n}: c'è un ordine da ritirare e nessuno che lo porti.`,
    frase: '“Tre caffè e due brioche. Corri che si freddano.”',
    obiettivo: (n) => `Ritira l'ordine da ${n}`,
    rep: 90,
    denaro: 45,
    secondi: 150,
  },
  cibo: {
    titolo: (n) => `L'ordine di ${n}`,
    descrizione: (n) => `Da ${n} è pronto da dieci minuti e sta lì che aspetta.`,
    frase: '“È pronto da dieci minuti. Se ci arrivi caldo ti ricordi bene.”',
    obiettivo: (n) => `Ritira da ${n}`,
    rep: 110,
    denaro: 60,
    secondi: 170,
  },
  negozio: {
    titolo: (n) => `Un salto da ${n}`,
    descrizione: (n) => `Da ${n} è arrivata roba nuova. Vai a vedere com'è.`,
    frase: '“Dicono che sia arrivata roba nuova. Vado a dare un’occhiata.”',
    obiettivo: (n) => `Vai a vedere da ${n}`,
    rep: 80,
    denaro: 35,
    secondi: 0,
  },
  tabacchi: {
    titolo: (n) => `Passa da ${n}`,
    descrizione: (n) => `Serve un salto da ${n}, e già che ci sei tenta la fortuna.`,
    frase: '“Un gratta e vinci non si nega a nessuno.”',
    obiettivo: (n) => `Vai da ${n}`,
    rep: 70,
    denaro: 30,
    secondi: 0,
  },
  farmacia: {
    titolo: (n) => `La ricetta da ${n}`,
    descrizione: (n) => `C'è una ricetta da ritirare da ${n}, ed è meglio farlo prima che chiuda.`,
    frase: '“Prima che chiuda, mi raccomando.”',
    obiettivo: (n) => `Ritira da ${n}`,
    rep: 100,
    denaro: 40,
    secondi: 200,
  },
  servizi: {
    titolo: (n) => `Due passi da ${n}`,
    descrizione: (n) => `Hanno chiesto di te da ${n}. Vai a sentire cosa vogliono.`,
    frase: '“Hanno chiesto di te. Boh, vai a sentire.”',
    obiettivo: (n) => `Fatti vedere da ${n}`,
    rep: 70,
    denaro: 30,
    secondi: 0,
  },
};

/**
 * La missione di un'attività vera di Lugo. Usa SOLO nome, categoria e
 * posizione — dati già pubblici su OpenStreetMap. Nessuna promozione,
 * nessun prezzo reale, nessuna dicitura di partnership: quelli arrivano
 * solo dal file dei dati, e solo con l'autorizzazione dell'esercente.
 */
export function creaMissioneAttivita(
  mondo: MondoLugo,
  attivita: { id: string; nome: string; categoria: string; x: number; z: number },
): Missione {
  const st = STAMPI[attivita.categoria] ?? STAMPI.servizi;
  const nome = attivita.nome || 'la bottega';
  const p = puntoStradaVicino(mondo, attivita.x, attivita.z);
  const m: Missione = {
    id: `att_${attivita.id}_${(contatoreAttivita++).toString(36)}`,
    tipo: 'consegna',
    categoria: 'attivita',
    difficolta: st.secondi ? 'media' : 'facile',
    livelloRichiesto: 1,
    attivitaId: attivita.id,
    titolo: st.titolo(nome),
    descrizione: st.descrizione(nome),
    frase: st.frase,
    tappe: [{ poi: `xz:${p.x.toFixed(1)}:${p.z.toFixed(1)}`, titolo: st.obiettivo(nome) }],
    ricompensa: st.rep,
    denaro: st.denaro,
    ripetibile: true,
    ...(st.secondi ? { tempoLimite: st.secondi, bonusVelocita: true, semeMancia: contatoreAttivita } : {}),
  };
  registraDinamica(m);
  return m;
}

let contatoreAttivita = 0;

export function missioneById(id: string): Missione | undefined {
  return MISSIONI.find((m) => m.id === id) ?? DINAMICHE.get(id);
}

// ── Il primo incontro: la missione m00 «Sei nuovo?» ─────────────────────────
// La primissima missione del gioco non sta nell'array MISSIONI apposta: è
// una DINAMICA registrata a runtime da PrimoIncontro.tsx. Così la tappa
// punta all'attività VERA presa dal registro del mondo (mai coordinate
// cieche nel codice), storiaFinita non la conta e le bacheche non la
// ripescano mai fra i classici. Chiusa una volta, 'm00' finisce comunque in
// missioniFatte — che è già salvato e validato — e non riparte più.

/**
 * Il ponte fra il primo incontro e il resto del gioco, nello stesso schema
 * di lib/lugo/stick.ts e della `risposta` di maranza.ts: chi sa una cosa la
 * scrive qui, chi ne ha bisogno la legge nel proprio giro di frame. Non è
 * un campo dello store apposta — il pacco fra le mani e la posizione
 * dell'anziano cambiano col ciclo di gioco, e passare da React vorrebbe
 * dire un re-render per ogni passo di un pedone.
 */
export const pontePrimoIncontro = {
  /** L'anziano è pronto a parlare: lo scrive PrimoIncontro, lo legge la E del Player. */
  disponibile: false,
  /** Dove sta l'anziano in questo momento (per la distanza della E e del paracadute). */
  x: 0,
  z: 0,
  /** Il Player ha premuto E davanti a lui: PrimoIncontro apre il pannello nel suo giro. */
  parla: false,
  /** La scelta fatta nel pannello del dialogo (la scrive Hud.rispondi, la consuma PrimoIncontro). */
  scelta: null as string | null,
  /** Il pacco è nelle mani del giocatore, dal «Volentieri» all'arrivo al bar. */
  paccoGiocatore: false,
  /** L'anziano ha ancora il pacchetto fra le mani (lo disegna Npcs.tsx). */
  paccoAnziano: true,
  /** Il giocatore ha detto «Magari dopo» almeno una volta: apre il paracadute della catena. */
  rifiutato: false,
  /** Il nome vero del bar di destinazione, risolto dal registro (per i dialoghi). */
  // il ripiego è senza articolo: finisce sempre dopo un «al …»
  nomeBar: 'bar del centro',
};

/**
 * Costruisce e registra la missione del primo incontro. Il bar di
 * destinazione si risolve A RUNTIME dai negozi del mondo — prima per nome
 * (il «Roccà», il bar a due passi dallo spiazzo dietro la Rocca), poi, se
 * un giorno OSM cambiasse, col bar o posto da mangiare più vicino al punto
 * dell'incontro. Del locale vero si usano SOLO nome e categoria, già
 * pubblici su OpenStreetMap: niente promo, niente prezzi, niente
 * sponsorizzazioni — il barista che ringrazia è un personaggio di fantasia.
 */
export function creaMissionePrimoIncontro(
  mondo: MondoLugo,
  ax: number,
  az: number,
  /** `fisica.cerchioLibero`, passato da fuori per non legare questo modulo alla fisica. */
  libero?: (x: number, z: number, raggio: number) => boolean,
): Missione {
  let dest: { nome: string; x: number; z: number } | null =
    mondo.negozi.find((n) => n.nome === 'Roccà' && n.categoria === 'bar') ?? null;
  if (!dest) {
    let dMin = Infinity;
    for (const n of mondo.negozi) {
      if (n.categoria !== 'bar' && n.categoria !== 'cibo') continue;
      const d = Math.hypot(n.x - ax, n.z - az);
      if (d < dMin) {
        dMin = d;
        dest = n;
      }
    }
  }
  // il ripiego è senza articolo: il nome finisce sempre dopo un «al …»
  const nome = dest?.nome || 'bar del centro';
  pontePrimoIncontro.nomeBar = nome;
  // La tappa sta SULLA PORTA del bar quando il nodo OSM è in aria libera
  // (per il Roccà lo è: sta nella zona pedonale davanti alla Rocca). La
  // proiezione con puntoStradaVicino è solo il ripiego per un nodo murato:
  // quella funzione ignora le strade pedonali (serve ai respawn dell'auto)
  // e per il Roccà spediva la consegna sulla carreggiata più vicina, a 53
  // metri dal bancone — un obiettivo che diceva «al bar» e portava altrove.
  const inAria = dest && libero ? libero(dest.x, dest.z, 0.6) : false;
  const p = dest
    ? inAria
      ? { x: dest.x, z: dest.z }
      : puntoStradaVicino(mondo, dest.x, dest.z)
    : puntoStradaVicino(mondo, ax, az);
  const m: Missione = {
    id: 'm00',
    tipo: 'storia',
    categoria: 'introduzione',
    difficolta: 'facile',
    livelloRichiesto: 1,
    titolo: 'Sei nuovo?',
    descrizione: `Un signore ti ha affidato un pacchetto: va portato al ${nome}, qui a due passi.`,
    frase: '“È qui dietro, due minuti. Con le mie gambe, capisci…”',
    tappe: [{ poi: `xz:${p.x.toFixed(1)}:${p.z.toFixed(1)}`, titolo: `Porta la consegna al ${nome}` }],
    ricompensa: 5,
    denaro: 20,
  };
  registraDinamica(m);
  return m;
}

/** Risolve la posizione di una tappa; i "viali-*" e gli "xz:*" si calcolano. */
export function posTappa(mondo: MondoLugo, tappa: TappaMissione): { x: number; z: number } {
  const libera = tappa.poi.match(/^xz:(-?[\d.]+):(-?[\d.]+)$/);
  if (libera) return { x: parseFloat(libera[1]), z: parseFloat(libera[2]) };
  const speciale = tappa.poi.match(/^viali-(n|e|s|o)$/);
  if (speciale) {
    // I viali sono la circonvallazione del CENTRO, non il bordo della
    // mappa: prima il raggio veniva dai bounds (4,7 km di lato) e usciva
    // 1482 m dal centro geometrico, mandando i quattro checkpoint in aperta
    // campagna — 150 secondi per farne il giro erano impossibili.
    const pav = mondo.poi.get('pavaglione');
    const cx = pav ? pav.xm : 0;
    const cz = pav ? pav.zm : 0;
    const r = 380;
    const dir = { n: [0, -1], e: [1, 0], s: [0, 1], o: [-1, 0] }[speciale[1]]!;
    const p = puntoStradaVicino(mondo, cx + dir[0] * r, cz + dir[1] * r);
    return { x: p.x, z: p.z };
  }
  const poi = mondo.poi.get(tappa.poi);
  if (poi) {
    // Alcuni POI di OSM cadono DENTRO la muratura di un edificio: il bar del
    // Pavaglione sta a 5,5 m dentro il muro esterno e a 42 m dal varco più
    // vicino, quindi la tappa era irraggiungibile e la missione m02 non si
    // completava mai. Le tappe che il gioco marca come "su strada" vengono
    // riportate sulla carreggiata più vicina.
    if (tappa.suStrada) {
      const p = puntoStradaVicino(mondo, poi.xm, poi.zm);
      return { x: p.x, z: p.z };
    }
    return { x: poi.xm, z: poi.zm };
  }
  // POI mancante nei dati: si ripiega sul centro, meglio di un crash
  return { x: 0, z: 0 };
}

/**
 * La catena: finché la storia non è finita si prosegue con la prossima
 * missione di storia; poi la città vive di consegne, con ogni tanto una
 * missione di storia rigiocabile per la reputazione.
 */
/** true quando ogni missione scritta a mano è già stata portata a casa. */
export function storiaFinita(missioniFatte: string[]): boolean {
  return MISSIONI.every((m) => missioniFatte.includes(m.id));
}

export function prossimaMissione(
  mondo: MondoLugo,
  idCorrente: string | null,
  missioniFatte: string[],
  livello = 99,
): Missione {
  // una missione non si propone se il giocatore non ha ancora il livello:
  // si passa alla successiva, non si blocca la catena
  const daFare = MISSIONI.find(
    (m) => !missioniFatte.includes(m.id) && (m.livelloRichiesto ?? 1) <= livello,
  );
  if (daFare) return daFare;
  // Storia finita: si vive di consegne, e ogni quarta proposta è un
  // classico da rigiocare. Il contatore delle PROPOSTE è separato da quello
  // delle consegne: prima il ramo del rigioco non incrementava nulla,
  // quindi la condizione restava vera per sempre e il gioco riproponeva
  // all'infinito la stessa identica missione (m01, vai al Pavaglione).
  contatoreProposte++;
  if (contatoreProposte % 5 === 0) {
    const idx = (contatoreProposte / 5 - 1) | 0;
    return MISSIONI[idx % MISSIONI.length];
  }
  // ogni seconda proposta nasce da un'attività vera del centro: è così che
  // una bottega diventa un posto dove si va a fare qualcosa
  if (contatoreProposte % 2 === 0 && attivitaPerMissioni.length) {
    const a = attivitaPerMissioni[contatoreProposte % attivitaPerMissioni.length];
    return creaMissioneAttivita(mondo, a);
  }
  return creaConsegna(mondo);
}
