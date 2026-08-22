'use client';

import { useEffect, useRef, useState } from 'react';
import { DURATA, FPS } from '@/content/cartone/scaletta';
import { orologio, richiamo } from '@/lib/cartone/tempo';
import { Scena } from './Scena';
import { Didascalie } from './Didascalie';

/**
 * Il corto e il suo motore.
 *
 * Due modi di far scorrere il tempo, e uno solo alla volta:
 *
 * - **anteprima** — il tempo avanza da solo con l'orologio della macchina, si
 *   mette in pausa e si trascina. Serve a guardarlo mentre lo si fa.
 * - **rendering** — il tempo non avanza mai da solo: lo posiziona
 *   `window.__cartone.seek(secondi)`, un fotogramma alla volta, e lo
 *   strumento a riga di comando fotografa. È il motivo per cui in tutta la
 *   scena non esiste una sola animazione che si accumuli fotogramma dopo
 *   fotogramma: il rendering salta, e ciò che si accumula si romperebbe.
 */

declare global {
  interface Window {
    __cartone?: {
      seek: (t: number) => void;
      durata: number;
      fps: number;
      pronto: boolean;
    };
  }
}

export function Corto({ perRendering = false }: { perRendering?: boolean }) {
  const [inPausa, setInPausa] = useState(false);
  const [posizione, setPosizione] = useState(0);
  const stato = useRef({ inPausa: false });
  stato.current.inPausa = inPausa;

  useEffect(() => {
    if (perRendering) {
      orologio.t = 0;
      window.__cartone = {
        seek: (t: number) => {
          orologio.t = t;
          richiamo.invalida();
        },
        durata: DURATA,
        fps: FPS,
        pronto: true,
      };
      return () => {
        delete window.__cartone;
      };
    }

    let ultimo = performance.now();
    let vivo = true;
    const gira = (ora: number) => {
      if (!vivo) return;
      const dt = Math.min((ora - ultimo) / 1000, 0.1);
      ultimo = ora;
      if (!stato.current.inPausa) {
        orologio.t = (orologio.t + dt) % DURATA;
        setPosizione(orologio.t);
      }
      requestAnimationFrame(gira);
    };
    const id = requestAnimationFrame(gira);
    return () => {
      vivo = false;
      cancelAnimationFrame(id);
    };
  }, [perRendering]);

  // Barra spaziatrice: pausa. Frecce: un fotogramma avanti o indietro.
  useEffect(() => {
    if (perRendering) return;
    const tasto = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setInPausa((v) => !v);
      }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        setInPausa(true);
        const passo = (e.code === 'ArrowRight' ? 1 : -1) / FPS;
        orologio.t = (orologio.t + passo + DURATA) % DURATA;
        setPosizione(orologio.t);
      }
    };
    window.addEventListener('keydown', tasto);
    return () => window.removeEventListener('keydown', tasto);
  }, [perRendering]);

  return (
    <main className="ct">
      <div className="ct-quadro">
        <Scena perRendering={perRendering} />
        <div className="ct-scrim" aria-hidden />
        <Didascalie />
      </div>

      {!perRendering && (
        <div className="ct-comandi">
          <button type="button" onClick={() => setInPausa((v) => !v)} aria-label={inPausa ? 'Riprendi' : 'Pausa'}>
            {inPausa ? '▶' : '❚❚'}
          </button>
          <input
            type="range"
            min={0}
            max={DURATA}
            step={1 / FPS}
            value={posizione}
            aria-label="Posizione nel corto"
            onChange={(e) => {
              setInPausa(true);
              orologio.t = Number(e.target.value);
              setPosizione(orologio.t);
            }}
          />
          <span className="ct-tempo">
            {posizione.toFixed(2)}s / {DURATA}s
          </span>
        </div>
      )}
    </main>
  );
}
