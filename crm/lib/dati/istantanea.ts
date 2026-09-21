import type {
  Azione, Contatto, ContattoInElenco, Evento, Fase, Fonte, Interesse,
  Opportunita, Priorita, SchedaContatto,
} from '@/lib/dominio/tipi';
import { nomeCompleto } from '@/lib/dominio/tipi';
import { FASI_DESCRITTE, FASI_IN_TRATTATIVA, fase as descriviFase } from '@/lib/dominio/fasi';
import { FONTI_DESCRITTE } from '@/lib/dominio/fonti';
import { ORDINE_PRIORITA, SOGLIE, calcolaPriorita } from '@/lib/dominio/priorita';

// Tutti i conti del CRM stanno qui: elenco, scheda, pipeline, ingressi,
// analisi, attenzioni. Sono funzioni pure su un'istantanea dei dati, quindi
// la versione demo e quella su Supabase danno per forza gli stessi numeri —
// non ci sono due implementazioni da tenere allineate.

export type Istantanea = {
  contatti: Contatto[];
  opportunita: Opportunita[];
  azioni: Azione[];
  eventi: Evento[];
};

export type Periodo = 'oggi' | '7' | '30' | 'mese' | 'tutto';

export const ETICHETTA_PERIODO: Record<Periodo, string> = {
  oggi: 'Oggi',
  '7': '7 giorni',
  '30': '30 giorni',
  mese: 'Questo mese',
  tutto: 'Sempre',
};

export function inizioPeriodo(periodo: Periodo): Date {
  const ora = new Date();
  switch (periodo) {
    case 'oggi': { const d = new Date(ora); d.setHours(0, 0, 0, 0); return d; }
    case '7': { const d = new Date(ora); d.setDate(d.getDate() - 7); return d; }
    case '30': { const d = new Date(ora); d.setDate(d.getDate() - 30); return d; }
    case 'mese': return new Date(ora.getFullYear(), ora.getMonth(), 1);
    case 'tutto': return new Date(0);
  }
}

const giorniFra = (a: string | Date, b: string | Date = new Date()) =>
  Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

// ---------------------------------------------------------------------------
// Elenco e scheda
// ---------------------------------------------------------------------------
export function azioniAperte(dati: Istantanea, contattoId: string): Azione[] {
  return dati.azioni
    .filter((a) => a.contattoId === contattoId && !a.fattaIl)
    .sort((a, b) => a.scadenza.localeCompare(b.scadenza));
}

export function valoreContatto(dati: Istantanea, contattoId: string): number {
  return dati.opportunita
    .filter((o) => o.contattoId === contattoId && o.stato === 'aperta')
    .reduce((s, o) => s + (o.valorePreventivo ?? o.valoreStimato ?? 0), 0);
}

export function silenzioGiorni(dati: Istantanea, c: Contatto): number {
  const ultimo = dati.eventi
    .filter((e) => e.contattoId === c.id)
    .reduce<string | null>((max, e) => (!max || e.quando > max ? e.quando : max), null);
  return giorniFra(ultimo ?? c.ultimoContattoIl ?? c.creatoIl);
}

export function arricchisci(dati: Istantanea, c: Contatto): ContattoInElenco {
  const prossimaAzione = azioniAperte(dati, c.id)[0] ?? null;
  const valore = valoreContatto(dati, c.id);
  const giorniDiSilenzio = silenzioGiorni(dati, c);
  const aperta = dati.opportunita.find((o) => o.contattoId === c.id && o.stato === 'aperta');
  return {
    ...c,
    nomeCompleto: nomeCompleto(c),
    valore,
    interesse: aperta?.interesse ?? null,
    prossimaAzione,
    giorniDiSilenzio,
    priorita: calcolaPriorita({ fase: c.fase, prossimaAzione, valore, giorniDiSilenzio }),
  };
}

