import type { Azione, Contatto, Evento, Opportunita } from '@/lib/dominio/tipi';
import type { Campagna, Conversazione, Identita } from '@/lib/dominio/campagne';
import type { CardNfc } from '@/lib/dominio/card';
import type { Istantanea } from './istantanea';
import { ISTANTANEA_VUOTA } from './istantanea';

// I dati di esempio. Non sono decorazione: coprono i dieci casi che il CRM
// deve saper gestire, così ogni funzione (attenzioni, priorità, follow-up,
// perdite) si può provare davvero invece che a parole.
//
// Le date sono sempre relative a oggi: il CRM demo non invecchia.

const OGGI = () => new Date();
// Le scadenze dei preventivi sono giorni, non istanti.
const soloGiorno = (iso: string) => iso.slice(0, 10);

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
  contatto: Omit<Contatto, 'id' | 'aggiornatoIl' | 'campagnaId'> & { id: string };
  // Quale campagna l'ha portata: è il collegamento che fa esistere la domanda
  // «questa campagna cosa ha prodotto?».
  campagna?: string;
  // Il preventivo (numero, scadenza, stato) è facoltativo nei casi di
  // esempio: chi non lo dichiara non ha un preventivo, ed è la maggioranza.
  opportunita?: (Omit<Opportunita, 'id' | 'contattoId' | 'numeroPreventivo' | 'scadenzaPreventivo' | 'statoPreventivo'>
    & Partial<Pick<Opportunita, 'numeroPreventivo' | 'scadenzaPreventivo' | 'statoPreventivo'>>)[];
  azioni?: Omit<Azione, 'id' | 'contattoId' | 'creataIl'>[];
  eventi?: Omit<Evento, 'id' | 'contattoId'>[];
  conversazioni?: (Omit<Conversazione, 'id' | 'contattoId' | 'campagnaId'> & { campagna?: string })[];
  identita?: Omit<Identita, 'id' | 'contattoId' | 'creataIl'>[];
};

const base = {
  assegnatoA: null,
  tag: [] as string[],
  note: null,
  consensoMarketing: true,
  provincia: 'RA',
};

// ---------------------------------------------------------------------------
// LE CAMPAGNE. La spesa di quella Google è `null` apposta: nel CRM si legge
// N/D, perché finché non colleghiamo le statistiche di Google quel numero non
// lo sappiamo — e un CRM che inventa un costo è peggio di uno che tace.
// ---------------------------------------------------------------------------
// Le card di esempio: due, per far vedere che la domanda «quale card
// funziona» ha una risposta solo se le card sono distinte.
const CARD_DEMO: Omit<CardNfc, 'id' | 'campagnaId' | 'demo' | 'creataIl'>[] = [
  {
    codice: 'bancone-01', nome: 'Bancone showroom', luogo: 'Cassa, piano terra',
    destinazione: null, attiva: true, tocchi: 34, ultimoToccoIl: g(1),
    note: 'La prima, quella sempre appoggiata in cassa.',
  },
  {
    codice: 'vetrina-02', nome: 'Vetrina bagni', luogo: 'Esposizione bagni',
    destinazione: null, attiva: true, tocchi: 9, ultimoToccoIl: g(6),
    note: 'Messa a settembre vicino ai lavabi.',
  },
];

