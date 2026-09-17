import { motion } from 'framer-motion';

/**
 * Le onde dell'NFC: tre archi che partono da un punto, come sulla card
 * fisica. Prendono il posto che su un coupon di carta avrebbe il QR.
 *
 * La differenza non è grafica. Un QR va inquadrato: serve la fotocamera, la
 * luce giusta, la mano ferma e un codice grande almeno due centimetri. La
 * card si appoggia e basta, e il telefono apre la pagina da solo. Sul coupon
 * il quadrato bianco spariva sotto le pieghe; qui non c'è più niente da
 * stampare bene.
 */
export function NfcWave({
  size = 22, className, animato = true,
}: { size?: number; className?: string; animato?: boolean }) {
  const archi = [
    { d: 'M7.5 4.5a10 10 0 0 1 0 15', opacity: 1 },
    { d: 'M12 1.5a14.5 14.5 0 0 1 0 21', opacity: 0.62 },
    { d: 'M16.5 -1a19 19 0 0 1 0 26', opacity: 0.32 },
  ];
  return (
    <svg width={size} height={size * (24 / 22)} viewBox="0 0 22 24" fill="none"
      className={className} aria-hidden>
      <circle cx="4" cy="12" r="2.1" fill="currentColor" />
      {archi.map((a, i) =>
        animato ? (
          <motion.path
            key={i} d={a.d} stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, a.opacity, a.opacity, 0] }}
            transition={{ duration: 2.2, times: [0, 0.2, 0.7, 1], repeat: Infinity, delay: i * 0.16 }}
          />
        ) : (
          <path key={i} d={a.d} stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            opacity={a.opacity} />
        ),
      )}
    </svg>
  );
}
