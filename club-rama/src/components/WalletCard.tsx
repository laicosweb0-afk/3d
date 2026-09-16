import { motion } from 'framer-motion';
import { RamaLogo } from './RamaLogo';
import { dataBreve } from '../config/game';

type Props = {
  nome: string;
  credito: number;
  ambiente: string;
  codice: string;
  scadenza: Date;
};

/** La tessera del credito, nello spirito delle carte di Apple Wallet. */
export function WalletCard({ nome, credito, ambiente, codice, scadenza }: Props) {
  return (
    <motion.div
      initial={{ y: 22, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 190, damping: 26, delay: 0.1 }}
      className="relative overflow-hidden rounded-[22px] p-6 text-white shadow-rilievo"
      style={{ background: 'linear-gradient(158deg, #2A2621 0%, #1D1D1F 55%, #14120E 100%)' }}
    >
      <div aria-hidden className="absolute -right-16 -top-20 h-48 w-48 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(201,165,78,.30), transparent 68%)' }} />

      <div className="relative flex items-center gap-2">
        <RamaLogo size={20} />
        <span className="text-footnote font-semibold tracking-[.02em] text-white/80">Club Rama</span>
      </div>

      <div className="relative mt-6 flex items-baseline gap-1">
        <span className="tabular text-[52px] font-bold leading-none tracking-[-0.04em]">{credito}</span>
        <span className="text-title text-white/55">€</span>
      </div>
      <p className="relative mt-1 text-footnote text-white/55">di credito sul preventivo</p>

      <div className="relative mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
        <Voce etichetta="Intestato a" valore={nome} />
        <Voce etichetta="Ambiente" valore={ambiente} />
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
      <p className={`mt-1 text-callout font-semibold ${mono ? 'tabular tracking-[.06em] text-oro-chiaro' : ''}`}>
        {valore}
      </p>
    </div>
  );
}