const CAMPAGNE_DEMO: (Omit<Campagna, 'id' | 'creataIl'> & { chiave: string })[] = [
  {
    chiave: 'bagno-settembre',
    nome: 'Bagno completo — Settembre',
    piattaforma: 'meta', obiettivo: 'Messaggi', canaleIngresso: 'messenger', stato: 'attiva',
    dataInizio: g(30).slice(0, 10), dataFine: null,
    budget: 450, spesa: 312.40, spesaAggiornataIl: g(1),
    idEsterno: '120210000000123456', adsetId: '120210000000123457', adId: '120210000000123458',
    parametroRef: 'bagno-settembre',
    utmSource: 'facebook', utmMedium: 'cpc', utmCampaign: 'bagno-settembre',
    landing: null, note: 'Click-to-Messenger. Il ref= è impostato nell\u2019annuncio.',
  },
  {
    chiave: 'bagno-chiavi-in-mano',
    nome: 'Bagno chiavi in mano — WhatsApp',
    piattaforma: 'meta', obiettivo: 'Messaggi', canaleIngresso: 'whatsapp', stato: 'attiva',
    dataInizio: g(40).slice(0, 10), dataFine: null,
    budget: 300, spesa: 268.90, spesaAggiornataIl: g(1),
    idEsterno: '120210000000223456', adsetId: null, adId: '120210000000223458',
    parametroRef: 'bagno-chiavi', utmSource: 'facebook', utmMedium: 'cpc', utmCampaign: 'bagno-chiavi',
    landing: null, note: 'Click-to-WhatsApp: l\u2019attribuzione arriva col ctwa_clid.',
  },
  {
    chiave: 'grandi-formati',
    nome: 'Grandi formati — Estate',
    piattaforma: 'meta', obiettivo: 'Modulo istantaneo', canaleIngresso: 'messenger', stato: 'conclusa',
    dataInizio: g(75).slice(0, 10), dataFine: g(20).slice(0, 10),
    budget: 800, spesa: 742.15, spesaAggiornataIl: g(20),
    idEsterno: '120210000000323456', adsetId: null, adId: '120210000000323458',
    parametroRef: null, utmSource: 'facebook', utmMedium: 'cpc', utmCampaign: 'grandi-formati',
    landing: null, note: null,
  },
  {
    chiave: 'ristrutturazioni-google',
    nome: 'Ristrutturazioni — Google',
    piattaforma: 'google', obiettivo: 'Traffico al sito', canaleIngresso: 'sito', stato: 'attiva',
    dataInizio: g(25).slice(0, 10), dataFine: null,
    // Spesa sconosciuta: Google non è collegato. N/D, non zero.
    budget: null, spesa: null, spesaAggiornataIl: null,
    idEsterno: null, adsetId: null, adId: null, parametroRef: null,
    utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'ristrutturazioni',
    landing: 'https://ramastore.it/preventivo', note: 'Spesa da collegare con Google Ads.',
  },
];

