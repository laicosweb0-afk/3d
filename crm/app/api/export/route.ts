import { NextResponse } from 'next/server';
import { deposito, modoDati } from '@/lib/dati';
import { elenco } from '@/lib/dati/istantanea';
import { rigaCsv } from '@/lib/formato';
import { nomeFonte } from '@/lib/dominio/fonti';
import { nomeFase } from '@/lib/dominio/fasi';
import { ETICHETTA_AZIONE, ETICHETTA_INTERESSE } from '@/lib/dominio/etichette';
import { supabaseServer } from '@/lib/supabase-server';

// L'export CSV: portabilità dei dati, e insieme la prova che il CRM non è una
// scatola chiusa. Passa dalle stesse regole delle pagine.

export const dynamic = 'force-dynamic';

export async function GET() {
  if (modoDati() === 'supabase') {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ errore: 'non autorizzato' }, { status: 401 });
  }

  const dati = await (await deposito()).istantanea();
  const righe = elenco(dati, { ordine: 'nome' });

  const csv = [
    rigaCsv([
      'Nome', 'Cognome', 'Telefono', 'Email', 'Città', 'Provincia', 'Fonte', 'Dettaglio fonte',
      'Fase', 'Lavoro', 'Valore', 'Priorità', 'Prossima azione', 'Tipo azione', 'Scadenza',
      'Giorni di silenzio', 'Consenso', 'Data consenso', 'Tag', 'Entrato il',
    ]),
    ...righe.map((c) => rigaCsv([
      c.nome, c.cognome, c.telefono, c.email, c.citta, c.provincia,
      nomeFonte(c.fonte), c.fonteDettaglio, nomeFase(c.fase),
      c.interesse ? ETICHETTA_INTERESSE[c.interesse] : '',
      c.valore || '', c.priorita,
      c.prossimaAzione?.descrizione ?? '',
      c.prossimaAzione ? ETICHETTA_AZIONE[c.prossimaAzione.tipo] : '',
      c.prossimaAzione?.scadenza ?? '',
      c.giorniDiSilenzio,
      c.consensoMarketing ? 'sì' : 'no', c.consensoIl, c.tag.join(' '), c.creatoIl,
    ])),
  ];

  const oggi = new Date().toISOString().slice(0, 10);
  // Il BOM serve a Excel: senza, le lettere accentate escono storte.
  return new NextResponse(`﻿${csv.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contatti-rama-${oggi}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
