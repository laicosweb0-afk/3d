import type { Fase, TipoAzione } from './tipi';

// Le fasi con il loro ordine, il nome che legge il titolare e — la parte che
// conta — cosa fa entrare un contatto dentro e cosa deve succedere dopo.
// Una fase senza trigger è solo un'etichetta.

export type DescrizioneFase = {
  id: Fase;
  nome: string;
  breve: string;           // per le colonne strette del kanban
  entra: string;           // quando ci si entra
  esce: string;            // cosa la chiude
  attiva: boolean;         // false = fuori dal percorso (cliente, perso)
  chiusa: boolean;         // niente prossima azione obbligatoria
  // Cosa propone il CRM come prossima azione appena si entra qui.
  azioneSuggerita: { tipo: TipoAzione; descrizione: string; fraGiorni: number } | null;
};

export const FASI_DESCRITTE: DescrizioneFase[] = [
  {
    id: 'nuovo', nome: 'Nuovo lead', breve: 'Nuovo',
    entra: 'È arrivato da una delle fonti e nessuno l’ha ancora guardato',
    esce: 'Qualcuno lo prende in carico',
    attiva: true, chiusa: false,
    azioneSuggerita: { tipo: 'rispondere', descrizione: 'Rispondere al nuovo contatto', fraGiorni: 0 },
  },
  {
    id: 'da_contattare', nome: 'Da contattare', breve: 'Da contattare',
    entra: 'Preso in carico, ma non ancora sentito',
    esce: 'Prima telefonata o primo messaggio',
    attiva: true, chiusa: false,
    azioneSuggerita: { tipo: 'telefonare', descrizione: 'Prima chiamata', fraGiorni: 1 },
  },
  {
    id: 'contattato', nome: 'Contattato', breve: 'Contattato',
    entra: 'Gli abbiamo parlato almeno una volta',
    esce: 'Sappiamo cosa gli serve e quando',
    attiva: true, chiusa: false,
    azioneSuggerita: { tipo: 'richiamare', descrizione: 'Capire progetto, metratura e tempi', fraGiorni: 2 },
  },
  {
    id: 'qualificato', nome: 'Qualificato', breve: 'Qualificato',
    entra: 'Sappiamo progetto, tempi e ordine di grandezza',
    esce: 'C’è un appuntamento fissato',
    attiva: true, chiusa: false,
    azioneSuggerita: { tipo: 'fissare_appuntamento', descrizione: 'Fissare la visita in showroom', fraGiorni: 2 },
  },
  {
    id: 'appuntamento', nome: 'Appuntamento', breve: 'Appuntam.',
    entra: 'Visita in showroom o sopralluogo in calendario',
    esce: 'L’incontro è avvenuto',
    attiva: true, chiusa: false,
    azioneSuggerita: { tipo: 'confermare_misure', descrizione: 'Confermare misure e preparare il preventivo', fraGiorni: 1 },
  },
  {
    id: 'preventivo', nome: 'Preventivo', breve: 'Preventivo',
    entra: 'Preventivo mandato, con un importo',
    esce: 'Risposta del cliente, in un senso o nell’altro',
    attiva: true, chiusa: false,
    azioneSuggerita: { tipo: 'follow_up', descrizione: 'Sentire se il preventivo è arrivato e convince', fraGiorni: 4 },
  },
  {
    id: 'follow_up', nome: 'Follow-up', breve: 'Follow-up',
    entra: 'Ci sta pensando: campioni presi, confronti in corso',
    esce: 'Decide, o si perde',
    attiva: true, chiusa: false,
    azioneSuggerita: { tipo: 'richiamare', descrizione: 'Richiamare per la decisione', fraGiorni: 5 },
  },
  {
    id: 'ordine', nome: 'Ordine', breve: 'Ordine',
    entra: 'Ha detto sì e ha firmato',
    esce: 'Merce consegnata',
    attiva: true, chiusa: false,
    azioneSuggerita: { tipo: 'confermare_ordine', descrizione: 'Confermare misure e data di consegna', fraGiorni: 2 },
  },
  {
    id: 'cliente', nome: 'Cliente', breve: 'Cliente',
    entra: 'Lavoro consegnato',
    esce: 'Non esce: resta cliente',
    attiva: false, chiusa: true,
    azioneSuggerita: null,
  },
  {
    id: 'perso', nome: 'Perso', breve: 'Perso',
    entra: 'Ha comprato altrove, ha rimandato, o è sparito',
    esce: 'Può rientrare: basta riaprirlo',
    attiva: false, chiusa: true,
    azioneSuggerita: null,
  },
];

const PER_ID = new Map(FASI_DESCRITTE.map((f) => [f.id, f]));

export const fase = (id: Fase): DescrizioneFase => PER_ID.get(id) ?? FASI_DESCRITTE[0];
export const nomeFase = (id: Fase) => fase(id).nome;
export const indiceFase = (id: Fase) => FASI_DESCRITTE.findIndex((f) => f.id === id);
export const FASI_ATTIVE = FASI_DESCRITTE.filter((f) => f.attiva).map((f) => f.id);
export const FASI_CHIUSE = FASI_DESCRITTE.filter((f) => !f.attiva).map((f) => f.id);

// Le fasi in cui un contatto è "in trattativa": è qui che si misura il valore
// della pipeline. Nuovo e da_contattare non contano ancora, cliente e perso
// non contano più.
export const FASI_IN_TRATTATIVA: Fase[] = [
  'contattato', 'qualificato', 'appuntamento', 'preventivo', 'follow_up', 'ordine',
];
