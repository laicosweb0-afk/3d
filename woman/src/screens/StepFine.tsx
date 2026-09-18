import { motion } from 'framer-motion';
import { WalletCard } from '../components/WalletCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Perla } from '../components/Perla';
import { WHATSAPP_NEGOZIO, messaggioWhatsApp } from '../config/gioco';
import type { Lead } from '../lib/lead';

export function StepFine({ lead, onRicomincia }: { lead: Lead; onRicomincia: () => void }) {
  const primoNome = lead.nome.split(' ')[0];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative flex h-14 w-14 items-center justify-center"
        >
          <Perla size={56} />
          <motion.svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden
            className="absolute"
            initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 17, delay: 0.18 }}>
            <path d="M6 13.4 11 18.4 20 8.2" stroke="#FFFCF7" strokeWidth="2.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>

        <h1 className="mt-5 font-serif text-title">{primoNome}, è tuo</h1>
        <p className="mt-2 text-body text-ink-soft">
          Te lo mandiamo {lead.email ? <>a <span className="text-ink">{lead.email}</span></>
            : <>al <span className="text-ink">{lead.telefono}</span></>}
        </p>
      </div>

      <div className="mt-8">
        <WalletCard
          nome={lead.nome} credito={lead.credito} livello={lead.livello}
          codice={lead.codiceCredito} scadenza={new Date(lead.scadenza)}
        />
      </div>

      <p className="mt-5 text-center text-callout text-ink-soft">
        Le ritiri con il prossimo ordine: mostra questa schermata o detta il codice.
      </p>

      {WHATSAPP_NEGOZIO && (
        <div className="mt-6">
          <PrimaryButton
            onClick={() => {
              const testo = messaggioWhatsApp({
                nome: lead.nome, credito: lead.credito,
                codice: lead.codiceCredito, famiglia: lead.famiglia,
              });
              window.open(
                `https://wa.me/${WHATSAPP_NEGOZIO}?text=${encodeURIComponent(testo)}`,
                '_blank', 'noopener,noreferrer',
              );
            }}
          >
            Scrivici su WhatsApp
          </PrimaryButton>
        </div>
      )}

      <div className="mt-auto pt-10">
        <button onClick={onRicomincia}
          className="min-h-[44px] w-full text-callout text-ink-soft underline underline-offset-4">
          Ricomincia la prova
        </button>
      </div>
    </div>
  );
}
