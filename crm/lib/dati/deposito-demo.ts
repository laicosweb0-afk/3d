import type {
  ChiaviCampagna, Deposito, NuovaAzione, NuovaCampagna, NuovaCard, NuovaConversazione,
  NuovaOpportunita, NuovoContatto, NuovoEvento, PatchAzione, PatchCampagna, PatchCard,
  PatchContatto, PatchConversazione, PatchOpportunita, Profilo,
} from './deposito';
import { adesso, identificativo } from './deposito';
import type { Azione, Evento, Fase, Operatore, Opportunita } from '@/lib/dominio/tipi';
import type { Campagna, Canale, Conversazione, TipoIdentita } from '@/lib/dominio/campagne';
import { normalizzaIdentita } from '@/lib/dominio/campagne';
import type { CardNfc } from '@/lib/dominio/card';
import { normalizzaCodiceCard } from '@/lib/dominio/card';
import type { Impostazioni } from '@/lib/dominio/impostazioni';
import { conPredefinite } from '@/lib/dominio/impostazioni';
import type { Istantanea } from './istantanea';
import { ISTANTANEA_VUOTA, prossimoNumeroPreventivo } from './istantanea';
import { indicizzaRecapiti } from './identita';
import { semina } from './demo-semina';
import { nomeFase } from '@/lib/dominio/fasi';
import { propostaPerEvento, propostaPerFase, scadenzaFra } from '@/lib/dominio/automazioni';

// La data (senza ora) fra N giorni: le scadenze dei preventivi sono giorni,
// non istanti.
const fraGiorniData = (giorni: number) => {
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
};

// Il CRM che gira senza database. Serve per provarlo, per farlo vedere e per
// lavorare sull'interfaccia: le scritture sono vere, ma stanno in memoria e
// se ne vanno quando il processo si ferma.

type Magazzino = { dati: Istantanea };

// Attaccato a globalThis perché in sviluppo Next ricarica i moduli a ogni
// salvataggio: senza questo, ogni modifica azzererebbe il lavoro fatto.
const chiave = Symbol.for('rama.crm.demo');
function magazzino(): Magazzino {
  const g = globalThis as unknown as Record<symbol, Magazzino | undefined>;
  if (!g[chiave]) g[chiave] = { dati: semina() };
  return g[chiave]!;
}

const OPERATORI: Operatore[] = [
  { id: 'op-titolare', nome: 'Titolare' },
  { id: 'op-agenzia', nome: 'Agenzia' },
];

export class DepositoDemo implements Deposito {
  readonly modo = 'demo' as const;

  async istantanea(): Promise<Istantanea> {
    const { dati } = magazzino();
    // Copia superficiale: chi legge non deve poter modificare il magazzino
    // per sbaglio.
    return {
      contatti: [...dati.contatti],
      opportunita: [...dati.opportunita],
      azioni: [...dati.azioni],
      eventi: [...dati.eventi],
      campagne: [...dati.campagne],
      conversazioni: [...dati.conversazioni],
      identita: [...dati.identita],
      card: [...dati.card],
      impostazioni: dati.impostazioni,
    };
  }

  async operatori(): Promise<Operatore[]> {
    return OPERATORI;
  }

