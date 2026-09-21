import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { depositoPubblico } from '@/lib/dati';
import { registraIngresso } from '@/lib/dati/ingresso';
import { traduciMessenger } from '@/lib/canali/messenger';
import { traduciWhatsApp } from '@/lib/canali/whatsapp';

// I webhook di Meta: Messenger, Instagram, WhatsApp.
//
// **Stato onesto:** questo endpoint è pronto e collaudato sulla forma dei
// payload documentata da Meta, ma **non è ancora collegato a nessun account**:
// servono l'app Meta, i permessi approvati e i token. Cosa manca, e chi deve
// farlo, sta in CAMPAIGN_INTEGRATION_PLAN.md e INTEGRATIONS.md.
//
// Finché `META_VERIFY_TOKEN` e `META_APP_SECRET` non sono configurati,
// l'endpoint risponde 503: non finge di funzionare.
//
// Il GET è la stretta di mano che Meta fa quando si iscrive il webhook.
// Il POST conserva sempre il payload grezzo **prima** di tradurlo: se la
// traduzione sbaglia una chiave, il messaggio del cliente non va perso.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CANALI_META = ['messenger', 'instagram', 'whatsapp'] as const;
type CanaleMeta = (typeof CANALI_META)[number];

const canaleValido = (c: string): c is CanaleMeta => (CANALI_META as readonly string[]).includes(c);

// Meta firma il corpo con l'app secret: senza questo controllo chiunque
// potrebbe riempire il CRM di finti clienti.
function firmaMetaValida(corpoGrezzo: string, firma: string | null): boolean {
  const segreto = process.env.META_APP_SECRET;
  if (!segreto || !firma) return false;
  const atteso = `sha256=${createHmac('sha256', segreto).update(corpoGrezzo).digest('hex')}`;
  const a = Buffer.from(atteso, 'utf8');
  const b = Buffer.from(firma, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(richiesta: Request, { params }: { params: Promise<{ canale: string }> }) {
  const { canale } = await params;
  if (!canaleValido(canale)) return new NextResponse('canale sconosciuto', { status: 404 });

  const verifica = process.env.META_VERIFY_TOKEN;
  if (!verifica) return new NextResponse('webhook non configurato', { status: 503 });

  const url = new URL(richiesta.url);
  const modo = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const sfida = url.searchParams.get('hub.challenge');

  if (modo === 'subscribe' && token === verifica && sfida) {
    // Meta si aspetta indietro la sfida in chiaro, nient'altro.
    return new NextResponse(sfida, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new NextResponse('verifica fallita', { status: 403 });
}

export async function POST(richiesta: Request, { params }: { params: Promise<{ canale: string }> }) {
  const { canale } = await params;
  if (!canaleValido(canale)) return new NextResponse('canale sconosciuto', { status: 404 });

  const corpoGrezzo = await richiesta.text();
  const adattatoreAcceso = process.env.META_ADATTATORI === 'attivo';

  if (!process.env.META_APP_SECRET && !adattatoreAcceso) {
    return new NextResponse('webhook non configurato', { status: 503 });
  }
  if (process.env.META_APP_SECRET
      && !firmaMetaValida(corpoGrezzo, richiesta.headers.get('x-hub-signature-256'))) {
    return new NextResponse('firma non valida', { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(corpoGrezzo);
  } catch {
    return new NextResponse('corpo non valido', { status: 400 });
  }

  const dep = depositoPubblico();
  const grezzoId = await dep.salvaIngressoGrezzo(canale, corpo);

  try {
    const ingressi = canale === 'whatsapp'
      ? traduciWhatsApp(corpo)
      : traduciMessenger(corpo, canale);

    if (ingressi.length === 0) {
      // Meta manda anche notifiche che non sono messaggi (consegne, letture):
      // si conservano e si tirano avanti.
      await dep.segnaIngressoLavorato(grezzoId, 'ignorato');
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    let ultimoContatto: string | null = null;
    for (const ingresso of ingressi) {
      const esito = await registraIngresso(dep, ingresso);
      ultimoContatto = esito.contattoId;
    }
    await dep.segnaIngressoLavorato(grezzoId, 'ok', ultimoContatto);
  } catch (errore) {
    const messaggio = errore instanceof Error ? errore.message : 'errore sconosciuto';
    await dep.segnaIngressoLavorato(grezzoId, 'errore', null, messaggio);
    console.error('[webhook]', canale, messaggio);
    // A Meta si risponde comunque 200: un errore nostro non deve far
    // ritentare all'infinito, e il payload è già al sicuro nella coda.
  }

  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}
