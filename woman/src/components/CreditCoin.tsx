import { motion } from 'framer-motion';
import { Perla } from './Perla';

/**
 * La moneta del credito: magenta lucido con un riflesso che scorre lento e la
 * perla del marchio al centro. Entra con una molla e una mezza rotazione.
 */
export function CreditCoin({ size = 116, piccola = false }: { size?: number; piccola?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.55, rotateY: -140, opacity: 0 }}
      animate={{ scale: 1, rotateY: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 14, mass: 0.9 }}
      style={{ width: size, height: size, perspective: 600 }}
      className="relative shrink-0"
    >
      {!piccola && (
        <div
          aria-hidden
          className="absolute -inset-8 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(189,58,102,.34), transparent 68%)' }}
        />
      )}
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full shadow-moneta"
        style={{ background: 'conic-gradient(from 200deg, #D5799A, #BD3A66, #F4B9CE, #8E2649, #BD3A66, #D5799A)' }}
      >
        <motion.div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,.58) 50%, transparent 62%)' }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
        />
        {/* La perla in crema: sul magenta, una perla magenta sparirebbe. */}
        <span className="relative">
          <Perla size={size * 0.42} tinta="crema" />
        </span>
      </div>
    </motion.div>
  );
}
