'use client';

import { SplitTitle } from '../SplitTitle';
import { BRAND, CONTACT } from '../content';

export function Contact() {
  // Sito statico, nessun server a cui inviare: il form apre WhatsApp sul numero
  // business con il messaggio già scritto. Prima puntava a una casella di posta
  // che non esisteva, quindi non arrivava niente a nessuno.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const nome = String(data.get('nome') || '').trim();
    const email = String(data.get('email') || '').trim();
    const messaggio = String(data.get('messaggio') || '').trim();
    const testo = [
      `Ciao MediaPro, sono ${nome}.`,
      messaggio,
      email ? `Se preferite: ${email}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    window.open(
      `https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent(testo)}`,
      '_blank',
      'noopener'
    );
  };

  return (
    <section className="mp-section mp-contatti" id="contatti">
      <div className="mp-contatti-inner">
        <div>
          <p className="mp-kicker mp-reveal">{CONTACT.kicker}</p>
          <SplitTitle className="mp-contatti-title" text={CONTACT.title} accent={['tuo']} />
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
                <span>
                  {c.label}
                  <em className="mp-channel-value">{c.value}</em>
                </span>
                <span>→</span>
              </a>
            ))}
          </div>
        </div>

        <form className="mp-form mp-reveal" onSubmit={onSubmit}>
          <h3>Scrivici</h3>
          <p className="mp-form-sub">
            Compila e si apre WhatsApp con il messaggio già pronto: da lì ci arriva
            direttamente.
          </p>
          <label className="mp-field">
            <span>Nome</span>
            <input name="nome" type="text" placeholder="Il tuo nome" required />
          </label>
          {/* non obbligatoria: chi scrive da WhatsApp ha già lasciato il numero */}
          <label className="mp-field">
            <span>Email (facoltativa)</span>
            <input name="email" type="email" placeholder="nome@azienda.it" />
          </label>
          <label className="mp-field">
            <span>Messaggio</span>
            <textarea name="messaggio" rows={4} placeholder="Il tuo messaggio…" required />
          </label>
          <button className="mp-btn mp-btn--gold" type="submit">
            Invia su WhatsApp <span className="mp-btn-arrow">→</span>
          </button>
        </form>
      </div>
    </section>
  );
}
