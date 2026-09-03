'use client';

// Il salvataggio: i progressi vivono in localStorage e sopravvivono alla
// chiusura del browser. Si salva poco e a bassa frequenza (debounce), si
// carica una volta all'avvio, e ogni lettura/scrittura è protetta: se lo
// storage non c'è (navigazione privata, permessi) il gioco va avanti
// senza salvare, mai un crash.

import { useLugo } from './store';
import { TINTE_AUTO } from './palette';
import { CARROZZERIE } from './carrozzerie';
import { DISTINTIVI } from './distintivi';
import { avatarValido, type Avatar } from './avatar';
import { livelloDaRep } from './progressione';
import { CONTATORI_ZERO, type Contatori, type Metrica } from './incarichi';
import { contrattoValido, turniValidi, type Contratto } from './lavoro';

const CHIAVE = 'lugo-salvataggio-v1';

export interface Salvataggio {
  denaro: number;
  punteggio: number;
  missioniFatte: string[];
  tintaAuto: number;
  modelloAuto: number;
  audioOn: boolean;
  outfit: number;
  /** Il look pezzo per pezzo (lib/lugo/avatar.ts). */
  avatar: Avatar;
  /** Gli id dei capi comprati: "top:giubbotto", "scarpe:alte"… */
  capi: string[];
  /** Consegne portate a termine: alimenta il distintivo del rider. */
  consegneFatte: number;
  poiVisitati: string[];
  distintivi: string[];
  volumi: { effetti: number; voce: number; ambiente: number; musica: number };
  /** I totali di sempre da cui gli incarichi ricavano il progresso. */
  totali: Contatori;
  /** Giorno e settimana in corso, con le loro fotografie dei totali. */
  giorno: string;
  settimana: string;
  baseGiorno: Contatori;
  baseSettimana: Contatori;
  incarichiRiscossi: string[];
  /**
   * Il lavoro nelle botteghe (lib/lugo/lavoro.ts): i turni completati per
   * bottega, lo slot del giorno (un turno per bottega al giorno) e il
   * contratto del posto fisso. I validatori vivono in lavoro.ts accanto
   * alle regole, come avatarValido vive accanto all'avatar.
   */
  turniPerBottega: Record<string, number>;
  giornoLavoro: string;
  turniOggi: string[];
  contratto: Contratto | null;
  /**
   * Quante bici e quante auto sono state portate via, da sempre. È l'unica
   * cosa del furto che sopravvive alla chiusura del browser: non l'auto che
   * stavi guidando, non le stelle, non quali auto mancavano dai loro
   * stalli. Al ricaricamento si riparte dalla Rocca con la propria auto e
   * una Lugo intera, com'è sempre stato per le posizioni.
   */
  furti: { bici: number; auto: number };
}

// I totali salvati finiscono in una sottrazione: un NaN, un numero negativo
// o un campo mancante manderebbe il progresso di un incarico a NaN, e la
// barra a "NaN/3" per sempre. Qui ogni metrica torna a essere un intero ≥ 0.
function contatoriValidi(v: unknown): Contatori {
  const out: Contatori = { ...CONTATORI_ZERO };
  if (typeof v !== 'object' || v === null) return out;
  const g = v as Record<string, unknown>;
  for (const k of Object.keys(CONTATORI_ZERO) as Metrica[]) {
    const n = g[k];
    if (typeof n === 'number' && isFinite(n) && n > 0) out[k] = Math.trunc(n);
  }
  return out;
}

// Stessa filosofia di contatoriValidi: un NaN o un negativo qui dentro
// finirebbe scritto nell'HUD e non tornerebbe più indietro. Ogni campo
// torna a essere un intero ≥ 0, e un salvataggio vecchio (senza il campo)
// riparte semplicemente da zero.
function furtiValidi(v: unknown): { bici: number; auto: number } {
  const out = { bici: 0, auto: 0 };
  if (typeof v !== 'object' || v === null) return out;
  const g = v as Record<string, unknown>;
  for (const k of ['bici', 'auto'] as const) {
    const n = g[k];
    if (typeof n === 'number' && isFinite(n) && n > 0) out[k] = Math.trunc(n);
  }
  return out;
}

