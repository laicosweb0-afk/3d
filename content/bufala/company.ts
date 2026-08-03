// Dati aziendali REALI di Quelli della bufala, dal biglietto da visita
// fornito dal cliente (DIRECTION_BUFALA.md §7). Regola non negoziabile del
// progetto: qui non entra nulla di inventato. Ciò che manca resta assente.

export const company = {
  /** Marchio commerciale — è questo che il visitatore conosce. */
  brand: 'Quelli della bufala',
  /** Ragione sociale, per footer e dati strutturati. */
  ragioneSociale: 'FOOD SERVICE S.A.S. di Marra Salvatore & C.',

  telefono: '+39 392 0220924',
  telefonoHref: 'tel:+393920220924',
  email: 'info@quellidellabufala.it',
  sito: 'www.quellidellabufala.it',

  /** Sede legale e amministrativa — non è il punto vendita. */
  sedeLegale: {
    via: 'Via Fondovalle Rubicone, 11',
    cap: '47030',
    comune: 'Borghi',
    provincia: 'FC',
  },

  /** Sede operativa: vendita ingrosso e dettaglio. È il posto che il
   *  visitatore deve trovare — confermato dal cliente come unico indirizzo
   *  da mostrare nei contatti. */
  puntoVendita: {
    presso: 'C.A.R.R. di Rimini — Centro Agro Alimentare Riminese SpA',
    via: 'Via Emilia Vecchia, 75',
    cap: '47923',
    comune: 'Rimini',
    provincia: 'RN',
    dettaglio: 'Padiglione centrale · Mercato ortofrutticolo · Area Servizi',
    uscita: 'Uscita autostrada Rimini Nord',
    accesso: 'Ingresso libero e gratuito per grossisti e privati',
  },
} as const;

/** Indirizzo del punto vendita su una riga, per meta e microcopy. */
export const indirizzoPuntoVendita =
  `${company.puntoVendita.via}, ${company.puntoVendita.cap} ${company.puntoVendita.comune} (${company.puntoVendita.provincia})`;
