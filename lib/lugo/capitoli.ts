// I CAPITOLI di LUGO LIFE: il disegno grande, dichiarato. Il gioco sa già
// contare tutto — missioni, soldi, reputazione, consegne — ma il giocatore
// non vede mai il filo: questo modulo lo racconta. A che punto della vita a
// Lugo sono, e qual è il prossimo traguardo.
//
// Regola non negoziabile: il capitolo è SEMPRE derivato. Qui non si scrive
// niente, non c'è nessun campo nuovo nel salvataggio, nessun
// «capitoloCorrente» memorizzato da tenere allineato: si ricalcola ogni
// volta dagli stessi numeri che salvataggio.ts già salva e già valida. Così
// un salvataggio vecchio (di quando i capitoli non esistevano) o manomesso
// a mano in localStorage non può mai raccontare un capitolo sbagliato — al
// massimo racconta i suoi numeri, e il capitolo che ne esce è quello giusto
// per quei numeri.
//
// Modulo PURO senza React: lo leggono l'HUD, gli hook di collaudo e
// chiunque altro, senza portarsi dietro nulla.

import { livelloDaRep } from './progressione';

/**
 * L'estratto dello store da cui tutto si deriva. C'è `punteggio` e non
 * `livello` apposta: il livello dello store è a sua volta un derivato
 * (della reputazione, via progressione.ts), e fidarsi del derivato di un
 * derivato è il modo classico di raccontare due storie diverse quando un
 * setState scavalca addPunti. Qui il livello si rilegge sempre dalla
 * reputazione, con la stessa tabella del resto del gioco.
 */
export interface StatoCapitoli {
  missioniFatte: string[];
  denaro: number;
  punteggio: number;
  consegneFatte: number;
}

export interface Capitolo {
  n: number;
  nome: string;
  /** Il motto di una riga, quello che si legge quando il capitolo comincia. */
  motto: string;
  completo: (stato: StatoCapitoli) => boolean;
  /** Il testo del traguardo, con i numeri vivi («Consegne fatte: 1 di 3»). */
  prossimoPasso: (stato: StatoCapitoli) => string;
}

// Le missioni che chiudono i capitoli. Gli id stanno qui e non sparsi nelle
// funzioni: se un giorno la storia cambia nome a una missione, c'è un solo
// posto dove il capitolo può restare indietro.
const MISSIONI_ARRIVO = ['m00', 'mvp1', 'mvp2', 'mvp3'] as const;
const MISSIONI_LAVORO = ['mvp4', 'mvp5'] as const;
const MISSIONI_AMICO = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07'] as const;
const CONSEGNE_LAVORO = 3;
const LIVELLO_QUARTIERE = 3;
const RISPARMIO_CASA = 400;

/** Quante di queste missioni risultano fatte (mai più della lista). */
function fatte(stato: StatoCapitoli, ids: readonly string[]): number {
  let n = 0;
  for (const id of ids) if (stato.missioniFatte.includes(id)) n++;
  return n;
}

// I numeri vivi si CLAMPANO al traguardo: un veterano con trenta consegne
// non deve leggere «Consegne fatte: 30 di 3» — il conteggio racconta quanto
// manca, non la carriera intera.
const di = (fatto: number, meta: number) => `${Math.min(fatto, meta)} di ${meta}`;

