'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bianconiglio } from './Bianconiglio';
import { Fumetto } from './Fumetto';
import { Barra } from './Barra';
import { BENVENUTO, CLAIM, SCUSA } from '@/lib/personaggio';
import { rispondi } from '@/lib/repertorio';
import { sigilla, combacia } from '@/lib/sigillo';
import { useVoce } from '@/lib/voce';

/**
 * Modalità prototipo: nessun server, nessuna chiave, nessun costo a visita.
 * Il cervello è il repertorio recitato, la voce sono gli mp3 in /voce, la
 * porta d'ingresso è verificata nel browser. Si accende alla costruzione con
 * NEXT_PUBLIC_PROTOTIPO=1 (lo fa lo script `npm run prototipo`).
 */
const PROTOTIPO = process.env.NEXT_PUBLIC_PROTOTIPO === '1';
const SIGILLO_PROTOTIPO = process.env.NEXT_PUBLIC_SIGILLO ?? '';

// La regia della demo.
//
// L'ordine è quello del passaggio di consegne, e conta: la hero col claim del
// biglietto, due secondi e mezzo di attesa, il coniglio che sbuca dal fondo, il
// fumetto di benvenuto. Poi la conversazione.
//
// La regola che governa tutto il resto: il testo arriva a schermo appena c'è,
// la voce parte dopo. Se la voce non parte, la conversazione è già leggibile e
// si può continuare. Non esiste un guasto che lasci il coniglio muto E fermo.

type Battuta = { ruolo: 'utente' | 'coniglio'; testo: string };

/** Quanto aspetta prima di sbucare. */
const ATTESA_INGRESSO = 2500;

