'use client';

// La selezione del banco: struttura ferma, cambia solo il prodotto.
//
// Il gesto: si scorre col dito, e mentre un prodotto esce ruotando sul
// proprio asse quello dopo entra ruotando dalla parte opposta. I due
// movimenti si sovrappongono sempre, quindi non c'è mai un istante vuoto in
// cui la scena "si rompe".
//
// Perché in codice e non con un filmato generato: il movimento non ha una
// durata propria, segue il dito. A metà scorrimento la rotazione sta a metà;
// se si torna indietro, torna indietro. Un filmato ha un tempo suo e non sa
// quale sarà il prodotto successivo — con cinque prodotti servirebbero venti
// clip per coprire tutte le coppie, e nessuna di esse potrebbe essere
// interrotta a metà. In più i prodotti portano marchi reali: farli "girare"
// a un modello significa fargli inventare il retro di un'etichetta vera.
//
// È lo stesso principio del resto del sito: tutto è funzione pura della
// posizione, nessuna animazione parte per conto suo.

import { useEffect, useRef } from 'react';
import { prodotti } from '@/content/bufala/assets';

/** Quanto ruota una scheda quando è tutta fuori campo, in gradi. Sopra i
 *  quaranta il prodotto si assottiglia troppo e si legge come uno
 *  schiacciamento invece che come un giro. */
const GIRO = 34;

export function Prodotti() {
  const pista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;

    // Con il movimento ridotto le schede restano ferme e leggibili: la
    // rotazione è un ornamento, il contenuto no.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let daFare = false;

    const disponi = () => {
      daFare = false;
      const centro = el.scrollLeft + el.clientWidth / 2;
      for (const scheda of Array.from(el.children) as HTMLElement[]) {
        const suo = scheda.offsetLeft + scheda.offsetWidth / 2;
        // Distanza dal centro, normalizzata sulla larghezza della scheda:
        // 0 = al centro, 1 = una scheda più in là.
        const d = (suo - centro) / scheda.offsetWidth;
        const q = Math.max(-1.6, Math.min(1.6, d));
        scheda.style.transform =
          `perspective(1400px) rotateY(${(-q * GIRO).toFixed(2)}deg) scale(${(1 - Math.min(Math.abs(q), 1) * 0.12).toFixed(3)})`;
        scheda.style.opacity = (1 - Math.min(Math.abs(q), 1.4) * 0.45).toFixed(3);
      }
    };

    // Lo scroll arriva a raffica: si accoda un solo lavoro per fotogramma,
    // altrimenti si ricalcola dieci volte per ogni fotogramma disegnato.
    const suScroll = () => {
      if (daFare) return;
      daFare = true;
      raf = requestAnimationFrame(disponi);
    };

    disponi();
    el.addEventListener('scroll', suScroll, { passive: true });
    window.addEventListener('resize', suScroll);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', suScroll);
      window.removeEventListener('resize', suScroll);
    };
  }, []);

  return (
    <div className="bufala-fila" ref={pista}>
      {prodotti.map((p) => (
        <figure className="bufala-scheda" key={p.src}>
          <img src={p.src} alt={p.alt} width={824} height={900} loading="lazy" />
        </figure>
      ))}
    </div>
  );
}
