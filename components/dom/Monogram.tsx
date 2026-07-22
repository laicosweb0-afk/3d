// Monogramma del brand: globo + nastro, tratto pulito, monocromo.
// Ridisegnato a vettore dal logo reale (globo + metro a nastro) nello
// stesso linguaggio della timeline "a metro" già presente nel sito.
// Eredita il colore dal contesto (currentColor): antracite in UI chiara.

export function Monogram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* globo: contorno + meridiani/paralleli, nessun render fotorealistico */}
      <circle cx="27" cy="30" r="15.5" strokeWidth="2" stroke="currentColor" />
      <ellipse cx="27" cy="30" rx="15.5" ry="5.6" strokeWidth="1" stroke="currentColor" opacity="0.5" />
      <ellipse cx="27" cy="30" rx="6.2" ry="15.5" strokeWidth="1" stroke="currentColor" opacity="0.5" />

      {/* nastro: avvolge il globo passando davanti, prosegue come coda graduata */}
      <path
        d="M8 33 Q18 42 27 39 Q37 35 52 43"
        strokeWidth="4"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
        <path d="M42 38.6 L43.6 41.6" />
        <path d="M46 40.4 L47.6 43.4" />
        <path d="M50 42.2 L51.4 45" />
      </g>
    </svg>
  );
}
