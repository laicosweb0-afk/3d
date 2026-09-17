import { motion } from 'framer-motion';

/**
 * Il marchio Aurea: un flacone squadrato con il tappo pieno e tre gocce che
 * salgono dal vaporizzatore. Geometria esportata perché ruota, moneta e
 * tessera disegnino lo stesso marchio invece di averne ciascuno una copia
 * leggermente diversa.
 *
 * Il soggetto è l'unica cosa che cambia rispetto a Club Rama: là erano
 * quattro piastrelle, e le piastrelle in profumeria non dicono niente. La
 * finitura è la stessa — lo stesso gradiente d'oro, la stessa molla, gli
 * stessi ritardi a scalare — perché la mano che disegna i due marchi deve
 * sembrare la stessa.
 *
 * Non è un logo a lettere di proposito: a 20px un monogramma diventa una
 * macchia, una sagoma no. E la sagoma dice «profumo» prima di qualunque nome.
 */
export const FLACONE = {
  /** Il corpo: spalle larghe, spigoli appena ammorbiditi. */
  corpo: { x: 7.5, y: 12, l: 17, h: 17.5, r: 4.2 },
  /** Il collo, stretto, fra corpo e tappo. */
  collo: { x: 13.5, y: 8.6, l: 5, h: 3.8, r: 0.9 },
  /** Il tappo, più largo del collo: è quello che dà il peso al disegno. */
  tappo: { x: 11.8, y: 3.4, l: 8.4, h: 5.4, r: 1.7 },
};

/** Le gocce dello spruzzo, in ordine di partenza. */
export const GOCCE = [
  { cx: 24.6, cy: 7.4, r: 1.5 },
  { cx: 28.2, cy: 4.6, r: 1.05 },
  { cx: 27.4, cy: 10.2, r: 0.8 },
];

type Props = {
  size?: number;
  variant?: 'oro' | 'nero';
  className?: string;
  title?: string;
  /** Il flacone si compone pezzo per pezzo e poi spruzza. */
  animato?: boolean;
};

export function AureaLogo({ size = 24, variant = 'oro', className, title, animato }: Props) {
  const id = `aurea-${variant}-${size}`;
  const fill = variant === 'oro' ? `url(#${id})` : 'currentColor';
  const { corpo, collo, tappo } = FLACONE;

  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" className={className}
      role={title ? 'img' : 'presentation'} aria-label={title} aria-hidden={title ? undefined : true}
    >
      {variant === 'oro' && (
        <defs>
          {/* Le tre fermate del marchio Rama, identiche: 0% #F2DFA6,
              45% #E8CD86, 100% #C9A54E. */}
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2DFA6" />
            <stop offset="45%" stopColor="#E8CD86" />
            <stop offset="100%" stopColor="#C9A54E" />
          </linearGradient>
        </defs>
      )}

      {/* Il flacone: tappo, collo, corpo. In quest'ordine anche
          nell'animazione, perché si monti dall'alto come lo si prende in
          mano — lo stesso gesto con cui a Rama si posava un pavimento. */}
      {[tappo, collo, corpo].map((p, i) =>
        animato ? (
          <motion.rect
            key={i} x={p.x} y={p.y} width={p.l} height={p.h} rx={p.r} fill={fill}
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.09 * i }}
            style={{ transformOrigin: `${p.x + p.l / 2}px ${p.y + p.h / 2}px` }}
          />
        ) : (
          <rect key={i} x={p.x} y={p.y} width={p.l} height={p.h} rx={p.r} fill={fill} />
        ),
      )}

      {/* Le gocce partono dal collo e si allontanano: lo spruzzo arriva dopo il
          flacone, non insieme, altrimenti è una macchia sola che compare. */}
      {GOCCE.map((g, i) =>
        animato ? (
          <motion.circle
            key={`g${i}`} cx={g.cx} cy={g.cy} r={g.r} fill={fill}
            initial={{ opacity: 0, x: -7, y: 4, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0.85], x: 0, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.34 + 0.07 * i, ease: [0.2, 0.9, 0.25, 1] }}
          />
        ) : (
          <circle key={`g${i}`} cx={g.cx} cy={g.cy} r={g.r} fill={fill} opacity={0.9} />
        ),
      )}
    </svg>
  );
}
