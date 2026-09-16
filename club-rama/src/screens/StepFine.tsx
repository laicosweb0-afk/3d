import { motion } from 'framer-motion';
import { WalletCard } from '../components/WalletCard';
import type { Lead } from '../lib/lead';

export function StepFine({ lead, onRicomincia }: { lead: Lead; onRicomincia: () => void }) {
  const primoNome = lead.nome.split(' ')[0];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex h-14 w-14 items-center justify-center rounded-full shadow-moneta"
          style={{ background: 'conic-gradient(from 200deg, #E8CD86, #C9A54E, #F6E4B4, #8C6E27, #E8CD86)' }}
        >
          {/* La spunta entra con una molla invece di essere disegnata tratto per
              tratto: a 26px il disegno progressivo si legge come un difetto. */}
          <motion.svg width="28" height="28" viewBox="0 0 26 26" fill="none" aria-hidden
            initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 17, delay: 0.18 }}>
            <path d="M6 13.4 11 18.4 20 8.2" stroke="#1D1D1F" strokeWidth="2.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.div>

        <h1 className="mt-5 text-title">{primoNome}, il credito è tuo</h1>
        {lead.ritiro === 'email' && (
          <p className="mt-2 text-body text-ink-soft">
            Ti abbiamo mandato il codice a <span className="text-ink">{lead.email}</span>
          </p>
        )}
      </div>

      <div className="mt-8">
        <WalletCard
          nome={lead.nome} credito={lead.credito} ambiente={lead.ambiente}
          codice={lead.codiceCredito} scadenza={new Date(lead.scadenza)}
        />
      </div>

      {lead.ritiro === 'negozio' && (
        <p className="mt-5 text-center text-callout text-ink-soft">
          Mostra questa schermata in negozio quando chiedi il preventivo.
        </p>
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
