import { motion } from 'framer-motion';
import { WomanLogo } from './WomanLogo';
import { NfcWave } from './NfcWave';
import { PREMIO, dataBreve } from '../config/gioco';

type Props = {
  nome: string;
  credito: number;
  livello: string;
  codice: string;
  scadenza: Date;
};

/**
 * La tessera del credito, nello spirito delle carte di Apple Wallet.
 *
 * Dove un coupon di carta metterebbe il QR ci sono le onde dell'NFC: il
 * codice resta scritto in chiaro — è quello che la cassa digita — e il
 * quadrato da inquadrare non serve più.
 *
 * Il livello sta accanto al nome perché è la cosa che resta: le fialette si
 * consumano, «naso allenato» no, e a ogni edizione sale.
 */
export function WalletCard({ nome, credito, livello, codice, scadenza }: Props) {
  return (
    <motion.div
      initial={{ y: 22, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 190, damping: 26, delay: 0.1 }}
      className="relative overflow-hidden rounded-[22px] p-6 text-white shadow-rilievo"
      style={{ background: 'linear-gradient(158deg, #2A1F28 0%, #1A171C 55%, #0E0C10 100%)' }}
    >
      <div aria-hidden className="absolute -right-16 -top-20 h-48 w-48 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(189,58,102,.36), transparent 68%)' }} />

      <div className="relative flex items-center justify-between">
        <WomanLogo size={16} variante="chiaro" />
        <NfcWave size={18} className="text-white/45" />
      </div>

      <div className="relative mt-6 flex items-baseline gap-1">
        <span className="tabular text-[52px] font-bold leading-none tracking-[-0.04em]">{credito}</span>
        <span className="text-title text-white/55">€</span>
      </div>
      <p className="relative mt-1 text-footnote text-white/55">
        in {PREMIO.fialette} fialette da {PREMIO.taglio} €
      </p>

      <div className="relative mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
        <Voce etichetta="Intestato a" valore={nome} />
        <Voce etichetta="Livello" valore={livello} />
        <Voce etichetta="Codice" valore={codice} mono />
        <Voce etichetta="Valido fino al" valore={dataBreve(scadenza)} />
      </div>
    </motion.div>
  );
}

function Voce({ etichetta, valore, mono }: { etichetta: string; valore: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[.09em] text-white/40">{etichetta}</p>
      <p className={`mt-1 text-callout font-semibold ${mono ? 'tabular tracking-[.06em] text-magenta-chiaro' : ''}`}>
        {valore}
      </p>
    </div>
  );
}
