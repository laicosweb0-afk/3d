'use client';

// Il fondale vivo del documento (brief dell'utente, 04/08): il passaggio
// dalla panna al verde non è più una fascia dipinta NELLA pagina — è il
// colore di UN SOLO strato (il contenitore del documento) che cambia
// mentre si scorre, alla maniera delle pagine prodotto di Apple. La
// fascia resta nel flusso ma diventa invisibile: serve solo da metro.
//
// La scala dei colori è la stessa a nove fermate della vecchia fascia —
// era stata costruita apposta per non passare mai dal grigio (panna →
// salvia → bosco, sempre dentro il verde) — solo che ora le fermate non
// sono punti nello spazio: sono istanti dello scorrimento.
//
// Tre strade, in ordine di preferenza:
// 1. CSS scroll-driven (animation-timeline: view()) dove il browser lo
//    sa fare: zero JavaScript per frame, gestisce tutto il compositore
//    degli stili. La finestra è la stessa del punto 3.
// 2. JavaScript dove non lo sa fare (Safari vecchi, Firefox): ascolto
//    dello scroll passivo + UN rAF su richiesta che scrive il colore
//    solo quando cambia. Non è un secondo ciclo perpetuo — il budget ne
//    ammette uno solo, ed è quello del viaggio: qui il frame si chiede
//    solo quando lo scroll si muove, e dentro la finestra del passaggio.
// 3. Senza JavaScript, o con meno-movimento: la fascia dipinta di prima,
//    che resta nel CSS come base. Nessuno vede una pagina rotta.
//
// La finestra (identica in CSS e JS): comincia quando la fascia entra
// dal fondo dello schermo — cioè mezza schermata prima della metà scura,
// perché la fascia È alta mezza schermata — e finisce quando la fascia
// esce di testa, cioè quando la metà scura riempie lo schermo.

import { useEffect } from 'react';

/** Le nove fermate della vecchia fascia, come [posizione, r, g, b]. */
const SCALA: [number, number, number, number][] = [
  [0, 247, 243, 234],
  [0.11, 242, 237, 225],
  [0.23, 230, 226, 210],
  [0.35, 205, 211, 195],
  [0.47, 170, 186, 166],
  [0.59, 126, 151, 132],
  [0.71, 81, 112, 98],
  [0.83, 44, 74, 57],
  [0.93, 23, 49, 31],
  [1, 17, 40, 29],
];

export function Fondale() {
  useEffect(() => {
    const documento = document.querySelector<HTMLElement>('.bufala-documento');
    const fascia = document.querySelector<HTMLElement>('.bufala-passaggio');
    if (!documento || !fascia) return;
    // Meno movimento = documento statico, come nel resto del sito: la
    // fascia dipinta va benissimo, e non si accende niente.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: view()')) {
      documento.classList.add('bufala-documento--css');
      return;
    }

    documento.classList.add('bufala-documento--js');
    let chiesto = false;
    let ultimo = '';

    const dipingi = () => {
      chiesto = false;
      const r = fascia.getBoundingClientRect();
      const vh = window.innerHeight;
      // Lo stesso «cover 0% → 75%» della strada CSS: 0 quando la fascia
      // entra dal fondo, 1 ai tre quarti della finestra — il colore è a
      // casa PRIMA che il primo testo del buio sia in posizione di
      // lettura (misurato: al 100% l'occhiello arrivava sul salvia).
      const t = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)) / 0.75);
      let i = 1;
      while (i < SCALA.length - 1 && SCALA[i][0] < t) i++;
      const [p0, ...da] = SCALA[i - 1];
      const [p1, ...a] = SCALA[i];
      const x = (t - p0) / (p1 - p0);
      const c = da.map((v, k) => Math.round(v + (a[k] - v) * x));
      const colore = `rgb(${c[0]} ${c[1]} ${c[2]})`;
      if (colore !== ultimo) {
        ultimo = colore;
        documento.style.backgroundColor = colore;
      }
    };

    const chiedi = () => {
      if (!chiesto) {
        chiesto = true;
        requestAnimationFrame(dipingi);
      }
    };

    addEventListener('scroll', chiedi, { passive: true });
    addEventListener('resize', chiedi, { passive: true });
    dipingi();
    return () => {
      removeEventListener('scroll', chiedi);
      removeEventListener('resize', chiedi);
      documento.classList.remove('bufala-documento--js');
      documento.style.backgroundColor = '';
    };
  }, []);

  return null;
}
