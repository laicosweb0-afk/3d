import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ChiaviCampagna, Deposito, NuovaAzione, NuovaCampagna, NuovaCard, NuovaConversazione,
  NuovaOpportunita, NuovoContatto, NuovoEvento, PatchAzione, PatchCampagna, PatchCard,
  PatchContatto, PatchConversazione, PatchOpportunita, Profilo,
} from './deposito';
import { adesso } from './deposito';
import type { Azione, Contatto, Evento, Fase, Operatore, Opportunita } from '@/lib/dominio/tipi';
import type { Campagna, Canale, Conversazione, Identita, TipoIdentita } from '@/lib/dominio/campagne';
import { normalizzaIdentita } from '@/lib/dominio/campagne';
import type { CardNfc } from '@/lib/dominio/card';
import { normalizzaCodiceCard } from '@/lib/dominio/card';
import type { Impostazioni } from '@/lib/dominio/impostazioni';
import { conPredefinite } from '@/lib/dominio/impostazioni';
import type { Istantanea } from './istantanea';
import { prossimoNumeroPreventivo } from './istantanea';
import { indicizzaRecapiti } from './identita';
import { semina } from './demo-semina';
import { nomeFase } from '@/lib/dominio/fasi';
import { propostaPerEvento, propostaPerFase, scadenzaFra } from '@/lib/dominio/automazioni';

// Lo stesso deposito, su Postgres. Le righe del database parlano snake_case,
// il resto del CRM parla il modello: la traduzione sta tutta qui dentro e da
// nessun'altra parte.

type Riga = Record<string, unknown>;

// La data (senza ora) fra N giorni: le scadenze dei preventivi sono giorni,
// non istanti.
const fraGiorniData = (giorni: number) => {
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  return d.toISOString().slice(0, 10);
};

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
    campagnaId: s(r.campagna_id),
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
    conversazioneId: s(r.conversazione_id),
  };
}

function versoCampagna(r: Riga): Campagna {
  return {
    id: String(r.id),
    nome: String(r.nome ?? ''),
    piattaforma: (r.piattaforma as Campagna['piattaforma']) ?? 'altro',
    obiettivo: s(r.obiettivo),
    canaleIngresso: (r.canale_ingresso as Canale) ?? 'altro',
    stato: (r.stato as Campagna['stato']) ?? 'attiva',
    dataInizio: s(r.data_inizio),
    dataFine: s(r.data_fine),
    budget: num(r.budget),
    spesa: num(r.spesa),
    spesaAggiornataIl: s(r.spesa_aggiornata_il),
    idEsterno: s(r.id_esterno),
    adsetId: s(r.adset_id),
    adId: s(r.ad_id),
    parametroRef: s(r.parametro_ref),
    utmSource: s(r.utm_source),
    utmMedium: s(r.utm_medium),
    utmCampaign: s(r.utm_campaign),
    landing: s(r.landing),
    note: s(r.note),
    creataIl: String(r.creata_il),
  };
}

function versoConversazione(r: Riga): Conversazione {
  return {
    id: String(r.id),
    contattoId: String(r.contatto_id),
    campagnaId: s(r.campagna_id),
    canale: (r.canale as Canale) ?? 'altro',
    idEsterno: s(r.id_esterno),
    stato: (r.stato as Conversazione['stato']) ?? 'aperta',
    assegnataA: s(r.assegnata_a),
    nonLetta: Boolean(r.non_letta),
    primoMessaggioIl: String(r.primo_messaggio_il),
    ultimoMessaggioIl: String(r.ultimo_messaggio_il),
    ultimoMessaggioTesto: s(r.ultimo_messaggio_testo),
    riferimento: (r.riferimento as Record<string, unknown> | null) ?? null,
  };
}

