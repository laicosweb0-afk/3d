import { ExperienceRoot } from '@/components/ExperienceRoot';
import { BeforeAfter } from '@/components/dom/BeforeAfter';
import { MaterialChips } from '@/components/dom/MaterialChips';
import { JOURNEY_COPY } from '@/content/copy';
import { COMPANY, SERVICES, OPERE } from '@/content/company';
import { CHAPTERS } from '@/lib/scenes';

// Dopo il viaggio, le sezioni: il metodo (i capitoli appena vissuti),
// le opere (prima/dopo dal mondo 3D), i materiali, i servizi, i contatti.
// Tutto è documento semantico reale: il canvas sopra è solo il cinema.

const METODO = [
  { fase: CHAPTERS[0], testo: 'Sopralluogo, rilievo e progetto esecutivo. Prima di toccare un muro, sappiamo esattamente cosa faremo.' },
  { fase: CHAPTERS[1], testo: 'Il cantiere, condotto sotto un’unica regia: demolizioni, struttura, superfici, finiture.' },
  { fase: CHAPTERS[2], testo: 'Isolamento, impianti, stratigrafie: la parte del lavoro che non vedrai mai, fatta come se si vedesse.' },
  { fase: CHAPTERS[3], testo: 'La consegna: ambienti finiti, garantiti, pronti da vivere.' },
];

export default function Page() {
  return (
    <main>
      <ExperienceRoot />

      <article className="document" id="contenuti">
        <h2 className="visually-hidden">Mondial Service — i nostri servizi</h2>
        {JOURNEY_COPY.map((c, i) => (
          <section key={i} className="visually-hidden">
            {c.kicker && <h3>{c.kicker}</h3>}
            <h4>{c.title}</h4>
            {c.body && <p>{c.body}</p>}
          </section>
        ))}
      </article>

      {/* Il metodo — i quattro capitoli appena vissuti */}
      <section className="sez" id="metodo">
        <p className="sez-kicker">Il metodo</p>
        <h2 className="sez-title">Quello che hai appena visto è come lavoriamo.</h2>
        <ol className="metodo-grid">
          {METODO.map((m, i) => (
            <li key={m.fase}>
              <span className="metodo-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{m.fase}</h3>
              <p>{m.testo}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Le opere — prima/dopo dal mondo 3D, stessa camera, due stati */}
      <section className="sez sez--scura" id="opere">
        <p className="sez-kicker">Le opere</p>
        <h2 className="sez-title">Dal progetto alla consegna.</h2>
        <p className="sez-sub">Trascina il cursore: stessa inquadratura, prima e dopo il nostro lavoro.</p>
        <div className="opere-grid">
          {OPERE.map((o) => (
            <div className="opera" key={o.id}>
              <BeforeAfter
                before={`/assets/opere/${o.id}-progetto.jpg`}
                after={`/assets/opere/${o.id}-consegna.jpg`}
                alt={o.titolo}
              />
              <h3>{o.titolo}</h3>
              <p>{o.sotto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Materiali selezionati */}
      <section className="sez" id="materiali">
        <p className="sez-kicker">Materiali selezionati</p>
        <h2 className="sez-title">La materia con cui costruiamo.</h2>
        <MaterialChips />
      </section>

      {/* Tutti i servizi — indice minimale sui tre pilastri */}
      <section className="sez" id="servizi">
        <p className="sez-kicker">Tutti i servizi</p>
        <h2 className="sez-title">Ristrutturazioni · Impianti · Servizi</h2>
        <div className="servizi-grid">
          {SERVICES.map((s) => (
            <div key={s.pillar}>
              <h3>{s.pillar}</h3>
              <ul>
                {s.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Garanzie */}
      <section className="sez sez--scura" id="garanzie">
        <p className="sez-kicker">Perché Mondial Service</p>
        <div className="claims-grid">
          {COMPANY.claims.map((c) => (
            <div key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contatti + CTA finale */}
      <section className="s13" id="contatti">
        <p className="s13-kicker">Mondial Service</p>
        <h2 className="s13-title">La prossima trasformazione può essere casa tua.</h2>
        <div className="s13-ctas">
          <a className="btn btn--primary" href={COMPANY.whatsappHref}>Scrivici su WhatsApp</a>
          <a className="btn btn--ghost" href={COMPANY.phoneHref}>{COMPANY.phone}</a>
        </div>
        <address className="contatti-info">
          {COMPANY.address}
          {' · '}
          <a className="maps-link" href={COMPANY.mapsHref} target="_blank" rel="noopener">
            Apri in Maps ↗
          </a>
          <br />
          Disponibili 24 ore su 24, 7 giorni su 7.
        </address>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} {COMPANY.name}</span>
        {COMPANY.piva && <span>P.IVA {COMPANY.piva}</span>}
        <span>{COMPANY.address}</span>
        <a href={COMPANY.phoneHref}>{COMPANY.phone}</a>
        <a href={COMPANY.website} rel="noopener">www.mondialservicesrl.it</a>
      </footer>
    </main>
  );
}
