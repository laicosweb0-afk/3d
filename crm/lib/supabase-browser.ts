'use client';

import { createBrowserClient } from '@supabase/ssr';

// Creato a chiamata e non all'import: una pagina che non fa login non deve
// rompersi se le variabili non ci sono.
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chiave) {
    throw new Error('Configurazione Supabase mancante: vedi crm/.env.example.');
  }
  return createBrowserClient(url, chiave);
}
