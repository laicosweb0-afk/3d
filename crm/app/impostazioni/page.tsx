import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';
import { type Profilo } from '@/lib/tipi';

export const dynamic = 'force-dynamic';

export default async function Impostazioni() {
  const supabase = await supabaseServer();
  const [{ data: profiliGrezzi }, { count: quantiContatti }, { count: quantiCrediti }] = await Promise.all([
    supabase.from('profili').select('id, nome, ruolo, attivo').order('nome'),
    supabase.from('contatti').select('id', { count: 'exact', head: true }),
    supabase.from('lead_card').select('id', { count: 'exact', head: true }),
  ]);
  const profili = (profiliGrezzi ?? []) as unknown as Profilo[];

  return (
    <main>
      <header className="intestazione">
        <h1>Impostazioni</h1>
        <p className="lede">Chi entra, quanto c&apos;è dentro, come si porta via.</p>
      </header>

      <section className="scheda">
        <h2>Chi ha accesso</h2>
        {profili.map((profilo) => (
          <div key={profilo.id} className="riga">
            <div className="cresce">
              <div className="nome">{profilo.nome || 'senza nome'}</div>
              <div className="sotto">{profilo.ruolo}</div>
            </div>
            {!profilo.attivo && <span className="pastiglia perso">disattivato</span>}
          </div>
        ))}
        <p className="nota-piede" style={{ marginTop: 10 }}>
          Gli account non si creano da qui: si invitano dal pannello Supabase (Authentication → Users → Invite). La
          registrazione libera è disattivata apposta.
        </p>
      </section>

      <section className="scheda">
        <h2>I dati</h2>
        <dl className="dati">
          <div><dt>Contatti</dt><dd>{quantiContatti ?? 0}</dd></div>
          <div><dt>Crediti Club Rama</dt><dd>{quantiCrediti ?? 0}</dd></div>
        </dl>
        <p style={{ marginTop: 14 }}>
          <a className="bottone bottone-secondario" href="/api/export">Scarica i contatti in CSV</a>
        </p>
        <p className="nota-piede">
          Il CSV si apre in Excel e in Fogli Google: è la garanzia che questi dati restano del cliente, qualunque cosa
          succeda a questo programma.
        </p>
      </section>

      <p className="nota-piede"><Link href="/contatti">← Contatti</Link></p>
    </main>
  );
}
