'use client';

import { useEffect, useRef, useState } from 'react';

// La barra in basso: si scrive o si parla.
//
// Il campo di testo c'è sempre — è la strada che funziona ovunque, anche dove
// il riconoscimento vocale non esiste. Il microfono si aggiunge quando il
// browser lo supporta, e se non lo supporta sparisce senza lasciare un tasto
// morto da premere.
//
// Il permesso del microfono su iOS arriva al primo tocco sul tasto, e quel
// momento è di proposito la frase «Tocca per svegliare il coniglio»: il
// pop-up di sistema smette di essere un ostacolo e diventa parte del racconto.

type Proprieta = {
  onInvia: (testo: string) => void;
  occupato: boolean;
  /** L'invito «Continua →», che vive in fondo alla barra. */
  children?: React.ReactNode;
};

type CostruttoreAscolto = new () => SpeechRecognition;
type FinestraConAscolto = Window & {
  SpeechRecognition?: CostruttoreAscolto;
  webkitSpeechRecognition?: CostruttoreAscolto;
};

export function Barra({ onInvia, occupato, children }: Proprieta) {
  const [testo, setTesto] = useState('');
  const [ascolta, setAscolta] = useState(false);
  const [microfonoDisponibile, setMicrofonoDisponibile] = useState(false);
  const [nota, setNota] = useState('');
  const ascoltoRef = useRef<SpeechRecognition | null>(null);

  // Il supporto si controlla dopo il montaggio: sul server `window` non esiste,
  // e decidere qui evita che il tasto compaia e sparisca al primo render.
  useEffect(() => {
    const finestra = window as unknown as FinestraConAscolto;
    setMicrofonoDisponibile(Boolean(finestra.SpeechRecognition ?? finestra.webkitSpeechRecognition));
  }, []);

  useEffect(() => () => ascoltoRef.current?.abort(), []);

  function manda(valore: string) {
    const pulito = valore.trim();
    if (!pulito || occupato) return;
    setTesto('');
    setNota('');
    onInvia(pulito);
  }

  function commutaMicrofono() {
    if (ascolta) {
      ascoltoRef.current?.stop();
      return;
    }

    const finestra = window as unknown as FinestraConAscolto;
    const Costruttore = finestra.SpeechRecognition ?? finestra.webkitSpeechRecognition;
    if (!Costruttore) return;

    const ascolto = new Costruttore();
    ascolto.lang = 'it-IT';
    ascolto.continuous = false;
    ascolto.interimResults = true;
    ascoltoRef.current = ascolto;

    ascolto.onstart = () => {
      setAscolta(true);
      setNota('Ti ascolto…');
    };

    ascolto.onresult = (evento) => {
      let parziale = '';
      let definitivo = '';
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const brano = evento.results[i];
        if (brano.isFinal) definitivo += brano[0].transcript;
        else parziale += brano[0].transcript;
      }
      // Il parziale si vede scorrere nel campo; il definitivo parte da solo,
      // così non serve premere due volte per farsi rispondere.
      setTesto(definitivo || parziale);
      if (definitivo) manda(definitivo);
    };

    ascolto.onerror = (evento) => {
      setAscolta(false);
      setNota(
        evento.error === 'not-allowed'
          ? 'Il microfono è chiuso. Scrivi pure, ti leggo lo stesso.'
          : '',
      );
    };

    ascolto.onend = () => {
      setAscolta(false);
      setNota((precedente) => (precedente === 'Ti ascolto…' ? '' : precedente));
    };

    try {
      ascolto.start();
    } catch {
      setAscolta(false);
    }
  }

  return (
    <div className="barra">
      <form
        className="riga-ingresso"
        onSubmit={(evento) => {
          evento.preventDefault();
          manda(testo);
        }}
      >
        <label className="visivamente-nascosto" htmlFor="domanda">
          Scrivi al Bianconiglio
        </label>
        <input
          id="domanda"
          value={testo}
          onChange={(evento) => setTesto(evento.target.value)}
          placeholder="Chiedimi un profumo…"
          autoComplete="off"
          disabled={occupato}
        />

        {microfonoDisponibile && (
          <button
            type="button"
            className={`tasto${ascolta ? ' in-ascolto' : ''}`}
            onClick={commutaMicrofono}
            disabled={occupato}
            aria-pressed={ascolta}
            title={ascolta ? 'Smetti di parlare' : 'Tocca per svegliare il coniglio'}
          >
            <span aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <rect x="9" y="2.5" width="6" height="11" rx="3" />
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
                <path d="M12 17.5V21" />
              </svg>
            </span>
            <span className="visivamente-nascosto">
              {ascolta ? 'Smetti di parlare' : 'Parla al Bianconiglio'}
            </span>
          </button>
        )}

        <button type="submit" className="tasto" disabled={occupato || !testo.trim()}>
          <span aria-hidden="true">→</span>
          <span className="visivamente-nascosto">Invia</span>
        </button>
      </form>

      <p className="suggerimento" role="status">
        {nota || (microfonoDisponibile && !occupato ? 'Tocca per svegliare il coniglio' : ' ')}
      </p>

      {children}
    </div>
  );
}
