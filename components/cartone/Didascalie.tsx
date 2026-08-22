'use client';

import { useEffect, useRef } from 'react';
import { BATTUTE } from '@/content/cartone/scaletta';
import { BRAND } from '@/components/mediapro/content';
import { orologio, passaggio, presenza } from '@/lib/cartone/tempo';

/**
 * I testi.
 *
 * Stanno nel DOM e non dentro la scena 3D per un motivo pratico prima che
 * estetico: un testo tridimensionale a questa dimensione va in aliasing sui
 * bordi delle lettere, e su un video verticale ricompresso da Instagram
 * l'aliasing è la prima cosa che si sfalda. Qui la tipografia resta netta
 * perché è tipografia, non geometria.
 *
 * Sono scritti per essere letti **senza audio**: è la condizione normale in
 * cui questo corto verrà visto. Nessuna riga dipende da una voce fuori campo
 * che non c'è.
 */

/** Margine basso di sicurezza: sotto ci sono i comandi dell'app, non il video. */
const SICUREZZA = '19%';

export function Didascalie() {
  const strato = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    const blocchi = Array.from(
      strato.current?.querySelectorAll<HTMLElement>('[data-da]') ?? [],
    );

    const disegna = () => {
      if (!vivo) return;
      const t = orologio.t;
      for (const b of blocchi) {
        const da = Number(b.dataset.da);
        const a = Number(b.dataset.a);
        const o = presenza(t, da, a, 0.45, 0.35);
        b.style.opacity = String(o);
        // Sale di poco entrando e continua a salire impercettibilmente:
        // un testo perfettamente fermo su una scena che si muove sembra
        // incollato sopra al video invece che dentro.
        const su = (1 - passaggio(t, da, da + 0.55)) * 26 - passaggio(t, da, a) * 6;
        b.style.transform = `translate3d(0, ${su.toFixed(2)}px, 0)`;
        b.style.visibility = o > 0.004 ? 'visible' : 'hidden';
      }
      requestAnimationFrame(disegna);
    };
    const id = requestAnimationFrame(disegna);
    return () => {
      vivo = false;
      cancelAnimationFrame(id);
    };
  }, []);

  return (
    <div className="ct-testi" ref={strato} style={{ ['--sicurezza' as string]: SICUREZZA }}>
      {BATTUTE.filter((b) => b.testo || b.etichetta).map((b) => (
        <div className="ct-blocco" key={b.id} data-da={b.da + 0.2} data-a={b.a - 0.15}>
          {b.etichetta && <p className="ct-occhiello">{b.etichetta}</p>}
          {b.testo && <p className="ct-riga">{b.testo}</p>}
        </div>
      ))}

      {/* La firma: l'unico blocco centrato, e l'unico che non se ne va. */}
      <div className="ct-firma">
        <div className="ct-blocco ct-blocco--centro" data-da="27.0" data-a="30.4">
          <p className="ct-marchio">{BRAND.name}</p>
        </div>
        <div className="ct-blocco ct-blocco--centro" data-da="27.5" data-a="30.4">
          <p className="ct-claim">{BRAND.tagline}</p>
        </div>
        <div className="ct-blocco ct-blocco--centro" data-da="28.1" data-a="30.4">
          <p className="ct-recapito">{BRAND.phone}</p>
        </div>
      </div>
    </div>
  );
}
