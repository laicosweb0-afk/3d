/**
 * Il marchio: **WO•MAN**, con il punto magenta al posto del trattino.
 *
 * È una ricostruzione tipografica in Inter, non il logo originale: nel
 * documento strategico il marchio sta dentro un'immagine, e da un PNG non si
 * ricava un vettoriale. **Appena arriva il file vettoriale va sostituito
 * questo componente** — è l'unico posto da toccare.
 */
export function WomanLogo({
  size = 17, variante = 'scuro', coda = false, title, animato = false,
}: {
  size?: number;
  variante?: 'scuro' | 'chiaro';
  coda?: boolean;
  title?: string;
  animato?: boolean;
}) {
  const colore = variante === 'chiaro' ? 'var(--light)' : 'var(--ink)';
  return (
    <span
      className="inline-flex flex-col items-center leading-none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span
        className="flex items-center"
        style={{
          fontSize: size, color: colore, fontWeight: 600, letterSpacing: '0.04em',
        }}
      >
        WO
        <span
          aria-hidden
          className={animato ? 'inline-block ra' : 'inline-block'}
          style={{
            width: size * 0.26, height: size * 0.26, borderRadius: '50%',
            background: 'var(--magenta)', margin: `0 ${size * 0.13}px`,
            animationDelay: animato ? '400ms' : undefined,
          }}
        />
        MAN
      </span>
      {coda && (
        <span
          style={{
            marginTop: size * 0.42, fontSize: size * 0.3, letterSpacing: '0.24em',
            color: variante === 'chiaro' ? 'var(--light-soft)' : 'var(--eyebrow)',
            textTransform: 'uppercase', fontWeight: 500,
          }}
        >
          Parfume Store
        </span>
      )}
    </span>
  );
}
