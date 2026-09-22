// Le impostazioni del CRM: i numeri che decidono quando una cosa diventa
// urgente e ogni quanto si richiama qualcuno.
//
// Prima erano costanti nel codice. Erano oneste ma sbagliate lo stesso: il
// titolare conosce il suo mestiere meglio di me, e «dopo quanti giorni si
// risente chi ha in mano un preventivo» è una domanda a cui deve poter
// rispondere lui, senza chiamare nessuno.
//
// Vivono nel database come una riga sola, entrano nell'istantanea insieme a
// tutto il resto e da lì le leggono le funzioni pure. Nessuna pagina legge
// una costante: così il numero che si vede in Impostazioni è **lo stesso**
// che fa diventare rossa una riga in Oggi.

export type Soglie = {
  ritardoUrgente: number;   // giorni di ritardo oltre i quali è urgente
  giorniDaFare: number;     // entro quanti giorni una cosa è «da fare»
  valoreAlto: number;       // euro sopra i quali si alza di un livello
  silenzioLungo: number;    // giorni senza sentirsi: si alza di un livello
  silenzioGrave: number;    // giorni senza sentirsi in trattativa: urgente
};

export type GiorniAutomazioni = {
  primoContatto: number;      // un lead nuovo si risponde oggi
  followUpPreventivo: number; // dopo un preventivo inviato
  rientroCampione: number;    // dopo un campione consegnato
  dopoAppuntamento: number;   // il giorno dopo l'incontro
};

export type DatiAzienda = {
  nome: string;
  telefono: string;
  email: string;
  citta: string;
};

export type Impostazioni = {
  soglie: Soglie;
  giorni: GiorniAutomazioni;
  preventivo: {
    validitaGiorni: number;   // quanto vale un preventivo prima di scadere
    prefissoNumero: string;   // come si numerano: PREV-2026-001
  };
  azienda: DatiAzienda;
};

export const IMPOSTAZIONI_PREDEFINITE: Impostazioni = {
  soglie: {
    ritardoUrgente: 0,
    giorniDaFare: 3,
    valoreAlto: 3000,
    silenzioLungo: 7,
    silenzioGrave: 14,
  },
  giorni: {
    primoContatto: 0,
    followUpPreventivo: 4,
    rientroCampione: 10,
    dopoAppuntamento: 1,
  },
  preventivo: {
    validitaGiorni: 30,
    prefissoNumero: 'PREV',
  },
  azienda: {
    nome: 'Rama Ceramiche',
    telefono: '',
    email: '',
    citta: 'Lugo (RA)',
  },
};

// Etichette e limiti dei numeri modificabili: stanno qui perché la pagina
// delle impostazioni e il controllo del salvataggio devono dire la stessa
// cosa. Un limite scritto in due posti è un limite che prima o poi diverge.
export type VoceNumerica = {
  gruppo: 'soglie' | 'giorni' | 'preventivo';
  chiave: string;
  etichetta: string;
  spiegazione: string;
  min: number;
  max: number;
  unita: 'giorni' | 'euro';
};

export const NUMERI_MODIFICABILI: VoceNumerica[] = [
  {
    gruppo: 'soglie', chiave: 'giorniDaFare', etichetta: 'Finestra «da fare»',
    spiegazione: 'Entro quanti giorni una cosa in scadenza si colora di giallo.',
    min: 1, max: 30, unita: 'giorni',
  },
  {
    gruppo: 'soglie', chiave: 'valoreAlto', etichetta: 'Valore alto',
    spiegazione: 'Sopra questa cifra un contatto senza prossima azione diventa urgente.',
    min: 0, max: 100000, unita: 'euro',
  },
  {
    gruppo: 'soglie', chiave: 'silenzioLungo', etichetta: 'Silenzio lungo',
    spiegazione: 'Giorni senza sentirsi dopo i quali il contatto si alza di un livello.',
    min: 1, max: 120, unita: 'giorni',
  },
  {
    gruppo: 'soglie', chiave: 'silenzioGrave', etichetta: 'Silenzio grave',
    spiegazione: 'Giorni senza sentirsi dopo i quali, se è in trattativa, diventa urgente.',
    min: 2, max: 180, unita: 'giorni',
  },
  {
    gruppo: 'giorni', chiave: 'followUpPreventivo', etichetta: 'Follow-up dopo un preventivo',
    spiegazione: 'Fra quanti giorni il CRM propone di risentire chi ha ricevuto un preventivo.',
    min: 1, max: 60, unita: 'giorni',
  },
  {
    gruppo: 'giorni', chiave: 'rientroCampione', etichetta: 'Rientro dei campioni',
    spiegazione: 'Fra quanti giorni chiedere indietro i campioni consegnati.',
    min: 1, max: 120, unita: 'giorni',
  },
  {
    gruppo: 'giorni', chiave: 'dopoAppuntamento', etichetta: 'Dopo un appuntamento',
    spiegazione: 'Fra quanti giorni preparare il preventivo dopo un incontro.',
    min: 0, max: 30, unita: 'giorni',
  },
  {
    gruppo: 'preventivo', chiave: 'validitaGiorni', etichetta: 'Validità di un preventivo',
    spiegazione: 'Dopo quanti giorni un preventivo inviato risulta scaduto.',
    min: 1, max: 365, unita: 'giorni',
  },
];

