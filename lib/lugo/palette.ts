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
  /** Il coppo arancio vivo delle viste aeree. */
  tetto: '#BE5C34',
  // asfalto chiaro come nelle foto dall'alto: al sole è quasi bianco
  strade: {
    primaria: '#A8A4AE',
    secondaria: '#B0ACB4',
    residenziale: '#B8B4BA',
    servizio: '#BEBAC0',
    pedonale: '#C6BAA6',
  },
  segnaletica: '#E8E2D6',
  marciapiede: '#C9C5CC',
  finestraSpenta: '#46525E',
  finestraAccesa: '#FFDFA0',
  terreno: '#A9B27B',
  verde: '#6FA351',
  acqua: '#5E8A9C',
  piazza: '#9C8D7C',
  ferrovia: '#3E3A42',
  cielo: { alto: '#3D7EDB', basso: '#DCE9F2' },
  nebbia: '#D6E2EC',
} as const;

export const LUCE = {
  /** Sole alto da sud-ovest, luce quasi bianca di mezzogiorno. */
  sole: { color: '#FFF2D8', intensity: 2.35, position: [-70, 150, 45] as const },
  /** Cielo/terra: riempimento azzurro del cielo sereno. */
  hemi: { cielo: '#BFD9F2', terra: '#9A9078', intensity: 0.7 },
  ambient: { color: '#E8EEF4', intensity: 0.32 },
  nebbia: { colore: '#D6E2EC', vicino: 220, lontano: 780 },
  toneMappingExposure: 1.12,
} as const;

/** Colori auto selezionabili nello start screen. */
export const TINTE_AUTO = [
  { nome: 'Rosso Romagna', colore: '#B03A2E' },
  { nome: 'Azzurro Mare', colore: '#4A7FA5' },
  { nome: 'Giallo Passione', colore: '#D9A62E' },
] as const;
