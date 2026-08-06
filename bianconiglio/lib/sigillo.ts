// Il sigillo che tiene chiusa la demo.
//
// Il cookie non contiene la password: contiene la sua impronta. Così anche
// leggendo il cookie dal browser non si ricava la parola da dare al titolare, e
// il middleware può verificarlo senza tenere nulla in memoria fra una richiesta
// e l'altra.
//
// Usa Web Crypto e non `node:crypto` di proposito: questo file gira sia nel
// middleware (runtime edge) sia nelle API routes, e Web Crypto è l'unica delle
// due disponibile in entrambi.

export const NOME_COOKIE = 'bianconiglio_sigillo';

/** Impronta della password. Il prefisso evita che l'hash coincida con quello di altri usi. */
export async function sigilla(parola: string): Promise<string> {
  const dati = new TextEncoder().encode(`bianconiglio::sigillo::${parola}`);
  const impronta = await crypto.subtle.digest('SHA-256', dati);
  return Array.from(new Uint8Array(impronta))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Confronto a tempo costante.
 *
 * Con una sola password e un pubblico di una persona il rischio di timing
 * attack è teorico, ma il confronto costa niente e toglie la domanda dal tavolo.
 */
export function combacia(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let differenza = 0;
  for (let i = 0; i < a.length; i++) differenza |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return differenza === 0;
}
