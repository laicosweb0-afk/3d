/**
 * Il marchio: il file vero, preso dal prototipo — «WO», la O con le tre
 * barrette, il punto magenta, «MAN».
 *
 * Due versioni, una per fondo: quella scura ha il testo nero, quella chiara
 * lo ha crema. Sono due PNG e non un SVG perché è così che ci sono arrivati;
 * il giorno che salta fuori il vettoriale si sostituiscono i due file e non
 * si tocca nient'altro.
 */
export function WomanLogo({
  size = 17, variante = 'scuro', title,
}: {
  size?: number;
  variante?: 'scuro' | 'chiaro';
  title?: string;
}) {
  const file = variante === 'chiaro' ? 'logo-chiaro.png' : 'logo-scuro.png';
  return (
    <img
      src={import.meta.env.BASE_URL + file}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      style={{ height: size + 5, width: 'auto', display: 'block' }}
    />
  );
}
