'use client';

// Stato del gioco (Zustand). Qui vive solo lo stato "lento" che interessa
// alla UI: fase, modalità, missioni, denaro e reputazione, qualità. Le
// grandezze che cambiano ogni frame (posizioni, velocità) restano fuori da
// React, in oggetti mutabili dentro il game loop; nello store arriva solo
// ciò che l'HUD deve mostrare, a bassa frequenza.

import { create } from 'zustand';
import { AVATAR_INIZIALE, type Avatar } from './avatar';
import { livelloDaRep } from './progressione';
import {
  CONTATORI_ZERO,
  chiaveGiorno,
  chiaveSettimana,
  type Contatori,
} from './incarichi';

export type QualitaTier = 'alta' | 'media' | 'bassa';
export type Modalita = 'auto' | 'piedi';
export type FaseGioco = 'start' | 'gioco';
export type StatoMissione = 'idle' | 'attiva' | 'completata' | 'fallita';

/** Scheda cinematografica mostrata all'avvio di una missione. */
export interface IntroMissione {
  etichetta: string; // "NUOVA MISSIONE" / "CONSEGNA"
  titolo: string;
  frase?: string; // la battuta tra virgolette
  obiettivo: string;
}

/** Scheda di fine missione: ricompense da mostrare. */
export interface EsitoMissione {
  titolo: string;
  denaro: number;
  rep: number;
  extra?: string; // "MANCIA €5" e simili
}

/** La vetrina di un'attività, aperta con E davanti al negozio. */
export interface VetrinaAperta {
  id: string;
  nome: string;
  categoria: string;
  descrizione: string;
  /** true solo per attività che hanno autorizzato la presenza premium. */
  partner: boolean;
  /** Livello autorizzato dall'esercente: 'NESSUNO' finché non c'è accordo. */
  livello: 'NESSUNO' | 'BASE' | 'BOTTEGA' | 'PREMIUM';
  promo: string | null;
  articoli: { nome: string; prezzo: number; effetto?: string }[];
}

/** Una proposta di lavoro affissa a una bacheca. */
export interface OffertaBacheca {
  id: string;
  titolo: string;
  descrizione: string;
  obiettivo: string;
  categoria: string;
  difficolta: string;
  tempoLimite?: number;
  rep: number;
  denaro: number;
}

/** La bacheca aperta: il luogo e le sue proposte. */
export interface BachecaAperta {
  id: string;
  nome: string;
  sottotitolo: string;
  offerte: OffertaBacheca[];
}

/** La scheda "SCOPERTO" di un punto di interesse appena visitato. */
export interface Scoperta {
  nome: string;
  cosa: string;
  tipo: string;
  /** Distintivo appena guadagnato, se la scoperta lo ha completato. */
  distintivo?: string;
}

/** Un dialogo a scelte con un NPC. */
export interface Dialogo {
  id: string;
  chi: string; // chi parla
  testo: string;
  opzioni: { id: string; label: string }[];
}

interface LugoState {
  fase: FaseGioco;
  mode: Modalita;
  qualita: QualitaTier;
  /** Indice tinta auto scelta nello start screen. */
  tintaAuto: number;
  /** Indice della carrozzeria scelta. */
  modelloAuto: number;
  audioOn: boolean;
  /** Volumi 0–1 del mixer. */
  volumi: { effetti: number; voce: number; ambiente: number; musica: number };

  // HUD (aggiornati a ~5 Hz dal loop, non ogni frame)
  kmh: number;
  /** Reputazione: cresce con le missioni. */
  punteggio: number;
  /** I soldi in tasca (€). */
  denaro: number;
  /** Livello ricercato 0–3. */
  wanted: number;

