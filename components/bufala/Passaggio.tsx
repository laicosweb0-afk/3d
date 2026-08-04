'use client';

// Il passaggio dalla panna al verde.
//
// Non è un cambio di fondo: è l'avvicinarsi al banco. Si esce da un ambiente
// chiaro e aperto e si entra in una zona raccolta, dove le superfici sono più
// profonde e la luce cala. Il visitatore non deve accorgersi di una
// transizione — deve solo sentire che l'aria è cambiata.
//
// Prima qui c'era un gradiente fermo alto un quarto di schermo: non seguiva
// lo scroll, quindi aveva sempre lo stesso aspetto a qualunque velocità si
// scorresse, e sopra e sotto aveva due confini. Un confine, per quanto
// sfumato, resta un punto in cui una cosa finisce e un'altra comincia.
//
// Quattro fasi, tutte funzione della posizione e nessuna del tempo:
//
//   1. la panna perde un soffio di luce, molto prima che accada altro;
//   2. dal basso sale un'ombra verdissima e completamente sfumata, come
//      quella che un banco illuminato proietta sul pavimento;
//   3. il verde emerge dentro l'ombra e i due colori convivono: non esiste
//      un istante in cui finisce la panna e comincia il verde;
//   4. quando il verde ha preso il campo, i contenuti della metà scura
//      compaiono in ordine — prima il titolo, poi il testo, poi le schede.
//
// Le tre fasi visive sono tre strati, e ogni strato riceve un solo numero.
// Il resto lo fa il CSS con trasformazioni e opacità: nessun ricalcolo di
// impaginato a ogni fotogramma, quindi il passaggio regge anche mentre il
// filmato del viaggio è ancora in memoria.

import { useEffect, useRef } from 'react';

/** Curva di ammorbidimento: parte e finisce ferma. */
function lisci(x: number): number {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

/** Rimappa q sull'intervallo [a,b] e lo ammorbidisce. */
function fase(q: number, a: number, b: number): number {
  return lisci((q - a) / (b - a));
}

export function Passaggio() {
  const zona = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = zona.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let inVista = false;

    const disegna = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const corsa = r.height - window.innerHeight;
      const q = corsa > 0 ? Math.min(Math.max(-r.top / corsa, 0), 1) : 0;

      // Fase 1 — la luce cala. Comincia subito e finisce presto: deve essere
      // già avvenuta quando l'ombra si fa notare, altrimenti si leggono come
      // un movimento solo.
      el.style.setProperty('--velatura', fase(q, 0, 0.22).toFixed(4));

      // Fase 2 — l'ombra sale. Parte da sotto il bordo e arriva a coprire.
      el.style.setProperty('--ombra', (1 - fase(q, 0.04, 0.62)).toFixed(4));

      // Fase 3 — il verde emerge dentro l'ombra, più lento di lei: è questo
      // sfasamento a far convivere i due colori invece di sostituirli.
      el.style.setProperty('--verde', (1 - fase(q, 0.26, 0.94)).toFixed(4));
    };

    const chiedi = () => {
      if (raf || !inVista) return;
      raf = requestAnimationFrame(disegna);
    };

    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const v of voci) inVista = v.isIntersecting;
        chiedi();
      },
      { rootMargin: '10% 0px' },
    );
    osservatore.observe(el);

    window.addEventListener('scroll', chiedi, { passive: true });
    window.addEventListener('resize', chiedi);
    disegna();

    return () => {
      osservatore.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', chiedi);
      window.removeEventListener('resize', chiedi);
    };
  }, []);

  return (
    <div ref={zona} className="bufala-passaggio" aria-hidden="true">
      <div className="passaggio-palco">
        {/* La panna che perde luce. Non diventa grigia: si scurisce dal basso
            con lo stesso verde di tutto il resto, così il calo di luce ha già
            il colore dell'ambiente in cui si sta entrando. */}
        <div className="passaggio-velatura" />

        {/* L'ombra. Un'ellisse enorme e sfumatissima appoggiata sotto il bordo
            inferiore: non ha un contorno da nessuna parte, e per questo non
            può produrre una linea. */}
        <div className="passaggio-ombra" />

        {/* Il verde. Più alto dello schermo, così quando ha finito di salire
            copre pieno fino al bordo superiore e consegna il campo alla
            sezione scura senza che si veda dove uno finisce e l'altra
            comincia — sono lo stesso colore. */}
        <div className="passaggio-verde" />
      </div>
    </div>
  );
}