  async creaContatto(input: NuovoContatto, operatore: string | null = null): Promise<string> {
    const { dati } = magazzino();
    const id = identificativo();
    const ora = adesso();

    dati.contatti.push({
      id,
      nome: input.nome,
      cognome: input.cognome,
      telefono: input.telefono ?? null,
      email: input.email ?? null,
      citta: input.citta ?? null,
      provincia: input.provincia ?? null,
      fonte: input.fonte,
      fonteDettaglio: input.fonteDettaglio ?? null,
      campagnaId: input.campagnaId ?? null,
      fase: input.fase,
      assegnatoA: operatore,
      tag: input.tag ?? [],
      note: input.note ?? null,
      consensoMarketing: input.consensoMarketing ?? false,
      consensoIl: input.consensoMarketing ? ora : null,
      ultimoContattoIl: null,
      creatoIl: ora,
      aggiornatoIl: ora,
    });

    if (input.interesse || input.valoreStimato) {
      dati.opportunita.push({
        id: identificativo(),
        contattoId: id,
        titolo: input.interesse ? `Progetto ${input.interesse}` : 'Progetto da definire',
        interesse: input.interesse ?? 'altro',
        descrizione: null,
        valoreStimato: input.valoreStimato ?? null,
        valorePreventivo: null,
        probabilita: null,
        stato: 'aperta',
        numeroPreventivo: null,
        scadenzaPreventivo: null,
        statoPreventivo: 'nessuno',
        dataPreventivo: null,
        chiusuraPrevista: null,
        motivoPerso: null,
        creataIl: ora,
      });
    }

    if (!input.silenzioso) {
      dati.eventi.push({
        id: identificativo(), contattoId: id, tipo: 'lead_ricevuto',
        descrizione: `Contatto inserito${input.fonteDettaglio ? ` — ${input.fonteDettaglio}` : ''}`,
        quando: ora, valore: null, operatore, automatico: false,
      });
    }

    dati.azioni.push({
      id: identificativo(), contattoId: id,
      tipo: input.azione.tipo, descrizione: input.azione.descrizione,
      scadenza: input.azione.scadenza, haOra: false,
      priorita: input.azione.priorita ?? 'da_fare',
      fattaIl: null, operatore, creataIl: ora,
    });

    await indicizzaRecapiti(this, id, { telefono: input.telefono, email: input.email });
    return id;
  }

  async aggiornaContatto(id: string, patch: PatchContatto): Promise<void> {
    const { dati } = magazzino();
    const c = dati.contatti.find((x) => x.id === id);
    if (!c) return;
    Object.assign(c, patch, { aggiornatoIl: adesso() });
    await indicizzaRecapiti(this, id, { telefono: c.telefono, email: c.email });
  }

  async cambiaFase(id: string, fase: Fase, operatore: string | null = null): Promise<void> {
    const { dati } = magazzino();
    const c = dati.contatti.find((x) => x.id === id);
    if (!c || c.fase === fase) return;
    const precedente = c.fase;
    c.fase = fase;
    c.aggiornatoIl = adesso();

    dati.eventi.push({
      id: identificativo(), contattoId: id, tipo: 'cambio_fase',
      descrizione: `Da «${nomeFase(precedente)}» a «${nomeFase(fase)}»`,
      quando: adesso(), valore: null, operatore, automatico: true,
    });

    // Nessun contatto attivo resta senza prossima azione: se cambiando fase
    // non ne ha una aperta, il CRM la propone da sé.
    const aperta = dati.azioni.some((a) => a.contattoId === id && !a.fattaIl);
    const proposta = propostaPerFase(fase);
    if (!aperta && proposta) {
      dati.azioni.push({
        id: identificativo(), contattoId: id, tipo: proposta.tipo,
        descrizione: proposta.descrizione, scadenza: scadenzaFra(proposta.fraGiorni),
        haOra: false, priorita: proposta.priorita ?? 'da_fare',
        fattaIl: null, operatore, creataIl: adesso(),
      });
    }
  }

  async eliminaContatto(id: string): Promise<void> {
    const { dati } = magazzino();
    dati.contatti = dati.contatti.filter((c) => c.id !== id);
    dati.opportunita = dati.opportunita.filter((o) => o.contattoId !== id);
    dati.azioni = dati.azioni.filter((a) => a.contattoId !== id);
    dati.eventi = dati.eventi.filter((e) => e.contattoId !== id);
  }

  async creaAzione(input: NuovaAzione): Promise<void> {
    const { dati } = magazzino();
    const azione: Azione = {
      id: identificativo(), contattoId: input.contattoId, tipo: input.tipo,
      descrizione: input.descrizione, scadenza: input.scadenza,
      haOra: input.haOra ?? false, priorita: input.priorita ?? 'da_fare',
      fattaIl: null, operatore: input.operatore ?? null, creataIl: adesso(),
    };
    dati.azioni.push(azione);
  }

