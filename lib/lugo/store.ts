'use client';

// Stato del gioco (Zustand). Qui vive solo lo stato "lento" che interessa
// alla UI: fase, modalità, missioni, denaro e reputazione, qualità. Le
// grandezze che cambiano ogni frame (posizioni, velocità) restano fuori da
// React, in oggetti mutabili dentro il game loop; nello store arriva solo
// ciò che l'HUD deve mostrare, a bassa frequenza.

import { create } from 'zustand';

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
  audioOn: boolean;

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
  toggleAudio: () => void;
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
  setAvviso: (msg: string | null) => void;
  setHint: (msg: string | null) => void;
  setVia: (nome: string | null) => void;
}

export const useLugo = create<LugoState>((set) => ({
  fase: 'start',
  mode: 'auto',
  qualita: 'alta',
  tintaAuto: 0,
  audioOn: true,
  kmh: 0,
  punteggio: 0,
  denaro: 0,
  wanted: 0,
  missioneId: null,
  statoMissione: 'idle',
  tappa: 0,
  tempoResiduo: null,
  missioniFatte: [],
  intro: null,
  esito: null,
  dialogo: null,
  avviso: null,
  hint: null,
  via: null,

  avvia: () => set({ fase: 'gioco' }),
  setMode: (mode) => set({ mode }),
  setQualita: (qualita) => set({ qualita }),
  setTintaAuto: (tintaAuto) => set({ tintaAuto }),
  toggleAudio: () => set((s) => ({ audioOn: !s.audioOn })),
  setKmh: (kmh) => set({ kmh }),
  addPunti: (v) => set((s) => ({ punteggio: s.punteggio + v })),
  addDenaro: (v) => set((s) => ({ denaro: Math.max(0, Math.round((s.denaro + v) * 100) / 100) })),
  setWanted: (wanted) => set({ wanted: Math.max(0, Math.min(3, wanted)) }),
  setMissione: (missioneId, statoMissione, tappa = 0) => set({ missioneId, statoMissione, tappa }),
  addMissioneFatta: (id) =>
    set((s) => (s.missioniFatte.includes(id) ? {} : { missioniFatte: [...s.missioniFatte, id] })),
  setTempoResiduo: (tempoResiduo) => set({ tempoResiduo }),
  setIntro: (intro) => set({ intro }),
  setEsito: (esito) => set({ esito }),
  setDialogo: (dialogo) => set({ dialogo }),
  setAvviso: (avviso) => set({ avviso }),
  setHint: (hint) => set({ hint }),
  setVia: (via) => set({ via }),
}));

export const DPR_PER_TIER: Record<QualitaTier, number> = {
  alta: 1.75,
  media: 1.4,
  bassa: 1.0,
};
