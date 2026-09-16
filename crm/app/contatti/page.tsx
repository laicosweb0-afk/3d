import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';
import { dataOra } from '@/lib/formato';
import { ETICHETTE_STATO, STATI, type Contatto, type StatoContatto } from '@/lib/tipi';

// La rubrica. Ricerca per nome o email, filtro per stato, e l'export CSV
// (portabilità dei dati: il cliente resta padrone della sua lista).

export const dynamic = 'force-dynamic';

const AVVISI: Record<string, string> = {
  eliminato: 'Contatto eliminato con tutto il suo storico.',
};

export default async function Contatti({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stato?: string; avviso?: string }>;
}) {
  const parametri = await searchParams;
  const supabase = await supabaseServer();

  // I caratteri che in PostgREST hanno un significato loro vanno tolti, o una
  // ricerca innocua diventa una query rotta.
  const cerca = (parametri.q ?? '').trim().replace(/[,()*%\\]/g, '').slice(0, 80);
  const stato = STATI.includes(parametri.stato as StatoContatto) ? (parametri.stato as StatoContatto) : null;

  let query = supabase
    .from('contatti')
    .select('id, nome, email, telefono, stato, creato_il, provenienza')
    .order('creato_il', { ascending: false })
    .limit(200);

  if (cerca) query = query.or(`nome.ilike.%${cerca}%,email.ilike.%${cerca}%`);
  if (stato) query = query.eq('stato', stato);

  const { data } = await query;
  const contatti = (data ?? []) as unknown as Pick<
    Contatto,
    'id' | 'nome' | 'email' | 'telefono' | 'stato' | 'creato_il' | 'provenienza'
  >[];

  return (
    <main>
      <header className="intestazione">
        <h1>Contatti</h1>
        <p className="lede">{contatti.length === 200 ? 'Primi 200 risultati' : `${contatti.length} in elenco`}.</p>
      </header>

      {parametri.avviso && AVVISI[parametri.avviso] && <p className="avviso">{AVVISI[parametri.avviso]}</p>}

      <form className="filtri" method="get">
        <input type="search" name="q" defaultValue={cerca} placeholder="Nome o email" aria-label="Cerca" />
        <select name="stato" defaultValue={stato ?? ''} aria-label="Stato">
          <option value="">Tutti gli stati</option>
          {STATI.map((s) => (
            <option key={s} value={s}>{ETICHETTE_STATO[s]}</option>
          ))}
        </select>
        <button type="submit" className="bottone-secondario">Filtra</button>
        <Link href="/contatti/nuovo" className="bottone">Nuovo</Link>
      </form>

      <section className="scheda">
        {contatti.length === 0 && <p className="vuoto">Nessun contatto con questi filtri.</p>}
        {contatti.map((contatto) => (
          <Link key={contatto.id} href={`/contatti/${contatto.id}`} className="riga">
            <div className="cresce">
              <div className="nome">{contatto.nome}</div>
              <div className="sotto">
                {contatto.email ?? contatto.telefono ?? 'nessun recapito'} · {dataOra(contatto.creato_il)}
              </div>
            </div>
            <span className={`pastiglia ${contatto.stato}`}>{ETICHETTE_STATO[contatto.stato]}</span>
          </Link>
        ))}
      </section>

      <p className="nota-piede">
        <a href="/api/export">Scarica tutto in CSV</a> · <Link href="/impostazioni">Impostazioni</Link>
      </p>
    </main>
  );
}
