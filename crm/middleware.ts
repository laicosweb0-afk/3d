import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Due compiti: rinnovare la sessione a ogni richiesta (i cookie di Supabase
// scadono in fretta) e tenere fuori dal CRM chi non ha fatto login.

// Le porte che devono rispondere a chi non è entrato nel CRM: il cliente che
// appoggia il telefono sulla card, il modulo del sito, i webhook di Meta.
// Ognuna si difende da sé — firma HMAC, origine consentita, campo trappola —
// perché qui il controllo dell'accesso non c'è per definizione.
//
// Dimenticarne una qui non si vede in modalità dimostrativa (senza Supabase
// il middleware lascia passare tutto): si scoprirebbe in produzione, con
// Meta che riceve un redirect al posto di un 200.
const PUBBLICHE = ['/login', '/api/lead', '/api/ingresso', '/api/webhooks', '/nfc'];

export async function middleware(richiesta: NextRequest) {
  let risposta = NextResponse.next({ request: richiesta });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Senza configurazione non si può decidere niente: si lascia passare e sarà
  // la pagina a dire cosa manca (succede solo in build o in anteprima).
  if (!url || !chiave) return risposta;

  const supabase = createServerClient(url, chiave, {
    cookies: {
      getAll: () => richiesta.cookies.getAll(),
      setAll: (daScrivere: { name: string; value: string; options: CookieOptions }[]) => {
        daScrivere.forEach(({ name, value }) => richiesta.cookies.set(name, value));
        risposta = NextResponse.next({ request: richiesta });
        daScrivere.forEach(({ name, value, options }) => risposta.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const percorso = richiesta.nextUrl.pathname;
  // Confronto sul segmento intero, non sul prefisso: con startsWith, un
  // domani una rotta chiamata /nfc-admin risulterebbe pubblica per sbaglio,
  // e non se ne accorgerebbe nessuno finché non è tardi.
  const pubblica = PUBBLICHE.some((p) => percorso === p || percorso.startsWith(`${p}/`));

  if (!data.user && !pubblica) {
    const versoLogin = richiesta.nextUrl.clone();
    versoLogin.pathname = '/login';
    versoLogin.search = percorso === '/' ? '' : `?da=${encodeURIComponent(percorso)}`;
    return NextResponse.redirect(versoLogin);
  }

  if (data.user && percorso.startsWith('/login')) {
    const versoCasa = richiesta.nextUrl.clone();
    versoCasa.pathname = '/';
    versoCasa.search = '';
    return NextResponse.redirect(versoCasa);
  }

  return risposta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
