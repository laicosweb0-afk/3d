import type {
  Azione, Contatto, Evento, Fase, Interesse, Fonte, MotivoPerso, Operatore,
  Opportunita, Priorita, StatoOpportunita, TipoAzione, TipoEvento,
} from '@/lib/dominio/tipi';
import type {
  Campagna, Canale, Conversazione, Piattaforma, StatoCampagna, StatoConversazione,
  TipoIdentita,
} from '@/lib/dominio/campagne';
import type { Istantanea } from './istantanea';

// L'unico punto in cui il CRM tocca i dati. Le pagine e le azioni non sanno
// se sotto c'è Postgres o un elenco in memoria: chiedono al deposito.
//
// Due attuazioni:
//   • Supabase  — quella vera, quando le chiavi sono configurate;
//   • demo      — dati di esempio in memoria, per far girare e provare tutto
//                 senza database. Le scritture funzionano davvero, ma vivono
//                 quanto il processo.

export type NuovoContatto = {
  nome: string;
  cognome: string;
  telefono?: string | null;
  email?: string | null;
  citta?: string | null;
  provincia?: string | null;
  fonte: Fonte;
  fonteDettaglio?: string | null;
  campagnaId?: string | null;
  fase: Fase;
  note?: string | null;
  consensoMarketing?: boolean;
  tag?: string[];
  // Un contatto nasce con un'opportunità e una prossima azione: è la regola
  // che tiene in piedi tutto il resto.
  interesse?: Interesse | null;
  valoreStimato?: number | null;
  azione: { tipo: TipoAzione; descrizione: string; scadenza: string; priorita?: Priorita };
  // Chi arriva da un canale porta con sé il suo messaggio, e quello merita
  // la riga nella storia — non un generico «contatto inserito». Chi crea il
  // contatto in quel caso scrive l'evento da sé e mette questa a `true`.
  silenzioso?: boolean;
};

export type PatchContatto = Partial<Pick<Contatto,
  'nome' | 'cognome' | 'telefono' | 'email' | 'citta' | 'provincia' |
  'fonte' | 'fonteDettaglio' | 'campagnaId' | 'assegnatoA' | 'tag' | 'note' | 'consensoMarketing'>>;

// ---------------------------------------------------------------------------
// Campagne, conversazioni, identità
// ---------------------------------------------------------------------------
export type NuovaCampagna = {
  nome: string;
  piattaforma: Piattaforma;
  canaleIngresso: Canale;
  obiettivo?: string | null;
  stato?: StatoCampagna;
  dataInizio?: string | null;
  dataFine?: string | null;
  budget?: number | null;
  spesa?: number | null;
  idEsterno?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  parametroRef?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  landing?: string | null;
  note?: string | null;
};

export type PatchCampagna = Partial<NuovaCampagna>;

export type NuovaConversazione = {
  contattoId: string;
  canale: Canale;
  campagnaId?: string | null;
  idEsterno?: string | null;
  primoMessaggioIl?: string;
  ultimoMessaggioIl?: string;
  ultimoMessaggioTesto?: string | null;
  riferimento?: Record<string, unknown> | null;
};

export type PatchConversazione = {
  stato?: StatoConversazione;
  nonLetta?: boolean;
  assegnataA?: string | null;
  campagnaId?: string | null;
  ultimoMessaggioIl?: string;
  ultimoMessaggioTesto?: string | null;
};

// Come si cerca la campagna a cui appartiene un messaggio in arrivo: per
// identificativo dell'annuncio, per campagna, o per il ref= che abbiamo messo
// noi nel link. Il primo che combacia vince.
export type ChiaviCampagna = {
  adId?: string | null;
  idEsterno?: string | null;
  ref?: string | null;
};

export type NuovaAzione = {
  contattoId: string;
  tipo: TipoAzione;
  descrizione: string;
  scadenza: string;
  haOra?: boolean;
  priorita?: Priorita;
  operatore?: string | null;
};

export type PatchAzione = Partial<Pick<Azione, 'tipo' | 'descrizione' | 'scadenza' | 'haOra' | 'priorita'>>;

export type NuovoEvento = {
  contattoId: string;
  tipo: TipoEvento;
  descrizione: string;
  quando?: string;
  valore?: number | null;
  operatore?: string | null;
  automatico?: boolean;
  conversazioneId?: string | null;
};

export type NuovaOpportunita = {
  contattoId: string;
  titolo: string;
  interesse: Interesse;
  descrizione?: string | null;
  valoreStimato?: number | null;
  valorePreventivo?: number | null;
  chiusuraPrevista?: string | null;
};

export type PatchOpportunita = Partial<Pick<Opportunita,
  'titolo' | 'interesse' | 'descrizione' | 'valoreStimato' | 'valorePreventivo' |
  'probabilita' | 'chiusuraPrevista' | 'dataPreventivo'>> & {
  stato?: StatoOpportunita;
  motivoPerso?: MotivoPerso | null;
};

export interface Deposito {
  readonly modo: 'demo' | 'supabase';
  istantanea(): Promise<Istantanea>;
  operatori(): Promise<Operatore[]>;

  creaContatto(input: NuovoContatto, operatore?: string | null): Promise<string>;
  aggiornaContatto(id: string, patch: PatchContatto): Promise<void>;
  cambiaFase(id: string, fase: Fase, operatore?: string | null): Promise<void>;
  eliminaContatto(id: string): Promise<void>;

  creaAzione(input: NuovaAzione): Promise<void>;
  aggiornaAzione(id: string, patch: PatchAzione): Promise<void>;
  completaAzione(id: string, esito?: string | null, operatore?: string | null): Promise<void>;
  posticipaAzione(id: string, giorni: number): Promise<void>;

  registraEvento(input: NuovoEvento): Promise<void>;

  creaOpportunita(input: NuovaOpportunita): Promise<void>;
  aggiornaOpportunita(id: string, patch: PatchOpportunita, operatore?: string | null): Promise<void>;

  // --- campagne -----------------------------------------------------------
  creaCampagna(input: NuovaCampagna): Promise<string>;
  aggiornaCampagna(id: string, patch: PatchCampagna): Promise<void>;
  trovaCampagna(chiavi: ChiaviCampagna): Promise<Campagna | null>;

  // --- identità: è questo che evita «Giulia 1» e «Giulia 2» ---------------
  trovaContattoPerIdentita(tipo: TipoIdentita, valore: string): Promise<string | null>;
  collegaIdentita(contattoId: string, tipo: TipoIdentita, valore: string, verificata?: boolean): Promise<void>;
  unisciContatti(principaleId: string, assorbitoId: string): Promise<void>;

  // --- conversazioni ------------------------------------------------------
  trovaConversazione(canale: Canale, idEsterno: string): Promise<Conversazione | null>;
  creaConversazione(input: NuovaConversazione): Promise<string>;
  aggiornaConversazione(id: string, patch: PatchConversazione): Promise<void>;

  // --- la coda grezza dei webhook ----------------------------------------
  salvaIngressoGrezzo(canale: string, payload: unknown): Promise<string>;
  segnaIngressoLavorato(id: string, esito: string, contattoId?: string | null, errore?: string | null): Promise<void>;
}

// Utili a tutte e due le attuazioni.
export const adesso = () => new Date().toISOString();
export const identificativo = () =>
  (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

export type { Azione, Contatto, Evento, Istantanea, Opportunita };
