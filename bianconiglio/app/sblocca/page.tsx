'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// La porta. Volutamente spoglia: non anticipa niente di quello che c'è dietro,
// non nomina il coniglio, non nomina la profumeria. Chi arriva qui senza la
// parola non deve nemmeno capire cosa si sta perdendo.

export default function Sblocca() {
  const router = useRouter();
  const [parola, setParola] = useState('');
  const [errore, setErrore] = useState('');
  const [inCorso, setInCorso] = useState(false);

  async function apri(evento: React.FormEvent) {
    evento.preventDefault();
    if (inCorso) return;
    setInCorso(true);
    setErrore('');
    try {
      const risposta = await fetch('/api/sblocca', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ parola }),
      });
      if (risposta.ok) {
        router.replace('/');
        router.refresh();
        return;
      }
      const dati = await risposta.json().catch(() => ({}));
      setErrore(dati.errore ?? 'Non è questa la parola.');
    } catch {
      setErrore('Connessione persa. Riprova.');
    } finally {
      setInCorso(false);
    }
  }

  return (
    <main className="porta">
      <div className="rombo">
        <span />
      </div>
      <h1>Serve una parola.</h1>
      <form onSubmit={apri}>
        <label className="visivamente-nascosto" htmlFor="parola">
          Parola d&rsquo;accesso
        </label>
        <div className="riga-ingresso" style={{ width: '100%' }}>
          <input
            id="parola"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={parola}
            onChange={(e) => setParola(e.target.value)}
            placeholder="…"
          />
          <button className="tasto" type="submit" disabled={inCorso || !parola}>
            <span aria-hidden="true">→</span>
            <span className="visivamente-nascosto">Entra</span>
          </button>
        </div>
      </form>
      <p className="errore" role="status">
        {errore}
      </p>
    </main>
  );
}