export function scheda(dati: Istantanea, id: string): SchedaContatto | null {
  const contatto = dati.contatti.find((c) => c.id === id);
  if (!contatto) return null;
  const arricchito = arricchisci(dati, contatto);
  return {
    contatto,
    opportunita: dati.opportunita.filter((o) => o.contattoId === id).sort((a, b) => b.creataIl.localeCompare(a.creataIl)),
    azioni: dati.azioni.filter((a) => a.contattoId === id).sort((a, b) => a.scadenza.localeCompare(b.scadenza)),
    eventi: dati.eventi.filter((e) => e.contattoId === id).sort((a, b) => b.quando.localeCompare(a.quando)),
    valore: arricchito.valore,
    prossimaAzione: arricchito.prossimaAzione,
    giorniDiSilenzio: arricchito.giorniDiSilenzio,
    priorita: arricchito.priorita,
  };
}

// ---------------------------------------------------------------------------
// Filtri e ordinamento
// ---------------------------------------------------------------------------
export type Ordine = 'priorita' | 'valore' | 'scadenza' | 'recenti' | 'nome';

export type Filtri = {
  cerca?: string;
  fonte?: Fonte | null;
  fase?: Fase | null;
  interesse?: Interesse | null;
  priorita?: Priorita | null;
  valoreMin?: number | null;
  silenzioDa?: number | null;      // giorni senza sentirsi
  entratiDa?: number | null;       // giorni dall'ingresso
  attenzione?: ChiaveAttenzione | null;
  soloAttivi?: boolean;
  ordine?: Ordine;
};

export function elenco(dati: Istantanea, filtri: Filtri = {}): ContattoInElenco[] {
  const inAttenzione = filtri.attenzione
    ? new Set(contattiInAttenzione(dati, filtri.attenzione).map((c) => c.id))
    : null;
  const cerca = (filtri.cerca ?? '').trim().toLowerCase();

  let righe = dati.contatti.map((c) => arricchisci(dati, c));

  if (cerca) {
    righe = righe.filter((c) =>
      [c.nomeCompleto, c.email ?? '', c.telefono ?? '', c.citta ?? '', ...c.tag]
        .join(' ').toLowerCase().includes(cerca));
  }
  if (filtri.fonte) righe = righe.filter((c) => c.fonte === filtri.fonte);
  if (filtri.fase) righe = righe.filter((c) => c.fase === filtri.fase);
  if (filtri.interesse) righe = righe.filter((c) => c.interesse === filtri.interesse);
  if (filtri.priorita) righe = righe.filter((c) => c.priorita === filtri.priorita);
  if (filtri.valoreMin) righe = righe.filter((c) => c.valore >= filtri.valoreMin!);
  if (filtri.silenzioDa) righe = righe.filter((c) => c.giorniDiSilenzio >= filtri.silenzioDa!);
  if (filtri.entratiDa) righe = righe.filter((c) => giorniFra(c.creatoIl) <= filtri.entratiDa!);
  if (filtri.soloAttivi) righe = righe.filter((c) => descriviFase(c.fase).attiva);
  if (inAttenzione) righe = righe.filter((c) => inAttenzione.has(c.id));

  const ordine = filtri.ordine ?? 'priorita';
  righe.sort((a, b) => {
    switch (ordine) {
      case 'valore': return b.valore - a.valore;
      case 'nome': return a.nomeCompleto.localeCompare(b.nomeCompleto, 'it');
      case 'recenti': return b.creatoIl.localeCompare(a.creatoIl);
      case 'scadenza':
        return (a.prossimaAzione?.scadenza ?? '9999').localeCompare(b.prossimaAzione?.scadenza ?? '9999');
      case 'priorita':
      default: {
        const p = ORDINE_PRIORITA[a.priorita] - ORDINE_PRIORITA[b.priorita];
        if (p !== 0) return p;
        const sa = a.prossimaAzione?.scadenza ?? '9999';
        const sb = b.prossimaAzione?.scadenza ?? '9999';
        if (sa !== sb) return sa.localeCompare(sb);
        return b.valore - a.valore;
      }
    }
  });
  return righe;
}

// ---------------------------------------------------------------------------
// Da fare: la coda operativa della home
// ---------------------------------------------------------------------------
export type VoceDaFare = {
  azione: Azione;
  contatto: ContattoInElenco;
  priorita: Priorita;
  giorniDiRitardo: number;
};

