// Palette e luce del gioco: pieno giorno come nelle viste 3D di Maps,
// low-poly. Tutto ciò che è colore/atmosfera vive qui, così lo sguardo
// resta coerente.

export const PALETTE = {
  // otto intonaci romagnoli sul "giallino" tipico di Lugo (fonti locali),
  // con un paio di terracotta e rosa antico a rompere il ritmo
  intonaci: [
    '#EDDFB2',
    '#E3C878',
    '#E8D5A6',
    '#DCC9A2',
    '#E4CE8F',
    '#D9A662',
    '#C98E6B',
    '#D8A794',
  ],
  /** Il coppo delle viste aeree: rosso mattone chiaro, rosato al sole. */
  tetto: '#C97060',
  // asfalto grigio neutro chiaro come nelle foto dall'alto
  strade: {
    primaria: '#A4A3A0',
    secondaria: '#ACABA8',
    residenziale: '#B4B3B0',
    servizio: '#BBBAB7',
    pedonale: '#DAD2C2',
  },
  segnaletica: '#E8E2D6',
  marciapiede: '#C6C3BC',
  finestraSpenta: '#46525E',
  finestraAccesa: '#FFDFA0',
  terreno: '#9EA383',
  verde: '#7C9C55',
  acqua: '#5E8A9C',
  piazza: '#C8BFAF',
  ferrovia: '#3E3A42',
  cielo: { alto: '#5F97DC', basso: '#DCE9F2' },
  nebbia: '#D6E2EC',
} as const;

/**
 * Le famiglie di materiale delle facciate di Lugo. Da qui `carattere.ts`
 * pesca la tinta di ogni casa e la sposta di un soffio in tono, così due
 * edifici vicini non escono mai gemelli. Sono i muri che si vedono davvero
 * in centro: intonaco giallo romagnolo, mattone a vista, pietra dei
 * palazzi, cemento del dopoguerra, lamiera dei capannoni, legno delle
 * rimesse.
 */
export const MATERIALI = {
  intonaco: [
    '#EDDFB2', '#E3C878', '#E8D5A6', '#DCC9A2', '#E4CE8F', '#D9A662',
    '#C98E6B', '#D8A794', '#E7E0CE', '#D9CDB4', '#CBB98F', '#E0B98C',
    '#C9A98E', '#BFC4A8', '#C6CCC5', '#E9DCC6', '#B98C74', '#EFE7D3',
  ],
  mattone: ['#9E5B45', '#A8674C', '#8E5240', '#B07056', '#95614A', '#A05840'],
  pietra: ['#C9C0AD', '#BDB5A4', '#D2CAB8', '#B3AC9C', '#CBC3B0'],
  cemento: ['#C3C0B8', '#B4B2AC', '#CBC8BF', '#A9A7A1', '#D0CEC6', '#BEBDB6'],
  metallo: ['#B6BCC0', '#9EA6AC', '#C4C9CB', '#AAB2B4'],
  legno: ['#8B6C4A', '#7A5E42', '#96774F'],
} as const;

/** Le coperture: coppo, guaina dei tetti piani, lamiera dei capannoni. */
export const TETTI = {
  coppo: ['#C97060', '#B85A46', '#D08A6E', '#A9705E', '#C4796A', '#B4695A', '#BE7A55'],
  guaina: ['#8E8981', '#98938B', '#847F78', '#928C84'],
  lamiera: ['#9AA0A2', '#8A9194', '#A7ADAE'],
} as const;

/** Le persiane romagnole: verde, marrone, grigio, e qualche azzurro. */
export const PERSIANE = ['#3F5B44', '#2F4A55', '#6B4A2F', '#7C7468', '#8C8375', '#43413C', '#4E6B52'] as const;

/** Le tende da sole dei negozi (l'insegna vera la mette Insegne.tsx). */
export const TENDE_SOLE = ['#8A3A30', '#3E6248', '#B89B5E', '#3E5068', '#7A4A5E', '#4A6B6E'] as const;

export const LUCE = {
  /** Sole alto da sud-ovest, luce quasi bianca di mezzogiorno. */
  sole: { color: '#FFF2D8', intensity: 2.35, position: [-70, 150, 45] as const },
  /** Cielo/terra: riempimento azzurro del cielo sereno. */
  hemi: { cielo: '#BFD9F2', terra: '#9A9078', intensity: 0.7 },
  ambient: { color: '#E8EEF4', intensity: 0.32 },
  nebbia: { colore: '#D6E2EC', vicino: 300, lontano: 1300 },
  toneMappingExposure: 1.12,
} as const;

/** Colori auto selezionabili nello start screen. */
export const TINTE_AUTO = [
  { nome: 'Rosso Romagna', colore: '#B03A2E' },
  { nome: 'Azzurro Mare', colore: '#4A7FA5' },
  { nome: 'Giallo Passione', colore: '#D9A62E' },
] as const;
