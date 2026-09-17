import { motion } from 'framer-motion';

/**
 * Il marchio Rama: quattro piastrelle con gli angoli arrotondati, due grandi
 * in diagonale e due piccole, tutte inclinate come una posa in diagonale.
 * Geometria esportata perché ruota, moneta e tessera disegnino lo stesso
 * marchio invece di averne ciascuno una copia leggermente diversa.
 */
export const TESSERE = [
  { x: 2.0, y: 2.5, l: 13.0, r: 2.9 },   // grande, in alto a sinistra
  { x: 17.8, y: 4.8, l: 8.6, r: 2.0 },   // piccola, in alto a destra
  { x: 4.6, y: 18.6, l: 8.6, r: 2.0 },   // piccola, in basso a sinistra
  { x: 16.2, y: 16.0, l: 13.0, r: 2.9 }, // grande, in basso a destra
];

/** L'inclinazione, presa attorno al centro perché il marchio non scivoli. */
export const INCLINAZIONE = 'translate(16 16) skewX(-13) translate(-16 -16)';

type Props = {
  size?: number;
  variant?: 'oro' | 'nero';
  className?: string;
  title?: string;
  /** Le piastrelle si posano una alla volta invece di comparire già messe. */
  animato?: boolean;
};

export function RamaLogo({ size = 24, variant = 'oro', className, title, animato }: Props) {
  const id = `rama-${variant}-${size}`;
  const fill = variant === 'oro' ? `url(#${id})` : 'currentColor';

  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" className={className}
      role={title ? 'img' : 'presentation'} aria-label={title} aria-hidden={title ? undefined : true}
    >
      {variant === 'oro' && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2DFA6" />
            <stop offset="45%" stopColor="#E8CD86" />
            <stop offset="100%" stopColor="#C9A54E" />
          </linearGradient>
        </defs>
      )}
      <g transform={INCLINAZIONE}>
        {TESSERE.map((t, i) =>
          animato ? (
            <motion.rect
              key={i} x={t.x} y={t.y} width={t.l} height={t.l} rx={t.r} fill={fill}
              // Ogni piastrella arriva dalla propria diagonale e si posa: è
              // il gesto di chi posa un pavimento, non un rimbalzo.
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.09 * i }}
              style={{ transformOrigin: `${t.x + t.l / 2}px ${t.y + t.l / 2}px` }}
            />
          ) : (
            <rect key={i} x={t.x} y={t.y} width={t.l} height={t.l} rx={t.r} fill={fill} />
          ),
        )}
      </g>
    </svg>
  );
}
