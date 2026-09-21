import type { Azione, Contatto, Evento, Opportunita } from '@/lib/dominio/tipi';
import type { Istantanea } from './istantanea';

// I dati di esempio. Non sono decorazione: coprono i dieci casi che il CRM
// deve saper gestire, così ogni funzione (attenzioni, priorità, follow-up,
// perdite) si può provare davvero invece che a parole.
//
// Le date sono sempre relative a oggi: il CRM demo non invecchia.

const OGGI = () => new Date();
const g = (giorniFa: number, ora = 10) => {
  const d = OGGI();
  d.setDate(d.getDate() - giorniFa);
  d.setHours(ora, 0, 0, 0);
  return d.toISOString();
};
const fra = (giorni: number, ora = 18) => g(-giorni, ora);

let n = 0;
const id = (p: string) => `${p}-${String(++n).padStart(3, '0')}`;

type CasoDemo = {
  contatto: Omit<Contatto, 'id' | 'aggiornatoIl'> & { id: string };
  opportunita?: Omit<Opportunita, 'id' | 'contattoId'>[];
  azioni?: Omit<Azione, 'id' | 'contattoId' | 'creataIl'>[];
  eventi?: Omit<Evento, 'id' | 'contattoId'>[];
};

const base = {
  assegnatoA: null,
  tag: [] as string[],
  note: null,
  consensoMarketing: true,
  provincia: 'RA',
};

