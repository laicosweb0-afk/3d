import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { rigaCsv } from '@/lib/formato';
import { ETICHETTE_PROVENIENZA, ETICHETTE_STATO, type Contatto, type LeadCard } from '@/lib/tipi';

// Export CSV dei contatti, con l'ultimo credito accanto. Passa dal client
// dell'utente collegato: senza sessione, le regole di riga non restituiscono
// niente e la rotta risponde 401.

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await supabaseServer();
  const { data: sessione } = await supabase.auth.getUser();
  if (!sessione.user) return NextResponse.json({ errore: 'non autorizzato' }, { status: 401 });

  const { data } = await supabase
    .from('contatti')
    .select('*, lead_card(codice, progetto, stile, scadenza, riscattato_il, creato_il)')
    .order('creato_il', { ascending: false })
    // Senza questo, il credito accanto al contatto sarebbe uno a caso fra i
    // suoi: così è l'ultimo preso.
    .order('creato_il', { referencedTable: 'lead_card', ascending: false });

  const contatti = (data ?? []) as unknown as (Contatto & { lead_card: Partial<LeadCard>[] })[];

  const righe = [
    rigaCsv([
      'Nome', 'Email', 'Telefono', 'Stato', 'Provenienza', 'Consenso', 'Data consenso',
      'Tag', 'Creato il', 'Ultimo contatto', 'Codice', 'Progetto', 'Stile', 'Scadenza codice', 'Riscattato il',
    ]),
    ...contatti.map((c) => {
      const ultimo = c.lead_card?.[0];
      return rigaCsv([
        c.nome, c.email, c.telefono, ETICHETTE_STATO[c.stato], ETICHETTE_PROVENIENZA[c.provenienza],
        c.consenso_marketing ? 'sì' : 'no', c.consenso_il, c.tag?.join(' '), c.creato_il, c.ultimo_contatto_il,
        ultimo?.codice ?? '', ultimo?.progetto ?? '', ultimo?.stile ?? '', ultimo?.scadenza ?? '',
        ultimo?.riscattato_il ?? '',
      ]);
    }),
  ];

  const oggi = new Date().toISOString().slice(0, 10);
  // Il BOM serve a Excel: senza, le lettere accentate escono storte.
  return new NextResponse(`﻿${righe.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contatti-rama-${oggi}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