function chiaveValida(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 && v.length < 16 ? v : undefined;
}

// Gli id dei distintivi cambiano fra una versione e l'altra: tenerne uno
// che non esiste più non è innocuo, perché chi ripara la lista a runtime
// confronta solo le LUNGHEZZE. Con lo stesso numero di id spuri e di badge
// davvero raggiunti la differenza non si vede e il diario resta sbagliato
// per sempre: meglio buttare qui ciò che non riconosciamo, così il
// conteggio non torna e la riparazione scatta.
const ID_DISTINTIVI = new Set(DISTINTIVI.map((d) => d.id));

// Tinta, carrozzeria e outfit sono INDICI, e finiscono dritti in
// TINTE_AUTO[i % len] dentro il corpo dei componenti. In JavaScript il
// resto tiene il segno del dividendo: (-1) % 3 fa -1, non 2, e NaN % 3 fa
// NaN. Un indice fuori scala non "gira" quindi ma indicizza undefined, e
// l'accesso al colore lancia a ogni render. Qui l'indice viene riportato
// davvero dentro la lista una volta per tutte; se è inservibile si
// restituisce undefined e resta il default dello store.
function indiceValido(v: unknown, quanti: number): number | undefined {
  if (typeof v !== 'number' || !isFinite(v)) return undefined;
  const i = Math.trunc(v) % quanti;
  return i < 0 ? i + quanti : i;
}

// I volumi salvati non passano da setVolume (che clampa): lo store viene
// scritto di forza e da lì finiscono nel mixer. Il clamp va rifatto qui,
// e un canale mancante o illeggibile torna al default del gioco invece di
// azzerarsi in silenzio lasciando il gioco muto.
function volumeValido(v: unknown, predefinito: number): number {
  if (typeof v !== 'number' || !isFinite(v)) return predefinito;
  return Math.max(0, Math.min(1, v));
}

