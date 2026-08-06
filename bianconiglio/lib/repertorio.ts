// Il cervello del prototipo: un repertorio recitato, non un'intelligenza.
//
// Decisione del 6/8: il prototipo non chiama nessun servizio a pagamento.
// Il coniglio risponde con battute scritte qui, scelte per parole chiave.
// È dichiaratamente semplice — «anche domande non tanto intelligenti» — e va
// bene così: quello che deve funzionare è il personaggio e la voce. Il
// cervello vero (Claude, in `app/api/chat`) resta pronto nel progetto e si
// riaccende quando ci saranno le chiavi.
//
// Ogni battuta rispetta le regole del personaggio (§2.3): 2-4 frasi, mai
// elenchi, italiano, riferimenti sottili al tempo e al «seguirmi», mai le
// parole vietate. I profumi citati sono fragranze celebri dei marchi che la
// profumeria tratta davvero — nessun prodotto inventato.
//
// Ogni battuta ha un `id`: se in `public/voce/<id>.mp3` esiste l'audio
// recitato, il coniglio parla con quello; altrimenti ripiega sulla voce del
// browser. Per aggiungere una battuta: entry qui + (facoltativo) mp3 con lo
// stesso nome.

export type Battuta = { id: string; testo: string };

type Regola = {
  id: string;
  /** Basta UNA di queste sottostringhe (già normalizzate) per far scattare la regola. */
  parole: string[];
  testo: string;
};

/** Minuscole e senza accenti: «caffè» e «Caffe» devono essere la stessa parola. */
function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// L'ordine è la priorità: la prima regola che scatta vince. Le famiglie
// olfattive stanno PRIMA della richiesta generica («che profumo mi
// consigli?»), così «un profumo legnoso» va sui legni e non sulla domanda di
// ritorno; i saluti stanno in fondo perché «buonasera, cerco un profumo» deve
// parlare di profumi, non salutare.
const REGOLE: Regola[] = [
  {
    id: 'tictac',
    parole: [
      'chi sei', 'chi ti manda', 'cosa succede', 'cosa succedera', 'che succede',
      'perche sei qui', 'cosa sei', 'come ti chiami', 'chi e dietro', 'dove porta',
      'cosa significa', 'perche un coniglio', 'sei vero',
    ],
    testo:
      'Tic tac… ogni cosa a suo tempo. Per ora, seguimi: parliamo di profumi, che è la cosa che so fare meglio.',
  },
  {
    id: 'arrivederci',
    parole: ['arrivederci', 'a presto', 'ci vediamo', 'devo andare', 'buonanotte', 'vado via'],
    testo:
      'Tic tac… già suona l’ora dei saluti? Torna presto: i profumi cambiano con le stagioni, e io non mi muovo da qui.',
  },
  {
    id: 'grazie',
    parole: ['grazie', 'gentile', 'sei bravo', 'bravissimo'],
    testo:
      'Ma figurati, per questo son qui — tra un giro d’orologio e l’altro. Quando vuoi, sai dove trovarmi: basta seguire il coniglio.',
  },
  {
    id: 'legnoso',
    parole: ['legn', 'sandalo', 'cedro', 'vetiver', 'bosco'],
    testo:
      'Ah, i legni… chi li ama sa aspettare. Prova Molecule 01 di Escentric Molecules: una sola nota, morbida e magnetica, che ti segue tutto il giorno come un’ombra elegante. Fidati del coniglio.',
  },
  {
    id: 'caffe',
    parole: ['caffe', 'cioccolat', 'goloso', 'gourmand'],
    testo:
      'Golosa idea… Intense Café di Montale: rosa e caffè, come un salotto d’inverno col camino acceso. Il tempo di un tic tac, e la pelle se lo prende per sé.',
  },
  {
    id: 'dolce',
    parole: ['dolce', 'vanigl', 'tonka', 'zuccher', 'caramell'],
    testo:
      'Allora ti serve Arabians Tonka di Montale: fava tonka, un velo di rum e uno zucchero scuro che non stanca mai. Dolce sì, ingenuo mai.',
  },
  {
    id: 'fresco',
    parole: ['fresc', 'agrum', 'limone', 'estate', 'estiv', 'leggero', 'pulito', 'mare', 'bergamotto', 'giorno', 'ufficio'],
    testo:
      'Aria pulita, dici? Molecule 02 di Escentric Molecules: pelle e brezza, come una camicia bianca stirata dal vento. Chi ti passa accanto si volta — e non capisce perché.',
  },
  {
    id: 'sera',
    parole: ['sera', 'notte', 'serata', 'appuntamento', 'cena', 'intenso', 'forte', 'seduttiv', 'sensual', 'conquist'],
    testo:
      'Per la sera serve coraggio: Side Effect di Initio. Tabacco, rum e un velo di cannella — entra nella stanza dopo di te, ma ne esce per ultimo. Maneggiare con cura: il tempo vola.',
  },
  {
    id: 'orientale',
    parole: ['oriental', 'spezi', 'tabacco', 'incenso', 'ambra', 'patchouli', 'miele', 'particolare', 'strano', 'diverso', 'nicchia', 'raro'],
    testo:
      'Allora ti porto da Serge Lutens: Chergui. Miele, tabacco e fieno, un tramonto in una stanza di velluto. Non è per tutti — ed è esattamente il suo pregio.',
  },
  {
    id: 'lei',
    parole: ['per lei', 'moglie', 'fidanzata', 'ragazza', 'mamma', 'donna', 'femminil', 'signora', 'rosa', 'fiorit', 'fiori'],
    testo:
      'Per lei c’è Delina di Parfums de Marly: rosa turca, litchi e un velluto di vaniglia. È il tipo di fiore che non appassisce nella memoria.',
  },
  {
    id: 'lui',
    parole: ['per lui', 'marito', 'fidanzato', 'ragazzo', 'papa', 'uomo', 'maschil', 'babbo'],
    testo:
      'Per lui, Layton di Parfums de Marly: mela, lavanda e un caffè cremoso sotto la vaniglia. Un classico che non chiede permesso, d’inverno come d’estate.',
  },
  {
    id: 'generico',
    parole: ['consigli', 'che profumo', 'un profumo', 'quale profumo', 'cosa mi', 'aiutami', 'non so', 'suggeris', 'profumo per me', 'regalo'],
    testo:
      'Volentieri — ma prima una sola domanda, ché il tempo è prezioso: ti chiamano di più i legni caldi e le spezie, o il dolce morbido della vaniglia?',
  },
  {
    id: 'saluto',
    parole: ['ciao', 'buongiorno', 'buonasera', 'salve', 'ehi', 'hey'],
    testo:
      'Oh, ben arrivato! Qui il tempo corre e i profumi aspettano. Dimmi: cerchi qualcosa per te, o per qualcuno che ti fa battere il cuore?',
  },
];

/** Quando nessuna regola scatta: si svicola con garbo e si torna ai profumi (§2.3). */
const FUORI_TEMA: Battuta = {
  id: 'fuoritema',
  testo:
    'Curiosa domanda… ma il mio regno sono le essenze, e lì sì che so farti strada. Dimmi piuttosto: che profumo porti oggi?',
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
