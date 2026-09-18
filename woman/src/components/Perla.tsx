/**
 * La perla del marchio: il punto fra WO e MAN, disegnato in grande.
 *
 * Nel logo di Woman è una sfera rosa con il riflesso in alto a sinistra — la
 * stessa che il documento strategico usa come segnaposto delle tre fasi
 * (annusa, indovina, scopri). Qui serve dove un wordmark non ci sta: al
 * centro della ruota e dentro la moneta del credito.
 */
export function Perla({ size = 24, tinta = 'magenta' }: { size?: number; tinta?: 'magenta' | 'crema' | 'nera' }) {
  const id = `perla-${tinta}-${size}`;
  const fermate: Record<string, [string, string, string]> = {
    magenta: ['#F4B9CE', '#D5799A', '#8E2649'],
    crema: ['#FFFFFF', '#EFE4D4', '#C9B79E'],
    nera: ['#4A434B', '#241F26', '#0E0C10'],
  };
  const [luce, corpo, ombra] = fermate[tinta];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <radialGradient id={id} cx="34%" cy="30%" r="72%">
          <stop offset="0%" stopColor={luce} />
          <stop offset="52%" stopColor={corpo} />
          <stop offset="100%" stopColor={ombra} />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${id})`} />
      {/* Il riflesso: una goccia schiacciata, non un cerchio — su una sfera
          la luce si allunga lungo la curvatura. */}
      <ellipse cx="11" cy="10.5" rx="4.6" ry="3.2" fill="#FFFFFF" opacity=".55"
        transform="rotate(-24 11 10.5)" />
    </svg>
  );
}
