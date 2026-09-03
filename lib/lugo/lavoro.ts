// Il LAVORO nelle botteghe di Lugo: i turni, la bottega del cuore e il
// contratto del posto fisso. Qui vivono le regole e i validatori; lo stato
// (contatori per bottega, contratto firmato, turni di oggi) sta nello store
// e nel salvataggio come tutto il resto. Modulo PURO senza React, come
// capitoli.ts: lo leggono l'HUD, la macchina delle missioni e il collaudo.
//
// Regola legale, ripetuta qui perché è il posto dove si «lavora»: delle
// attività vere si usano SOLO nome e categoria, già pubblici su
// OpenStreetMap. Il lavoro è finzione di gioco alla GTA — «il titolare» è
// un personaggio di fantasia e non rappresenta mai l'esercente reale, la
// paga è in euro di gioco e nessuna riga qui è una promessa commerciale.

import { chiaveGiorno } from './incarichi';

/** Turni completati nella stessa bottega prima che si apra il posto fisso. */
export const TURNI_PER_CONTRATTO = 3;

/** Quanto paga in più un turno nella propria bottega (25%, arrotondato). */
export const BONUS_CONTRATTO = 0.25;

/**
 * Il tetto del contatore di una singola bottega. Non serve al gioco (per il
 * contratto ne bastano 3): serve al salvataggio, dove un numero che cresce
 * per sempre non ha niente da raccontare e un valore manomesso a
 * 1e300 non deve entrare nei conti di nessuno.
 */
const MAX_TURNI_BOTTEGA = 999;

/**
 * Quante botteghe al massimo tengono un contatore. Il registro delle
 * attività con missioni ne offre 60: oltre quel numero il Record non è più
 * «compatto», è un deposito. Quando si sfora entra la nuova e esce quella
 * col conteggio più basso — la carriera vera non si perde mai.
 */
const MAX_BOTTEGHE_CONTATE = 60;

/** Il contratto del posto fisso: id stabile e nome OSM della bottega. */
export interface Contratto {
  id: string;
  nome: string;
}

// ── Il giorno dei turni ─────────────────────────────────────────────────────
// Un turno per bottega per giorno, con la stessa chiaveGiorno degli
// incarichi. Il collaudo però non può aspettare mezzanotte: lo scarto qui
// sotto fa girare il calendario DEI SOLI TURNI in avanti. È dichiaratamente
// un attrezzo di collaudo (lo espone l'hook __LUGO__.avanzaGiornoLavoro):
// nel gioco vero nessuno lo chiama e lo scarto resta zero per sempre.

let scartoGiorniCollaudo = 0;

/** SOLO COLLAUDO: sposta il giorno dei turni avanti di `giorni`. */
export function avanzaGiornoLavoro(giorni = 1): string {
  scartoGiorniCollaudo += Math.max(0, Math.trunc(giorni));
  return chiaveGiornoLavoro();
}

/** La chiave del giorno per i turni: quella degli incarichi, più lo scarto. */
export function chiaveGiornoLavoro(): string {
  const d = new Date();
  d.setDate(d.getDate() + scartoGiorniCollaudo);
  return chiaveGiorno(d);
}

/**
 * true se in QUESTA bottega il turno di oggi è già stato fatto. Il giorno
 * memorizzato si confronta con quello corrente: un elenco di ieri non
 * blocca niente, si è solo portato dietro la sua data.
 */
export function turnoFattoOggi(
  giornoLavoro: string,
  turniOggi: readonly string[],
  bottegaId: string,
): boolean {
  return giornoLavoro === chiaveGiornoLavoro() && turniOggi.includes(bottegaId);
}

/**
 * Il contatore per bottega dopo un turno completato: restituisce un oggetto
 * NUOVO (lo store è Zustand: mutare quello vecchio non farebbe mai
 * ri-renderizzare la vetrina). Il tetto per bottega e il tetto di botteghe
 * si applicano qui, così nessun chiamante può dimenticarli.
 */
export function incrementaTurni(
  turni: Record<string, number>,
  bottegaId: string,
): Record<string, number> {
  const out: Record<string, number> = { ...turni };
  out[bottegaId] = Math.min(MAX_TURNI_BOTTEGA, (out[bottegaId] ?? 0) + 1);
  const chiavi = Object.keys(out);
  if (chiavi.length > MAX_BOTTEGHE_CONTATE) {
    // esce il conteggio più basso che NON sia la bottega appena lavorata:
    // sfrattare proprio lei significherebbe non arrivare mai a tre turni
    let minore: string | null = null;
    for (const k of chiavi) {
      if (k === bottegaId) continue;
      if (minore === null || out[k] < out[minore]) minore = k;
    }
    if (minore !== null) delete out[minore];
  }
  return out;
}

