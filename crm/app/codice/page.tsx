import Link from 'next/link';
import { modoDati } from '@/lib/dati';
import { supabaseServer } from '@/lib/supabase-server';
import { dataOra, soloData } from '@/lib/formato';
import { normalizzaCodice } from '@/lib/codice';
import { riscattaCodice } from '../azioni-codice';

// Il banco: il cliente mostra RAMA70-XXXX sul telefono, tu lo batti qui e sai
// subito di chi è, quanto vale, se è scaduto o già usato. Il credito della
// card vive sulle sue tabelle, non nel CRM: qui si legge e si segna.

export const dynamic = 'force-dynamic';

type Credito = {
  codice: string;
  credito_eur: number;
  scadenza: string;
  riscattato_il: string | null;
  progetto: string;
  stile: string;
  contatti: { id: string; nome: string; cognome: string | null } | null;
};

export default async function Codice({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const cercato = q ? normalizzaCodice(q) : '';
  const demo = modoDati() === 'demo';

  let credito: Credito | null = null;
  if (cercato && !demo) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from('lead_card')
      .select('codice, credito_eur, scadenza, riscattato_il, progetto, stile, contatti(id, nome, cognome)')
      .eq('codice', cercato)
      .maybeSingle();
    credito = (data as unknown as Credito) ?? null;
  }

  const scaduto = credito ? new Date(`${credito.scadenza}T23:59:59Z`).getTime() < Date.now() : false;

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Codice</h1>
          <p className="lede">Controlla e segna il credito del Club Rama che il cliente mostra al banco.</p>
        </div>
      </header>

      {demo ? (
        <div className="scheda">
          <p className="avviso giallo" style={{ marginBottom: 12 }}>
            I crediti della card vivono sul database vero: in modalità dimostrativa non c&apos;è niente da cercare.
          </p>
          <p className="nota-piede" style={{ marginBottom: 0 }}>
            Con Supabase collegato, questa pagina cerca il codice fra quelli generati dalla card NFC
            (<Link href="/impostazioni">impostazioni</Link>), mostra di chi è e lo segna riscattato con un tocco.
            I contatti arrivati dalla card li trovi comunque in <Link href="/contatti?fonte=card_nfc">Contatti</Link>.
          </p>
        </div>
      ) : (
        <>
          <form className="filtri" method="get">
            <input
              type="search" name="q" defaultValue={cercato} placeholder="RAMA70-XXXX"
              aria-label="Codice" autoCapitalize="characters" autoComplete="off"
            />
            <button type="submit">Cerca</button>
          </form>

          {cercato && !credito && (
            <div className="scheda">
              <p className="avviso rosso" style={{ marginBottom: 0 }}>
                Nessun credito con il codice <span className="mono">{cercato}</span>. Controlla la trascrizione:
                nei codici non ci sono mai zero, uno, I e O.
              </p>
            </div>
          )}

          {credito && (
            <div className="scheda">
              <h2 className="mono" style={{ fontSize: 22, color: 'var(--ink)', letterSpacing: 0, textTransform: 'none' }}>
                {credito.codice}
              </h2>
              <dl className="dati">
                <div>
                  <dt>Cliente</dt>
                  <dd>
                    {credito.contatti
                      ? <Link href={`/contatti/${credito.contatti.id}`}>
                          {credito.contatti.nome} {credito.contatti.cognome ?? ''}
                        </Link>
                      : '—'}
                  </dd>
                </div>
                <div><dt>Credito</dt><dd>{credito.credito_eur} €</dd></div>
                <div><dt>Progetto</dt><dd>{credito.progetto} · stile {credito.stile.toLowerCase()}</dd></div>
                <div><dt>Scadenza</dt><dd>{soloData(credito.scadenza)}</dd></div>
              </dl>

              <div style={{ marginTop: 16 }}>
                {credito.riscattato_il ? (
                  <p className="avviso verde" style={{ marginBottom: 0 }}>
                    Già riscattato il {dataOra(credito.riscattato_il)}.
                  </p>
                ) : scaduto ? (
                  <p className="avviso giallo" style={{ marginBottom: 0 }}>
                    Scaduto il {soloData(credito.scadenza)}. Se lo accetti lo stesso è una decisione tua: il CRM non
                    lo segna da sé.
                  </p>
                ) : (
                  <form action={riscattaCodice}>
                    <input type="hidden" name="codice" value={credito.codice} />
                    <button type="submit" className="bottone-oro">Segna come riscattato</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
