import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Deposito, NuovaAzione, NuovaOpportunita, NuovoContatto, NuovoEvento,
  PatchAzione, PatchContatto, PatchOpportunita,
} from './deposito';
import { adesso } from './deposito';
import type { Azione, Contatto, Evento, Fase, Operatore, Opportunita } from '@/lib/dominio/tipi';
import type { Istantanea } from './istantanea';
import { nomeFase } from '@/lib/dominio/fasi';
import { propostaPerEvento, propostaPerFase, scadenzaFra } from '@/lib/dominio/automazioni';

// Lo stesso deposito, su Postgres. Le righe del database parlano snake_case,
// il resto del CRM parla il modello: la traduzione sta tutta qui dentro e da
// nessun'altra parte.

type Riga = Record<string, unknown>;

const s = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function versoContatto(r: Riga): Contatto {
  return {
    id: String(r.id),
    nome: String(r.nome ?? ''),
    cognome: String(r.cognome ?? ''),
    telefono: s(r.telefono),
    email: s(r.email),
    citta: s(r.citta),
    provincia: s(r.provincia),
    fonte: (r.fonte as Contatto['fonte']) ?? 'altro',
    fonteDettaglio: s(r.fonte_dettaglio),
    fase: (r.fase as Fase) ?? 'nuovo',
    assegnatoA: s(r.assegnato_a),
    tag: Array.isArray(r.tag) ? (r.tag as string[]) : [],
    note: s(r.note),
    consensoMarketing: Boolean(r.consenso_marketing),
    consensoIl: s(r.consenso_il),
    ultimoContattoIl: s(r.ultimo_contatto_il),
    creatoIl: String(r.creato_il),
    aggiornatoIl: String(r.aggiornato_il ?? r.creato_il),
  };
}

function versoAzione(r: Riga): Azione {
  return {
    id: String(r.id),
    contattoId: String(r.contatto_id),
    tipo: (r.tipo as Azione['tipo']) ?? 'altro',
    descrizione: String(r.descrizione ?? ''),
    scadenza: String(r.scadenza),
    haOra: Boolean(r.ha_ora),
    priorita: (r.priorita as Azione['priorita']) ?? 'da_fare',
    fattaIl: s(r.fatta_il),
    operatore: s(r.assegnato_a),
    creataIl: String(r.creato_il),
  };
}

function versoEvento(r: Riga): Evento {
  return {
    id: String(r.id),
    contattoId: String(r.contatto_id),
    tipo: (r.tipo as Evento['tipo']) ?? 'nota',
    descrizione: String(r.descrizione ?? ''),
    quando: String(r.quando),
    valore: num(r.valore),
    operatore: s(r.operatore),
    automatico: Boolean(r.automatico),
  };
}

function versoOpportunita(r: Riga): Opportunita {
  return {
    id: String(r.id),
    contattoId: String(r.contatto_id),
    titolo: String(r.titolo ?? ''),
    interesse: (r.interesse as Opportunita['interesse']) ?? 'altro',
    descrizione: s(r.descrizione),
    valoreStimato: num(r.valore_stimato),
    valorePreventivo: num(r.valore_preventivo),
    probabilita: num(r.probabilita),
    stato: (r.stato as Opportunita['stato']) ?? 'aperta',
    dataPreventivo: s(r.data_preventivo),
    chiusuraPrevista: s(r.chiusura_prevista),
    motivoPerso: (r.motivo_perso as Opportunita['motivoPerso']) ?? null,
    creataIl: String(r.creata_il),
  };
}

export class DepositoSupabase implements Deposito {
  readonly modo = 'supabase' as const;

  constructor(private readonly db: SupabaseClient) {}

  // Il CRM di un negozio sta in poche centinaia di righe: si legge tutto e si
  // fanno i conti in un posto solo, gli stessi della versione demo. Se un
  // giorno i contatti diventassero decine di migliaia, è qui che si spezza in
  // query mirate — le pagine non se ne accorgerebbero.
  async istantanea(): Promise<Istantanea> {
    const [contatti, opportunita, azioni, eventi] = await Promise.all([
      this.db.from('contatti').select('*').order('creato_il', { ascending: false }).limit(2000),
      this.db.from('opportunita').select('*').limit(4000),
      this.db.from('azioni').select('*').limit(4000),
      this.db.from('eventi').select('*').order('quando', { ascending: false }).limit(8000),
    ]);
    return {
      contatti: (contatti.data ?? []).map(versoContatto),
      opportunita: (opportunita.data ?? []).map(versoOpportunita),
      azioni: (azioni.data ?? []).map(versoAzione),
      eventi: (eventi.data ?? []).map(versoEvento),
    };
  }

  async operatori(): Promise<Operatore[]> {
    const { data } = await this.db.from('profili').select('id, nome').eq('attivo', true).order('nome');
    return (data ?? []).map((r) => ({ id: String(r.id), nome: String(r.nome || 'senza nome') }));
  }

