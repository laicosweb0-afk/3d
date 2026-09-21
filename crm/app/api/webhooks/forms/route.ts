import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { depositoPubblico, modoDati } from '@/lib/dati';
import { registraIngresso, type Ingresso } from '@/lib/dati/ingresso';
import type { TipoIdentita } from '@/lib/dominio/campagne';
import { normalizzaCodiceCard } from '@/lib/dominio/card';

// I moduli del sito di Rama.
//
// Differenza con /api/ingresso/sito: lì la forma del payload la decidiamo
// noi. Qui no — arriva quello che manda il modulo, con i nomi dei campi che
// ha il modulo, e questa rotta li traduce. È la differenza fra «fatto su
// misura» e «ci si adatta a quello che c'è».
//
// **Stato onesto:** questa rotta funziona, ma non è ancora collegata a
// nessun modulo: il sito ramastore.it va configurato per mandare qui i dati.
// Come si fa sta in SETUP_GUIDE.md. Finché `INGRESSO_SEGRETO` non è
// configurato, in produzione risponde 503: non finge.
//
// I nomi dei campi accettati coprono quello che usano i moduli più diffusi
// (WordPress/Contact Form 7, Elementor, un form scritto a mano). Se il modulo
// di Rama ne usa altri, si aggiungono in ALIAS e non si tocca altro.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALIAS: Record<string, string[]> = {
  nome: ['nome', 'name', 'first_name', 'firstname', 'your-name', 'nome-cognome'],
  cognome: ['cognome', 'surname', 'last_name', 'lastname'],
  email: ['email', 'mail', 'e-mail', 'your-email'],
  telefono: ['telefono', 'phone', 'tel', 'cellulare', 'your-phone'],
  messaggio: ['messaggio', 'message', 'testo', 'note', 'richiesta', 'your-message'],
  citta: ['citta', 'città', 'city', 'comune'],
};

// Il modulo può mandare i campi in cima o annidati dentro `fields`/`data`:
// si guarda in tutti e due i posti prima di dire che un campo non c'è.
function leggi(corpo: Record<string, unknown>, chiave: string): string | null {
  const dentro = [corpo, corpo.fields, corpo.data, corpo.form]
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x));

  for (const nome of ALIAS[chiave] ?? [chiave]) {
    for (const livello of dentro) {
      const v = livello[nome];
      if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 500);
      if (typeof v === 'number') return String(v);
    }
  }
  return null;
}

function firmaValida(corpoGrezzo: string, firma: string | null): boolean {
  const segreto = process.env.INGRESSO_SEGRETO;
  if (!segreto || !firma) return false;
  const atteso = createHmac('sha256', segreto).update(corpoGrezzo).digest('hex');
  const a = Buffer.from(atteso, 'utf8');
  const b = Buffer.from(firma.replace(/^sha256=/, ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(richiesta: Request) {
  const corpoGrezzo = await richiesta.text();
  const segreto = process.env.INGRESSO_SEGRETO;
  const demo = modoDati() === 'demo';

  if (!segreto && !demo) {
    return NextResponse.json({ errore: 'modulo non configurato' }, { status: 503 });
  }
  if (segreto && !firmaValida(corpoGrezzo, richiesta.headers.get('x-rama-firma'))) {
    return NextResponse.json({ errore: 'firma non valida' }, { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(corpoGrezzo) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ errore: 'corpo non valido' }, { status: 400 });
  }

  const dep = depositoPubblico();
  // Prima si conserva quello che è arrivato, poi si prova a capirlo: se la
  // traduzione sbaglia un nome di campo, la richiesta del cliente non si
  // perde e si può rilavorare.
  const grezzoId = await dep.salvaIngressoGrezzo('forms', corpo);

  const email = leggi(corpo, 'email');
  const telefono = leggi(corpo, 'telefono');
  if (!email && !telefono) {
    // Senza un recapito non c'è niente da richiamare: si conserva e si dice
    // perché, invece di creare una scheda muta che nessuno saprà usare.
    await dep.segnaIngressoLavorato(grezzoId, 'errore', null, 'né email né telefono nel modulo');
    return NextResponse.json({ errore: 'serve almeno email o telefono' }, { status: 400 });
  }

  try {
    // La chiave principale è l'email quando c'è: è quella che le persone
    // scrivono uguale due volte. Il telefono resta come chiave in più.
    const principale: { tipo: TipoIdentita; valore: string } = email
      ? { tipo: 'email', valore: email }
      : { tipo: 'telefono', valore: telefono! };
    const extra = email && telefono
      ? [{ tipo: 'telefono' as TipoIdentita, valore: telefono }]
      : [];

    const nomeIntero = (leggi(corpo, 'nome') ?? '').split(' ');
    const card = typeof corpo.card === 'string' ? normalizzaCodiceCard(corpo.card) : null;

    const ingresso: Ingresso = {
      canale: 'sito',
      identita: principale,
      identitaExtra: extra,
      nome: nomeIntero[0] || null,
      cognome: leggi(corpo, 'cognome') ?? (nomeIntero.slice(1).join(' ') || null),
      testo: leggi(corpo, 'messaggio'),
      campagna: {
        // Il modulo può portarsi dietro da dove arriva la persona: gli UTM
        // messi nel link, o il codice della card che ha toccato in negozio.
        ref: typeof corpo.utm_campaign === 'string' ? corpo.utm_campaign : (card ?? null),
      },
      riferimento: {
        utm_source: corpo.utm_source ?? null,
        utm_medium: corpo.utm_medium ?? null,
        utm_campaign: corpo.utm_campaign ?? null,
        card,
        pagina: corpo.pagina ?? corpo.page ?? null,
      },
    };

    const esito = await registraIngresso(dep, ingresso);
    await dep.segnaIngressoLavorato(grezzoId, 'ok', esito.contattoId);
    return NextResponse.json({ ok: true, contattoId: esito.contattoId }, { status: 200 });
  } catch (errore) {
    const messaggio = errore instanceof Error ? errore.message : 'errore sconosciuto';
    await dep.segnaIngressoLavorato(grezzoId, 'errore', null, messaggio);
    console.error('[webhook forms]', messaggio);
    return NextResponse.json({ errore: 'modulo non elaborato' }, { status: 500 });
  }
}
