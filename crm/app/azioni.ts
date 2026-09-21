'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deposito, modoDati } from '@/lib/dati';
import { supabaseServer } from '@/lib/supabase-server';
import { scadenzaFra } from '@/lib/dominio/automazioni';
import { normalizzaCodiceCard } from '@/lib/dominio/card';
import { prossimoNumeroPreventivo } from '@/lib/dati/istantanea';
import { daOrarioItaliano } from '@/lib/formato';
import {
  FASI, FONTI, INTERESSI, MOTIVI_PERSO, PRIORITA, TIPI_AZIONE, TIPI_EVENTO,
  type Fase, type Fonte, type Interesse, type MotivoPerso, type Priorita,
  type TipoAzione, type TipoEvento,
} from '@/lib/dominio/tipi';
import {
  CANALI, PIATTAFORME, STATI_CAMPAGNA, STATI_CONVERSAZIONE,
  type Canale, type Piattaforma, type StatoCampagna, type StatoConversazione,
} from '@/lib/dominio/campagne';
import {
  NUMERI_MODIFICABILI, conPredefinite, puo,
  type Impostazioni, type Permesso, type Ruolo,
} from '@/lib/dominio/impostazioni';
import { STATI_PREVENTIVO, type StatoPreventivo } from '@/lib/dominio/tipi';

// Tutto ciò che il CRM scrive passa da qui, e da qui passa al deposito.
// Nessuna pagina tocca il database per conto suo: quando si clicca, succede
// una cosa sola, in un posto solo, e tutte le viste la vedono.

