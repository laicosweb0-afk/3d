// La parte del personaggio che il browser può vedere: i testi di scena.
//
// Il system prompt NON sta qui: sta in `personaggio.server.ts`, che possono
// importare solo le API routes. La separazione non è pignoleria — è il muro
// che impedisce a un import distratto di portare il prompt (e ciò che
// contiene) dentro il bundle client. Vedi il commento in quel file.

/** La prima cosa che il coniglio dice, appena sbuca. */
export const BENVENUTO =
  'Oh! Sei arrivato fin qui… Hai bisogno di una mano? Se mi parli, ti rispondo davvero.';

/** Quello che dice se il cervello non risponde: resta in personaggio anche nel guasto. */
export const SCUSA =
  'Tic tac… mi si è impigliata la catena dell\'orologio. Riprova fra un istante, ti aspetto qui.';

/** Il claim del biglietto da visita, che la pagina deve raccogliere alla lettera. */
export const CLAIM = {
  titolo: 'Hai superato il',
  titoloAccento: 'primo',
  titoloCoda: 'passo.',
  sottotitolo: 'Il prossimo è una tua scelta.',
  marchio: 'WO•MAN Parfume Store',
  fondazione: 'Since 1989',
  invito: 'Continua',
  destinazione: 'https://www.womanparfume.com/catalog',
};
