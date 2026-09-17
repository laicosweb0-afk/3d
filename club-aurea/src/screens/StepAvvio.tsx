import { motion } from 'framer-motion';
import { AureaLogo } from '../components/AureaLogo';
import { PrimaryButton } from '../components/PrimaryButton';

/**
 * Il patto, prima di cominciare: cosa chiediamo e cosa si porta a casa.
 *
 * Il credito è detto qui, non alla fine: chi sa già che qualcosa si vince
 * gioca, chi lo scopre dopo pensa di essere stato preso in giro. E il credito
 * non dipende dalle risposte — anche questo va detto subito, o le tre domande
 * diventano un esame.
 */
export function StepAvvio({ domande, onAvanti }: { domande: number; onAvanti: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-largeTitle">Ora prova a indovinare le fragranze</h1>
      <p className="mt-2 text-body text-ink-soft">
        {domande} note: testa, cuore e fondo di quello che stai sentendo.
        Poi giri la ruota — il credito arriva comunque.
      </p>

      <div className="relative flex flex-1 items-center justify-center py-6">
        {/* L'alone che respira: il profumo che si allarga nella stanza. */}
        <motion.span
          aria-hidden
          className="absolute h-56 w-56 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(201,165,78,.34), transparent 70%)' }}
          animate={{ scale: [1, 1.14, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 22 }}
          className="relative"
        >
          <AureaLogo size={132} />
        </motion.div>
      </div>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={onAvanti}>Comincia</PrimaryButton>
      </div>
    </div>
  );
}
