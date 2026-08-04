// Il copy del viaggio.
//
// Regole di scrittura (DIRECTION_BUFALA.md §4 e SCALETTA_BUFALA.md §6):
// affermazioni brevi, nessuna spiegazione, nessun claim commerciale che non
// sia verificabile, nessun riferimento geografico (vincolo esplicito del
// cliente). Niente superlativi, niente "il migliore", niente "da sempre":
// un marchio premium non si autoproclama, mostra.
//
// Ogni riga dice una cosa sola e la dice piana. Se una frase potrebbe stare
// sul sito di un qualsiasi altro caseificio, è sbagliata e va riscritta.
//
// ⚠️ Da approvare col cliente prima della pubblicazione: sono parole scritte
// per lui, non da lui.

import type { SceneId } from '@/lib/bufala/scenes';

export interface SceneCopy {
  /** Titolo grande. Poche parole: gli a capo sono voluti, non casuali. */
  titolo: string;
  /** Riga di accompagnamento, opzionale. Corpo piccolo, sotto il titolo. */
  nota?: string;
  /** Solo per la hero: il nome del marchio, composto in tipografia.
   *
   *  Non il logo: il marchio reale è un disegno a colori nato per fondi
   *  chiari, e su verde profondo un PNG con quel fondo si vedrebbe. Il nome
   *  scritto nel carattere del sito lo dice altrettanto bene e appartiene
   *  alla pagina invece di esserci appoggiato sopra. */
  marchio?: string;
  /** Solo per la hero: la riga che dice cosa si trova al banco. */
  sottotitolo?: string;
  /** Solo per la hero: il payoff. Non è un sottotitolo — vive lontano dalla
   *  headline, in fondo al campo. La distanza è il messaggio: un marchio di
   *  lusso non ha bisogno di stare attaccato al proprio nome. */
  payoff?: string;
}

export const sceneCopy: Record<SceneId, SceneCopy> = {
  // La prima scena non ha piu' testo: la headline, il marchio e l'invito
  // vivono nella schermata d'ingresso (content: `ingresso`, componente
  // Ingresso.tsx), che sta NEL FLUSSO prima del palco. Scorrendo si alza
  // come un sipario e scopre il film — l'uscita elegante chiesta dal brief
  // e' l'architettura stessa, non un effetto. Il film ora apre pulito.
  s01: {
    titolo: '',
  },

  // I titoli non raccontano il filmato: parlano del progetto — la bufala,
  // il caseificio, il banco. Una didascalia di quello che si sta già
  // vedendo non aggiunge niente, consuma l'unica occasione che il sito ha
  // di dire chi è, e diventa falsa il giorno in cui si cambia ripresa.
  s02: {
    titolo: 'La produciamo\nnoi.',
  },

  s03: {
    titolo: 'Un latte solo:\nquello di bufala.',
  },

  // Il vero elemento di distinzione: non rivendono, producono. Dato
  // confermato dal cliente, e non nomina nessun luogo.
  s04: {
    titolo: 'Dietro, un caseificio.\nNon un magazzino.',
  },

  s05: {
    titolo: 'Nessuna scorciatoia.',
  },

  // Nessun titolo: qui il fotogramma diventa bianco, e un testo chiaro su
  // fondo chiaro sarebbe illeggibile per costruzione. La scena è una
  // transizione, non una pagina — le parole riprendono sotto, sul documento.
  s06: {
    titolo: '',
  },
};

/** La schermata d'ingresso: la headline e le tre porte.
 *
 *  Dal riferimento dell'utente (04/08): prima del film, una scelta. Chi ha
 *  fretta clicca — banco, prodotti, dove — chi vuole il cinema scorre.
 *  Le descrizioni sono quelle del riferimento, gia' nel tono del sito. */
export const ingresso = {
  marchio: 'Quelli della bufala',
  titolo: 'La qualità non si promette.\nSi assaggia.',
  sottotitolo:
    'Dalla mozzarella fresca ai migliori formaggi e salumi selezionati. Un banco pensato per chi cerca eccellenza, ogni giorno.',
  domanda: 'Da dove vuoi iniziare?',
  porte: [
    {
      nome: 'Il nostro banco',
      testo: 'Scopri la nostra selezione e la qualità che ci distingue.',
      href: '#banco',
      foto: 'banco' as const,
    },
    {
      nome: 'I nostri prodotti',
      testo: 'Mozzarella di bufala, formaggi e salumi selezionati.',
      href: '#prodotti',
      foto: 'prodotto' as const,
    },
    {
      nome: 'Vieni a trovarci',
      testo: 'Dove siamo, orari di apertura e contatti.',
      href: '#dove',
      foto: 'mappa' as const,
    },
  ],
  payoff: 'Mozzarella di Bufala',
  nota: 'Scorri',
} as const;

