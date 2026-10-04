/**
 * Il disegno di ogni servizio, per la card quando non c'è la foto.
 *
 * Non sono icone da barra degli strumenti: stanno dentro un tondo da 64px e
 * devono reggere accanto a una fotografia vera, perché nella stessa
 * schermata ci saranno tutte e due finché l'officina non ci manda le foto di
 * tutti i lavori.
 *
 * Per questo sono costruite tutte uguali: riquadro 48, tratto 2, estremi e
 * giunzioni tonde, nessun riempimento. Disegni fatti ognuno a modo suo,
 * messi in fila, si vedrebbero subito — ed è il genere di dettaglio che fa
 * sembrare raffazzonato tutto il resto.
 */
const TRATTO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const DISEGNI: Record<string, JSX.Element> = {
  /* Il blocchetto dei controlli, con la spunta. */
  tagliando: (
    <g {...TRATTO}>
      <rect x="11" y="9" width="26" height="31" rx="4" />
      <rect x="18" y="5" width="12" height="7" rx="2.5" />
      <path d="M17 25.5l4 4 9-9.5" />
      <path d="M17 35h14" />
    </g>
  ),
  /* La goccia. */
  olio: (
    <g {...TRATTO}>
      <path d="M24 7c0 0 12 13.5 12 21a12 12 0 0 1-24 0C12 20.5 24 7 24 7z" />
      <path d="M29.5 28a5.5 5.5 0 0 1-5.5 5.5" />
    </g>
  ),
  /* Il pneumatico: cerchione, spalla e otto tasselli di battistrada. */
  gomme: (
    <g {...TRATTO}>
      <circle cx="24" cy="24" r="16" />
      <circle cx="24" cy="24" r="6.5" />
      <path d="M24 8v4M24 36v4M8 24h4M36 24h4" />
      <path d="M12.7 12.7l2.8 2.8M32.5 32.5l2.8 2.8M35.3 12.7l-2.8 2.8M15.5 32.5l-2.8 2.8" />
    </g>
  ),
  /* Lo strumento: lo schermo e il tracciato che ne esce. */
  diagnosi: (
    <g {...TRATTO}>
      <rect x="7" y="11" width="34" height="23" rx="3.5" />
      <path d="M13 23h4l3-6 4 12 3-6h8" />
      <path d="M19 40h10" />
      <path d="M24 34v6" />
    </g>
  ),
  /* Il filtro: il corpo e il flusso che lo attraversa. */
  fap: (
    <g {...TRATTO}>
      <rect x="15" y="11" width="18" height="26" rx="7" />
      <path d="M19 18h10M19 24h10M19 30h10" />
      <path d="M24 5v6M24 37v6" />
      <path d="M21 8l3-3 3 3M21 40l3 3 3-3" />
    </g>
  ),
  /* Il faro, con i fasci. */
  fari: (
    <g {...TRATTO}>
      <path d="M13 13h7a11 11 0 0 1 0 22h-7z" />
      <path d="M13 13v22" />
      <path d="M35 17h7M35 24h9M35 31h7" />
    </g>
  ),
  /* La batteria, con i due poli. */
  batteria: (
    <g {...TRATTO}>
      <rect x="7" y="16" width="34" height="19" rx="3.5" />
      <path d="M14 16v-4h6v4M28 16v-4h6v4" />
      <path d="M15 25.5h6M18 22.5v6" />
      <path d="M27 25.5h6" />
    </g>
  ),
  /* Il triangolo: chi è fermo lo ha appena messo in strada. */
  soccorso: (
    <g {...TRATTO}>
      <path d="M24 8L42 38H6L24 8z" />
      <path d="M24 20v8" />
      <path d="M24 33h.02" />
    </g>
  ),
  /* La chiave: la manutenzione, quella con calma. */
  manutenzione: (
    <g {...TRATTO}>
      <path d="M31 9a9 9 0 0 0-8.3 12.5L9 35.2a3.5 3.5 0 0 0 0 5 3.5 3.5 0 0 0 5 0l13.7-13.7A9 9 0 1 0 31 9z" />
      <circle cx="31.5" cy="17.5" r="3" />
    </g>
  ),
  /* Il furgone dell'officina mobile. */
  mobile: (
    <g {...TRATTO}>
      <path d="M4 30V15h20v15" />
      <path d="M24 19h7l6 6v5" />
      <path d="M4 30h4M17 30h8M34 30h6" />
      <circle cx="12.5" cy="31" r="4" />
      <circle cx="29.5" cy="31" r="4" />
    </g>
  ),
};

export function IconaServizio({ id }: { id: string }) {
  const disegno = DISEGNI[id];
  if (!disegno) return null;
  return (
    <svg viewBox="0 0 48 48" width="32" height="32" aria-hidden focusable="false">
      {disegno}
    </svg>
  );
}
