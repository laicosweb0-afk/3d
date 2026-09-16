'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

// Non c'è registrazione: gli account li crea il titolare invitando le persone
// da Supabase (vedi CRM-RAMA.md). Qui si entra e basta.
export default function Accesso() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function entra(evento: React.FormEvent) {
    evento.preventDefault();
    setErrore(null);
    setInCorso(true);
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
      if (error) {
        setErrore('Email o password non corrette.');
        return;
      }
      // Dove stava andando prima di essere fermato dal middleware.
      const da = new URLSearchParams(window.location.search).get('da');
      router.replace(da && da.startsWith('/') ? da : '/');
      router.refresh();
    } catch {
      setErrore('Il servizio non risponde. Riprova tra poco.');
    } finally {
      setInCorso(false);
    }
  }

  return (
    <main className="accesso">
      <form className="scheda" onSubmit={entra}>
        <div className="marchio" style={{ marginBottom: 18 }}>
          <span className="tessere" aria-hidden="true"><i /><i /><i /><i /></span>
          Rama
        </div>
        <h1>Entra nel CRM</h1>
        <p className="lede" style={{ marginBottom: 18 }}>Showroom di Lugo.</p>

        {errore && <p className="avviso">{errore}</p>}

        <div className="campo">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={inCorso} style={{ width: '100%' }}>
          {inCorso ? 'Un attimo…' : 'Entra'}
        </button>
      </form>
    </main>
  );
}
