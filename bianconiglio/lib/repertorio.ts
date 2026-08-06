// Il cervello del prototipo: un repertorio recitato, non un'intelligenza.
//
// Decisione del 6/8 (seconda stesura): la demo racconta IL PERSONAGGIO e il
// mistero del biglietto — il primo passo, l'orologio, il segreto — non il
// catalogo. Niente consigli-profumo: chi chiede dei profumi riceve uno
// svicolo di carattere che riporta al gioco. Tono da cartone: frasi corte,
// «ih ih», tic tac. Il cervello vero (Claude) resta in `app/api/chat`,
// pronto per quando si vorrà l'intelligenza.
//
// REGOLA D'ORO: ogni testo qui sotto deve combaciare ALLA LETTERA con
// l'audio recitato in `public/voce/<id>.mp3` — il fumetto scrive questo
// testo mentre l'audio lo dice. Se cambi una battuta, va rigenerato il suo
// audio.

export type Battuta = { id: string; testo: string };

type Regola = {
  id: string;
  /** Basta UNA di queste sottostringhe (già normalizzate) per far scattare la regola. */
  parole: string[];
  testo: string;
};

/** Minuscole e senza accenti: «perché» e «perche» devono essere la stessa parola. */
function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// L'ordine è la priorità: la prima regola che scatta vince. Le domande sul
// mistero stanno in cima; i saluti in fondo, perché «ciao, e adesso cosa
// faccio?» deve parlare del passo, non salutare.
const REGOLE: Regola[] = [
  {
    id: 'tictac',
    parole: [
      'chi sei', 'chi ti manda', 'cosa succede', 'cosa succedera', 'che succede',
      'cosa sei', 'come ti chiami', 'chi e dietro', 'sei vero', 'cosa significa',
    ],
    testo:
      'Tic tac… ogni cosa a suo tempo. Per ora, seguimi: parliamo di profumi, che è la cosa che so fare meglio.',
  },
  {
    id: 'primopasso',
    parole: [
      'primo passo', 'secondo passo', 'passo', 'prossimo', 'continua', 'e adesso',
      'ora cosa', 'poi cosa', 'che devo fare', 'cosa devo fare', 'cosa si fa',
    ],
    testo:
      'Il primo passo l’hai fatto — evviva, lo sapevo che eri sveglio! Il secondo passo? Eh no, non si svela: si scopre. Tic tac… seguimi e basta!',
  },
  {
    id: 'comemai',
    parole: [
      'come mai sei', 'perche sei qui', 'cosa ci fai', 'da dove vieni',
      'come sei arrivato', 'dove siamo', 'che posto',
    ],
    testo:
      'Come mai sono qui? Ih ih… io ci sono sempre stato! Sei tu che oggi mi hai trovato. E adesso che mi hai trovato, non ti perdo più di vista!',
  },
  {
    id: 'biglietto',
    parole: ['biglietto', 'qr', 'codice', 'pacco', 'pacchetto', 'scatola', 'cartolin'],
    testo:
      'L’hai trovato nel pacchetto, vero? Quello non era un biglietto: era un invito. E tu l’hai capito al volo — sei proprio dei nostri.',
  },
  {
    id: 'orologio',
    parole: ['orologio', 'che ore', 'il tempo', 'tic tac', 'ticchett'],
    testo:
      'Il mio orologio è speciale: non segna le ore, segna le occasioni. E senti senti… proprio adesso ne sta ticchettando una. Tic tac… tic tac…',
  },
  {
    id: 'segreto',
    parole: [
      'segreto', 'sorpresa', 'nascond', 'mistero', 'gennaio', 'novita',
      'cosa arriva', 'cosa bolle',
    ],
    testo:
      'Un segreto c’è, eccome! Ma un coniglio che spiffera i segreti è un pessimo coniglio. Torna a trovarmi, e a ogni visita… un indizio in più.',
  },
  {
    id: 'seguire',
    parole: ['seguir', 'ti seguo', 'dove andiamo', 'portami', 'guidami', 'strada'],
    testo:
      'Seguirmi? Ma sei già sulla strada giusta! Resta con me: al momento giusto ti faccio strada io. Il tempo, qui, sa sempre quello che fa.',
  },
  {
    id: 'complimento',
    parole: [
      'bello', 'bellissimo', 'carino', 'tenero', 'dolcissimo', 'fantastico',
      'wow', 'incredibile', 'magia', 'adorabile', 'stupendo',
    ],
    testo:
      'Ih ih, grazie! Ma non hai ancora visto niente: le sorprese più belle le tengo per dopo. A chi sa aspettare, il tempo regala meraviglie!',
  },
  {
    id: 'arrivederci',
    parole: ['arrivederci', 'a presto', 'ci vediamo', 'devo andare', 'buonanotte', 'vado via'],
    testo:
      'Già vai? Uffa… E va bene: ma torna, eh! Io resto qui, con l’orologio in zampa e un pensiero per te. Tic tac…',
  },
  {
    id: 'grazie',
    parole: ['grazie', 'gentile', 'sei bravo', 'bravissimo'],
    testo:
      'Prego, prego — piacere tutto mio! Lo sai che quasi nessuno ringrazia un coniglio? Tu sì. Sei proprio uno di quelli giusti.',
  },
  {
    // L'unico consiglio vero rimasto in repertorio: era già recitato e pagato,
    // e a chi nomina proprio i legni fa fare al coniglio un figurone.
    id: 'legnoso',
    parole: ['legn', 'sandalo', 'cedro', 'vetiver'],
    testo:
      'Ah, i legni… chi li ama sa aspettare. Prova Molecule 01 di Escentric Molecules: una sola nota, morbida e magnetica, che ti segue tutto il giorno come un’ombra elegante. Fidati del coniglio.',
  },
  {
    // Tutte le altre domande sui profumi: svicolo di carattere, si torna al gioco.
    id: 'consiglio',
    parole: [
      'profum', 'consigli', 'fragranz', 'essenz', 'vanigl', 'dolce', 'fresco',
      'agrum', 'fiorito', 'per lei', 'per lui', 'regalo', 'sera',
    ],
    testo:
      'I profumi! Il mio argomento del cuore… ma oggi ho la bocca cucita: sono il coniglio del benvenuto, mica del negozio. Chiedimi del primo passo… o del mio orologio!',
  },
  {
    id: 'saluto',
    parole: ['ciao', 'buongiorno', 'buonasera', 'salve', 'ehi', 'hey'],
    testo:
      'Oh, ben arrivato! Qui il tempo corre e i profumi aspettano. Dimmi: cerchi qualcosa per te, o per qualcuno che ti fa battere il cuore?',
  },
];

/** Quando nessuna regola scatta: si resta nel personaggio e si offre la strada. */
const FUORI_TEMA: Battuta = {
  id: 'fuoritema',
  testo:
    'Uh, che domandona! Io sono solo un coniglio col panciotto… però ascolto benissimo. Prova a chiedermi del primo passo, o del mio orologio!',
};

/** Il cervello del prototipo: la prima regola che scatta vince. */
export function rispondi(domanda: string): Battuta {
  const pulita = normalizza(domanda);
  for (const regola of REGOLE) {
    if (regola.parole.some((p) => pulita.includes(p))) {
      return { id: regola.id, testo: regola.testo };
    }
  }
  return FUORI_TEMA;
}

/**
 * Tutte le battute che esistono, benvenuto compreso: è la lista da cui si
 * generano gli audio in `public/voce/`. Tenerla qui evita che una battuta
 * nuova resti senza voce per dimenticanza.
 */
export function tutteLeBattute(benvenuto: string): Battuta[] {
  return [
    { id: 'benvenuto', testo: benvenuto },
    ...REGOLE.map(({ id, testo }) => ({ id, testo })),
    FUORI_TEMA,
  ];
}
