/**
 * IL TUO STILE — Bazar Marrakech
 * Showroom arredamento · Via Fratelli Zucchini 5, 48022 Lugo (RA)
 *
 * I dati del negozio — reparti, contatti, indirizzo, Instagram — vengono dal
 * biglietto da visita; il sito, le consegne e la nuova collezione «velluto
 * blu e oro» dalle locandine. Se cambiano loro, cambia questo file.
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
  /**
   * La foto del pezzo che rappresenta lo stile, in `public/foto/`. Compare
   * nella rivelazione; se manca, la schermata resta tipografica.
   */
  foto?: string;
  /** La foto è orizzontale (un salotto intero, un divano lungo): si mostra più larga. */
  fotoLarga?: boolean;
};

/**
 * I tre stili d'arredo hanno ciascuno una foto vera del negozio: il salotto
 * tortora completo (poltrone tonde, tavolini, divani), il divano capitonné
 * ambientato in casa, il divano blu della nuova collezione «velluto blu e
 * oro». Il quarto è il bazar vero e proprio:
 * tappeti, lampadari, profumi — gli altri reparti del biglietto, che ancora
 * non hanno foto.
 */
export const STILI: Stile[] = [
  {
    id: 'curvo',
    etichetta: 'Curve morbide',
    nota: 'velluto, linee tonde, luce calda',
    nome: 'Velluto & Oro',
    ritratto: 'Una casa che abbraccia: niente spigoli, e l\'oro solo dove la luce lo trova.',
    materiali: ['Velluto tortora', 'Linee tonde', 'Profili e basi oro'],
    foto: 'foto/salotto-completo.webp',
    fotoLarga: true,
  },
  {
    id: 'classico',
    etichetta: 'Classico elegante',
    nota: 'capitonné, profili oro, simmetria',
    nome: 'Classico Senza Tempo',
    ritratto: 'Le cose fatte bene non passano di moda: si ereditano.',
    materiali: ['Velluto tortora', 'Capitonné', 'Profili e slitta oro'],
    foto: 'foto/divano-ambientato.webp',
  },
  {
    id: 'notte',
    etichetta: 'Scuro e deciso',
    nota: 'blu notte, nero, carattere',
    nome: 'Notte a Marrakech',
    // La riga della locandina della nuova collezione: «Profondo come la
    // notte — velluto blu e oro».
    ritratto: 'Profondo come la notte: velluto blu e oro, per un salotto da sera.',
    materiali: ['Velluto blu e nero', 'Capitonné', 'Filo e gambe oro'],
    foto: 'foto/divano-blu.webp',
    fotoLarga: true,
  },
  {
    id: 'bazar',
    etichetta: 'Bazar e colore',
    nota: 'tappeti, lampadari, profumi',
    nome: 'Spirito del Bazar',
    ritratto: 'Ogni oggetto ha una storia, e la casa è il posto dove raccontarla.',
    materiali: ['Tappeti', 'Lampadari', 'Profumi d\'oriente'],
  },
];

export const DOMANDA = {
  kicker: 'Una domanda sola',
  titolo: 'Che casa\nti somiglia?',
  sottotitolo: 'Quella di pancia. Non si torna indietro.',
};

/* ------------------------------------------------------------------ */
/* I reparti e i tre pezzi consigliati per ogni stile                  */
/* ------------------------------------------------------------------ */

/** I reparti del negozio, come sono scritti sul biglietto da visita. */
export const REPARTI = {
  salotti: 'Salotti e poltrone',
  tappeti: 'Tappeti',
  lampadari: 'Lampadari',
  profumi: 'Profumi e casalinghi',
} as const;

export type Pezzo = {
  nome: string;
  reparto: keyof typeof REPARTI;
  riga: string;
  /** La miniatura in `public/foto/`, quando il pezzo è stato fotografato. */
  foto?: string;
  /** Della nuova collezione in showroom: compare l'etichetta «Novità». */
  novita?: boolean;
};

