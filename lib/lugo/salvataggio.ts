'use client';

// Il salvataggio: i progressi vivono in localStorage e sopravvivono alla
// chiusura del browser. Si salva poco e a bassa frequenza (debounce), si
// carica una volta all'avvio, e ogni lettura/scrittura è protetta: se lo
// storage non c'è (navigazione privata, permessi) il gioco va avanti
// senza salvare, mai un crash.

import { useLugo } from './store';

const CHIAVE = 'lugo-salvataggio-v1';

export interface Salvataggio {
  denaro: number;
  punteggio: number;
  missioniFatte: string[];
  tintaAuto: number;
  audioOn: boolean;
}

export function caricaSalvataggio(): Partial<Salvataggio> | null {
  try {
    const grezzo = window.localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const dati = JSON.parse(grezzo) as Partial<Salvataggio>;
    if (typeof dati !== 'object' || dati === null) return null;
    return {
      denaro: typeof dati.denaro === 'number' && isFinite(dati.denaro) ? Math.max(0, dati.denaro) : undefined,
      punteggio: typeof dati.punteggio === 'number' && isFinite(dati.punteggio) ? Math.max(0, dati.punteggio) : undefined,
      missioniFatte: Array.isArray(dati.missioniFatte) ? dati.missioniFatte.filter((x) => typeof x === 'string').slice(0, 200) : undefined,
      tintaAuto: typeof dati.tintaAuto === 'number' ? dati.tintaAuto : undefined,
      audioOn: typeof dati.audioOn === 'boolean' ? dati.audioOn : undefined,
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
      ...(dati.audioOn !== undefined ? { audioOn: dati.audioOn } : {}),
    });
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  useLugo.subscribe((s, prima) => {
    if (
      s.denaro === prima.denaro &&
      s.punteggio === prima.punteggio &&
      s.missioniFatte === prima.missioniFatte &&
      s.tintaAuto === prima.tintaAuto &&
      s.audioOn === prima.audioOn
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
        audioOn: st.audioOn,
      });
    }, 600);
  });
}