  async aggiornaAzione(id: string, patch: PatchAzione): Promise<void> {
    const { dati } = magazzino();
    const a = dati.azioni.find((x) => x.id === id);
    if (!a) return;
    Object.assign(a, patch);
  }

  async completaAzione(id: string, esito: string | null = null, operatore: string | null = null): Promise<void> {
    const { dati } = magazzino();
    const a = dati.azioni.find((x) => x.id === id);
    if (!a || a.fattaIl) return;
    a.fattaIl = adesso();

    // Fatta non vuol dire sparita: resta nella storia del contatto.
    dati.eventi.push({
      id: identificativo(), contattoId: a.contattoId, tipo: 'follow_up',
      descrizione: esito?.trim() ? esito.trim() : `Fatto: ${a.descrizione}`,
      quando: adesso(), valore: null, operatore, automatico: false,
    });

    const c = dati.contatti.find((x) => x.id === a.contattoId);
    if (c) { c.ultimoContattoIl = adesso(); c.aggiornatoIl = adesso(); }
  }

  async posticipaAzione(id: string, giorni: number): Promise<void> {
    const { dati } = magazzino();
    const a = dati.azioni.find((x) => x.id === id);
    if (!a) return;
    const d = new Date(a.scadenza);
    // Si posticipa da oggi, non da una scadenza già passata: rimandare una
    // cosa scaduta da dieci giorni «di due giorni» non deve lasciarla scaduta.
    const partenza = d.getTime() < Date.now() ? new Date() : d;
    partenza.setDate(partenza.getDate() + giorni);
    a.scadenza = partenza.toISOString();
  }

  async registraEvento(input: NuovoEvento): Promise<void> {
    const { dati } = magazzino();
    const quando = input.quando ?? adesso();
    const evento: Evento = {
      id: identificativo(), contattoId: input.contattoId, tipo: input.tipo,
      descrizione: input.descrizione, quando, valore: input.valore ?? null,
      operatore: input.operatore ?? null, automatico: input.automatico ?? false,
      conversazioneId: input.conversazioneId ?? null,
    };
    dati.eventi.push(evento);

    const c = dati.contatti.find((x) => x.id === input.contattoId);
    if (c && input.tipo !== 'nota') { c.ultimoContattoIl = quando; c.aggiornatoIl = adesso(); }

    // Regole: un preventivo chiede un follow-up, un campione chiede di
    // rientrare, un appuntamento chiede un preventivo.
    const proposta = propostaPerEvento(input.tipo);
    const aperta = dati.azioni.some((a) => a.contattoId === input.contattoId && !a.fattaIl);
    if (proposta && !aperta) {
      dati.azioni.push({
        id: identificativo(), contattoId: input.contattoId, tipo: proposta.tipo,
        descrizione: proposta.descrizione, scadenza: scadenzaFra(proposta.fraGiorni),
        haOra: false, priorita: proposta.priorita ?? 'da_fare',
        fattaIl: null, operatore: input.operatore ?? null, creataIl: adesso(),
      });
    }

    // Un preventivo inviato porta con sé l'importo dell'opportunità aperta.
    if (input.tipo === 'preventivo_inviato' && input.valore) {
      const o = dati.opportunita.find((x) => x.contattoId === input.contattoId && x.stato === 'aperta');
      if (o) {
        o.valorePreventivo = input.valore;
        o.dataPreventivo = quando;
        // Registrare «preventivo inviato» *è* mandare il preventivo: lo stato
        // e la scadenza si scrivono da sé, o la sezione Preventivi resterebbe
        // vuota mentre la storia dice il contrario.
        o.statoPreventivo = 'inviato';
        if (!o.numeroPreventivo) o.numeroPreventivo = prossimoNumeroPreventivo(dati);
        if (!o.scadenzaPreventivo) {
          o.scadenzaPreventivo = fraGiorniData(dati.impostazioni.preventivo.validitaGiorni);
        }
      }
    }
  }

