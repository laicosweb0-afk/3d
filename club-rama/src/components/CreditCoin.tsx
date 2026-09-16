import { motion } from 'framer-motion';

/**
 * La moneta del credito: gradiente d'oro con un riflesso che scorre lento,
 * marchio nero al centro. Entra con una molla e una mezza rotazione.
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
          style={{ background: 'radial-gradient(circle, rgba(201,165,78,.34), transparent 68%)' }}
        />
      )}
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full shadow-moneta"
        style={{ background: 'conic-gradient(from 200deg, #E8CD86, #C9A54E, #F6E4B4, #8C6E27, #C9A54E, #E8CD86)' }}
      >
        <motion.div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,.58) 50%, transparent 62%)' }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
        />
        <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 32 32" fill="#1D1D1F" aria-hidden
          className="relative">
          <path d="M10.6 4h5.2L11.4 28H6.2L10.6 4Z" />
          <path d="M17.8 4H23l-4.4 24h-5.2L17.8 4Z" />
          <path d="M24.6 4h3.2l-4.4 24h-3.2L24.6 4Z" opacity=".55" />
        </svg>
      </div>
    </motion.div>
  );
}
