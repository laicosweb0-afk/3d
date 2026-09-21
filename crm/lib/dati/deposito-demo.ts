import type {
  Deposito, NuovaAzione, NuovaOpportunita, NuovoContatto, NuovoEvento,
  PatchAzione, PatchContatto, PatchOpportunita,
} from './deposito';
import { adesso, identificativo } from './deposito';
import type { Azione, Evento, Fase, Operatore, Opportunita } from '@/lib/dominio/tipi';
import type { Istantanea } from './istantanea';
import { semina } from './demo-semina';
import { nomeFase } from '@/lib/dominio/fasi';
import { propostaPerEvento, propostaPerFase, scadenzaFra } from '@/lib/dominio/automazioni';

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
        dataPreventivo: null,
        chiusuraPrevista: null,
        motivoPerso: null,
        creataIl: ora,
      });
    }

    dati.eventi.push({
      id: identificativo(), contattoId: id, tipo: 'lead_ricevuto',
      descrizione: `Contatto inserito${input.fonteDettaglio ? ` — ${input.fonteDettaglio}` : ''}`,
      quando: ora, valore: null, operatore, automatico: false,
    });

    dati.azioni.push({
      id: identificativo(), contattoId: id,
      tipo: input.azione.tipo, descrizione: input.azione.descrizione,
      scadenza: input.azione.scadenza, haOra: false,
      priorita: input.azione.priorita ?? 'da_fare',
      fattaIl: null, operatore, creataIl: ora,
    });

    return id;
  }

  async aggiornaContatto(id: string, patch: PatchContatto): Promise<void> {
    const { dati } = magazzino();
    const c = dati.contatti.find((x) => x.id === id);
    if (!c) return;
    Object.assign(c, patch, { aggiornatoIl: adesso() });
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
      if (o) { o.valorePreventivo = input.valore; o.dataPreventivo = quando; }
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
    };
    dati.opportunita.push(o);
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
}
