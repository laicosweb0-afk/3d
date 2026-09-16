import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
};

export function PrimaryButton({ children, onClick, disabled, loading, type = 'button' }: Props) {
  const spento = disabled || loading;
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={spento}
      whileTap={spento ? undefined : { scale: 0.975 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={[
        'w-full min-h-[52px] rounded-pill px-6 text-headline',
        'flex items-center justify-center gap-2',
        'transition-colors duration-200',
        spento ? 'bg-ink/15 text-ink/35' : 'bg-ink text-white shadow-rilievo',
      ].join(' ')}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white animate-spin"
        />
      )}
      {children}
    </motion.button>
  );
}
