'use client';

// Modalità QA (?qa=1): alleggerisce il rendering per il collaudo headless
// (niente GPU vera → niente ombre, DPR ridotto, meno NPC). Mai attiva per
// i giocatori senza il parametro esplicito.

export const QA =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('qa');
