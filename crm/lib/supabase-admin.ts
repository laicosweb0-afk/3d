import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { chiaveServizio, urlSupabase } from './ambiente';

// Chiave di servizio: scavalca le regole di riga. La usa soltanto /api/lead,
// che deve scrivere per conto di un visitatore senza account. Non deve mai
// finire in un componente client.
export function supabaseAdmin() {
  return createClient(urlSupabase(), chiaveServizio(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
