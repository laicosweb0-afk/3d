'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import { normalizzaCodice } from '@/lib/codice';
import { daOrarioItaliano } from '@/lib/formato';
import type { StatoContatto, TipoAttivita } from '@/lib/tipi';

// Tutte le scritture del CRM passano da qui. Ognuna lavora con il client
// dell'utente collegato: se la sessione è scaduta, le regole di riga del
// database rifiutano da sole, non serve ricontrollare i permessi a mano.

function testo(dati: FormData, campo: string, max = 500): string {
  const valore = dati.get(campo);
  return typeof valore === 'string' ? valore.trim().slice(0, max) : '';
}

async function client() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  return { supabase, utente: data.user };
}

export async function esci() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function creaContatto(dati: FormData) {
  const { supabase } = await client();
  const nome = testo(dati, 'nome', 120);
  if (nome.length < 2) return;

  const email = testo(dati, 'email', 200).toLowerCase() || null;
  const consenso = dati.get('consenso') === 'on';
  const { data, error } = await supabase
    .from('contatti')
    .insert({
      nome,
      email,
      telefono: testo(dati, 'telefono', 40) || null,
      provenienza: 'manuale',
      stato: 'nuovo',
      consenso_marketing: consenso,
      consenso_il: consenso ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  // Email già in rubrica: si apre la scheda che esiste invece di fare un doppione.
  if (error?.code === '23505' && email) {
    const { data: gia } = await supabase.from('contatti').select('id').ilike('email', email).maybeSingle();
    if (gia) redirect(`/contatti/${gia.id}?avviso=esisteva`);
  }
  if (error || !data) redirect('/contatti/nuovo?avviso=errore');

  revalidatePath('/contatti');
  redirect(`/contatti/${data.id}`);
}

export async function aggiornaContatto(dati: FormData) {
  const { supabase } = await client();
  const id = testo(dati, 'id', 40);
  if (!id) return;

  const tagGrezzi = testo(dati, 'tag', 300);
  const assegnato = testo(dati, 'assegnato_a', 40);

  await supabase
    .from('contatti')
    .update({
      nome: testo(dati, 'nome', 120),
      email: testo(dati, 'email', 200).toLowerCase() || null,
      telefono: testo(dati, 'telefono', 40) || null,
      stato: testo(dati, 'stato', 30) as StatoContatto,
      assegnato_a: assegnato || null,
      tag: tagGrezzi ? tagGrezzi.split(',').map((t) => t.trim()).filter(Boolean) : [],
    })
    .eq('id', id);

  revalidatePath(`/contatti/${id}`);
  revalidatePath('/contatti');
}

export async function aggiungiNota(dati: FormData) {
  const { supabase, utente } = await client();
  const contattoId = testo(dati, 'contatto_id', 40);
  const corpo = testo(dati, 'testo', 4000);
  if (!contattoId || !corpo) return;

  await supabase.from('note').insert({ contatto_id: contattoId, autore: utente.id, testo: corpo });
  // Una nota è una traccia di contatto: la scheda deve dirlo senza che nessuno
  // debba ricordarsi di aggiornare la data a mano.
  await supabase.from('contatti').update({ ultimo_contatto_il: new Date().toISOString() }).eq('id', contattoId);

  revalidatePath(`/contatti/${contattoId}`);
}

export async function creaAttivita(dati: FormData) {
  const { supabase, utente } = await client();
  const titolo = testo(dati, 'titolo', 200);
  if (!titolo) return;

  const quando = testo(dati, 'scadenza', 40);
  const contattoId = testo(dati, 'contatto_id', 40) || null;
  await supabase.from('attivita').insert({
    contatto_id: contattoId,
    assegnato_a: testo(dati, 'assegnato_a', 40) || utente.id,
    titolo,
    tipo: (testo(dati, 'tipo', 20) || 'chiamata') as TipoAttivita,
    scadenza: quando ? daOrarioItaliano(quando) : new Date().toISOString(),
  });

  if (contattoId) revalidatePath(`/contatti/${contattoId}`);
  revalidatePath('/');
}

export async function segnaAttivitaFatta(dati: FormData) {
  const { supabase } = await client();
  const id = testo(dati, 'id', 40);
  if (!id) return;

  const { data } = await supabase
    .from('attivita')
    .update({ fatta_il: new Date().toISOString() })
    .eq('id', id)
    .select('contatto_id')
    .maybeSingle();

  if (data?.contatto_id) {
    await supabase.from('contatti').update({ ultimo_contatto_il: new Date().toISOString() }).eq('id', data.contatto_id);
    revalidatePath(`/contatti/${data.contatto_id}`);
  }
  revalidatePath('/');
}

export async function riscattaCodice(dati: FormData) {
  const { supabase, utente } = await client();
  const codice = normalizzaCodice(testo(dati, 'codice', 40));
  if (!codice) return;

  await supabase
    .from('lead_card')
    .update({ riscattato_il: new Date().toISOString(), riscattato_da: utente.id })
    .eq('codice', codice)
    .is('riscattato_il', null);

  revalidatePath('/codice');
  redirect(`/codice?q=${encodeURIComponent(codice)}`);
}

// Diritto all'oblio: il contatto se ne va davvero, e con lui note, credito e
// promemoria (le chiavi esterne sono in cascata).
export async function eliminaContatto(dati: FormData) {
  const { supabase } = await client();
  const id = testo(dati, 'id', 40);
  if (!id) return;

  await supabase.from('contatti').delete().eq('id', id);
  revalidatePath('/contatti');
  redirect('/contatti?avviso=eliminato');
}