/**
 * Per ogni stile, tre pezzi da tre reparti diversi: chi entra per un divano
 * esce sapendo che ci sono anche il tappeto e il lampadario che gli stanno
 * sopra. È la parte di consulenza, e il motivo per passare in negozio.
 *
 * ⚠️ I salotti sono quelli fotografati, ma i nomi sono descrittivi: vanno
 * sostituiti con quelli del negozio. Tappeti, lampadari e profumi sono
 * descritti per genere e vanno confermati. Un pezzo
 * consigliato che in showroom non c'è è la delusione più facile da evitare.
 */
export const PEZZI: Record<string, Pezzo[]> = {
  curvo: [
    { nome: 'Poltrona tonda capitonné', reparto: 'salotti', riga: 'Velluto tortora, girevole, profilo e base oro.', foto: 'foto/poltrona-tonda-mini.webp' },
    { nome: 'Tavolini nesting oro', reparto: 'salotti', riga: 'Tre, uno dentro l\'altro: si aprono quando servono.', foto: 'foto/tavolini-oro-mini.webp' },
    { nome: 'Lampadario dorato', reparto: 'lampadari', riga: 'La luce calda che fa cantare l\'oro.' },
  ],
  classico: [
    { nome: 'Divano capitonné tortora', reparto: 'salotti', riga: 'Profili oro che lo avvolgono, slitta oro.', foto: 'foto/divano-tortora-mini.webp' },
    { nome: 'Divano chesterfield beige', reparto: 'salotti', riga: 'Con il tavolino in marmo e oro.', foto: 'foto/divano-beige-mini.webp' },
    { nome: 'Lampadario di cristallo', reparto: 'lampadari', riga: 'Il classico che non sbaglia.' },
  ],
  notte: [
    { nome: 'Divano chesterfield blu', reparto: 'salotti', riga: 'Velluto blu notte, filo e gambe oro.', foto: 'foto/divano-blu-mini.webp', novita: true },
    { nome: 'Poltrona bergère blu', reparto: 'salotti', riga: 'Lo stesso blu, le gambe oro.', foto: 'foto/poltrona-blu-mini.webp' },
    { nome: 'Chesterfield nero', reparto: 'salotti', riga: 'Velluto nero, filo e base oro.', foto: 'foto/chesterfield-nero-mini.webp' },
  ],
  bazar: [
    { nome: 'Tappeto orientale', reparto: 'tappeti', riga: 'Colore e disegno: nessuno uguale.' },
    { nome: 'Lampadario traforato', reparto: 'lampadari', riga: 'La luce che disegna sulle pareti.' },
    { nome: 'Profumi d\'oriente', reparto: 'profumi', riga: 'Muschio, oud, ambra: la casa che profuma di bazar.' },
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
  citta: '48022 Lugo (RA)',
  /** I due numeri del biglietto, ciascuno con il suo nome. */
  contatti: [
    { nome: 'Fatima Zahra', telefono: '328 785 3098' },
    { nome: 'Salah', telefono: '389 012 7054' },
  ],
  email: 'bazarmarrakech.snc@hotmail.com',
  instagram: 'bazar.marrakech9',
  /** Il sito delle locandine («Il tuo salotto ti aspetta»). */
  sito: 'bazar-marrakech.com',
  /** Dalle locandine: chi non è di Lugo deve saperlo. */
  consegne: 'Consegne in tutta Italia',
  /** Apre la mappa solo quando si tocca: al caricamento non parte niente. */
  mappa: 'https://maps.google.com/?q=Via+Fratelli+Zucchini+5,+48022+Lugo+RA',
};

/** Il numero da comporre: `tel:+39…`, senza spazi. */
export const telDi = (n: string) => `tel:+39${n.replace(/\D/g, '')}`;

/**
 * Il numero WhatsApp del negozio, in formato internazionale senza segni
 * (es. `393890127054` per Salah). I due numeri del biglietto sono
 * cellulari, ma non è scritto che siano WhatsApp: finché è vuoto, alla fine non compare il bottone:
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
