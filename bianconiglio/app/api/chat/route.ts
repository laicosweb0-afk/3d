import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { SISTEMA, MODELLO, TETTO_TOKEN } from '@/lib/personaggio.server';
import { SCUSA } from '@/lib/personaggio';

// Il cervello del coniglio.
//
// Sta sul server per un motivo solo ma decisivo: la chiave API. Il browser
// manda qui la conversazione, questa route la gira a Claude con la personalità
// del personaggio, e restituisce solo il testo. La chiave non attraversa mai la
// rete verso il client.

export const runtime = 'nodejs';
export const maxDuration = 30;

type Battuta = { ruolo: 'utente' | 'coniglio'; testo: string };

/** Tetto per battuta: una domanda su un profumo non ha bisogno di più. */
const MAX_CARATTERI = 1200;
/** Quante battute di storia teniamo. Il coniglio ricorda la conversazione, non l'archivio. */
const MAX_BATTUTE = 24;

// Freno a mano contro un link che gira più del previsto. Sta in memoria del
// processo: su Vercel significa per-istanza, quindi è una protezione ruvida, non
// una garanzia. Per una demo privata mostrata a una persona è la misura giusta;
// se un giorno la pagina diventa pubblica, questo va sostituito con un contatore
// condiviso (KV, Upstash) prima di qualsiasi altra cosa.
const FINESTRA_MS = 60_000;
const TETTO_FINESTRA = 20;
const passaggi = new Map<string, number[]>();

function troppoSpesso(impronta: string): boolean {
  const adesso = Date.now();
  const recenti = (passaggi.get(impronta) ?? []).filter((t) => adesso - t < FINESTRA_MS);
  recenti.push(adesso);
  passaggi.set(impronta, recenti);
  if (passaggi.size > 500) passaggi.clear();
  return recenti.length > TETTO_FINESTRA;
}

export async function POST(richiesta: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { errore: 'ANTHROPIC_API_KEY non è configurata sul server.', testo: SCUSA },
      { status: 500 },
    );
  }

  const impronta = richiesta.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ignoto';
  if (troppoSpesso(impronta)) {
    return NextResponse.json(
      { testo: 'Tic tac… un respiro. Riprova fra un momento.' },
      { status: 429 },
    );
  }

  let battute: Battuta[] = [];
  try {
    const corpo = await richiesta.json();
    if (Array.isArray(corpo?.battute)) battute = corpo.battute;
  } catch {
    return NextResponse.json({ errore: 'Richiesta illeggibile.', testo: SCUSA }, { status: 400 });
  }

  const storia = battute
    .filter(
      (b): b is Battuta =>
        !!b &&
        (b.ruolo === 'utente' || b.ruolo === 'coniglio') &&
        typeof b.testo === 'string' &&
        b.testo.trim().length > 0,
    )
    .slice(-MAX_BATTUTE)
    .map((b) => ({
      role: b.ruolo === 'utente' ? ('user' as const) : ('assistant' as const),
      content: b.testo.slice(0, MAX_CARATTERI),
    }));

  // L'API vuole che si parta da un turno utente, e che l'ultimo sia il suo.
  while (storia.length && storia[0].role !== 'user') storia.shift();
  if (!storia.length || storia[storia.length - 1].role !== 'user') {
    return NextResponse.json({ errore: 'Manca la domanda.', testo: SCUSA }, { status: 400 });
  }

  try {
    const claude = new Anthropic();
    const risposta = await claude.messages.create({
      model: MODELLO,
      max_tokens: TETTO_TOKEN,
      system: SISTEMA,
      // Due frasi in personaggio non hanno niente da ragionare, e ogni secondo
      // qui è un secondo di silenzio davanti al titolare: il criterio di
      // accettazione è «risponde con la voce entro ~4s» e il tempo va speso
      // nella sintesi vocale, non nel pensiero.
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      messages: storia,
    });

    const testo = risposta.content
      .filter((blocco) => blocco.type === 'text')
      .map((blocco) => blocco.text)
      .join('')
      .trim();

    if (!testo) {
      return NextResponse.json({ testo: SCUSA }, { status: 200 });
    }
    return NextResponse.json({ testo });
  } catch (errore) {
    // Il guasto non deve mai rompere il personaggio: davanti al titolare il
    // coniglio inciampa nella catena dell'orologio, non in uno stack trace.
    console.error('[chat] Claude non ha risposto:', errore);
    return NextResponse.json({ testo: SCUSA }, { status: 200 });
  }
}