export function caricaSalvataggio(): Partial<Salvataggio> | null {
  try {
    const grezzo = window.localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const dati = JSON.parse(grezzo) as Partial<Salvataggio>;
    if (typeof dati !== 'object' || dati === null) return null;
    const predefiniti = useLugo.getInitialState().volumi;
    return {
      denaro: typeof dati.denaro === 'number' && isFinite(dati.denaro) ? Math.max(0, dati.denaro) : undefined,
      punteggio: typeof dati.punteggio === 'number' && isFinite(dati.punteggio) ? Math.max(0, dati.punteggio) : undefined,
      missioniFatte: Array.isArray(dati.missioniFatte) ? dati.missioniFatte.filter((x) => typeof x === 'string').slice(0, 200) : undefined,
      tintaAuto: indiceValido(dati.tintaAuto, TINTE_AUTO.length),
      modelloAuto: indiceValido(dati.modelloAuto, CARROZZERIE.length),
      audioOn: typeof dati.audioOn === 'boolean' ? dati.audioOn : undefined,
      outfit: typeof dati.outfit === 'number' && isFinite(dati.outfit) ? Math.max(0, Math.trunc(dati.outfit)) : undefined,
      // avatarValido ripulisce ogni campo: un id di capo che non esiste più
      // torna a quello di serie invece di lasciare il modello senza un pezzo
      avatar: dati.avatar !== undefined ? avatarValido(dati.avatar) : undefined,
      capi: Array.isArray(dati.capi) ? dati.capi.filter((x) => typeof x === 'string').slice(0, 200) : undefined,
      consegneFatte:
        typeof dati.consegneFatte === 'number' && isFinite(dati.consegneFatte)
          ? Math.max(0, Math.trunc(dati.consegneFatte))
          : undefined,
      poiVisitati: Array.isArray(dati.poiVisitati) ? dati.poiVisitati.filter((x) => typeof x === 'string').slice(0, 400) : undefined,
      distintivi: Array.isArray(dati.distintivi)
        ? dati.distintivi.filter((x) => typeof x === 'string' && ID_DISTINTIVI.has(x)).slice(0, 60)
        : undefined,
      totali: dati.totali !== undefined ? contatoriValidi(dati.totali) : undefined,
      giorno: chiaveValida(dati.giorno),
      settimana: chiaveValida(dati.settimana),
      baseGiorno: dati.baseGiorno !== undefined ? contatoriValidi(dati.baseGiorno) : undefined,
      baseSettimana:
        dati.baseSettimana !== undefined ? contatoriValidi(dati.baseSettimana) : undefined,
      incarichiRiscossi: Array.isArray(dati.incarichiRiscossi)
        ? dati.incarichiRiscossi.filter((x) => typeof x === 'string').slice(0, 40)
        : undefined,
      turniPerBottega:
        dati.turniPerBottega !== undefined ? turniValidi(dati.turniPerBottega) : undefined,
      giornoLavoro: chiaveValida(dati.giornoLavoro),
      // lo slot del giorno vale solo INSIEME alla sua data: senza, lo store
      // gli metterebbe sotto il giorno di oggi e un elenco manomesso
      // bloccherebbe i turni di botteghe mai lavorate fino a mezzanotte
      turniOggi:
        chiaveValida(dati.giornoLavoro) && Array.isArray(dati.turniOggi)
          ? dati.turniOggi.filter((x) => typeof x === 'string' && x.length <= 60).slice(0, 60)
          : undefined,
      // niente riparazioni sul contratto: o è ben formato o non esiste — un
      // salvataggio manomesso può gonfiarsi i turni, ma un contratto rotto
      // non deve mai trasformarsi in un posto fisso regalato
      contratto: dati.contratto !== undefined ? contrattoValido(dati.contratto) : undefined,
      furti: dati.furti !== undefined ? furtiValidi(dati.furti) : undefined,
      volumi:
        dati.volumi && typeof dati.volumi === 'object'
          ? {
              effetti: volumeValido(dati.volumi.effetti, predefiniti.effetti),
              voce: volumeValido(dati.volumi.voce, predefiniti.voce),
              ambiente: volumeValido(dati.volumi.ambiente, predefiniti.ambiente),
              musica: volumeValido(dati.volumi.musica, predefiniti.musica),
            }
          : undefined,
    };
  } catch {
    return null;
  }
}

function scrivi(dati: Salvataggio) {
  try {
    window.localStorage.setItem(CHIAVE, JSON.stringify(dati));
  } catch {
    // storage pieno o negato: pazienza, si gioca senza salvare
  }
}

let avviato = false;

