import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { depositoPubblico, modoDati } from '@/lib/dati';
import { registraIngresso, type Ingresso } from '@/lib/dati/ingresso';
import { CANALI, TIPI_IDENTITA, type Canale, type TipoIdentita } from '@/lib/dominio/campagne';

// Il portone normalizzato del CRM. Ci arriva tutto quello che non è un
// webhook di Meta: il modulo del sito, la card NFC, un altro programma, o un
// nostro adattatore. La forma del payload la decidiamo noi, quindi è stabile.
//
//   POST /api/ingresso/sito
//   x-rama-firma: <hmac sha256 del corpo, con INGRESSO_SEGRETO>
//   { "identita": { "tipo": "email", "valore": "mario@example.it" },
//     "nome": "Mario", "testo": "Vorrei rifare il bagno",
//     "campagna": { "ref": "bagno-settembre" } }
//
// Se `INGRESSO_SEGRETO` non è configurato, in produzione l'endpoint risponde
// 503: meglio muto che aperto a chiunque.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function firmaValida(corpoGrezzo: string, firma: string | null): boolean {
  const segreto = process.env.INGRESSO_SEGRETO;
  if (!segreto) return false;
  if (!firma) return false;

  const atteso = createHmac('sha256', segreto).update(corpoGrezzo).digest('hex');
  const a = Buffer.from(atteso, 'utf8');
  const b = Buffer.from(firma.replace(/^sha256=/, ''), 'utf8');
  // Confronto a tempo costante: un confronto normale racconta quanto si è
  // andati vicini, un carattere alla volta.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(richiesta: Request, { params }: { params: Promise<{ canale: string }> }) {
  const { canale: canaleGrezzo } = await params;
  const canale = (CANALI as readonly string[]).includes(canaleGrezzo)
    ? (canaleGrezzo as Canale)
    : null;
  if (!canale) return NextResponse.json({ errore: 'canale sconosciuto' }, { status: 404 });

  const corpoGrezzo = await richiesta.text();
  const segreto = process.env.INGRESSO_SEGRETO;
  const demo = modoDati() === 'demo';

  if (!segreto && !demo) {
    return NextResponse.json({ errore: 'ingresso non configurato' }, { status: 503 });
  }
  // In modalità dimostrativa si lavora senza segreto: non c'è niente da
  // proteggere e serve poterci provare.
  if (segreto && !firmaValida(corpoGrezzo, richiesta.headers.get('x-rama-firma'))) {
    return NextResponse.json({ errore: 'firma non valida' }, { status: 401 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(corpoGrezzo) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ errore: 'corpo non valido' }, { status: 400 });
  }

  const identita = corpo.identita as { tipo?: string; valore?: string } | undefined;
  const tipo = identita?.tipo as TipoIdentita | undefined;
  if (!tipo || !TIPI_IDENTITA.includes(tipo) || !identita?.valore) {
    return NextResponse.json(
      { errore: 'serve identita: { tipo, valore }', tipiAmmessi: TIPI_IDENTITA },
      { status: 400 },
    );
  }

  const dep = depositoPubblico();
  // Prima si conserva quello che è arrivato, poi si prova a capirlo.
  const grezzoId = await dep.salvaIngressoGrezzo(canale, corpo);

  try {
    const ingresso: Ingresso = {
      canale,
      identita: { tipo, valore: String(identita.valore) },
      nome: typeof corpo.nome === 'string' ? corpo.nome : null,
      cognome: typeof corpo.cognome === 'string' ? corpo.cognome : null,
      testo: typeof corpo.testo === 'string' ? corpo.testo : null,
      quando: typeof corpo.quando === 'string' ? corpo.quando : undefined,
      idConversazioneEsterna: typeof corpo.conversazione === 'string' ? corpo.conversazione : null,
      campagna: (corpo.campagna as Ingresso['campagna']) ?? undefined,
      identitaExtra: Array.isArray(corpo.identitaExtra)
        ? (corpo.identitaExtra as { tipo: TipoIdentita; valore: string }[])
          .filter((i) => TIPI_IDENTITA.includes(i?.tipo) && i?.valore)
        : undefined,
      riferimento: (corpo.riferimento as Record<string, unknown>) ?? null,
    };

    const esito = await registraIngresso(dep, ingresso);
    await dep.segnaIngressoLavorato(grezzoId, 'ok', esito.contattoId);
    return NextResponse.json(esito, { status: 200 });
  } catch (errore) {
    const messaggio = errore instanceof Error ? errore.message : 'errore sconosciuto';
    await dep.segnaIngressoLavorato(grezzoId, 'errore', null, messaggio);
    console.error('[ingresso]', canale, messaggio);
    return NextResponse.json({ errore: 'ingresso non elaborato' }, { status: 500 });
  }
}
