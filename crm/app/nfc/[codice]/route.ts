import { NextResponse } from 'next/server';
import { depositoPubblico } from '@/lib/dati';
import { destinazionePredefinita, normalizzaCodiceCard } from '@/lib/dominio/card';

// L'indirizzo scritto dentro il chip della card: /nfc/bancone-01
//
// Chi appoggia il telefono passa di qui per un istante e finisce sulla pagina
// di sempre. Nel frattempo il CRM segna il passaggio e attacca al link da
// dove è arrivato, così se poi quella persona lascia il nome sappiamo **quale
// card** l'ha portata — che è l'unica ragione per cui questa rotta esiste.
//
// Tre cose che questa rotta non fa, apposta:
//
//   • non crea un contatto. Un tocco non è una persona: tanta gente appoggia
//     il telefono per curiosità e se ne va. Contarli come lead gonfierebbe i
//     numeri e renderebbe inutile l'unico dato che conta (quanti lasciano il
//     nome davvero);
//   • non mette cookie e non traccia nessuno. Conta un numero su una card,
//     non segue una persona;
//   • non fa aspettare. Se il conteggio fallisce, il cliente va avanti lo
//     stesso: il suo viaggio vale più della nostra statistica.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(richiesta: Request, { params }: { params: Promise<{ codice: string }> }) {
  const { codice: grezzo } = await params;
  const codice = normalizzaCodiceCard(grezzo);
  const url = new URL(richiesta.url);

  // Si legge con la chiave di servizio: chi tocca la card non è entrato nel
  // CRM e non deve entrarci. La tabella resta chiusa a chiunque altro.
  const dep = depositoPubblico();
  const card = codice ? await dep.trovaCardPerCodice(codice) : null;

  // Card sconosciuta o spenta: si manda avanti comunque alla pagina del Club,
  // senza attribuzione. Una card in mano a un cliente non deve mai finire su
  // una pagina di errore per un problema nostro.
  if (!card || !card.attiva) {
    return NextResponse.redirect(new URL(destinazionePredefinita(), url.origin), 307);
  }

  try {
    await dep.registraToccoCard(card.id);
  } catch (errore) {
    console.error('[nfc] tocco non registrato', codice, errore);
  }

  // La destinazione può essere un indirizzo intero (una landing fatta apposta)
  // o un percorso interno. In tutti e due i casi l'attribuzione viaggia nel
  // link, così il modulo la ritrova e la manda al CRM insieme al nome.
  const destinazione = new URL(card.destinazione || destinazionePredefinita(), url.origin);
  destinazione.searchParams.set('card', card.codice);
  destinazione.searchParams.set('utm_source', 'nfc');
  destinazione.searchParams.set('utm_medium', 'card');
  if (card.luogo) destinazione.searchParams.set('utm_content', card.codice);
  if (card.campagnaId) destinazione.searchParams.set('campagna', card.campagnaId);

  return NextResponse.redirect(destinazione, 307);
}