function versoIdentita(r: Riga): Identita {
  return {
    id: String(r.id),
    contattoId: String(r.contatto_id),
    tipo: (r.tipo as TipoIdentita) ?? 'esterna',
    valore: String(r.valore ?? ''),
    verificata: Boolean(r.verificata),
    creataIl: String(r.creata_il),
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
    numeroPreventivo: s(r.numero_preventivo),
    scadenzaPreventivo: s(r.scadenza_preventivo),
    statoPreventivo: (r.stato_preventivo as Opportunita['statoPreventivo']) ?? 'nessuno',
  };
}

function versoCard(r: Riga): CardNfc {
  return {
    id: String(r.id),
    codice: String(r.codice ?? ''),
    nome: String(r.nome ?? ''),
    luogo: s(r.luogo),
    campagnaId: s(r.campagna_id),
    destinazione: s(r.destinazione),
    attiva: r.attiva !== false,
    tocchi: Number(r.tocchi ?? 0),
    ultimoToccoIl: s(r.ultimo_tocco_il),
    note: s(r.note),
    demo: Boolean(r.demo),
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
    const [contatti, opportunita, azioni, eventi, campagne, conversazioni, identita, card, impostazioni] =
      await Promise.all([
        this.db.from('contatti').select('*').order('creato_il', { ascending: false }).limit(2000),
        this.db.from('opportunita').select('*').limit(4000),
        this.db.from('azioni').select('*').limit(4000),
        this.db.from('eventi').select('*').order('quando', { ascending: false }).limit(8000),
        this.db.from('campagne').select('*').order('creata_il', { ascending: false }).limit(500),
        this.db.from('conversazioni').select('*').order('ultimo_messaggio_il', { ascending: false }).limit(4000),
        this.db.from('identita').select('*').limit(8000),
        this.db.from('card_nfc').select('*').order('creata_il', { ascending: false }).limit(200),
        this.db.from('impostazioni').select('valore').eq('chiave', 'crm').maybeSingle(),
      ]);
    return {
      contatti: (contatti.data ?? []).map(versoContatto),
      opportunita: (opportunita.data ?? []).map(versoOpportunita),
      azioni: (azioni.data ?? []).map(versoAzione),
      eventi: (eventi.data ?? []).map(versoEvento),
      campagne: (campagne.data ?? []).map(versoCampagna),
      conversazioni: (conversazioni.data ?? []).map(versoConversazione),
      identita: (identita.data ?? []).map(versoIdentita),
      card: (card.data ?? []).map(versoCard),
      // Quello che c'è nel database può essere vecchio o incompleto: si fonde
      // con i predefiniti invece di fidarsi. Se la riga non c'è ancora — CRM
      // appena installato — valgono i predefiniti e non si rompe niente.
      impostazioni: conPredefinite(impostazioni.data?.valore),
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
      campagna_id: input.campagnaId ?? null,
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

    if (!input.silenzioso) {
      await this.db.from('eventi').insert({
        contatto_id: id, tipo: 'lead_ricevuto',
        descrizione: `Contatto inserito${input.fonteDettaglio ? ` — ${input.fonteDettaglio}` : ''}`,
        operatore, automatico: false,
      });
    }

    await this.db.from('azioni').insert({
      contatto_id: id, tipo: input.azione.tipo, descrizione: input.azione.descrizione,
      scadenza: input.azione.scadenza, priorita: input.azione.priorita ?? 'da_fare',
      assegnato_a: operatore,
    });

    await indicizzaRecapiti(this, id, { telefono: input.telefono, email: input.email });
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
    if (patch.campagnaId !== undefined) riga.campagna_id = patch.campagnaId;
    if (patch.assegnatoA !== undefined) riga.assegnato_a = patch.assegnatoA;
    if (patch.tag !== undefined) riga.tag = patch.tag;
    if (patch.note !== undefined) riga.note = patch.note;
    if (patch.consensoMarketing !== undefined) {
      riga.consenso_marketing = patch.consensoMarketing;
      if (patch.consensoMarketing) riga.consenso_il = adesso();
    }
    if (Object.keys(riga).length === 0) return;
    await this.db.from('contatti').update(riga).eq('id', id);

    if (patch.telefono !== undefined || patch.email !== undefined) {
      await indicizzaRecapiti(this, id, { telefono: patch.telefono, email: patch.email });
    }
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
      automatico: input.automatico ?? false, conversazione_id: input.conversazioneId ?? null,
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
        .select('id, numero_preventivo, scadenza_preventivo')
        .eq('contatto_id', input.contattoId).eq('stato', 'aperta')
        .order('creata_il', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        // Registrare «preventivo inviato» *è* mandare il preventivo: stato,
        // numero e scadenza si scrivono da sé, o la sezione Preventivi
        // resterebbe vuota mentre la storia del contatto dice il contrario.
        const dati = await this.istantanea();
        await this.db.from('opportunita')
          .update({
            valore_preventivo: input.valore,
            data_preventivo: quando,
            stato_preventivo: 'inviato',
            numero_preventivo: data.numero_preventivo ?? prossimoNumeroPreventivo(dati),
            scadenza_preventivo: data.scadenza_preventivo
              ?? fraGiorniData(dati.impostazioni.preventivo.validitaGiorni),
          })
          .eq('id', data.id);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Campagne
  // -------------------------------------------------------------------------
  async creaCampagna(input: NuovaCampagna): Promise<string> {
    const { data, error } = await this.db.from('campagne').insert({
      nome: input.nome,
      piattaforma: input.piattaforma,
      obiettivo: input.obiettivo ?? null,
      canale_ingresso: input.canaleIngresso,
      stato: input.stato ?? 'attiva',
      data_inizio: input.dataInizio ?? null,
      data_fine: input.dataFine ?? null,
      budget: input.budget ?? null,
      spesa: input.spesa ?? null,
      spesa_aggiornata_il: input.spesa != null ? adesso() : null,
      id_esterno: input.idEsterno ?? null,
      adset_id: input.adsetId ?? null,
      ad_id: input.adId ?? null,
      parametro_ref: input.parametroRef ?? null,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      landing: input.landing ?? null,
      note: input.note ?? null,
    }).select('id').single();

    if (error || !data) throw new Error(error?.message ?? 'campagna non salvata');
    return String(data.id);
  }

  async aggiornaCampagna(id: string, patch: PatchCampagna): Promise<void> {
    const riga: Riga = {};
    if (patch.nome !== undefined) riga.nome = patch.nome;
    if (patch.piattaforma !== undefined) riga.piattaforma = patch.piattaforma;
    if (patch.obiettivo !== undefined) riga.obiettivo = patch.obiettivo;
    if (patch.canaleIngresso !== undefined) riga.canale_ingresso = patch.canaleIngresso;
    if (patch.stato !== undefined) riga.stato = patch.stato;
    if (patch.dataInizio !== undefined) riga.data_inizio = patch.dataInizio;
    if (patch.dataFine !== undefined) riga.data_fine = patch.dataFine;
    if (patch.budget !== undefined) riga.budget = patch.budget;
    if (patch.spesa !== undefined) { riga.spesa = patch.spesa; riga.spesa_aggiornata_il = adesso(); }
    if (patch.idEsterno !== undefined) riga.id_esterno = patch.idEsterno;
    if (patch.adsetId !== undefined) riga.adset_id = patch.adsetId;
    if (patch.adId !== undefined) riga.ad_id = patch.adId;
    if (patch.parametroRef !== undefined) riga.parametro_ref = patch.parametroRef;
    if (patch.utmSource !== undefined) riga.utm_source = patch.utmSource;
    if (patch.utmMedium !== undefined) riga.utm_medium = patch.utmMedium;
    if (patch.utmCampaign !== undefined) riga.utm_campaign = patch.utmCampaign;
    if (patch.landing !== undefined) riga.landing = patch.landing;
    if (patch.note !== undefined) riga.note = patch.note;
    if (Object.keys(riga).length === 0) return;
    await this.db.from('campagne').update(riga).eq('id', id);
  }

  // L'annuncio è più preciso della campagna; il ref= è quello che abbiamo
  // messo noi nel link e vale come ultima spiaggia.
  async trovaCampagna(chiavi: ChiaviCampagna): Promise<Campagna | null> {
    const tentativi: [string, string][] = [];
    if (chiavi.adId) tentativi.push(['ad_id', chiavi.adId]);
    if (chiavi.idEsterno) tentativi.push(['id_esterno', chiavi.idEsterno]);
    if (chiavi.ref) tentativi.push(['parametro_ref', chiavi.ref]);

    for (const [colonna, valore] of tentativi) {
      const { data } = await this.db.from('campagne').select('*').eq(colonna, valore).maybeSingle();
      if (data) return versoCampagna(data);
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Identità: è questo che evita «Giulia 1» e «Giulia 2»
  // -------------------------------------------------------------------------
  async trovaContattoPerIdentita(tipo: TipoIdentita, valore: string): Promise<string | null> {
    const { data } = await this.db.from('identita')
      .select('contatto_id')
      .eq('tipo', tipo).eq('valore', normalizzaIdentita(tipo, valore))
      .maybeSingle();
    return data ? String(data.contatto_id) : null;
  }

  async collegaIdentita(contattoId: string, tipo: TipoIdentita, valore: string, verificata = true): Promise<void> {
    // Il vincolo unico sulla coppia (tipo, valore) fa il lavoro: se la chiave
    // c'è già, non si tocca niente.
    await this.db.from('identita')
      .upsert(
        { contatto_id: contattoId, tipo, valore: normalizzaIdentita(tipo, valore), verificata },
        { onConflict: 'tipo,valore', ignoreDuplicates: true },
      );
  }

  async unisciContatti(principaleId: string, assorbitoId: string): Promise<void> {
    if (principaleId === assorbitoId) return;
    const { data: assorbito } = await this.db.from('contatti').select('*').eq('id', assorbitoId).maybeSingle();
    const { data: principale } = await this.db.from('contatti').select('*').eq('id', principaleId).maybeSingle();
    if (!assorbito || !principale) return;

    for (const tabella of ['opportunita', 'azioni', 'eventi', 'conversazioni', 'identita']) {
      await this.db.from(tabella).update({ contatto_id: principaleId }).eq('contatto_id', assorbitoId);
    }

    // Si tiene il dato che c'è: i buchi della principale si riempiono con
    // quello che aveva l'altra.
    const riga: Riga = {};
    if (!principale.telefono && assorbito.telefono) riga.telefono = assorbito.telefono;
    if (!principale.email && assorbito.email) riga.email = assorbito.email;
    if (!principale.citta && assorbito.citta) riga.citta = assorbito.citta;
    if (!principale.campagna_id && assorbito.campagna_id) riga.campagna_id = assorbito.campagna_id;
    if (assorbito.consenso_marketing) riga.consenso_marketing = true;
    if (Object.keys(riga).length) await this.db.from('contatti').update(riga).eq('id', principaleId);

    await this.db.from('eventi').insert({
      contatto_id: principaleId, tipo: 'nota', automatico: true,
      descrizione: `Unita la scheda doppia di ${assorbito.nome} ${assorbito.cognome ?? ''}`.trim(),
    });

    await this.db.from('contatti').delete().eq('id', assorbitoId);
  }

  // -------------------------------------------------------------------------
  // Conversazioni
  // -------------------------------------------------------------------------
  async trovaConversazione(canale: Canale, idEsterno: string): Promise<Conversazione | null> {
    const { data } = await this.db.from('conversazioni')
      .select('*').eq('canale', canale).eq('id_esterno', idEsterno).maybeSingle();
    return data ? versoConversazione(data) : null;
  }

  async creaConversazione(input: NuovaConversazione): Promise<string> {
    const ora = adesso();
    const { data, error } = await this.db.from('conversazioni').insert({
      contatto_id: input.contattoId,
      campagna_id: input.campagnaId ?? null,
      canale: input.canale,
      id_esterno: input.idEsterno ?? null,
      primo_messaggio_il: input.primoMessaggioIl ?? ora,
      ultimo_messaggio_il: input.ultimoMessaggioIl ?? ora,
      ultimo_messaggio_testo: input.ultimoMessaggioTesto ?? null,
      riferimento: input.riferimento ?? null,
    }).select('id').single();

    if (error || !data) throw new Error(error?.message ?? 'conversazione non salvata');
    return String(data.id);
  }

  async aggiornaConversazione(id: string, patch: PatchConversazione): Promise<void> {
    const riga: Riga = {};
    if (patch.stato !== undefined) riga.stato = patch.stato;
    if (patch.nonLetta !== undefined) riga.non_letta = patch.nonLetta;
    if (patch.assegnataA !== undefined) riga.assegnata_a = patch.assegnataA;
    if (patch.campagnaId !== undefined) riga.campagna_id = patch.campagnaId;
    if (patch.ultimoMessaggioIl !== undefined) riga.ultimo_messaggio_il = patch.ultimoMessaggioIl;
    if (patch.ultimoMessaggioTesto !== undefined) riga.ultimo_messaggio_testo = patch.ultimoMessaggioTesto;
    if (Object.keys(riga).length === 0) return;
    await this.db.from('conversazioni').update(riga).eq('id', id);
  }

  // -------------------------------------------------------------------------
  // La coda grezza dei webhook: si salva prima di capire, così un payload
  // mappato male non si perde.
  // -------------------------------------------------------------------------
  async salvaIngressoGrezzo(canale: string, payload: unknown): Promise<string> {
    const { data } = await this.db.from('ingressi_grezzi')
      .insert({ canale, payload: payload as Riga }).select('id').single();
    return data ? String(data.id) : '';
  }

  async segnaIngressoLavorato(id: string, esito: string, contattoId: string | null = null, errore: string | null = null): Promise<void> {
    if (!id) return;
    await this.db.from('ingressi_grezzi')
      .update({ esito, contatto_id: contattoId, errore, lavorato_il: adesso() })
      .eq('id', id);
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
    if (patch.numeroPreventivo !== undefined) riga.numero_preventivo = patch.numeroPreventivo;
    if (patch.scadenzaPreventivo !== undefined) riga.scadenza_preventivo = patch.scadenzaPreventivo;
    if (patch.statoPreventivo !== undefined) riga.stato_preventivo = patch.statoPreventivo;
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

  // -------------------------------------------------------------------------
  // Chi sta usando il CRM
  // -------------------------------------------------------------------------
  async profilo(): Promise<Profilo | null> {
    const { data: utente } = await this.db.auth.getUser();
    if (!utente.user) return null;
    const { data } = await this.db.from('profili')
      .select('id, nome, ruolo').eq('id', utente.user.id).maybeSingle();
    if (!data) return null;
    return {
      id: String(data.id),
      nome: String(data.nome || utente.user.email || 'senza nome'),
      // Il ruolo sconosciuto vale come il meno potente: se qualcosa è andato
      // storto nella lettura, si perde un permesso, non si regala.
      ruolo: data.ruolo === 'titolare' ? 'titolare' : 'collaboratore',
    };
  }

  async ingressiInSospeso() {
    const { data } = await this.db.from('ingressi_grezzi')
      .select('id, canale, ricevuto_il, errore')
      // `esito` vuoto vuol dire «arrivato e mai lavorato»: è il caso che
      // conta, perché è un messaggio di un cliente fermo in coda.
      .or('esito.is.null,esito.eq.errore,esito.eq.in_attesa')
      .order('ricevuto_il', { ascending: false })
      .limit(50);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      canale: String(r.canale ?? ''),
      quando: String(r.ricevuto_il),
      errore: s(r.errore),
    }));
  }

  // -------------------------------------------------------------------------
  // Impostazioni
  // -------------------------------------------------------------------------
  async salvaImpostazioni(impostazioni: Impostazioni, operatore: string | null = null): Promise<void> {
    // Si scrive quello che è già passato dal controllo dei limiti: nel
    // database non entra una soglia assurda nemmeno per sbaglio.
    await this.db.from('impostazioni').upsert({
      chiave: 'crm',
      valore: conPredefinite(impostazioni) as unknown as Record<string, unknown>,
      aggiornato_da: operatore,
    }, { onConflict: 'chiave' });
  }

  // -------------------------------------------------------------------------
  // Card NFC
  // -------------------------------------------------------------------------
  async creaCard(input: NuovaCard): Promise<string> {
    const codice = normalizzaCodiceCard(input.codice);
    if (!codice) throw new Error('codice card non valido');

    const { data, error } = await this.db.from('card_nfc').insert({
      codice,
      nome: input.nome,
      luogo: input.luogo ?? null,
      campagna_id: input.campagnaId ?? null,
      destinazione: input.destinazione ?? null,
      attiva: input.attiva ?? true,
      note: input.note ?? null,
    }).select('id').single();

    if (error || !data) {
      // Il codice è unico nel database: se è già preso lo si dice con parole
      // sue, non con il messaggio di Postgres.
      throw new Error(error?.code === '23505' ? 'codice card già usato' : (error?.message ?? 'card non salvata'));
    }
    return String(data.id);
  }

  async aggiornaCard(id: string, patch: PatchCard): Promise<void> {
    const riga: Riga = {};
    if (patch.codice !== undefined) {
      const pulito = normalizzaCodiceCard(patch.codice);
      if (pulito) riga.codice = pulito;
    }
    if (patch.nome !== undefined) riga.nome = patch.nome;
    if (patch.luogo !== undefined) riga.luogo = patch.luogo;
    if (patch.campagnaId !== undefined) riga.campagna_id = patch.campagnaId;
    if (patch.destinazione !== undefined) riga.destinazione = patch.destinazione;
    if (patch.attiva !== undefined) riga.attiva = patch.attiva;
    if (patch.note !== undefined) riga.note = patch.note;
    if (Object.keys(riga).length === 0) return;
    await this.db.from('card_nfc').update(riga).eq('id', id);
  }

  async eliminaCard(id: string): Promise<void> {
    await this.db.from('card_nfc').delete().eq('id', id);
  }

  async trovaCardPerCodice(codice: string): Promise<CardNfc | null> {
    const { data } = await this.db.from('card_nfc')
      .select('*').eq('codice', normalizzaCodiceCard(codice)).maybeSingle();
    return data ? versoCard(data) : null;
  }

  async registraToccoCard(id: string): Promise<void> {
    // Il conteggio si fa nel database, non leggendo e riscrivendo: due
    // persone che toccano nello stesso istante non devono perdere un tocco.
    const { data } = await this.db.from('card_nfc').select('codice').eq('id', id).maybeSingle();
    if (!data) return;
    await this.db.rpc('tocca_card', { p_codice: data.codice });
  }

  // -------------------------------------------------------------------------
  // Dati di esempio
  // -------------------------------------------------------------------------
  // Marcati con una colonna, non con un nome che sembra finto: cancellarli è
  // una riga sola, e quello che pende dal contatto se ne va in cascata.
  async caricaDatiDemo(): Promise<void> {
    const esempio = semina();

    const { data: campagne } = await this.db.from('campagne').insert(
      esempio.campagne.map((c) => ({
        nome: c.nome, piattaforma: c.piattaforma, obiettivo: c.obiettivo,
        canale_ingresso: c.canaleIngresso, stato: c.stato,
        data_inizio: c.dataInizio, data_fine: c.dataFine,
        budget: c.budget, spesa: c.spesa, parametro_ref: c.parametroRef,
        ad_id: c.adId, id_esterno: c.idEsterno, landing: c.landing, note: c.note,
        demo: true,
      })),
    ).select('id, nome');

    const idCampagna = new Map((campagne ?? []).map((r) => [String(r.nome), String(r.id)]));
    const nomeCampagna = new Map(esempio.campagne.map((c) => [c.id, c.nome]));

    for (const c of esempio.contatti) {
      const campagna = c.campagnaId ? idCampagna.get(nomeCampagna.get(c.campagnaId) ?? '') ?? null : null;
      const { data } = await this.db.from('contatti').insert({
        nome: c.nome, cognome: c.cognome, telefono: c.telefono, email: c.email,
        citta: c.citta, provincia: c.provincia, fonte: c.fonte,
        fonte_dettaglio: c.fonteDettaglio, campagna_id: campagna, fase: c.fase,
        tag: c.tag, note: c.note, consenso_marketing: c.consensoMarketing,
        demo: true,
      }).select('id').single();
      if (!data) continue;
      const nuovo = String(data.id);

      const opportunita = esempio.opportunita.filter((o) => o.contattoId === c.id);
      if (opportunita.length) {
        await this.db.from('opportunita').insert(opportunita.map((o) => ({
          contatto_id: nuovo, titolo: o.titolo, interesse: o.interesse,
          descrizione: o.descrizione, valore_stimato: o.valoreStimato,
          valore_preventivo: o.valorePreventivo, stato: o.stato,
          data_preventivo: o.dataPreventivo, chiusura_prevista: o.chiusuraPrevista,
          motivo_perso: o.motivoPerso, stato_preventivo: o.statoPreventivo,
          numero_preventivo: o.numeroPreventivo, scadenza_preventivo: o.scadenzaPreventivo,
        })));
      }

      const azioni = esempio.azioni.filter((a) => a.contattoId === c.id);
      if (azioni.length) {
        await this.db.from('azioni').insert(azioni.map((a) => ({
          contatto_id: nuovo, tipo: a.tipo, descrizione: a.descrizione,
          scadenza: a.scadenza, ha_ora: a.haOra, priorita: a.priorita, fatta_il: a.fattaIl,
        })));
      }

      const eventi = esempio.eventi.filter((e) => e.contattoId === c.id);
      if (eventi.length) {
        await this.db.from('eventi').insert(eventi.map((e) => ({
          contatto_id: nuovo, tipo: e.tipo, descrizione: e.descrizione,
          quando: e.quando, valore: e.valore, automatico: e.automatico,
        })));
      }
    }

    await this.db.from('card_nfc').insert(esempio.card.map((c) => ({
      codice: c.codice, nome: c.nome, luogo: c.luogo,
      destinazione: c.destinazione, attiva: c.attiva, note: c.note, demo: true,
    })));
  }

  async eliminaDatiDemo(): Promise<number> {
    // Opportunità, azioni, eventi, conversazioni e identità pendono dal
    // contatto con `on delete cascade`: si cancella la testa e il resto se ne
    // va da solo. Niente orfani, niente righe dimenticate in giro.
    const { data: contatti } = await this.db.from('contatti').delete().eq('demo', true).select('id');
    const { data: campagne } = await this.db.from('campagne').delete().eq('demo', true).select('id');
    const { data: card } = await this.db.from('card_nfc').delete().eq('demo', true).select('id');
    return (contatti?.length ?? 0) + (campagne?.length ?? 0) + (card?.length ?? 0);
  }

  async quantiDatiDemo(): Promise<number> {
    const [contatti, campagne, card] = await Promise.all([
      this.db.from('contatti').select('id', { count: 'exact', head: true }).eq('demo', true),
      this.db.from('campagne').select('id', { count: 'exact', head: true }).eq('demo', true),
      this.db.from('card_nfc').select('id', { count: 'exact', head: true }).eq('demo', true),
    ]);
    return (contatti.count ?? 0) + (campagne.count ?? 0) + (card.count ?? 0);
  }
}
