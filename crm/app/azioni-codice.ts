'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { modoDati } from '@/lib/dati';
import { supabaseServer } from '@/lib/supabase-server';
import { normalizzaCodice } from '@/lib/codice';

// Il riscatto del credito della card sta a parte dalle azioni del CRM: tocca
// le tabelle del Club Rama (`lead_card`), non il modello commerciale.

export async function riscattaCodice(dati: FormData) {
  if (modoDati() === 'demo') return;

  const grezzo = dati.get('codice');
  const codice = normalizzaCodice(typeof grezzo === 'string' ? grezzo : '');
  if (!codice) return;

  const supabase = await supabaseServer();
  const { data: sessione } = await supabase.auth.getUser();
  if (!sessione.user) redirect('/login');

  await supabase
    .from('lead_card')
    .update({ riscattato_il: new Date().toISOString(), riscattato_da: sessione.user.id })
    .eq('codice', codice)
    .is('riscattato_il', null);

  revalidatePath('/codice');
  redirect(`/codice?q=${encodeURIComponent(codice)}`);
}
