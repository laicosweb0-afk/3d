import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';
import { dataOra, soloData } from '@/lib/formato';
import { normalizzaCodice } from '@/lib/codice';
import type { LeadCard } from '@/lib/tipi';
import { riscattaCodice } from '../azioni';

// La pagina del banco: il cliente mostra il telefono con RAMA70-XXXX, tu lo
// batti qui e sai subito se è buono, di chi è e se l'ha già usato.

export const dynamic = 'force-dynamic';

type CreditoConContatto = LeadCard & { contatti: { id: string; nome: string; email: string | null } | null };

export default async function Codice({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const cercato = q ? normalizzaCodice(q) : '';

  let credito: CreditoConContatto | null = null;
  if (cercato) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from('lead_card')
      .select('*, contatti(id, nome, email)')
      .eq('codice', cercato)
      .maybeSingle();
    credito = (data as unknown as CreditoConContatto) ?? null;
  }

  const scaduto = credito ? new Date(`${credito.scadenza}T23:59:59Z`).getTime() < Date.now() : false;

  return (
    <main>
      <header className="intestazione">
        <h1>Codice</h1>
        <p className="lede">Controlla e segna il credito che il cliente mostra al banco.</p>
      </header>

      <form className="filtri" method="get">
        <input
          type="search"
          name="q"
          defaultValue={cercato}
          placeholder="RAMA70-XXXX"
          aria-label="Codice"
          autoCapitalize="characters"
          autoComplete="off"
        />
        <button type="submit">Cerca</button>
      </form>

      {cercato && !credito && (
        <section className="scheda">
          <p className="avviso" style={{ marginBottom: 0 }}>
            Nessun credito con il codice <span className="codice">{cercato}</span>. Controlla la trascrizione: nei
            codici non ci sono mai zero, uno, I e O.
          </p>
        </section>
      )}

      {credito && (
        <section className="scheda">
          <h2 className="codice" style={{ fontSize: 22 }}>{credito.codice}</h2>
          <dl className="dati">
            <div>
              <dt>Cliente</dt>
              <dd>
                {credito.contatti ? (
                  <Link href={`/contatti/${credito.contatti.id}`}>{credito.contatti.nome}</Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>Credito</dt>
              <dd>{credito.credito_eur} €</dd>
            </div>
            <div>
              <dt>Progetto</dt>
              <dd>{credito.progetto} · stile {credito.stile.toLowerCase()}</dd>
            </div>
            <div>
              <dt>Scadenza</dt>
              <dd>{soloData(credito.scadenza)}</dd>
            </div>
          </dl>

          <div style={{ marginTop: 16 }}>
            {credito.riscattato_il ? (
              <p className="avviso" style={{ marginBottom: 0 }}>
                Già riscattato il {dataOra(credito.riscattato_il)}.
              </p>
            ) : scaduto ? (
              <p className="avviso" style={{ marginBottom: 0 }}>
                Scaduto il {soloData(credito.scadenza)}. Se lo accetti lo stesso, è una decisione tua: il CRM non lo
                segna da sé.
              </p>
            ) : (
              <form action={riscattaCodice}>
                <input type="hidden" name="codice" value={credito.codice} />
                <button type="submit">Segna come riscattato</button>
              </form>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
