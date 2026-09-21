// Le campagne, le conversazioni e le identità: il pezzo che trasforma il CRM
// da «registro di contatti» a «sistema che segue quello che le campagne
// producono».
//
// Una regola sola guida tutto il file: **non si inventa un dato**. La spesa
// che non conosciamo resta `null` e a schermo diventa N/D; un'attribuzione
// che non c'è resta vuota, non diventa «altro».

// ---------------------------------------------------------------------------
// CAMPAGNA
// ---------------------------------------------------------------------------
export const PIATTAFORME = ['meta', 'google', 'tiktok', 'altro'] as const;
export type Piattaforma = (typeof PIATTAFORME)[number];

export const STATI_CAMPAGNA = ['bozza', 'attiva', 'in_pausa', 'conclusa'] as const;
export type StatoCampagna = (typeof STATI_CAMPAGNA)[number];

// Dove si svolge la conversazione. Non è la fonte del contatto: una persona
// arrivata da una campagna Meta può scrivere su WhatsApp.
export const CANALI = [
  'messenger', 'whatsapp', 'instagram', 'email', 'telefono', 'sito', 'altro',
] as const;
export type Canale = (typeof CANALI)[number];

export const STATI_CONVERSAZIONE = ['aperta', 'gestita', 'chiusa'] as const;
export type StatoConversazione = (typeof STATI_CONVERSAZIONE)[number];

export const TIPI_IDENTITA = [
  'messenger_psid', 'instagram_igsid', 'whatsapp_telefono',
  'email', 'telefono', 'esterna',
] as const;
export type TipoIdentita = (typeof TIPI_IDENTITA)[number];

export type Campagna = {
  id: string;
  nome: string;
  piattaforma: Piattaforma;
  obiettivo: string | null;
  canaleIngresso: Canale;
  stato: StatoCampagna;
  dataInizio: string | null;
  dataFine: string | null;
  budget: number | null;
  spesa: number | null;            // null = N/D, mai 0 per finta
  spesaAggiornataIl: string | null;
  idEsterno: string | null;
  adsetId: string | null;
  adId: string | null;
  parametroRef: string | null;     // il ref= degli annunci click-to-Messenger
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landing: string | null;
  note: string | null;
  creataIl: string;
};

export type Conversazione = {
  id: string;
  contattoId: string;
  campagnaId: string | null;
  canale: Canale;
  idEsterno: string | null;
  stato: StatoConversazione;
  assegnataA: string | null;
  nonLetta: boolean;
  primoMessaggioIl: string;
  ultimoMessaggioIl: string;
  ultimoMessaggioTesto: string | null;
  // Quello che il canale ci ha detto sull'annuncio: ad_id, ctwa_clid, ref…
  riferimento: Record<string, unknown> | null;
};

export type Identita = {
  id: string;
  contattoId: string;
  tipo: TipoIdentita;
  valore: string;
  verificata: boolean;
  creataIl: string;
};

// ---------------------------------------------------------------------------
// Etichette
// ---------------------------------------------------------------------------
export const ETICHETTA_PIATTAFORMA: Record<Piattaforma, string> = {
  meta: 'Meta (Facebook e Instagram)',
  google: 'Google',
  tiktok: 'TikTok',
  altro: 'Altro',
};

export const ETICHETTA_STATO_CAMPAGNA: Record<StatoCampagna, string> = {
  bozza: 'Bozza',
  attiva: 'Attiva',
  in_pausa: 'In pausa',
  conclusa: 'Conclusa',
};

export const ETICHETTA_CANALE: Record<Canale, string> = {
  messenger: 'Messenger',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  email: 'Email',
  telefono: 'Telefono',
  sito: 'Sito',
  altro: 'Altro',
};

export const ETICHETTA_STATO_CONVERSAZIONE: Record<StatoConversazione, string> = {
  aperta: 'Da rispondere',
  gestita: 'Gestita',
  chiusa: 'Chiusa',
};

export const ETICHETTA_IDENTITA: Record<TipoIdentita, string> = {
  messenger_psid: 'Messenger',
  instagram_igsid: 'Instagram',
  whatsapp_telefono: 'WhatsApp',
  email: 'Email',
  telefono: 'Telefono',
  esterna: 'Altro sistema',
};

// I canali hanno il colore della loro famiglia di fonte: Messenger e
// Instagram sono social, WhatsApp è diretto, e così via.
export const COLORE_CANALE: Record<Canale, string> = {
  messenger: '#7b7fd4',
  instagram: '#7b7fd4',
  whatsapp: '#00a39b',
  email: '#8f8b83',
  telefono: '#8f8b83',
  sito: '#00a39b',
  altro: '#8f8b83',
};

// ---------------------------------------------------------------------------
// Riconoscimento della persona
// ---------------------------------------------------------------------------

// Un numero si confronta solo se ridotto all'osso: +39 347 992-1144 e
// 3479921144 sono la stessa persona.
export function normalizzaTelefono(grezzo: string): string {
  const pulito = grezzo.replace(/[^\d+]/g, '');
  if (pulito.startsWith('+')) return pulito;
  if (pulito.startsWith('00')) return `+${pulito.slice(2)}`;
  // Numero italiano scritto senza prefisso internazionale.
  if (pulito.length >= 9 && pulito.length <= 11) return `+39${pulito}`;
  return pulito;
}

export function normalizzaIdentita(tipo: TipoIdentita, valore: string): string {
  const grezzo = valore.trim();
  switch (tipo) {
    case 'email': return grezzo.toLowerCase();
    case 'telefono':
    case 'whatsapp_telefono': return normalizzaTelefono(grezzo);
    default: return grezzo;
  }
}

// Il canale da cui arriva un'identità, per aprire la conversazione giusta.
export const CANALE_DI_IDENTITA: Record<TipoIdentita, Canale> = {
  messenger_psid: 'messenger',
  instagram_igsid: 'instagram',
  whatsapp_telefono: 'whatsapp',
  email: 'email',
  telefono: 'telefono',
  esterna: 'altro',
};

// Lo stesso numero si presenta come «telefono» se lo ha scritto in un modulo e
// come «utenza WhatsApp» se ha scritto in chat: è la stessa persona. Cercarla
// sotto un tipo solo è precisamente il modo in cui un cliente diventa due
// schede — quindi si cerca sotto tutte le forme equivalenti.
export function formeEquivalenti(
  tipo: TipoIdentita,
  valore: string,
): { tipo: TipoIdentita; valore: string }[] {
  const v = normalizzaIdentita(tipo, valore);
  if (tipo === 'telefono' || tipo === 'whatsapp_telefono') {
    return [{ tipo: 'telefono', valore: v }, { tipo: 'whatsapp_telefono', valore: v }];
  }
  return [{ tipo, valore: v }];
}

// Quali identità valgono fra un'azienda e l'altra. PSID e IGSID no: la stessa
// persona ha un identificativo diverso per ogni Pagina, quindi non si possono
// incrociare — l'unione di quei contatti resta una decisione umana.
export const IDENTITA_TRASVERSALI: TipoIdentita[] = ['email', 'telefono', 'whatsapp_telefono'];
