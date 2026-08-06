'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bianconiglio } from './Bianconiglio';
import { Fumetto } from './Fumetto';
import { Barra } from './Barra';
import { BENVENUTO, CLAIM, SCUSA } from '@/lib/personaggio';
import { useVoce } from '@/lib/voce';

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

      setPensa(false);
      setFumetto(risposta);
      setBattute([...conLaDomanda, { ruolo: 'coniglio', testo: risposta }]);

      // La voce arriva dopo il testo, e se fallisce non lo sa nessuno.
      await di(risposta);
    },
    [battute, di],
  );

  const occupato = pensa || staParlando;

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