export function daFare(dati: Istantanea, entroGiorni = 3): VoceDaFare[] {
  const limite = new Date();
  limite.setDate(limite.getDate() + entroGiorni);
  limite.setHours(23, 59, 59, 999);

  return dati.azioni
    .filter((a) => !a.fattaIl && new Date(a.scadenza) <= limite)
    .map((azione) => {
      const grezzo = dati.contatti.find((c) => c.id === azione.contattoId);
      if (!grezzo) return null;
      const contatto = arricchisci(dati, grezzo);
      return {
        azione,
        contatto,
        priorita: contatto.priorita,
        giorniDiRitardo: Math.max(0, giorniFra(azione.scadenza)),
      };
    })
    .filter((v): v is VoceDaFare => v !== null)
    .sort((a, b) => {
      const p = ORDINE_PRIORITA[a.priorita] - ORDINE_PRIORITA[b.priorita];
      return p !== 0 ? p : a.azione.scadenza.localeCompare(b.azione.scadenza);
    });
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
export type RigaFase = {
  fase: Fase;
  nome: string;
  conteggio: number;
  valore: number;
  contatti: ContattoInElenco[];
};

export function pipeline(dati: Istantanea): RigaFase[] {
  const righe = dati.contatti.map((c) => arricchisci(dati, c));
  return FASI_DESCRITTE.map((f) => {
    const dentro = righe.filter((c) => c.fase === f.id);
    return {
      fase: f.id,
      nome: f.nome,
      conteggio: dentro.length,
      valore: dentro.reduce((s, c) => s + c.valore, 0),
      contatti: dentro.sort((a, b) => b.valore - a.valore),
    };
  });
}

export const valorePipeline = (dati: Istantanea) =>
  dati.contatti
    .filter((c) => FASI_IN_TRATTATIVA.includes(c.fase))
    .reduce((s, c) => s + valoreContatto(dati, c.id), 0);

// ---------------------------------------------------------------------------
// Ingressi: cosa produce ogni fonte
// ---------------------------------------------------------------------------
export type RigaFonte = {
  fonte: Fonte;
  nome: string;
  lead: number;
  qualificati: number;
  preventivi: number;
  ordini: number;
  valorePreventivi: number;
  valoreOrdini: number;
};

const RAGGIUNTA = (c: Contatto, fase: Fase) =>
  FASI_DESCRITTE.findIndex((f) => f.id === c.fase) >= FASI_DESCRITTE.findIndex((f) => f.id === fase)
  && c.fase !== 'perso';

export function ingressi(dati: Istantanea, periodo: Periodo = 'tutto'): RigaFonte[] {
  const da = inizioPeriodo(periodo).toISOString();
  const dentro = dati.contatti.filter((c) => c.creatoIl >= da);

  return FONTI_DESCRITTE.map((f) => {
    const suoi = dentro.filter((c) => c.fonte === f.id);
    const opportunitaDi = (lista: Contatto[]) =>
      dati.opportunita.filter((o) => lista.some((c) => c.id === o.contattoId));
    const conPreventivo = suoi.filter((c) => RAGGIUNTA(c, 'preventivo'));
    const conOrdine = suoi.filter((c) => RAGGIUNTA(c, 'ordine'));
    return {
      fonte: f.id,
      nome: f.nome,
      lead: suoi.length,
      qualificati: suoi.filter((c) => RAGGIUNTA(c, 'qualificato')).length,
      preventivi: conPreventivo.length,
      ordini: conOrdine.length,
      valorePreventivi: opportunitaDi(conPreventivo).reduce((s, o) => s + (o.valorePreventivo ?? 0), 0),
      valoreOrdini: opportunitaDi(conOrdine).filter((o) => o.stato !== 'persa')
        .reduce((s, o) => s + (o.valorePreventivo ?? o.valoreStimato ?? 0), 0),
    };
  }).sort((a, b) => b.lead - a.lead);
}

// ---------------------------------------------------------------------------
// Analisi
// ---------------------------------------------------------------------------
export type Analisi = {
  // La coorte: le persone ENTRATE nel periodo e dove sono arrivate. Serve a
  // misurare l'imbuto senza mescolare le mele con le pere.
  ingressi: number;
  contattati: number;
  qualificati: number;
  appuntamenti: number;
  preventivi: number;
  ordini: number;
  clienti: number;
  persi: number;
  // Gli ordini CHIUSI nel periodo, chiunque sia entrato quando. È il numero
  // che interessa a fine mese, ed è un'altra cosa: tenerli distinti evita la
  // classica riga «0 ordini · 6.250 €».
  ordiniChiusi: number;
  valoreOrdiniChiusi: number;
  valorePipeline: number;
  conversioni: { da: string; a: string; percentuale: number | null }[];
  giorniIngressoPreventivo: number | null;
  giorniPreventivoOrdine: number | null;
};

const mediaGiorni = (valori: number[]) =>
  valori.length ? Math.round((valori.reduce((a, b) => a + b, 0) / valori.length) * 10) / 10 : null;

export function analisi(dati: Istantanea, periodo: Periodo = '30'): Analisi {
  const da = inizioPeriodo(periodo).toISOString();
  const dentro = dati.contatti.filter((c) => c.creatoIl >= da);

  const conta = (f: Fase) => dentro.filter((c) => RAGGIUNTA(c, f)).length;
  const ingressiN = dentro.length;
  const qualificati = conta('qualificato');
  const preventivi = conta('preventivo');
  const ordini = conta('ordine');

  const primoEvento = (id: string, tipo: Evento['tipo']) =>
    dati.eventi.filter((e) => e.contattoId === id && e.tipo === tipo)
      .sort((a, b) => a.quando.localeCompare(b.quando))[0];

  const tempiPreventivo: number[] = [];
  const tempiOrdine: number[] = [];
  for (const c of dati.contatti) {
    const prev = primoEvento(c.id, 'preventivo_inviato');
    if (prev) {
      tempiPreventivo.push(Math.max(0, giorniFra(c.creatoIl, prev.quando)));
      const ord = primoEvento(c.id, 'ordine');
      if (ord) tempiOrdine.push(Math.max(0, giorniFra(prev.quando, ord.quando)));
    }
  }

  const perc = (sopra: number, sotto: number) => (sotto ? Math.round((sopra / sotto) * 100) : null);

  const ordiniDelPeriodo = dati.eventi.filter((e) => e.tipo === 'ordine' && e.quando >= da);

  return {
    ordiniChiusi: ordiniDelPeriodo.length,
    valoreOrdiniChiusi: ordiniDelPeriodo.reduce((s, e) => s + (e.valore ?? 0), 0),
    ingressi: ingressiN,
    contattati: conta('contattato'),
    qualificati,
    appuntamenti: conta('appuntamento'),
    preventivi,
    ordini,
    clienti: dentro.filter((c) => c.fase === 'cliente').length,
    persi: dentro.filter((c) => c.fase === 'perso').length,
    valorePipeline: valorePipeline(dati),
    conversioni: [
      { da: 'Ingressi', a: 'Qualificati', percentuale: perc(qualificati, ingressiN) },
      { da: 'Qualificati', a: 'Preventivi', percentuale: perc(preventivi, qualificati) },
      { da: 'Preventivi', a: 'Ordini', percentuale: perc(ordini, preventivi) },
    ],
    giorniIngressoPreventivo: mediaGiorni(tempiPreventivo),
    giorniPreventivoOrdine: mediaGiorni(tempiOrdine),
  };
}

// ---------------------------------------------------------------------------
// Attenzioni: le cose che stanno per sfuggire di mano
// ---------------------------------------------------------------------------
export const CHIAVI_ATTENZIONE = [
  'senza_azione',
  'preventivo_muto',
  'fermo_da_troppo',
  'campione_senza_seguito',
  'appuntamento_senza_seguito',
  'alto_valore_fermo',
  'azione_scaduta',
] as const;
export type ChiaveAttenzione = (typeof CHIAVI_ATTENZIONE)[number];

export type Attenzione = {
  chiave: ChiaveAttenzione;
  titolo: string;
  conteggio: number;
  gravita: 'alta' | 'media';
};

const ultimoEventoDi = (dati: Istantanea, id: string, tipo?: Evento['tipo']) =>
  dati.eventi
    .filter((e) => e.contattoId === id && (!tipo || e.tipo === tipo))
    .sort((a, b) => b.quando.localeCompare(a.quando))[0];

export function contattiInAttenzione(dati: Istantanea, chiave: ChiaveAttenzione): Contatto[] {
  const attivi = dati.contatti.filter((c) => descriviFase(c.fase).attiva);

  switch (chiave) {
    case 'senza_azione':
      return attivi.filter((c) => azioniAperte(dati, c.id).length === 0);

    case 'azione_scaduta':
      return attivi.filter((c) => {
        const a = azioniAperte(dati, c.id)[0];
        return a && new Date(a.scadenza) < new Date();
      });

    case 'preventivo_muto':
      return attivi.filter((c) => {
        const prev = ultimoEventoDi(dati, c.id, 'preventivo_inviato');
        if (!prev || giorniFra(prev.quando) < 5) return false;
        const dopo = dati.eventi.some((e) => e.contattoId === c.id && e.quando > prev.quando && e.tipo !== 'nota' && e.tipo !== 'cambio_fase');
        return !dopo;
      });

    case 'fermo_da_troppo':
      return attivi.filter((c) => silenzioGiorni(dati, c) >= SOGLIE.silenzioGrave);

    case 'campione_senza_seguito':
      return attivi.filter((c) => {
        const camp = ultimoEventoDi(dati, c.id, 'campione_consegnato');
        if (!camp || giorniFra(camp.quando) < 7) return false;
        const reso = dati.eventi.some((e) => e.contattoId === c.id && e.tipo === 'campione_reso' && e.quando > camp.quando);
        const sentito = dati.eventi.some((e) => e.contattoId === c.id && e.quando > camp.quando && ['telefonata', 'whatsapp', 'follow_up', 'email'].includes(e.tipo));
        return !reso && !sentito;
      });

    case 'appuntamento_senza_seguito':
      return attivi.filter((c) => {
        const app = ultimoEventoDi(dati, c.id, 'appuntamento');
        if (!app || new Date(app.quando) > new Date()) return false;
        return !dati.eventi.some((e) => e.contattoId === c.id && e.quando > app.quando && e.tipo !== 'cambio_fase');
      });

    case 'alto_valore_fermo':
      return attivi.filter((c) =>
        valoreContatto(dati, c.id) >= 5000 && silenzioGiorni(dati, c) >= 7);
  }
}

const TITOLI: Record<ChiaveAttenzione, (n: number) => string> = {
  senza_azione: (n) => `${n} ${n === 1 ? 'contatto non ha' : 'contatti non hanno'} una prossima azione`,
  azione_scaduta: (n) => `${n} ${n === 1 ? 'azione è scaduta' : 'azioni sono scadute'}`,
  preventivo_muto: (n) => `${n} ${n === 1 ? 'preventivo è' : 'preventivi sono'} senza risposta da più di 5 giorni`,
  fermo_da_troppo: (n) => `${n} ${n === 1 ? 'contatto è fermo' : 'contatti sono fermi'} da più di ${SOGLIE.silenzioGrave} giorni`,
  campione_senza_seguito: (n) => `${n} ${n === 1 ? 'campione consegnato' : 'campioni consegnati'} senza follow-up`,
  appuntamento_senza_seguito: (n) => `${n} ${n === 1 ? 'appuntamento passato' : 'appuntamenti passati'} senza nulla dopo`,
  alto_valore_fermo: (n) => `${n} ${n === 1 ? 'opportunità sopra 5.000 € è ferma' : 'opportunità sopra 5.000 € sono ferme'} da più di 7 giorni`,
};

const GRAVITA: Record<ChiaveAttenzione, 'alta' | 'media'> = {
  senza_azione: 'alta',
  azione_scaduta: 'alta',
  preventivo_muto: 'alta',
  alto_valore_fermo: 'alta',
  fermo_da_troppo: 'media',
  campione_senza_seguito: 'media',
  appuntamento_senza_seguito: 'media',
};

export function attenzioni(dati: Istantanea): Attenzione[] {
  return CHIAVI_ATTENZIONE
    .map((chiave) => {
      const conteggio = contattiInAttenzione(dati, chiave).length;
      return { chiave, conteggio, titolo: TITOLI[chiave](conteggio), gravita: GRAVITA[chiave] };
    })
    .filter((a) => a.conteggio > 0)
    .sort((a, b) => (a.gravita === b.gravita ? b.conteggio - a.conteggio : a.gravita === 'alta' ? -1 : 1));
}
