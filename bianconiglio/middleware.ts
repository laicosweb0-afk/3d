import { NextResponse, type NextRequest } from 'next/server';
import { NOME_COOKIE, sigilla, combacia } from './lib/sigillo';

// Tutto quello che non è la pagina di sblocco passa di qui. Senza il cookie
// giusto non si vede né la hero né le API: il coniglio non esiste per chi non
// ha il biglietto.

const APERTI = ['/sblocca', '/api/sblocca'];

export async function middleware(richiesta: NextRequest) {
  const percorso = richiesta.nextUrl.pathname;
  if (APERTI.some((p) => percorso === p || percorso.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const attesa = process.env.DEMO_PASSWORD;
  if (!attesa) {
    // Senza password configurata non si apre niente: è il modo meno peggiore
    // di sbagliare. Il messaggio dice cosa manca a chi sta facendo il deploy.
    return new NextResponse('DEMO_PASSWORD non è configurata sul server.', { status: 500 });
  }

  const cookie = richiesta.cookies.get(NOME_COOKIE)?.value ?? '';
  if (combacia(cookie, await sigilla(attesa))) return NextResponse.next();

  // Le API rispondono con un 401 secco: un redirect a una pagina HTML
  // manderebbe il client a fare `JSON.parse` su del markup.
  if (percorso.startsWith('/api/')) {
    return NextResponse.json({ errore: 'Sessione scaduta.' }, { status: 401 });
  }

  const destinazione = richiesta.nextUrl.clone();
  destinazione.pathname = '/sblocca';
  destinazione.search = '';
  return NextResponse.redirect(destinazione);
}

export const config = {
  // Fuori dal controllo restano solo gli asset serviti da Next e la favicon:
  // il PNG del coniglio in `public/` invece è protetto come tutto il resto.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