/** Carica il salvataggio nello store e da lì in poi salva a ogni cambiamento (debounce). */
export function avviaSalvataggio() {
  if (avviato || typeof window === 'undefined') return;
  avviato = true;

  const dati = caricaSalvataggio();
  if (dati) {
    useLugo.setState({
      ...(dati.denaro !== undefined ? { denaro: dati.denaro } : {}),
      ...(dati.punteggio !== undefined ? { punteggio: dati.punteggio } : {}),
      ...(dati.missioniFatte !== undefined ? { missioniFatte: dati.missioniFatte } : {}),
      ...(dati.tintaAuto !== undefined ? { tintaAuto: dati.tintaAuto } : {}),
      ...(dati.modelloAuto !== undefined ? { modelloAuto: dati.modelloAuto } : {}),
      ...(dati.audioOn !== undefined ? { audioOn: dati.audioOn } : {}),
      ...(dati.outfit !== undefined ? { outfit: dati.outfit } : {}),
      ...(dati.avatar !== undefined ? { avatar: dati.avatar } : {}),
      ...(dati.capi !== undefined ? { capi: dati.capi } : {}),
      ...(dati.consegneFatte !== undefined ? { consegneFatte: dati.consegneFatte } : {}),
      ...(dati.poiVisitati !== undefined ? { poiVisitati: dati.poiVisitati } : {}),
      ...(dati.distintivi !== undefined ? { distintivi: dati.distintivi } : {}),
      ...(dati.volumi !== undefined ? { volumi: dati.volumi } : {}),
      ...(dati.totali !== undefined ? { totali: dati.totali } : {}),
      ...(dati.giorno !== undefined ? { giorno: dati.giorno } : {}),
      ...(dati.settimana !== undefined ? { settimana: dati.settimana } : {}),
      ...(dati.baseGiorno !== undefined ? { baseGiorno: dati.baseGiorno } : {}),
      ...(dati.baseSettimana !== undefined ? { baseSettimana: dati.baseSettimana } : {}),
      ...(dati.incarichiRiscossi !== undefined
        ? { incarichiRiscossi: dati.incarichiRiscossi }
        : {}),
      ...(dati.turniPerBottega !== undefined ? { turniPerBottega: dati.turniPerBottega } : {}),
      ...(dati.giornoLavoro !== undefined ? { giornoLavoro: dati.giornoLavoro } : {}),
      ...(dati.turniOggi !== undefined ? { turniOggi: dati.turniOggi } : {}),
      ...(dati.contratto !== undefined ? { contratto: dati.contratto } : {}),
      ...(dati.furti !== undefined ? { furti: dati.furti } : {}),
    });
    // il livello è la lettura della reputazione, non uno stato a sé: al
    // caricamento va ricalcolato, perché setState scavalca addPunti
    useLugo.setState({ livello: livelloDaRep(useLugo.getState().punteggio).n });
    // se nel frattempo è passata mezzanotte (o è lunedì) gli incarichi di
    // ieri lasciano il posto a quelli di oggi, prima ancora di giocare
    useLugo.getState().allineaIncarichi();
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  useLugo.subscribe((s, prima) => {
    if (
      s.denaro === prima.denaro &&
      s.punteggio === prima.punteggio &&
      s.missioniFatte === prima.missioniFatte &&
      s.tintaAuto === prima.tintaAuto &&
      s.modelloAuto === prima.modelloAuto &&
      s.audioOn === prima.audioOn &&
      s.outfit === prima.outfit &&
      s.avatar === prima.avatar &&
      s.capi === prima.capi &&
      s.consegneFatte === prima.consegneFatte &&
      s.poiVisitati === prima.poiVisitati &&
      s.distintivi === prima.distintivi &&
      s.volumi === prima.volumi &&
      s.totali === prima.totali &&
      s.giorno === prima.giorno &&
      s.settimana === prima.settimana &&
      s.baseGiorno === prima.baseGiorno &&
      s.baseSettimana === prima.baseSettimana &&
      s.incarichiRiscossi === prima.incarichiRiscossi &&
      s.turniPerBottega === prima.turniPerBottega &&
      s.giornoLavoro === prima.giornoLavoro &&
      s.turniOggi === prima.turniOggi &&
      s.contratto === prima.contratto &&
      s.furti === prima.furti
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const st = useLugo.getState();
      scrivi({
        denaro: st.denaro,
        punteggio: st.punteggio,
        missioniFatte: st.missioniFatte,
        tintaAuto: st.tintaAuto,
        modelloAuto: st.modelloAuto,
        audioOn: st.audioOn,
        outfit: st.outfit,
        avatar: st.avatar,
        capi: st.capi,
        consegneFatte: st.consegneFatte,
        poiVisitati: st.poiVisitati,
        distintivi: st.distintivi,
        volumi: st.volumi,
        totali: st.totali,
        giorno: st.giorno,
        settimana: st.settimana,
        baseGiorno: st.baseGiorno,
        baseSettimana: st.baseSettimana,
        incarichiRiscossi: st.incarichiRiscossi,
        turniPerBottega: st.turniPerBottega,
        giornoLavoro: st.giornoLavoro,
        turniOggi: st.turniOggi,
        contratto: st.contratto,
        furti: st.furti,
      });
    }, 600);
  });
}
