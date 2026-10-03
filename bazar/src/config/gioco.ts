/**
 * IL TUO STILE — Bazar Marrakech
 * Arredo · Lugo, Via Fratelli Zucchini 5
 *
 * Tutta la configurazione sta qui. Per cambiare i testi, gli stili, i pezzi
 * consigliati o i premi della ruota non serve aprire nessun altro file.
 *
 * È la stessa meccanica della card Woman, portata in uno showroom di arredo:
 * chi appoggia il telefono sulla card risponde a una domanda sola, scopre il
 * suo stile, gira la ruota e si porta a casa un credito sul prossimo acquisto.
 *
 * Le regole che reggono il gioco e che **non** si toccano senza ridiscuterle:
 *
 *   1. UNA SOLA DOMANDA. Ogni domanda in più abbassa i completamenti, e in
 *      negozio si ha il telefono in una mano e un cuscino nell'altra.
 *   2. NESSUN SECONDO TENTATIVO. La risposta è il dato che vale: dice che
 *      divano comprerà quella persona. Se si potesse cambiare, non direbbe più
 *      niente.
 *   3. IL PREMIO NON DIPENDE MAI DALLA RISPOSTA. Ogni stile porta alla stessa
 *      ruota con le stesse probabilità. Si vince sempre.
 *   4. NON C'È UNA RISPOSTA SBAGLIATA. Qui non si indovina niente: si sceglie
 *      cosa piace, e il negozio risponde con tre pezzi veri da venire a
 *      vedere. È una consulenza, non un esame.
 */

/* ------------------------------------------------------------------ */
/* I quattro stili: l'unica domanda del gioco                          */
/* ------------------------------------------------------------------ */

export type Stile = {
  id: string;
  /** Come si legge nella risposta. */
  etichetta: string;
  /** Tre parole che la rendono rispondibile da chi non ha mai sfogliato una
   *  rivista d'arredo. Senza, la domanda è per architetti. */
  nota: string;
  /** Il nome dello stile nella rivelazione: «Il tuo stile è ___». */
  nome: string;
  /** Una riga sola: il ritratto di chi l'ha scelto. */
  ritratto: string;
  /** I materiali e i colori, in ordine di lettura. */
  materiali: string[];
};

/**
 * Le quattro risposte vengono dai quattro prodotti che il negozio sta già
 * fotografando per il catalogo (`PRODUCT_PHOTOGRAPHY_PREMIUM.md`): velluto
 * tortora con l'oro, il grigio classico capitonné, il velluto scuro dei
 * chesterfield e, accanto, il bazar vero e proprio.
 */
export const STILI: Stile[] = [
  {
    id: 'curvo',
    etichetta: 'Curve morbide',
    nota: 'velluto, linee tonde, luce calda',
    nome: 'Velluto & Oro',
    ritratto: 'Una casa che abbraccia: niente spigoli, e l\'oro solo dove la luce lo trova.',
    materiali: ['Velluto tortora', 'Capitonné', 'Profili oro'],
  },
  {
    id: 'classico',
    etichetta: 'Classico elegante',
    nota: 'capitonné, braccioli, simmetria',
    nome: 'Classico Senza Tempo',
    ritratto: 'Le cose fatte bene non passano di moda: si ereditano.',
    materiali: ['Velluto grigio perla', 'Braccioli rollati', 'Cordonatura oro'],
  },
  {
    id: 'notte',
    etichetta: 'Scuro e deciso',
    nota: 'nero, blu notte, carattere',
    nome: 'Notte a Marrakech',
    ritratto: 'Un salotto da sera: colori profondi e un filo d\'oro che li accende.',
    materiali: ['Velluto nero e blu royal', 'Chesterfield', 'Piedini oro'],
  },
  {
    id: 'bazar',
    etichetta: 'Bazar e colore',
    nota: 'lanterne, tappeti, pezzi unici',
    nome: 'Spirito del Bazar',
    ritratto: 'Ogni oggetto ha una storia, e la casa è il posto dove raccontarla.',
    materiali: ['Lanterne in ottone', 'Tappeti', 'Pouf in pelle'],
  },
];

export const DOMANDA = {
  kicker: 'Una domanda sola',
  titolo: 'Che casa\nti somiglia?',
  sottotitolo: 'Quella di pancia. Non si torna indietro.',
};

/* ------------------------------------------------------------------ */
/* I tre pezzi consigliati per ogni stile                              */
/* ------------------------------------------------------------------ */

export type Pezzo = { nome: string; riga: string };

/**
 * Per ogni stile, i tre pezzi che il negozio propone a chi l'ha scelto. È la
 * parte di consulenza: la risposta diventa un motivo per venire in showroom,
 * con tre cose precise da guardare.
 *
 * ⚠️ I primi tre stili partono dai divani che sono già in catalogo; i nomi
 * vanno confermati con il negozio, e il quarto (il bazar) è un segnaposto da
 * riempire con i pezzi che ci sono davvero in esposizione. Un pezzo
 * consigliato che in negozio non c'è è la delusione più facile da evitare.
 */
