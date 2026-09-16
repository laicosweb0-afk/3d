import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase-server';
import { dataOra, inRitardo, quando } from '@/lib/formato';
import { ETICHETTE_TIPO, TIPI_ATTIVITA, type Attivita, type Contatto, type TipoAttivita } from '@/lib/tipi';
import { creaAttivita, segnaAttivitaFatta } from './azioni';

// La prima cosa che si vede aprendo il CRM: chi va richiamato oggi e chi è
// arrivato dalla card e non ha ancora sentito nessuno.

export const dynamic = 'force-dynamic';

type AttivitaConContatto = Attivita & { contatti: { nome: string } | null };

export default async function Oggi() {
  const supabase = await supabaseServer();

  const [{ data: daFare }, { data: nuovi }] = await Promise.all([
    supabase
      .from('attivita')
      .select('id, titolo, tipo, scadenza, contatto_id, contatti(nome)')
      .is('fatta_il', null)
      .order('scadenza', { ascending: true })
      .limit(30),
    supabase
      .from('contatti')
      .select('id, nome, email, creato_il, provenienza')
      .eq('stato', 'nuovo')
      .order('creato_il', { ascending: false })
      .limit(8),
  ]);

  const attivita = (daFare ?? []) as unknown as AttivitaConContatto[];
  const leadNuovi = (nuovi ?? []) as unknown as Pick<Contatto, 'id' | 'nome' | 'email' | 'creato_il' | 'provenienza'>[];
  const scadute = attivita.filter((a) => inRitardo(a.scadenza));

  return (
    <main>
      <header className="intestazione">
        <p className="occhiello">Club Rama</p>
        <h1>Oggi</h1>
        <p className="lede">
          {attivita.length === 0
            ? 'Niente in sospeso.'
            : `${attivita.length} ${attivita.length === 1 ? 'cosa da fare' : 'cose da fare'}${scadute.length ? `, ${scadute.length} in ritardo` : ''}.`}
        </p>
      </header>

      <section className="scheda">
        <h2>Da fare</h2>
        {attivita.length === 0 && <p className="vuoto">Nessun promemoria aperto.</p>}
        {attivita.map((voce) => (
          <div key={voce.id} className="riga">
            <div className="cresce">
              <div className="nome">{voce.titolo}</div>
              <div className="sotto">
                {ETICHETTE_TIPO[voce.tipo as TipoAttivita]} · {quando(voce.scadenza)}
                {voce.contatti?.nome ? ` · ${voce.contatti.nome}` : ''}
              </div>
            </div>
            {inRitardo(voce.scadenza) && <span className="pastiglia ritardo">in ritardo</span>}
            {voce.contatto_id && (
              <Link href={`/contatti/${voce.contatto_id}`} className="bottone bottone-secondario bottone-minuto">
                Apri
              </Link>
            )}
            <form action={segnaAttivitaFatta}>
              <input type="hidden" name="id" value={voce.id} />
              <button type="submit" className="bottone-minuto">Fatto</button>
            </form>
          </div>
        ))}
      </section>

      <section className="scheda">
        <h2>Arrivati e mai sentiti</h2>
        {leadNuovi.length === 0 && <p className="vuoto">Nessun contatto in attesa.</p>}
        {leadNuovi.map((contatto) => (
          <Link key={contatto.id} href={`/contatti/${contatto.id}`} className="riga">
            <div className="cresce">
              <div className="nome">{contatto.nome}</div>
              <div className="sotto">{contatto.email ?? 'senza email'} · {dataOra(contatto.creato_il)}</div>
            </div>
            <span className="pastiglia nuovo">nuovo</span>
          </Link>
        ))}
      </section>

      <section className="scheda">
        <h2>Aggiungi un promemoria</h2>
        <form action={creaAttivita}>
          <div className="campo">
            <label htmlFor="titolo">Cosa</label>
            <input id="titolo" name="titolo" type="text" required placeholder="Richiamare la signora Bianchi" />
          </div>
          <div className="campi-affiancati">
            <div className="campo">
              <label htmlFor="tipo">Tipo</label>
              <select id="tipo" name="tipo" defaultValue="chiamata">
                {TIPI_ATTIVITA.map((tipo) => (
                  <option key={tipo} value={tipo}>{ETICHETTE_TIPO[tipo]}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="scadenza">Quando</label>
              <input id="scadenza" name="scadenza" type="datetime-local" />
            </div>
          </div>
          <button type="submit">Aggiungi</button>
        </form>
      </section>
    </main>
  );
}
