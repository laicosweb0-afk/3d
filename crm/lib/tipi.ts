// I tipi delle righe del database, scritti a mano: lo schema sta in
// supabase/migrazioni/0001_schema.sql ed è piccolo abbastanza da non meritare
// un generatore.

export type StatoContatto =
  | 'nuovo'
  | 'contattato'
  | 'in_showroom'
  | 'preventivo'
  | 'cliente'
  | 'perso';

export type Provenienza = 'card_nfc' | 'manuale' | 'sito';
export type TipoAttivita = 'chiamata' | 'email' | 'appuntamento' | 'altro';
export type Ruolo = 'titolare' | 'collaboratore';

export type Profilo = {
  id: string;
  nome: string;
  ruolo: Ruolo;
  attivo: boolean;
};

export type Contatto = {
  id: string;
  creato_il: string;
  aggiornato_il: string;
  nome: string;
  email: string | null;
  telefono: string | null;
  provenienza: Provenienza;
  stato: StatoContatto;
  assegnato_a: string | null;
  consenso_marketing: boolean;
  consenso_il: string | null;
  tag: string[];
  ultimo_contatto_il: string | null;
};

export type LeadCard = {
  id: string;
  creato_il: string;
  contatto_id: string;
  progetto: string;
  stile: string;
  consegna: string;
  codice: string;
  credito_eur: number;
  scadenza: string;
  riscattato_il: string | null;
  riscattato_da: string | null;
  email_inviata_il: string | null;
};

export type Nota = {
  id: string;
  creato_il: string;
  contatto_id: string;
  autore: string | null;
  testo: string;
};

export type Attivita = {
  id: string;
  creato_il: string;
  contatto_id: string | null;
  assegnato_a: string | null;
  titolo: string;
  tipo: TipoAttivita;
  scadenza: string;
  fatta_il: string | null;
};

// Etichette leggibili, in un posto solo: le usano l'elenco, la scheda e il CSV.
export const ETICHETTE_STATO: Record<StatoContatto, string> = {
  nuovo: 'Nuovo',
  contattato: 'Contattato',
  in_showroom: 'Venuto in showroom',
  preventivo: 'Preventivo fatto',
  cliente: 'Cliente',
  perso: 'Perso',
};

export const STATI: StatoContatto[] = [
  'nuovo',
  'contattato',
  'in_showroom',
  'preventivo',
  'cliente',
  'perso',
];

export const ETICHETTE_PROVENIENZA: Record<Provenienza, string> = {
  card_nfc: 'Card NFC',
  manuale: 'Inserito a mano',
  sito: 'Sito',
};

export const ETICHETTE_TIPO: Record<TipoAttivita, string> = {
  chiamata: 'Chiamata',
  email: 'Email',
  appuntamento: 'Appuntamento',
  altro: 'Altro',
};

export const TIPI_ATTIVITA: TipoAttivita[] = ['chiamata', 'email', 'appuntamento', 'altro'];