const CASI: CasoDemo[] = [
  // 1 — nuovo lead Instagram, arrivato ieri sera, mai toccato
  {
    contatto: {
      id: 'c-giulia', nome: 'Giulia', cognome: 'Tassinari', telefono: null,
      email: 'giulia.tassinari@example.it', citta: 'Massa Lombarda', ...base,
      fonte: 'instagram', fonteDettaglio: 'DM dopo la storia del 19',
      fase: 'nuovo', consensoIl: g(1), ultimoContattoIl: null, creatoIl: g(1, 21),
    },
    azioni: [{
      tipo: 'rispondere', descrizione: 'Rispondere al DM: chiede il gres effetto cemento',
      scadenza: fra(0, 12), haOra: false, priorita: 'urgente', fattaIl: null, operatore: null,
    }],
    eventi: [{
      tipo: 'lead_ricevuto', descrizione: 'DM su Instagram: «Avete il gres che sembra cemento?»',
      quando: g(1, 21), valore: null, operatore: null, automatico: true,
    }],
  },

  // 2 — lead da Google, qualificato, appuntamento da fissare
  {
    contatto: {
      id: 'c-marco', nome: 'Marco', cognome: 'Baldini', telefono: '+39 333 214 5567',
      email: 'marco.baldini@example.it', citta: 'Fusignano', ...base,
      fonte: 'google', fonteDettaglio: 'ricerca «piastrelle Lugo» · cpc',
      fase: 'qualificato', consensoIl: g(6), ultimoContattoIl: g(5), creatoIl: g(6, 9),
      tag: ['ristrutturazione'],
    },
    opportunita: [{
      titolo: 'Ristrutturazione completa 140 mq', interesse: 'ristrutturazione',
      descrizione: 'Casa intera, vuole partire subito', valoreStimato: 12000,
      valorePreventivo: null, probabilita: 40, stato: 'aperta',
      dataPreventivo: null, chiusuraPrevista: fra(25), motivoPerso: null, creataIl: g(5),
    }],
    azioni: [{
      tipo: 'fissare_appuntamento', descrizione: 'Fissare la visita in showroom per sabato',
      scadenza: fra(1), haOra: false, priorita: 'da_fare', fattaIl: null, operatore: null,
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Form preventivo dal sito, arrivato da Google', quando: g(6, 9), valore: null, operatore: null, automatico: true },
      { tipo: 'telefonata', descrizione: 'Prima chiamata: 140 mq, vuole partire subito, budget 10-15k', quando: g(5, 15), valore: null, operatore: null, automatico: false },
    ],
  },

  // 3 — appuntamento fissato per domani
  {
    contatto: {
      id: 'c-elisa', nome: 'Elisa', cognome: 'Gardini', telefono: '+39 340 771 2290',
      email: 'elisa.gardini@example.it', citta: 'Bagnara di Romagna', ...base,
      fonte: 'facebook', fonteDettaglio: 'commento al post delle lastre',
      fase: 'appuntamento', consensoIl: g(9), ultimoContattoIl: g(2), creatoIl: g(9, 11),
    },
    opportunita: [{
      titolo: 'Bagno padronale + lavanderia', interesse: 'bagno',
      descrizione: 'Cerca un effetto pietra chiaro', valoreStimato: 4200,
      valorePreventivo: null, probabilita: 50, stato: 'aperta',
      dataPreventivo: null, chiusuraPrevista: fra(20), motivoPerso: null, creataIl: g(8),
    }],
    azioni: [{
      tipo: 'confermare_misure', descrizione: 'Appuntamento in showroom: portare i campioni di pietra chiara',
      scadenza: fra(1, 10), haOra: true, priorita: 'da_fare', fattaIl: null, operatore: null,
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Commento su Facebook, poi messaggio in privato', quando: g(9, 11), valore: null, operatore: null, automatico: true },
      { tipo: 'whatsapp', descrizione: 'Scambio di foto del bagno attuale', quando: g(7, 18), valore: null, operatore: null, automatico: false },
      { tipo: 'telefonata', descrizione: 'Appuntamento fissato per giovedì mattina', quando: g(2, 16), valore: null, operatore: null, automatico: false },
    ],
  },

  // 4 — preventivo inviato ieri, follow-up già in calendario
  {
    contatto: {
      id: 'c-davide', nome: 'Davide', cognome: 'Zoli', telefono: '+39 328 455 9012',
      email: 'davide.zoli@example.it', citta: 'Lugo', ...base,
      fonte: 'showroom', fonteDettaglio: 'entrato di sabato senza appuntamento',
      fase: 'preventivo', consensoIl: g(12), ultimoContattoIl: g(1), creatoIl: g(12, 10),
    },
    opportunita: [{
      titolo: 'Pavimento zona giorno 60 mq', interesse: 'pavimenti',
      descrizione: 'Gres effetto rovere, posa a correre', valoreStimato: 3600,
      valorePreventivo: 3480, probabilita: 60, stato: 'aperta',
      dataPreventivo: g(1), chiusuraPrevista: fra(14), motivoPerso: null, creataIl: g(10),
    }],
    azioni: [{
      tipo: 'follow_up', descrizione: 'Sentire se il preventivo convince',
      scadenza: fra(3), haOra: false, priorita: 'normale', fattaIl: null, operatore: null,
    }],
    eventi: [
      { tipo: 'visita_showroom', descrizione: 'Primo giro in showroom, ha visto i rovere', quando: g(12, 10), valore: null, operatore: null, automatico: false },
      { tipo: 'preventivo_inviato', descrizione: 'Preventivo 2026-121 via email', quando: g(1, 17), valore: 3480, operatore: null, automatico: false },
    ],
  },

  // 5 — preventivo senza risposta da otto giorni: il caso da non perdere
  {
    contatto: {
      id: 'c-silvia', nome: 'Silvia', cognome: 'Montanari', telefono: '+39 347 992 1144',
      email: 'silvia.montanari@example.it', citta: 'Lugo', ...base,
      fonte: 'instagram', fonteDettaglio: 'storia «bagno nuovo» · campagna settembre',
      fase: 'follow_up', consensoIl: g(20), ultimoContattoIl: g(8), creatoIl: g(20, 12),
      tag: ['bagno', 'seconda casa'],
    },
    opportunita: [{
      titolo: 'Bagno padronale + cucina', interesse: 'bagno',
      descrizione: 'Calacatta per il bagno, rovere in cucina', valoreStimato: 5200,
      valorePreventivo: 4850, probabilita: 55, stato: 'aperta',
      dataPreventivo: g(8), chiusuraPrevista: fra(6), motivoPerso: null, creataIl: g(15),
    }],
    azioni: [{
      tipo: 'richiamare', descrizione: 'Richiamare: preventivo di 4.850 € fermo da otto giorni',
      scadenza: g(1, 18), haOra: false, priorita: 'urgente', fattaIl: null, operatore: null,
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'DM da una storia Instagram', quando: g(20, 12), valore: null, operatore: null, automatico: true },
      { tipo: 'telefonata', descrizione: 'Prima chiamata: bagno da rifare entro l’inverno', quando: g(18, 11), valore: null, operatore: null, automatico: false },
      { tipo: 'visita_showroom', descrizione: 'Un’ora col titolare, due lastre messe da parte', quando: g(12, 16), valore: null, operatore: null, automatico: false },
      { tipo: 'preventivo_inviato', descrizione: 'Preventivo 2026-118, posa esclusa', quando: g(8, 9), valore: 4850, operatore: null, automatico: false },
    ],
  },

  // 6 — campione consegnato e mai più sentito
  {
    contatto: {
      id: 'c-nicola', nome: 'Nicola', cognome: 'Fabbri', telefono: '+39 335 668 2310',
      email: null, citta: 'Bagnacavallo', ...base,
      fonte: 'campagna', fonteDettaglio: 'Meta «Bagno chiavi in mano» → WhatsApp',
      fase: 'follow_up', consensoIl: g(24), ultimoContattoIl: g(11), creatoIl: g(24, 19),
    },
    opportunita: [{
      titolo: 'Bagno ospiti + lavanderia', interesse: 'bagno',
      descrizione: 'Nero lucido per il bagno degli ospiti', valoreStimato: 5200,
      valorePreventivo: 5200, probabilita: 45, stato: 'aperta',
      dataPreventivo: g(13), chiusuraPrevista: fra(10), motivoPerso: null, creataIl: g(20),
    }],
    azioni: [{
      tipo: 'richiamare', descrizione: 'Far rientrare i campioni di Nero Marquina e chiudere',
      scadenza: g(3, 18), haOra: false, priorita: 'urgente', fattaIl: null, operatore: null,
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Click sull’annuncio, chat WhatsApp aperta', quando: g(24, 19), valore: null, operatore: null, automatico: true },
      { tipo: 'whatsapp', descrizione: 'Cerca un nero lucido, cantiere già aperto', quando: g(23, 9), valore: null, operatore: null, automatico: false },
      { tipo: 'visita_showroom', descrizione: 'Venuto col posatore', quando: g(15, 10), valore: null, operatore: null, automatico: false },
      { tipo: 'preventivo_inviato', descrizione: 'Preventivo 2026-115', quando: g(13, 15), valore: 5200, operatore: null, automatico: false },
      { tipo: 'campione_consegnato', descrizione: 'Nero Marquina 60×120 e Fango 90×90, rientro previsto in dieci giorni', quando: g(11, 11), valore: null, operatore: null, automatico: false },
    ],
  },

  // 7 — ordine confermato, consegna in arrivo
  {
    contatto: {
      id: 'c-alberto', nome: 'Alberto', cognome: 'Venturi', telefono: '+39 339 118 7745',
      email: 'alberto.venturi@example.it', citta: 'Alfonsine', ...base,
      fonte: 'campagna', fonteDettaglio: 'Meta «grandi formati» · modulo istantaneo',
      fase: 'ordine', consensoIl: g(50), ultimoContattoIl: g(9), creatoIl: g(50, 8),
      tag: ['villa'],
    },
    opportunita: [{
      titolo: 'Villa: zona giorno e tre bagni', interesse: 'ristrutturazione',
      descrizione: 'Calacatta, gres cemento, rovere naturale', valoreStimato: 16000,
      valorePreventivo: 15600, probabilita: 95, stato: 'aperta',
      dataPreventivo: g(17), chiusuraPrevista: fra(5), motivoPerso: null, creataIl: g(40),
    }],
    azioni: [{
      tipo: 'confermare_ordine', descrizione: 'Confermare le misure col posatore prima della consegna',
      scadenza: fra(2), haOra: false, priorita: 'da_fare', fattaIl: null, operatore: null,
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Modulo istantaneo Meta, preso dal webhook', quando: g(50, 8), valore: null, operatore: null, automatico: true },
      { tipo: 'appuntamento', descrizione: 'Sopralluogo con il posatore', quando: g(45, 15), valore: null, operatore: null, automatico: false },
      { tipo: 'preventivo_inviato', descrizione: 'Preventivo 2026-104, posa inclusa', quando: g(17, 12), valore: 15600, operatore: null, automatico: false },
      { tipo: 'ordine', descrizione: 'Ordine accettato, acconto del 30% versato', quando: g(9, 11), valore: 15600, operatore: null, automatico: false },
    ],
  },

  // 8 — cliente: lavoro consegnato
  {
    contatto: {
      id: 'c-paola', nome: 'Paola', cognome: 'Randi', telefono: '+39 333 909 4412',
      email: 'paola.randi@example.it', citta: 'Cotignola', ...base,
      fonte: 'passaparola', fonteDettaglio: 'mandata dal geometra Succi',
      fase: 'cliente', consensoIl: g(90), ultimoContattoIl: g(21), creatoIl: g(90, 10),
    },
    opportunita: [{
      titolo: 'Cucina e ingresso', interesse: 'cucina',
      descrizione: 'Gres effetto marmo, consegnato e posato', valoreStimato: 6400,
      valorePreventivo: 6250, probabilita: 100, stato: 'vinta',
      dataPreventivo: g(70), chiusuraPrevista: g(25), motivoPerso: null, creataIl: g(85),
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Passaparola del geometra', quando: g(90, 10), valore: null, operatore: null, automatico: true },
      { tipo: 'preventivo_inviato', descrizione: 'Preventivo 2026-071', quando: g(70, 10), valore: 6250, operatore: null, automatico: false },
      { tipo: 'ordine', descrizione: 'Ordine confermato', quando: g(60, 10), valore: 6250, operatore: null, automatico: false },
      { tipo: 'nota', descrizione: 'Consegnato e posato. Contenta del risultato, ha chiesto il biglietto per un’amica.', quando: g(21, 17), valore: null, operatore: null, automatico: false },
    ],
  },

  // 9 — opportunità persa, con il motivo scritto
  {
    contatto: {
      id: 'c-luca', nome: 'Luca', cognome: 'Bertozzi', telefono: '+39 347 220 8890',
      email: 'luca.bertozzi@example.it', citta: 'Lugo', ...base,
      fonte: 'sito', fonteDettaglio: 'form preventivo',
      fase: 'perso', consensoIl: g(45), ultimoContattoIl: g(16), creatoIl: g(45, 14),
    },
    opportunita: [{
      titolo: 'Terrazzo 40 mq', interesse: 'outdoor',
      descrizione: 'Gres 20 mm per esterno', valoreStimato: 2800,
      valorePreventivo: 2750, probabilita: 0, stato: 'persa',
      dataPreventivo: g(30), chiusuraPrevista: g(16), motivoPerso: 'prezzo', creataIl: g(40),
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Form preventivo dal sito', quando: g(45, 14), valore: null, operatore: null, automatico: true },
      { tipo: 'preventivo_inviato', descrizione: 'Preventivo 2026-092', quando: g(30, 11), valore: 2750, operatore: null, automatico: false },
      { tipo: 'telefonata', descrizione: 'Ha trovato lo stesso prodotto a meno da un rivenditore online', quando: g(16, 16), valore: null, operatore: null, automatico: false },
    ],
  },

  // 10 — contatto attivo SENZA prossima azione: il buco che il CRM deve gridare
  {
    contatto: {
      id: 'c-samuele', nome: 'Samuele', cognome: 'Placci', telefono: '+39 320 556 7781',
      email: null, citta: 'Sant’Agata sul Santerno', ...base,
      fonte: 'whatsapp', fonteDettaglio: 'numero preso dal cartello in vetrina',
      fase: 'contattato', consensoIl: null, consensoMarketing: false,
      ultimoContattoIl: g(17), creatoIl: g(19, 9),
    },
    opportunita: [{
      titolo: 'Rivestimento cucina', interesse: 'rivestimenti',
      descrizione: 'Cerca un diamantato bianco', valoreStimato: 1400,
      valorePreventivo: null, probabilita: 25, stato: 'aperta',
      dataPreventivo: null, chiusuraPrevista: null, motivoPerso: null, creataIl: g(18),
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Messaggio WhatsApp dal numero in vetrina', quando: g(19, 9), valore: null, operatore: null, automatico: true },
      { tipo: 'whatsapp', descrizione: 'Chiede se abbiamo il diamantato bianco 7,5×15', quando: g(17, 12), valore: null, operatore: null, automatico: false },
    ],
  },

  // 11 — card NFC: il credito del Club Rama, da riscattare
  {
    contatto: {
      id: 'c-elena', nome: 'Elena', cognome: 'Ricci', telefono: null,
      email: 'elena.ricci@example.it', citta: 'Cotignola', ...base,
      fonte: 'card_nfc', fonteDettaglio: 'quiz: salotto · minimal · ritiro in negozio',
      fase: 'da_contattare', consensoIl: g(7), ultimoContattoIl: g(7), creatoIl: g(7, 16),
      tag: ['credito 70 €'],
    },
    opportunita: [{
      titolo: 'Pavimento salotto', interesse: 'pavimenti',
      descrizione: 'Grandi formati, aspetta il preventivo dell’imbianchino', valoreStimato: 3100,
      valorePreventivo: null, probabilita: 30, stato: 'aperta',
      dataPreventivo: null, chiusuraPrevista: fra(40), motivoPerso: null, creataIl: g(7),
    }],
    azioni: [{
      tipo: 'telefonare', descrizione: 'Prima chiamata: ha il credito RAMA70-7K3M da usare',
      scadenza: fra(2), haOra: false, priorita: 'normale', fattaIl: null, operatore: null,
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Tocco sulla card NFC in negozio, credito di 70 € attivato', quando: g(7, 16), valore: null, operatore: null, automatico: true },
    ],
  },

  // 12 — appuntamento passato senza nulla dopo
  {
    contatto: {
      id: 'c-franco', nome: 'Franco', cognome: 'Melandri', telefono: '+39 338 447 1120',
      email: 'franco.melandri@example.it', citta: 'Fusignano', ...base,
      fonte: 'sito', fonteDettaglio: 'form preventivo · utm bio Instagram',
      fase: 'appuntamento', consensoIl: g(30), ultimoContattoIl: g(10), creatoIl: g(30, 10),
    },
    opportunita: [{
      titolo: 'Taverna e scale', interesse: 'pavimenti',
      descrizione: 'Ha portato le piantine, deve decidere il formato', valoreStimato: 5600,
      valorePreventivo: null, probabilita: 40, stato: 'aperta',
      dataPreventivo: null, chiusuraPrevista: fra(18), motivoPerso: null, creataIl: g(25),
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Form dal sito', quando: g(30, 10), valore: null, operatore: null, automatico: true },
      { tipo: 'appuntamento', descrizione: 'Venuto in showroom con le piantine', quando: g(10, 15), valore: null, operatore: null, automatico: false },
    ],
  },
];

export function semina(): Istantanea {
  n = 0;
  const contatti: Contatto[] = [];
  const opportunita: Opportunita[] = [];
  const azioni: Azione[] = [];
  const eventi: Evento[] = [];

  for (const caso of CASI) {
    const c: Contatto = { ...caso.contatto, aggiornatoIl: caso.contatto.creatoIl };
    contatti.push(c);
    for (const o of caso.opportunita ?? []) opportunita.push({ ...o, id: id('opp'), contattoId: c.id });
    for (const a of caso.azioni ?? []) azioni.push({ ...a, id: id('az'), contattoId: c.id, creataIl: c.creatoIl });
    for (const e of caso.eventi ?? []) eventi.push({ ...e, id: id('ev'), contattoId: c.id });
  }

  return { contatti, opportunita, azioni, eventi };
}
