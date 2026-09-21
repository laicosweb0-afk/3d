import Link from 'next/link';
import { deposito, modoDati } from '@/lib/dati';
import { SOGLIE } from '@/lib/dominio/priorita';
import { GIORNI } from '@/lib/dominio/automazioni';
import { euro } from '@/lib/dominio/etichette';
import { valorePipeline } from '@/lib/dati/istantanea';

export const dynamic = 'force-dynamic';

export default async function Impostazioni() {
  const dep = await deposito();
  const [dati, operatori] = await Promise.all([dep.istantanea(), dep.operatori()]);

  return (
    <main>
      <header className="testata-pagina">
        <div>
          <h1>Impostazioni</h1>
          <p className="lede">Chi entra, quanto c&apos;è dentro, con che regole lavora il CRM.</p>
        </div>
      </header>

      <div className="colonne-pari">
        <section className="sezione" style={{ marginTop: 0 }}>
          <h2>Chi ha accesso</h2>
          <div className="scheda scheda-fitta">
            {operatori.length === 0 && <p className="elenco-vuoto">Nessun profilo registrato.</p>}
            {operatori.map((o) => (
              <div key={o.id} className="riga">
                <span className="cresce"><span className="titolo">{o.nome}</span></span>
              </div>
            ))}
            <p className="nota-piede" style={{ padding: '10px 0 2px' }}>
              Gli account non si creano da qui: si invitano dal pannello Supabase (Authentication → Users → Invite).
              La registrazione libera è disattivata apposta — a questo CRM accedete in due, e nessun cliente deve
              sapere che esiste.
            </p>
          </div>
        </section>

        <section className="sezione" style={{ marginTop: 0 }}>
          <h2>I dati</h2>
          <div className="scheda">
            <dl className="dati">
              <div><dt>Contatti</dt><dd>{dati.contatti.length}</dd></div>
              <div><dt>Opportunità</dt><dd>{dati.opportunita.length}</dd></div>
              <div><dt>Azioni aperte</dt><dd>{dati.azioni.filter((a) => !a.fattaIl).length}</dd></div>
              <div><dt>Eventi in timeline</dt><dd>{dati.eventi.length}</dd></div>
              <div><dt>Valore in pipeline</dt><dd>{euro(valorePipeline(dati))}</dd></div>
              <div><dt>Modalità</dt><dd>{modoDati() === 'demo' ? 'dimostrativa' : 'dati reali (Supabase)'}</dd></div>
            </dl>
            <p style={{ marginTop: 14, marginBottom: 6 }}>
              <a className="bottone bottone-fantasma" href="/api/export">Scarica i contatti in CSV</a>
            </p>
            <p className="nota-piede" style={{ marginBottom: 0 }}>
              Il CSV si apre in Excel e in Fogli Google: è la garanzia che questi dati restano di Rama, qualunque
              cosa succeda a questo programma.
            </p>
          </div>
        </section>
      </div>

      <section className="sezione">
        <h2>Le regole che il CRM applica da solo</h2>
        <div className="scheda">
          <dl className="dati">
            <div><dt>Diventa urgente</dt><dd>azione scaduta o in scadenza oggi, o silenzio da {SOGLIE.silenzioGrave} giorni</dd></div>
            <div><dt>Si alza di livello</dt><dd>sopra {euro(SOGLIE.valoreAlto)} o silenzio da {SOGLIE.silenzioLungo} giorni</dd></div>
            <div><dt>Dopo un preventivo</dt><dd>follow-up a {GIORNI.followUpPreventivo} giorni</dd></div>
            <div><dt>Dopo un campione</dt><dd>richiamo per il rientro a {GIORNI.rientroCampione} giorni</dd></div>
            <div><dt>Dopo un appuntamento</dt><dd>preparare il preventivo il giorno dopo</dd></div>
            <div><dt>Nuovo lead</dt><dd>rispondere oggi</dd></div>
          </dl>
          <p className="nota-piede" style={{ marginTop: 12, marginBottom: 0 }}>
            Nessuna di queste regole manda messaggi a nessuno: aprono promemoria. Il giorno che servirà un invio
            automatico, si aggancia qui — in <code>lib/dominio/automazioni.ts</code> — senza toccare le pagine.
          </p>
        </div>
      </section>

      <p className="nota-piede"><Link href="/contatti">← Contatti</Link></p>
    </main>
  );
}
