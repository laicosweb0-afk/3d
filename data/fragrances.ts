// Dati mock del prototipo The Fragrance Experience.
// Un unico posto da modificare per cambiare fragranza misteriosa,
// famiglie e catalogo delle raccomandazioni.

export const FAMILIES = ['Agrumato', 'Floreale', 'Legnoso', 'Ambrato'] as const;

export type Family = (typeof FAMILIES)[number];

export const MYSTERY = {
  name: 'Nome Fragranza', // placeholder, da sostituire
  maison: 'Maison Ospite',
  family: 'Legnoso' as Family,
  notes: ['bergamotto', 'vetiver', 'ambra grigia'],
  trickNote: 'vetiver', // usata nel testo per chi non indovina
  guessedPct: 62, // percentuale mostrata a chi indovina: "il 62% ha risposto come te"
};

// Catalogo mock per le tre raccomandazioni (nomi segnaposto, da
// sostituire come MYSTERY). La scelta parte dalla famiglia sentita.
export type CatalogEntry = {
  name: string;
  maison: string;
  family: Family;
  notes: string[];
};

export const CATALOG: CatalogEntry[] = [
  { name: 'Acqua di Scorza', maison: 'Maison Ospite', family: 'Agrumato', notes: ['limone', 'basilico', 'muschio bianco'] },
  { name: 'Riva Bianca', maison: 'Maison Ospite', family: 'Agrumato', notes: ['pompelmo', 'sale', 'legni chiari'] },
  { name: 'Primo Gelsomino', maison: 'Maison Ospite', family: 'Floreale', notes: ['gelsomino', 'pera', 'muschio'] },
  { name: 'Ora di Rosa', maison: 'Maison Ospite', family: 'Floreale', notes: ['rosa', 'peonia', 'ambretta'] },
  { name: 'Radice Scura', maison: 'Maison Ospite', family: 'Legnoso', notes: ['vetiver', 'cedro', 'iris'] },
  { name: 'Fumo di Cedro', maison: 'Maison Ospite', family: 'Legnoso', notes: ['cedro', 'incenso', 'cuoio'] },
  { name: 'Zucchero Bruno', maison: 'Maison Ospite', family: 'Ambrato', notes: ['vaniglia', 'fava tonka', 'caramello'] },
  { name: 'Miele di Notte', maison: 'Maison Ospite', family: 'Ambrato', notes: ['miele', 'ambra', 'benzoino'] },
];
