import type { Fase, TipoAzione, TipoEvento } from './tipi';
import { fase as descriviFase } from './fasi';
import { IMPOSTAZIONI_PREDEFINITE, type GiorniAutomazioni } from './impostazioni';

// Le regole "quando succede X, da fare Y". Sono funzioni pure: decidono cosa
// proporre, non lo scrivono da nessuna parte. È il deposito ad applicarle
// quando salva. Il giorno che servirà un motore di automazioni vero (email,
// WhatsApp, code differite) si aggancerà qui, senza toccare le pagine.
//
// Nessuna di queste regole manda niente a nessuno: creano promemoria.

export type Proposta = {
  tipo: TipoAzione;
  descrizione: string;
  fraGiorni: number;
  priorita?: 'urgente' | 'da_fare' | 'normale';
};

// I giorni arrivano dalle impostazioni: sono numeri di mestiere, e il
// mestiere lo sa il titolare. Questi sono solo il punto di partenza.
export const GIORNI_PREDEFINITI: GiorniAutomazioni = IMPOSTAZIONI_PREDEFINITE.giorni;

// Cosa proporre quando un contatto entra in una fase.
export function propostaPerFase(nuova: Fase): Proposta | null {
  const suggerita = descriviFase(nuova).azioneSuggerita;
  if (!suggerita) return null;
  return {
    tipo: suggerita.tipo,
    descrizione: suggerita.descrizione,
    fraGiorni: suggerita.fraGiorni,
    priorita: suggerita.fraGiorni === 0 ? 'urgente' : undefined,
  };
}

// Cosa proporre quando viene registrato un evento.
export function propostaPerEvento(
  tipo: TipoEvento,
  giorni: GiorniAutomazioni = GIORNI_PREDEFINITI,
): Proposta | null {
  const GIORNI = giorni;
  switch (tipo) {
    case 'lead_ricevuto':
      return { tipo: 'rispondere', descrizione: 'Rispondere al nuovo contatto', fraGiorni: GIORNI.primoContatto, priorita: 'urgente' };
    case 'preventivo_inviato':
      return { tipo: 'follow_up', descrizione: 'Sentire se il preventivo convince', fraGiorni: GIORNI.followUpPreventivo };
    case 'campione_consegnato':
      return { tipo: 'richiamare', descrizione: 'Chiedere come sono andati i campioni e farli rientrare', fraGiorni: GIORNI.rientroCampione };
    case 'appuntamento':
    case 'visita_showroom':
      return { tipo: 'inviare_preventivo', descrizione: 'Preparare e mandare il preventivo', fraGiorni: GIORNI.dopoAppuntamento };
    case 'ordine':
      return { tipo: 'confermare_ordine', descrizione: 'Confermare misure e data di consegna', fraGiorni: 2 };
    default:
      return null;
  }
}

export function scadenzaFra(giorni: number): string {
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  // Le azioni senza ora vivono a fine giornata: così "oggi" resta oggi fino a sera.
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}
