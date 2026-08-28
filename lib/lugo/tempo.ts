// Il tempo di Lugo: un orologio di gioco che governa luce, cielo, nebbia e
// luci artificiali. Una tabella di momenti chiave (notte, alba, mattina,
// giorno, tramonto, sera) interpolati a ogni frame: niente asset, niente
// costi, e la città cambia faccia mentre ci giochi.
//
// Vive fuori da React come il resto dello stato "caldo": lo aggiorna World
// una volta per frame, lo leggono luci, lampioni, insegne e fari.

export interface StatoCielo {
  /** Direzione del sole rispetto al giocatore (offset da sommare). */
  solePos: [number, number, number];
  soleColore: string;
  soleIntensita: number;
  cieloAlto: string;
  cieloBasso: string;
  nebbiaColore: string;
  nebbiaVicino: number;
  nebbiaLontano: number;
  hemiCielo: string;
  hemiTerra: string;
  hemiIntensita: number;
  ambColore: string;
  ambIntensita: number;
  /** 0 = giorno pieno, 1 = buio: quanto sono accese le luci artificiali. */
  luci: number;
  /** Quota apparente del disco solare (per il cielo e l'alone). */
  soleAlto: number;
}

interface Momento extends StatoCielo {
  ora: number;
}

// I momenti chiave della giornata romagnola. Interpolati in mezzo.
const MOMENTI: Momento[] = [
  {
    ora: 0, // notte fonda
    solePos: [-40, 60, 30], soleColore: '#6C82B4', soleIntensita: 0.25,
    cieloAlto: '#0B1430', cieloBasso: '#1E2B4C',
    nebbiaColore: '#16203A', nebbiaVicino: 120, nebbiaLontano: 620,
    hemiCielo: '#33456F', hemiTerra: '#1A1E28', hemiIntensita: 0.5,
    ambColore: '#59688C', ambIntensita: 0.42, luci: 1, soleAlto: -0.4,
  },
  {
    ora: 5.5, // alba
    solePos: [120, 22, 60], soleColore: '#FFB07A', soleIntensita: 1.1,
    cieloAlto: '#3C5A96', cieloBasso: '#F0B48A',
    nebbiaColore: '#D9C0B4', nebbiaVicino: 150, nebbiaLontano: 700,
    hemiCielo: '#9FB6D8', hemiTerra: '#7A6A5A', hemiIntensita: 0.6,
    ambColore: '#C8B8B0', ambIntensita: 0.34, luci: 0.65, soleAlto: 0.06,
  },
  {
    ora: 8, // mattina
    solePos: [110, 80, 40], soleColore: '#FFEAC8', soleIntensita: 2.0,
    cieloAlto: '#4A87DC', cieloBasso: '#DDE9F2',
    nebbiaColore: '#D6E2EC', nebbiaVicino: 260, nebbiaLontano: 1200,
    hemiCielo: '#BFD9F2', hemiTerra: '#9A9078', hemiIntensita: 0.68,
    ambColore: '#E8EEF4', ambIntensita: 0.32, luci: 0.12, soleAlto: 0.6,
  },
  {
    ora: 13, // giorno pieno (il look attuale del gioco)
    solePos: [-70, 150, 45], soleColore: '#FFF2D8', soleIntensita: 2.35,
    cieloAlto: '#5F97DC', cieloBasso: '#DCE9F2',
    nebbiaColore: '#D6E2EC', nebbiaVicino: 300, nebbiaLontano: 1300,
    hemiCielo: '#BFD9F2', hemiTerra: '#9A9078', hemiIntensita: 0.7,
    ambColore: '#E8EEF4', ambIntensita: 0.32, luci: 0, soleAlto: 1,
  },
  {
    ora: 18.5, // tramonto romagnolo
    solePos: [-130, 34, 34], soleColore: '#FFAF6B', soleIntensita: 1.7,
    cieloAlto: '#2E4E8E', cieloBasso: '#FF9E5E',
    nebbiaColore: '#D3A084', nebbiaVicino: 200, nebbiaLontano: 950,
    hemiCielo: '#FFD9A0', hemiTerra: '#6A5A5A', hemiIntensita: 0.7,
    ambColore: '#B9A296', ambIntensita: 0.36, luci: 0.45, soleAlto: 0.12,
  },
  {
    ora: 20.5, // sera
    solePos: [-120, 12, 30], soleColore: '#9A86C0', soleIntensita: 0.6,
    cieloAlto: '#152449', cieloBasso: '#5A4A78',
    nebbiaColore: '#3B3A5A', nebbiaVicino: 150, nebbiaLontano: 780,
    hemiCielo: '#54689C', hemiTerra: '#2E2A36', hemiIntensita: 0.56,
    ambColore: '#78789C', ambIntensita: 0.4, luci: 0.9, soleAlto: -0.1,
  },
  {
    ora: 24, // si richiude sulla notte
    solePos: [-40, 60, 30], soleColore: '#6C82B4', soleIntensita: 0.25,
    cieloAlto: '#0B1430', cieloBasso: '#1E2B4C',
    nebbiaColore: '#16203A', nebbiaVicino: 120, nebbiaLontano: 620,
    hemiCielo: '#33456F', hemiTerra: '#1A1E28', hemiIntensita: 0.5,
    ambColore: '#59688C', ambIntensita: 0.42, luci: 1, soleAlto: -0.4,
  },
];

