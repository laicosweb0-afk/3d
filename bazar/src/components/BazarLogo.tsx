/**
 * Il marchio, ricostruito in tipografia: BAZAR in Didone oro, MARRAKECH
 * sotto in bastoni spaziati, come nel blocco marchio delle locandine.
 *
 * Il file vero del logo non è ancora arrivato. Il giorno che arriva (meglio
 * se SVG) si sostituisce questo componente, ed è l'unico posto da toccare.
 */
export function BazarLogo({
  size = 17, variante = 'scuro', title,
}: {
  size?: number;
  variante?: 'scuro' | 'chiaro';
  title?: string;
}) {
  return (
    <span
      className={`marchio marchio-${variante}`}
      style={{ fontSize: size }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span className="marchio-bazar oro-testo">BAZAR</span>
      <span className="marchio-sotto">MARRAKECH</span>
    </span>
  );
}

/**
 * L'arco: la porta moresca, disegnata con un filo solo. Apre l'esperienza
 * tracciandosi da sé, e torna piccolo accanto al marchio.
 */
export function Arco({ className, traccia = false }: { className?: string; traccia?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 120 160" fill="none" aria-hidden>
      <defs>
        <linearGradient id="arco-oro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9D49C" />
          <stop offset="40%" stopColor="#C9AE6E" />
          <stop offset="100%" stopColor="#9B7C3C" />
        </linearGradient>
      </defs>
      <path
        className={traccia ? 'arco-traccia' : undefined}
        pathLength={1}
        d="M14 156V74C14 44 34 20 60 6c26 14 46 38 46 68v82"
        stroke="url(#arco-oro)" strokeWidth="2"
      />
      <path
        className={traccia ? 'arco-traccia arco-traccia-2' : undefined}
        pathLength={1}
        d="M30 156V82c0-22 13-40 30-50 17 10 30 28 30 50v74"
        stroke="url(#arco-oro)" strokeWidth="1.2" opacity=".65"
      />
    </svg>
  );
}