/** La bottega col contatore più alto (per il traguardo del capitolo 2). */
export function migliorBottega(turni: Record<string, number>): { id: string | null; turni: number } {
  let id: string | null = null;
  let n = 0;
  for (const k of Object.keys(turni)) {
    if (turni[k] > n) {
      n = turni[k];
      id = k;
    }
  }
  return { id, turni: n };
}

/**
 * La paga di una missione: quella base, oppure il 25% in più (arrotondato)
 * quando il turno è nella PROPRIA bottega. Il confronto è sull'id, non sul
 * nome: due filiali omonime non devono pagarsi il bonus a vicenda.
 */
export function pagaTurno(
  base: number,
  bottegaId: string | undefined,
  contratto: Contratto | null,
): number {
  if (!bottegaId || !contratto || contratto.id !== bottegaId) return base;
  return Math.round(base * (1 + BONUS_CONTRATTO));
}

// ── I validatori del salvataggio ────────────────────────────────────────────
// Stessa filosofia di contatoriValidi in salvataggio.ts: quello che entra
// dal localStorage è materiale di chiunque. Un contatore a NaN manderebbe
// il capitolo 2 a «NaN di 3», un contratto malformato esploderebbe alla
// prima lettura di `.nome`. Qui ogni campo torna a essere quello che il
// gioco si aspetta, o non entra affatto.

/** Riporta i contatori per bottega a interi 1–tetto, al massimo 60 voci. */
export function turniValidi(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return out;
  const g = v as Record<string, unknown>;
  // in un salvataggio gonfiato a mano si tengono le voci più alte: sono
  // quelle che raccontano la carriera, le briciole si possono perdere
  const voci: [string, number][] = [];
  for (const k of Object.keys(g)) {
    const n = g[k];
    if (typeof k !== 'string' || k.length === 0 || k.length > 60) continue;
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) continue;
    voci.push([k, Math.min(MAX_TURNI_BOTTEGA, Math.trunc(n))]);
  }
  voci.sort((a, b) => b[1] - a[1]);
  for (const [k, n] of voci.slice(0, MAX_BOTTEGHE_CONTATE)) out[k] = n;
  return out;
}

/**
 * Il contratto, o null. Qui non si «ripara»: un contratto senza id o senza
 * nome, coi tipi sbagliati o con campi chilometrici NON è un contratto, e
 * restituirlo aggiustato equivarrebbe a regalarne uno a un salvataggio
 * manomesso. Il capitolo 2 si chiude col contratto: meglio riaprirlo che
 * chiuderlo per sbaglio.
 */
export function contrattoValido(v: unknown): Contratto | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const g = v as Record<string, unknown>;
  const id = g.id;
  const nome = g.nome;
  if (typeof id !== 'string' || id.length === 0 || id.length > 60) return null;
  if (typeof nome !== 'string' || nome.length === 0 || nome.length > 80) return null;
  return { id, nome };
}

// ── Le battute del posto fisso ──────────────────────────────────────────────
// Il datore è «il titolare», personaggio di fantasia: mai il nome di una
// persona reale. Battute brevi e quotidiane, nel tono del resto del gioco.

/**
 * Il dialogo con cui il titolare offre il posto. Se c'è già un contratto
 * altrove, la battuta lo dice con onestà: si cambia bottega senza drammi,
 * come si fa davvero, salutando chi ti ha dato il primo lavoro.
 */
export function dialogoPostoFisso(
  contratto: Contratto | null,
): { chi: string; testo: string; opzioni: { id: string; label: string }[] } {
  const cambio = contratto && contratto.id ? contratto.nome : null;
  return {
    chi: 'Il titolare',
    testo: cambio
      ? `«Tre turni qui e si vede che sai fare. Se vieni fisso da noi, però, passa a salutare da ${cambio}: a Lugo ci si dice le cose in faccia.»`
      : `«Tre turni e mai un ritardo. Qui una mano fissa serve tutti i giorni: ti va di essere tu?»`,
    opzioni: [
      { id: 'si', label: 'Volentieri: quando si comincia?' },
      { id: 'no', label: 'Ci penso ancora un po’.' },
    ],
  };
}
