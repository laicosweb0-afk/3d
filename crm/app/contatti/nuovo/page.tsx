import Link from 'next/link';
import { creaContatto } from '../../azioni';

// Non tutti passano dalla card: chi entra in negozio e lascia il numero va
// scritto qui.

export const dynamic = 'force-dynamic';

export default async function NuovoContatto({
  searchParams,
}: {
  searchParams: Promise<{ avviso?: string }>;
}) {
  const { avviso } = await searchParams;

  return (
    <main>
      <header className="intestazione">
        <h1>Nuovo contatto</h1>
        <p className="lede">Chi è passato in showroom o ha chiamato.</p>
      </header>

      {avviso === 'errore' && <p className="avviso">Non è stato possibile salvare. Controlla i dati e riprova.</p>}

      <section className="scheda">
        <form action={creaContatto}>
          <div className="campo">
            <label htmlFor="nome">Nome</label>
            <input id="nome" name="nome" type="text" required minLength={2} />
          </div>
          <div className="campi-affiancati">
            <div className="campo">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" />
            </div>
            <div className="campo">
              <label htmlFor="telefono">Telefono</label>
              <input id="telefono" name="telefono" type="tel" />
            </div>
          </div>
          <div className="campo">
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'inherit' }}>
              <input type="checkbox" name="consenso" style={{ width: 'auto', marginTop: 3 }} />
              <span style={{ fontSize: 13.5 }}>
                Ha dato il consenso a ricevere comunicazioni promozionali. Spuntalo solo se te l&apos;ha detto davvero:
                la data del consenso viene registrata.
              </span>
            </label>
          </div>
          <div className="azioni">
            <button type="submit">Salva</button>
            <Link href="/contatti" className="bottone bottone-secondario">Annulla</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
