// Tutte le stringhe del prototipo The Fragrance Experience (BRIEF §9).
// Il flusso legge solo `copy` (lingua attiva): per aggiungere una lingua
// basta aggiungere una chiave a `COPY` e cambiare `LANG`, senza toccare
// i componenti.

const it = {
  meta: {
    title: 'The Fragrance Experience — Woman',
    description: 'Annusa. Indovina. Condividi.',
  },

  claim: 'SMELL. GUESS. SHARE.',
  claimSub: 'Annusa. Indovina. Condividi.',

  levels: {
    curioso: 'Naso Curioso',
    allenato: 'Naso Allenato',
    esperto: 'Naso Esperto',
  },
  levelLabel: 'Il tuo livello',

  s0: {
    coupon: {
      title: 'Hai in mano una fragranza senza nome.',
      subtitle: 'Annusala. Poi prova a riconoscerla.',
    },
    busta: {
      // {nome} e {mittente} vengono sostituiti a runtime
      title: 'Ciao {nome}.',
      subtitle:
        '{mittente} ha annusato questa fragranza e ha pensato che dovessi sentirla anche tu.',
      // Riga obbligatoria: è la trasparenza dovuta (BRIEF §4, S0-B).
      transparency: '{mittente} saprà che l’hai aperta.',
      defaultNome: 'Giulia',
      defaultMittente: 'Marco',
    },
    cta: 'Inizia',
  },

  s1: {
    eyebrow: 'Prima di scoprirlo.',
    question: 'Cosa hai sentito?',
  },

  s2: {
    guessed: {
      eyebrow: 'Naso allenato',
      byMaison: 'di {maison}',
    },
    missed: {
      eyebrow: 'Il tuo naso ti ha portato altrove',
      trick: 'E non è un caso: sotto c’è un accordo di {trickNote} che confonde quasi tutti.',
      pct: 'Il {pct}% ha risposto come te.',
    },
    reveal: 'È {name}.',
    credit: 'Hai 15 € in fialette. Tre fialette da 5 €, tue con il prossimo ordine.',
    creditSub: 'Una l’hai già annusata. Le altre tre ti aspettano.',
    cta: 'Scegli le tue fragranze',
  },

  s3: {
    title: 'Le tue tre fialette.',
    guessedSub: 'Scegli tu.',
    missedSub: 'Le abbiamo scelte per te, in base a quello che hai sentito.',
    change: 'cambiale',
    summaryLabel: 'Le tue tre',
    cta: 'Conferma',
  },

  s4: {
    title: 'Dove ti mandiamo il tuo credito?',
    emailPlaceholder: 'La tua email',
    consent: 'Acconsento a ricevere il credito via email.',
    privacyLink: 'Privacy policy',
    cta: 'Salva le mie fialette',
  },

  s5: {
    title: 'Hai una busta da consegnare.',
    text: 'Dentro c’è un’altra fragranza senza nome. Decidi tu a chi darla.',
    namePlaceholder: 'Il suo nome (facoltativo)',
    cta: 'Fatto',
    later: 'Deciderò dopo',
  },

  end: {
    creditSaved: 'Il tuo credito è al sicuro.',
  },

  demo: {
    open: 'Pannello demo',
    title: 'Demo',
    entry: 'Ingresso',
    entryCoupon: 'Coupon',
    entryBusta: 'Busta',
    outcome: 'Risposta',
    outcomeOff: 'Libera',
    outcomeRight: 'Forza esatta',
    outcomeWrong: 'Forza errata',
    restart: 'Ricomincia',
    events: 'Eventi tracciati',
    noEvents: 'Ancora nessun evento.',
    coupon: 'Coupon',
  },
} as const;

export type Copy = typeof it;

export const COPY = { it } as const;
export type Lang = keyof typeof COPY;

export const LANG: Lang = 'it';
export const copy: Copy = COPY[LANG];

/** Sostituisce i segnaposto {chiave} in una stringa del copy. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