  // missioni
  missioneId: string | null;
  statoMissione: StatoMissione;
  /** Indice della tappa corrente della missione attiva. */
  tappa: number;
  /**
   * Quante missioni sono partite da inizio partita. Non serve al giocatore:
   * serve alla macchina delle missioni per accorgersi che una missione è
   * partita da fuori (la bacheca dei lavori) e caricare il conto alla
   * rovescia. Con il solo id non bastava: una missione ripetibile accettata
   * due volte ha lo stesso id tutte e due le volte.
   */
  avvii: number;
  /** Secondi rimasti (se la missione ha un limite). */
  tempoResiduo: number | null;
  /** Id delle missioni completate almeno una volta. */
  missioniFatte: string[];
  /** Scheda "NUOVA MISSIONE" (si dissolve da sola). */
  intro: IntroMissione | null;
  /** Scheda "MISSIONE COMPLETATA" con le ricompense. */
  esito: EsitoMissione | null;
  /** Dialogo a scelte aperto (mette in pausa l'attenzione, non il mondo). */
  dialogo: Dialogo | null;
  /** Vetrina del negozio aperta. */
  vetrina: VetrinaAperta | null;
  /** Bacheca dei lavori aperta (Pavaglione, Rocca, stazione, Baracca). */
  bacheca: BachecaAperta | null;
  /** Id dei punti di interesse scoperti a piedi. */
  poiVisitati: string[];
  /** Id dei distintivi guadagnati. */
  distintivi: string[];
  /** Scheda "SCOPERTO" appena comparsa (si dissolve da sola). */
  scoperta: Scoperta | null;
  /** true quando il diario dell'esplorazione è aperto. */
  diario: boolean;
  /** true quando il guardaroba è aperto. */
  guardaroba: boolean;
  /** Indice del vestito indossato (si compra nei negozi). */
  outfit: number;
  /** Il look del protagonista, pezzo per pezzo (lib/lugo/avatar.ts). */
  avatar: Avatar;
  /** Gli id dei capi acquistati: "top:giubbotto", "scarpe:alte"… */
  capi: string[];
  /** Livello raggiunto, ricavato dalla reputazione. */
  livello: number;
  /** Consegne portate a termine: alimenta distintivi e giornaliere. */
  consegneFatte: number;
  /**
   * I totali di sempre del giocatore. Gli incarichi del giorno e della
   * settimana non tengono un contatore per incarico: fotografano questi
   * totali quando il periodo comincia, e il progresso è la differenza.
   */
  totali: Contatori;
  /** La chiave del giorno e della settimana in corso, e le loro fotografie. */
  giorno: string;
  settimana: string;
  baseGiorno: Contatori;
  baseSettimana: Contatori;
  /** Gli incarichi già riscossi nel periodo in corso. */
  incarichiRiscossi: string[];
  /** Messaggio transitorio a centro schermo (esiti, tappe). */
  avviso: string | null;
  /** Suggerimento contestuale persistente ("Premi E…"). */
  hint: string | null;
  /** Nome della via su cui ci si trova (stile GTA, in basso). */
  via: string | null;

  avvia: () => void;
  setMode: (m: Modalita) => void;
  setQualita: (q: QualitaTier) => void;
  setTintaAuto: (i: number) => void;
  setModelloAuto: (i: number) => void;
  toggleAudio: () => void;
  setVolume: (canale: 'effetti' | 'voce' | 'ambiente' | 'musica', v: number) => void;
  setKmh: (v: number) => void;
  addPunti: (v: number) => void;
  /** Aggiunge (o toglie, mai sotto zero) denaro. */
  addDenaro: (v: number) => void;
  setWanted: (v: number) => void;
  setMissione: (id: string | null, stato: StatoMissione, tappa?: number) => void;
  addMissioneFatta: (id: string) => void;
  setTempoResiduo: (s: number | null) => void;
  setIntro: (i: IntroMissione | null) => void;
  setEsito: (e: EsitoMissione | null) => void;
  setDialogo: (d: Dialogo | null) => void;
  setVetrina: (v: VetrinaAperta | null) => void;
  setBacheca: (b: BachecaAperta | null) => void;
  /** Registra la scoperta di un punto; restituisce false se era già noto. */
  scopriPoi: (id: string) => boolean;
  setDistintivi: (ids: string[]) => void;
  setScoperta: (s: Scoperta | null) => void;
  setDiario: (aperto: boolean) => void;
  setGuardaroba: (aperto: boolean) => void;
  setOutfit: (i: number) => void;
  /** Cambia un pezzo del look; il resto resta com'è. */
  setAvatar: (patch: Partial<Avatar>) => void;
  /** Registra un capo acquistato. */
  compraCapo: (id: string) => void;
  contaConsegna: () => void;
  /** Somma ai totali di sempre: alimenta gli incarichi. */
  contaTotale: (metrica: keyof Contatori, quanto?: number) => void;
  /**
   * Se il giorno (o la settimana) è cambiato, rifà la fotografia dei totali
   * e azzera le riscossioni di quel periodo. Va chiamata al caricamento e
   * ogni tanto mentre si gioca: a mezzanotte la giornata cambia da sola.
   */
  allineaIncarichi: () => void;
  /** Segna un incarico come riscosso; false se era già stato incassato. */
  riscuotiIncarico: (id: string) => boolean;
  setAvviso: (msg: string | null) => void;
  setHint: (msg: string | null) => void;
  setVia: (nome: string | null) => void;
}

