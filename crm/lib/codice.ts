// Il codice del credito. Prima lo inventava il browser a caso e non lo
// conosceva nessuno: ora lo batte il server, è unico per vincolo del database
// e in negozio si cerca e si segna riscattato.

// Alfabeto senza 0/O e 1/I: chi legge il codice dallo schermo e lo detta alla
// cassa non deve indovinare.
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const PREFISSO_CODICE = 'RAMA70';
export const CREDITO_EUR = 70;
export const GIORNI_VALIDITA = 90;

export function generaCodice(lunghezza = 4): string {
  const casuale = new Uint8Array(lunghezza);
  crypto.getRandomValues(casuale);
  let coda = '';
  for (const byte of casuale) coda += ALFABETO[byte % ALFABETO.length];
  return `${PREFISSO_CODICE}-${coda}`;
}

export function scadenzaDaOggi(giorni = GIORNI_VALIDITA): string {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + giorni);
  return data.toISOString().slice(0, 10);
}

// Normalizza quello che viene digitato in negozio: spazi, minuscole, trattino
// dimenticato.
export function normalizzaCodice(grezzo: string): string {
  const pulito = grezzo.trim().toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  if (!pulito.startsWith(PREFISSO_CODICE)) return grezzo.trim().toUpperCase();
  return `${PREFISSO_CODICE}-${pulito.slice(PREFISSO_CODICE.length)}`;
}
