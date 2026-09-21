'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deposito, modoDati } from '@/lib/dati';
import { supabaseServer } from '@/lib/supabase-server';
import { scadenzaFra } from '@/lib/dominio/automazioni';
import { daOrarioItaliano } from '@/lib/formato';
import {
  FASI, FONTI, INTERESSI, MOTIVI_PERSO, PRIORITA, TIPI_AZIONE, TIPI_EVENTO,
  type Fase, type Fonte, type Interesse, type MotivoPerso, type Priorita,
  type TipoAzione, type TipoEvento,
} from '@/lib/dominio/tipi';

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
  if (modoDati() === 'demo') return { dep, operatore: null };

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  return { dep, operatore: data.user.id };
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
  const { dep } = await contesto();
  const id = testo(dati, 'id', 60);
  if (!id) return;

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
