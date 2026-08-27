'use client';

// Stato del gioco (Zustand). Qui vive solo lo stato "lento" che interessa
// alla UI: fase, modalità, missioni, punteggio, qualità. Le grandezze che
// cambiano ogni frame (posizioni, velocità) restano fuori da React, in
// oggetti mutabili dentro il game loop; nello store arriva solo ciò che
// l'HUD deve mostrare, a bassa frequenza.

import { create } from 'zustand';

export type QualitaTier = 'alta' | 'media' | 'bassa';
export type Modalita = 'auto' | 'piedi';
export type FaseGioco = 'start' | 'gioco';
export type StatoMissione = 'idle' | 'attiva' | 'completata' | 'fallita';

interface LugoState {
  fase: FaseGioco;
  mode: Modalita;
  qualita: QualitaTier;
  /** Indice tinta auto scelta nello start screen. */
  tintaAuto: number;
  audioOn: boolean;

  // HUD (aggiornati a ~5 Hz dal loop, non ogni frame)
  kmh: number;
  punteggio: number;

  // missioni
  missioneId: string | null;
  statoMissione: StatoMissione;
  /** Indice della tappa corrente della missione attiva. */
  tappa: number;
  /** Secondi rimasti (se la missione ha un limite). */
  tempoResiduo: number | null;
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
  setMissione: (id: string | null, stato: StatoMissione, tappa?: number) => void;
  setTempoResiduo: (s: number | null) => void;
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
  missioneId: null,
  statoMissione: 'idle',
  tappa: 0,
  tempoResiduo: null,
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
  setMissione: (missioneId, statoMissione, tappa = 0) => set({ missioneId, statoMissione, tappa }),
  setTempoResiduo: (tempoResiduo) => set({ tempoResiduo }),
  setAvviso: (avviso) => set({ avviso }),
  setHint: (hint) => set({ hint }),
  setVia: (via) => set({ via }),
}));

export const DPR_PER_TIER: Record<QualitaTier, number> = {
  alta: 1.75,
  media: 1.4,
  bassa: 1.0,
};