const numeroValido = (valore: unknown, voce: VoceNumerica, ripiego: number): number => {
  const n = typeof valore === 'number' ? valore : Number(valore);
  if (!Number.isFinite(n)) return ripiego;
  return Math.min(voce.max, Math.max(voce.min, Math.round(n)));
};

// Quello che arriva dal database può essere vecchio, incompleto o scritto a
// mano male. Si fonde con i valori predefiniti e si riporta dentro i limiti:
// il CRM non deve mai trovarsi con una soglia assurda e smettere di funzionare.
export function conPredefinite(grezzo: unknown): Impostazioni {
  const p = IMPOSTAZIONI_PREDEFINITE;
  if (!grezzo || typeof grezzo !== 'object') return p;
  const g = grezzo as Record<string, Record<string, unknown> | undefined>;

  const soglie = { ...p.soglie };
  const giorni = { ...p.giorni };
  const preventivo = { ...p.preventivo };

  for (const voce of NUMERI_MODIFICABILI) {
    const dentro = g[voce.gruppo]?.[voce.chiave];
    if (dentro === undefined) continue;
    if (voce.gruppo === 'soglie') {
      soglie[voce.chiave as keyof Soglie] = numeroValido(dentro, voce, p.soglie[voce.chiave as keyof Soglie]);
    } else if (voce.gruppo === 'giorni') {
      giorni[voce.chiave as keyof GiorniAutomazioni] =
        numeroValido(dentro, voce, p.giorni[voce.chiave as keyof GiorniAutomazioni]);
    } else {
      preventivo.validitaGiorni = numeroValido(dentro, voce, p.preventivo.validitaGiorni);
    }
  }

  const testo = (v: unknown, ripiego: string, max = 120) =>
    (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : ripiego);

  return {
    soglie,
    giorni,
    preventivo: {
      ...preventivo,
      prefissoNumero: testo(g.preventivo?.prefissoNumero, p.preventivo.prefissoNumero, 12)
        .toUpperCase().replace(/[^A-Z0-9-]/g, ''),
    },
    azienda: {
      nome: testo(g.azienda?.nome, p.azienda.nome),
      telefono: testo(g.azienda?.telefono, p.azienda.telefono, 40),
      email: testo(g.azienda?.email, p.azienda.email),
      citta: testo(g.azienda?.citta, p.azienda.citta),
    },
  };
}

// ---------------------------------------------------------------------------
// Chi può fare cosa
// ---------------------------------------------------------------------------
// Due ruoli, non dieci: chi lavora i contatti e chi tiene le chiavi di casa.
// Il controllo vero sta nelle azioni sul server — nascondere un bottone non
// è una protezione, è un suggerimento.

// I due ruoli esistono nel database dal primo giorno, con questi nomi:
// `titolare` e `collaboratore`. Si riusano invece di inventarne altri —
// «amministratore» e «operatore» sarebbero gli stessi due ruoli detti in
// informatichese, e due nomi per la stessa cosa sono il modo più sicuro di
// ritrovarsi con due elenchi che divergono.
//
// Qui dentro il titolare è l'amministratore: è casa sua.
export const RUOLI = ['titolare', 'collaboratore'] as const;
export type Ruolo = (typeof RUOLI)[number];

export const ETICHETTA_RUOLO: Record<Ruolo, string> = {
  titolare: 'Titolare',
  collaboratore: 'Collaboratore',
};

// Il ruolo che vale meno: è quello che si assume quando non si riesce a
// leggere il profilo. Sbagliando, si toglie un permesso — non se ne regala.
export const RUOLO_PRUDENTE: Ruolo = 'collaboratore';

// I permessi che non sono di tutti. Tutto quello che non è elencato qui lo
// può fare chiunque sia entrato: rispondere, spostare di fase, scrivere
// un'attività, fare un preventivo. È il lavoro, e il lavoro non si ingessa.
export const PERMESSI_TITOLARE = [
  'elimina_contatto',    // cancellare una persona e tutta la sua storia
  'unisci_contatti',     // fondere due schede: non si torna indietro
  'impostazioni',        // cambiare le soglie che valgono per tutti
  'gestisci_card',       // creare e spegnere le card NFC
  'dati_demo',           // caricare o cancellare i dati di esempio
] as const;
export type Permesso = (typeof PERMESSI_TITOLARE)[number];

export const puo = (ruolo: Ruolo, permesso: Permesso): boolean =>
  ruolo === 'titolare' || !(PERMESSI_TITOLARE as readonly string[]).includes(permesso);

export const SPIEGAZIONE_PERMESSO: Record<Permesso, string> = {
  elimina_contatto: 'Eliminare un contatto con tutta la sua storia',
  unisci_contatti: 'Unire due schede della stessa persona',
  impostazioni: 'Cambiare le soglie e i dati dell’azienda',
  gestisci_card: 'Creare e spegnere le card NFC',
  dati_demo: 'Caricare o cancellare i dati di esempio',
};