/** Durata di una giornata intera di gioco, in secondi reali. */
export const DURATA_GIORNO = 900; // 15 minuti: si vede l'alba senza aspettare

export const tempo = {
  /** Ora corrente 0–24. Si parte alle 9 del mattino. */
  ora: 9,
  /** false congela l'orologio (impostazioni). */
  scorre: true,
};

function mixCol(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t));
  const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t));
  const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t));
  return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
}

const corrente: StatoCielo = { ...MOMENTI[3] };

/** Fa scorrere l'orologio e restituisce lo stato del cielo interpolato. */
export function passaTempo(dt: number): StatoCielo {
  if (tempo.scorre) {
    tempo.ora = (tempo.ora + (dt * 24) / DURATA_GIORNO) % 24;
  }
  let i = 0;
  while (i < MOMENTI.length - 2 && MOMENTI[i + 1].ora <= tempo.ora) i++;
  const a = MOMENTI[i];
  const b = MOMENTI[i + 1];
  const t = b.ora === a.ora ? 0 : (tempo.ora - a.ora) / (b.ora - a.ora);
  const k = Math.max(0, Math.min(1, t));
  const lerp = (x: number, y: number) => x * (1 - k) + y * k;

  corrente.solePos = [
    lerp(a.solePos[0], b.solePos[0]),
    lerp(a.solePos[1], b.solePos[1]),
    lerp(a.solePos[2], b.solePos[2]),
  ];
  corrente.soleColore = mixCol(a.soleColore, b.soleColore, k);
  corrente.soleIntensita = lerp(a.soleIntensita, b.soleIntensita);
  corrente.cieloAlto = mixCol(a.cieloAlto, b.cieloAlto, k);
  corrente.cieloBasso = mixCol(a.cieloBasso, b.cieloBasso, k);
  corrente.nebbiaColore = mixCol(a.nebbiaColore, b.nebbiaColore, k);
  corrente.nebbiaVicino = lerp(a.nebbiaVicino, b.nebbiaVicino);
  corrente.nebbiaLontano = lerp(a.nebbiaLontano, b.nebbiaLontano);
  corrente.hemiCielo = mixCol(a.hemiCielo, b.hemiCielo, k);
  corrente.hemiTerra = mixCol(a.hemiTerra, b.hemiTerra, k);
  corrente.hemiIntensita = lerp(a.hemiIntensita, b.hemiIntensita);
  corrente.ambColore = mixCol(a.ambColore, b.ambColore, k);
  corrente.ambIntensita = lerp(a.ambIntensita, b.ambIntensita);
  corrente.luci = lerp(a.luci, b.luci);
  corrente.soleAlto = lerp(a.soleAlto, b.soleAlto);
  return corrente;
}

/** Lo stato corrente senza far scorrere il tempo (per lampioni, fari, insegne). */
export function cieloOra(): StatoCielo {
  return corrente;
}

/** "09:24" per l'HUD. */
export function orologio(): string {
  const h = Math.floor(tempo.ora);
  const m = Math.floor((tempo.ora - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** La fascia oraria, per missioni ed eventi che vogliono saperlo. */
export function faseGiorno(): 'notte' | 'alba' | 'mattina' | 'giorno' | 'tramonto' | 'sera' {
  const o = tempo.ora;
  if (o < 5) return 'notte';
  if (o < 7) return 'alba';
  if (o < 11) return 'mattina';
  if (o < 17.5) return 'giorno';
  if (o < 20) return 'tramonto';
  if (o < 22.5) return 'sera';
  return 'notte';
}
