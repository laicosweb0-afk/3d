// Dati mock del prototipo The Fragrance Experience (BRIEF §5).
// Un unico posto da modificare per cambiare fragranza misteriosa e famiglie.

export const FAMILIES = ['Agrumato', 'Floreale', 'Legnoso', 'Ambrato'] as const;

export type Family = (typeof FAMILIES)[number];

export const MYSTERY = {
  name: 'Nome Fragranza', // placeholder, da sostituire
  maison: 'Maison Ospite',
  family: 'Legnoso' as Family,
  notes: ['bergamotto', 'vetiver', 'ambra grigia'],
  trickNote: 'vetiver', // usata nel testo per chi non indovina
  guessedPct: 62, // percentuale mostrata: "il 62% ha risposto come te"
};