export const CAPITOLI: readonly Capitolo[] = [
  {
    n: 1,
    nome: "L'arrivo",
    motto: 'Sei nuovo: impara la città.',
    completo: (s) => fatte(s, MISSIONI_ARRIVO) >= MISSIONI_ARRIVO.length,
    prossimoPasso: (s) =>
      `Prime missioni: ${di(fatte(s, MISSIONI_ARRIVO), MISSIONI_ARRIVO.length)}`,
  },
  {
    n: 2,
    nome: 'Il lavoro',
    motto: 'Le botteghe ti mettono alla prova.',
    completo: (s) =>
      fatte(s, MISSIONI_LAVORO) >= MISSIONI_LAVORO.length &&
      s.consegneFatte >= CONSEGNE_LAVORO,
    // si mostra solo ciò che manca DAVVERO: a prove finite la riga si
    // accorcia sulle consegne, invece di trascinarsi un «2 di 2» già chiuso
    prossimoPasso: (s) => {
      const passi: string[] = [];
      if (fatte(s, MISSIONI_LAVORO) < MISSIONI_LAVORO.length) {
        passi.push(`Prove in bottega: ${di(fatte(s, MISSIONI_LAVORO), MISSIONI_LAVORO.length)}`);
      }
      if (s.consegneFatte < CONSEGNE_LAVORO) {
        passi.push(`Consegne fatte: ${di(s.consegneFatte, CONSEGNE_LAVORO)}`);
      }
      return passi.join(' · ') || 'Traguardo raggiunto';
    },
  },
  {
    n: 3,
    nome: 'Il quartiere',
    motto: 'La città comincia a conoscerti.',
    completo: (s) =>
      fatte(s, MISSIONI_AMICO) >= MISSIONI_AMICO.length &&
      livelloDaRep(s.punteggio).n >= LIVELLO_QUARTIERE,
    prossimoPasso: (s) => {
      const passi: string[] = [];
      if (fatte(s, MISSIONI_AMICO) < MISSIONI_AMICO.length) {
        passi.push(`«Trova il tuo amico»: ${di(fatte(s, MISSIONI_AMICO), MISSIONI_AMICO.length)}`);
      }
      if (livelloDaRep(s.punteggio).n < LIVELLO_QUARTIERE) {
        passi.push(`Livello ${di(livelloDaRep(s.punteggio).n, LIVELLO_QUARTIERE)}`);
      }
      return passi.join(' · ') || 'Traguardo raggiunto';
    },
  },
  {
    n: 4,
    nome: 'La casa',
    // il motto dice ONESTAMENTE cosa si sta facendo: si mette da parte. La
    // compravendita vera arriverà con un cantiere futuro, e promettere qui
    // una casa che non si può ancora comprare sarebbe una bugia nel gioco
    motto: 'Metti da parte €400 per la casa.',
    completo: (s) => s.denaro >= RISPARMIO_CASA,
    // il denaro può avere i centesimi (le mance): nel conto si arrotonda
    // per difetto, così «€400» compare solo quando i 400 ci sono davvero
    prossimoPasso: (s) =>
      `Risparmiati €${Math.min(RISPARMIO_CASA, Math.floor(Math.max(0, s.denaro)))} di €${RISPARMIO_CASA} per la casa`,
  },
  {
    n: 5,
    nome: 'La festa',
    motto: 'Si sente già la musica, da lontano.',
    // il capitolo esiste nel modello ma NON è ancora attivo: non si chiude
    // mai, e il suo traguardo non promette meccaniche che non esistono.
    // Nell'HUD compare da solo al momento giusto, perché capitoloCorrente
    // lo raggiunge soltanto quando i primi quattro sono tutti chiusi.
    completo: () => false,
    prossimoPasso: () => 'La grande festa si prepara…',
  },
];

/**
 * Il capitolo in cui il giocatore si trova ADESSO: il primo non completo.
 * I capitoli si controllano in ordine, quindi un salvataggio con €2000 in
 * tasca ma le prime missioni a metà sta ancora nel capitolo 1 — i soldi
 * per la casa lo aspettano, non lo scavalcano.
 */
export function capitoloCorrente(stato: StatoCapitoli): Capitolo {
  for (const c of CAPITOLI) if (!c.completo(stato)) return c;
  // oggi non succede (la festa non si chiude mai), ma se un domani si
  // chiudesse anche quella, la vita resta aperta sull'ultimo capitolo
  // invece di esplodere su un indice fuori lista
  return CAPITOLI[CAPITOLI.length - 1];
}

/** I numeri dei capitoli già chiusi, in ordine (per HUD e collaudo). */
export function capitoliCompleti(stato: StatoCapitoli): number[] {
  return CAPITOLI.filter((c) => c.completo(stato)).map((c) => c.n);
}
