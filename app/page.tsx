import { ExperienceRoot } from '@/components/ExperienceRoot';
import { JOURNEY_COPY } from '@/content/copy';

// Il layer documentale: contenuto semantico completo sotto il canvas.
// Il viaggio 3D è progressive enhancement; questo è il sito che Google
// e gli screen reader leggono.

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

      {/* S13 — stub delle sezioni finali (M4): Materiali Selezionati,
          Le Opere Realizzate (prima/dopo), Tutti i servizi, contatti */}
      <section className="s13" id="contatti">
        <p className="s13-kicker">Mondial Service</p>
        <h2 className="s13-title">La prossima trasformazione può essere casa tua.</h2>
        <div className="s13-ctas">
          <a className="btn btn--primary" href="mailto:info@mondialservice.example">Contattaci</a>
          <a className="btn btn--ghost" href="#contenuti">Tutti i servizi</a>
        </div>
        <p className="s13-note">Materiali, opere realizzate (prima/dopo) e contatti arrivano con la milestone M4.</p>
      </section>
    </main>
  );
}
