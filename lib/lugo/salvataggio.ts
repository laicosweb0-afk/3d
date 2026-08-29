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
    });
    // il livello è la lettura della reputazione, non uno stato a sé: al
    // caricamento va ricalcolato, perché setState scavalca addPunti
    useLugo.setState({ livello: livelloDaRep(useLugo.getState().punteggio).n });
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
      s.volumi === prima.volumi
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
      });
    }, 600);
  });
}
