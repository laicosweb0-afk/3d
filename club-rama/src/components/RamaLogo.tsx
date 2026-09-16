type Props = { size?: number; variant?: 'oro' | 'nero'; className?: string; title?: string };

/** Le quattro barre del marchio: due coppie parallele, inclinate come "//". */
export const BARRE = [2, 7.6, 17.4, 23].map(
  (x) => `M${x + 4.2} 5H${x + 7.6}L${x + 3.4} 27H${x}Z`,
);

/**
 * Il marchio Rama. Un solo componente, usato ovunque: header, perno della
 * ruota, moneta, tessera.
 */
export function RamaLogo({ size = 24, variant = 'oro', className, title }: Props) {
  const id = `rama-oro-${variant}-${size}`;
  const fill = variant === 'oro' ? `url(#${id})` : 'currentColor';
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" className={className}
      role={title ? 'img' : 'presentation'} aria-label={title} aria-hidden={title ? undefined : true}
    >
      {variant === 'oro' && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8CD86" />
            <stop offset="55%" stopColor="#C9A54E" />
            <stop offset="100%" stopColor="#8C6E27" />
          </linearGradient>
        </defs>
      )}
      {BARRE.map((d, i) => <path key={i} d={d} fill={fill} />)}
    </svg>
  );
}