  async creaOpportunita(input: NuovaOpportunita): Promise<void> {
    const { dati } = magazzino();
    const o: Opportunita = {
      id: identificativo(), contattoId: input.contattoId, titolo: input.titolo,
      interesse: input.interesse, descrizione: input.descrizione ?? null,
      valoreStimato: input.valoreStimato ?? null, valorePreventivo: input.valorePreventivo ?? null,
      probabilita: null, stato: 'aperta', dataPreventivo: null,
      chiusuraPrevista: input.chiusuraPrevista ?? null, motivoPerso: null, creataIl: adesso(),
      numeroPreventivo: null, scadenzaPreventivo: null,
      statoPreventivo: input.valorePreventivo ? 'bozza' : 'nessuno',
    };
    dati.opportunita.push(o);
  }

  // -------------------------------------------------------------------------
  // Campagne
  // -------------------------------------------------------------------------
  async creaCampagna(input: NuovaCampagna): Promise<string> {
    const { dati } = magazzino();
    const campagna: Campagna = {
      id: identificativo(),
      nome: input.nome,
      piattaforma: input.piattaforma,
      obiettivo: input.obiettivo ?? null,
      canaleIngresso: input.canaleIngresso,
      stato: input.stato ?? 'attiva',
      dataInizio: input.dataInizio ?? null,
      dataFine: input.dataFine ?? null,
      budget: input.budget ?? null,
      spesa: input.spesa ?? null,
      spesaAggiornataIl: input.spesa != null ? adesso() : null,
      idEsterno: input.idEsterno ?? null,
      adsetId: input.adsetId ?? null,
      adId: input.adId ?? null,
      parametroRef: input.parametroRef ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      landing: input.landing ?? null,
      note: input.note ?? null,
      creataIl: adesso(),
    };
    dati.campagne.push(campagna);
    return campagna.id;
  }

  async aggiornaCampagna(id: string, patch: PatchCampagna): Promise<void> {
    const { dati } = magazzino();
    const c = dati.campagne.find((x) => x.id === id);
    if (!c) return;
    Object.assign(c, patch);
    if (patch.spesa !== undefined) c.spesaAggiornataIl = adesso();
  }

  async trovaCampagna(chiavi: ChiaviCampagna): Promise<Campagna | null> {
    const { dati } = magazzino();
    // L'ordine conta: l'annuncio è più preciso della campagna, il ref è
    // quello che abbiamo scritto noi e vale come ultima spiaggia.
    return (
      (chiavi.adId && dati.campagne.find((c) => c.adId === chiavi.adId)) ||
      (chiavi.idEsterno && dati.campagne.find((c) => c.idEsterno === chiavi.idEsterno)) ||
      (chiavi.ref && dati.campagne.find((c) => c.parametroRef === chiavi.ref)) ||
      null
    );
  }

  // -------------------------------------------------------------------------
  // Identità e unione dei doppioni
  // -------------------------------------------------------------------------
  async trovaContattoPerIdentita(tipo: TipoIdentita, valore: string): Promise<string | null> {
    const { dati } = magazzino();
    const pulito = normalizzaIdentita(tipo, valore);
    return dati.identita.find((i) => i.tipo === tipo && i.valore === pulito)?.contattoId ?? null;
  }

  async collegaIdentita(contattoId: string, tipo: TipoIdentita, valore: string, verificata = true): Promise<void> {
    const { dati } = magazzino();
    const pulito = normalizzaIdentita(tipo, valore);
    if (dati.identita.some((i) => i.tipo === tipo && i.valore === pulito)) return;
    dati.identita.push({
      id: identificativo(), contattoId, tipo, valore: pulito, verificata, creataIl: adesso(),
    });
  }