  async creaContatto(input: NuovoContatto, operatore: string | null = null): Promise<string> {
    const ora = adesso();
    const { data, error } = await this.db.from('contatti').insert({
      nome: input.nome,
      cognome: input.cognome,
      telefono: input.telefono ?? null,
      email: input.email ?? null,
      citta: input.citta ?? null,
      provincia: input.provincia ?? null,
      fonte: input.fonte,
      fonte_dettaglio: input.fonteDettaglio ?? null,
      fase: input.fase,
      assegnato_a: operatore,
      tag: input.tag ?? [],
      note: input.note ?? null,
      consenso_marketing: input.consensoMarketing ?? false,
      consenso_il: input.consensoMarketing ? ora : null,
    }).select('id').single();

    if (error || !data) throw new Error(error?.message ?? 'contatto non salvato');
    const id = String(data.id);

    if (input.interesse || input.valoreStimato) {
      await this.db.from('opportunita').insert({
        contatto_id: id,
        titolo: input.interesse ? `Progetto ${input.interesse}` : 'Progetto da definire',
        interesse: input.interesse ?? 'altro',
        valore_stimato: input.valoreStimato ?? null,
      });
    }

    await this.db.from('eventi').insert({
      contatto_id: id, tipo: 'lead_ricevuto',
      descrizione: `Contatto inserito${input.fonteDettaglio ? ` — ${input.fonteDettaglio}` : ''}`,
      operatore, automatico: false,
    });

    await this.db.from('azioni').insert({
      contatto_id: id, tipo: input.azione.tipo, descrizione: input.azione.descrizione,
      scadenza: input.azione.scadenza, priorita: input.azione.priorita ?? 'da_fare',
      assegnato_a: operatore,
    });

    return id;
  }

  async aggiornaContatto(id: string, patch: PatchContatto): Promise<void> {
    const riga: Riga = {};
    if (patch.nome !== undefined) riga.nome = patch.nome;
    if (patch.cognome !== undefined) riga.cognome = patch.cognome;
    if (patch.telefono !== undefined) riga.telefono = patch.telefono;
    if (patch.email !== undefined) riga.email = patch.email;
    if (patch.citta !== undefined) riga.citta = patch.citta;
    if (patch.provincia !== undefined) riga.provincia = patch.provincia;
    if (patch.fonte !== undefined) riga.fonte = patch.fonte;
    if (patch.fonteDettaglio !== undefined) riga.fonte_dettaglio = patch.fonteDettaglio;
    if (patch.assegnatoA !== undefined) riga.assegnato_a = patch.assegnatoA;
    if (patch.tag !== undefined) riga.tag = patch.tag;
    if (patch.note !== undefined) riga.note = patch.note;
    if (patch.consensoMarketing !== undefined) {
      riga.consenso_marketing = patch.consensoMarketing;
      if (patch.consensoMarketing) riga.consenso_il = adesso();
    }
    if (Object.keys(riga).length === 0) return;
    await this.db.from('contatti').update(riga).eq('id', id);
  }

  async cambiaFase(id: string, fase: Fase, operatore: string | null = null): Promise<void> {
    const { data } = await this.db.from('contatti').select('fase').eq('id', id).maybeSingle();
    const precedente = (data?.fase as Fase | undefined) ?? null;
    if (!precedente || precedente === fase) return;

    await this.db.from('contatti').update({ fase }).eq('id', id);
    await this.db.from('eventi').insert({
      contatto_id: id, tipo: 'cambio_fase',
      descrizione: `Da «${nomeFase(precedente)}» a «${nomeFase(fase)}»`,
      operatore, automatico: true,
    });

    const { count } = await this.db.from('azioni')
      .select('id', { count: 'exact', head: true })
      .eq('contatto_id', id).is('fatta_il', null);

    const proposta = propostaPerFase(fase);
    if (!count && proposta) {
      await this.db.from('azioni').insert({
        contatto_id: id, tipo: proposta.tipo, descrizione: proposta.descrizione,
        scadenza: scadenzaFra(proposta.fraGiorni), priorita: proposta.priorita ?? 'da_fare',
        assegnato_a: operatore,
      });
    }
  }

  async eliminaContatto(id: string): Promise<void> {
    // Opportunità, azioni ed eventi se ne vanno con lui: le chiavi esterne
    // sono in cascata.
    await this.db.from('contatti').delete().eq('id', id);
  }

  async creaAzione(input: NuovaAzione): Promise<void> {
    await this.db.from('azioni').insert({
      contatto_id: input.contattoId, tipo: input.tipo, descrizione: input.descrizione,
      scadenza: input.scadenza, ha_ora: input.haOra ?? false,
      priorita: input.priorita ?? 'da_fare', assegnato_a: input.operatore ?? null,
    });
  }

  async aggiornaAzione(id: string, patch: PatchAzione): Promise<void> {
    const riga: Riga = {};
    if (patch.tipo !== undefined) riga.tipo = patch.tipo;
    if (patch.descrizione !== undefined) riga.descrizione = patch.descrizione;
    if (patch.scadenza !== undefined) riga.scadenza = patch.scadenza;
    if (patch.haOra !== undefined) riga.ha_ora = patch.haOra;
    if (patch.priorita !== undefined) riga.priorita = patch.priorita;
    if (Object.keys(riga).length === 0) return;
    await this.db.from('azioni').update(riga).eq('id', id);
  }

