'use client';

// Il fumetto sopra la testa del coniglio.
//
// Ha due stati e nient'altro: quello che dice, e il «tic tac» di quando pensa.
// L'orologio da taschino che oscilla mentre aspetta non è un caricamento
// qualsiasi — è l'oggetto identitario del personaggio, la stessa "A" sul
// quadrante che sta sul biglietto da visita.

type Proprieta = {
  testo: string;
  pensa: boolean;
};

export function Fumetto({ testo, pensa }: Proprieta) {
  const visibile = pensa || testo.length > 0;

  return (
    <div
      className={`fumetto${visibile ? ' visibile' : ''}`}
      // Il fumetto è il canale con cui il coniglio risponde: chi usa uno
      // screen reader deve sentirlo cambiare senza dover andare a cercarlo.
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {pensa ? (
        <p className="pensiero">
          <Orologio />
          <span>tic tac…</span>
        </p>
      ) : (
        <p>{testo}</p>
      )}
    </div>
  );
}

function Orologio() {
  return (
    <svg className="orologio" viewBox="0 0 24 24" aria-hidden="true">
      {/* L'anello e la catenella da cui pende. */}
      <path d="M12 1.5 V4" stroke="#C9A45C" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="14" r="8" fill="none" stroke="#C9A45C" strokeWidth="1.6" />
      <circle cx="12" cy="14" r="6.2" fill="rgba(201,164,92,0.14)" />
      <text
        x="12"
        y="17.4"
        textAnchor="middle"
        fontSize="8"
        fontFamily="Georgia, serif"
        fill="#C9A45C"
      >
        A
      </text>
    </svg>
  );
}
