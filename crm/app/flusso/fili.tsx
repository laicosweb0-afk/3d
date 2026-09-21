// I fili di luce che uniscono le fasce della pagina Flusso.
//
// È un disegno, non un dato: non si può cliccare, non dice niente che non sia
// già scritto nei numeri sopra e sotto. Serve a far vedere con gli occhi che
// tutte le porte finiscono nello stesso posto — che è l'idea di tutto il CRM.
//
// È un componente server: non manda nemmeno una riga di JavaScript al
// browser. Lo scorrimento della luce è un'animazione CSS, e si ferma da sé
// per chi ha chiesto meno movimento (la regola sta in globals.css).

export function Fili({ direzione = 'dentro' }: { direzione?: 'dentro' | 'fuori' }) {
  // Quattro fili che convergono, oppure tre che si aprono. Le coordinate sono
  // in un riquadro di comodo 1000×110 che poi si allarga quanto serve.
  const partenze = direzione === 'dentro' ? [125, 375, 625, 875] : [500];
  const arrivi = direzione === 'dentro' ? [500] : [167, 500, 833];

  const percorsi = direzione === 'dentro'
    ? partenze.map((x) => `M ${x} 0 C ${x} 55, ${arrivi[0]} 55, ${arrivi[0]} 110`)
    : arrivi.map((x) => `M ${partenze[0]} 0 C ${partenze[0]} 55, ${x} 55, ${x} 110`);

  return (
    <svg
      className="fili"
      viewBox="0 0 1000 110"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`filo-${direzione}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--viola)" stopOpacity=".1" />
          <stop offset="50%" stopColor="var(--blu)" stopOpacity=".75" />
          <stop offset="100%" stopColor="var(--ciano)" stopOpacity=".35" />
        </linearGradient>
      </defs>

      {percorsi.map((d, i) => (
        <g key={d}>
          {/* Tre tratti sovrapposti sullo stesso percorso: l'alone sfocato dà
              il bagliore, la linea continua fa il filo — senza di lei restano
              trattini staccati — e sopra corre la scintilla. */}
          <path d={d} className="filo-alone" stroke={`url(#filo-${direzione})`} vectorEffect="non-scaling-stroke" />
          <path d={d} className="filo-base" stroke={`url(#filo-${direzione})`} vectorEffect="non-scaling-stroke" />
          <path
            d={d}
            className="filo-vivo"
            stroke={`url(#filo-${direzione})`}
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        </g>
      ))}
    </svg>
  );
}
