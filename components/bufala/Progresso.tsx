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
import { CHAPTERS, SCENES, sceneAt, sceneRange, smooth, span } from '@/lib/bufala/scenes';

const barra = {
  radice: null as HTMLDivElement | null,
  percorsa: null as HTMLDivElement | null,
  etichetta: null as HTMLDivElement | null,
};

/** p globale in cui inizia ciascun capitolo: serve per le tacche. */
const inizioCapitoli = CHAPTERS.map((_, i) => {
  const prima = SCENES.find((s) => s.capitolo === i + 1)!;
  return sceneRange(prima.id).p0;
});

export function Progresso() {
  const radice = useRef<HTMLDivElement>(null);
  const percorsa = useRef<HTMLDivElement>(null);
  const etichetta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    barra.radice = radice.current;
    barra.percorsa = percorsa.current;
    barra.etichetta = etichetta.current;
    return () => {
      barra.radice = null;
      barra.percorsa = null;
      barra.etichetta = null;
    };
  }, []);

  return (
    <div ref={radice} className="bufala-progresso" aria-hidden="true" style={{ opacity: 0 }}>
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
  const radice = barra.radice;
  if (!barraPercorsa || !et || !radice) return;

  // Sulla hero l'indicatore non c'è: quella schermata deve restare la
  // headline e nient'altro. Compare quando il viaggio è già cominciato,
  // cioè quando serve davvero — orientare chi sta già scorrendo.
  //
  // E se ne va prima che il viaggio finisca. Misura l'avanzamento del piano
  // sequenza, non della pagina: lasciarlo acceso sul documento significa
  // mostrare una barra ferma al fondo mentre si legge — e accanto alla
  // scheda della mappa, che ha una propria riga di avanzamento, diventano
  // due indicatori d'ottone nello stesso schermo che misurano cose diverse.
  const inizio = sceneRange(SCENES[0].id).p1;
  const entra = smooth(span(p, inizio * 0.55, inizio));
  const esce = 1 - smooth(span(p, 0.88, 0.98));
  const comparsa = entra * esce;
  radice.style.opacity = comparsa.toFixed(3);
  radice.style.visibility = comparsa < 0.01 ? 'hidden' : 'visible';

  barraPercorsa.style.transform = `scaleY(${p.toFixed(4)})`;

  const nome = CHAPTERS[sceneAt(p).capitolo - 1];
  if (et.textContent !== nome) et.textContent = nome;
};
