// Il modello del CRM, in un posto solo. Qui non si parla di database né di
// interfaccia: solo di cosa sono un contatto, una fonte, una fase, una
// prossima azione, un'opportunità e un evento.

// ---------------------------------------------------------------------------
// FONTE — da dove è arrivata la persona. Non cambia mai: è la sua storia.
// ---------------------------------------------------------------------------
export const FONTI = [
  'instagram',
  'facebook',
  'google',
  'sito',
  'whatsapp',
  'showroom',
  'card_nfc',
  'campagna',
  'passaparola',
  'altro',
] as const;
export type Fonte = (typeof FONTI)[number];

// ---------------------------------------------------------------------------
// FASE — dove si trova nel percorso commerciale. Cambia in continuazione.
// SOURCE e STAGE non vanno mai confusi: la prima dice da dove arriva, la
// seconda a che punto è.
// ---------------------------------------------------------------------------
export const FASI = [
  'nuovo',
  'da_contattare',
  'contattato',
  'qualificato',
  'appuntamento',
  'preventivo',
  'follow_up',
  'ordine',
  'cliente',
  'perso',
] as const;
export type Fase = (typeof FASI)[number];

// ---------------------------------------------------------------------------
// INTERESSE — che lavoro ha in mente.
// ---------------------------------------------------------------------------
export const INTERESSI = [
  'pavimenti',
  'rivestimenti',
  'bagno',
  'cucina',
  'outdoor',
  'ristrutturazione',
  'altro',
] as const;
export type Interesse = (typeof INTERESSI)[number];

// ---------------------------------------------------------------------------
// AZIONE — cosa va fatto, quando, da chi. Il cuore operativo del CRM:
// nessun contatto attivo deve restare senza.
// ---------------------------------------------------------------------------
export const TIPI_AZIONE = [
  'rispondere',
  'telefonare',
  'richiamare',
  'inviare_preventivo',
  'inviare_campioni',
  'fissare_appuntamento',
  'confermare_misure',
  'follow_up',
  'confermare_ordine',
  'altro',
] as const;
export type TipoAzione = (typeof TIPI_AZIONE)[number];

export const PRIORITA = ['urgente', 'da_fare', 'normale'] as const;
export type Priorita = (typeof PRIORITA)[number];

export type Azione = {
  id: string;
  contattoId: string;
  tipo: TipoAzione;
  descrizione: string;
  scadenza: string;      // ISO. Se haOra è falso conta solo il giorno.
  haOra: boolean;
  priorita: Priorita;
  fattaIl: string | null;
  operatore: string | null;
  creataIl: string;
};

// ---------------------------------------------------------------------------
// EVENTO — cosa è successo. È la timeline: si scrive, non si cancella.
// ---------------------------------------------------------------------------
export const TIPI_EVENTO = [
  'lead_ricevuto',
  'messaggio',
  'telefonata',
  'whatsapp',
  'messenger',
  'instagram',
  'email',
  'appuntamento',
  'visita_showroom',
  'preventivo_inviato',
  'campione_consegnato',
  'campione_reso',
  'follow_up',
  'ordine',
  'cambio_fase',
  'nota',
] as const;
export type TipoEvento = (typeof TIPI_EVENTO)[number];

export type Evento = {
  id: string;
  contattoId: string;
  tipo: TipoEvento;
  descrizione: string;
  quando: string;           // ISO
  valore: number | null;    // euro, quando l'evento ne ha uno
  operatore: string | null;
  automatico: boolean;      // generato da una regola, non scritto a mano
  // Se è nato dentro una conversazione (Messenger, WhatsApp…), quale.
  conversazioneId?: string | null;
};

// ---------------------------------------------------------------------------
// OPPORTUNITÀ — il lavoro di cui si sta parlando, con il suo valore.
// Un contatto può averne più di una (il bagno adesso, la taverna fra un anno).
// ---------------------------------------------------------------------------
export const STATI_OPPORTUNITA = ['aperta', 'vinta', 'persa'] as const;
export type StatoOpportunita = (typeof STATI_OPPORTUNITA)[number];

export const MOTIVI_PERSO = [
  'prezzo',
  'tempi',
  'silenzio',
  'comprato_altrove',
  'lavoro_rimandato',
  'altro',
] as const;
export type MotivoPerso = (typeof MOTIVI_PERSO)[number];

export type Opportunita = {
  id: string;
  contattoId: string;
  titolo: string;
  interesse: Interesse;
  descrizione: string | null;
  valoreStimato: number | null;
  valorePreventivo: number | null;
  probabilita: number | null;      // 0-100, facoltativa
  stato: StatoOpportunita;
  dataPreventivo: string | null;
  chiusuraPrevista: string | null;
  motivoPerso: MotivoPerso | null;
  creataIl: string;
};

// ---------------------------------------------------------------------------
// CONTATTO — la persona.
// ---------------------------------------------------------------------------
export type Contatto = {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  email: string | null;
  citta: string | null;
  provincia: string | null;
  fonte: Fonte;
  fonteDettaglio: string | null;   // "campagna bagno-settembre", "storia del 3 set"
  // La campagna che l'ha portata, quando c'è. Resta null per chi entra in
  // negozio o arriva per passaparola: non si inventa un'attribuzione.
  campagnaId: string | null;
  fase: Fase;
  assegnatoA: string | null;
  tag: string[];
  note: string | null;
  consensoMarketing: boolean;
  consensoIl: string | null;
  ultimoContattoIl: string | null;
  creatoIl: string;
  aggiornatoIl: string;
};

// Il contatto con quello che serve per decidere: valore in gioco, prossima
// azione, quando è stato sentito l'ultima volta.
export type ContattoInElenco = Contatto & {
  nomeCompleto: string;
  valore: number;                 // somma delle opportunità aperte
  interesse: Interesse | null;
  prossimaAzione: Azione | null;
  giorniDiSilenzio: number;
  priorita: Priorita;
};

export type SchedaContatto = {
  contatto: Contatto;
  campagna: import('./campagne').Campagna | null;
  conversazioni: import('./campagne').Conversazione[];
  identita: import('./campagne').Identita[];
  opportunita: Opportunita[];
  azioni: Azione[];
  eventi: Evento[];
  valore: number;
  prossimaAzione: Azione | null;
  giorniDiSilenzio: number;
  priorita: Priorita;
};

export type Operatore = { id: string; nome: string };

export const nomeCompleto = (c: { nome: string; cognome: string }) =>
  `${c.nome} ${c.cognome}`.trim();
