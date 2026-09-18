import { motion } from 'framer-motion';
import { Boccetta } from '../components/Boccetta';
import { PrimaryButton } from '../components/PrimaryButton';
import type { Fragranza } from '../config/gioco';

/**
 * Il patto, prima di cominciare: cosa chiediamo e cosa si porta a casa.
 *
 * Il credito è detto qui, non alla fine: chi sa già che qualcosa si vince
 * gioca, chi lo scopre dopo pensa di essere stato preso in giro. E il credito
 * non dipende dalle risposte — anche questo va detto subito, o le tre domande
 * diventano un esame.
 *
 * Qui la boccetta è sempre quella disegnata, mai la foto della fragranza in
 * diffusione: la foto ha l'etichetta, l'etichetta ha il nome, e il nome è la
 * soluzione. Si scopre alla fine, insieme al resto.
 */
export function StepAvvio({
  fragranza, onAvanti,
}: { fragranza: Fragranza; onAvanti: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-largeTitle">Ora prova a indovinare le fragranze</h1>
      <p className="mt-2 text-body text-ink-soft">
        {fragranza.domande.length} note: quello che senti appena lo annusi, quello che
        arriva dopo e quello che resta. Poi giri la ruota — il credito arriva comunque.
      </p>

      <div className="relative flex flex-1 items-center justify-center py-4">
        {/* L'alone che respira: il profumo che si allarga nella stanza. */}
        <motion.span
          aria-hidden
          className="absolute h-60 w-60 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(201,165,78,.34), transparent 70%)' }}
          animate={{ scale: [1, 1.14, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <Boccetta size={168} />
      </div>

      <div className="mt-auto pt-4">
        <PrimaryButton onClick={onAvanti}>Comincia</PrimaryButton>
      </div>
    </div>
  );
}
