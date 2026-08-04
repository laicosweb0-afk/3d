'use client';

// La navigazione: marchio a sinistra, tre voci a destra.
//
// Sul viaggio non c'è — la hero deve restare la headline e nient'altro, e
// un menu in cima a una copertina la declassa a pagina web. Compare quando
// il piano sequenza è finito e il documento prende il suo posto: da lì in
// poi serve davvero, perché chi è arrivato in fondo vuole i contatti.

import { useEffect, useRef } from 'react';
import { asset } from '@/lib/asset';
import { company } from '@/content/bufala/company';

const voci = [
  // "Contatti" non c'è più come sezione: il telefono vive dentro la scheda
  // del luogo, accanto al pulsante che lo compone. Un menu che punta a
  // un'ancora inesistente porta a fondo pagina senza dirlo — e sembra un
  // sito rotto proprio a chi sta cercando come raggiungervi.
  { href: '#prodotti', testo: 'Prodotti' },
  { href: '#orari', testo: 'Orari' },
  { href: '#dove', testo: 'Dove trovarci' },
];

export function Nav() {
  const barra = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = barra.current;
    const sezioni = document.querySelector('.bufala-sezioni');
    if (!el || !sezioni) return;

    // Appare quando le sezioni entrano in campo. Un IntersectionObserver
    // invece di leggere lo scroll a ogni frame: qui non serve continuità,
    // serve una soglia — e costa zero al ciclo di rendering del viaggio.
    const osservatore = new IntersectionObserver(
      ([voce]) => el.classList.toggle('visibile', voce.isIntersecting),
      { rootMargin: '-10% 0px 0px 0px' },
    );
    osservatore.observe(sezioni);
    return () => osservatore.disconnect();
  }, []);

  return (
    <nav ref={barra} className="bufala-nav" aria-label="Navigazione principale">
      <a className="marchio" href="#top">
        <img
          src={asset("/assets/brand-bufala/logo-marchio.png")}
          alt={company.brand}
          width={1242}
          height={970}
        />
      </a>
      <ul>
        {voci.map((v) => (
          <li key={v.href}>
            <a className="micro" href={v.href}>
              {v.testo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
