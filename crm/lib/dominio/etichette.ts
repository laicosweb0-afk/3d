import type { Interesse, MotivoPerso, Priorita, StatoOpportunita, TipoAzione, TipoEvento } from './tipi';

// Le parole che legge il titolare. In un posto solo, così l'elenco, la scheda
// e il CSV dicono la stessa cosa.

export const ETICHETTA_AZIONE: Record<TipoAzione, string> = {
  rispondere: 'Rispondere',
  telefonare: 'Telefonare',
  richiamare: 'Richiamare',
  inviare_preventivo: 'Inviare preventivo',
  inviare_campioni: 'Inviare campioni',
  fissare_appuntamento: 'Fissare appuntamento',
  confermare_misure: 'Confermare misure',
  follow_up: 'Fare follow-up',
  confermare_ordine: 'Confermare ordine',
  altro: 'Altro',
};

export const ETICHETTA_EVENTO: Record<TipoEvento, string> = {
  lead_ricevuto: 'Lead ricevuto',
  messaggio: 'Messaggio',
  telefonata: 'Telefonata',
  whatsapp: 'WhatsApp',
  messenger: 'Messenger',
  instagram: 'Instagram',
  email: 'Email',
  appuntamento: 'Appuntamento',
  visita_showroom: 'Visita in showroom',
  preventivo_inviato: 'Preventivo inviato',
  campione_consegnato: 'Campione consegnato',
  campione_reso: 'Campione reso',
  follow_up: 'Follow-up',
  ordine: 'Ordine',
  cambio_fase: 'Cambio fase',
  nota: 'Nota interna',
};

export const ETICHETTA_INTERESSE: Record<Interesse, string> = {
  pavimenti: 'Pavimenti',
  rivestimenti: 'Rivestimenti',
  bagno: 'Bagno',
  cucina: 'Cucina',
  outdoor: 'Outdoor',
  ristrutturazione: 'Ristrutturazione completa',
  altro: 'Altro',
};

export const ETICHETTA_PRIORITA: Record<Priorita, string> = {
  urgente: 'Urgente',
  da_fare: 'Da fare',
  normale: 'Normale',
};

export const ETICHETTA_STATO_OPPORTUNITA: Record<StatoOpportunita, string> = {
  aperta: 'Aperta',
  vinta: 'Vinta',
  persa: 'Persa',
};

export const ETICHETTA_MOTIVO: Record<MotivoPerso, string> = {
  prezzo: 'Prezzo',
  tempi: 'Tempi',
  silenzio: 'Sparito nel silenzio',
  comprato_altrove: 'Comprato altrove',
  lavoro_rimandato: 'Lavoro rimandato',
  altro: 'Altro',
};

// Euro come li scrive un preventivo italiano: 4.850 €.
export const euro = (v: number | null | undefined) =>
  v == null ? '—' : `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(v)} €`;
