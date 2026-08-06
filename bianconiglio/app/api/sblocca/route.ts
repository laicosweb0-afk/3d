import { NextResponse } from 'next/server';
import { NOME_COOKIE, sigilla, combacia } from '@/lib/sigillo';

// La porta. Riceve la parola, la confronta con quella in env, e se combacia
// posa il cookie che il middleware controllerà da lì in avanti.

export const runtime = 'nodejs';

export async function POST(richiesta: Request) {
  const attesa = process.env.DEMO_PASSWORD;

  // Se la password non è configurata la demo sarebbe aperta a chiunque: meglio
  // un errore chiaro adesso che un link privato che privato non è.
  if (!attesa) {
    return NextResponse.json(
      { errore: 'DEMO_PASSWORD non è configurata sul server.' },
      { status: 500 },
    );
  }

  let parola = '';
  try {
    const corpo = await richiesta.json();
    if (typeof corpo?.parola === 'string') parola = corpo.parola;
  } catch {
    // Corpo illeggibile: cade nel ramo «parola sbagliata» qui sotto.
  }

  const impronta = await sigilla(attesa);
  if (!combacia(await sigilla(parola), impronta)) {
    // Mezzo secondo di attesa: rende inutile provare a indovinare a raffica,
    // e a chi la parola ce l'ha non cambia nulla.
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ errore: 'Non è questa la parola.' }, { status: 401 });
  }

  const risposta = NextResponse.json({ aperto: true });
  risposta.cookies.set(NOME_COOKIE, impronta, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return risposta;
}
