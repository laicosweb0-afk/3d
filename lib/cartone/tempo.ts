// Il tempo del cartone e i pochi attrezzi per curvarlo.
//
// Un'unica variabile mutabile in tutto il corto — `orologio.t`, i secondi
// dall'inizio — e tutto il resto è funzione pura di quella. È la stessa
// scelta che nel resto del repo rende il viaggio reversibile con lo scroll;
// qui serve a una cosa in più: il rendering fotogramma per fotogramma può
// posizionare il tempo dove vuole, anche all'indietro, e ottenere sempre
// esattamente la stessa immagine.

import { battuta, DURATA } from '@/content/cartone/scaletta';

/** L'unico stato mutabile del corto. */
export const orologio = { t: 0 };

/**
 * Il richiamo al disegno, per il rendering a richiesta.
 *
 * In anteprima la scena si ridisegna a ogni fotogramma del browser. In
 * rendering no: si disegna solo quando glielo si chiede, una volta per
 * fotogramma consegnato. È l'unica ottimizzazione che conta davvero — con la
 * grafica via software un disegno costa qualche secondo, e aspettare tre giri
 * di `requestAnimationFrame` per essere sicuri che il fotogramma fosse pronto
 * significava pagarlo tre volte.
 */
export const richiamo = { invalida: () => {} };

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Smoothstep: entra e esce con derivata nulla. L'ammorbidente di base. */
export const morbida = (k: number) => {
  const c = clamp01(k);
  return c * c * (3 - 2 * c);
};

/** Decelerazione (ease-out cubica): parte veloce, si posa. */
export const posa = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);

/** Accelerazione (ease-in quadratica): la caduta. */
export const caduta = (k: number) => {
  const c = clamp01(k);
  return c * c;
};

/**
 * Progresso 0→1 dentro una finestra temporale, con gli estremi bloccati.
 * Fuori dalla finestra vale 0 prima e 1 dopo: così un oggetto che si è
 * mosso resta dove è arrivato senza bisogno di ricordarselo.
 */
export const tratto = (t: number, da: number, a: number) => clamp01((t - da) / (a - da));

/** Come `tratto`, ma già ammorbidito: è la forma che si usa quasi sempre. */
export const passaggio = (t: number, da: number, a: number) => morbida(tratto(t, da, a));

/**
 * Presenza di un elemento che entra, resta e esce: 0 → 1 → 0.
 * `entra` e `esce` sono le durate delle due dissolvenze, in secondi.
 */
export function presenza(t: number, da: number, a: number, entra = 0.4, esce = 0.4) {
  return Math.min(passaggio(t, da, da + entra), 1 - passaggio(t, a - esce, a));
}

/** Progresso dentro una battuta della scaletta, per id. */
export function dentro(t: number, id: string) {
  const b = battuta(id);
  return tratto(t, b.da, b.a);
}

/** Un rimbalzo smorzato attorno allo zero, per gli atterraggi. */
export function rimbalzo(k: number, colpi = 2.4, smorzo = 5.5) {
  const c = clamp01(k);
  return Math.sin(c * Math.PI * colpi) * Math.exp(-c * smorzo);
}

/**
 * Numeri pseudo-casuali seminati. Servono per sparpagliare le schede del
 * pubblico senza che due rendering diano due sparpagliamenti diversi:
 * `Math.random()` qui sarebbe un errore, non una scorciatoia.
 */
export function seme(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Il tempo ciclico dell'anteprima: torna a zero e riparte. */
export const cicla = (t: number) => ((t % DURATA) + DURATA) % DURATA;

export type Chiave = { t: number; v: number[]; ease?: (k: number) => number };

/**
 * Interpolazione fra chiavi nel tempo, componente per componente.
 *
 * Serve per camera e posizioni: si scrivono le pose ai secondi che contano e
 * il movimento fra due pose lo fa questa. Prima della prima chiave e dopo
 * l'ultima il valore resta fermo — nessuna extrapolazione, che è sempre il
 * modo più rapido per far volare via un oggetto fuori campo.
 */
export function percorso(t: number, chiavi: Chiave[], out: number[] = []) {
  const n = chiavi.length;
  if (t <= chiavi[0].t) return chiavi[0].v.slice();
  if (t >= chiavi[n - 1].t) return chiavi[n - 1].v.slice();
  let i = 0;
  while (i < n - 2 && t > chiavi[i + 1].t) i += 1;
  const a = chiavi[i];
  const b = chiavi[i + 1];
  const k = (b.ease ?? morbida)((t - a.t) / (b.t - a.t));
  out.length = a.v.length;
  for (let j = 0; j < a.v.length; j += 1) out[j] = lerp(a.v[j], b.v[j], k);
  return out;
}