export const useLugo = create<LugoState>((set, get) => ({
  fase: 'start',
  mode: 'auto',
  qualita: 'alta',
  tintaAuto: 0,
  modelloAuto: 0,
  audioOn: true,
  volumi: { effetti: 1, voce: 1, ambiente: 1, musica: 0.7 },
  kmh: 0,
  punteggio: 0,
  denaro: 20,
  wanted: 0,
  missioneId: null,
  statoMissione: 'idle',
  tappa: 0,
  avvii: 0,
  tempoResiduo: null,
  missioniFatte: [],
  intro: null,
  esito: null,
  dialogo: null,
  vetrina: null,
  bacheca: null,
  avatar: { ...AVATAR_INIZIALE },
  capi: [],
  livello: 1,
  consegneFatte: 0,
  totali: { ...CONTATORI_ZERO },
  giorno: chiaveGiorno(),
  settimana: chiaveSettimana(),
  baseGiorno: { ...CONTATORI_ZERO },
  baseSettimana: { ...CONTATORI_ZERO },
  incarichiRiscossi: [],
  poiVisitati: [],
  distintivi: [],
  scoperta: null,
  diario: false,
  guardaroba: false,
  outfit: 0,
  avviso: null,
  hint: null,
  via: null,

  avvia: () => set({ fase: 'gioco' }),
  setMode: (mode) => set({ mode }),
  setQualita: (qualita) => set({ qualita }),
  setTintaAuto: (tintaAuto) => set({ tintaAuto }),
  setModelloAuto: (modelloAuto) => set({ modelloAuto }),
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  setVolume: (canale, v) =>
    set((s) => ({ volumi: { ...s.volumi, [canale]: Math.max(0, Math.min(1, v)) } })),
  setKmh: (kmh) => set({ kmh }),
  addPunti: (v) =>
    set((s) => {
      const punteggio = s.punteggio + v;
      // il livello NON è uno stato indipendente: è la lettura della
      // reputazione secondo la tabella in lib/lugo/progressione.ts
      return { punteggio, livello: livelloDaRep(punteggio).n };
    }),
  addDenaro: (v) =>
    set((s) => ({
      denaro: Math.max(0, Math.round((s.denaro + v) * 100) / 100),
      // negli incarichi conta quanto si è GUADAGNATO, non quanto si ha in
      // tasca: le spese non fanno tornare indietro il traguardo
      totali: v > 0 ? { ...s.totali, euro: s.totali.euro + v } : s.totali,
    })),
  setWanted: (wanted) => set({ wanted: Math.max(0, Math.min(3, wanted)) }),
  setMissione: (missioneId, statoMissione, tappa = 0) =>
    set((s) => ({
      missioneId,
      statoMissione,
      tappa,
      avvii: statoMissione === 'attiva' && tappa === 0 ? s.avvii + 1 : s.avvii,
    })),
  addMissioneFatta: (id) =>
    set((s) => (s.missioniFatte.includes(id) ? {} : { missioniFatte: [...s.missioniFatte, id] })),
  setTempoResiduo: (tempoResiduo) => set({ tempoResiduo }),
  setIntro: (intro) => set({ intro }),
  setEsito: (esito) => set({ esito }),
  setDialogo: (dialogo) => set({ dialogo }),
  setVetrina: (vetrina) => set({ vetrina }),
  setBacheca: (bacheca) => set({ bacheca }),
  scopriPoi: (id) => {
    if (get().poiVisitati.includes(id)) return false;
    set((s) => ({
      poiVisitati: [...s.poiVisitati, id],
      totali: { ...s.totali, scoperte: s.totali.scoperte + 1 },
    }));
    return true;
  },
  setDistintivi: (distintivi) => set({ distintivi }),
  setScoperta: (scoperta) => set({ scoperta }),
  setDiario: (diario) => set({ diario }),
  setGuardaroba: (guardaroba) => set({ guardaroba }),
  setOutfit: (outfit) => set({ outfit }),
  setAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),
  compraCapo: (id) => set((s) => (s.capi.includes(id) ? {} : { capi: [...s.capi, id] })),
  contaConsegna: () =>
    set((s) => ({
      consegneFatte: s.consegneFatte + 1,
      totali: { ...s.totali, consegne: s.totali.consegne + 1 },
    })),
  contaTotale: (metrica, quanto = 1) =>
    set((s) => ({ totali: { ...s.totali, [metrica]: s.totali[metrica] + quanto } })),
  allineaIncarichi: () => {
    const s = get();
    const giorno = chiaveGiorno();
    const settimana = chiaveSettimana();
    if (giorno === s.giorno && settimana === s.settimana) return;
    // il periodo finito si porta via le sue riscossioni: quelle dell'altro
    // periodo, se è ancora in corso, restano dove sono
    const tieni = (id: string) =>
      (id.startsWith('g:') && giorno === s.giorno) ||
      (id.startsWith('s:') && settimana === s.settimana);
    set({
      giorno,
      settimana,
      baseGiorno: giorno === s.giorno ? s.baseGiorno : { ...s.totali },
      baseSettimana: settimana === s.settimana ? s.baseSettimana : { ...s.totali },
      incarichiRiscossi: s.incarichiRiscossi.filter(tieni),
    });
  },
  riscuotiIncarico: (id) => {
    if (get().incarichiRiscossi.includes(id)) return false;
    set((s) => ({ incarichiRiscossi: [...s.incarichiRiscossi, id] }));
    return true;
  },
  setAvviso: (avviso) => set({ avviso }),
  setHint: (hint) => set({ hint }),
  setVia: (via) => set({ via }),
}));

export const DPR_PER_TIER: Record<QualitaTier, number> = {
  alta: 1.75,
  media: 1.4,
  bassa: 1.0,
};
