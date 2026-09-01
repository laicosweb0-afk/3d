// Tutte le stringhe del prototipo The Fragrance Experience.
// Il flusso legge solo `copy` (lingua attiva): per aggiungere una lingua
// basta aggiungere una chiave a `COPY` e cambiare `LANG`, senza toccare
// i componenti.

const it = {
  meta: {
    title: 'The Fragrance Experience — WO•MAN',
    description: 'Annusa. Indovina. Condividi.',
  },

  claim: 'SMELL. GUESS. SHARE.',
  claimSub: 'Annusa. Indovina. Condividi.',
  eyebrow: 'The Fragrance Experience',

  levels: {
    curioso: 'Naso Curioso',
    allenato: 'Naso Allenato',
    esperto: 'Naso Esperto',
  },
  levelLabel: 'Il tuo livello',

  landing: {
    title: 'Riconosci la fragranza?',
    sub: 'Annusa la tua fialetta.\nPoi prova a indovinare.',
    busta: {
      // {nome} e {mittente} vengono sostituiti a runtime
      title: 'Ciao {nome}.',
      sub: '{mittente} ha annusato questa fragranza e ha pensato che dovessi sentirla anche tu.',
      // Riga obbligatoria: è la trasparenza dovuta.
      transparency: '{mittente} saprà che l’hai aperta.',
      defaultNome: 'Giulia',
      defaultMittente: 'Marco',
    },
    cta: 'Inizia il quiz',
  },

  warmup: 'Partiamo.',

  quiz: {
    counter: '{n} / {total}', // es. 01 / 04
  },

  result: {
    eyebrow: 'Your result',
    almost: 'Ci siamo quasi.',
    right: {
      title: 'Esatto.',
      sub: 'Hai riconosciuto la fragranza.',
    },
    wrong: {
      title: 'Non era questa.',
      sub: 'Ma il bello è proprio scoprire cosa ti piace.',
      chosen: 'Abbiamo scelto 3 fragranze per te.',
    },
    reveal: 'È {name}, di {maison}.',
    pct: 'Il {pct}% ha risposto come te.',
    cta: 'Scopri le tue 3 fragranze',
  },

  reward: {
    amount: '€15',
    label: 'di credito',
    sub: 'Da utilizzare per scoprire 3 nuove fragranze.',
    note: 'Tue con il prossimo ordine.',
  },

  recs: {
    titleRight: 'Le tue 3 fragranze.',
    titleWrong: 'Scelte per te.',
    cta: 'Salva il tuo credito',
  },

  email: {
    title: 'Dove ti mandiamo il tuo credito?',
    placeholder: 'La tua email',
    consent: 'Acconsento a ricevere il credito via email.',
    privacyLink: 'Privacy policy',
    cta: 'Salva le mie fialette',
  },

  envelope: {
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