  // Due schede della stessa persona: tutto passa sulla principale e la
  // seconda sparisce. La storia non si perde, si somma.
  async unisciContatti(principaleId: string, assorbitoId: string): Promise<void> {
    const { dati } = magazzino();
    if (principaleId === assorbitoId) return;
    const principale = dati.contatti.find((c) => c.id === principaleId);
    const assorbito = dati.contatti.find((c) => c.id === assorbitoId);
    if (!principale || !assorbito) return;

    for (const elenco of [dati.opportunita, dati.azioni, dati.eventi, dati.conversazioni, dati.identita]) {
      for (const riga of elenco as { contattoId: string }[]) {
        if (riga.contattoId === assorbitoId) riga.contattoId = principaleId;
      }
    }

    // Si tiene il dato che c'è: se la principale non aveva il telefono e
    // l'altra sì, adesso ce l'ha.
    principale.telefono = principale.telefono ?? assorbito.telefono;
    principale.email = principale.email ?? assorbito.email;
    principale.citta = principale.citta ?? assorbito.citta;
    principale.campagnaId = principale.campagnaId ?? assorbito.campagnaId;
    principale.consensoMarketing = principale.consensoMarketing || assorbito.consensoMarketing;
    principale.aggiornatoIl = adesso();

    dati.eventi.push({
      id: identificativo(), contattoId: principaleId, tipo: 'nota',
      descrizione: `Unita la scheda doppia di ${assorbito.nome} ${assorbito.cognome}`.trim(),
      quando: adesso(), valore: null, operatore: null, automatico: true, conversazioneId: null,
    });

    dati.contatti = dati.contatti.filter((c) => c.id !== assorbitoId);
  }

  // -------------------------------------------------------------------------
  // Conversazioni
  // -------------------------------------------------------------------------
  async trovaConversazione(canale: Canale, idEsterno: string): Promise<Conversazione | null> {
    const { dati } = magazzino();
    return dati.conversazioni.find((c) => c.canale === canale && c.idEsterno === idEsterno) ?? null;
  }

  async creaConversazione(input: NuovaConversazione): Promise<string> {
    const { dati } = magazzino();
    const ora = adesso();
    const conversazione: Conversazione = {
      id: identificativo(),
      contattoId: input.contattoId,
      campagnaId: input.campagnaId ?? null,
      canale: input.canale,
      idEsterno: input.idEsterno ?? null,
      stato: 'aperta',
      assegnataA: null,
      nonLetta: true,
      primoMessaggioIl: input.primoMessaggioIl ?? ora,
      ultimoMessaggioIl: input.ultimoMessaggioIl ?? ora,
      ultimoMessaggioTesto: input.ultimoMessaggioTesto ?? null,
      riferimento: input.riferimento ?? null,
    };
    dati.conversazioni.push(conversazione);
    return conversazione.id;
  }

  async aggiornaConversazione(id: string, patch: PatchConversazione): Promise<void> {
    const { dati } = magazzino();
    const c = dati.conversazioni.find((x) => x.id === id);
    if (!c) return;
    Object.assign(c, patch);
  }

  // -------------------------------------------------------------------------
  // Coda grezza dei webhook
  // -------------------------------------------------------------------------
  async salvaIngressoGrezzo(canale: string, payload: unknown): Promise<string> {
    // In modalità dimostrativa non c'è niente da conservare: la coda serve a
    // non perdere i payload veri quando un adattatore sbaglia la mappatura.
    console.info('[ingresso demo]', canale, JSON.stringify(payload).slice(0, 200));
    return identificativo();
  }

  async segnaIngressoLavorato(): Promise<void> {
    // Niente da fare: in demo la coda non esiste.
  }

