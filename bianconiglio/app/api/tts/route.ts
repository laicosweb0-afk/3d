import { NextResponse } from 'next/server';

// La voce.
//
// Riceve il testo che il coniglio ha appena detto e restituisce l'mp3. Il
// flusso di ElevenLabs viene rigirato al browser così com'è, senza aspettare
// che finisca: l'audio comincia a suonare mentre il resto sta ancora arrivando.
//
// Se qualcosa qui non funziona — chiave mancante, Voice ID non ancora scelto,
// quota finita, ElevenLabs giù — questa route risponde con un errore pulito e
// il browser ripiega sulla voce di sistema. La conversazione non si ferma mai:
// è il punto 7 dello scope, ed è la differenza fra una demo che inciampa e una
// demo che si ferma davanti al titolare.

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_CARATTERI = 800;

/** Il più veloce dei modelli ElevenLabs che parla italiano decente. */
const MODELLO_PREDEFINITO = 'eleven_turbo_v2_5';

export async function POST(richiesta: Request) {
  const chiave = process.env.ELEVENLABS_API_KEY;
  const voce = process.env.ELEVENLABS_VOICE_ID;

  // Non è un errore da nascondere: finché la voce non è stata creata e scelta
  // a orecchio, questo è lo stato normale del progetto.
  if (!chiave || !voce) {
    return NextResponse.json(
      { errore: 'Voce non ancora configurata: manca ELEVENLABS_API_KEY o ELEVENLABS_VOICE_ID.' },
      { status: 503 },
    );
  }

  let testo = '';
  try {
    const corpo = await richiesta.json();
    if (typeof corpo?.testo === 'string') testo = corpo.testo.trim().slice(0, MAX_CARATTERI);
  } catch {
    // Resta vuoto e cade nel controllo qui sotto.
  }
  if (!testo) {
    return NextResponse.json({ errore: 'Niente da dire.' }, { status: 400 });
  }

  try {
    const risposta = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voce)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': chiave,
          'content-type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: testo,
          model_id: process.env.ELEVENLABS_MODEL_ID || MODELLO_PREDEFINITO,
          // I valori di partenza concordati (§2.4). Sono un punto di partenza da
          // ritoccare a orecchio quando la voce definitiva sarà scelta:
          // `stability` più basso = più recitato e variabile, più alto = più
          // piatto ma prevedibile; `style` spinge la teatralità.
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
            speed: 1.08,
          },
        }),
      },
    );

    if (!risposta.ok || !risposta.body) {
      const dettaglio = await risposta.text().catch(() => '');
      console.error('[tts] ElevenLabs ha rifiutato:', risposta.status, dettaglio.slice(0, 400));
      return NextResponse.json(
        { errore: `ElevenLabs ha risposto ${risposta.status}.` },
        { status: 502 },
      );
    }

    return new NextResponse(risposta.body, {
      headers: {
        'content-type': 'audio/mpeg',
        'cache-control': 'no-store',
      },
    });
  } catch (errore) {
    console.error('[tts] non ho raggiunto ElevenLabs:', errore);
    return NextResponse.json({ errore: 'Voce irraggiungibile.' }, { status: 502 });
  }
}