  async completaAzione(id: string, esito: string | null = null, operatore: string | null = null): Promise<void> {
    const { data } = await this.db.from('azioni')
      .update({ fatta_il: adesso(), esito })
      .eq('id', id).is('fatta_il', null)
      .select('contatto_id, descrizione').maybeSingle();
    if (!data) return;

    await this.db.from('eventi').insert({
      contatto_id: data.contatto_id, tipo: 'follow_up',
      descrizione: esito?.trim() ? esito.trim() : `Fatto: ${data.descrizione}`,
      operatore, automatico: false,
    });
    await this.db.from('contatti').update({ ultimo_contatto_il: adesso() }).eq('id', data.contatto_id);
  }

  async posticipaAzione(id: string, giorni: number): Promise<void> {
    const { data } = await this.db.from('azioni').select('scadenza').eq('id', id).maybeSingle();
    if (!data) return;
    const attuale = new Date(String(data.scadenza));
    const partenza = attuale.getTime() < Date.now() ? new Date() : attuale;
    partenza.setDate(partenza.getDate() + giorni);
    await this.db.from('azioni').update({ scadenza: partenza.toISOString() }).eq('id', id);
  }

  async registraEvento(input: NuovoEvento): Promise<void> {
    const quando = input.quando ?? adesso();
    await this.db.from('eventi').insert({
      contatto_id: input.contattoId, tipo: input.tipo, descrizione: input.descrizione,
      quando, valore: input.valore ?? null, operatore: input.operatore ?? null,
      automatico: input.automatico ?? false,
    });

    if (input.tipo !== 'nota') {
      await this.db.from('contatti').update({ ultimo_contatto_il: quando }).eq('id', input.contattoId);
    }

    const { count } = await this.db.from('azioni')
      .select('id', { count: 'exact', head: true })
      .eq('contatto_id', input.contattoId).is('fatta_il', null);

    const proposta = propostaPerEvento(input.tipo);
    if (proposta && !count) {
      await this.db.from('azioni').insert({
        contatto_id: input.contattoId, tipo: proposta.tipo, descrizione: proposta.descrizione,
        scadenza: scadenzaFra(proposta.fraGiorni), priorita: proposta.priorita ?? 'da_fare',
        assegnato_a: input.operatore ?? null,
      });
    }

    if (input.tipo === 'preventivo_inviato' && input.valore) {
      const { data } = await this.db.from('opportunita')
        .select('id').eq('contatto_id', input.contattoId).eq('stato', 'aperta')
        .order('creata_il', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        await this.db.from('opportunita')
          .update({ valore_preventivo: input.valore, data_preventivo: quando })
          .eq('id', data.id);
      }
    }
  }

  async creaOpportunita(input: NuovaOpportunita): Promise<void> {
    await this.db.from('opportunita').insert({
      contatto_id: input.contattoId, titolo: input.titolo, interesse: input.interesse,
      descrizione: input.descrizione ?? null, valore_stimato: input.valoreStimato ?? null,
      valore_preventivo: input.valorePreventivo ?? null,
      chiusura_prevista: input.chiusuraPrevista ?? null,
    });
  }

  async aggiornaOpportunita(id: string, patch: PatchOpportunita, operatore: string | null = null): Promise<void> {
    const { data: prima } = await this.db.from('opportunita')
      .select('contatto_id, titolo, stato, valore_preventivo, valore_stimato').eq('id', id).maybeSingle();
    if (!prima) return;

    const riga: Riga = {};
    if (patch.titolo !== undefined) riga.titolo = patch.titolo;
    if (patch.interesse !== undefined) riga.interesse = patch.interesse;
    if (patch.descrizione !== undefined) riga.descrizione = patch.descrizione;
    if (patch.valoreStimato !== undefined) riga.valore_stimato = patch.valoreStimato;
    if (patch.valorePreventivo !== undefined) riga.valore_preventivo = patch.valorePreventivo;
    if (patch.probabilita !== undefined) riga.probabilita = patch.probabilita;
    if (patch.chiusuraPrevista !== undefined) riga.chiusura_prevista = patch.chiusuraPrevista;
    if (patch.dataPreventivo !== undefined) riga.data_preventivo = patch.dataPreventivo;
    if (patch.stato !== undefined) riga.stato = patch.stato;
    if (patch.motivoPerso !== undefined) riga.motivo_perso = patch.motivoPerso;
    if (Object.keys(riga).length) await this.db.from('opportunita').update(riga).eq('id', id);

    if (patch.stato && patch.stato !== prima.stato) {
      await this.db.from('eventi').insert({
        contatto_id: prima.contatto_id,
        tipo: patch.stato === 'vinta' ? 'ordine' : 'nota',
        descrizione: patch.stato === 'vinta'
          ? `Opportunità vinta: ${prima.titolo}`
          : `Opportunità persa: ${prima.titolo}${patch.motivoPerso ? ` — ${patch.motivoPerso}` : ''}`,
        valore: prima.valore_preventivo ?? prima.valore_stimato ?? null,
        operatore, automatico: true,
      });
    }
  }
}
