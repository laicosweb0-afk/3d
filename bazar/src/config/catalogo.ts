/**
 * LA VETRINA — il catalogo che si sfoglia prima di giocare.
 *
 * È la schermata «hero» della card: come la vetrina di Rama faceva vedere
 * lo showroom e i lavori prima del quiz, qui si sfogliano i salotti. Ogni
 * collezione è un riquadro arrotondato, alla maniera di Apple, con il suo
 * titolo («Divani») e dentro un carosello in 3D; ogni articolo si tocca e si
 * apre a tutto schermo con le sue foto da scorrere.
 *
 * Il cuore ♡ mette un articolo fra i preferiti: i preferiti viaggiano con
 * il contatto e finiscono sulla tessera, così in negozio si sa già cosa
 * mostrare.
 *
 * Le foto stanno in `public/foto/catalogo/`. La prima di ogni articolo è
 * quella della copertina nel carosello.
 */

export type Articolo = {
  id: string;
  nome: string;
  /** Una riga: cosa lo rende quello. */
  riga: string;
  /** Materiali e finiture, in ordine di lettura. */
  dettagli: string[];
  /** Le foto, la prima è la copertina. Percorsi relativi a `public/`. */
  foto: string[];
  /** Della nuova collezione: compare l'etichetta «Novità». */
  novita?: boolean;
};

export type Collezione = {
  id: string;
  titolo: string;
  /** La riga sotto il titolo del riquadro. */
  sottotitolo: string;
  /**
   * La forma delle copertine: i divani sono lunghi e stanno in orizzontale,
   * le poltrone in verticale. Una forma sola per riquadro: il carosello
   * deve essere un ritmo, non un mosaico.
   */
  forma: 'larga' | 'alta';
  articoli: Articolo[];
};

const F = (n: string) => `foto/catalogo/${n}.webp`;

/**
 * ⚠️ I nomi sono descrittivi: vanno sostituiti con quelli dei modelli del
 * negozio. Le foto sono quelle vere.
 */
export const CATALOGO: Collezione[] = [
  {
    id: 'divani',
    titolo: 'Divani',
    sottotitolo: 'Velluto e oro, in showroom a Lugo.',
    forma: 'larga',
    articoli: [
      {
        id: 'divano-tortora',
        nome: 'Capitonné Tortora',
        riga: 'Le curve che abbracciano, i profili oro che le disegnano.',
        dettagli: ['Velluto tortora', 'Capitonné', 'Profili e slitta oro'],
        foto: [
          F('divano-tortora'),
          'foto/divano-ambientato.webp',
          'foto/velluto-dettaglio.webp',
          F('divano-tortora-studio'),
          'foto/salotto-completo.webp',
        ],
      },
      {
        id: 'divano-blu',
        nome: 'Chesterfield Blu Notte',
        riga: 'Profondo come la notte: velluto blu e oro.',
        dettagli: ['Velluto blu', 'Capitonné', 'Filo e gambe oro'],
        foto: ['foto/divano-blu.webp'],
        novita: true,
      },
      {
        id: 'chesterfield-nero',
        nome: 'Chesterfield Nero',
        riga: 'Il nero pieno del velluto, un filo d\'oro alla base.',
        dettagli: ['Velluto nero', 'Capitonné', 'Base oro'],
        foto: [F('chesterfield-nero')],
      },
      {
        id: 'divano-beige',
        nome: 'Chesterfield Beige',
        riga: 'Luminoso, da salotto in coppia, col tavolino in marmo.',
        dettagli: ['Velluto beige', 'Capitonné', 'Gambe oro'],
        foto: [F('divano-beige')],
      },
    ],
  },
  {
    id: 'poltrone',
    titolo: 'Poltrone',
    sottotitolo: 'E i complementi che finiscono il salotto.',
    forma: 'alta',
    articoli: [
      {
        id: 'poltrona-tonda',
        nome: 'Poltrona Tonda',
        riga: 'Girevole, capitonné tutto intorno, base oro.',
        dettagli: ['Velluto tortora', 'Girevole', 'Profilo e base oro'],
        foto: [F('poltrona-tonda'), F('poltrone-tonde-salotto'), 'foto/salotto-completo.webp'],
      },
      {
        id: 'poltrona-blu',
        nome: 'Bergère Blu',
        riga: 'Lo schienale alto delle bergère, le gambe sottili in oro.',
        dettagli: ['Velluto blu', 'Schienale a orecchie', 'Gambe oro'],
        foto: [F('poltrona-blu')],
      },
      {
        id: 'tavolini-oro',
        nome: 'Tavolini Nesting',
        riga: 'Tre, uno dentro l\'altro: si aprono quando servono.',
        dettagli: ['Struttura oro', 'Piani chiari', 'Set da tre'],
        foto: [F('tavolini-oro'), 'foto/salotto-completo.webp'],
      },
    ],
  },
];

export const articoloDi = (id: string) =>
  CATALOGO.flatMap((c) => c.articoli).find((a) => a.id === id) ?? null;
