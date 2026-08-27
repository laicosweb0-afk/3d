// Palette e luce del gioco: tramonto romagnolo curato, low-poly.
// Tutto ciò che è colore/atmosfera vive qui, così lo sguardo resta coerente.

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
  finestraSpenta: '#39434F',
  finestraAccesa: '#FFDFA0',
  terreno: '#A3B07A',
  verde: '#7DA25E',
  acqua: '#5A7D8C',
  piazza: '#9C8D7C',
  ferrovia: '#3E3A42',
  cielo: { alto: '#2E2A5E', basso: '#FF9E5E' },
  nebbia: '#C77A62',
} as const;

export const LUCE = {
  /** Sole basso da ovest, caldo. */
  sole: { color: '#FFB36B', intensity: 2.1, position: [-120, 55, 30] as const },
  /** Cielo/terra: riempimento violaceo da tramonto. */
  hemi: { cielo: '#FFD9A0', terra: '#6A5A7A', intensity: 0.85 },
  ambient: { color: '#8A7C9C', intensity: 0.5 },
  nebbia: { colore: '#C77A62', vicino: 120, lontano: 420 },
  toneMappingExposure: 1.18,
} as const;

/** Colori auto selezionabili nello start screen. */
export const TINTE_AUTO = [
  { nome: 'Rosso Romagna', colore: '#B03A2E' },
  { nome: 'Azzurro Mare', colore: '#4A7FA5' },
  { nome: 'Giallo Passione', colore: '#D9A62E' },
] as const;
