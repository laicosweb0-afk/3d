// Dati mock del prototipo The Fragrance Experience.
// Un unico posto da modificare per cambiare fragranza misteriosa,
// famiglie, domande del quiz e catalogo delle raccomandazioni.

export const FAMILIES = ['Fresco', 'Floreale', 'Legnoso', 'Dolce'] as const;

export type Family = (typeof FAMILIES)[number];

export const MYSTERY = {
  name: 'Nome Fragranza', // placeholder, da sostituire
  maison: 'Maison Ospite',
  family: 'Legnoso' as Family,
  notes: ['bergamotto', 'vetiver', 'ambra grigia'],
  trickNote: 'vetiver', // usata nel testo per chi non indovina
  guessedPct: 62, // percentuale mostrata: "il 62% ha risposto come te"
};

// Le domande del quiz, una per schermata. `scoring: true` è la domanda
// che decide se la fragranza è stata riconosciuta (confronto con
// MYSTERY.family); le altre profilano i gusti e orientano le tre
// raccomandazioni tramite `family` sulle opzioni.
export type QuizOption = { label: string; family?: Family };
export type QuizQuestion = {
  id: string;
  text: string;
  options: QuizOption[];
  scoring?: boolean;
};

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 'tipo',
    text: 'Che tipo di profumo immagini?',
    scoring: true,
    options: FAMILIES.map((f) => ({ label: f, family: f })),
  },
  {
    id: 'momento',
    text: 'Quando lo indosseresti?',
    options: [
      { label: 'Di giorno', family: 'Fresco' },
      { label: 'Di sera', family: 'Legnoso' },
      { label: 'Sempre', family: 'Floreale' },
    ],
  },
  {
    id: 'luogo',
    text: 'Dove ti porta, a occhi chiusi?',
    options: [
      { label: 'Il mare al mattino', family: 'Fresco' },
      { label: 'Un giardino in fiore', family: 'Floreale' },
      { label: 'Un bosco dopo la pioggia', family: 'Legnoso' },
      { label: 'Una pasticceria di sera', family: 'Dolce' },
    ],
  },
  {
    id: 'scia',
    text: 'Quanto resta sulla pelle?',
    options: [
      { label: 'Un sussurro', family: 'Fresco' },
      { label: 'Una presenza', family: 'Floreale' },
      { label: 'Una scia', family: 'Dolce' },
    ],
  },
];

// Catalogo mock per le tre raccomandazioni (nomi segnaposto, da
// sostituire come MYSTERY). La scelta pesca dalle famiglie più votate.
export type CatalogEntry = {
  name: string;
  maison: string;
  family: Family;
  notes: string[];
};

export const CATALOG: CatalogEntry[] = [
  { name: 'Acqua di Scorza', maison: 'Maison Ospite', family: 'Fresco', notes: ['limone', 'basilico', 'muschio bianco'] },
  { name: 'Riva Bianca', maison: 'Maison Ospite', family: 'Fresco', notes: ['sale', 'pompelmo', 'legni chiari'] },
  { name: 'Primo Gelsomino', maison: 'Maison Ospite', family: 'Floreale', notes: ['gelsomino', 'pera', 'muschio'] },
  { name: 'Ora di Rosa', maison: 'Maison Ospite', family: 'Floreale', notes: ['rosa', 'peonia', 'ambretta'] },
  { name: 'Radice Scura', maison: 'Maison Ospite', family: 'Legnoso', notes: ['vetiver', 'cedro', 'iris'] },
  { name: 'Fumo di Cedro', maison: 'Maison Ospite', family: 'Legnoso', notes: ['cedro', 'incenso', 'cuoio'] },
  { name: 'Zucchero Bruno', maison: 'Maison Ospite', family: 'Dolce', notes: ['vaniglia', 'fava tonka', 'caramello'] },
  { name: 'Miele di Notte', maison: 'Maison Ospite', family: 'Dolce', notes: ['miele', 'ambra', 'benzoino'] },
];
