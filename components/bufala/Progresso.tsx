'use client';

// L'indicatore di avanzamento: una hairline verticale sul bordo destro con
// una tacca per capitolo, e il nome del capitolo in corso.
//
// Non è decorazione. In un viaggio a scroll lungo, chi non sa quanto manca
// smette di scorrere: l'indicatore è ciò che tiene l'utente dentro il piano
// sequenza — lo stesso ruolo che su Mondial Service ha il metro a nastro.
// Qui però resta quasi invisibile (hairline, ottone solo sulla parte
// percorsa), perché il registro è silenzioso: informa, non richiama.

import { useEffect, useRef } from 'react';
import { CHAPTERS, SCENES, sceneAt, sceneRange } from '@/lib/bufala/scenes';

const barra = {
  percorsa: null as HTMLDivElement | null,
  etichetta: null as HTMLDivElement | null,
};

/** p globale in cui inizia ciascun capitolo: serve per le tacche. */
const inizioCapitoli = CHAPTERS.map((_, i) => {
  const prima = SCENES.find((s) => s.capitolo === i + 1)!;
  return sceneRange(prima.id).p0;
});

export function Progresso() {
  const percorsa = useRef<HTMLDivElement>(null);
  const etichetta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    barra.percorsa = percorsa.current;
    barra.etichetta = etichetta.current;
    return () => {
      barra.percorsa = null;
      barra.etichetta = null;
    };
  }, []);

  return (
    <div className="bufala-progresso" aria-hidden="true">
      <div ref={etichetta} className="micro capitolo">
        {CHAPTERS[0]}
      </div>
      <div className="riga">
        <div ref={percorsa} className="percorsa" />
        {inizioCapitoli.slice(1).map((p, i) => (
          <span key={i} className="tacca" style={{ top: `${p * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Aggiornato dallo stesso loop del viaggio: nessun secondo ciclo di frame. */
Progresso.render = function render(p: number): void {
  const barraPercorsa = barra.percorsa;
  const et = barra.etichetta;
  if (!barraPercorsa || !et) return;

  barraPercorsa.style.transform = `scaleY(${p.toFixed(4)})`;

  const nome = CHAPTERS[sceneAt(p).capitolo - 1];
  if (et.textContent !== nome) et.textContent = nome;
};
