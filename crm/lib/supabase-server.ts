import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { chiaveAnonima, urlSupabase } from './ambiente';

type BiscottoDaScrivere = { name: string; value: string; options: CookieOptions };

// Client per componenti e azioni lato server: parla a nome dell'utente
// collegato, quindi le regole di riga (RLS) valgono tutte.
export async function supabaseServer() {
  const biscotti = await cookies();
  return createServerClient(urlSupabase(), chiaveAnonima(), {
    cookies: {
      getAll: () => biscotti.getAll(),
      setAll: (daScrivere: BiscottoDaScrivere[]) => {
        try {
          daScrivere.forEach(({ name, value, options }) => biscotti.set(name, value, options));
        } catch {
          // In un Server Component i cookie sono di sola lettura: il rinnovo
          // della sessione lo fa il middleware, qui si può ignorare.
        }
      },
    },
  });
}

// Chi è collegato adesso, o null.
export async function utenteCorrente() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
