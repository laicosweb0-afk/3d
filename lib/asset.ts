// Prefisso base per gli asset statici.
//  - vuoto in produzione: il sito vive alla radice del dominio del brand,
//    quindi "/assets/…" è già corretto;
//  - "/3d" (o altro) quando il sito è pubblicato in una sottocartella, come
//    l'anteprima gratuita su GitHub Pages (…github.io/3d/). Il valore arriva
//    da NEXT_PUBLIC_BASE_PATH, impostato dalla pipeline di build.
// Lo stesso valore è usato in next.config (basePath) per gli asset di Next.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Antepone il prefisso base a un percorso assoluto ("/assets/…"). */
export const asset = (path: string): string => `${BASE_PATH}${path}`;
