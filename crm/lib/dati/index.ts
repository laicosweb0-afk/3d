import 'server-only';
import type { Deposito } from './deposito';
import { DepositoDemo } from './deposito-demo';
import { DepositoSupabase } from './deposito-supabase';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Chi decide su cosa gira il CRM. Una regola sola: se Supabase è configurato
// si usa Supabase, altrimenti si lavora sui dati di esempio. `CRM_MODO=demo`
// forza la modalità dimostrativa anche con le chiavi presenti — comodo per
// far vedere il CRM senza toccare i dati veri.

export function modoDati(): 'demo' | 'supabase' {
  if (process.env.CRM_MODO === 'demo') return 'demo';
  const configurato = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return configurato ? 'supabase' : 'demo';
}

// Deposito per le pagine: parla a nome dell'utente collegato, quindi valgono
// le regole di riga del database.
export async function deposito(): Promise<Deposito> {
  if (modoDati() === 'demo') return new DepositoDemo();
  return new DepositoSupabase(await supabaseServer());
}

// Deposito per l'unica porta pubblica (/api/lead): nessun utente collegato,
// si scrive con la chiave di servizio. Non va usato dalle pagine.
export function depositoPubblico(): Deposito {
  if (modoDati() === 'demo') return new DepositoDemo();
  return new DepositoSupabase(supabaseAdmin());
}

export type { Deposito };
