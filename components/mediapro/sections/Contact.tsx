'use client';

import { BRAND, CONTACT } from '../content';

export function Contact() {
  // Sito statico: il form apre il client di posta con il messaggio già pronto.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const subject = encodeURIComponent(`Nuovo progetto — ${data.get('nome')}`);
    const body = encodeURIComponent(
      `Nome: ${data.get('nome')}\nEmail: ${data.get('email')}\n\n${data.get('messaggio')}`
    );
    window.location.href = `mailto:${BRAND.email}?subject=${subject}&body=${body}`;
  };

  return (
    <section className="mp-section mp-contatti" id="contatti">
      <div className="mp-contatti-inner">
        <div>
          <p className="mp-kicker mp-reveal">{CONTACT.kicker}</p>
          <h2 className="mp-contatti-title mp-reveal">{CONTACT.title}</h2>
          <p className="mp-sub mp-reveal">{CONTACT.sub}</p>
          <div className="mp-channels">
            {CONTACT.channels.map((c) => (
              <a
                key={c.label}
                className="mp-channel mp-reveal"
                href={c.href}
                target="_blank"
                rel="noopener"
              >
                <span>{c.label}</span>
                <span>→</span>
              </a>
            ))}
          </div>
        </div>

        <form className="mp-form mp-reveal" onSubmit={onSubmit}>
          <h3>Scrivici</h3>
          <p className="mp-form-sub">Raccontaci il tuo progetto e ti risponderemo il prima possibile.</p>
          <label className="mp-field">
            <span>Nome</span>
            <input name="nome" type="text" placeholder="Il tuo nome" required />
          </label>
          <label className="mp-field">
            <span>Email</span>
            <input name="email" type="email" placeholder="nome@azienda.it" required />
          </label>
          <label className="mp-field">
            <span>Messaggio</span>
            <textarea name="messaggio" rows={4} placeholder="Il tuo messaggio…" required />
          </label>
          <button className="mp-btn mp-btn--gold" type="submit">
            Invia messaggio <span className="mp-btn-arrow">→</span>
          </button>
        </form>
      </div>
    </section>
  );
}
