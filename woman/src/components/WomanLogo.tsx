import { motion } from 'framer-motion';

/**
 * Il marchio: **WO•MAN**, con il punto magenta al posto del trattino.
 *
 * È una ricostruzione tipografica, non il logo originale: il documento
 * strategico lo mostra dentro un'immagine, e da un PNG non si ricava un
 * vettoriale. Le proporzioni, il punto e la coda «Parfume Store · SINCE
 * 1989» sono presi da lì. **Appena arriva il file vettoriale del marchio, va
 * sostituito questo componente** — è l'unico posto da toccare, lo disegnano
 * tutti gli altri passando di qui.
 *
 * Il punto è l'unica cosa colorata: nel logo vero è una perla rosa, qui un
 * cerchio pieno. A 20px la perla con i suoi riflessi diventerebbe comunque
 * una macchia rosa, che è esattamente quello che disegniamo.
 */
type Props = {
  /** L'altezza della scritta WO•MAN, in px. Il resto scala di conseguenza. */
  size?: number;
  /** `chiaro` per i fondi scuri: la scritta diventa crema, il punto resta. */
  variante?: 'scuro' | 'chiaro';
  /** Sotto la scritta compaiono «Parfume Store» e «SINCE 1989». */
  coda?: boolean;
  className?: string;
  title?: string;
  /** Il punto arriva dopo le lettere, con una molla. */
  animato?: boolean;
};

export function WomanLogo({
  size = 18, variante = 'scuro', coda = false, className, title, animato,
}: Props) {
  const inchiostro = variante === 'chiaro' ? '#F2EBE3' : '#1A171C';
  return (
    <span
      className={`inline-flex flex-col items-center leading-none ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span
        className="flex items-center font-sans font-extrabold"
        style={{
          fontSize: size,
          color: inchiostro,
          // La spaziatura larga è metà del carattere del marchio: senza,
          // «WOMAN» si legge come una parola qualsiasi.
          letterSpacing: '0.02em',
        }}
      >
        WO
        {animato ? (
          <motion.span
            aria-hidden
            className="mx-[0.14em] inline-block rounded-full bg-magenta"
            style={{ width: size * 0.3, height: size * 0.3 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.22 }}
          />
        ) : (
          <span
            aria-hidden
            className="mx-[0.14em] inline-block rounded-full bg-magenta"
            style={{ width: size * 0.3, height: size * 0.3 }}
          />
        )}
        MAN
      </span>

      {coda && (
        <>
          <span
            className="mt-[0.35em] font-sans font-semibold"
            style={{ fontSize: size * 0.34, color: inchiostro, letterSpacing: '0.04em' }}
          >
            Parfume Store
          </span>
          <span
            className="mt-[0.3em] font-sans"
            style={{
              fontSize: size * 0.24,
              color: variante === 'chiaro' ? '#A99F97' : '#6B635C',
              letterSpacing: '0.22em',
            }}
          >
            SINCE 1989
          </span>
        </>
      )}
    </span>
  );
}