export function Esperienza() {
  const [arrivato, setArrivato] = useState(false);
  const [battute, setBattute] = useState<Battuta[]>([]);
  const [fumetto, setFumetto] = useState('');
  const [pensa, setPensa] = useState(false);
  const [calibra, setCalibra] = useState(false);

  const { di, sveglia, livello, staParlando } = useVoce();
  const benvenutoDetto = useRef(false);

  // La calibrazione si accende dall'indirizzo (`?calibra=1`) e non da un tasto:
  // è uno strumento di lavoro, non deve esistere per chi guarda la demo.
  useEffect(() => {
    setCalibra(new URLSearchParams(window.location.search).get('calibra') === '1');
  }, []);

  // Il contesto audio va aperto mentre il dito è ancora sullo schermo, altrimenti
  // su iPhone la prima risposta resta muta. Un solo ascolto, al primo tocco.
  useEffect(() => {
    const apri = () => sveglia();
    window.addEventListener('pointerdown', apri, { once: true });
    window.addEventListener('keydown', apri, { once: true });
    return () => {
      window.removeEventListener('pointerdown', apri);
      window.removeEventListener('keydown', apri);
    };
  }, [sveglia]);

  // L'ingresso.
  useEffect(() => {
    const attesa = setTimeout(() => setArrivato(true), ATTESA_INGRESSO);
    return () => clearTimeout(attesa);
  }, []);

  // Il benvenuto, poco dopo che è sbucato: prima si vede arrivare, poi parla.
  useEffect(() => {
    if (!arrivato || benvenutoDetto.current) return;
    benvenutoDetto.current = true;
    const attesa = setTimeout(() => {
      setFumetto(BENVENUTO);
      setBattute([{ ruolo: 'coniglio', testo: BENVENUTO }]);
      // Niente voce qui: senza un gesto dell'utente il browser la bloccherebbe,
      // e un blocco silenzioso al primo secondo sembra un guasto. Il coniglio
      // apre la bocca dalla prima risposta in poi.
    }, 900);
    return () => clearTimeout(attesa);
  }, [arrivato]);

  const chiedi = useCallback(
    async (domanda: string) => {
      const conLaDomanda: Battuta[] = [...battute, { ruolo: 'utente', testo: domanda }];
      setBattute(conLaDomanda);
      setFumetto('');
      setPensa(true);

      let risposta = SCUSA;
      let audio: string | undefined;

      if (PROTOTIPO) {
        // Il pensiero è finto ma il «tic tac» deve respirare: mezzo secondo
        // abbondante di orologio che oscilla prima della risposta.
        await new Promise((r) => setTimeout(r, 650 + Math.random() * 550));
        const battuta = rispondi(domanda);
        risposta = battuta.testo;
        audio = `/voce/${battuta.id}.mp3`;
      } else {
        try {
          const esito = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ battute: conLaDomanda }),
          });
          const dati = await esito.json().catch(() => ({}));
          if (typeof dati?.testo === 'string' && dati.testo.trim()) risposta = dati.testo.trim();
        } catch {
          // `risposta` resta la scusa in personaggio.
        }
      }

      setPensa(false);
      setFumetto(risposta);
      setBattute([...conLaDomanda, { ruolo: 'coniglio', testo: risposta }]);

      // La voce arriva dopo il testo, e se fallisce non lo sa nessuno.
      await di(risposta, { urlAudio: audio, conTts: !PROTOTIPO });
    },
    [battute, di],
  );

  const occupato = pensa || staParlando;

  // La porta del prototipo: senza server la parola si verifica qui, nel
  // browser, confrontando l'impronta e mai la parola. È una serratura da
  // prototipo — tiene fuori i curiosi, non un attacco determinato — e la
  // versione col server, che resta nel progetto, ha quella vera.
  const [aperto, setAperto] = useState(!PROTOTIPO);
  const [parola, setParola] = useState('');
  const [erroreParola, setErroreParola] = useState('');
  useEffect(() => {
    if (PROTOTIPO && sessionStorage.getItem('bianconiglio_aperto') === '1') setAperto(true);
  }, []);

  if (!aperto) {
    const prova = async (evento: React.FormEvent) => {
      evento.preventDefault();
      if (combacia(await sigilla(parola), SIGILLO_PROTOTIPO)) {
        sessionStorage.setItem('bianconiglio_aperto', '1');
        setAperto(true);
      } else {
        setErroreParola('Non è questa la parola.');
      }
    };
    return (
      <main className="porta">
        <div className="rombo">
          <span />
        </div>
        <h1>Serve una parola.</h1>
        <form onSubmit={prova}>
          <label className="visivamente-nascosto" htmlFor="parola-prototipo">
            Parola d&rsquo;accesso
          </label>
          <div className="riga-ingresso" style={{ width: '100%' }}>
            <input
              id="parola-prototipo"
              type="password"
              autoFocus
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              placeholder="…"
            />
            <button className="tasto" type="submit" disabled={!parola}>
              <span aria-hidden="true">→</span>
              <span className="visivamente-nascosto">Entra</span>
            </button>
          </div>
        </form>
        <p className="errore" role="status">
          {erroreParola}
        </p>
      </main>
    );
  }

  return (
    <main className="scena">
      <div className="cornice-sinistra" aria-hidden="true" />
      <div className="cornice-destra" aria-hidden="true" />

      <header className="hero">
        <p className="marchio">
          {CLAIM.marchio}
          <span className="fondazione">{CLAIM.fondazione}</span>
        </p>
        <h1 className="claim">
          {CLAIM.titolo} <em>{CLAIM.titoloAccento}</em> {CLAIM.titoloCoda}
        </h1>
        <p className="sottoclaim">{CLAIM.sottotitolo}</p>
        <div className="rombo" aria-hidden="true">
          <span />
        </div>
      </header>

      <div className="palco">
        <Fumetto testo={fumetto} pensa={pensa} />
        <div className="ancora">
          <Bianconiglio arrivato={arrivato} livello={livello} calibra={calibra} />
        </div>
      </div>

      <Barra onInvia={chiedi} occupato={occupato}>
        {/* L'aggancio col sito vero: discreto, in fondo, sempre raggiungibile.
            Sta dentro la barra perché è l'unica fascia che non si comprime — se
            fosse un blocco a sé rubberebbe altezza al palco. */}
        <a className="continua" href={CLAIM.destinazione} target="_blank" rel="noreferrer">
          {CLAIM.invito} <span aria-hidden="true">→</span>
        </a>
      </Barra>
    </main>
  );
}
