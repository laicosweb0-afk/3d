/**
 * Vibrazione dove esiste. Su iOS non è supportata e `vibrate` non c'è:
 * le chiamate devono semplicemente non fare nulla, mai sollevare errori.
 */
function vibra(schema: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(schema);
    }
  } catch {
    /* nessun dispositivo, nessun problema */
  }
}

/** Colpetto leggero: uno spicchio è passato sotto la lancetta. */
export const tick = () => vibra(8);
/** Tocco di conferma su una scelta. */
export const tocco = () => vibra(12);
/** Vibrazione piena della vittoria. */
export const vittoria = () => vibra([18, 60, 28, 60, 44]);