const CASI: CasoDemo[] = [
  // 1 — nuovo lead Instagram, arrivato ieri sera, mai toccato
  {
    contatto: {
      id: 'c-giulia', nome: 'Giulia', cognome: 'Tassinari', telefono: null,
      email: 'giulia.tassinari@example.it', citta: 'Massa Lombarda', ...base,
      fonte: 'instagram', fonteDettaglio: 'DM dopo la storia del 19',
      fase: 'nuovo', consensoIl: g(1), ultimoContattoIl: null, creatoIl: g(1, 21),
    },
    campagna: 'bagno-settembre',
    azioni: [{
      tipo: 'rispondere', descrizione: 'Rispondere al DM: chiede il gres effetto cemento',
      scadenza: fra(0, 12), haOra: false, priorita: 'urgente', fattaIl: null, operatore: null,
    }],
    eventi: [
      { tipo: 'lead_ricevuto', descrizione: 'Instagram — campagna «Bagno completo — Settembre»: «Avete il gres che sembra cemento?»', quando: g(1, 21), valore: null, operatore: null, automatico: true },
      { tipo: 'whatsapp', descrizione: 'WhatsApp: «Sono quella di ieri su Instagram, passo sabato?»', quando: g(0, 9), valore: null, operatore: null, automatico: true },
    ],
    // Due canali, una persona sola: è il caso che il CRM deve saper tenere
    // insieme invece di fare «Giulia 1» e «Giulia 2».
    conversazioni: [
      {
        canale: 'instagram', idEsterno: 'igsid-demo-9931', stato: 'aperta', assegnataA: null,
        nonLetta: true, primoMessaggioIl: g(1, 21), ultimoMessaggioIl: g(1, 21),
        ultimoMessaggioTesto: 'Avete il gres che sembra cemento?',
        riferimento: { ad_id: '120210000000123458', ref: 'bagno-settembre', source: 'ADS' },
        campagna: 'bagno-settembre',
      },
      {
        canale: 'whatsapp', idEsterno: '+393401122334', stato: 'aperta', assegnataA: null,
        nonLetta: true, primoMessaggioIl: g(0, 9), ultimoMessaggioIl: g(0, 9),
        ultimoMessaggioTesto: 'Sono quella di ieri su Instagram, passo sabato?',
        riferimento: null, campagna: 'bagno-settembre',
      },
    ],
    identita: [
      { tipo: 'instagram_igsid', valore: 'igsid-demo-9931', verificata: true },
      { tipo: 'whatsapp_telefono', valore: '+393401122334', verificata: true },
    ],
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
    campagna: 'ristrutturazioni-google',
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
      numeroPreventivo: 'PREV-2026-121', scadenzaPreventivo: soloGiorno(fra(29)), statoPreventivo: 'inviato',
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
    campagna: 'bagno-settembre',
    conversazioni: [{
      canale: 'messenger', idEsterno: 'psid-demo-4412', stato: 'gestita', assegnataA: null,
      nonLetta: false, primoMessaggioIl: g(20, 12), ultimoMessaggioIl: g(12, 16),
      ultimoMessaggioTesto: 'Ci vediamo giovedì in showroom',
      riferimento: { ad_id: '120210000000123458', ref: 'bagno-settembre', source: 'ADS' },
      campagna: 'bagno-settembre',
    }],
    identita: [{ tipo: 'messenger_psid', valore: 'psid-demo-4412', verificata: true }],
    opportunita: [{
      titolo: 'Bagno padronale + cucina', interesse: 'bagno',
      descrizione: 'Calacatta per il bagno, rovere in cucina', valoreStimato: 5200,
      valorePreventivo: 4850, probabilita: 55, stato: 'aperta',
      dataPreventivo: g(8), chiusuraPrevista: fra(6), motivoPerso: null, creataIl: g(15),
      numeroPreventivo: 'PREV-2026-118', scadenzaPreventivo: soloGiorno(fra(22)), statoPreventivo: 'inviato',
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
    campagna: 'bagno-chiavi-in-mano',
    conversazioni: [{
      canale: 'whatsapp', idEsterno: '+393356682310', stato: 'gestita', assegnataA: null,
      nonLetta: false, primoMessaggioIl: g(24, 19), ultimoMessaggioIl: g(11, 11),
      ultimoMessaggioTesto: 'Mi porto a casa i campioni e vi dico',
      riferimento: { ctwa_clid: 'ctwa-demo-77123', source_type: 'ad', source_id: '120210000000223458' },
      campagna: 'bagno-chiavi-in-mano',
    }],
    identita: [{ tipo: 'whatsapp_telefono', valore: '+393356682310', verificata: true }],
    opportunita: [{
      titolo: 'Bagno ospiti + lavanderia', interesse: 'bagno',
      descrizione: 'Nero lucido per il bagno degli ospiti', valoreStimato: 5200,
      valorePreventivo: 5200, probabilita: 45, stato: 'aperta',
      dataPreventivo: g(13), chiusuraPrevista: fra(10), motivoPerso: null, creataIl: g(20),
      numeroPreventivo: 'PREV-2026-114', scadenzaPreventivo: soloGiorno(fra(17)), statoPreventivo: 'inviato',
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
    campagna: 'grandi-formati',
    opportunita: [{
      titolo: 'Villa: zona giorno e tre bagni', interesse: 'ristrutturazione',
      descrizione: 'Calacatta, gres cemento, rovere naturale', valoreStimato: 16000,
      valorePreventivo: 15600, probabilita: 95, stato: 'aperta',
      dataPreventivo: g(17), chiusuraPrevista: fra(5), motivoPerso: null, creataIl: g(40),
      numeroPreventivo: 'PREV-2026-109', scadenzaPreventivo: soloGiorno(g(2)), statoPreventivo: 'inviato',
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
      numeroPreventivo: 'PREV-2026-088', scadenzaPreventivo: soloGiorno(g(40)), statoPreventivo: 'accettato',
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
      numeroPreventivo: 'PREV-2026-095', scadenzaPreventivo: soloGiorno(g(1)), statoPreventivo: 'rifiutato',
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
  const campagne: Campagna[] = [];
  const conversazioni: Conversazione[] = [];
  const identita: Identita[] = [];

  // Prima le campagne: sono il punto di partenza, tutto il resto ci si appende.
  const perChiave = new Map<string, string>();
  for (const { chiave, ...resto } of CAMPAGNE_DEMO) {
    const campagna: Campagna = { ...resto, id: id('camp'), creataIl: resto.dataInizio ?? g(60) };
    campagne.push(campagna);
    perChiave.set(chiave, campagna.id);
  }

  for (const caso of CASI) {
    const campagnaId = caso.campagna ? perChiave.get(caso.campagna) ?? null : null;
    const c: Contatto = { ...caso.contatto, campagnaId, aggiornatoIl: caso.contatto.creatoIl };
    contatti.push(c);

    for (const o of caso.opportunita ?? []) {
      // Se c'è una data di preventivo ma nessuno stato dichiarato, quel
      // preventivo è stato mandato: è l'unica lettura sensata del dato.
      opportunita.push({
        numeroPreventivo: null,
        scadenzaPreventivo: null,
        statoPreventivo: o.dataPreventivo ? 'inviato' : 'nessuno',
        ...o,
        id: id('opp'),
        contattoId: c.id,
      });
    }
    for (const a of caso.azioni ?? []) azioni.push({ ...a, id: id('az'), contattoId: c.id, creataIl: c.creatoIl });

    // Le conversazioni prima degli eventi, così un evento può citarle.
    const suoiFili: Conversazione[] = [];
    for (const { campagna, ...resto } of caso.conversazioni ?? []) {
      const filo: Conversazione = {
        ...resto,
        id: id('conv'),
        contattoId: c.id,
        campagnaId: campagna ? perChiave.get(campagna) ?? null : campagnaId,
      };
      conversazioni.push(filo);
      suoiFili.push(filo);
    }

    for (const e of caso.eventi ?? []) {
      // Un evento nato da un messaggio si aggancia al filo di quel canale.
      const filo = suoiFili.find((f) =>
        (e.tipo === 'whatsapp' && f.canale === 'whatsapp')
        || (e.tipo === 'instagram' && f.canale === 'instagram')
        || (e.tipo === 'messenger' && f.canale === 'messenger'));
      eventi.push({ ...e, id: id('ev'), contattoId: c.id, conversazioneId: filo?.id ?? null });
    }

    // Le identità dichiarate, più quelle che si ricavano da email e telefono:
    // sono le chiavi con cui il CRM riconosce la stessa persona domani.
    const chiavi = [...(caso.identita ?? [])];
    if (c.email) chiavi.push({ tipo: 'email', valore: c.email.toLowerCase(), verificata: true });
    if (c.telefono) chiavi.push({ tipo: 'telefono', valore: c.telefono.replace(/[^\d+]/g, ''), verificata: true });
    for (const k of chiavi) {
      if (identita.some((i) => i.tipo === k.tipo && i.valore === k.valore)) continue;
      identita.push({ ...k, id: id('idn'), contattoId: c.id, creataIl: c.creatoIl });
    }
  }

  return {
    ...ISTANTANEA_VUOTA,
    contatti, opportunita, azioni, eventi, campagne, conversazioni, identita,
    card: CARD_DEMO.map((c, i) => ({
      ...c,
      id: `card-demo-${i + 1}`,
      campagnaId: null,
      demo: true,
      creataIl: g(90),
    })),
  };
}