export const PEZZI: Record<string, Pezzo[]> = {
  curvo: [
    { nome: 'Divano curvo capitonné', riga: 'Velluto tortora, profilo e base oro.' },
    { nome: 'Poltrona a botte', riga: 'In coppia, ai lati del divano.' },
    { nome: 'Tavolini nesting', riga: 'Oro e vetro, uno dentro l\'altro.' },
  ],
  classico: [
    { nome: 'Divano grigio capitonné', riga: 'Braccioli rollati, slitta oro.' },
    { nome: 'Poltrona coordinata', riga: 'Stesso velluto, stessa cordonatura.' },
    { nome: 'Tavolino in oro', riga: 'Il punto di luce al centro.' },
  ],
  notte: [
    { nome: 'Chesterfield nero', riga: 'Velluto nero, filo oro alla base.' },
    { nome: 'Chesterfield blu navy', riga: 'Blu royal, piedini oro.' },
    { nome: 'Poltrona blu', riga: 'Per chi il divano ce l\'ha già.' },
  ],
  bazar: [
    { nome: 'Lanterna in ottone', riga: 'Traforata a mano: la luce disegna.' },
    { nome: 'Tappeto berbero', riga: 'Lana, colore, nessuno uguale.' },
    { nome: 'Pouf in pelle', riga: 'Ricamato, da spostare dove serve.' },
  ],
};

/* ------------------------------------------------------------------ */
/* Il premio: la ruota                                                 */
/* ------------------------------------------------------------------ */

/**
 * Gli spicchi della ruota, uno per premio. **Le probabilità stanno qui, nella
 * geometria**: ogni spicchio è grande uguale e l'estrazione sceglie uno
 * spicchio a caso, senza pesi nascosti. Il 30 esce più spesso perché occupa
 * più ruota, e si vede guardandola.
 *
 * Dieci spicchi: cinque da 30 €, tre da 50 €, due da 70 € — cioè 50% · 30%
 * · 20%, e un credito medio di 44 €.
 *
 * Nessuno spicchio mostra un premio che non può uscire: sarebbe una pratica
 * commerciale ingannevole (Codice del Consumo, artt. 20-23).
 *
 * ⚠️ **Da sapere, e va detto a chi decide**: un premio di importo variabile
 * estratto a sorte è un concorso a premi (DPR 430/2001) — regolamento,
 * cauzione, comunicazione al Ministero. Un credito uguale per tutti no: è una
 * semplice operazione a sconto. Per tornare lì basta mettere lo stesso
 * importo in tutti gli spicchi: la ruota gira uguale e non c'è niente da
 * dichiarare.
 */
export const SPICCHI: number[] = [30, 50, 30, 70, 30, 50, 30, 70, 30, 50];

/** Quante volte esce ogni importo, in percentuale: dalla geometria, non da un peso. */
export function probabilita(): Record<number, number> {
  const conti: Record<number, number> = {};
  for (const v of SPICCHI) conti[v] = (conti[v] ?? 0) + 1;
  for (const v of Object.keys(conti)) conti[Number(v)] = (conti[Number(v)] / SPICCHI.length) * 100;
  return conti;
}

/** Il credito medio per cliente: serve a chi fa i conti, non all'app. */
export const creditoMedio = () => SPICCHI.reduce((s, v) => s + v, 0) / SPICCHI.length;

/** L'indice dello spicchio estratto. Una riga: la ruota non bara. */
export const estraiSpicchio = () => Math.floor(Math.random() * SPICCHI.length);

/**
 * Da quale spesa vale il credito. Su un divano 30 € non spostano niente e
 * su un cuscino si mangiano il margine: la soglia tiene il credito dove ha
 * senso. ⚠️ Da confermare con il negozio.
 */
export const SPESA_MINIMA = 300;

/** Durata della rotazione in millisecondi e giri completi prima di fermarsi. */
export const GIRO = { durata: 4800, giriMin: 5, giriMax: 7 };

/** Giorni di validità del credito, contati dal giorno in cui si vince. */
export const VALIDITA_GIORNI = 90;

/* ------------------------------------------------------------------ */
/* Il negozio                                                          */
/* ------------------------------------------------------------------ */

export const NEGOZIO = {
  nome: 'Bazar Marrakech',
  indirizzo: 'Via Fratelli Zucchini 5',
  citta: 'Lugo (RA)',
  telefono: '389 0127054',
  sito: 'bazar-marrakech.com',
  /** Apre la mappa solo quando si tocca: al caricamento non parte niente. */
  mappa: 'https://maps.google.com/?q=Bazar+Marrakech+Via+Fratelli+Zucchini+5+Lugo',
};

/**
 * Il numero WhatsApp del negozio, in formato internazionale senza segni
 * (es. `393890127054`). Finché è vuoto, alla fine non compare il bottone:
 * meglio nessun bottone che uno che apre una chat con un numero sbagliato.
 */
export const WHATSAPP_NEGOZIO = '';

export function messaggioWhatsApp(l: {
  nome: string; credito: number; codice: string; stile: string;
}): string {
  return [
    `Ciao, sono ${l.nome}.`,
    `Ho il credito Bazar Marrakech da ${l.credito}€, codice ${l.codice}.`,
    '',
    `Il mio stile: ${l.stile}.`,
    '',
    'Vorrei passare in showroom a vedere i pezzi consigliati.',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Il modulo e il codice                                               */
/* ------------------------------------------------------------------ */

/**
 * Cosa chiediamo per consegnare il credito: `'uno'` accetta l'email
 * **oppure** il telefono, `'entrambi'` li vuole tutti e due. Il nome e
 * cognome è sempre richiesto.
 */
export const CONTATTO_RICHIESTO: 'uno' | 'entrambi' = 'uno';

/** Codice del credito nel formato BAZAR-XXXX. */
export function generaCodice(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // via I, O, 0 e 1: si confondono
  let out = '';
  for (let i = 0; i < 4; i++) out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return `BAZAR-${out}`;
}

export function scadenza(da = new Date()): Date {
  const d = new Date(da);
  d.setDate(d.getDate() + VALIDITA_GIORNI);
  return d;
}

/** Data breve: sulla tessera deve stare su una riga sola. */
export function dataBreve(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '');
}

export const stileDi = (id: string | null) => STILI.find((s) => s.id === id) ?? null;