function testo(dati: FormData, campo: string, max = 1000): string {
  const v = dati.get(campo);
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function numero(dati: FormData, campo: string): number | null {
  const grezzo = testo(dati, campo, 20).replace(/\./g, '').replace(',', '.');
  if (!grezzo) return null;
  const n = Number(grezzo);
  return Number.isFinite(n) ? n : null;
}

// Un valore arriva da un menu a tendina: o è uno di quelli previsti, o non è.
function scelta<T extends string>(dati: FormData, campo: string, ammessi: readonly T[], difetto: T): T {
  const v = testo(dati, campo, 40) as T;
  return ammessi.includes(v) ? v : difetto;
}

async function contesto() {
  const dep = await deposito();
  if (modoDati() === 'demo') {
    return { dep, operatore: null, ruolo: 'admin' as Ruolo };
  }

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const profilo = await dep.profilo();
  // Ruolo sconosciuto = il meno potente. Se la lettura del profilo è andata
  // storta si perde un permesso, non se ne regala uno.
  return { dep, operatore: data.user.id, ruolo: profilo?.ruolo ?? ('operatore' as Ruolo) };
}

// Il controllo vero dei permessi sta qui, sul server, non nel bottone che si
// nasconde: un bottone nascosto è un suggerimento, non una porta chiusa.
// Chi non può, torna indietro con il motivo scritto nell'indirizzo — non con
// una pagina di errore che non spiega niente.
function esigi(ruolo: Ruolo, permesso: Permesso, tornaA: string): void {
  if (puo(ruolo, permesso)) return;
  redirect(`${tornaA}${tornaA.includes('?') ? '&' : '?'}errore=permesso`);
}

// Le viste che cambiano quando cambia un contatto. Aggiornarle tutte insieme
// è il modo per non avere due schermate che raccontano cose diverse.
function aggiornaTutto(contattoId?: string) {
  revalidatePath('/');
  revalidatePath('/pipeline');
  revalidatePath('/contatti');
  revalidatePath('/ingressi');
  revalidatePath('/analisi');
  revalidatePath('/attenzioni');
  revalidatePath('/campagne');
  revalidatePath('/flusso');
  revalidatePath('/preventivi');
  revalidatePath('/attivita');
  if (contattoId) revalidatePath(`/contatti/${contattoId}`);
}

// ---------------------------------------------------------------------------
// Accesso
// ---------------------------------------------------------------------------
export async function esci() {
  if (modoDati() === 'demo') redirect('/');
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}

// ---------------------------------------------------------------------------
// Contatti
// ---------------------------------------------------------------------------
export async function creaContatto(dati: FormData) {
  const { dep, operatore } = await contesto();

  const nome = testo(dati, 'nome', 80);
  const cognome = testo(dati, 'cognome', 80);
  const descrizioneAzione = testo(dati, 'azione_descrizione', 200);

  // Nome, fonte, fase e prossima azione sono obbligatori: un contatto senza
  // prossima azione è un contatto che verrà dimenticato.
  if (!nome || !descrizioneAzione) {
    redirect('/contatti/nuovo?errore=campi');
  }

  const quando = testo(dati, 'azione_scadenza', 40);
  const id = await dep.creaContatto({
    nome,
    cognome,
    telefono: testo(dati, 'telefono', 40) || null,
    email: testo(dati, 'email', 160).toLowerCase() || null,
    citta: testo(dati, 'citta', 80) || null,
    provincia: testo(dati, 'provincia', 4).toUpperCase() || null,
    fonte: scelta<Fonte>(dati, 'fonte', FONTI, 'altro'),
    fonteDettaglio: testo(dati, 'fonte_dettaglio', 200) || null,
    fase: scelta<Fase>(dati, 'fase', FASI, 'nuovo'),
    note: testo(dati, 'note', 2000) || null,
    consensoMarketing: dati.get('consenso') === 'on',
    interesse: scelta<Interesse>(dati, 'interesse', INTERESSI, 'altro'),
    valoreStimato: numero(dati, 'valore_stimato'),
    azione: {
      tipo: scelta<TipoAzione>(dati, 'azione_tipo', TIPI_AZIONE, 'telefonare'),
      descrizione: descrizioneAzione,
      scadenza: quando ? daOrarioItaliano(quando) : scadenzaFra(1),
      priorita: scelta<Priorita>(dati, 'azione_priorita', PRIORITA, 'da_fare'),
    },
  }, operatore);

  aggiornaTutto(id);
  redirect(`/contatti/${id}`);
}

export async function aggiornaContatto(dati: FormData) {
  const { dep } = await contesto();
  const id = testo(dati, 'id', 60);
  if (!id) return;

  const tagGrezzi = testo(dati, 'tag', 300);
  await dep.aggiornaContatto(id, {
    nome: testo(dati, 'nome', 80),
    cognome: testo(dati, 'cognome', 80),
    telefono: testo(dati, 'telefono', 40) || null,
    email: testo(dati, 'email', 160).toLowerCase() || null,
    citta: testo(dati, 'citta', 80) || null,
    provincia: testo(dati, 'provincia', 4).toUpperCase() || null,
    fonte: scelta<Fonte>(dati, 'fonte', FONTI, 'altro'),
    fonteDettaglio: testo(dati, 'fonte_dettaglio', 200) || null,
    note: testo(dati, 'note', 2000) || null,
    tag: tagGrezzi ? tagGrezzi.split(',').map((t) => t.trim()).filter(Boolean) : [],
    consensoMarketing: dati.get('consenso') === 'on',
  });

  aggiornaTutto(id);
}

export async function cambiaFase(dati: FormData) {
  const { dep, operatore } = await contesto();
  const id = testo(dati, 'id', 60);
  const fase = scelta<Fase>(dati, 'fase', FASI, 'nuovo');
  if (!id) return;

  await dep.cambiaFase(id, fase, operatore);
  aggiornaTutto(id);
}

export async function eliminaContatto(dati: FormData) {
  const { dep, ruolo } = await contesto();
  const id = testo(dati, 'id', 60);
  if (!id) return;
  esigi(ruolo, 'elimina_contatto', `/contatti/${id}`);

  await dep.eliminaContatto(id);
  aggiornaTutto();
  redirect('/contatti?avviso=eliminato');
}

// ---------------------------------------------------------------------------
// Azioni (cosa va fatto)
// ---------------------------------------------------------------------------
export async function creaAzione(dati: FormData) {
  const { dep, operatore } = await contesto();
  const contattoId = testo(dati, 'contatto_id', 60);
  const descrizione = testo(dati, 'descrizione', 200);
  if (!contattoId || !descrizione) return;

  const quando = testo(dati, 'scadenza', 40);
  await dep.creaAzione({
    contattoId,
    tipo: scelta<TipoAzione>(dati, 'tipo', TIPI_AZIONE, 'richiamare'),
    descrizione,
    scadenza: quando ? daOrarioItaliano(quando) : scadenzaFra(1),
    haOra: quando.length > 10,
    priorita: scelta<Priorita>(dati, 'priorita', PRIORITA, 'da_fare'),
    operatore,
  });

  aggiornaTutto(contattoId);
}

export async function modificaAzione(dati: FormData) {
  const { dep } = await contesto();
  const id = testo(dati, 'id', 60);
  const descrizione = testo(dati, 'descrizione', 200);
  if (!id || !descrizione) return;

  const quando = testo(dati, 'scadenza', 40);
  await dep.aggiornaAzione(id, {
    tipo: scelta<TipoAzione>(dati, 'tipo', TIPI_AZIONE, 'richiamare'),
    descrizione,
    priorita: scelta<Priorita>(dati, 'priorita', PRIORITA, 'da_fare'),
    ...(quando ? { scadenza: daOrarioItaliano(quando), haOra: quando.length > 10 } : {}),
  });

  aggiornaTutto(testo(dati, 'contatto_id', 60) || undefined);
}

export async function completaAzione(dati: FormData) {
  const { dep, operatore } = await contesto();
  const id = testo(dati, 'id', 60);
  if (!id) return;

  await dep.completaAzione(id, testo(dati, 'esito', 400) || null, operatore);
  aggiornaTutto(testo(dati, 'contatto_id', 60) || undefined);
}

export async function posticipaAzione(dati: FormData) {
  const { dep } = await contesto();
  const id = testo(dati, 'id', 60);
  if (!id) return;

  const giorni = Number(testo(dati, 'giorni', 4)) || 1;
  await dep.posticipaAzione(id, Math.min(Math.max(giorni, 1), 90));
  aggiornaTutto(testo(dati, 'contatto_id', 60) || undefined);
}

// ---------------------------------------------------------------------------
// Eventi (cosa è successo)
// ---------------------------------------------------------------------------
export async function registraEvento(dati: FormData) {
  const { dep, operatore } = await contesto();
  const contattoId = testo(dati, 'contatto_id', 60);
  const descrizione = testo(dati, 'descrizione', 2000);
  if (!contattoId || !descrizione) return;

  const quando = testo(dati, 'quando', 40);
  await dep.registraEvento({
    contattoId,
    tipo: scelta<TipoEvento>(dati, 'tipo', TIPI_EVENTO, 'nota'),
    descrizione,
    quando: quando ? daOrarioItaliano(quando) : undefined,
    valore: numero(dati, 'valore'),
    operatore,
  });

  aggiornaTutto(contattoId);
}

// ---------------------------------------------------------------------------
// Opportunità (il lavoro e il suo valore)
// ---------------------------------------------------------------------------
export async function creaOpportunita(dati: FormData) {
  const { dep } = await contesto();
  const contattoId = testo(dati, 'contatto_id', 60);
  const titolo = testo(dati, 'titolo', 160);
  if (!contattoId || !titolo) return;

  await dep.creaOpportunita({
    contattoId,
    titolo,
    interesse: scelta<Interesse>(dati, 'interesse', INTERESSI, 'altro'),
    descrizione: testo(dati, 'descrizione', 1000) || null,
    valoreStimato: numero(dati, 'valore_stimato'),
    valorePreventivo: numero(dati, 'valore_preventivo'),
  });

  aggiornaTutto(contattoId);
}

export async function aggiornaOpportunita(dati: FormData) {
  const { dep, operatore } = await contesto();
  const id = testo(dati, 'id', 60);
  const contattoId = testo(dati, 'contatto_id', 60);
  if (!id) return;

  const stato = testo(dati, 'stato', 20);
  await dep.aggiornaOpportunita(id, {
    valoreStimato: numero(dati, 'valore_stimato'),
    valorePreventivo: numero(dati, 'valore_preventivo'),
    stato: stato === 'vinta' || stato === 'persa' || stato === 'aperta' ? stato : undefined,
    motivoPerso: stato === 'persa'
      ? scelta<MotivoPerso>(dati, 'motivo_perso', MOTIVI_PERSO, 'altro')
      : undefined,
  }, operatore);

  aggiornaTutto(contattoId || undefined);
}

// ---------------------------------------------------------------------------
// Campagne
// ---------------------------------------------------------------------------
export async function creaCampagna(dati: FormData) {
  const { dep } = await contesto();
  const nome = testo(dati, 'nome', 160);
  if (!nome) redirect('/campagne/nuova?errore=nome');

  const id = await dep.creaCampagna({
    nome,
    piattaforma: scelta<Piattaforma>(dati, 'piattaforma', PIATTAFORME, 'meta'),
    canaleIngresso: scelta<Canale>(dati, 'canale_ingresso', CANALI, 'messenger'),
    obiettivo: testo(dati, 'obiettivo', 120) || null,
    stato: scelta<StatoCampagna>(dati, 'stato', STATI_CAMPAGNA, 'attiva'),
    dataInizio: testo(dati, 'data_inizio', 12) || null,
    dataFine: testo(dati, 'data_fine', 12) || null,
    budget: numero(dati, 'budget'),
    // La spesa resta vuota se non la sappiamo: N/D è un dato, zero è una bugia.
    spesa: numero(dati, 'spesa'),
    idEsterno: testo(dati, 'id_esterno', 60) || null,
    adsetId: testo(dati, 'adset_id', 60) || null,
    adId: testo(dati, 'ad_id', 60) || null,
    parametroRef: testo(dati, 'parametro_ref', 60) || null,
    utmSource: testo(dati, 'utm_source', 60) || null,
    utmMedium: testo(dati, 'utm_medium', 60) || null,
    utmCampaign: testo(dati, 'utm_campaign', 60) || null,
    landing: testo(dati, 'landing', 300) || null,
    note: testo(dati, 'note', 1000) || null,
  });

  aggiornaTutto();
  redirect(`/campagne/${id}`);
}

export async function aggiornaCampagna(dati: FormData) {
  const { dep } = await contesto();
  const id = testo(dati, 'id', 60);
  if (!id) return;

  await dep.aggiornaCampagna(id, {
    nome: testo(dati, 'nome', 160),
    piattaforma: scelta<Piattaforma>(dati, 'piattaforma', PIATTAFORME, 'meta'),
    canaleIngresso: scelta<Canale>(dati, 'canale_ingresso', CANALI, 'messenger'),
    obiettivo: testo(dati, 'obiettivo', 120) || null,
    stato: scelta<StatoCampagna>(dati, 'stato', STATI_CAMPAGNA, 'attiva'),
    dataInizio: testo(dati, 'data_inizio', 12) || null,
    dataFine: testo(dati, 'data_fine', 12) || null,
    budget: numero(dati, 'budget'),
    spesa: numero(dati, 'spesa'),
    idEsterno: testo(dati, 'id_esterno', 60) || null,
    adsetId: testo(dati, 'adset_id', 60) || null,
    adId: testo(dati, 'ad_id', 60) || null,
    parametroRef: testo(dati, 'parametro_ref', 60) || null,
    landing: testo(dati, 'landing', 300) || null,
    note: testo(dati, 'note', 1000) || null,
  });

  aggiornaTutto();
  revalidatePath(`/campagne/${id}`);
}

// Collega o scollega una persona da una campagna, a mano: serve per i
// contatti entrati prima che le integrazioni fossero accese.
export async function collegaCampagna(dati: FormData) {
  const { dep } = await contesto();
  const contattoId = testo(dati, 'contatto_id', 60);
  if (!contattoId) return;

  const campagnaId = testo(dati, 'campagna_id', 60);
  await dep.aggiornaContatto(contattoId, { campagnaId: campagnaId || null });
  aggiornaTutto(contattoId);
}

// ---------------------------------------------------------------------------
// Conversazioni
// ---------------------------------------------------------------------------
export async function segnaConversazione(dati: FormData) {
  const { dep, operatore } = await contesto();
  const id = testo(dati, 'id', 60);
  if (!id) return;

  const stato = scelta<StatoConversazione>(dati, 'stato', STATI_CONVERSAZIONE, 'gestita');
  await dep.aggiornaConversazione(id, {
    stato,
    nonLetta: false,
    assegnataA: operatore,
  });

  aggiornaTutto(testo(dati, 'contatto_id', 60) || undefined);
}

// ---------------------------------------------------------------------------
// Unione di due schede della stessa persona
// ---------------------------------------------------------------------------
export async function unisciContatti(dati: FormData) {
  const { dep, ruolo } = await contesto();
  const principale = testo(dati, 'principale', 60);
  const assorbito = testo(dati, 'assorbito', 60);
  if (!principale || !assorbito || principale === assorbito) return;
  esigi(ruolo, 'unisci_contatti', `/contatti/${principale}`);

  await dep.unisciContatti(principale, assorbito);
  aggiornaTutto(principale);
  redirect(`/contatti/${principale}?avviso=unito`);
}


// ---------------------------------------------------------------------------
// Preventivi
// ---------------------------------------------------------------------------
// Il preventivo sta sopra l'opportunità: un lavoro, un'offerta corrente. Vedi
// la nota in lib/dominio/tipi.ts sul perché non è una tabella a parte.
export async function salvaPreventivo(dati: FormData) {
  const { dep, operatore } = await contesto();
  const id = testo(dati, 'id', 60);
  const contattoId = testo(dati, 'contatto_id', 60);
  if (!id) return;

  const stato = scelta<StatoPreventivo>(dati, 'stato_preventivo', STATI_PREVENTIVO, 'bozza');
  const istantanea = await dep.istantanea();
  const opportunita = istantanea.opportunita.find((o) => o.id === id);
  if (!opportunita) return;

  const numeroPreventivo = testo(dati, 'numero_preventivo', 40)
    || opportunita.numeroPreventivo
    || prossimoNumeroPreventivo(istantanea);

  // Mandare un preventivo senza dire quando scade è come non mandarlo: la
  // scadenza serve a sapere quando risentire. Se non la si scrive, la mette
  // il CRM con la validità decisa in Impostazioni.
  const data = testo(dati, 'data_preventivo', 12) || null;
  let scadenza = testo(dati, 'scadenza_preventivo', 12) || null;
  if (!scadenza && stato === 'inviato') {
    const d = data ? new Date(`${data}T12:00:00`) : new Date();
    d.setDate(d.getDate() + istantanea.impostazioni.preventivo.validitaGiorni);
    scadenza = d.toISOString().slice(0, 10);
  }

  await dep.aggiornaOpportunita(id, {
    valorePreventivo: numero(dati, 'valore_preventivo') ?? opportunita.valorePreventivo,
    numeroPreventivo: stato === 'nessuno' ? null : numeroPreventivo,
    dataPreventivo: stato === 'nessuno' ? null : (data ?? opportunita.dataPreventivo ?? new Date().toISOString().slice(0, 10)),
    scadenzaPreventivo: stato === 'nessuno' ? null : scadenza,
    statoPreventivo: stato,
  }, operatore);

  // Un preventivo che parte adesso è una cosa successa: entra nella storia,
  // e da lì nasce da sé il promemoria di follow-up.
  if (stato === 'inviato' && opportunita.statoPreventivo !== 'inviato') {
    await dep.registraEvento({
      contattoId: opportunita.contattoId,
      tipo: 'preventivo_inviato',
      descrizione: `Preventivo ${numeroPreventivo} — ${opportunita.titolo}`,
      valore: numero(dati, 'valore_preventivo') ?? opportunita.valorePreventivo,
      operatore,
    });
  }

  aggiornaTutto(contattoId || opportunita.contattoId);
  if (contattoId) redirect(`/contatti/${contattoId}`);
}

// ---------------------------------------------------------------------------
// Impostazioni
// ---------------------------------------------------------------------------
export async function salvaImpostazioni(dati: FormData) {
  const { dep, ruolo, operatore } = await contesto();
  esigi(ruolo, 'impostazioni', '/impostazioni');

  const attuali = (await dep.istantanea()).impostazioni;

  // Si legge solo quello che è dichiarato modificabile, e ogni numero passa
  // dal controllo dei limiti: nel database non entra una soglia assurda
  // nemmeno scrivendola a mano nel modulo.
  const soglie = { ...attuali.soglie };
  const giorni = { ...attuali.giorni };
  const preventivo = { ...attuali.preventivo };

  for (const voce of NUMERI_MODIFICABILI) {
    const grezzo = testo(dati, `${voce.gruppo}_${voce.chiave}`, 12);
    if (!grezzo) continue;
    const n = Number(grezzo.replace(/\./g, ''));
    if (!Number.isFinite(n)) continue;
    const dentro = Math.min(voce.max, Math.max(voce.min, Math.round(n)));
    if (voce.gruppo === 'soglie') (soglie as Record<string, number>)[voce.chiave] = dentro;
    else if (voce.gruppo === 'giorni') (giorni as Record<string, number>)[voce.chiave] = dentro;
    else preventivo.validitaGiorni = dentro;
  }

  const nuove: Impostazioni = conPredefinite({
    soglie,
    giorni,
    preventivo: { ...preventivo, prefissoNumero: testo(dati, 'preventivo_prefisso', 12) || preventivo.prefissoNumero },
    azienda: {
      nome: testo(dati, 'azienda_nome', 120) || attuali.azienda.nome,
      telefono: testo(dati, 'azienda_telefono', 40),
      email: testo(dati, 'azienda_email', 120),
      citta: testo(dati, 'azienda_citta', 120),
    },
  });

  await dep.salvaImpostazioni(nuove, operatore);
  aggiornaTutto();
  revalidatePath('/impostazioni');
  redirect('/impostazioni?avviso=salvate');
}

// ---------------------------------------------------------------------------
// Card NFC
// ---------------------------------------------------------------------------
export async function creaCard(dati: FormData) {
  const { dep, ruolo } = await contesto();
  esigi(ruolo, 'gestisci_card', '/card');

  const codice = normalizzaCodiceCard(testo(dati, 'codice', 40));
  const nome = testo(dati, 'nome', 80);
  if (!codice || !nome) redirect('/card?errore=dati');

  try {
    await dep.creaCard({
      codice,
      nome,
      luogo: testo(dati, 'luogo', 120) || null,
      campagnaId: testo(dati, 'campagna_id', 60) || null,
      destinazione: testo(dati, 'destinazione', 300) || null,
      note: testo(dati, 'note', 500) || null,
    });
  } catch (errore) {
    const messaggio = errore instanceof Error ? errore.message : '';
    redirect(`/card?errore=${messaggio.includes('già usato') ? 'doppio' : 'dati'}`);
  }

  revalidatePath('/card');
  redirect('/card?avviso=creata');
}

export async function aggiornaCard(dati: FormData) {
  const { dep, ruolo } = await contesto();
  esigi(ruolo, 'gestisci_card', '/card');
  const id = testo(dati, 'id', 60);
  if (!id) return;

  await dep.aggiornaCard(id, {
    nome: testo(dati, 'nome', 80),
    luogo: testo(dati, 'luogo', 120) || null,
    campagnaId: testo(dati, 'campagna_id', 60) || null,
    destinazione: testo(dati, 'destinazione', 300) || null,
    attiva: dati.get('attiva') === 'si',
    note: testo(dati, 'note', 500) || null,
  });
  revalidatePath('/card');
  redirect('/card?avviso=salvata');
}

export async function eliminaCard(dati: FormData) {
  const { dep, ruolo } = await contesto();
  esigi(ruolo, 'gestisci_card', '/card');
  const id = testo(dati, 'id', 60);
  if (!id) return;
  await dep.eliminaCard(id);
  revalidatePath('/card');
  redirect('/card?avviso=eliminata');
}

// ---------------------------------------------------------------------------
// Dati di esempio
// ---------------------------------------------------------------------------
export async function caricaDatiDemo() {
  const { dep, ruolo } = await contesto();
  esigi(ruolo, 'dati_demo', '/impostazioni');
  await dep.caricaDatiDemo();
  aggiornaTutto();
  revalidatePath('/impostazioni');
  redirect('/impostazioni?avviso=demo-caricati');
}

export async function eliminaDatiDemo() {
  const { dep, ruolo } = await contesto();
  esigi(ruolo, 'dati_demo', '/impostazioni');
  const quanti = await dep.eliminaDatiDemo();
  aggiornaTutto();
  revalidatePath('/impostazioni');
  redirect(`/impostazioni?avviso=demo-eliminati&quanti=${quanti}`);
}