  async aggiornaOpportunita(id: string, patch: PatchOpportunita, operatore: string | null = null): Promise<void> {
    const { dati } = magazzino();
    const o = dati.opportunita.find((x) => x.id === id);
    if (!o) return;
    const primaStato = o.stato;
    Object.assign(o, patch);

    if (patch.stato && patch.stato !== primaStato) {
      dati.eventi.push({
        id: identificativo(), contattoId: o.contattoId,
        tipo: patch.stato === 'vinta' ? 'ordine' : 'nota',
        descrizione: patch.stato === 'vinta'
          ? `Opportunità vinta: ${o.titolo}`
          : `Opportunità persa: ${o.titolo}${o.motivoPerso ? ` — ${o.motivoPerso}` : ''}`,
        quando: adesso(), valore: o.valorePreventivo ?? o.valoreStimato, operatore, automatico: true,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Chi sta usando il CRM
  // -------------------------------------------------------------------------
  // Senza database non c'è login, quindi non c'è nemmeno un utente: chi apre
  // la demo può fare tutto, altrimenti metà delle funzioni non sarebbe
  // provabile. Con Supabase collegato il ruolo è quello vero, e i controlli
  // nelle azioni sul server sono gli stessi in tutti e due i casi.
  async profilo(): Promise<Profilo | null> {
    return { id: 'demo', nome: 'Demo', ruolo: 'admin' };
  }

  async ingressiInSospeso() {
    return [];
  }

  // -------------------------------------------------------------------------
  // Impostazioni
  // -------------------------------------------------------------------------
  async salvaImpostazioni(impostazioni: Impostazioni): Promise<void> {
    const { dati } = magazzino();
    dati.impostazioni = conPredefinite(impostazioni);
  }

  // -------------------------------------------------------------------------
  // Card NFC
  // -------------------------------------------------------------------------
  async creaCard(input: NuovaCard): Promise<string> {
    const { dati } = magazzino();
    const codice = normalizzaCodiceCard(input.codice);
    if (!codice) throw new Error('codice card non valido');
    if (dati.card.some((c) => c.codice === codice)) throw new Error('codice card già usato');

    const card: CardNfc = {
      id: identificativo(),
      codice,
      nome: input.nome,
      luogo: input.luogo ?? null,
      campagnaId: input.campagnaId ?? null,
      destinazione: input.destinazione ?? null,
      attiva: input.attiva ?? true,
      tocchi: 0,
      ultimoToccoIl: null,
      note: input.note ?? null,
      demo: false,
      creataIl: adesso(),
    };
    dati.card.push(card);
    return card.id;
  }

  async aggiornaCard(id: string, patch: PatchCard): Promise<void> {
    const { dati } = magazzino();
    const c = dati.card.find((x) => x.id === id);
    if (!c) return;
    const { codice, ...resto } = patch;
    Object.assign(c, resto);
    if (codice !== undefined) {
      const pulito = normalizzaCodiceCard(codice);
      // Cambiare il codice di una card già in giro vuol dire che la card
      // fisica smette di funzionare: si lascia fare, ma non si permette di
      // rubare un codice a un'altra.
      if (pulito && !dati.card.some((x) => x.id !== id && x.codice === pulito)) c.codice = pulito;
    }
  }

  async eliminaCard(id: string): Promise<void> {
    const { dati } = magazzino();
    dati.card = dati.card.filter((c) => c.id !== id);
  }

  async trovaCardPerCodice(codice: string): Promise<CardNfc | null> {
    const { dati } = magazzino();
    return dati.card.find((c) => c.codice === normalizzaCodiceCard(codice)) ?? null;
  }

  async registraToccoCard(id: string): Promise<void> {
    const { dati } = magazzino();
    const c = dati.card.find((x) => x.id === id);
    if (!c || !c.attiva) return;
    c.tocchi += 1;
    c.ultimoToccoIl = adesso();
  }

  // -------------------------------------------------------------------------
  // Dati di esempio
  // -------------------------------------------------------------------------
  // Qui dentro è tutto di esempio per definizione: caricare vuol dire
  // ricominciare da capo, eliminare vuol dire restare con un CRM vuoto —
  // che è esattamente come si presenta il primo giorno di lavoro vero.
  async caricaDatiDemo(): Promise<void> {
    const m = magazzino();
    m.dati = semina();
  }

  async eliminaDatiDemo(): Promise<number> {
    const m = magazzino();
    const quante = m.dati.contatti.length + m.dati.campagne.length + m.dati.card.length;
    m.dati = { ...ISTANTANEA_VUOTA, impostazioni: m.dati.impostazioni };
    return quante;
  }

  async quantiDatiDemo(): Promise<number> {
    const { dati } = magazzino();
    return dati.contatti.length + dati.campagne.length + dati.card.length;
  }
}