/** Le sezioni dopo il viaggio. */
export const sezioni = {
  // Nessuna narrazione, nessun processo, nessuna logistica.
  //
  // Qui prima c'era "Il tempo è l'unica cosa che non si può recuperare: per
  // questo la lavorazione, il banco e la vendita restano vicini". L'avevo
  // scritta io, e aveva due difetti: suonava generata, e soprattutto
  // affermava una vicinanza fra lavorazione e punto vendita che nessuno ha
  // mai verificato. Le frasi che raccontano *come* si lavora invecchiano
  // male e possono essere smentite; quelle che dichiarano *cosa si sceglie*
  // restano vere finché l'azienda resta sé stessa.
  // La pausa narrativa. Non una frase al centro di uno schermo quasi vuoto:
  // un pensiero, con sopra da dove viene e sotto cosa comporta.
  //
  // "Prima di vendere, scegliamo" diceva una cosa vera ma banale — la dice
  // qualunque rivenditore. Questa la può dire solo chi sceglie davvero, e
  // non promette niente che si possa smentire: parla di ciò che resta fuori
  // dal banco, che è l'unica prova di una selezione.
  // La frase è dell'utente (04/08), al posto di «Quello che non teniamo…»,
  // che era mia e non gli piaceva. La sua è migliore per un motivo preciso:
  // è affermativa invece che costruita per negazione, e si legge in un
  // respiro solo. Composta in maiuscolo/minuscolo come tutti i titoli del
  // sito — il maiuscolo pieno è riservato ai microtesti.
  apertura: {
    occhiello: 'La selezione',
    frase: 'Ogni scelta racconta\nchi siamo.',
    testo:
      'È la parte del lavoro che al banco non si vede. Ed è quella che decide tutto il resto.',
  },

  // PER CHI — brief dell'utente (04/08): due percorsi con peso visivo
  // IDENTICO, due carte gemelle. La mia versione precedente dava piu' peso
  // ai professionisti (gerarchia dedotta dall'orario); l'utente ha deciso
  // diversamente e la decisione e' sua: nessuno dei due deve sembrare una
  // nota dell'altro. I testi delle carte sono i suoi, rifiniti nella sola
  // punteggiatura.
  //
  // La riga «Ingresso libero e gratuito» non e' sparita: vive nel passo 03
  // della Visita, verbatim, dov'era gia'.
  // Secondo giro del brief (04/08, sera): «A chi è dedicato» suonava male
  // ed è caduto insieme alla riga sotto — dopo la fotografia si va dritti
  // alle due scelte. I titoli sono le due parole del mestiere, Ingrosso e
  // Dettaglio: piu' chiare di qualunque perifrasi. I testi restano i suoi.
  perChi: {
    titolo: 'Il banco',
    lavoro: {
      nome: 'Ingrosso',
      testo:
        'Ristoranti, gastronomie e attività possono acquistare all’ingrosso direttamente dal nostro banco, con la stessa selezione disponibile ogni giorno.',
    },
    casa: {
      nome: 'Dettaglio',
      testo:
        'Acquista senza appuntamento: entra liberamente, scegli i prodotti che preferisci e porta a casa la qualità del nostro banco.',
    },
  },

  prodotti: {
    titolo: 'Al banco',
    frase: 'Una selezione costruita con cura.',
    testo:
      'Accanto alla nostra mozzarella trovi una selezione di formaggi, salumi e specialità gastronomiche scelti per qualità, provenienza e gusto. Ogni prodotto completa il banco con lo stesso livello di attenzione che dedichiamo alla nostra produzione.',
    // Un carosello che non dichiara di essere trascinabile viene guardato
    // come una fotografia: l'affordance va detta, non lasciata indovinare.
    invito: 'Scorri per esplorare alcuni dei nostri prodotti',
  },

  // La rottura unica del sito (Composizione §regola 2): il 04:30 composto
  // enorme, l'ottone usato come colore di testo qui e in nessun altro
  // posto. Non è un orario di servizio: è il fatto più raro che questa
  // azienda possiede — nessun concorrente apre prima dell'alba — e riceve
  // la composizione più rara del sito. I dati vengono da company.orari
  // (scheda Google, decisione utente 04/08).
  visita: {
    titolo: 'La visita',
    frase: 'Apriamo prima dell’alba.',
    // Nessun claim: alle nove il banco chiude davvero (orari confermati).
    testo: 'Alle nove abbiamo già finito. Per questo conviene arrivare presto.',
  },

  // La mappa è protagonista e non ha bisogno di essere presentata: sopra di
  // lei due parole, sotto niente. I dati stanno nella sezione dopo, che è
  // un'altra cosa e va letta come tale.
  mappa: {
    titolo: 'Siamo qui',
    azione: 'Apri su Google Maps',
  },

  luogo: {
    titolo: 'Punto vendita',
    azione: 'Ottieni indicazioni',
    chiama: 'Chiama',
  },

  congedo: { frase: 'Vi aspettiamo al banco.' },
} as const;
